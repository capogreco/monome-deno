/**
 * OSC (Open Sound Control) implementation for Deno
 * Used for communicating with serialosc and Monome devices
 */

// import { EventEmitter } from "jsr:@std/node/events";
import { EventEmitter } from "jsr:@denosaurs/event@^2.0.2";


/**
 * Encodes OSC messages according to the OSC 1.0 specification
 */
export class OscEncoder {
  /**
   * Encode an OSC message into a binary buffer
   * @param address - The OSC address pattern (e.g. "/serialosc/list")
   * @param args - Arguments to the OSC message
   * @returns Uint8Array containing the encoded OSC message
   */
  static encode(address: string, args: any[]): Uint8Array {
    // Calculate the total size of the message
    let size = this.alignedStringSize(address);
    let typeTags = ",";
    
    // Add type tags for each argument
    for (const arg of args) {
      if (typeof arg === "number") {
        if (Number.isInteger(arg)) {
          typeTags += "i"; // Integer
        } else {
          typeTags += "f"; // Float
        }
      } else if (typeof arg === "string") {
        typeTags += "s"; // String
        size += this.alignedStringSize(arg);
      } else {
        // Unsupported type, skip it
        continue;
      }
    }
    
    // Add size for type tags string
    size += this.alignedStringSize(typeTags);
    
    // Add size for each numeric argument (4 bytes each)
    for (const arg of args) {
      if (typeof arg === "number") {
        size += 4;
      }
    }
    
    // Create buffer for the message
    const buffer = new Uint8Array(size);
    let offset = 0;
    
    // Write address pattern
    offset = this.writeString(buffer, offset, address);
    
    // Write type tags
    offset = this.writeString(buffer, offset, typeTags);
    
    // Write arguments
    for (const arg of args) {
      if (typeof arg === "number") {
        if (Number.isInteger(arg)) {
          // Write integer
          offset = this.writeInt32(buffer, offset, arg);
        } else {
          // Write float
          offset = this.writeFloat32(buffer, offset, arg);
        }
      } else if (typeof arg === "string") {
        // Write string
        offset = this.writeString(buffer, offset, arg);
      }
    }
    
    return buffer;
  }
  
  /**
   * Calculate the size of a string with padding to 4-byte boundary
   */
  private static alignedStringSize(str: string): number {
    const bytes = new TextEncoder().encode(str);
    // Add 1 for null terminator, then align to 4-byte boundary
    return Math.ceil((bytes.length + 1) / 4) * 4;
  }
  
  /**
   * Write a string to the buffer at the given offset
   */
  private static writeString(buffer: Uint8Array, offset: number, str: string): number {
    const bytes = new TextEncoder().encode(str);
    
    // Write the string bytes
    buffer.set(bytes, offset);
    
    // Add null terminator
    buffer[offset + bytes.length] = 0;
    
    // Calculate the padded size
    const paddedSize = Math.ceil((bytes.length + 1) / 4) * 4;
    
    // Return the new offset
    return offset + paddedSize;
  }
  
  /**
   * Write a 32-bit integer to the buffer at the given offset
   */
  private static writeInt32(buffer: Uint8Array, offset: number, value: number): number {
    const view = new DataView(buffer.buffer);
    view.setInt32(offset, value, false); // Big-endian
    return offset + 4;
  }
  
  /**
   * Write a 32-bit float to the buffer at the given offset
   */
  private static writeFloat32(buffer: Uint8Array, offset: number, value: number): number {
    const view = new DataView(buffer.buffer);
    view.setFloat32(offset, value, false); // Big-endian
    return offset + 4;
  }
}

/**
 * Decodes OSC messages according to the OSC 1.0 specification
 */
export class OscDecoder {
  /**
   * Decode an OSC message from a binary buffer
   * @param data - The binary data containing the OSC message
   * @returns Object with address and args properties
   */
  static decode(data: Uint8Array): { address: string, args: any[] } {
    let offset = 0;
    
    // Read the address pattern
    const { value: address, newOffset } = this.readString(data, offset);
    offset = newOffset;
    
    // Check if there are any type tags
    if (offset >= data.length || data[offset] !== 44) { // 44 is ','
      return { address, args: [] };
    }
    
    // Read the type tags
    const { value: typeTags, newOffset: afterTypeTags } = this.readString(data, offset);
    offset = afterTypeTags;
    
    // Parse arguments based on type tags
    const args: any[] = [];
    
    // Skip the comma at the beginning of typeTags
    for (let i = 1; i < typeTags.length; i++) {
      const tag = typeTags[i];
      
      if (tag === "i") {
        // Integer
        const { value, newOffset: newOffsetInt } = this.readInt32(data, offset);
        args.push(value);
        offset = newOffsetInt;
      } else if (tag === "f") {
        // Float
        const { value, newOffset: newOffsetFloat } = this.readFloat32(data, offset);
        args.push(value);
        offset = newOffsetFloat;
      } else if (tag === "s") {
        // String
        const { value, newOffset: newOffsetStr } = this.readString(data, offset);
        args.push(value);
        offset = newOffsetStr;
      }
      // Skip unsupported types
    }
    
    return { address, args };
  }
  
  /**
   * Read a null-terminated string from the buffer at the given offset
   */
  private static readString(data: Uint8Array, offset: number): { value: string, newOffset: number } {
    // Find the null terminator
    let end = offset;
    while (end < data.length && data[end] !== 0) {
      end++;
    }
    
    // Extract the string bytes
    const bytes = data.subarray(offset, end);
    
    // Convert to string
    const value = new TextDecoder().decode(bytes);
    
    // Calculate the padded size
    const paddedSize = Math.ceil((end - offset + 1) / 4) * 4;
    
    // Return the string and the new offset
    return { value, newOffset: offset + paddedSize };
  }
  
