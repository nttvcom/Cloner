const canvas = document.querySelector("#gameCanvas");
const ctx = canvas.getContext("2d");

const menu = document.querySelector("#menu");
const game = document.querySelector("#game");
const onePcBtn = document.querySelector("#onePcBtn");
const createForm = document.querySelector("#createForm");
const customCodeInput = document.querySelector("#customCodeInput");
const joinForm = document.querySelector("#joinForm");
const roomCodeInput = document.querySelector("#roomCodeInput");
const menuStatus = document.querySelector("#menuStatus");
const leaveBtn = document.querySelector("#leaveBtn");
const modeLabel = document.querySelector("#modeLabel");
const roomLabel = document.querySelector("#roomLabel");
const onlineActions = document.querySelector("#onlineActions");
const hostingNote = document.querySelector("#hostingNote");

const configuredApiBase = document.querySelector('meta[name="clone-api-base"]')?.content.trim() || "";
const API_BASE = configuredApiBase.replace(/\/$/, "");
const IS_GITHUB_PAGES = location.hostname.endsWith(".github.io");
const ONLINE_AVAILABLE = !IS_GITHUB_PAGES || Boolean(API_BASE);

const W = canvas.width;
const H = canvas.height;
const PLAYER_SIZE = 42;
const CODE_RE = /^[A-Z0-9]{6}$/;
const keys = new Set();

