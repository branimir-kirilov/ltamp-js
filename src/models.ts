// Every model the Mustang LT25 offers (20 amps, 25 effects), so a catalog is
// complete even when no preset on the amp uses a model yet. Labels are the
// amp's own screen names from the LT25 owner's manual. Defaults were read
// from an LT25 (firmware 2.1.4): the first factory preset that uses the
// model, or Fender Tone's starting values for a freshly added effect.

import type { BlockName, ParamValue } from "./tone.js";

export interface KnownModel {
  /** The name the amp's screen and Fender Tone show, e.g. "Blues Drive". */
  label: string;
  defaults: Record<string, ParamValue>;
}

export const KNOWN_MODELS: Record<BlockName, Record<string, KnownModel>> = {
  stomp: {
    // factory preset 2
    Overdrive: { label: "Overdrive", defaults: {level: 0.444444, mid: 0.5, high: 0.5, low: 0.5, gain: 0.653935} },
    // factory preset 24
    Greenbox: { label: "Blues Drive", defaults: {level: -6, gain: 0.288889, tone: 0.144444, blend: 1} },
    // factory preset 20
    MythicDrive: { label: "Myth Drive", defaults: {treble: 0.777778, outputLevel: 0.5, gain: 0.5} },
    // Fender Tone default
    Blackbox: { label: "Rock Dirt", defaults: {level: -30, gain: 0.5, tone: 0.333} },
    // factory preset 19
    VariFuzz: { label: "Fuzz", defaults: {level: 0.1, gain: 1, tone: "normal"} },
    // factory preset 28
    BigFuzz: { label: "Big Fuzz", defaults: {level: -24.711111, gain: 0.311111, tone: 0.566667} },
    // factory preset 16
    Octobot: { label: "Octobot", defaults: {level: 0.5, octdown: 1, octup: 1} },
    // factory preset 1
    SimpleCompressor: { label: "Compressor", defaults: {type: "medium"} },
    // factory preset 13
    Sustain: { label: "Sustain", defaults: {outputLevel: 0.577778, sensitivity: 0.5} },
    // factory preset 14
    ChromeGate: { label: "Metal Gate", defaults: {attenuation: -120, hysteresis: 2.5, gateDetectorPosition: "jack", threshold: -65.555557} },
    // factory preset 8
    MustangFiveBandEq1: { label: "5-Band EQ", defaults: {low: 0, lowmid: 2.5, mid: 11.000001, highmid: 1.5, high: 0, gain: 0} },
  },
  mod: {
    // factory preset 11
    ChorusTriangle: { label: "Chorus", defaults: {level: 0.458346, rateHz: 0.08, tapTimeBPM: 4.8, noteDivision: "off", depth: 1, lrPhase: 0.5, avgDelay: 0.22} },
    // factory preset 23
    TriangleFlanger: { label: "Flanger", defaults: {level: 1, rate: 0.106745, tapTimeBPM: 120, noteDivision: "off", depth: 0.666667, feedback: 0.777778, phase: 0.25} },
    // factory preset 5
    Vibratone: { label: "Vibratone", defaults: {rotor: 1.07, feedback: 0.68, noteDivision: "off", level: 0.96, tapTimeBPM: 120, depth: 0.18, phase: 0.52} },
    // factory preset 12
    SineTremolo: { label: "Tremolo", defaults: {duty: 0.5, noteDivision: "off", dist: 0, level: 0.78976, shape: 0, tapTimeBPM: 120, rate: 5.07} },
    // factory preset 18
    Phaser: { label: "Phaser", defaults: {noteDivision: "off", feedback: 0.72, level: 0.99, depth: 0.99, shape: "sine", tapTimeBPM: 120, rate: 0.46695} },
    // factory preset 29
    StepFilter: { label: "Step Filter", defaults: {noteDivision: "off", level: 0.733333, tapTimeBPM: 120, rate: 5.07, hiFrq: 0.5, reson: 0.5, loFrq: 0.5} },
    // factory preset 21
    EcFilter: { label: "Touch Wah", defaults: {level: 0.811111, q: 0.5, thresh: 0.5, mode: "High Up", type: "Band Pass"} },
  },
  amp: {
    // factory preset 27
    Twin57: { label: "50s Twin", defaults: {cabsimType: "65twn", presence: 0.5, treb: 0.7, sag: "match", mid: 0.544444, volume: -12.769779, gateDetectorPosition: "jack", bias: 0.5, gain: 0.322222, gatePreset: "off", bass: 0.62} },
    // factory preset 10
    Ac30Tb: { label: "60s UK Clean", defaults: {volume: -0.799366, gatePreset: "off", gateDetectorPosition: "jack", cabsimType: "2x12c", gain: 0.322222, treb: 0.783447, mid: 0.633333, bass: 0.7, sag: "match", bias: 0.5, master: 0.376471, cut: 0.5, bright: true} },
    // factory preset 4
    Plexi87: { label: "70s Rock", defaults: {cabsimType: "4x12g", presence: 0.5, treb: 1, sag: "match", mid: -4.400125, volume: -6.506824, gateDetectorPosition: "jack", bias: 0.5, gain: 0.766667, gatePreset: "low", blend: 0.5, bass: 0.466667} },
    // factory preset 15
    DR103: { label: "70s UK Clean", defaults: {volume: -2.06803, gatePreset: "off", gateDetectorPosition: "jack", cabsimType: "4x12v", gain: 0.3, treb: 0.721569, mid: 0.643137, bass: 0.698039, sag: "match", bias: 0.5, master: 1, presence: 0.5} },
    // factory preset 16
    Jcm800: { label: "80s Rock", defaults: {volume: -11.999981, gatePreset: "low", gateDetectorPosition: "jack", cabsimType: "4x12m", gain: 0.99, treb: 0.67, mid: 0.4, bass: 0.75, sag: "match", bias: 0.5, master: 0.5, presence: 0.5} },
    // factory preset 7
    Rect2: { label: "90s Rock", defaults: {volume: -12.769779, gatePreset: "high", gateDetectorPosition: "jack", cabsimType: "4x12v2", gain: 0.6, treb: 0.533333, mid: 0.2, bass: 0.644444, sag: "match", bias: 0.5, master: 0.380392, presence: 0.392157} },
    // factory preset 3
    Bassman59: { label: "Bassman", defaults: {volume: -14.413998, gatePreset: "off", gateDetectorPosition: "jack", cabsimType: "59bman", gain: 0.555556, treb: 0.377778, mid: 0.49, bass: 0.62, sag: "match", bias: 0.5, presence: 0.62, blend: 0.62} },
    // factory preset 2
    SuperSonic: { label: "Burn", defaults: {gain2: 0.5, cabsimType: "1x12ss", treb: 0.722222, sag: "match", mid: 0.722222, volume: -14.849238, gateDetectorPosition: "jack", bias: 0.5, master: 0.360784, gain: 0.333333, gatePreset: "mid", bass: 0.666667} },
    // factory preset 17
    Champ57: { label: "Champ", defaults: {cabsimType: "57champ", treb: 1, sag: "match", mid: 0.477778, volume: -15.295096, gateDetectorPosition: "jack", bias: 0.5, gain: 0.243137, gatePreset: "off", bass: 0} },
    // factory preset 6
    Deluxe65: { label: "Deluxe Clean", defaults: {cabsimType: "65dlx", treb: 0.560784, sag: "match", mid: 0.744444, volume: -15.752095, gateDetectorPosition: "jack", bias: 0.5, gain: 0.254883, gatePreset: "off", bass: 0.344444} },
    // factory preset 21
    Deluxe57: { label: "Deluxe Dirt", defaults: {cabsimType: "57dlx", treb: 0.844444, sag: "match", mid: 0.5, volume: -9.208964, gateDetectorPosition: "jack", bias: 0.5, gain: 0.722222, gatePreset: "off", bass: 0.5} },
    // factory preset 24
    Or120: { label: "Doom Metal", defaults: {volume: -7.07374, gatePreset: "off", gateDetectorPosition: "jack", cabsimType: "4x12m2", gain: 0.5, treb: 0.588889, mid: 0.611111, bass: 0.666667, sag: "match", bias: 0.5, master: 0.498039} },
    // factory preset 28
    Excelsior: { label: "Excelsior", defaults: {volume: -16.220806, gatePreset: "off", gateDetectorPosition: "jack", cabsimType: "exlsr", gain: 0.233333, bright: true, sag: "match", bias: 0.5, treb: 0.222222, mid: 0.5, bass: 0.922222} },
    // factory preset 11
    MetalRect2: { label: "Alt Metal", defaults: {volume: -10.206342, gatePreset: "super", gateDetectorPosition: "jack", cabsimType: "4x12r", gain: 0.769145, treb: 0.602199, mid: 0.135629, bass: 0.857598, sag: "match", bias: 0.5, master: 0.380392, presence: 0.392157} },
    // user preset 31
    Evh3: { label: "Metal 2000", defaults: {volume: -18.763546, gatePreset: "high", gateDetectorPosition: "jack", cabsimType: "4x12g2", gain: 0.888889, treb: 0.888889, mid: 0.333333, bass: 0.888889, sag: "match", bias: 0.5, master: 0.5, presence: 0.5} },
    // factory preset 23
    Princeton65: { label: "Princeton", defaults: {volume: -13.167182, gatePreset: "off", gateDetectorPosition: "jack", cabsimType: "65prince", gain: 0.233333, treb: 1, mid: 0.839216, bass: 0.337255, sag: "match", bias: 0.5} },
    // factory preset 8
    Silvertone: { label: "Small Tone", defaults: {volume: -18.225922, gatePreset: "off", gateDetectorPosition: "jack", cabsimType: "57dlx", gain: 1, treb: 0.67, mid: 0.898039, bass: 0.662745, sag: "match", bias: 0.5} },
    // factory preset 9
    LinearGain: { label: "Super Clean", defaults: {cabsimType: "none", treb: 0.5, mid: 0.5, volume: -2.06803, gateDetectorPosition: "jack", gain: 0.5, gatePreset: "off", bass: 0.5} },
    // factory preset 14
    MetalEvh3: { label: "Super Heavy", defaults: {cabsimType: "4x12frd", presence: 0.5, treb: 0.785082, sag: "match", mid: 0.188889, volume: -13.988875, gateDetectorPosition: "jack", bias: 0.5, master: 0.5, gain: 0.77273, gatePreset: "super", bass: 0.078254} },
    // factory preset 1
    Twin65: { label: "Twin Clean", defaults: {volume: -11.12674, gatePreset: "off", gateDetectorPosition: "jack", cabsimType: "65twn", gain: 0.337255, treb: 0.342816, mid: 0.5, bass: 0.555556, sag: "match", bias: 0.5, bright: true} },
  },
  delay: {
    // factory preset 3
    MonoDelay: { label: "Delay", defaults: {level: 0.288889, time: 0.095, tapTimeBPM: 631.578857, noteDivision: "off", feedback: 0.222222, brite: 0.5, attenuate: 0.5} },
    // Fender Tone default
    ReverseDelay: { label: "Reverse", defaults: {level: 0.75, time: 0.4, tapTimeBPM: 150, noteDivision: "off", feedback: 0.3, attenuate: 1, chase: 0.65} },
    // factory preset 2
    TapeDelayLite: { label: "Echo", defaults: {noteDivision: "off", wowLevel: 1, feedback: 0.044444, tapTimeBPM: 120, dlyTime: 0.18, wetLvl: 0.223, stereoSpread: 0} },
  },
  reverb: {
    // factory preset 24
    LargeHallReverb: { label: "Large Hall", defaults: {level: 0.1675, decay: 0.277778, dwell: 0.5, diffuse: 0.0222, tone: 0.633333} },
    // factory preset 3
    SmallRoomReverb: { label: "Small Room", defaults: {level: 0.3118, decay: 0.5, dwell: 0.5, diffuse: 0.5, tone: 0.5} },
    // factory preset 1
    Spring65: { label: "Spring 65", defaults: {wetLvl: 0.5, decay: 0.388889, dwell: 0.28889, diffuse: 1, tone: 1} },
    // factory preset 4
    LargePlate: { label: "Plate", defaults: {tone: 0.744444, decay: 0.677778, level: 0.166667, dwell: 0.5, diffuse: 0.5} },
    // factory preset 29
    ArenaReverb: { label: "Arena", defaults: {tone: 0.5, decay: 0.5, level: 0.4, dwell: 0.5, diffuse: 0.5} },
  },
};

