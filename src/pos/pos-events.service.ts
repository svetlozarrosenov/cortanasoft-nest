import { Injectable, OnModuleDestroy } from '@nestjs/common';

/** A register that has not spoken for this long is shown as offline. */
export const ONLINE_WINDOW_MS = 45_000;
/**
 * A register working on a sale stays silent while the customer pays; it is
 * not written off until this much time has passed.
 */
export const BUSY_WINDOW_MS = 5 * 60_000;
/** How long a register that hung up is given to call back. */
const HANG_UP_GRACE_MS = 3_000;

/** What the cashier's screen is told as it happens. */
export type PosEvent =
  | { type: 'devices'; devices: unknown[] }
  | { type: 'device'; deviceId: string; online: boolean }
  | { type: 'sale'; sale: { id: string } & Record<string, unknown> };

type Listener = (event: PosEvent) => void;

interface Presence {
  companyId: string;
  online: boolean;
  timer?: NodeJS.Timeout;
}

/**
 * Pushes what happens on the registers to the cashier's screens that are
 * open, so they do not have to keep asking. It also knows which registers
 * are listening right now.
 *
 * Kept in memory: it serves the screens and registers connected to this
 * process, like the registers' own waiting requests.
 */
@Injectable()
export class PosEventsService implements OnModuleDestroy {
  /** Open cashier screens, by company. */
  private readonly listeners = new Map<string, Set<Listener>>();
  private readonly presence = new Map<string, Presence>();

  onModuleDestroy() {
    this.presence.forEach((entry) => clearTimeout(entry.timer));
    this.presence.clear();
    this.listeners.clear();
  }

  /** Returns the function that ends the subscription. */
  subscribe(companyId: string, listener: Listener): () => void {
    const listeners = this.listeners.get(companyId) ?? new Set<Listener>();
    this.listeners.set(companyId, listeners);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) this.listeners.delete(companyId);
    };
  }

  publish(companyId: string, event: PosEvent) {
    this.listeners.get(companyId)?.forEach((listener) => listener(event));
  }

  /**
   * The register spoke. It counts as online until it has been quiet for
   * [quietMs].
   */
  seen(deviceId: string, companyId: string, quietMs = ONLINE_WINDOW_MS) {
    const entry = this.presence.get(deviceId) ?? { companyId, online: false };
    this.presence.set(deviceId, entry);
    this.offlineAfter(deviceId, entry, quietMs);
    if (!entry.online) {
      entry.online = true;
      this.publish(companyId, { type: 'device', deviceId, online: true });
    }
  }

  /**
   * The register dropped the request it was waiting on: the app was closed
   * or the network went away. Unless it calls back shortly, it is offline.
   */
  hungUp(deviceId: string) {
    const entry = this.presence.get(deviceId);
    if (entry?.online) this.offlineAfter(deviceId, entry, HANG_UP_GRACE_MS);
  }

  /** Undefined when this process has not heard from the register yet. */
  isOnline(deviceId: string): boolean | undefined {
    return this.presence.get(deviceId)?.online;
  }

  private offlineAfter(deviceId: string, entry: Presence, ms: number) {
    clearTimeout(entry.timer);
    entry.timer = setTimeout(() => {
      entry.online = false;
      this.publish(entry.companyId, {
        type: 'device',
        deviceId,
        online: false,
      });
    }, ms);
    // A pending "went offline" must not keep the process alive on shutdown
    entry.timer.unref();
  }
}
