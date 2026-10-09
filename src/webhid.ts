// Browser transport, built on WebHID (Chrome and Edge on desktop, secure
// origins only). Import from "ltamp-js/webhid".

import { REPORT_SIZE } from "./protocol/framing.js";
import { FENDER_VENDOR_ID, LT_PRODUCT_IDS, type Transport } from "./transport.js";

export * from "./index.js";

// The parts of WebHID used here. TypeScript's DOM types don't include WebHID.
export interface HIDDevice extends EventTarget {
  readonly opened: boolean;
  readonly productId: number;
  readonly productName: string;
  open(): Promise<void>;
  close(): Promise<void>;
  sendReport(reportId: number, data: BufferSource): Promise<void>;
}

interface HIDInputReportEvent extends Event {
  readonly device: HIDDevice;
  readonly reportId: number;
  readonly data: DataView;
}

interface HIDConnectionEvent extends Event {
  readonly device: HIDDevice;
}

interface HID extends EventTarget {
  getDevices(): Promise<HIDDevice[]>;
  requestDevice(options: { filters: { vendorId?: number; productId?: number }[] }): Promise<HIDDevice[]>;
}

function hid(): HID | undefined {
  return typeof navigator === "undefined" ? undefined : (navigator as Navigator & { hid?: HID }).hid;
}

/** True when this browser can talk to USB HID devices. */
export function isWebHidSupported(): boolean {
  return hid() !== undefined;
}

const filters = Object.values(LT_PRODUCT_IDS).map((productId) => ({ vendorId: FENDER_VENDOR_ID, productId }));

/**
 * Show the browser's device picker for LT amps. Must be called from a user
 * gesture (e.g. a click). Returns undefined if the user cancels.
 */
export async function requestAmp(): Promise<HIDDevice | undefined> {
  const api = hid();
  if (!api) throw new Error("This browser can't connect to USB devices. Use Chrome or Edge on a computer.");
  const [device] = await api.requestDevice({ filters });
  return device;
}

/** Amps this site was already given permission for. No picker, no user gesture needed. */
export async function grantedAmps(): Promise<HIDDevice[]> {
  const known = new Set<number>(Object.values(LT_PRODUCT_IDS));
  return ((await hid()?.getDevices()) ?? []).filter((d) => known.has(d.productId));
}

export class WebHidTransport implements Transport {
  private reportHandler: (report: Uint8Array, hasReportId: boolean) => void = () => {};
  private errorHandler: (error: Error) => void = () => {};

  private readonly onInput = (event: Event) => {
    const { device, data } = event as HIDInputReportEvent;
    if (device !== this.device) return;
    // WebHID should strip the report ID, but on Windows the amp's reports still
    // arrive with a leading 0x00. Frame tags are never zero, so detect it.
    const bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    this.reportHandler(bytes, bytes[0] === 0x00);
  };

  private readonly onDisconnect = (event: Event) => {
    if ((event as HIDConnectionEvent).device === this.device) {
      this.errorHandler(new Error("The amp was disconnected."));
    }
  };

  private constructor(private readonly device: HIDDevice) {
    device.addEventListener("inputreport", this.onInput);
    hid()?.addEventListener("disconnect", this.onDisconnect);
  }

  static async open(device: HIDDevice): Promise<WebHidTransport> {
    if (!device.opened) {
      try {
        await device.open();
      } catch (e) {
        throw new Error(
          `Could not open the amp (${(e as Error).message}). ` +
            "Close Fender Tone and any other app or tab using it, then try again.",
        );
      }
    }
    return new WebHidTransport(device);
  }

  async write(report: Uint8Array): Promise<void> {
    const data = new Uint8Array(REPORT_SIZE);
    data.set(report.subarray(0, REPORT_SIZE));
    await this.device.sendReport(0, data);
  }

  onReport(handler: (report: Uint8Array, hasReportId: boolean) => void): void {
    this.reportHandler = handler;
  }

  onError(handler: (error: Error) => void): void {
    this.errorHandler = handler;
  }

  async close(): Promise<void> {
    this.device.removeEventListener("inputreport", this.onInput);
    hid()?.removeEventListener("disconnect", this.onDisconnect);
    if (this.device.opened) await this.device.close();
  }
}
