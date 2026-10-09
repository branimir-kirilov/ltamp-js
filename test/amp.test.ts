import { describe, expect, it } from "vitest";
import { LtAmp } from "../src/amp.js";
import { FrameTag } from "../src/protocol/framing.js";
import type { Transport } from "../src/transport.js";

/** A transport whose writes complete asynchronously, like WebHID's sendReport. */
function slowTransport() {
  const written: Uint8Array[] = [];
  const transport: Transport = {
    write: async (report) => {
      await new Promise((r) => setTimeout(r, 1));
      written.push(report);
    },
    onReport: () => {},
    onError: () => {},
    close: async () => {},
  };
  return { transport, written };
}

describe("LtAmp.send", () => {
  it("keeps each message's reports together when messages overlap", async () => {
    const { transport, written } = slowTransport();
    const amp = new LtAmp(transport);
    // A long message (many reports) and a heartbeat sent while it is in flight.
    const long = amp.send("auditionPreset", { presetData: "x".repeat(2000) });
    const heartbeat = amp.send("heartbeat", { dummyField: true });
    await Promise.all([long, heartbeat]);

    // The long message in one piece (Start, Continue…, End), then the heartbeat's single End.
    const tags = written.map((r) => r[0]);
    const continues = tags.length - 3;
    expect(continues).toBeGreaterThan(0);
    expect(tags).toEqual([FrameTag.Start, ...Array(continues).fill(FrameTag.Continue), FrameTag.End, FrameTag.End]);
    await amp.close();
  });
});
