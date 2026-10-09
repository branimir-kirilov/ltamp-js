// Platform-neutral entry point. Node users import from "ltamp-js/node" and
// browsers from "ltamp-js/webhid", which add the matching transport.

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
export {
  BLOCKS,
  NAME_LENGTH,
  buildPreset,
  displayName,
  fenderId,
  isBlank,
  parsePreset,
  presetName,
  shortModel,
  summarize,
  toTone,
  ToneError,
  type Block,
  type BlockName,
  type BuildResult,
  type ParamValue,
  type Preset,
  type Tone,
} from "./tone.js";
export { buildCatalog, type Catalog, type ModelEntry, type ParamSpec } from "./catalog.js";
export { KNOWN_MODELS, modelLabel, type KnownModel } from "./models.js";
