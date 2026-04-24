# tripo-game (Claude Code / ClawHub skill)

> Upgrade any AI-generated Three.js game (GPT-5.5 / Codex / Claude) with
> production-quality Tripo 3D assets. One command, zero manual 3D work.

## When Claude should use this skill

Use this skill whenever the user **has an HTML file containing a Three.js
game / demo** (usually produced by ChatGPT-5.5, Claude, Cursor, Codex,
v0, etc.) and wants to:

- Replace low-poly `BoxGeometry` / `SphereGeometry` placeholders with real
  3D models.
- "Make this game look professional" / "upgrade the art" / "add real
  models".
- Prototype a game for a demo, a pitch, a Twitter/X post.

Typical user requests:

- "Upgrade this UFO game with real 3D models"
- "Replace the cubes with Tripo assets"
- "Make my Three.js tank shooter look AAA"
- "把这个 3D 游戏升级一下，用 tripo 生成真实的模型"

## Preconditions

1. The user has a Tripo API key. If not, point them at
   <https://platform.tripo3d.ai/> and stop.
2. The user has Node.js ≥ 18 installed.

## Setup (once)

```bash
# Install globally so the CLI is always on PATH
npm install -g tripo-game

# Or use npx (no install)
npx tripo-game --help

# Export your Tripo API key
export TRIPO_API_KEY="tsk_xxx..."
```

## How Claude should run it

### 1. Detect (free, instant) — always do this first

```bash
tripo-game detect <game.html>
```

This prints the upgradeable meshes and the English prompts that will be
sent to Tripo. **Show that list to the user before spending credits.**

### 2. Upgrade

```bash
tripo-game upgrade <game.html> \
  --out <game.upgraded.html> \
  --assets-dir <game-assets/> \
  --quality standard \
  --max 8
```

Useful flags:

| Flag | Purpose |
| --- | --- |
| `--max N` | Only upgrade the first N meshes — great for a cheap demo. |
| `--quality draft` | Faster + cheaper Tripo models (low face count). |
| `--dry-run` | Print what would happen, no API call. |
| `--api-key` | Override `TRIPO_API_KEY`. |

The command writes:

- `<game>.upgraded.html` – your original file with a Tripo overlay
  injected right before `</body>`.
- `<game-assets>/*.glb` – the downloaded 3D models.
- `<game-assets>/manifest.json` – mapping from mesh variable → GLB path.

### 3. Open the result

```bash
open <game>.upgraded.html
```

The overlay keeps every gameplay variable / event listener intact — it
only swaps the *visual* of each mesh after the GLB has loaded. This means
even if only half the assets finish generating, the game still works.

## Editing prompts before generation

If the user wants to tune the Tripo prompt (e.g. "make the UFO metallic,
cyberpunk"), you can:

1. Run `tripo-game detect` first.
2. Edit the HTML's variable name or add a JS comment like
   `/* tripo: sleek cyberpunk UFO with glowing pink underside */` right
   above the `new THREE.Mesh(...)` line. (Future feature — see
   `scripts/prompt-overrides.json`.)

For now, the most reliable way to influence the prompt is to rename the
variable to be more descriptive:

```js
// Before (vague):
const thing = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), mat);

// After (Tripo gets great context):
const cyberpunkHoverTank = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), mat);
```

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `Missing Tripo API key` | No env var and no `--api-key` | `export TRIPO_API_KEY=...` |
| `No upgradeable meshes found` | Code uses `THREE.InstancedMesh` or pre-built GLBs | Only raw `THREE.Mesh(new THREE.XxxGeometry)` is matched; nothing to do. |
| Opened HTML but models don't appear | Your browser blocks `file://` ESM imports | Serve with `npx http-server` or VS Code "Live Server". |
| Tripo task times out | Quality `high` + big queue | Retry with `--quality standard` or re-run, the parser is idempotent. |

## Why this is powerful

- GPT-5.5 / Codex can already generate a *playable* 3D game in one shot.
- But every mesh looks like a Minecraft cube.
- `tripo-game` closes the loop in **a single command**.
- The overlay pattern means you can re-run it, swap assets mid-demo, and
  the game never breaks.
