# tripo-game

> 🎮 **Upgrade any AI-generated 3D game (GPT-5.5 / Claude / Codex) with real Tripo 3D assets — in one command.**

GPT-5.5 & Codex can now build a playable Three.js game from one prompt.
There's just one problem: **every mesh is a cube**.

`tripo-game` fixes that. Point it at the `.html` file the AI gave you
and it will:

1. 🔍 Scan every `new THREE.Mesh(new THREE.XxxGeometry(...))` call.
2. 🧠 Turn the variable name + color into a Tripo-ready English prompt.
3. 🎨 Generate a real, textured 3D model for each one via Tripo's API.
4. ✨ Inject an overlay that swaps every cube for its Tripo twin **without
   breaking any gameplay logic**.

The result: your "ChatGPT 3D game" looks like a Steam indie title.

<p align="center">
  <img src="./assets/before-after/before-after.gif" alt="Before / after" width="680" />
</p>

---

## ⚡️ 60-second quickstart

```bash
# 1. Install
npm i -g tripo-game

# 2. Set your Tripo key  (grab one at https://platform.tripo3d.ai/)
export TRIPO_API_KEY=tsk_xxx

# 3. Upgrade a game GPT-5.5 / Codex / Claude gave you
tripo-game upgrade ./ufo-tank.html

# 4. Open the result
open ./ufo-tank.upgraded.html
```

That's it. Six cubes → six Tripo models → one playable, gorgeous game.

---

## 🛠 Commands

### `tripo-game detect <game.html>`

Free, instant, no API calls. Prints the upgradeable meshes + the prompt
that *would* be sent to Tripo. Use it to sanity-check before spending
credits.

```text
Detected 6 mesh(es):
  • tank (BoxGeometry)
    tank (hex #2e7d32), boxy silhouette, low-poly stylised 3D game asset, …
  • ufo (CylinderGeometry)
    ufo (hex #7aa0ff), cylindrical body, low-poly stylised 3D game asset, …
  • rock (IcosahedronGeometry)
    rock (hex #8a8a8a), faceted crystal-like shape, …
  …
```

### `tripo-game upgrade <game.html>`

Generates Tripo assets and writes an upgraded HTML file + `assets/*.glb`.

| Flag | Default | Purpose |
| --- | --- | --- |
| `-o, --out <file>` | `<input>.upgraded.html` | Where to write the upgraded HTML |
| `-a, --assets-dir <dir>` | `<output dir>/assets` | Where to store `.glb` files |
| `-k, --api-key <key>` | `$TRIPO_API_KEY` | Override the Tripo key |
| `-n, --max <N>` | (all) | Only upgrade the first N meshes |
| `-q, --quality <tier>` | `standard` | `draft` / `standard` / `high` |
| `--dry-run` | off | Don't call Tripo, just print plan |
| `-v, --verbose` | off | More logs |

---

## 🧩 Claude Code / ClawHub Skill

`tripo-game` ships with a first-class **[Skill](./skills/tripo-game-skill/SKILL.md)**
that Claude Code, Cursor, Codex CLI and any other agent Harness can
auto-install.

Install it inside an agent session:

```bash
# Inside Claude Code / ClawHub
/skill install tripo-game
```

Then just ask:

> "Upgrade this UFO game with real 3D models"

and the agent will run `tripo-game detect` → confirm the plan → run
`tripo-game upgrade` → open the result.

---

## 🔬 How it works

```
┌──────────────────────┐   regex scan    ┌───────────────────────┐
│ AI-generated HTML    │ ───────────────▶│ Detected 3D objects   │
│ (GPT-5.5 / Codex …)  │                 │ name + color + shape  │
└──────────────────────┘                 └───────────┬───────────┘
                                                     │ English prompt
                                                     ▼
                                         ┌───────────────────────┐
                                         │ Tripo v2 text_to_model │
                                         │  → GLB with PBR maps   │
                                         └───────────┬───────────┘
                                                     │ <game>-assets/*.glb
                                                     ▼
                                         ┌───────────────────────┐
                                         │ Overlay <script>       │
                                         │ window.tank = original │
                                         │ loader swaps geometry  │
                                         └───────────────────────┘
```

### Why an overlay instead of rewriting the source?

AI-generated code is messy: TS-ish syntax, JSX fragments, mixed ESM, you
name it. An AST rewrite would break 1 in 3 games. The overlay:

- Lets the **original script** keep running — collisions, animations,
  input, physics all stay intact.
- **Gracefully degrades**: if a single Tripo asset fails, the others
  still render and the game still plays.
- Is fully **reversible**: delete the injected `<script>` block and you
  get the original game back, byte-for-byte.

### The Tripo prompt recipe

Given `const rustyHoverTank = new THREE.Mesh(new THREE.BoxGeometry(2,1,3), new THREE.MeshStandardMaterial({ color: 0x2e7d32 }))`:

1. Variable `rustyHoverTank` → "rusty hover tank".
2. Color `0x2e7d32` → `(hex #2e7d32)` – Tripo loves concrete hex codes.
3. `BoxGeometry` → hint "boxy silhouette".
4. Append a style tail: `", low-poly stylised 3D game asset, PBR
   textures, centered, facing forward"`.

Final prompt:

> `rusty hover tank (hex #2e7d32), boxy silhouette, low-poly stylised 3D game asset, PBR textures, centered, facing forward`

This is the same prompt style the Tripo team recommends for game-ready
assets.

---

## 🧪 Try it with the bundled example

```bash
git clone https://github.com/baichaoyu/tripo-game.git
cd tripo-game
npm install

# Dry-run (no API key needed)
npm run test:example

# Full run (needs TRIPO_API_KEY)
npx tsx src/cli.ts upgrade examples/ufo-tank.html --quality draft --max 3
open examples/ufo-tank.upgraded.html
```

---

## 🧠 Why you want this

| Without `tripo-game` | With `tripo-game` |
| --- | --- |
| GPT-5.5 gives you a playable game — made of cubes. | Same game, minutes later, with real 3D models. |
| 3-5 hours in Blender to model / rig / export each asset. | 0 hours. One command. |
| Demo looks "prototype-y" on Twitter/X. | Demo looks like a Steam indie title. |

## 🗺 Roadmap

- [ ] `@tripo` comment directive for per-mesh prompt overrides
- [ ] Image-to-3D mode (feed a reference sketch instead of a prompt)
- [ ] Automatic animation retargeting (skeletons from Tripo rig API)
- [ ] Meshy / TRELLIS backends behind the same CLI
- [ ] Web UI for drag-and-drop upgrading

## 📝 License

MIT © 2026 baichaoyu

## 🤝 Credits

- [Tripo](https://platform.tripo3d.ai/) – the text-to-3D engine that
  makes the magic possible.
- [Three.js](https://threejs.org/) – the runtime every AI-generated game
  targets.
- Heavy inspiration from the Claude Code / ClawHub skill ecosystem.
