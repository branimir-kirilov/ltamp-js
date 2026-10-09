/** Fender's USB vendor ID, shared by the whole LT family. */
export const FENDER_VENDOR_ID = 0x1ed8;

/** Known LT product IDs. Only the LT25 has been tested so far. */
export const LT_PRODUCT_IDS = {
  "mustang-lt-25": 0x0037,
} as const;

/**
 * A raw connection to the amp's HID interface. Implementations exist for
 * Node (node-hid) and, later, the browser (WebHID).
 */
export interface Transport {
  /** Send one 64-byte report (no report ID; the transport adds it if needed). */
  write(report: Uint8Array): Promise<void>;
  /** Register the handler for incoming reports. */
  onReport(handler: (report: Uint8Array, hasReportId: boolean) => void): void;
  /** Register the handler for transport failures (e.g. the amp was unplugged). */
  onError(handler: (error: Error) => void): void;
  close(): Promise<void>;
}
