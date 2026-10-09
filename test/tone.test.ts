import { describe, expect, it } from "vitest";
import { buildCatalog } from "../src/catalog.js";
import { KNOWN_MODELS, modelLabel } from "../src/models.js";
import { buildPreset, displayName, isBlank, summarize, toTone, ToneError, type Preset } from "../src/tone.js";

// Hand-made presets in the amp's format (not copies of factory presets).
const node = (nodeId: string, FenderId: string, dspUnitParameters: Record<string, unknown> = {}) => ({
  nodeId,
  nodeType: "dspUnit",
  FenderId,
  dspUnitParameters,
});

const blank: Preset = {
  info: { displayName: "EMPTY           " },
  audioGraph: {
    nodes: [
      node("stomp", "DUBS_Passthru"),
      node("mod", "DUBS_Passthru"),
      node("amp", "DUBS_LinearGain", {
        volume: 0,
        gatePreset: "off",
        gateDetectorPosition: "jack",
        cabsimType: "none",
        gain: 0.5,
        treb: 0.5,
        mid: 0.5,
        bass: 0.5,
      }),
      node("delay", "DUBS_Passthru"),
      node("reverb", "DUBS_Passthru"),
    ],
  },
} as Preset;

const lead: Preset = {
  info: { displayName: "TEST    LEAD    " },
  audioGraph: {
    nodes: [
      node("stomp", "DUBS_BigFuzz", { bypass: false, bypassType: "Post", level: -20, gain: 0.4, tone: 0.5 }),
      node("mod", "DUBS_Passthru"),
      node("amp", "DUBS_DR103", { volume: -10, gain: 0.3, treb: 0.6, cabsimType: "4x12v", bright: true }),
      node("delay", "DUBS_MonoDelay", { bypass: true, bypassType: "Pre", level: 0.3, time: 0.4 }),
      node("reverb", "DUBS_Passthru"),
    ],
  },
} as Preset;

const loud: Preset = {
  info: { displayName: "LOUD" },
  audioGraph: { nodes: [node("amp", "DUBS_DR103", { volume: -2, gain: 0.9, treb: 0.2, cabsimType: "4x12v", bright: false })] },
} as Preset;

const catalog = buildCatalog([blank, lead, loud]);

describe("catalog", () => {
  it("records models per block with ranges, values and defaults", () => {
    const dr103 = catalog.amp.DR103;
    expect(dr103.params.gain).toEqual({ type: "number", min: 0.3, max: 0.9 });
    expect(dr103.params.cabsimType).toEqual({ type: "string", values: ["4x12v"] });
    expect(dr103.defaults.gain).toBe(0.3); // first preset that used it
    expect(dr103.usedBy).toEqual(["TEST    LEAD", "LOUD"]);
    expect(catalog.stomp.BigFuzz.params.bypass).toBeUndefined();
  });

  it("knows every LT25 model even when no preset uses it", () => {
    const empty = buildCatalog([]);
    const count = (b: keyof typeof empty) => Object.keys(empty[b]).length;
    expect([count("stomp"), count("mod"), count("amp"), count("delay"), count("reverb")]).toEqual([11, 7, 20, 3, 5]);
    expect(empty.stomp.Blackbox).toMatchObject({ label: "Rock Dirt", defaults: { level: -30, gain: 0.5, tone: 0.333 } });
    expect(empty.delay.ReverseDelay.params.time).toEqual({ type: "number", min: 0.4, max: 0.4 });
  });

  it("still learns models it doesn't know from presets", () => {
    const future = { audioGraph: { nodes: [node("amp", "DUBS_FutureAmp", { gain: 0.2 })] } } as Preset;
    expect(buildCatalog([future]).amp.FutureAmp).toEqual({
      label: "FutureAmp",
      params: { gain: { type: "number", min: 0.2, max: 0.2 } },
      defaults: { gain: 0.2 },
      usedBy: [],
    });
  });

  it("labels models with the amp's screen names", () => {
    expect(modelLabel("amp", "DR103")).toBe("70s UK Clean");
    expect(modelLabel("stomp", "Greenbox")).toBe("Blues Drive");
    expect(modelLabel("delay", "Passthru")).toBe("None");
    expect(modelLabel("amp", "FutureAmp")).toBe("FutureAmp");
  });
});