const levels = [
  {
    name: "First Step",
    spawn1: { x: 70, y: 414 },
    spawn2: { x: 850, y: 414 },
    goal: { x: 805, y: 338, w: 68, h: 78 },
    solids: [
      { x: 0, y: 500, w: 260, h: 40 },
      { x: 390, y: 500, w: 570, h: 40 },
      { x: 0, y: 0, w: 24, h: 540 },
      { x: 936, y: 0, w: 24, h: 540 },
      { x: 720, y: 420, w: 180, h: 22 }
    ]
  },
  {
    name: "Double Gap",
    spawn1: { x: 70, y: 414 },
    spawn2: { x: 850, y: 414 },
    goal: { x: 825, y: 250, w: 68, h: 78 },
    solids: [
      { x: 0, y: 500, w: 245, h: 40 },
      { x: 385, y: 500, w: 210, h: 40 },
      { x: 735, y: 500, w: 225, h: 40 },
      { x: 0, y: 0, w: 24, h: 540 },
      { x: 936, y: 0, w: 24, h: 540 },
      { x: 770, y: 334, w: 150, h: 22 },
      { x: 600, y: 410, w: 88, h: 22 }
    ]
  },
  {
    name: "Lift",
    spawn1: { x: 70, y: 414 },
    spawn2: { x: 850, y: 414 },
    goal: { x: 455, y: 128, w: 68, h: 78 },
    solids: [
      { x: 0, y: 500, w: 960, h: 40 },
      { x: 0, y: 0, w: 24, h: 540 },
      { x: 936, y: 0, w: 24, h: 540 },
      { x: 130, y: 424, w: 180, h: 22 },
      { x: 650, y: 424, w: 180, h: 22 },
      { x: 370, y: 300, w: 220, h: 22 },
      { x: 420, y: 210, w: 120, h: 22 }
    ]
  },
  {
    name: "High Shelf",
    spawn1: { x: 70, y: 414 },
    spawn2: { x: 850, y: 414 },
    goal: { x: 810, y: 128, w: 68, h: 78 },
    solids: [
      { x: 0, y: 500, w: 960, h: 40 },
      { x: 0, y: 0, w: 24, h: 540 },
      { x: 936, y: 0, w: 24, h: 540 },
      { x: 110, y: 420, w: 170, h: 22 },
      { x: 365, y: 355, w: 150, h: 22 },
      { x: 740, y: 215, w: 170, h: 22 }
    ]
  },
  {
    name: "Stair Split",
    spawn1: { x: 70, y: 414 },
    spawn2: { x: 850, y: 414 },
    goal: { x: 75, y: 106, w: 68, h: 78 },
    solids: [
      { x: 0, y: 500, w: 315, h: 40 },
      { x: 445, y: 500, w: 515, h: 40 },
      { x: 0, y: 0, w: 24, h: 540 },
      { x: 936, y: 0, w: 24, h: 540 },
      { x: 180, y: 372, w: 120, h: 22 },
      { x: 80, y: 285, w: 120, h: 22 },
      { x: 55, y: 188, w: 125, h: 22 },
      { x: 480, y: 405, w: 120, h: 22 },
      { x: 660, y: 330, w: 120, h: 22 }
    ]
  },
  {
    name: "Needle Easy",
    spawn1: { x: 70, y: 414 },
    spawn2: { x: 850, y: 414 },
    goal: { x: 445, y: 95, w: 68, h: 78 },
    solids: [
      { x: 0, y: 500, w: 430, h: 40 },
      { x: 530, y: 500, w: 430, h: 40 },
      { x: 0, y: 0, w: 24, h: 540 },
      { x: 936, y: 0, w: 24, h: 540 },
      { x: 405, y: 380, w: 150, h: 22 },
      { x: 405, y: 282, w: 150, h: 22 },
      { x: 405, y: 195, w: 150, h: 22 }
    ]
  },
  {
    name: "Crossing",
    spawn1: { x: 70, y: 414 },
    spawn2: { x: 850, y: 414 },
    goal: { x: 820, y: 102, w: 68, h: 78 },
    solids: [
      { x: 0, y: 500, w: 270, h: 40 },
      { x: 430, y: 500, w: 530, h: 40 },
      { x: 0, y: 0, w: 24, h: 540 },
      { x: 936, y: 0, w: 24, h: 540 },
      { x: 120, y: 390, w: 120, h: 22 },
      { x: 480, y: 390, w: 120, h: 22 },
      { x: 685, y: 305, w: 120, h: 22 },
      { x: 785, y: 180, w: 125, h: 22 }
    ]
  },
  {
    name: "Tower",
    spawn1: { x: 70, y: 414 },
    spawn2: { x: 850, y: 414 },
    goal: { x: 448, y: 65, w: 68, h: 78 },
    solids: [
      { x: 0, y: 500, w: 405, h: 40 },
      { x: 555, y: 500, w: 405, h: 40 },
      { x: 0, y: 0, w: 24, h: 540 },
      { x: 936, y: 0, w: 24, h: 540 },
      { x: 430, y: 420, w: 100, h: 22 },
      { x: 300, y: 335, w: 110, h: 22 },
      { x: 550, y: 335, w: 110, h: 22 },
      { x: 430, y: 250, w: 100, h: 22 },
      { x: 430, y: 155, w: 100, h: 22 }
    ]
  },
  {
    name: "Long Jump",
    spawn1: { x: 70, y: 414 },
    spawn2: { x: 850, y: 414 },
    goal: { x: 820, y: 210, w: 68, h: 78 },
    solids: [
      { x: 0, y: 500, w: 350, h: 40 },
      { x: 600, y: 500, w: 360, h: 40 },
      { x: 0, y: 0, w: 24, h: 540 },
      { x: 936, y: 0, w: 24, h: 540 },
      { x: 760, y: 292, w: 150, h: 22 },
      { x: 545, y: 382, w: 80, h: 22 }
    ]
  },
  {
    name: "Final Sync",
    spawn1: { x: 70, y: 414 },
    spawn2: { x: 850, y: 414 },
    goal: { x: 444, y: 72, w: 72, h: 78 },
    solids: [
      { x: 0, y: 500, w: 285, h: 40 },
      { x: 675, y: 500, w: 285, h: 40 },
      { x: 0, y: 0, w: 24, h: 540 },
      { x: 936, y: 0, w: 24, h: 540 },
      { x: 170, y: 375, w: 105, h: 22 },
      { x: 685, y: 375, w: 105, h: 22 },
      { x: 320, y: 285, w: 95, h: 22 },
      { x: 545, y: 285, w: 95, h: 22 },
      { x: 430, y: 190, w: 100, h: 22 }
    ]
  },
  {
    name: "Blue Red Bridge",
    spawn1: { x: 70, y: 414 },
    spawn2: { x: 850, y: 414 },
    goal: { x: 820, y: 338, w: 68, h: 78 },
    solids: [
      { x: 0, y: 500, w: 300, h: 40 },
      { x: 430, y: 500, w: 530, h: 40 },
      { x: 0, y: 0, w: 24, h: 540 },
      { x: 936, y: 0, w: 24, h: 540 },
      { x: 700, y: 420, w: 190, h: 22 }
    ]
  },
  {
    name: "Low Ceiling",
    spawn1: { x: 70, y: 414 },
    spawn2: { x: 850, y: 414 },
    goal: { x: 810, y: 152, w: 68, h: 78 },
    solids: [
      { x: 0, y: 500, w: 960, h: 40 },
      { x: 0, y: 0, w: 24, h: 540 },
      { x: 936, y: 0, w: 24, h: 540 },
      { x: 130, y: 430, w: 150, h: 22 },
      { x: 360, y: 358, w: 130, h: 22 },
      { x: 610, y: 288, w: 130, h: 22 },
      { x: 765, y: 238, w: 135, h: 22 },
      { x: 320, y: 318, w: 310, h: 22 }
    ]
  },
  {
    name: "Two Islands",
    spawn1: { x: 70, y: 414 },
    spawn2: { x: 850, y: 414 },
    goal: { x: 448, y: 132, w: 68, h: 78 },
    solids: [
      { x: 0, y: 500, w: 260, h: 40 },
      { x: 700, y: 500, w: 260, h: 40 },
      { x: 0, y: 0, w: 24, h: 540 },
      { x: 936, y: 0, w: 24, h: 540 },
      { x: 335, y: 410, w: 120, h: 22 },
      { x: 505, y: 410, w: 120, h: 22 },
      { x: 410, y: 320, w: 140, h: 22 },
      { x: 420, y: 215, w: 120, h: 22 }
    ]
  },
  {
    name: "Red Step",
    spawn1: { x: 70, y: 414 },
    spawn2: { x: 850, y: 414 },
    goal: { x: 80, y: 118, w: 68, h: 78 },
    solids: [
      { x: 0, y: 500, w: 960, h: 40 },
      { x: 0, y: 0, w: 24, h: 540 },
      { x: 936, y: 0, w: 24, h: 540 },
      { x: 690, y: 420, w: 170, h: 22 },
      { x: 505, y: 348, w: 130, h: 22 },
      { x: 295, y: 276, w: 130, h: 22 },
      { x: 60, y: 205, w: 145, h: 22 }
    ]
  },
  {
    name: "Wide Cut",
    spawn1: { x: 70, y: 414 },
    spawn2: { x: 850, y: 414 },
    goal: { x: 800, y: 126, w: 68, h: 78 },
    solids: [
      { x: 0, y: 500, w: 330, h: 40 },
      { x: 650, y: 500, w: 310, h: 40 },
      { x: 0, y: 0, w: 24, h: 540 },
      { x: 936, y: 0, w: 24, h: 540 },
      { x: 380, y: 392, w: 110, h: 22 },
      { x: 565, y: 392, w: 110, h: 22 },
      { x: 735, y: 302, w: 160, h: 22 },
      { x: 770, y: 212, w: 120, h: 22 }
    ]
  },
  {
    name: "Backtrack",
    spawn1: { x: 70, y: 414 },
    spawn2: { x: 850, y: 414 },
    goal: { x: 448, y: 90, w: 68, h: 78 },
    solids: [
      { x: 0, y: 500, w: 960, h: 40 },
      { x: 0, y: 0, w: 24, h: 540 },
      { x: 936, y: 0, w: 24, h: 540 },
      { x: 140, y: 420, w: 150, h: 22 },
      { x: 670, y: 420, w: 150, h: 22 },
      { x: 300, y: 330, w: 110, h: 22 },
      { x: 550, y: 330, w: 110, h: 22 },
      { x: 425, y: 220, w: 110, h: 22 },
      { x: 430, y: 165, w: 100, h: 22 }
    ]
  },
  {
    name: "Small Steps",
    spawn1: { x: 70, y: 414 },
    spawn2: { x: 850, y: 414 },
    goal: { x: 828, y: 92, w: 68, h: 78 },
    solids: [
      { x: 0, y: 500, w: 280, h: 40 },
      { x: 420, y: 500, w: 540, h: 40 },
      { x: 0, y: 0, w: 24, h: 540 },
      { x: 936, y: 0, w: 24, h: 540 },
      { x: 325, y: 410, w: 95, h: 22 },
      { x: 515, y: 350, w: 95, h: 22 },
      { x: 665, y: 285, w: 95, h: 22 },
      { x: 800, y: 178, w: 120, h: 22 }
    ]
  },
  {
    name: "Center Wall",
    spawn1: { x: 70, y: 414 },
    spawn2: { x: 850, y: 414 },
    goal: { x: 445, y: 118, w: 68, h: 78 },
    solids: [
      { x: 0, y: 500, w: 410, h: 40 },
      { x: 550, y: 500, w: 410, h: 40 },
      { x: 0, y: 0, w: 24, h: 540 },
      { x: 936, y: 0, w: 24, h: 540 },
      { x: 455, y: 395, w: 50, h: 125 },
      { x: 330, y: 330, w: 120, h: 22 },
      { x: 510, y: 330, w: 120, h: 22 },
      { x: 420, y: 220, w: 120, h: 22 }
    ]
  },
  {
    name: "Outer Rim",
    spawn1: { x: 70, y: 414 },
    spawn2: { x: 850, y: 414 },
    goal: { x: 820, y: 88, w: 68, h: 78 },
    solids: [
      { x: 0, y: 500, w: 960, h: 40 },
      { x: 0, y: 0, w: 24, h: 540 },
      { x: 936, y: 0, w: 24, h: 540 },
      { x: 140, y: 410, w: 125, h: 22 },
      { x: 340, y: 335, w: 125, h: 22 },
      { x: 540, y: 260, w: 125, h: 22 },
      { x: 740, y: 185, w: 160, h: 22 }
    ]
  },
  {
    name: "Alternating",
    spawn1: { x: 70, y: 414 },
    spawn2: { x: 850, y: 414 },
    goal: { x: 82, y: 82, w: 68, h: 78 },
    solids: [
      { x: 0, y: 500, w: 320, h: 40 },
      { x: 460, y: 500, w: 500, h: 40 },
      { x: 0, y: 0, w: 24, h: 540 },
      { x: 936, y: 0, w: 24, h: 540 },
      { x: 220, y: 390, w: 100, h: 22 },
      { x: 430, y: 325, w: 100, h: 22 },
      { x: 260, y: 255, w: 100, h: 22 },
      { x: 80, y: 168, w: 120, h: 22 }
    ]
  },
  {
    name: "Two Towers",
    spawn1: { x: 70, y: 414 },
    spawn2: { x: 850, y: 414 },
    goal: { x: 448, y: 76, w: 68, h: 78 },
    solids: [
      { x: 0, y: 500, w: 330, h: 40 },
      { x: 630, y: 500, w: 330, h: 40 },
      { x: 0, y: 0, w: 24, h: 540 },
      { x: 936, y: 0, w: 24, h: 540 },
      { x: 230, y: 400, w: 110, h: 22 },
      { x: 620, y: 400, w: 110, h: 22 },
      { x: 350, y: 305, w: 110, h: 22 },
      { x: 500, y: 305, w: 110, h: 22 },
      { x: 430, y: 165, w: 100, h: 22 }
    ]
  },
  {
    name: "Thin Middle",
    spawn1: { x: 70, y: 414 },
    spawn2: { x: 850, y: 414 },
    goal: { x: 820, y: 125, w: 68, h: 78 },
    solids: [
      { x: 0, y: 500, w: 270, h: 40 },
      { x: 690, y: 500, w: 270, h: 40 },
      { x: 0, y: 0, w: 24, h: 540 },
      { x: 936, y: 0, w: 24, h: 540 },
      { x: 370, y: 422, w: 80, h: 22 },
      { x: 510, y: 350, w: 80, h: 22 },
      { x: 660, y: 275, w: 90, h: 22 },
      { x: 785, y: 210, w: 125, h: 22 }
    ]
  },
  {
    name: "Mirror Climb",
    spawn1: { x: 70, y: 414 },
    spawn2: { x: 850, y: 414 },
    goal: { x: 445, y: 82, w: 68, h: 78 },
    solids: [
      { x: 0, y: 500, w: 960, h: 40 },
      { x: 0, y: 0, w: 24, h: 540 },
      { x: 936, y: 0, w: 24, h: 540 },
      { x: 130, y: 420, w: 130, h: 22 },
      { x: 700, y: 420, w: 130, h: 22 },
      { x: 285, y: 335, w: 120, h: 22 },
      { x: 555, y: 335, w: 120, h: 22 },
      { x: 420, y: 240, w: 120, h: 22 },
      { x: 430, y: 168, w: 100, h: 22 }
    ]
  },
  {
    name: "Last Gap",
    spawn1: { x: 70, y: 414 },
    spawn2: { x: 850, y: 414 },
    goal: { x: 820, y: 92, w: 68, h: 78 },
    solids: [
      { x: 0, y: 500, w: 340, h: 40 },
      { x: 620, y: 500, w: 340, h: 40 },
      { x: 0, y: 0, w: 24, h: 540 },
      { x: 936, y: 0, w: 24, h: 540 },
      { x: 435, y: 398, w: 90, h: 22 },
      { x: 610, y: 322, w: 110, h: 22 },
      { x: 760, y: 248, w: 130, h: 22 },
      { x: 805, y: 176, w: 110, h: 22 }
    ]
  },
  {
    name: "Clone Check",
    spawn1: { x: 70, y: 414 },
    spawn2: { x: 850, y: 414 },
    goal: { x: 448, y: 58, w: 68, h: 78 },
    solids: [
      { x: 0, y: 500, w: 305, h: 40 },
      { x: 655, y: 500, w: 305, h: 40 },
      { x: 0, y: 0, w: 24, h: 540 },
      { x: 936, y: 0, w: 24, h: 540 },
      { x: 185, y: 382, w: 110, h: 22 },
      { x: 665, y: 382, w: 110, h: 22 },
      { x: 325, y: 292, w: 110, h: 22 },
      { x: 525, y: 292, w: 110, h: 22 },
      { x: 425, y: 185, w: 110, h: 22 },
      { x: 430, y: 140, w: 100, h: 22 }
    ]
  }
];

