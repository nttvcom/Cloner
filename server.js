const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const os = require("os");

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const PUBLIC_DIR = path.join(__dirname, "public");
const CODE_RE = /^[A-Z0-9]{6}$/;
const rooms = new Map();

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".ico": "image/x-icon"
};

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
    "Access-Control-Allow-Origin": "*"
  });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", chunk => {
      data += chunk;
      if (data.length > 100_000) {
        reject(new Error("Body is too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function normalizeCode(code) {
  return String(code || "").trim().toUpperCase();
}

function makeCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  for (let attempt = 0; attempt < 50; attempt += 1) {
    let code = "";
    for (let i = 0; i < 6; i += 1) {
      code += alphabet[crypto.randomInt(0, alphabet.length)];
    }
    if (!rooms.has(code)) return code;
  }

  throw new Error("Could not allocate a room code");
}

function createPlayer(slot) {
  return {
    id: crypto.randomUUID(),
    slot,
    name: slot === 1 ? "P1" : "P2",
    joinedAt: Date.now(),
    lastSeen: Date.now(),
    state: null
  };
}

function publicRoom(room) {
  return {
    code: room.code,
    hostId: room.hostId,
    createdAt: room.createdAt,
    players: room.players.map(player => ({
      id: player.id,
      slot: player.slot,
      name: player.name,
      lastSeen: player.lastSeen,
      state: player.state
    }))
  };
}

function cleanupRooms() {
  const now = Date.now();

  for (const [code, room] of rooms) {
    room.players = room.players.filter(player => now - player.lastSeen < 30_000);
    if (room.players.length === 0 || now - room.createdAt > 6 * 60 * 60_000) {
      rooms.delete(code);
      continue;
    }

    if (!room.players.some(player => player.id === room.hostId)) {
      room.hostId = room.players[0].id;
    }
  }
}

function roomFromPath(url, suffix = "") {
  const match = url.pathname.match(new RegExp(`^/api/rooms/([A-Za-z0-9]{6})${suffix}$`));
  return match ? normalizeCode(match[1]) : null;
}

setInterval(cleanupRooms, 10_000).unref();

async function handleApi(req, res, url) {
  try {
    if (req.method === "POST" && url.pathname === "/api/rooms") {
      const body = await readBody(req);
      const requestedCode = normalizeCode(body.code);

      if (requestedCode && !CODE_RE.test(requestedCode)) {
        sendJson(res, 400, { error: "Код должен состоять из 6 букв или цифр" });
        return;
      }

      const code = requestedCode || makeCode();
      if (rooms.has(code)) {
        sendJson(res, 409, { error: "Такой код уже занят" });
        return;
      }

      const player = createPlayer(1);
      const room = {
        code,
        hostId: player.id,
        createdAt: Date.now(),
        players: [player]
      };

      rooms.set(code, room);
      sendJson(res, 201, { room: publicRoom(room), playerId: player.id, slot: player.slot });
      return;
    }

    const joinCode = roomFromPath(url, "/join");
    if (req.method === "POST" && joinCode) {
      const room = rooms.get(joinCode);
      if (!room) {
        sendJson(res, 404, { error: "Комната не найдена" });
        return;
      }

      let player = room.players.find(candidate => Date.now() - candidate.lastSeen > 30_000);
      if (!player && room.players.length >= 2) {
        sendJson(res, 409, { error: "Комната уже заполнена" });
        return;
      }

      if (!player) {
        const usedSlots = new Set(room.players.map(candidate => candidate.slot));
        player = createPlayer(usedSlots.has(1) ? 2 : 1);
        room.players.push(player);
      } else {
        player.id = crypto.randomUUID();
        player.lastSeen = Date.now();
        player.state = null;
      }

      sendJson(res, 200, { room: publicRoom(room), playerId: player.id, slot: player.slot });
      return;
    }

    const getCode = roomFromPath(url);
    if (req.method === "GET" && getCode) {
      const room = rooms.get(getCode);
      if (!room) {
        sendJson(res, 404, { error: "Комната не найдена" });
        return;
      }

      sendJson(res, 200, { room: publicRoom(room) });
      return;
    }

    const stateCode = roomFromPath(url, "/state");
    if (req.method === "POST" && stateCode) {
      const room = rooms.get(stateCode);
      if (!room) {
        sendJson(res, 404, { error: "Комната не найдена" });
        return;
      }

      const body = await readBody(req);
      const player = room.players.find(candidate => candidate.id === body.playerId);
      if (!player) {
        sendJson(res, 403, { error: "Игрок не в этой комнате" });
        return;
      }

      player.lastSeen = Date.now();
      player.state = {
        x: Number(body.x) || 0,
        y: Number(body.y) || 0,
        w: Number(body.w) || 42,
        h: Number(body.h) || 42,
        vx: Number(body.vx) || 0,
        vy: Number(body.vy) || 0,
        facing: Number(body.facing) || 1,
        grounded: Boolean(body.grounded),
        levelIndex: Number(body.levelIndex) || 0,
        clone: body.clone
          ? {
              x: Number(body.clone.x) || 0,
              y: Number(body.clone.y) || 0,
              w: Number(body.clone.w) || 42,
              h: Number(body.clone.h) || 42,
              active: Boolean(body.clone.active)
            }
          : null,
        updatedAt: Date.now()
      };

      sendJson(res, 200, { room: publicRoom(room) });
      return;
    }

    sendJson(res, 404, { error: "Unknown API route" });
  } catch (error) {
    sendJson(res, 400, { error: error.message || "Bad request" });
  }
}

function serveStatic(req, res, url) {
  const requestPath = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const filePath = path.normalize(path.join(PUBLIC_DIR, requestPath));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    const ext = path.extname(filePath);
    res.writeHead(200, {
      "Content-Type": mimeTypes[ext] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "OPTIONS" && url.pathname.startsWith("/api/")) {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    });
    res.end();
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    handleApi(req, res, url);
    return;
  }

  serveStatic(req, res, url);
});

function getLocalUrls() {
  const urls = [`http://localhost:${PORT}`];
  const interfaces = os.networkInterfaces();

  for (const entries of Object.values(interfaces)) {
    for (const entry of entries || []) {
      if (entry.family === "IPv4" && !entry.internal) {
        urls.push(`http://${entry.address}:${PORT}`);
      }
    }
  }

  return urls;
}

server.listen(PORT, HOST, () => {
  console.log("Clone MVP is running:");
  for (const url of getLocalUrls()) {
    console.log(`  ${url}`);
  }
});
