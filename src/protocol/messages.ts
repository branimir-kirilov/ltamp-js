// Schema for the subset of the Mustang LT USB protocol this library speaks.
// Every message is a FenderMessageLT envelope: field 1 is the response type,
// and exactly one other field holds the payload.

import { readFields, Writer, WireType, type RawField } from "./wire.js";

type Scalar = "bool" | "int32" | "string" | "enum";
type Shape = Record<string, readonly [field: number, type: Scalar]>;

const textDecoder = new TextDecoder();
const textEncoder = new TextEncoder();

export const ResponseType = { UNSOLICITED: 0, NOT_LAST_ACK: 1, IS_LAST_ACK: 2 } as const;

export const ModalContext = {
  SYNC_BEGIN: 0,
  SYNC_END: 1,
  BACKUP_BEGIN: 2,
  BACKUP_END: 3,
  RESTORE_BEGIN: 4,
  RESTORE_END: 5,
  TUNER_ENABLE: 6,
  TUNER_DISABLE: 7,
  FACTORY_RESTORE_BEGIN: 8,
  FACTORY_RESTORE_END: 9,
  TONE_BUSY_BEGIN: 10,
  TONE_BUSY_END: 11,
} as const;

export const ModalState = { OK: 0, FAIL: 1 } as const;

export const UnsupportedStatus = {
  UNSUPPORTED: 0,
  FAILED: 1,
  INVALID_PARAM: 2,
  INVALID_NODE_ID: 3,
  PARAM_OUT_OF_BOUNDS: 4,
  FACTORY_RESTORE_IN_PROGRESS: 5,
} as const;

const request = { request: [1, "bool"] } as const;

/** Payload messages: envelope field number and the payload's own fields. */
export const Payloads = {
  presetJSONMessage: [31, { data: [1, "string"], slotIndex: [2, "int32"] }],
  currentPresetStatus: [
    32,
    {
      currentPresetData: [1, "string"],
      currentSlotIndex: [2, "int32"],
      currentPresetDirtyStatus: [3, "bool"],
    },
  ],
  loadPreset: [33, { presetIndex: [1, "int32"] }],
  currentLoadedPresetIndexStatus: [37, { currentLoadedPresetIndex: [1, "int32"] }],
  presetSavedStatus: [50, { name: [1, "string"], slot: [2, "int32"] }],
  savePresetAs: [55, { presetData: [1, "string"], isLoadPreset: [2, "bool"], presetSlot: [3, "int32"] }],
  newPresetSavedStatus: [56, { presetData: [1, "string"], presetSlot: [2, "int32"] }],
  auditionPreset: [58, { presetData: [1, "string"] }],
  auditionPresetStatus: [59, { presetData: [1, "string"] }],
  exitAuditionPreset: [60, { exit: [1, "bool"] }],
  exitAuditionPresetStatus: [61, { isSuccess: [1, "bool"] }],
  auditionStateRequest: [62, request],
  auditionStateStatus: [63, { isAuditioning: [1, "bool"] }],
  productIdentificationStatus: [100, { id: [1, "string"] }],
  productIdentificationRequest: [101, request],
  firmwareVersionRequest: [102, request],
  firmwareVersionStatus: [103, { version: [1, "string"] }],
  currentPresetRequest: [104, request],
  retrievePreset: [105, { slot: [1, "int32"] }],
  modalStatusMessage: [113, { context: [1, "enum"], state: [2, "enum"] }],
  unsupportedMessageStatus: [200, { status: [1, "enum"] }],
  heartbeat: [201, { dummyField: [1, "bool"] }],
  connectionStatusRequest: [202, request],
  connectionStatus: [203, { isConnected: [1, "bool"] }],
} as const satisfies Record<string, readonly [number, Shape]>;

export type PayloadName = keyof typeof Payloads;

type ScalarValue<T extends Scalar> = T extends "string" ? string : T extends "bool" ? boolean : number;
export type PayloadOf<N extends PayloadName> = {
  [K in keyof (typeof Payloads)[N][1]]: (typeof Payloads)[N][1][K] extends readonly [number, infer T extends Scalar]
    ? ScalarValue<T>
    : never;
};

export interface Message<N extends PayloadName = PayloadName> {
  responseType: number;
  name: N;
  payload: Partial<PayloadOf<N>>;
}

/** Envelope field number → payload name, for decoding. */
const byFieldNumber = new Map<number, PayloadName>(
  Object.entries(Payloads).map(([name, [num]]) => [num, name as PayloadName]),
);

export function encodeMessage<N extends PayloadName>(
  name: N,
  payload: Partial<PayloadOf<N>>,
  responseType: number = ResponseType.UNSOLICITED,
): Uint8Array {
  const [fieldNumber, shape] = Payloads[name] as readonly [number, Shape];
  const inner = new Writer();
  for (const [key, [field, type]] of Object.entries(shape)) {
    const value = (payload as Record<string, unknown>)[key];
    if (value === undefined) continue;
    if (type === "string") inner.bytesField(field, textEncoder.encode(value as string));
    else inner.tag(field, WireType.Varint).varint(type === "bool" ? (value ? 1 : 0) : (value as number));
  }
  return new Writer()
    .tag(1, WireType.Varint)
    .varint(responseType)
    .bytesField(fieldNumber, inner.finish())
    .finish();
}

function decodePayload(shape: Shape, fields: RawField[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, [field, type]] of Object.entries(shape)) {
    const raw = fields.findLast((f) => f.field === field);
    if (!raw) continue;
    if (type === "string") out[key] = raw.bytes ? textDecoder.decode(raw.bytes) : "";
    else if (type === "bool") out[key] = raw.int !== 0n;
    else out[key] = Number(BigInt.asIntN(32, raw.int ?? 0n));
  }
  return out;
}

/**
 * Decode a FenderMessageLT envelope. Returns `undefined` for payloads this
 * library doesn't know yet (the amp sends more message types than we model).
 */
export function decodeMessage(buf: Uint8Array): Message | undefined {
  let responseType: number = ResponseType.UNSOLICITED;
  let result: Message | undefined;
  for (const f of readFields(buf)) {
    if (f.field === 1 && f.wireType === WireType.Varint) {
      responseType = Number(f.int);
      continue;
    }
    const name = byFieldNumber.get(f.field);
    if (!name || !f.bytes) continue;
    const shape = Payloads[name][1] as Shape;
    result = { responseType, name, payload: decodePayload(shape, readFields(f.bytes)) as never };
  }
  if (result) result.responseType = responseType;
  return result;
}
