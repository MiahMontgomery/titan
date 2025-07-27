import { WebSocketServer } from 'ws';

let wss: WebSocketServer | null = null;

export function setupWebSocket(server: any) {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    
    ws.on('message', (message) => {
      console.log(`Received: ${message}`);
      ws.send(`Echo: ${message}`);
    });
    
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });

  return wss;
}

export function broadcastUpdate(update: any) {
  if (!wss) return;

  const message = JSON.stringify(update);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(message);
    }
  });
}

export function getWebSocketServer() {
  return wss;
}