describe("isBlank", () => {
  it("recognises the factory blank by content", () => {
    expect(isBlank(blank)).toBe(true);
  });

  it("rejects a real tone even when it's named EMPTY", () => {
    expect(isBlank({ ...lead, info: { displayName: "EMPTY" } })).toBe(false);
  });

  it("rejects a blank-looking slot with a tweaked amp", () => {
    const tweaked = structuredClone(blank);
    tweaked.audioGraph!.nodes![2].dspUnitParameters.gain = 0.6;
    expect(isBlank(tweaked)).toBe(false);
  });
});

describe("toTone", () => {
  it("drops bypass bookkeeping and marks bypassed blocks", () => {
    const tone = toTone(lead);
    expect(tone.name).toBe("TEST    LEAD");
    expect(tone.stomp).toEqual({ model: "BigFuzz", params: { level: -20, gain: 0.4, tone: 0.5 } });
    expect(tone.delay).toEqual({ model: "MonoDelay", params: { level: 0.3, time: 0.4 }, enabled: false });
    expect(tone.mod).toEqual({ model: "Passthru" });
  });
});

describe("buildPreset", () => {
  it("fills omitted settings from defaults and wires a full chain", () => {
    const { preset, warnings } = buildPreset(
      { name: "Numb", stomp: { model: "BigFuzz", params: { gain: 0.8 } }, amp: { model: "DR103" } },
      catalog,
    );
    expect(warnings).toEqual([]);
    const nodes = preset.audioGraph!.nodes!;
    expect(nodes.map((n) => n.FenderId)).toEqual([
      "DUBS_BigFuzz",
      "DUBS_Passthru",
      "DUBS_DR103",
      "DUBS_Passthru",
      "DUBS_Passthru",
    ]);
    // Factory defaults for known models; settings seen only in presets are kept too.
    expect(nodes[0].dspUnitParameters).toEqual({ ...KNOWN_MODELS.stomp.BigFuzz.defaults, gain: 0.8, bypass: false, bypassType: "Post" });
    expect(nodes[2].dspUnitParameters).toEqual({ ...KNOWN_MODELS.amp.DR103.defaults, bright: true });
    expect(preset.audioGraph!.connections).toHaveLength(12);
    expect(preset.info!.displayName).toBe("NUMB            ");
    expect(summarize(preset)).toBe("BigFuzz → DR103");
  });

  it("round-trips through toTone", () => {
    const { preset } = buildPreset(toTone(lead), catalog);
    // Settings the tone leaves out are filled in; everything it gives survives.
    expect(toTone(preset)).toMatchObject(toTone(lead));
    expect(toTone(buildPreset(toTone(preset), catalog).preset)).toEqual(toTone(preset));
  });

  it("accepts the DUBS_ prefix", () => {
    expect(() => buildPreset({ name: "x", amp: { model: "DUBS_DR103" } }, catalog)).not.toThrow();
  });

  it("collects every problem in one error", () => {
    const attempt = () =>
      buildPreset(
        {
          name: "bad",
          stomp: { model: "TubeScreamer" },
          amp: { model: "DR103", params: { gian: 0.5, treb: "high" } },
        },
        catalog,
      );
    expect(attempt).toThrow(ToneError);
    try {
      attempt();
    } catch (e) {
      const problems = (e as ToneError).problems;
      expect(problems).toHaveLength(3);
      expect(problems[0]).toMatch(/unknown model "TubeScreamer". Known: BigFuzz/);
      expect(problems[1]).toMatch(/unknown setting "gian"/);
      expect(problems[2]).toMatch(/"treb" must be a number/);
    }
  });

  it("requires an amp", () => {
    expect(() => buildPreset({ name: "x", amp: { model: "Passthru" } }, catalog)).toThrow(/needs an amp model/);
  });

  it("allows any 0–1 knob value, but warns on off-scale numbers and unseen strings", () => {
    const fine = buildPreset({ name: "x", amp: { model: "DR103", params: { gain: 1, treb: 0, volume: -30 } } }, catalog);
    expect(fine.warnings).toEqual([]);

    const { warnings } = buildPreset(
      { name: "x", amp: { model: "DR103", params: { gain: 7, volume: 6, cabsimType: "1x12" } } },
      catalog,
    );
    expect(warnings).toHaveLength(3);
  });
});

describe("displayName", () => {
  it("upper-cases and fits the 16-character display", () => {
    expect(displayName("Comfortably Numb Outro")).toBe("COMFORTABLY NUMB");
  });
});

