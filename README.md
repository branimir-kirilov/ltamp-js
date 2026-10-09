# ltamp-js

Control Fender Mustang LT guitar amps over USB from Node.js — read presets,
switch slots, and audition new tones without saving them.

> Unofficial. Not affiliated with or endorsed by Fender. Tested on the
> Mustang LT25 (firmware 2.1.4); other LT models may work but are untested.

## Usage

```ts
import { LtAmp, NodeHidTransport } from "ltamp-js/node";

const amp = new LtAmp(await NodeHidTransport.open());
await amp.connect();

console.log(await amp.firmwareVersion());      // "2.1.4"
const preset = await amp.getPreset(1);          // slots are 1–60
console.log(JSON.parse(preset.json).info.displayName);

await amp.close();
```

Close Fender Tone first — only one program can hold the amp's USB connection.

| Method | What it does |
|---|---|
| `connect()` | Sync handshake + heartbeat. Call once after opening. |
| `firmwareVersion()`, `productId()` | Amp info |
| `currentPreset()` | Loaded preset JSON, slot, and whether it has unsaved edits |
| `getPreset(slot)` | Read a stored preset without loading it |
| `loadPreset(slot)` | Switch the amp to a slot |
| `audition(json)`, `exitAudition()`, `isAuditioning()` | Play a preset without saving it |
| `onMessage(fn)` | Every message from the amp, including knob turns |

## Development

```sh
npm install
npm test          # protocol encoding tests, no amp needed
npm run probe     # read-only: prints amp info and backs up all presets
```

## Protocol

The amp exposes a HID interface that exchanges protobuf messages split into
64-byte reports. This library implements its own minimal codec and schema for
interoperability. Thanks to [LtAmp](https://github.com/brentmaxwell/LtAmp) for
documenting the protocol and to [ltamp.py](https://github.com/bendertools/ltamp.py)
for the reference implementation the tests are checked against.
