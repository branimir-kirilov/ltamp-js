// Save a preset file to a slot. Backs up the slot first and refuses to
// overwrite it unless you pass --force. A slot named "EMPTY" can still hold a
// real tone, so names alone never count as safe to overwrite.
//   npm run save -- examples/tones/comfortably-numb-outro.json 40

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { LtAmp, NodeHidTransport } from "../src/node.js";

const [file, slotArg, flag] = process.argv.slice(2);
const slot = Number(slotArg);
if (!file || !Number.isInteger(slot)) {
  console.error("Usage: npm run save -- <preset.json> <slot 1-60> [--force]");
  process.exit(1);
}

const preset = JSON.parse(readFileSync(file, "utf8"));
const name: string = preset.info?.displayName?.trim() ?? "?";

const amp = new LtAmp(await NodeHidTransport.open());
try {
  await amp.connect();

  const existing = await amp.getPreset(slot);
  const existingName: string = JSON.parse(existing.json).info?.displayName?.trim() ?? "?";
  if (flag !== "--force") {
    const ampNode = existing.json && JSON.parse(existing.json).audioGraph?.nodes?.find((n: { nodeId: string }) => n.nodeId === "amp");
    console.error(
      `Slot ${slot} holds "${existingName}" (${ampNode?.FenderId?.replace("DUBS_", "") ?? "unknown amp"}). ` +
        "Pass --force to overwrite it; the current contents will be backed up first.",
    );
    process.exitCode = 1;
  } else {
    const backupDir = join(import.meta.dirname, "..", "backups", "overwritten");
    mkdirSync(backupDir, { recursive: true });
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    writeFileSync(join(backupDir, `slot_${slot}_${stamp}.json`), existing.json);

    await amp.savePreset(slot, JSON.stringify(preset));

    const saved = JSON.parse((await amp.getPreset(slot)).json);
    if (saved.info?.preset_id !== preset.info?.preset_id) throw new Error("Read-back didn't match what was saved");
    console.log(`Saved "${name}" to slot ${slot} (was "${existingName}"; backup in backups/overwritten/)`);
  }
} finally {
  await amp.close();
}
