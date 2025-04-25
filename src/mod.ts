/**
 * monome-deno: A Deno library for communicating with Monome devices
 * 
 * This library provides interfaces for Monome Grid and Arc devices
 * communicating via serialosc.
 */

// Import our components
import serialOSCInstance from "./lib/serialosc.ts";
import type { SerialOSC, SerialOscOptions, DeviceInfo } from "./lib/serialosc.ts";
import { Device } from "./lib/device.ts";
import type { DeviceOptions } from "./lib/device.ts";
import { Grid } from "./lib/grid.ts";
import type { KeyEvent, TiltEvent } from "./lib/grid.ts";
import { Arc } from "./lib/arc.ts";
import type { EncKeyEvent, EncDeltaEvent } from "./lib/arc.ts";

// Re-export all types
export type {
  SerialOSC,
  SerialOscOptions,
  DeviceInfo,
  DeviceOptions,
  KeyEvent,
  TiltEvent,
  EncKeyEvent,
  EncDeltaEvent
};

// Export all components
export {
  serialOSCInstance as default,
  serialOSCInstance as serialosc,
  Device,
  Grid,
  Arc
};