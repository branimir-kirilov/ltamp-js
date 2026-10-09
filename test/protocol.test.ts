import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Deframer, frame, FrameTag, REPORT_SIZE } from "../src/protocol/framing.js";
import { decodeMessage, encodeMessage, ModalContext, ModalState, ResponseType } from "../src/protocol/messages.js";

// Reference encodings captured from a known-good implementation of the protocol.
const golden: Record<string, string> = JSON.parse(readFileSync(new URL("./golden.json", import.meta.url), "utf8"));
const hex = (b: Uint8Array) => Buffer.from(b).toString("hex");
const unhex = (s: string) => new Uint8Array(Buffer.from(s, "hex"));

describe("encodeMessage", () => {
  const cases: [string, Uint8Array][] = [
    ["syncBegin", encodeMessage("modalStatusMessage", { context: ModalContext.SYNC_BEGIN, state: ModalState.OK })],
    ["syncEnd", encodeMessage("modalStatusMessage", { context: ModalContext.SYNC_END, state: ModalState.OK })],
    ["heartbeat", encodeMessage("heartbeat", { dummyField: true })],
    ["firmwareVersionRequest", encodeMessage("firmwareVersionRequest", { request: true })],
    ["productIdentificationRequest", encodeMessage("productIdentificationRequest", { request: true })],
    ["currentPresetRequest", encodeMessage("currentPresetRequest", { request: true })],
    ["retrievePreset7", encodeMessage("retrievePreset", { slot: 7 })],
    ["retrievePreset60", encodeMessage("retrievePreset", { slot: 60 })],
    ["loadPreset41", encodeMessage("loadPreset", { presetIndex: 41 })],
    ["auditionPreset", encodeMessage("auditionPreset", { presetData: '{"a":1}' })],
    ["exitAuditionPreset", encodeMessage("exitAuditionPreset", { exit: true })],
    ["auditionStateRequest", encodeMessage("auditionStateRequest", { request: true })],
    ["firmwareVersionResponse", encodeMessage("firmwareVersionStatus", { version: "2.1.4" }, ResponseType.IS_LAST_ACK)],
    [
      "presetJSONResponse",
      encodeMessage("presetJSONMessage", { data: "x".repeat(200), slotIndex: 33 }, ResponseType.IS_LAST_ACK),
    ],
  ];

  for (const [name, bytes] of cases) {
    it(`matches the reference bytes for ${name}`, () => expect(hex(bytes)).toBe(golden[name]));
  }
});

describe("decodeMessage", () => {
  it("decodes a firmware version reply", () => {
    expect(decodeMessage(unhex(golden.firmwareVersionResponse))).toEqual({
      responseType: ResponseType.IS_LAST_ACK,
      name: "firmwareVersionStatus",
      payload: { version: "2.1.4" },
    });
  });

  it("decodes a preset reply with a multi-byte length", () => {
    const msg = decodeMessage(unhex(golden.presetJSONResponse));
    expect(msg?.name).toBe("presetJSONMessage");
    expect(msg?.payload).toEqual({ data: "x".repeat(200), slotIndex: 33 });
  });

  it("returns undefined for payloads it doesn't model", () => {
    // field 999, empty payload
    expect(decodeMessage(unhex("0802ba3e00"))).toBeUndefined();
  });

  it("round-trips negative int32 values", () => {
    const msg = decodeMessage(encodeMessage("retrievePreset", { slot: -1 }));
    expect(msg?.payload).toEqual({ slot: -1 });
  });
});

describe("framing", () => {
  it("sends a short message as a single end report", () => {
    const [report, ...rest] = frame(unhex(golden.heartbeat));
    expect(rest).toHaveLength(0);
    expect(report).toHaveLength(REPORT_SIZE);
    expect(report[0]).toBe(FrameTag.End);
    expect(report[1]).toBe(7);
  });

  it("splits and reassembles long messages", () => {
    const payload = unhex(golden.presetJSONResponse); // 208 bytes → 4 reports
    const reports = frame(payload);
    expect(reports.map((r) => r[0])).toEqual([FrameTag.Start, FrameTag.Continue, FrameTag.Continue, FrameTag.End]);

    const deframer = new Deframer();
    const results = reports.map((r) => {
      // simulate the device→host layout: leading report ID byte
      const withId = new Uint8Array(REPORT_SIZE + 1);
      withId.set(r, 1);
      return deframer.push(withId, true);
    });
    expect(results.slice(0, 3)).toEqual([undefined, undefined, undefined]);
    expect(hex(results[3]!)).toBe(hex(payload));
  });
});
