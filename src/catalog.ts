// The list of models and settings the AI may use: every known LT25 model,
// plus whatever the presets on the connected amp show (extra models, and the
// range of values each setting takes in practice).

import { CHOICES, KNOWN_MODELS } from "./models.js";
import { BLOCKS, shortModel, type BlockName, type ParamValue, type Preset } from "./tone.js";

export interface ParamSpec {
  type: "number" | "string" | "boolean";
  /** Smallest and largest values seen across the amp's presets (numbers only). */
  min?: number;
  max?: number;
  /** Values seen (strings only). */
  values?: string[];
}

export interface ModelEntry {
  /** The amp's screen name, e.g. "Blues Drive". */
  label: string;
  params: Record<string, ParamSpec>;
  /** Settings used when none are given: the model's factory defaults, or else the first preset that uses it. */
  defaults: Record<string, ParamValue>;
  /** Preset names that use this model, as examples. */
  usedBy: string[];
}

export type Catalog = Record<BlockName, Record<string, ModelEntry>>;

const MAX_EXAMPLES = 4;

export function buildCatalog(presets: Preset[]): Catalog {
  const catalog = Object.fromEntries(BLOCKS.map((b) => [b, {}])) as Catalog;

  for (const preset of presets) {
    const name = preset.info?.displayName?.trim() ?? "";
    for (const node of preset.audioGraph?.nodes ?? []) {
      if (!(BLOCKS as readonly string[]).includes(node.nodeId)) continue;
      const model = shortModel(node.FenderId);
      const entry = (catalog[node.nodeId as BlockName][model] ??= { label: model, params: {}, defaults: {}, usedBy: [] });
      if (entry.usedBy.length < MAX_EXAMPLES && name && !entry.usedBy.includes(name)) entry.usedBy.push(name);

      for (const [key, value] of Object.entries(node.dspUnitParameters ?? {})) {
        if (key === "bypass" || key === "bypassType") continue;
        if (!(key in entry.defaults)) entry.defaults[key] = value;
        record(entry, key, value);
      }
    }
  }

  // Known models complete the list; their factory defaults win over a preset's.
  for (const block of BLOCKS) {
    for (const [model, known] of Object.entries(KNOWN_MODELS[block])) {
      const entry = (catalog[block][model] ??= { label: known.label, params: {}, defaults: {}, usedBy: [] });
      entry.label = known.label;
      entry.defaults = { ...entry.defaults, ...known.defaults };
      for (const [key, value] of Object.entries(known.defaults)) record(entry, key, value);
      for (const [key, values] of Object.entries(CHOICES[block]?.[model] ?? {})) {
        for (const value of values) record(entry, key, value);
      }
    }
  }
  return catalog;
}

function record(entry: ModelEntry, key: string, value: ParamValue): void {
  const type = typeof value as ParamSpec["type"];
  const spec = (entry.params[key] ??= { type });
  if (type === "number") {
    spec.min = Math.min(spec.min ?? Infinity, value as number);
    spec.max = Math.max(spec.max ?? -Infinity, value as number);
  } else if (type === "string") {
    spec.values ??= [];
    if (!spec.values.includes(value as string)) spec.values.push(value as string);
  }
}
