// Play a preset file on the amp without saving it to any slot.
//   npm run audition -- examples/tones/comfortably-numb-solo.json
// Turn the preset knob (or run with --exit) to leave audition mode.

import { readFileSync } from "node:fs";
import { LtAmp, NodeHidTransport } from "../src/node.js";

const arg = process.argv[2];
if (!arg) {
  console.error("Usage: npm run audition -- <preset.json | --exit>");
  process.exit(1);
}

const amp = new LtAmp(await NodeHidTransport.open());
try {
  await amp.connect();
  if (arg === "--exit") {
    await amp.exitAudition();
    console.log("Left audition mode.");
  } else {
    // Round-trip through JSON.parse so a malformed file fails here, not on the amp
    const preset = JSON.stringify(JSON.parse(readFileSync(arg, "utf8")));
    await amp.audition(preset);
    console.log(`Auditioning "${JSON.parse(preset).info?.displayName?.trim()}"`);
    console.log("Auditioning now:", await amp.isAuditioning());
  }
} finally {
  await amp.close();
}
