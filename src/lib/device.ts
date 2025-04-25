/**
 * Device base class for Deno
 * Adapted from node-serialosc by Tom Dinchak
 */

// import { EventEmitter } from "jsr:@std/node/events";
import { EventEmitter } from "jsr:@denosaurs/event@^2.0.2";
import { OscSender, OscReceiver } from "./osc.ts";

/**
 * Options for Device configuration
 */
export interface DeviceOptions {
  id?: string;
  type?: "grid" | "arc";
  model?: string;
  host?: string;
  port?: number;
  deviceHost?: string;
  devicePort?: number;
  sizeX?: number;
  sizeY?: number;
  encoders?: number;
  prefix?: string;
  serialosc?: any;
  [key: string]: any;
}

/**
 * A Device represents either an arc or a grid connected to serialosc
 */
export class Device extends EventEmitter<{
  initialized: [];
  connected: [];
  disconnected: [];
  [key: string]: any[];
}> {
  /**
   * OSC communication
   */
  oscReceiver: OscReceiver | null = null;
  oscSender: OscSender | null = null;

  /**
   * Device properties
   */
  id: string = "";
  type: string = "";
  model: string = "";
  host: string = "localhost";
  port: number = 0;
  deviceHost: string = "localhost";
  devicePort: number = 0;
  sizeX: number = 0;
  sizeY: number = 0;
  encoders: number = 0;
  prefix: string = "/monome";
  rotation: number = 0;
  connected: boolean = false;
  serialosc: any;

  /**
   * Configure device with options
   */
  config(opts: DeviceOptions): void {
    // Choose a random port if none is provided
    this.port = opts.port || Math.floor(Math.random() * (65536 - 1024)) + 1024;
    
    // Important: Convert 'localhost' to explicit IP '127.0.0.1' for Deno compatibility
    const targetHost = opts.deviceHost === "localhost" ? "127.0.0.1" : opts.deviceHost || "127.0.0.1";
    const listenHost = opts.host === "localhost" ? "127.0.0.1" : opts.host || "127.0.0.1";
    
    // Set up OSC communication
    this.oscReceiver = new OscReceiver(this.port, listenHost);
    this.oscSender = new OscSender(targetHost, opts.devicePort || 0);
    
    this.connected = false;
    
    // Set all keys passed in opts
    for (const key in opts) {
      (this as any)[key] = opts[key];
    }
    
    // Debug mode
    if (this.serialosc?.debug) {
      const originalSend = this.oscSender.send.bind(this.oscSender);
      this.oscSender.send = async (address: string, args: any[]): Promise<void> => {
        await originalSend(address, args);
        console.log(`to ${this.id}:`, address);
        console.log(args);
      };
      
      // Log all incoming messages in debug mode
      this.oscReceiver.on("message", (address: string, ...args: any[]) => {
        console.log(`from ${this.id}:`, address);
        console.log(args);
      });
    }
  }
  
  /**
   * Begin listening for device messages
   * Set up event handlers
   * Initialize communication with the device
   */
  async start(): Promise<void> {
    const initMsgs = [
      "/sys/host",
      "/sys/port",
      "/sys/prefix",
      "/sys/rotation",
      "/sys/size",
    ];
    
    let sentSysInfo = false;
    
    // Start listening for OSC messages
    await this.oscReceiver?.listen();
    
    const receiveInitMsg = async (msg: string) => {
      if (this.connected) {
        return;
      }
      
      // Remove the message from the init list
      const index = initMsgs.indexOf(msg);
      if (index !== -1) {
        initMsgs.splice(index, 1);
      }
      
      // If all init messages have been received, mark as connected
      if (initMsgs.length === 0) {
        this.connected = true;
        this.emit("initialized");
      }
      
      // Send host message once port reply is received
      if (!initMsgs.includes("/sys/port") && initMsgs.includes("/sys/host")) {
        await this.oscSender?.send("/sys/host", [this.host]);
      }
      
      // Once host/port have been received, finish initialization
      if (!sentSysInfo && !initMsgs.includes("/sys/port") && !initMsgs.includes("/sys/host")) {
        sentSysInfo = true;
        await this.oscSender?.send("/sys/info", []);
      }
    };
    
    // Set up event handlers for system messages
    
    this.oscReceiver?.on("/sys/id", (id: string) => {
      this.id = id;
    });
    
    this.oscReceiver?.on("/sys/size", (x: number, y: number) => {
      this.sizeX = x;
      this.sizeY = y;
      receiveInitMsg("/sys/size");
    });
    
    this.oscReceiver?.on("/sys/rotation", (r: number) => {
      this.rotation = r;
      receiveInitMsg("/sys/rotation");
    });
    
    this.oscReceiver?.on("/sys/connect", () => {
      this.connected = true;
      this.emit("connected");
    });
    
    this.oscReceiver?.on("/sys/disconnect", () => {
      this.connected = false;
      this.emit("disconnected");
    });
    
    this.oscReceiver?.on("/sys/port", (p: number) => {
      this.port = p;
      receiveInitMsg("/sys/port");
    });
    
    this.oscReceiver?.on("/sys/host", (h: string) => {
      this.host = h;
      receiveInitMsg("/sys/host");
    });
    
    this.oscReceiver?.on("/sys/prefix", (p: string) => {
      // Remove existing listeners for old prefix
      this.removeListeners();
      this.prefix = p;
      // Add new listeners for new prefix
      this.addListeners();
      receiveInitMsg("/sys/prefix");
    });
    
    // Initialize device by sending port
    await this.oscSender?.send("/sys/port", [this.port]);
  }
  
  /**
   * Called when the device is unplugged
   */
  async stop(): Promise<void> {
    this.connected = false;
    await this.oscReceiver?.close();
  }
  
  /**
   * Sets a device's rotation
   */
  async setRotation(r: number): Promise<void> {
    await this.oscSender?.send("/sys/rotation", [r]);
  }
  
  /**
   * Remove device-specific listeners
   * Should be implemented by subclasses
   */
  removeListeners(): void {
    // Implementation depends on device type
  }
  
  /**
   * Add device-specific listeners
   * Should be implemented by subclasses
   */
  addListeners(): void {
    // Implementation depends on device type
  }
}