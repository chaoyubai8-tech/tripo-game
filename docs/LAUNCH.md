# 🚀 Launch playbook

Everything you need to take `tripo-game` from "folder on my Desktop" →
"#1 on /r/threejs and trending on GitHub".

---

## 0. Pre-launch sanity checklist

- [ ] `npm install` runs clean
- [ ] `npm run test:example` passes (dry-run, no API key)
- [ ] `TRIPO_API_KEY=xxx npx tsx src/cli.ts upgrade examples/ufo-tank.html --max 2 --quality draft` succeeds end-to-end
- [ ] Opened `examples/ufo-tank.upgraded.html` in a local server and **saw** the Tripo assets replace the cubes
- [ ] Captured a **before/after GIF**
  - Record `examples/ufo-tank.html` in one half of the screen
  - Record `examples/ufo-tank.upgraded.html` in the other
  - Use Kap / Gifski / QuickTime → `ffmpeg -i …` → `assets/before-after/before-after.gif`
- [ ] README `<img src="./assets/before-after/before-after.gif">` renders

---

## 1. Create the GitHub repo

```bash
cd ~/Desktop/gpt5.5➕tripo
git init
git add .
git commit -m "feat: initial tripo-game CLI + Claude Code skill"

# Using the GitHub CLI (recommended):
gh repo create tripo-game --public --source=. --remote=origin --push \
  --description "🎮 Upgrade any AI-generated Three.js game (GPT-5.5 / Codex / Claude) with real Tripo 3D assets — in one command." \
  --homepage "https://platform.tripo3d.ai"

# Or the manual way:
#   1. Create github.com/baichaoyu/tripo-game (public, no README)
#   2. git remote add origin git@github.com:baichaoyu/tripo-game.git
#   3. git branch -M main
#   4. git push -u origin main
```

Topics to add (GitHub repo settings → Topics):

```
gpt-5.5  gpt5  codex  claude-code  openclaw  tripo  three.js
3d  ai  game  vibe-coding  skill  text-to-3d  image-to-3d
```

---

## 2. Publish to npm (optional, but huge for discoverability)

```bash
# First time only:
npm login

# Dry check — prints the tarball contents
npm publish --dry-run

# Ship it
npm publish --access public
```

After publishing, anyone in the world can do:

```bash
npx tripo-game upgrade my-game.html
```

---

## 3. Publish to ClawHub (Skill)

```bash
# From the project root
cd skills/tripo-game-skill
clawhub publish           # if you have the clawhub CLI
# or manually upload via https://clawhub.dev (adjust to the real URL)
```

The `_meta.json` is already filled in — `clawhub publish` should pick
up everything. Don't forget to include a short screencast in the
listing.

---

## 4. Viral launch posts

### Twitter / X (English)

```
ChatGPT-5.5 can build a playable 3D game in one prompt.
The problem: every mesh is a cube.

I shipped `tripo-game` — one command turns those cubes into real
Tripo 3D models. No Blender. No hand-animation.

npx tripo-game upgrade game.html

before / after 👇

github.com/baichaoyu/tripo-game
```

(Attach the before/after GIF. Keep it under 20s for autoplay.)

### Twitter / X (Chinese)

```
GPT-5.5 一句话写出 3D 小游戏，但所有模型都是方块。

我做了个开源工具：tripo-game
一条命令，把 AI 写的 Three.js 游戏里的方块，
全部换成 Tripo 生成的真实 3D 模型。

npx tripo-game upgrade game.html

效果对比 👇

github.com/baichaoyu/tripo-game
```

### Reddit

Post to (in priority order):

1. `/r/threejs` — title: "Turn any GPT-generated Three.js game into a real 3D game in one command (tripo-game)"
2. `/r/webgl`
3. `/r/gamedev` — focus on the "AI prototyping" angle
4. `/r/ChatGPTCoding`
5. `/r/LocalLLaMA` — only if you add a Meshy/TRELLIS backend

### Hacker News

Title: `Show HN: Tripo-game – Turn AI-generated 3D games into real 3D games`

First comment (author):

> Hi HN! I got tired of GPT-5.5 giving me "3D games" that are just
> coloured cubes in Three.js. Tripo can now do text-to-3D in ~60s per
> asset, so I wrote a tiny CLI that: (1) scans the HTML for
> `new THREE.Mesh(new THREE.BoxGeometry(...))` calls, (2) turns the
> variable name + color into a Tripo prompt, (3) injects an overlay
> script that swaps each cube for the generated GLB at runtime — without
> touching gameplay code. Happy to answer questions / take feature
> requests.

### LinkedIn / 即刻

Keep it a bit more professional, ~4 lines, attach GIF. Call out the
"no Blender, no rig, no export pipeline" angle.

---

## 5. What makes this a viral candidate

- **Rides two trend waves**: GPT-5.5 hype + text-to-3D hype.
- **Demo is unbelievable in 15s**: cubes → actual tank → Twitter autoplay
  converts.
- **Zero-friction install**: `npx tripo-game` works with just a key.
- **Composable**: landed as both a standalone CLI and a Claude Code /
  ClawHub Skill — multiple distribution channels.
- **Real cost**: a full upgrade of a 6-asset game = ~$0.30 in Tripo
  credits. Cheap enough that everyone will try it once, which is all
  you need for a star spike.

## 6. Post-launch

- Add a GitHub Action that rebuilds `examples/ufo-tank.upgraded.html` on
  every push, so the GIF in the README always matches the latest Tripo
  model.
- Open issues for the Roadmap items and label them `good first issue`.
- Tweet a short thread every week with a new "game GPT-5.5 generated,
  upgraded by tripo-game" demo.
