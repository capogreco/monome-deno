/**
 * Grid class for Deno
 * Adapted from node-serialosc by Tom Dinchak
 */

import { Device } from "./device.ts";

/**
 * Key press event data
 */
export interface KeyEvent {
  x: number;
  y: number;
  s: number; // state: 0=off, 1=on
}

/**
 * Tilt event data
 */
export interface TiltEvent {
  n: number; // sensor number
  x: number;
  y: number;
  z: number;
}

/**
 * Handler for grid devices
 */
export class Grid extends Device {
  constructor(serialosc: any) {
    super();
    this.serialosc = serialosc;
  }

  /**
   * Remove existing prefix-based listeners
   * Called when the prefix is changed
   */
  override removeListeners(): void {
    this.oscReceiver?.removeListener(`${this.prefix}/grid/key`);
    this.oscReceiver?.removeListener(`${this.prefix}/tilt`);
  }

  /**
   * Add prefix-based listeners
   * Called when the prefix is changed
   */
  override addListeners(): void {
    // Listen for key press events
    this.oscReceiver?.on(`${this.prefix}/grid/key`, (x: number, y: number, s: number) => {
      this.emit("key", { x, y, s });
    });

    // Listen for tilt events
    this.oscReceiver?.on(`${this.prefix}/tilt`, (n: number, x: number, y: number, z: number) => {
      this.emit("tilt", { n, x, y, z });
    });
  }

  /**
   * Sets a single LED's state to off or on
   * @param x - X coordinate or press data object
   * @param y - Y coordinate (optional if x is an object)
   * @param s - State: 0=off, 1=on (optional if x is an object)
   */
  async set(x: number | KeyEvent, y?: number, s?: number): Promise<void> {
    let data: KeyEvent;
    
    if (typeof x === "number") {
      data = {
        x,
        y: y as number,
        s: s as number
      };
    } else {
      data = x;
    }
    
    await this.oscSender?.send(`${this.prefix}/grid/led/set`, [data.x, data.y, data.s]);
  }

  /**
   * Set all of device's LEDs to off or on
   * @param s - 0 for off, 1 for on
   */
  async all(s: number): Promise<void> {
    await this.oscSender?.send(`${this.prefix}/grid/led/all`, [s]);
  }

  /**
   * Update an 8x8 quad of LEDs
   * @param xOffset - X offset of target quad in multiples of 8
   * @param yOffset - Y offset of target quad in multiples of 8
   * @param arr - 1D or 2D array of LED values
   */
  async map(xOffset: number, yOffset: number, arr: number[] | number[][]): Promise<void> {
    const state: number[] = [];
    
    for (let y = 0; y < 8; y++) {
      state[y] = 0;
      
      if (typeof (arr as number[])[y] === "number") {
        state[y] = (arr as number[])[y];
        continue;
      }
      
      for (let x = 0; x < 8; x++) {
        state[y] += ((arr as number[][])[y][x] << x);
      }
    }
    
    const args = [xOffset, yOffset, ...state];
    await this.oscSender?.send(`${this.prefix}/grid/led/map`, args);
  }

  /**
   * Set a row of LEDs
   * @param xOffset - Quad offset
   * @param y - Row number
   * @param s - Bitmask of first 8 LED states
   * @param additionalMasks - Optional additional bitmasks
   */
  async row(xOffset: number, y: number, s: number, ...additionalMasks: number[]): Promise<void> {
    const args = [xOffset, y, s, ...additionalMasks];
    await this.oscSender?.send(`${this.prefix}/grid/led/row`, args);
  }

  /**
   * Set a column of LEDs
   * @param x - Column number
   * @param yOffset - Quad offset
   * @param s - Bitmask of first 8 LED states
   * @param additionalMasks - Optional additional bitmasks
   */
  async col(x: number, yOffset: number, s: number, ...additionalMasks: number[]): Promise<void> {
    const args = [x, yOffset, s, ...additionalMasks];
    await this.oscSender?.send(`${this.prefix}/grid/led/col`, args);
  }

  /**
   * Sets the grid LED intensity
   * @param i - Intensity level (0-15)
   */
  async intensity(i: number): Promise<void> {
    await this.oscSender?.send(`${this.prefix}/grid/led/intensity`, [i]);
  }

  /**
   * Sets a single LED's intensity level
   * @param x - X coordinate or data object
   * @param y - Y coordinate (optional if x is an object)
   * @param l - Intensity level (optional if x is an object)
   */
  async levelSet(x: number | { x: number, y: number, l: number }, y?: number, l?: number): Promise<void> {
    let data: { x: number, y: number, l: number };
    
    if (typeof x === "number") {
      data = {
        x,
        y: y as number,
        l: l as number
      };
    } else {
      data = x;
    }
    
    await this.oscSender?.send(`${this.prefix}/grid/led/level/set`, [data.x, data.y, data.l]);
  }

  /**
   * Set all of device's LED intensity levels to l
   * @param l - Intensity level
   */
  async levelAll(l: number): Promise<void> {
    await this.oscSender?.send(`${this.prefix}/grid/led/level/all`, [l]);
  }

  /**
   * Update the intensity of an 8x8 quad of LEDs
   * @param xOffset - X offset of target quad in multiples of 8
   * @param yOffset - Y offset of target quad in multiples of 8
   * @param arr - 1D or 2D array of LED intensity values (0-15)
   */
  async levelMap(xOffset: number, yOffset: number, arr: number[] | number[][]): Promise<void> {
    const args: number[] = [xOffset, yOffset];
    
    for (let i = 0; i < arr.length; i++) {
      if (typeof (arr as number[])[i] === "number") {
        args.push((arr as number[])[i]);
        continue;
      }
      
      for (let x = 0; x < (arr as number[][])[i].length; x++) {
        args.push((arr as number[][])[i][x]);
      }
    }
    
    await this.oscSender?.send(`${this.prefix}/grid/led/level/map`, args);
  }

  /**
   * Set a row of LED levels
   * @param xOffset - Quad offset
   * @param y - Row number
   * @param levels - Array of LED levels
   */
  async levelRow(xOffset: number, y: number, levels: number[]): Promise<void> {
    const args = [xOffset, y, ...levels];
    await this.oscSender?.send(`${this.prefix}/grid/led/level/row`, args);
  }

  /**
   * Set a column of LED levels
   * @param x - Column number
   * @param yOffset - Quad offset
   * @param levels - Array of LED levels
   */
  async levelCol(x: number, yOffset: number, levels: number[]): Promise<void> {
    const args = [x, yOffset, ...levels];
    await this.oscSender?.send(`${this.prefix}/grid/led/level/col`, args);
  }

  /**
   * Enables or disables tilt sensor n
   * @param n - Sensor number
   * @param s - 0 to disable, 1 to enable
   */
  async setTilt(n: number, s: number): Promise<void> {
    const args = [n, s];
    await this.oscSender?.send(`${this.prefix}/tilt/set`, args);
  }
}