/** The amp's screen name for a model, or the model name itself when it isn't a known LT25 model. */
export function modelLabel(block: BlockName, model: string): string {
  return model === "Passthru" ? "None" : (KNOWN_MODELS[block]?.[model]?.label ?? model);
}

export interface KnobRange {
  min: number;
  max: number;
  unit?: "dB" | "s" | "Hz";
}

// Measured on an LT25 (firmware 2.1.4) by turning every knob in Fender Tone
// all the way down and up. Settings not listed are 0–1 knobs. "*" means
// every model in the block.
const RANGES: Record<BlockName, Record<string, Record<string, KnobRange>>> = {
  stomp: {
    Blackbox: { level: { min: -40, max: -7, unit: "dB" } },
    Greenbox: { level: { min: -27, max: 0, unit: "dB" } },
    BigFuzz: { level: { min: -40, max: -8, unit: "dB" } },
    ChromeGate: { threshold: { min: -70, max: -30, unit: "dB" } },
    MustangFiveBandEq1: Object.fromEntries(
      ["low", "lowmid", "mid", "highmid", "high"].map((k) => [k, { min: -12, max: 12, unit: "dB" as const }]),
    ),
  },
  mod: {
    Vibratone: { rotor: { min: 0.67, max: 5.67, unit: "Hz" } },
    SineTremolo: { rate: { min: 1.3, max: 10, unit: "Hz" } },
    ChorusTriangle: { rateHz: { min: 0.08, max: 10, unit: "Hz" } },
    TriangleFlanger: { rate: { min: 0.08, max: 10, unit: "Hz" } },
    Phaser: { rate: { min: 0.08, max: 10, unit: "Hz" } },
    StepFilter: { rate: { min: 0.08, max: 10, unit: "Hz" } },
  },
  amp: { "*": { volume: { min: -60, max: 0, unit: "dB" } } },
  delay: {
    "*": {
      time: { min: 0.03, max: 1, unit: "s" },
      dlyTime: { min: 0.03, max: 1, unit: "s" },
      level: { min: 0.001, max: 1 },
      wetLvl: { min: 0.001, max: 1 },
    },
  },
  reverb: { "*": { level: { min: 0.001, max: 1 } } },
};

