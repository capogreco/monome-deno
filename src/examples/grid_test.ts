/**
 * Example: Grid test
 * 
 * Usage: deno run --allow-net --unstable-net grid_test.ts
 * 
 * This example demonstrates using a Monome grid.
 * It displays a simple animation and responds to button presses.
 */

import serialosc, { Grid } from "../mod.ts";

// Enable debug mode to see all OSC messages
const DEBUG = false;

// Grid variable to store the active grid
let grid: Grid | null = null;

// Track button states
const buttonStates: Record<string, boolean> = {};

// Listen for device connections
serialosc.on("device:add", async (deviceInfo) => {
  console.log(`Device connected: ${deviceInfo.id}`);
  
  // Only proceed with grid devices
  if (deviceInfo.type !== "grid") {
    console.log("Not a grid device, ignoring.");
    return;
  }
  
  // Create a Grid instance
  grid = new Grid(serialosc);
  grid.config(deviceInfo);
  
  // Start the grid
  await grid.start();
  
  // Listen for key presses
  grid.on("key", (data) => {
    console.log(`Button pressed: x=${data.x}, y=${data.y}, state=${data.s}`);
    
    // Store button state
    const key = `${data.x},${data.y}`;
    buttonStates[key] = data.s === 1;
    
    // Light up the button to match its state
    grid.set(data.x, data.y, data.s);
    
    // If button is pressed, trigger a pattern around it
    if (data.s === 1) {
      displayPatternAroundButton(data.x, data.y);
    }
  });
  
  // Clear the grid
  await grid.all(0);
  
  // Show a welcome pattern
  await displayStartupAnimation();
});

// Show a pattern radiating from a pressed button
async function displayPatternAroundButton(x: number, y: number): Promise<void> {
  if (!grid) return;
  
  // Define pattern radius
  const radius = 2;
  
  // Light up buttons in a diamond pattern around the pressed button
  for (let r = 1; r <= radius; r++) {
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        if (Math.abs(dx) + Math.abs(dy) === r) {
          const nx = x + dx;
          const ny = y + dy;
          
          // Check if coordinates are within grid bounds
          if (nx >= 0 && nx < grid.sizeX && ny >= 0 && ny < grid.sizeY) {
            // Don't overwrite buttons that are being held down
            const key = `${nx},${ny}`;
            if (!buttonStates[key]) {
              await grid.set(nx, ny, 1);
              
              // Turn off after a delay, unless the button is pressed
              setTimeout(async () => {
                if (!buttonStates[key] && grid) {
                  await grid.set(nx, ny, 0);
                }
              }, 100 * r);
            }
          }
        }
      }
    }
  }
}

// Display a startup animation
async function displayStartupAnimation(): Promise<void> {
  if (!grid) return;
  
  // First clear the grid
  await grid.all(0);
  
  // Animate each quadrant
  const quadrants = [
    { x: 0, y: 0 },
    { x: 8, y: 0 },
    { x: 0, y: 8 },
    { x: 8, y: 8 }
  ];
  
  // Only use quadrants that fit on the grid
  const activeQuadrants = quadrants.filter(q => 
    q.x < grid!.sizeX && q.y < grid!.sizeY
  );
  
  // Simple animation patterns for each quadrant
  for (const q of activeQuadrants) {
    // Create a pattern
    const pattern = [
      [1, 0, 0, 0, 0, 0, 0, 1],
      [0, 1, 0, 0, 0, 0, 1, 0],
      [0, 0, 1, 0, 0, 1, 0, 0],
      [0, 0, 0, 1, 1, 0, 0, 0],
      [0, 0, 0, 1, 1, 0, 0, 0],
      [0, 0, 1, 0, 0, 1, 0, 0],
      [0, 1, 0, 0, 0, 0, 1, 0],
      [1, 0, 0, 0, 0, 0, 0, 1]
    ];
    
    // Send the pattern to the grid
    await grid.map(q.x / 8, q.y / 8, pattern);
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  // Wait a bit longer
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Clear the grid
  await grid.all(0);
  
  // Display a border
  const width = Math.min(16, grid.sizeX);
  const height = Math.min(16, grid.sizeY);
  
  for (let x = 0; x < width; x++) {
    await grid.set(x, 0, 1);
    await grid.set(x, height - 1, 1);
  }
  
  for (let y = 0; y < height; y++) {
    await grid.set(0, y, 1);
    await grid.set(width - 1, y, 1);
  }
}

// Listen for device disconnections
serialosc.on("device:remove", (device) => {
  console.log(`Device disconnected: ${device.id}`);
  
  if (grid && grid.id === device.id) {
    grid = null;
  }
});

// Start serialosc client
await serialosc.start({ 
  debug: DEBUG,
  startDevices: true 
});

console.log("Waiting for a grid to be connected...");
console.log("Press buttons on the grid once connected.");
console.log("(Press Ctrl+C to exit)");

// Keep the program running
await new Promise(() => {});