let mode = "menu";
let roomCode = null;
let playerId = null;
let playerSlot = 1;
let remotePlayer = null;
let pollTimer = null;
let pushTimer = null;
let won = false;
let currentLevelIndex = 0;
let lastTime = performance.now();

const player = makePlayer(1);
const localPlayer2 = makePlayer(2);

function currentLevel() {
  return levels[currentLevelIndex];
}

function makePlayer(slot) {
  const level = currentLevel();
  const spawn = slot === 1 ? level.spawn1 : level.spawn2;
  return {
    slot,
    x: spawn.x,
    y: spawn.y,
    w: PLAYER_SIZE,
    h: PLAYER_SIZE,
    vx: 0,
    vy: 0,
    facing: slot === 1 ? 1 : -1,
    grounded: false,
    levelIndex: currentLevelIndex,
    clone: null
  };
}

function resetPlayer(slot = playerSlot, keepRemote = false) {
  const fresh = makePlayer(slot);
  Object.assign(player, fresh);
  if (!keepRemote) remotePlayer = null;
  won = false;
}

function resetLevel(index = currentLevelIndex) {
  currentLevelIndex = Math.max(0, Math.min(levels.length - 1, index));
  resetPlayer(playerSlot, mode === "onepc");
  if (mode === "onepc") {
    Object.assign(localPlayer2, makePlayer(2));
    remotePlayer = { id: "local-p2", slot: 2, state: localPlayer2 };
  }
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function moveAxis(entity, amount, axis, solids) {
  entity[axis] += amount;

  for (const solid of solids) {
    if (!rectsOverlap(entity, solid)) continue;

    if (axis === "x") {
      if (amount > 0) entity.x = solid.x - entity.w;
      if (amount < 0) entity.x = solid.x + solid.w;
      entity.vx = 0;
    } else {
      if (amount > 0) {
        entity.y = solid.y - entity.h;
        entity.grounded = true;
      }
      if (amount < 0) entity.y = solid.y + solid.h;
      entity.vy = 0;
    }
  }
}

function getCloneSolid(owner) {
  if (!owner || owner.levelIndex !== currentLevelIndex) return [];
  if (!owner.clone || !owner.clone.active) return [];
  return [owner.clone];
}

function getOtherCloneSolid() {
  if (!remotePlayer || !remotePlayer.state) return [];
  return getCloneSolid(remotePlayer.state);
}

function advanceLevel() {
  if (currentLevelIndex < levels.length - 1) {
    currentLevelIndex += 1;
    resetLevel(currentLevelIndex);
    return;
  }

  won = true;
}

function updateEntity(entity, dt, controls, otherCloneSolids) {
  const left = controls.left.some(code => keys.has(code));
  const right = controls.right.some(code => keys.has(code));
  const jump = controls.jump.some(code => keys.has(code));
  const down = controls.down.some(code => keys.has(code));

  const accel = entity.grounded ? 2200 : 1350;
  const maxSpeed = 250;
  const friction = entity.grounded ? (down ? 0.62 : 0.78) : 0.96;

  if (left) {
    entity.vx -= accel * dt;
    entity.facing = -1;
  }
  if (right) {
    entity.vx += accel * dt;
    entity.facing = 1;
  }
  if (!left && !right) entity.vx *= friction;

  entity.vx = Math.max(-maxSpeed, Math.min(maxSpeed, entity.vx));

  if (jump && entity.grounded) {
    entity.vy = -610;
    entity.grounded = false;
  }

  entity.vy += (down && !entity.grounded ? 2300 : 1650) * dt;
  entity.vy = Math.min(entity.vy, 820);
  entity.grounded = false;
  entity.levelIndex = currentLevelIndex;

  const solids = currentLevel().solids.concat(otherCloneSolids);
  moveAxis(entity, entity.vx * dt, "x", solids);
  moveAxis(entity, entity.vy * dt, "y", solids);

  if (entity.y > H + 120) resetLevel(currentLevelIndex);
  if (rectsOverlap(entity, currentLevel().goal)) advanceLevel();
}

function updatePlayer(dt) {
  updateEntity(
    player,
    dt,
    {
      left: ["KeyA", "ArrowLeft"],
      right: ["KeyD", "ArrowRight"],
      jump: ["KeyW", "Space", "ArrowUp"],
      down: ["KeyS", "ArrowDown"]
    },
    getOtherCloneSolid()
  );
}

function updateOnePc(dt) {
  updateEntity(
    player,
    dt,
    {
      left: ["KeyA"],
      right: ["KeyD"],
      jump: ["KeyW"],
      down: ["KeyS"]
    },
    getCloneSolid(localPlayer2)
  );

  updateEntity(
    localPlayer2,
    dt,
    {
      left: ["ArrowLeft"],
      right: ["ArrowRight"],
      jump: ["ArrowUp"],
      down: ["ArrowDown"]
    },
    getCloneSolid(player)
  );
}

function placeClone(entity = player) {
  entity.clone = {
    x: Math.round(entity.x),
    y: Math.round(entity.y),
    w: entity.w,
    h: entity.h,
    active: true
  };
}

function drawRect(rect, fill, stroke) {
  ctx.fillStyle = fill;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.strokeRect(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2);
  }
}

