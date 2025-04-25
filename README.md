# monome-deno

A Deno library for communicating with Monome devices (Grid and Arc) via serialosc. This is a port of the node-serialosc library to Deno.

## Features

- Connect to the serialosc daemon
- Discover Monome devices (Grid and Arc)
- Control LED states
- Receive button press and encoder events
- Supports variable brightness levels
- Handles device connection/disconnection

## Requirements

- Deno 1.x or higher
- serialosc running on your system
- Monome device (Grid or Arc)

## Installation

### Option 1: Direct import

You can import directly from your project:

```typescript
import serialosc from "./path/to/monome-deno/src/mod.ts";
import { Grid, Arc } from "./path/to/monome-deno/src/mod.ts";
```

### Option 2: Using JSR (recommended)

Once this package is published to the Deno JSR registry, you can install it with:

```typescript
import serialosc, { Grid, Arc } from "jsr:@username/monome-deno";
```

Replace `@username` with the actual username used to publish the package.

## Usage

### Running Examples

Using Deno tasks (recommended):

```bash
# Scan for devices
deno task scan

# Grid test
deno task grid-test
```

Or directly with Deno run:

```bash
# Scan for devices
deno run --allow-net --unstable-net src/examples/scan.ts

# Grid test
deno run --allow-net --unstable-net src/examples/grid_test.ts
```

### Basic Usage

```typescript
import serialosc from "./src/mod.ts";

// Listen for device connections
serialosc.on("device:add", (device) => {
  console.log(`Device connected: ${device.id}`);
});

// Listen for device disconnections
serialosc.on("device:remove", (device) => {
  console.log(`Device disconnected: ${device.id}`);
});

// Start serialosc client
await serialosc.start();
```

### Grid Example

```typescript
import serialosc, { Grid } from "./src/mod.ts";

// Listen for device connections
serialosc.on("device:add", async (deviceInfo) => {
  if (deviceInfo.type !== "grid") return;
  
  // Create a Grid instance
  const grid = new Grid(serialosc);
  grid.config(deviceInfo);
  
  // Start the grid
  await grid.start();
  
  // Listen for key presses
  grid.on("key", async (data) => {
    console.log(`Button pressed: x=${data.x}, y=${data.y}, state=${data.s}`);
    
    // Light up the button to match its state
    await grid.set(data.x, data.y, data.s);
  });
  
  // Clear the grid
  await grid.all(0);
});

// Start serialosc client
await serialosc.start();
```

### Arc Example

```typescript
import serialosc, { Arc } from "./src/mod.ts";

// Listen for device connections
serialosc.on("device:add", async (deviceInfo) => {
  if (deviceInfo.type !== "arc") return;
  
  // Create an Arc instance
  const arc = new Arc(serialosc);
  arc.config(deviceInfo);
  
  // Start the arc
  await arc.start();
  
  // Listen for encoder movement
  arc.on("delta", async (data) => {
    console.log(`Encoder ${data.n} moved by ${data.d}`);
  });
  
  // Listen for encoder button presses
  arc.on("key", async (data) => {
    console.log(`Encoder ${data.n} button state: ${data.s}`);
  });
  
  // Clear all LEDs
  for (let e = 0; e < arc.encoders; e++) {
    await arc.all(e, 0);
  }
});

// Start serialosc client
await serialosc.start();
```

## API

### SerialOSC

- `serialosc.start(options)` - Start the serialosc client
- `serialosc.stop()` - Stop the serialosc client
- Events:
  - `"device:add"` - Emitted when a device is connected
  - `"device:remove"` - Emitted when a device is disconnected
  - `"{device-id}:add"` - Emitted for a specific device id
  - `"{device-id}:remove"` - Emitted for a specific device id

### Grid

- `grid.set(x, y, s)` - Set LED at (x,y) to state s (0 or 1)
- `grid.all(s)` - Set all LEDs to state s
- `grid.map(xOffset, yOffset, data)` - Update an 8x8 quadrant of LEDs
- `grid.row(xOffset, y, s)` - Set a row of LEDs
- `grid.col(x, yOffset, s)` - Set a column of LEDs
- `grid.intensity(i)` - Set overall LED intensity
- Variable brightness methods:
  - `grid.levelSet(x, y, l)` - Set LED at (x,y) to level l (0-15)
  - `grid.levelAll(l)` - Set all LEDs to level l
  - `grid.levelMap(xOffset, yOffset, data)` - Update LED levels in an 8x8 quadrant
  - `grid.levelRow(xOffset, y, levels)` - Set a row of LED levels
  - `grid.levelCol(x, yOffset, levels)` - Set a column of LED levels
- Tilt sensor:
  - `grid.setTilt(n, s)` - Enable/disable tilt sensor n
- Events:
  - `"key"` - Emitted when a button is pressed/released
  - `"tilt"` - Emitted when the tilt sensor changes

### Arc

- `arc.set(n, x, l)` - Set LED x on encoder n to level l
- `arc.all(n, l)` - Set all LEDs on encoder n to level l
- `arc.map(n, levels)` - Set encoder n's LEDs to the specified levels
- `arc.range(n, x1, x2, l)` - Set LEDs from x1 to x2 on encoder n to level l
- Events:
  - `"delta"` - Emitted when an encoder is rotated
  - `"key"` - Emitted when an encoder button is pressed (if available)

## Important Notes

This library requires the use of explicit IP addresses (127.0.0.1) instead of hostnames (localhost) due to how Deno's UDP implementation works. This is handled automatically by the library.

## Troubleshooting

### Permission Errors

Make sure you run your application with the necessary flags:
```bash
deno run --allow-net --unstable-net your_app.ts
```

### Connection Refused

If you get a "Connection refused" error:
1. Make sure serialosc is running on your system
2. Check that the correct port is being used (default: 12002)
3. Ensure your Monome device is connected

### Compatibility Notes

- This library is designed for Deno and won't work directly in Node.js
- The UDP implementation is built on Deno's unstable networking API, so it requires the `--unstable-net` flag
- The library automatically converts 'localhost' references to '127.0.0.1' for compatibility with Deno's UDP

### Common Issues

1. **OSC messages not being received**:
   - Check firewalls or security software that might be blocking UDP traffic
   - Verify that serialosc is running and configured correctly

2. **Devices not being detected**:
   - Make sure your Monome device is properly connected
   - Check that serialosc can detect the device (try running the `serialoscd` command manually)

3. **"Invalid argument" errors**:
   - This is typically due to using 'localhost' instead of '127.0.0.1' in UDP communication with Deno
   - The library handles this automatically, but if you're extending the code, remember to use explicit IP addresses

## License

MIT