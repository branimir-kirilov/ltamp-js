// Read-only check: connect, print the amp's info, and back up every preset.
// Nothing here changes the amp. Run with Fender Tone closed:  npm run probe

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { LtAmp, NodeHidTransport } from "../src/node.js";

const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
const backupDir = join(import.meta.dirname, "..", "backups", stamp);

const amp = new LtAmp(await NodeHidTransport.open());
try {
  await amp.connect();
  console.log("Firmware:  ", await amp.firmwareVersion());
  console.log("Product ID:", await amp.productId());

  const current = await amp.currentPreset();
  console.log(`Current slot: ${current.slot}${current.dirty ? " (unsaved edits)" : ""}`);

  mkdirSync(backupDir, { recursive: true });
  writeFileSync(join(backupDir, "current.json"), current.json);

  for (let slot = 1; slot <= 60; slot++) {
    const preset = await amp.getPreset(slot);
    const data = JSON.parse(preset.json);
    console.log(`  slot ${String(preset.slot).padStart(2)}: ${data.info?.displayName?.trim() ?? "?"}`);
    writeFileSync(join(backupDir, `slot_${String(preset.slot).padStart(2, "0")}.json`), JSON.stringify(data, null, 2));
  }
  console.log(`\nBacked up 60 presets to ${backupDir}`);
} finally {
  await amp.close();
}