function drawPlayer(entity, color, label, alpha = 1) {
  if (!Number.isFinite(entity.x) || !Number.isFinite(entity.y)) return;

  ctx.save();
  ctx.globalAlpha = alpha;
  drawRect(entity, color, "rgba(255,255,255,0.7)");
  ctx.fillStyle = "#101219";
  ctx.fillRect(entity.x + (entity.facing > 0 ? 27 : 10), entity.y + 14, 6, 6);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 13px system-ui";
  ctx.textAlign = "center";
  ctx.fillText(label, entity.x + entity.w / 2, entity.y - 8);
  ctx.restore();
}

function drawClone(clone, ownerSlot, activeForMe) {
  if (!clone || !clone.active) return;
  const fill = ownerSlot === 1 ? "rgba(59, 130, 246, 0.38)" : "rgba(239, 68, 68, 0.38)";
  const stroke = activeForMe ? "#79a7ff" : "rgba(255,255,255,0.22)";
  drawRect(clone, fill, stroke);
}

function draw() {
  const level = currentLevel();
  ctx.clearRect(0, 0, W, H);

  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#151a25");
  sky.addColorStop(1, "#101219");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  drawRect(level.goal, "rgba(121, 167, 255, 0.22)", "#79a7ff");
  ctx.fillStyle = "#d8e4ff";
  ctx.font = "bold 18px system-ui";
  ctx.textAlign = "center";
  ctx.fillText("GOAL", level.goal.x + level.goal.w / 2, level.goal.y + 44);

  for (const solid of level.solids) drawRect(solid, "#303746", "#485266");

  drawClone(player.clone, player.slot, false);

  if (remotePlayer && remotePlayer.state && remotePlayer.state.levelIndex === currentLevelIndex) {
    drawClone(remotePlayer.state.clone, remotePlayer.slot, true);
    drawPlayer(remotePlayer.state, remotePlayer.slot === 1 ? "#3b82f6" : "#ef4444", `P${remotePlayer.slot}`, 0.95);
  }

  drawPlayer(player, player.slot === 1 ? "#3b82f6" : "#ef4444", `P${player.slot}`);

  ctx.fillStyle = "#f4f7fb";
  ctx.font = "bold 18px system-ui";
  ctx.textAlign = "left";
  ctx.fillText(`Уровень ${currentLevelIndex + 1}/${levels.length}: ${level.name}`, 28, 34);
  ctx.fillText(`Чужой клон: ${getOtherCloneSolid().length ? "есть" : "нет"}`, 28, 60);

  if (mode === "online" && !remotePlayer) {
    ctx.fillStyle = "rgba(16,18,25,0.64)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#f4f7fb";
    ctx.textAlign = "center";
    ctx.font = "bold 26px system-ui";
    ctx.fillText("Ждем второго игрока", W / 2, H / 2);
  }

  if (won) {
    ctx.fillStyle = "rgba(16,18,25,0.7)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#f4f7fb";
    ctx.textAlign = "center";
    ctx.font = "bold 30px system-ui";
    ctx.fillText("Все уровни пройдены!", W / 2, H / 2 - 12);
    ctx.font = "16px system-ui";
    ctx.fillText("Нажми R, чтобы начать уровень заново", W / 2, H / 2 + 24);
  }
}

