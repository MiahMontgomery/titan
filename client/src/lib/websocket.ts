import { useEffect, useRef, useState } from "react";
import { WS_EVENTS } from "./constants";

export type WebSocketMessage = {
  type: string;
  data?: any;
};

export type WebSocketStatus = "connecting" | "connected" | "disconnected" | "error";

const MAX_RECONNECT_ATTEMPTS = 5;
const INITIAL_RECONNECT_DELAY = 1000; // 1 second

export class WebSocketClient {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private listeners: Record<string, ((data: any) => void)[]> = {};
  private messageQueue: WebSocketMessage[] = [];
  private status: WebSocketStatus = "disconnected";
  private statusListeners: ((status: WebSocketStatus) => void)[] = [];

  constructor(private url: string) {
    this.connect();
  }

  private connect() {
    try {
      this.socket = new WebSocket(this.url);
      this.updateStatus("connecting");
      
      this.socket.onopen = () => {
        console.log("WebSocket connected");
        this.reconnectAttempts = 0;
        this.updateStatus("connected");
        this.flushMessageQueue();
      };

      this.socket.onclose = () => {
        console.log("WebSocket disconnected");
        this.updateStatus("disconnected");
        this.handleReconnect();
      };

      this.socket.onerror = (error) => {
        console.error("WebSocket error:", error);
        this.updateStatus("error");
      };
      
      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };
    } catch (error) {
      console.error("Error creating WebSocket:", error);
      this.updateStatus("error");
      this.handleReconnect();
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error("Max reconnection attempts reached");
      return;
    }

    const delay = INITIAL_RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectTimeout = setTimeout(() => {
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
      this.connect();
    }, delay);
  }

  private updateStatus(status: WebSocketStatus) {
    this.status = status;
    this.statusListeners.forEach(listener => listener(status));
  }

  private flushMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message);
      }
    }
  }

  public send(message: WebSocketMessage) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    } else {
      this.messageQueue.push(message);
    }
  }

  public subscribe(type: string, callback: (data: any) => void) {
    if (!this.listeners[type]) {
      this.listeners[type] = [];
    }
    this.listeners[type].push(callback);
  }

  public unsubscribe(type: string, callback: (data: any) => void) {
    if (this.listeners[type]) {
      this.listeners[type] = this.listeners[type].filter(cb => cb !== callback);
    }
  }

  public onStatusChange(callback: (status: WebSocketStatus) => void) {
    this.statusListeners.push(callback);
    return () => {
      this.statusListeners = this.statusListeners.filter(cb => cb !== callback);
    };
  }

  public getStatus(): WebSocketStatus {
    return this.status;
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

  public disconnect() {
    if (this.socket) {
      this.socket.close();
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
  }
}

// React hook for using WebSocket
export function useWebSocket(url: string) {
  const [status, setStatus] = useState<WebSocketStatus>("disconnected");
  const clientRef = useRef<WebSocketClient | null>(null);

  useEffect(() => {
    clientRef.current = new WebSocketClient(url);
    const unsubscribe = clientRef.current.onStatusChange(setStatus);

    return () => {
      unsubscribe();
      clientRef.current?.disconnect();
    };
  }, [url]);

  return {
    status,
    send: (message: WebSocketMessage) => clientRef.current?.send(message),
    subscribe: (type: string, callback: (data: any) => void) => 
      clientRef.current?.subscribe(type, callback),
    unsubscribe: (type: string, callback: (data: any) => void) =>
      clientRef.current?.unsubscribe(type, callback),
  };
}
