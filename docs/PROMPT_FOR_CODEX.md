# 🧑‍💻 在 Codex Mac 应用里跑这个项目（可直接复制粘贴）

> 目标：让 Codex（内用 GPT-5.5）在你本机 Mac 的 Codex 桌面应用里，
> 先生成一个 Three.js 3D 小游戏，再跑我们写的 `tripo-game` 工具把
> 低模方块替换成 Tripo API 生成的真实 3D 模型。

**你用的是**：OpenAI Codex Mac 桌面应用
**你的项目位置**：`/Users/baichaoyu/Desktop/gpt5.5➕tripo/`

Codex 有自己的默认工作目录，我们第一步要把它切到你项目里。

---

## 🟦 第 1 条（锁定工作目录）

打开 Codex Mac 应用，**新开一个 session**，发这条：

```
请把工作目录切到 /Users/baichaoyu/Desktop/gpt5.5➕tripo/
后续所有 shell 命令、文件读写都在这个目录下操作。

先跑一下这几个命令确认环境：
  pwd
  ls
  node -v
  cat package.json | head -20

然后告诉我：
1. 当前是否就在这个目录
2. node 版本是不是 >= 18
3. 依赖是否已经 npm install 过（看有没有 node_modules 文件夹）
```

**预期 Codex 的回复**：确认已经在你项目目录里，node 版本 OK，
`node_modules` 已经存在（我们之前 `npm install` 过了）。

---

## 🟩 第 2 条（让 Codex 用 GPT-5.5 造一个新游戏）

在同一个 session 继续发：

```
在 examples/ufo-tank-v2.html 写一个完整的 Three.js 3D 小游戏，单 HTML 文件。

游戏：UFO 坦克射击（UFO Tank Shooter）
- 玩家：绿色坦克（车身 + 炮塔），WASD 移动，方向键转炮塔，空格开火
- 敌人：蓝色 UFO 在空中盘旋，随机掉炸弹
- 场景：绿色大地（PlaneGeometry），散布岩石和松树
- 击中 UFO 得分，被炸弹命中扣血，HUD 显示分数/血量/波次

严格约束（不遵守，后面的 tripo-game 工具就用不了，极其重要！）：

1. 每个可见 3D 对象必须写成这种**标准形式**，不要简写、不要抽工厂函数：
     const tank = new THREE.Mesh(
       new THREE.BoxGeometry(2, 0.8, 3),
       new THREE.MeshStandardMaterial({ color: 0x2e7d32 })
     );

2. 创建后立刻挂到 window 上（tripo-game 的 overlay 通过 window[变量名] 找对象）：
     window.tank = tank;

3. 变量名用**语义化英文小驼峰**：tank、turret、ufo、ufoDome、rock、pineTree、
   birchTree、barrel……变量名 = 物体在现实里的名字。

4. 地面用 PlaneGeometry（tripo-game 会自动跳过它，保留绿色草地）。

5. three.js 从 CDN 加载：
     <script src="https://unpkg.com/three@0.160.0/build/three.min.js"></script>
   不要用 import / importmap，保持跟 examples/ufo-tank.html 同一种写法，
   tripo-game 的 overlay 会另外注入 importmap。

6. 整个游戏放在单个 <script> 里，全部用 THREE 全局变量引用（不要 ESM）。

写完之后立刻跑：
  npx tsx src/cli.ts detect examples/ufo-tank-v2.html

告诉我：
- detect 识别出了几个 mesh
- 它们的变量名和生成的 Tripo prompt 是什么
- 如果识别数量 < 5，说明代码不符合约束，请修正后重跑
```

**预期 Codex 的回复**：写好 HTML 文件，跑 detect，输出类似：

```
Detected 6 mesh(es):
  • tank (BoxGeometry)         tank (hex #2e7d32), boxy silhouette, …
  • turret (BoxGeometry)       turret (hex #1b5e20), boxy silhouette, …
  • ufo (CylinderGeometry)     ufo (hex #7aa0ff), cylindrical body, …
  …
```

---

## 🟨 第 3 条（真正调 Tripo 升级）