function loop(now) {
  const dt = Math.min(0.033, (now - lastTime) / 1000);
  lastTime = now;

  if (mode === "onepc" && !won) updateOnePc(dt);
  if (mode === "online" && !won) updatePlayer(dt);
  if (mode !== "menu") draw();

  requestAnimationFrame(loop);
}

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Ошибка сервера");
  return data;
}

function normalizeCodeInput(value) {
  return value.trim().toUpperCase();
}

function applyRoom(room) {
  const other = room.players.find(candidate => candidate.id !== playerId);
  remotePlayer = other || null;
  roomLabel.textContent = room.code ? `Код: ${room.code}` : "";
}

async function pushState() {
  if (mode !== "online" || !roomCode || !playerId) return;

  try {
    const data = await api(`/api/rooms/${roomCode}/state`, {
      method: "POST",
      body: JSON.stringify({
        playerId,
        x: player.x,
        y: player.y,
        w: player.w,
        h: player.h,
        vx: player.vx,
        vy: player.vy,
        facing: player.facing,
        grounded: player.grounded,
        levelIndex: currentLevelIndex,
        clone: player.clone
      })
    });
    applyRoom(data.room);
  } catch (error) {
    menuStatus.textContent = error.message;
  }
}

async function pollRoom() {
  if (mode !== "online" || !roomCode) return;

  try {
    const data = await api(`/api/rooms/${roomCode}`);
    applyRoom(data.room);
  } catch (error) {
    stopOnlineTimers();
    showMenu(error.message);
  }
}

