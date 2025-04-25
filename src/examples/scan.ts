/**
 * Example: Scan for Monome devices
 * 
 * Usage: deno run --allow-net --unstable-net scan.ts
 * 
 * This example scans for Monome devices using serialosc
 * and prints information about each device found.
 */

import serialosc from "../mod.ts";

// Enable debug mode to see all OSC messages
const DEBUG = false;

// Listen for device connections
serialosc.on("device:add", (device) => {
  console.log("Device connected!");
  console.log(`ID: ${device.id}`);
  console.log(`Model: ${device.model}`);
  console.log(`Type: ${device.type}`);
  
  if (device.type === "grid") {
    console.log(`Size: ${device.sizeX}x${device.sizeY}`);
  } else if (device.type === "arc") {
    console.log(`Encoders: ${device.encoders}`);
  }
  
  console.log("---------------------------");
});

// Listen for device disconnections
serialosc.on("device:remove", (device) => {
  console.log(`Device disconnected: ${device.id}`);
});

// Start serialosc client
await serialosc.start({ 
  debug: DEBUG,
  startDevices: true 
});

console.log("Scanning for Monome devices...");
console.log("(Press Ctrl+C to exit)");

// Keep the program running
await new Promise(() => {});