把你的 Tripo key 填进去再发这条：

```
很好。现在执行真正的升级，只升级前 3 个 mesh，用 draft 画质（省积分 + 快）：

  export TRIPO_API_KEY="这里粘贴你的 Tripo key，比如 tsk_xxx"
  npx tsx src/cli.ts upgrade examples/ufo-tank-v2.html \
    --out examples/ufo-tank-v2.upgraded.html \
    --assets-dir examples/assets-v2 \
    --max 3 \
    --quality draft

跑完之后：
1. ls -la examples/assets-v2/  —— 列出生成了几个 .glb
2. cat examples/assets-v2/manifest.json —— 看看 manifest
3. 启动一个本地静态服务器（Tripo overlay 用了 importmap，file:// 打不开）：
     npx http-server examples -p 8123 -c-1 &
4. 用 Mac 的 open 命令同时打开对比：
     open "http://localhost:8123/ufo-tank-v2.html"
     open "http://localhost:8123/ufo-tank-v2.upgraded.html"

告诉我：生成了几个 .glb、manifest 内容、两个页面打开后的区别
（如果浏览器 console 里有 "[tripo-game] upgraded N/M meshes" 的日志就贴给我）。
```

**预期流程**：
- 3 次 Tripo 调用，每次约 60-120 秒
- `examples/assets-v2/` 里出现 3 个 `.glb` 文件
- 浏览器里原版是彩色方块，升级版里对应的 mesh 变成真实 3D 模型

---

## 🟪 第 4 条（可选：录制 before/after 对比视频）

如果你要做营销素材：

```
帮我录两段屏：
1. 用 macOS 自带的 screencapture -V 10 /tmp/before.mov 录 10 秒原版 ufo-tank-v2.html
2. 同样录 10 秒 upgraded 版

录完后（如果装了 ffmpeg，brew install ffmpeg）：

  ffmpeg -i /tmp/before.mov -i /tmp/after.mov \
    -filter_complex "[0:v][1:v]hstack=inputs=2" \
    -y /Users/baichaoyu/Desktop/gpt5.5➕tripo/assets/before-after/before-after.mp4

  # 再转成 gif（Twitter 友好）
  ffmpeg -i /Users/baichaoyu/Desktop/gpt5.5➕tripo/assets/before-after/before-after.mp4 \
    -vf "fps=15,scale=1200:-1:flags=lanczos" \
    -y /Users/baichaoyu/Desktop/gpt5.5➕tripo/assets/before-after/before-after.gif

告诉我最终 gif 大小，以及能不能在 README 里预览。
```

---

## 💡 常见卡点 & 解法

| 报错 | 原因 | 解法 |
| --- | --- | --- |
| `npx: command not found` | Node.js 没装 / 没进 PATH | `brew install node` |
| `Missing Tripo API key` | 没 export 环境变量 | `export TRIPO_API_KEY=tsk_xxx` 然后**同一个 session** 里再跑 |
| `Detected 0 mesh(es)` | GPT-5.5 把 mesh 包进了工厂函数或 class | 让 Codex 改写成第 2 条里的"标准形式" |
| 浏览器里模型没出现 | 用了 file:// 而不是 http:// | 一定要用 `npx http-server` 起本地服务器 |
| Tripo 任务超时 | 当前队列长 / 用了 high quality | 重跑，或改成 `--quality draft` |
| Codex 说"我没权限执行命令" | Mac 应用权限没给到终端 | 系统设置 → 隐私与安全 → 给 Codex "完全磁盘访问" |

---

## 📂 全部跑完后你会得到

```
~/Desktop/gpt5.5➕tripo/examples/
├── ufo-tank.html                       ← 我们事先写好的示例
├── ufo-tank-v2.html                    ← GPT-5.5 现场生成
├── ufo-tank-v2.upgraded.html           ← tripo-game 升级后
└── assets-v2/
    ├── manifest.json
    ├── tank-tank-1.glb
    ├── turret-turret-2.glb
    └── ufo-ufo-3.glb
```

然后就按 `docs/LAUNCH.md` 发 GitHub + npm + Twitter 吧 🚀