function stopOnlineTimers() {
  clearInterval(pollTimer);
  clearInterval(pushTimer);
  pollTimer = null;
  pushTimer = null;
}

function showGame(nextMode) {
  mode = nextMode;
  menu.classList.add("hidden");
  game.classList.remove("hidden");
  modeLabel.textContent = nextMode === "online" ? `Онлайн P${playerSlot}` : "На одном ПК";
  lastTime = performance.now();
}

function showMenu(message = "") {
  mode = "menu";
  stopOnlineTimers();
  roomCode = null;
  playerId = null;
  remotePlayer = null;
  menuStatus.textContent = message;
  game.classList.add("hidden");
  menu.classList.remove("hidden");
}

function startOnePc() {
  stopOnlineTimers();
  roomCode = null;
  playerId = null;
  playerSlot = 1;
  currentLevelIndex = 0;
  resetPlayer(1, true);
  Object.assign(localPlayer2, makePlayer(2));
  remotePlayer = { id: "local-p2", slot: 2, state: localPlayer2 };
  roomLabel.textContent = "Одна клавиатура";
  showGame("onepc");
}

async function startOnline(data) {
  roomCode = data.room.code;
  playerId = data.playerId;
  playerSlot = data.slot;
  currentLevelIndex = 0;
  resetPlayer(playerSlot);
  applyRoom(data.room);
  showGame("online");
  await pushState();
  pushTimer = setInterval(pushState, 50);
  pollTimer = setInterval(pollRoom, 250);
}

