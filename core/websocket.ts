import WebSocket from 'ws';
import { getStatus } from './status';

const wss = new WebSocket.Server({ port: 8080 });

// Handle new connections
wss.on('connection', (ws) => {
  console.log('New client connected');
  
  // Send initial status
  getStatus().then(status => {
    ws.send(JSON.stringify(status));
  });
  
  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// Broadcast updates to all connected clients
export async function broadcastUpdate(data?: any): Promise<void> {
  const status = await getStatus();
  const message = JSON.stringify(data || status);
  
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Broadcast specific data
export function broadcastData(data: object): void {
  const message = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
} 