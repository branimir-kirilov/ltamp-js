import { Deframer, frame } from "./protocol/framing.js";
import {
  decodeMessage,
  encodeMessage,
  ModalContext,
  ModalState,
  UnsupportedStatus,
  type Message,
  type PayloadName,
  type PayloadOf,
} from "./protocol/messages.js";
import type { Transport } from "./transport.js";

export interface AmpOptions {
  /** How long to wait for a reply, in ms. Default 2000. */
  timeout?: number;
  /** Heartbeat period in ms; the amp drops the session without one. Default 1000. */
  heartbeatInterval?: number;
}

export interface PresetSlot {
  slot: number;
  /** The preset as the raw JSON string the amp sent. */
  json: string;
}

export interface CurrentPreset extends PresetSlot {
  /** True when the loaded preset has unsaved edits (e.g. knobs were turned). */
  dirty: boolean;
}

type Listener = (message: Message) => void;

interface Pending {
  expect: readonly PayloadName[];
  resolve: (message: Message) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

const statusNames = Object.fromEntries(Object.entries(UnsupportedStatus).map(([k, v]) => [v, k]));

/**
 * A session with a Mustang LT amp. Requests are sent one at a time; each waits
 * for its matching reply.
 *
 * Slots are numbered 1–60, as on the amp's display.
 */
export class LtAmp {
  private readonly deframer = new Deframer();
  private readonly listeners = new Set<Listener>();
  private readonly timeout: number;
  private readonly heartbeatInterval: number;
  private heartbeat?: ReturnType<typeof setInterval>;
  private pending?: Pending;
  private queue: Promise<unknown> = Promise.resolve();
  private closed = false;
  /** Writes in flight. Each message's reports must reach the amp back to back. */
  private writing: Promise<void> = Promise.resolve();

  constructor(
    private readonly transport: Transport,
    options: AmpOptions = {},
  ) {
    this.timeout = options.timeout ?? 2000;
    this.heartbeatInterval = options.heartbeatInterval ?? 1000;
    transport.onReport((report, hasReportId) => {
      const bytes = this.deframer.push(report, hasReportId);
      if (bytes) this.dispatch(bytes);
    });
    transport.onError((error) => {
      this.pending?.reject(error);
      this.pending = undefined;
    });
  }

  /** Run the sync handshake and start the heartbeat. Call once after opening. */
  async connect(): Promise<void> {
    await this.request("modalStatusMessage", { context: ModalContext.SYNC_BEGIN, state: ModalState.OK }, [
      "modalStatusMessage",
    ]);
    await this.request("modalStatusMessage", { context: ModalContext.SYNC_END, state: ModalState.OK }, [
      "modalStatusMessage",
    ]);
    this.heartbeat = setInterval(() => {
      this.send("heartbeat", { dummyField: true }).catch(() => {});
    }, this.heartbeatInterval);
    (this.heartbeat as { unref?: () => void }).unref?.();
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    clearInterval(this.heartbeat);
    await this.queue.catch(() => {});
    await this.transport.close();
  }