onePcBtn.addEventListener("click", startOnePc);

if (!ONLINE_AVAILABLE) {
  onlineActions.classList.add("hidden");
  hostingNote.classList.remove("hidden");
}

createForm.addEventListener("submit", async event => {
  event.preventDefault();
  if (!ONLINE_AVAILABLE) return;
  const code = normalizeCodeInput(customCodeInput.value);

  if (code && !CODE_RE.test(code)) {
    menuStatus.textContent = "Код должен состоять из 6 букв или цифр.";
    return;
  }

  menuStatus.textContent = "";
  try {
    const data = await api("/api/rooms", {
      method: "POST",
      body: JSON.stringify({ code })
    });
    await startOnline(data);
  } catch (error) {
    menuStatus.textContent = error.message;
  }
});

joinForm.addEventListener("submit", async event => {
  event.preventDefault();
  if (!ONLINE_AVAILABLE) return;
  const code = normalizeCodeInput(roomCodeInput.value);

  if (!CODE_RE.test(code)) {
    menuStatus.textContent = "Нужен код из 6 букв или цифр.";
    return;
  }

  menuStatus.textContent = "";
  try {
    const data = await api(`/api/rooms/${code}/join`, { method: "POST", body: "{}" });
    await startOnline(data);
  } catch (error) {
    menuStatus.textContent = error.message;
  }
});

for (const input of [customCodeInput, roomCodeInput]) {
  input.addEventListener("input", () => {
    input.value = normalizeCodeInput(input.value).replace(/[^A-Z0-9]/g, "");
  });
}

leaveBtn.addEventListener("click", () => showMenu());

window.addEventListener("keydown", event => {
  keys.add(event.code);

  if (event.code === "KeyE" && mode !== "menu") placeClone(player);
  if (event.code === "AltRight" && mode === "onepc") {
    placeClone(localPlayer2);
    event.preventDefault();
  }
  if (event.code === "KeyR" && mode !== "menu") resetLevel(currentLevelIndex);

  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(event.code)) {
    event.preventDefault();
  }
});

window.addEventListener("keyup", event => {
  keys.delete(event.code);
});

requestAnimationFrame(loop);
