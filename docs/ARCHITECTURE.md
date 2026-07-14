# Cloner — Architecture

> Living document. Update it whenever a structural decision is made.
> The game-design specification (the "spec") has priority over everything here;
> this document explains **how** the spec is implemented, never changes **what** it says.

## The Golden Rule

A player **never** interacts with their own clone and **always** fully interacts with
the other player's clone. Every collision query in the simulation must go through the
single function `playerCollidesWithClone()` in `shared/src/sim/rules.ts`. No other code
may re-implement this check. This makes the rule impossible to break in one place and
easy to audit.

## Repository layout

```
/shared     @cloner/shared — pure TypeScript, no Phaser, no Node APIs
  /src
    /constants     tick rate, view size, sizes
    /types         core geometry, entity state, level schema, player input
    /messages      client<->server protocol (discriminated unions)
    /sim           deterministic simulation core (milestone 2+)
    /levels        level definitions as data (milestone 2+)
/client     Phaser 3 + Vite + TypeScript — rendering, input, audio, UI only
  /src
    /scenes        Boot, Preload, MainMenu, Lobby, LevelSelect, Game, PauseOverlay
    /entities      view classes (PlayerView, CloneView, DoorView, ...) — draw state, no logic
    /ui            reusable UI widgets (buttons, sliders, toasts)
    /network       WebSocket client, snapshot interpolation
    /i18n          string tables (en first, ru later)
    /utils
/server     Node + TypeScript + ws — authoritative
  /src
    /rooms         room lifecycle, codes, lobby/ready state
    /network       connection handling, message validation
    (game loop drives the SAME simulation from /shared)
/public + server.js   LEGACY vanilla-JS prototype — kept until the rewrite reaches
                      feature parity, then deleted. Do not extend it.
```

## Decision 1 — The simulation lives in `/shared`, not in Phaser

The spec requires (a) an authoritative server that never trusts clients and
(b) a Duo-on-one-PC mode with no server at all, and forbids duplicated logic.
The only structure that satisfies all three is an **engine-agnostic, deterministic,
fixed-timestep simulation** (60 Hz) in `/shared`:

- **Online:** the server owns the simulation; clients send only `PlayerInput` and render snapshots.
- **One PC:** the client runs the very same simulation locally, feeding it both players' inputs.

Phaser is strictly a presentation layer: scenes, sprites, tweens, sound, input reading.
View classes in `client/src/entities` read simulation state and draw it; they contain no rules.

## Decision 2 — Custom AABB physics, not Phaser Arcade

Arcade Physics cannot run on the server and cannot express selective collision
("solid for you, ghost for me") cleanly. The game is axis-aligned boxes on a single
static screen — a small, fully deterministic AABB sweep is simpler, testable with plain
unit tests, and identical on server and client. All physics constants live in
`shared/src/constants` (no magic numbers in the step code).

## Decision 3 — Networking model: inputs up, snapshots down

- Client → server: `input` messages (booleans per tick). Nothing else during play.
- Server → client: full-state `snapshot` at 20 Hz + discrete events (`gameStart`,
  `levelComplete`, lobby updates). Clients interpolate between the two latest snapshots.
- Full snapshots (not deltas) are chosen deliberately: state is tiny (2 players, a few
  clones and objects), and full state makes reconnection and debugging trivial.
  Delta compression is a future optimization, not a foundation.
- Lockstep was rejected: it ties one player's latency to the other's feel.
- Client-side prediction of the local player is a planned enhancement (milestone 5),
  layered on top without protocol changes.

## Decision 4 — Levels are data (JSON-like TS modules in `/shared/levels`)

Both server and client need level geometry, so levels live in shared. The schema
(`shared/src/types/level.ts`) is a discriminated union of object definitions:
`button`, `door`, `exit`, `laser`, `movingPlatform`, `elevator`.

- **`exit`** is the spec's colored "level complete" door (blue / red / gray / double).
- **`door`** is a button-controlled barrier. Buttons carry a `targets: ObjectId[]` list;
  while active they open doors, disable lasers, and run platforms/elevators. This
  generic signal system means new powered objects need no new plumbing.

## Level reset semantics

Death of either player = the room's simulation is re-created from the level definition.
No per-object "reset" methods to keep in sync — the constructor **is** the reset.
This guarantees the spec's "everything resets" with zero drift.

## Save system

Client-side `localStorage`: set of completed level ids + settings (volume, controls,
language, fullscreen). No accounts, no server persistence for now.

## UI screens (from the sketch)

- **Main menu:** Duo (one PC), Host / create room, Join (code entry), Level Select, Settings. Version tag in a corner.
- **Lobby:** room code with copy button, both players' ready state (✓ / ✗), start when both ready.
- **Settings:** Music and Sound sliders, control-scheme pickers (WASD / arrows), language, fullscreen.
- **Level select:** numbered grid, locked/unlocked from save data.
- **Game HUD:** mode + room label, restart and back-to-menu buttons, timer display (semantics TBD — open question).

## Milestones

1. **Scaffolding** — workspaces, tsconfigs, shared types/constants/protocol, boot-able client and server. *(done)*
2. **Simulation core** — AABB physics, player movement, clone place/remove + Golden Rule, level schema + reset, unit tests.
3. **Local play** — Game scene rendering the sim, Duo-on-one-PC playable on a test level.
4. **Objects** — buttons, doors, exits, lasers, moving platforms, elevators.
5. **Online** — rooms, lobby/ready flow, snapshots + interpolation, disconnect handling.
6. **UI & meta** — menus, level select, settings, save, i18n (en), audio.
7. **Content & polish** — level set with a teaching curve, death fragments, teleport effects, ru locale.

## Open questions (blocked on the designer)

- Clone limit: per player or a shared pool for the pair?
- Buttons: active only **while held down**, or toggle on activation?
- The sketch HUD shows `10:00` — is there a countdown/timer mechanic, or a plain stopwatch?
- Default one-PC controls for Player 2 (Player 1 = WASD + E/F).
