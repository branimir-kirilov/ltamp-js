import { afterEach, describe, expect, it, vi } from "vitest";
import { LtAmp } from "../src/amp.js";
import { Deframer, FrameTag, frame } from "../src/protocol/framing.js";
import { decodeMessage, encodeMessage } from "../src/protocol/messages.js";
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

/** A fake amp that answers the sync handshake and firmware requests, and logs what it was sent. */
function fakeAmp() {
  const received: string[] = [];
  const deframer = new Deframer();
  let deliver: (report: Uint8Array, hasReportId: boolean) => void = () => {};
  const reply = (bytes: Uint8Array) => queueMicrotask(() => frame(bytes).forEach((r) => deliver(r, false)));
  const transport: Transport = {
    write: async (report) => {
      const bytes = deframer.push(report, false);
      const message = bytes && decodeMessage(bytes);
      if (!message) return;
      if (message.name === "modalStatusMessage") {
        const payload = message.payload as { context?: number; state?: number };
        received.push(`sync ${payload.context ?? 0}`);
        reply(encodeMessage("modalStatusMessage", payload));
        return;
      }
      received.push(message.name);
      if (message.name === "firmwareVersionRequest") reply(encodeMessage("firmwareVersionStatus", { version: "2.1.4" }));
    },
    onReport: (handler) => (deliver = handler),
    onError: () => {},
    close: async () => {},
  };
  return { transport, received };
}

describe("LtAmp session", () => {
  afterEach(() => vi.useRealTimers());

  it("re-syncs before a request when the amp has been silent long enough to drop the session", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const { transport, received } = fakeAmp();
    // No heartbeats, as when a background tab's timers are throttled.
    const amp = new LtAmp(transport, { heartbeatInterval: 2_000_000_000 });
    await amp.connect();
    await amp.firmwareVersion();
    expect(received).toEqual(["sync 0", "sync 1", "firmwareVersionRequest"]);

    vi.setSystemTime(Date.now() + 30_000);
    expect(await amp.firmwareVersion()).toBe("2.1.4");
    expect(received.slice(3)).toEqual(["sync 0", "sync 1", "firmwareVersionRequest"]);
    await amp.close();
  });
});
