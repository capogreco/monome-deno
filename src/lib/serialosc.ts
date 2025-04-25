/**
 * SerialOSC class for Deno
 * Adapted from node-serialosc by Tom Dinchak
 */

// import { EventEmitter } from "jsr:@std/node/events";
import { EventEmitter } from "jsr:@denosaurs/event@^2.0.2";
import { OscSender, OscReceiver } from "./osc.ts";
import { Grid } from "./grid.ts";
import { Arc } from "./arc.ts";

/**
 * Options for SerialOSC configuration
 */
export interface SerialOscOptions {
  host?: string;
  port?: number;
  serialoscHost?: string;
  serialoscPort?: number;
  debug?: boolean;
  startDevices?: boolean;
}

/**
 * Device information as reported by serialosc
 */
export interface DeviceInfo {
  id: string;
  model: string;
  type: "grid" | "arc";
  host: string;
  deviceHost: string;
  devicePort: number;
  sizeX?: number;
  sizeY?: number;
  encoders?: number;
}

/**
 * The SerialOSC class represents an instance of
 * serialosc running either on the local computer
 * or another computer on the network.
 */
export class SerialOSC extends EventEmitter<{
  'device:add': [DeviceInfo];
  'device:remove': [DeviceInfo];
  [key: string]: any[];
}> {
  /**
   * An array of all devices that have been seen
   */
  devices: any[] = [];

  /**
   * Receives OSC messages from serialosc directly
   */
  receiver: OscReceiver | null = null;

  /**
   * Sends OSC messages to serialosc server directly
   */
  serialoscSender: OscSender | null = null;

  /**
   * The hostname this process listens on
   */
  host: string = "localhost";

  /**
   * The port number this process listens on
   */
  port: number = 0;

  /**
   * The hostname serialosc is listening on
   */
  serialoscHost: string = "localhost";

  /**
   * The port serialosc is listening on
   */
  serialoscPort: number = 12002;

  /**
   * Debug mode that monitors all OSC communication
   */
  debug: boolean = false;

  /**
   * Automatically start / initialize devices when discovered
   */
  startDevices: boolean = true;
  
  /**
   * Create a new SerialOSC instance
   */
  constructor() {
    super();
  }

  /**
   * Begin listening for serialosc messages on host/port
   * Request a list of devices from serialosc
   * Emit 'device:add' and 'device:remove' events
   *
   * @param opts - Configuration options
   */
  async start(opts: SerialOscOptions = {}): Promise<void> {
    // Set configuration options
    this.host = opts.host || "localhost";
    this.port = opts.port || Math.floor(Math.random() * 64512) + 1024;
    this.serialoscHost = opts.serialoscHost || "localhost";
    this.serialoscPort = opts.serialoscPort || 12002;
    this.debug = opts.debug || false;
    
    if (typeof opts.startDevices !== "undefined") {
      this.startDevices = opts.startDevices;
    }

    // Important: Convert 'localhost' to explicit IP '127.0.0.1' for Deno compatibility
    const serialoscTargetHost = this.serialoscHost === "localhost" ? "127.0.0.1" : this.serialoscHost;
    const listenHost = this.host === "localhost" ? "127.0.0.1" : this.host;
    
    if (!this.serialoscSender) {
      // Create OSC sender to communicate with serialosc
      this.serialoscSender = new OscSender(serialoscTargetHost, this.serialoscPort);
      
      if (this.debug) {
        // Wrap the send method to log outgoing messages in debug mode
        const originalSend = this.serialoscSender.send.bind(this.serialoscSender);
        this.serialoscSender.send = async (address: string, args: any[]): Promise<void> => {
          await originalSend(address, args);
          console.log("to serialosc:", address);
          console.log(args);
        };
      }
    }

    // Start the OSC receiver
    await this.startOSCReceiver();
    
    // Attach notify handler
    await this.serialoscSender.send("/serialosc/notify", [listenHost, this.port]);
    
    // Request a list of devices
    await this.serialoscSender.send("/serialosc/list", [listenHost, this.port]);
  }

  /**
   * Start listening for OSC messages from serialosc
   */
  async startOSCReceiver(): Promise<void> {
    // Receiver already active
    if (this.receiver) {
      return;
    }

    // Important: Convert 'localhost' to explicit IP '127.0.0.1' for Deno compatibility
    const listenHost = this.host === "localhost" ? "127.0.0.1" : this.host;
    
    // Create new OSC receiver
    this.receiver = new OscReceiver(this.port, listenHost);
    
    // Start listening
    await this.receiver.listen();

    if (this.debug) {
      // Log all incoming messages in debug mode
      this.receiver.on("message", (address: string, ...args: any[]) => {
        console.log("from serialosc:", address);
        console.log(args);
      });
    }

    // Handle device discovery
    this.receiver.on("/serialosc/device", async (id: string, model: string, port: number) => {
      // Configure what we know about this device
      const deviceOpts: DeviceInfo = {
        id,
        model,
        host: this.host,
        deviceHost: this.serialoscHost,
        devicePort: port,
        type: "grid" // Default, may be changed to "arc" below
      };

      // Check if we already know about this device
      const device = this.devices.find(d => 
        d.id === deviceOpts.id && d.devicePort === deviceOpts.devicePort
      );

      // If not, create it, start it, add it to devices array
      if (!device) {
        let newDevice: any;
        
        // Check if it's an arc or grid
        const encoderMatch = deviceOpts.model.match(/monome arc ?(\d)?/);
        
        if (encoderMatch) {
          // It's an arc
          // newDevice = new Arc(this);
          deviceOpts.type = "arc";
          
          // Determine number of encoders
          if (encoderMatch[1]) {
            deviceOpts.encoders = parseInt(encoderMatch[1], 10);
          } else {
            // New arc identifies simply as "monome arc" and has 4 encoders
            deviceOpts.encoders = 4;
          }
        } else {
          // It's a grid
          // newDevice = new Grid(this);
          deviceOpts.type = "grid";
        }

        // TODO: Uncomment this when Grid and Arc classes are implemented
        // newDevice.config(deviceOpts);
        // this.devices.push(newDevice);
        
        // Store the device info for now (until we implement Grid and Arc)
        this.devices.push(deviceOpts);
        
        // Temporarily use this.emit directly
        this.emit(`${deviceOpts.id}:add`, deviceOpts);
        this.emit("device:add", deviceOpts);
        
        /*
        if (this.startDevices) {
          await newDevice.start();
          newDevice.on("initialized", () => {
            this.emit(`${newDevice.id}:add`, newDevice);
            this.emit("device:add", newDevice);
          });
        } else {
          this.emit(`${newDevice.id}:add`, newDevice);
          this.emit("device:add", newDevice);
        }
        */
      }
    });

    // When serialosc detects a device has been plugged in
    this.receiver.on("/serialosc/add", async () => {
      const listenHost = this.host === "localhost" ? "127.0.0.1" : this.host;
      await this.serialoscSender?.send("/serialosc/list", [listenHost, this.port]);
      // Reattach notify handler after every /serialosc/add request
      await this.serialoscSender?.send("/serialosc/notify", [listenHost, this.port]);
    });

    // When serialosc detects a device has been unplugged
    this.receiver.on("/serialosc/remove", async (id: string, _: string, devicePort: number) => {
      // See if we know about this device (we should)
      const device = this.devices.find(d => 
        d.id === id && d.devicePort === devicePort
      );

      // If we do, emit the remove events
      if (device) {
        // TODO: Uncomment this when Device base class is implemented
        // device.stop();
        
        this.emit(`${device.id}:remove`, device);
        this.emit("device:remove", device);
      }

      // Reattach notify handler after every /serialosc/remove request
      const listenHost = this.host === "localhost" ? "127.0.0.1" : this.host;
      await this.serialoscSender?.send("/serialosc/notify", [listenHost, this.port]);
    });
  }

  /**
   * Stop the SerialOSC client
   */
  async stop(): Promise<void> {
    // Receiver not active
    if (!this.receiver) {
      return;
    }

    // Close the socket and reset
    await this.receiver.close();
    this.receiver = null;
    this.devices = [];
  }
}

// Create singleton instance
const serialOSCInstance = new SerialOSC();

// Export the singleton with an explicit type
export default serialOSCInstance as SerialOSC;