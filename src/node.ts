// Node.js transport, built on node-hid.

import HID from "node-hid";
import { REPORT_SIZE } from "./protocol/framing.js";
import { FENDER_VENDOR_ID, LT_PRODUCT_IDS, type Transport } from "./transport.js";

export * from "./index.js";

export interface FoundAmp {
  path: string;
  productId: number;
  product?: string;
}

/** List connected LT amps. */
export function findAmps(): FoundAmp[] {
  const known = new Set<number>(Object.values(LT_PRODUCT_IDS));
  return HID.devices(FENDER_VENDOR_ID, 0)
    .filter((d) => d.path && known.has(d.productId))
    .map((d) => ({ path: d.path!, productId: d.productId, product: d.product }));
}

export class NodeHidTransport implements Transport {
  private device: HID.HIDAsync;
  private errorHandler: (error: Error) => void = () => {};

  private constructor(device: HID.HIDAsync) {
    this.device = device;
    device.on("error", (e: Error) => this.errorHandler(e));
  }

  /** Open the given amp, or the first one found. */
  static async open(path?: string): Promise<NodeHidTransport> {
    const target = path ?? findAmps()[0]?.path;
    if (!target) throw new Error("No Fender LT amp found. Is it plugged in and powered on?");
    try {
      return new NodeHidTransport(await HID.HIDAsync.open(target));
    } catch (e) {
      throw new Error(
        `Could not open the amp (${(e as Error).message}). ` +
          "Close Fender Tone and any other app using it, then try again.",
      );
    }
  }

  async write(report: Uint8Array): Promise<void> {
    // node-hid expects the report ID (0x00) as the first byte
    const data = new Uint8Array(REPORT_SIZE + 1);
    data.set(report.subarray(0, REPORT_SIZE), 1);
    await this.device.write(Buffer.from(data));
  }

  onReport(handler: (report: Uint8Array, hasReportId: boolean) => void): void {
    // A leading 0x00 is the report ID; frame tags are never zero.
    this.device.on("data", (data: Buffer) => handler(new Uint8Array(data), data[0] === 0x00));
  }

  onError(handler: (error: Error) => void): void {
    this.errorHandler = handler;
  }

  async close(): Promise<void> {
    this.device.removeAllListeners("data");
    await this.device.close();
  }
}