  /** Subscribe to every decoded message, including unsolicited ones (knob turns, preset changes). */
  onMessage(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async firmwareVersion(): Promise<string> {
    const reply = await this.request("firmwareVersionRequest", { request: true }, ["firmwareVersionStatus"]);
    return reply.payload.version ?? "";
  }

  async productId(): Promise<string> {
    const reply = await this.request("productIdentificationRequest", { request: true }, [
      "productIdentificationStatus",
    ]);
    return reply.payload.id ?? "";
  }

  /** The preset currently loaded on the amp, including unsaved edits. */
  async currentPreset(): Promise<CurrentPreset> {
    const reply = await this.request("currentPresetRequest", { request: true }, ["currentPresetStatus"]);
    return {
      slot: reply.payload.currentSlotIndex ?? 0,
      json: reply.payload.currentPresetData ?? "",
      dirty: reply.payload.currentPresetDirtyStatus ?? false,
    };
  }

  /** Read a stored preset without loading it. */
  async getPreset(slot: number): Promise<PresetSlot> {
    assertSlot(slot);
    const reply = await this.request("retrievePreset", { slot }, ["presetJSONMessage"]);
    return { slot: reply.payload.slotIndex ?? slot, json: reply.payload.data ?? "" };
  }

  /** Switch the amp to a stored preset (like turning the preset knob). */
  async loadPreset(slot: number): Promise<number> {
    assertSlot(slot);
    const reply = await this.request("loadPreset", { presetIndex: slot }, [
      "currentLoadedPresetIndexStatus",
      "currentPresetStatus",
    ]);
    const p = reply.payload as Record<string, number | undefined>;
    return p.currentLoadedPresetIndex ?? p.currentSlotIndex ?? slot;
  }

  /**
   * Play a preset on the amp without saving it anywhere. The amp stays in
   * audition mode until `exitAudition()` or a preset change.
   */
  async audition(presetJson: string): Promise<void> {
    await this.request("auditionPreset", { presetData: presetJson }, ["auditionPresetStatus"]);
  }

  /**
   * Write a preset into a slot, replacing whatever is there. With `load`, the
   * amp also switches to it. Callers should back up the slot first.
   */
  async savePreset(slot: number, presetJson: string, { load = false } = {}): Promise<void> {
    assertSlot(slot);
    await this.request("savePresetAs", { presetData: presetJson, isLoadPreset: load, presetSlot: slot }, [
      "newPresetSavedStatus",
      "presetSavedStatus",
    ]);
  }

  async exitAudition(): Promise<void> {
    await this.request("exitAuditionPreset", { exit: true }, ["exitAuditionPresetStatus"]);
  }

  async isAuditioning(): Promise<boolean> {
    const reply = await this.request("auditionStateRequest", { request: true }, ["auditionStateStatus"]);
    return reply.payload.isAuditioning ?? false;
  }

  /**
   * Send a message without waiting for a reply. Messages are written one at a
   * time: a long message spans many reports, and in the browser each write is
   * asynchronous, so without this the heartbeat could land between a tone's
   * reports and garble it (the amp then drops the connection).
   */
  send<N extends PayloadName>(name: N, payload: Partial<PayloadOf<N>>): Promise<void> {
    if (this.closed) return Promise.reject(new Error("Amp connection is closed"));
    const reports = frame(encodeMessage(name, payload));
    const write = async () => {
      for (const report of reports) await this.transport.write(report);
    };
    const result = this.writing.then(write, write);
    this.writing = result.catch(() => {});
    return result;
  }

  /** Send a message and wait for the first reply whose payload is one of `expect`. */
  request<N extends PayloadName, R extends PayloadName>(
    name: N,
    payload: Partial<PayloadOf<N>>,
    expect: readonly R[],
  ): Promise<Message<R>> {
    const run = () =>
      new Promise<Message<R>>((resolve, reject) => {
        const timer = setTimeout(() => {
          this.pending = undefined;
          reject(new Error(`Timed out waiting for ${expect.join(" or ")} after ${name}`));
        }, this.timeout);
        this.pending = { expect, resolve: resolve as (m: Message) => void, reject, timer };
        this.send(name, payload).catch((e) => {
          clearTimeout(timer);
          this.pending = undefined;
          reject(e);
        });
      });
    const result = this.queue.then(run, run);
    this.queue = result.catch(() => {});
    return result;
  }

  private dispatch(bytes: Uint8Array): void {
    let message: Message | undefined;
    try {
      message = decodeMessage(bytes);
    } catch {
      return; // malformed message; ignore
    }
    if (!message) return;

    const pending = this.pending;
    if (pending) {
      if (pending.expect.includes(message.name)) {
        this.settle(pending, () => pending.resolve(message));
      } else if (message.name === "unsupportedMessageStatus") {
        const status = statusNames[(message.payload as { status?: number }).status ?? 0] ?? "UNKNOWN";
        this.settle(pending, () => pending.reject(new Error(`Amp rejected the request: ${status}`)));
      }
    }
    for (const listener of this.listeners) listener(message);
  }

  private settle(pending: Pending, done: () => void): void {
    clearTimeout(pending.timer);
    this.pending = undefined;
    done();
  }
}

function assertSlot(slot: number): void {
  if (!Number.isInteger(slot) || slot < 1 || slot > 60) {
    throw new RangeError(`Preset slot must be 1–60, got ${slot}`);
  }
}