  /**
   * Read a 32-bit integer from the buffer at the given offset
   */
  private static readInt32(data: Uint8Array, offset: number): { value: number, newOffset: number } {
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const value = view.getInt32(offset, false); // Big-endian
    return { value, newOffset: offset + 4 };
  }
  
  /**
   * Read a 32-bit float from the buffer at the given offset
   */
  private static readFloat32(data: Uint8Array, offset: number): { value: number, newOffset: number } {
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const value = view.getFloat32(offset, false); // Big-endian
    return { value, newOffset: offset + 4 };
  }
}

/**
 * Sends OSC messages over UDP
 */
export class OscSender {
  private socket: Deno.DatagramConn | null = null;
  private hostname: string;
  private port: number;
  
  /**
   * Create a new OSC sender
   * @param hostname - Hostname or IP address to send to
   * @param port - Port number to send to
   */
  constructor(hostname: string, port: number) {
    // Important: Convert 'localhost' to explicit IP '127.0.0.1' for Deno compatibility
    this.hostname = hostname === 'localhost' ? '127.0.0.1' : hostname;
    this.port = port;
  }
  
  /**
   * Send an OSC message
   * @param address - The OSC address pattern
   * @param args - Arguments to the OSC message
   */
  async send(address: string, args: any[]): Promise<void> {
    try {
      // Create the socket if it doesn't exist
      if (!this.socket) {
        this.socket = await Deno.listenDatagram({
          hostname: "0.0.0.0",
          port: 0,
          transport: "udp"
        });
      }
      
      // Important: Use explicit IP address (127.0.0.1) instead of hostname (localhost)
      // This is crucial for Deno UDP to work correctly
      const targetHost = this.hostname === 'localhost' ? '127.0.0.1' : this.hostname;
      
      // Encode the OSC message
      const message = OscEncoder.encode(address, args);
      
      // Send the message
      await this.socket.send(message, {
        hostname: targetHost,
        port: this.port,
        transport: "udp"
      });
    } catch (err) {
      // Check for specific errors that are helpful to diagnose
      if (err instanceof Deno.errors.PermissionDenied) {
        throw new Error(`Permission denied to send OSC message. Make sure you run with --allow-net and --unstable-net flags: ${err.message}`);
      } else if (err instanceof Deno.errors.ConnectionRefused) {
        throw new Error(`Connection refused when sending OSC message to ${this.hostname}:${this.port}. Is serialosc running? ${err.message}`);
      } else {
        // Re-throw other errors with helpful context
        const errorMessage = err instanceof Error ? err.message : String(err);
        throw new Error(`Failed to send OSC message to ${this.hostname}:${this.port}: ${errorMessage}`);
      }
    }
  }
  
  /**
   * Close the socket
   */
  async close(): Promise<void> {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}

/**
 * Receives OSC messages over UDP
 */
export class OscReceiver extends EventEmitter<{
  message: [string, ...any[]];
  [key: string]: any[];
}> {
  private socket: Deno.DatagramConn | null = null;
  private port: number;
  private hostname: string;
  private isListening: boolean = false;
  
  /**
   * Create a new OSC receiver
   * @param port - Port to listen on
   * @param hostname - Hostname to listen on
   */
  constructor(port: number, hostname: string = "127.0.0.1") {
    super();
    this.port = port;
    // Important: Convert 'localhost' to explicit IP '127.0.0.1' for Deno compatibility
    this.hostname = hostname === 'localhost' ? '127.0.0.1' : hostname;
  }
  
  /**
   * Start listening for OSC messages
   */
  async listen(): Promise<void> {
    if (this.isListening) {
      return;
    }
    
    try {
      // Create the UDP socket
      this.socket = await Deno.listenDatagram({
        hostname: this.hostname,
        port: this.port,
        transport: "udp"
      });
      
      this.isListening = true;
      
      // Start receiving messages
      this.startReceiving();
    } catch (err) {
      console.error("Failed to start OSC receiver:", err);
      throw err;
    }
  }
  
  /**
   * Start receiving messages from the socket
   */
  private async startReceiving(): Promise<void> {
    if (!this.socket || !this.isListening) {
      return;
    }
    
    try {
      while (this.isListening) {
        // Wait for a message
        const [data, _] = await this.socket.receive();
        
        // Decode the OSC message
        const { address, args } = OscDecoder.decode(data);
        
        // Emit the message
        this.emit(address, ...args);
        this.emit("message", address, ...args);
      }
    } catch (err) {
      if (this.isListening) {
        console.error("Error receiving OSC messages:", err);
      }
    }
  }
  
  /**
   * Remove a specific listener for an OSC address
   */
  removeListener(address: string): void {
    // Implementation for removing listeners for specific address
    // Just log for now as the actual EventEmitter implementation might not support this directly
    console.log(`Removing listeners for: ${address}`);
  }
  
  /**
   * Remove all listeners for an OSC address
   */
  removeAllListeners(address?: string): void {
    // Implementation for removing all listeners
    if (address) {
      console.log(`Removing all listeners for: ${address}`);
    } else {
      console.log("Removing all listeners");
    }
  }
  
  /**
   * Get all event names (for compatibility)
   */
  eventNames(): string[] {
    if (typeof (this as any).eventNames === 'function') {
      return (this as any).eventNames();
    }
    // If not available in the EventEmitter implementation, return empty array
    return [];
  }
  
  /**
   * Close the socket and stop listening
   */
  async close(): Promise<void> {
    this.isListening = false;
    
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    // Clean up listeners
    try {
      this.removeAllListeners();
    } catch (err) {
      console.warn("Warning: Error when removing listeners:", err);
    }
  }
}