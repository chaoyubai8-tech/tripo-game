# One-shot Agent Prompt for Codex CLI / Claude Code

> Copy the block below and paste it as a **single message** into Codex CLI or Claude Code.
> The agent will automatically: write the game → detect meshes → upgrade with Tripo → open the result.

---

## 📋 Copy-paste prompt (fill in YOUR_TRIPO_KEY first)

```
You are working in /Users/baichaoyu/Desktop/gpt5.5➕tripo/

## Goal
Generate a playable Three.js 3D game, then upgrade every mesh with real Tripo 3D models using the tripo-game CLI already installed in this project.

## Step 1 — Confirm environment
Run:
  pwd && node -v && ls examples/

## Step 2 — Write the game
Write a complete single-file Three.js game to examples/my-game.html.

Game concept: Space Tank Defender
- Player: green tank (body + turret), WASD moves, Arrow keys rotate turret, Space fires
- Enemies: blue UFOs hovering and dropping bombs
- Scene: green ground (PlaneGeometry), scattered rocks and pine trees
- HUD shows score / HP / wave number

STRICT RULES (tripo-game will break if you don't follow these):
1. Every visible mesh MUST use this exact pattern — no factory functions, no classes:
     const tank = new THREE.Mesh(
       new THREE.BoxGeometry(2, 0.8, 3),
       new THREE.MeshStandardMaterial({ color: 0x2e7d32 })
     );
2. Immediately after creation, attach to window:
     window.tank = tank;
3. Use semantic camelCase names: tank, turret, ufo, ufoDome, rock, pineTree, barrel …
4. Ground must be PlaneGeometry (tripo-game skips it automatically).
5. Load Three.js from CDN — no ESM imports:
     <script src="https://unpkg.com/three@0.160.0/build/three.min.js"></script>
6. Everything in a single <script> block using the global THREE variable.

## Step 3 — Detect meshes
Run:
  npx tsx src/cli.ts detect examples/my-game.html

If detected count < 5, fix the game code and re-run detect until it passes.

## Step 4 — Upgrade with Tripo
Run (replace YOUR_TRIPO_KEY with the real key):
  export TRIPO_API_KEY="YOUR_TRIPO_KEY"
  npx tsx src/cli.ts upgrade examples/my-game.html \
    --out examples/my-game.upgraded.html \
    --assets-dir examples/assets-my-game \
    --max 4 \
    --quality draft

## Step 5 — Open results
Run:
  npx http-server examples -p 8124 -c-1 &
  open "http://localhost:8124/my-game.html"
  open "http://localhost:8124/my-game.upgraded.html"

## Done
Report back:
- How many .glb files were generated
- The manifest.json contents
- Any console logs from the browser (look for "[tripo-game] upgraded N/M meshes")
```

---

## 🔑 Where to put your Tripo key

Before pasting, replace `YOUR_TRIPO_KEY` with your actual key from https://platform.tripo3d.ai/

Example:
```
export TRIPO_API_KEY="tsk_abc123..."
```

---

## ⚡️ Even shorter — if tripo-game is already globally installed

```
cd /Users/baichaoyu/Desktop/gpt5.5➕tripo && \
write a Three.js UFO tank game to examples/quick.html (follow the mesh naming rules in docs/PROMPT_FOR_CODEX.md), \
then run: tripo-game upgrade examples/quick.html --max 3 --quality draft && \
open examples/quick.upgraded.html
```

---

## 🛠 Troubleshooting

| Problem | Fix |
|---|---|
| `Detected 0 mesh(es)` | GPT wrapped meshes in a factory function. Ask it to rewrite using the direct `const x = new THREE.Mesh(...)` pattern. |
| `Missing Tripo API key` | `export TRIPO_API_KEY=tsk_xxx` in the **same shell session** |
| Models don't appear in browser | Must use `http://` not `file://`. Start with `npx http-server`. |
| Tripo task timeout | Re-run or switch to `--quality draft` |
