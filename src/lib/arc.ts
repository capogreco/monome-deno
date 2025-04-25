/**
 * Arc class for Deno
 * Adapted from node-serialosc by Tom Dinchak
 */

import { Device } from "./device.ts";

/**
 * Key press event data
 */
export interface EncKeyEvent {
  n: number; // encoder number
  s: number; // state: 0=off, 1=on
}

/**
 * Delta event data
 */
export interface EncDeltaEvent {
  n: number; // encoder number
  d: number; // delta value
}

/**
 * Handler for arc devices
 */
export class Arc extends Device {
  constructor(serialosc: any) {
    super();
    this.serialosc = serialosc;
  }

  /**
   * Remove existing prefix-based listeners
   * Called when the prefix is changed
   */
  override removeListeners(): void {
    this.oscReceiver?.removeListener(`${this.prefix}/enc/key`);
    this.oscReceiver?.removeListener(`${this.prefix}/enc/delta`);
  }

  /**
   * Add prefix-based listeners
   * Called when the prefix is changed
   */
  override addListeners(): void {
    // Listen for key press events
    this.oscReceiver?.on(`${this.prefix}/enc/key`, (n: number, s: number) => {
      this.emit("key", { n, s });
    });

    // Listen for encoder delta events
    this.oscReceiver?.on(`${this.prefix}/enc/delta`, (n: number, d: number) => {
      this.emit("delta", { n, d });
    });
  }

  /**
   * Set one LED
   * @param n - Encoder number or data object
   * @param x - LED number (optional if n is an object)
   * @param l - LED level (optional if n is an object)
   */
  async set(n: number | { n: number, x: number, l: number }, x?: number, l?: number): Promise<void> {
    let data: { n: number, x: number, l: number };
    
    if (typeof n === "number") {
      data = {
        n,
        x: x as number,
        l: l as number
      };
    } else {
      data = n;
    }
    
    await this.oscSender?.send(`${this.prefix}/ring/set`, [data.n, data.x, data.l]);
  }

  /**
   * Set all LEDs on encoder n to level l
   * @param n - Encoder number
   * @param l - LED level
   */
  async all(n: number, l: number): Promise<void> {
    await this.oscSender?.send(`${this.prefix}/ring/all`, [n, l]);
  }

  /**
   * Set LEDs on encoder n to levels array
   * @param n - Encoder number
   * @param levels - Array of 64 LED levels
   */
  async map(n: number, levels: number[]): Promise<void> {
    const args = [n, ...levels];
    await this.oscSender?.send(`${this.prefix}/ring/map`, args);
  }

  /**
   * Sets LEDs x1 through x2 to level l on encoder n
   * @param n - Encoder number
   * @param x1 - Start LED
   * @param x2 - End LED
   * @param l - LED level
   */
  async range(n: number, x1: number, x2: number, l: number): Promise<void> {
    await this.oscSender?.send(`${this.prefix}/ring/range`, [n, x1, x2, l]);
  }
}