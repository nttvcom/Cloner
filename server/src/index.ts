import { WebSocketServer, type WebSocket } from 'ws';
import type { ClientMessage, ServerMessage } from '@cloner/shared';

const PORT = Number(process.env.PORT ?? 3001);

const wss = new WebSocketServer({ port: PORT });

function send(socket: WebSocket, message: ServerMessage): void {
  socket.send(JSON.stringify(message));
}

wss.on('connection', (socket) => {
  console.log('client connected');

  socket.on('message', (raw) => {
    let message: ClientMessage;
    try {
      message = JSON.parse(raw.toString()) as ClientMessage;
    } catch {
      // Malformed input from an untrusted client: ignore, never crash the room.
      return;
    }

    // Milestone 5 replaces this stub with the RoomManager.
    console.log('received', message.type);
    if (message.type === 'createRoom' || message.type === 'joinRoom') {
      send(socket, { type: 'roomError', reason: 'notFound' });
    }
  });

  socket.on('close', () => {
    console.log('client disconnected');
  });
});

console.log(`Cloner server listening on ws://localhost:${PORT}`);
