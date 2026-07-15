import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, type WebSocket } from 'ws';
import type { ClientMessage, PlayerColor, ServerMessage } from '@cloner/shared';
import { RoomManager, type Room } from './rooms';
import { serveStatic } from './static';

const PORT = Number(process.env.PORT ?? 3001);
const HERE = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(HERE, '..', 'public');
const hasClient = existsSync(join(CLIENT_DIR, 'index.html'));

const rooms = new RoomManager();

interface Session {
  room: Room | null;
  color: PlayerColor | null;
}

function send(socket: WebSocket, message: ServerMessage): void {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

const httpServer = createServer((req, res) => {
  if (hasClient) {
    serveStatic(CLIENT_DIR, req, res);
  } else {
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end('Cloner server is running (no client build deployed).');
  }
});

const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (socket) => {
  const session: Session = { room: null, color: null };

  socket.on('message', (raw) => {
    let message: ClientMessage;
    try {
      message = JSON.parse(raw.toString()) as ClientMessage;
    } catch {
      return; // malformed input from an untrusted client: ignore, never crash
    }

    switch (message.type) {
      case 'createRoom': {
        if (session.room) return;
        const result = rooms.create(message.customCode);
        if (result === 'codeTaken' || result === 'invalidCode') {
          send(socket, { type: 'roomError', reason: result });
          return;
        }
        const color = result.join(socket)!;
        session.room = result;
        session.color = color;
        send(socket, {
          type: 'roomJoined',
          code: result.code,
          yourColor: color,
          lobby: result.lobbySnapshot(),
          levelId: result.levelId,
        });
        break;
      }
      case 'joinRoom': {
        if (session.room) return;
        const room = rooms.get(message.code ?? '');
        if (!room) {
          send(socket, { type: 'roomError', reason: 'notFound' });
          return;
        }
        const color = room.join(socket);
        if (!color) {
          send(socket, { type: 'roomError', reason: 'full' });
          return;
        }
        session.room = room;
        session.color = color;
        send(socket, {
          type: 'roomJoined',
          code: room.code,
          yourColor: color,
          lobby: room.lobbySnapshot(),
          levelId: room.levelId,
        });
        room.broadcast({ type: 'lobbyState', lobby: room.lobbySnapshot(), levelId: room.levelId });
        break;
      }
      case 'setReady': {
        if (session.room && session.color) {
          session.room.setReady(session.color, message.ready === true);
        }
        break;
      }
      case 'selectLevel': {
        if (session.room && session.color) {
          session.room.selectLevel(session.color, message.levelId);
        }
        break;
      }
      case 'input': {
        if (session.room && session.color) {
          session.room.applyInput(session.color, message.input);
        }
        break;
      }
      case 'leaveRoom': {
        if (session.room && session.color) {
          session.room.leave(session.color);
          session.room = null;
          session.color = null;
        }
        break;
      }
    }
  });

  socket.on('close', () => {
    if (session.room && session.color) {
      session.room.leave(session.color);
      session.room = null;
      session.color = null;
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`Cloner server on http://0.0.0.0:${PORT} (ws same port)`);
  console.log(hasClient ? `serving client from ${CLIENT_DIR}` : 'no client build found');
});
