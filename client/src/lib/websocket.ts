import { WS_EVENTS } from "./constants";

type WebSocketCallback = (data: any) => void;

interface WebSocketListeners {
  [event: string]: WebSocketCallback[];
}

export class WebSocketClient {
  private socket: WebSocket | null = null;
  private listeners: WebSocketListeners = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeoutId: number | null = null;

  constructor() {
    this.connect();
  }

  private connect() {
    if (this.socket?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      this.socket = new WebSocket(wsUrl);
      
      this.socket.onopen = () => {
        console.log("WebSocket connection established");
        this.reconnectAttempts = 0;
      };
      
      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };
      
      this.socket.onclose = () => {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.attemptReconnect();
        } else {
          console.error("WebSocket connection closed permanently after max retries");
        }
      };
      
      this.socket.onerror = (error) => {
        console.error("WebSocket error:", error);
      };
    } catch (error) {
      console.error("Failed to establish WebSocket connection:", error);
      this.attemptReconnect();
    }
  }

  private attemptReconnect() {
    if (this.reconnectTimeoutId !== null) {
      clearTimeout(this.reconnectTimeoutId);
    }

    const reconnectDelay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    console.log(`Attempting to reconnect in ${reconnectDelay / 1000} seconds...`);
    
    this.reconnectAttempts += 1;
    this.reconnectTimeoutId = window.setTimeout(() => {
      this.connect();
    }, reconnectDelay);
  }

  private handleMessage(data: any) {
    if (!data || !data.type) {
      console.error("Invalid WebSocket message format:", data);
      return;
    }

    const eventCallbacks = this.listeners[data.type] || [];
    eventCallbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in WebSocket event callback for ${data.type}:`, error);
      }
    });
  }

  public addListener(event: string, callback: WebSocketCallback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  public removeListener(event: string, callback: WebSocketCallback) {
    if (!this.listeners[event]) return;
    
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    
    if (this.listeners[event].length === 0) {
      delete this.listeners[event];
    }
  }

  public close() {
    if (this.reconnectTimeoutId !== null) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
    
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    this.listeners = {};
    this.reconnectAttempts = 0;
  }
}

// Create singleton instance
export const wsClient = new WebSocketClient();

// Helper functions for specific events
export function onProjectCreated(callback: (data: any) => void) {
  wsClient.addListener(WS_EVENTS.PROJECT_CREATED, callback);
  return () => wsClient.removeListener(WS_EVENTS.PROJECT_CREATED, callback);
}

export function onFeatureUpdated(callback: (data: any) => void) {
  wsClient.addListener(WS_EVENTS.FEATURE_UPDATED, callback);
  return () => wsClient.removeListener(WS_EVENTS.FEATURE_UPDATED, callback);
}

export function onMessageCreated(callback: (data: any) => void) {
  wsClient.addListener(WS_EVENTS.MESSAGE_CREATED, callback);
  return () => wsClient.removeListener(WS_EVENTS.MESSAGE_CREATED, callback);
}

export function onLogCreated(callback: (data: any) => void) {
  wsClient.addListener(WS_EVENTS.LOG_CREATED, callback);
  return () => wsClient.removeListener(WS_EVENTS.LOG_CREATED, callback);
}

export function onOutputCreated(callback: (data: any) => void) {
  wsClient.addListener(WS_EVENTS.OUTPUT_CREATED, callback);
  return () => wsClient.removeListener(WS_EVENTS.OUTPUT_CREATED, callback);
}

export function onSaleCreated(callback: (data: any) => void) {
  wsClient.addListener(WS_EVENTS.SALE_CREATED, callback);
  return () => wsClient.removeListener(WS_EVENTS.SALE_CREATED, callback);
}
