// USB HID framing. Every report is 64 bytes: [tag, length, ...payload, padding].
// Long messages are split across reports tagged start / continue / end.

export const REPORT_SIZE = 64;
const MAX_CHUNK = 61;

export const FrameTag = { Start: 0x33, Continue: 0x34, End: 0x35 } as const;

/** Split an encoded message into 64-byte reports (without a HID report ID). */
export function frame(payload: Uint8Array): Uint8Array[] {
  const chunks = Math.max(1, Math.ceil(payload.length / MAX_CHUNK));
  const reports: Uint8Array[] = [];
  for (let i = 0; i < chunks; i++) {
    const chunk = payload.subarray(i * MAX_CHUNK, (i + 1) * MAX_CHUNK);
    const tag = i === chunks - 1 ? FrameTag.End : i === 0 ? FrameTag.Start : FrameTag.Continue;
    const report = new Uint8Array(REPORT_SIZE);
    report[0] = tag;
    report[1] = chunk.length;
    report.set(chunk, 2);
    reports.push(report);
  }
  return reports;
}

/** Reassembles incoming reports into complete messages. */
export class Deframer {
  private buffer: number[] = [];

  /**
   * Feed one report. Some platforms prefix the report ID (0x00); pass
   * `hasReportId` so it is skipped. Returns a complete message on the final
   * report, otherwise `undefined`.
   */
  push(report: Uint8Array, hasReportId: boolean): Uint8Array | undefined {
    const offset = hasReportId ? 1 : 0;
    const tag = report[offset];
    const length = report[offset + 1];
    const value = report.subarray(offset + 2, offset + 2 + length);

    switch (tag) {
      case FrameTag.Start:
        this.buffer = [...value];
        return undefined;
      case FrameTag.Continue:
        this.buffer.push(...value);
        return undefined;
      case FrameTag.End: {
        this.buffer.push(...value);
        const message = Uint8Array.from(this.buffer);
        this.buffer = [];
        return message;
      }
      default:
        return undefined; // empty or unknown report
    }
  }
}
