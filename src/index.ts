// Platform-neutral entry point. Node users import from "ltamp-js/node",
// which also exports the node-hid transport.

export { LtAmp, type AmpOptions, type CurrentPreset, type PresetSlot } from "./amp.js";
export { FENDER_VENDOR_ID, LT_PRODUCT_IDS, type Transport } from "./transport.js";
export { frame, Deframer, FrameTag, REPORT_SIZE } from "./protocol/framing.js";
export {
  encodeMessage,
  decodeMessage,
  Payloads,
  ResponseType,
  ModalContext,
  ModalState,
  UnsupportedStatus,
  type Message,
  type PayloadName,
  type PayloadOf,
} from "./protocol/messages.js";
