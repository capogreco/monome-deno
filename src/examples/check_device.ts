/**
 * Example: Simple device check with timeout
 * 
 * Usage: deno run --allow-net --unstable-net check_device.ts
 * 
 * This example checks for any connected Monome devices
 * and exits after 5 seconds or when a device is found.
 */

import serialosc from "../mod.ts";
import { DeviceInfo } from "../mod.ts";

// Track if we found a device
let deviceFound = false;

// Listen for device connections
serialosc.on("device:add", (device: DeviceInfo) => {
  console.log("Device connected!");
  console.log(`ID: ${device.id}`);
  console.log(`Model: ${device.model}`);
  console.log(`Type: ${device.type}`);
  
  if (device.type === "grid" && device.sizeX && device.sizeY) {
    console.log(`Size: ${device.sizeX}x${device.sizeY}`);
  } else if (device.type === "arc" && device.encoders) {
    console.log(`Encoders: ${device.encoders}`);
  }
  
  console.log("---------------------------");
  deviceFound = true;
});

// Start serialosc client
console.log("Scanning for Monome devices...");
await serialosc.start();

// Wait for device or timeout after 5 seconds
const timeout = 5000;
const startTime = Date.now();

while (!deviceFound && Date.now() - startTime < timeout) {
  await new Promise(resolve => setTimeout(resolve, 100));
}

if (deviceFound) {
  console.log("Device found! Test successful.");
} else {
  console.log(`No devices found after ${timeout}ms.`);
  console.log("Make sure serialosc is running and your Monome device is connected.");
}

// Clean up
await serialosc.stop();