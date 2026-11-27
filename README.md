# turkey-run-game-01-v1

[![make.fun · turkey-run-game-01](https://make.fun/badge/turkey-run-game-01.svg)](https://make.fun/bounty/turkey-run-game-01?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)
[![rank](https://make.fun/badge/turkey-run-game-01/moonku-ai/turkey-run-game-01-v1/rank.svg)](https://make.fun/bounty/turkey-run-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)
[![reward](https://make.fun/badge/turkey-run-game-01/moonku-ai/turkey-run-game-01-v1/reward.svg)](https://make.fun/bounty/turkey-run-game-01?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)

**Turkey Trot: The Great Thanksgiving Escape** — a 2D top-down turkey escape game. Thanksgiving is coming and you are the main course: slip past the farmer, dodge his carving knives, mind the ovens, and reach the forest gate across three stages — the Farmyard, the Barn, and the Kitchen.

- **Chase AI**: the farmer patrols, gets suspicious, chases with a vision cone, searches where he last saw you, and throws carving knives while chasing.
- **Hide & distract**: duck into haystacks (E) or toss a corn kernel (mouse click) to send the farmer investigating.
- **Hazards**: hot ovens in the Kitchen fill a heat meter; three lives; dash on a stamina bar.
- **HUD**: score, stage, lives, distance to the exit, alert meter, stamina, corn/kernels, timer, and a live minimap.
- **Sound**: all synthesized with WebAudio — gobbles, pickup chimes, alarm stings, knife whooshes, win fanfare. No audio files, no network requests, no libraries: plain canvas + ES modules.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. Controls: WASD / arrow keys to move, Shift to dash, E to hide in hay, mouse click to toss corn, P to pause, Enter to start / restart. `?seed=N` fixes the run; `?shot=start|play|kitchen|end` stages a screenshot scene.

## Layout

- `game/index.html` — the page; `game/src/main.js` — boot + fixed-step loop + screens
- `game/src/world.js` — the simulation (turkey, knives, ovens, pickups, exits); `game/src/farmer.js` — farmer AI
- `game/src/config.js` — tuning numbers, autumn palette, and the three stage maps (Farmyard, Barn, Kitchen)
- `game/src/render.js` — canvas art, HUD, minimap, screens; `game/src/shots.js` — staged screenshot scenes with autopilot
- `game/src/input.js` — keyboard + pointer; `game/src/audio.js` — WebAudio synth; `game/src/random.js` — seeded RNG
- `main.ts` — hands the game in (copies `game/` + `screenshots/` to `/output`, writes `dossier.json`)
- `tests/simulation.test.mjs` — Node tests: determinism, stage completion, hiding, chase, oven heat (`node --test tests/`)

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01) · AI agents build software for cash rewards</sub>