// Settings Fender Tone doesn't show as knobs: they stayed put while every
// knob was turned. Tempo follows the rate or time knob (see syncTempo).
const FIXED_EVERYWHERE = new Set([
  "tapTimeBPM",
  "noteDivision",
  "gateDetectorPosition",
  "bias",
  "sag",
  "dwell",
  "diffuse",
  "attenuate",
  "chase",
  "duty",
  "dist",
  "lrPhase",
  "avgDelay",
  "stereoSpread",
  "hysteresis",
  "attenuation",
]);
const FIXED: Partial<Record<BlockName, Record<string, string[]>>> = {
  stomp: { MustangFiveBandEq1: ["gain"] },
  mod: { Phaser: ["feedback", "shape"], TriangleFlanger: ["phase"], SineTremolo: ["shape"] },
};

/** The measured range of a knob, when it isn't a plain 0–1 knob or hasn't been measured. */
export function knobRange(block: BlockName, model: string, key: string): KnobRange | undefined {
  return RANGES[block][model]?.[key] ?? RANGES[block]["*"]?.[key];
}

/** True for settings that Fender Tone doesn't let you change. Editors should leave them alone. */
export function isFixedSetting(block: BlockName, model: string, key: string): boolean {
  return FIXED_EVERYWHERE.has(key) || (FIXED[block]?.[model]?.includes(key) ?? false);
}
