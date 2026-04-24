# tripo-game

> 🎮 **让 AI（GPT-5.5 / Claude / Codex）生成的 3D 游戏，一条命令升级成"Steam 独立游戏"级别的画面。**

## 🎬 效果展示

### 升级前 vs 升级后
| 升级前（AI 方块版）| 升级后（Tripo 模型版）|
|---|---|
| ![before](./docs/before.png) | ![after](./docs/after.png) |

> 📸 截图录好后替换 `docs/before.png` 和 `docs/after.png`

### 视频 Demo
<!-- 录好视频上传到 YouTube/Bilibili 后，替换下面的链接和封面图 -->
[![Watch the demo](https://img.shields.io/badge/▶_Watch_Demo-YouTube-red?style=for-the-badge&logo=youtube)](https://youtube.com)

---

GPT-5.5 和 Codex 现在一句话就能写出能跑的 Three.js 小游戏。
可它们的问题只有一个：**所有模型都是方块**。


`tripo-game` 就是来解决这件事的。
把 AI 给你的 `.html` 文件丢给它，它会：

1. 🔍 扫描里面所有 `new THREE.Mesh(new THREE.XxxGeometry(...))` 调用
2. 🧠 把变量名 + 颜色拼成 Tripo 喜欢的英文 prompt
3. 🎨 自动调 Tripo API 生成真实带贴图的 3D 模型
4. ✨ 注入一段 overlay 脚本，把原来的方块替换成 Tripo 模型，**完全不改动游戏逻辑**

最终效果：你的"ChatGPT 造的 3D 游戏" = Steam 独立游戏 demo。

---

## ⚡️ 60 秒上手

```bash
# 1. 全局安装
npm i -g tripo-game

# 2. 配置 Tripo key （在 https://platform.tripo3d.ai/ 免费注册即可）
export TRIPO_API_KEY=tsk_xxx

# 3. 升级一个 AI 生成的游戏
tripo-game upgrade ./ufo-tank.html

# 4. 打开看看
open ./ufo-tank.upgraded.html
```

就这样。6 个方块 → 6 个 Tripo 模型 → 一款好看又能玩的游戏。

---

## 🛠 命令

### `tripo-game detect <游戏.html>`

免费、瞬时、不调 API。打印所有可升级的 mesh 和将要发给 Tripo 的 prompt。
**花钱之前先跑一次 detect 检查一下，是好习惯。**

### `tripo-game upgrade <游戏.html>`

真的生成资产并写出升级后的 HTML。

| 参数 | 默认值 | 作用 |
| --- | --- | --- |
| `-o, --out <文件>` | `<输入>.upgraded.html` | 输出 HTML 路径 |
| `-a, --assets-dir <目录>` | `<输出目录>/assets` | GLB 模型存放位置 |
| `-k, --api-key <key>` | `$TRIPO_API_KEY` | 覆盖环境变量 |
| `-n, --max <N>` | 全部 | 只升级前 N 个（省钱做 demo 神器） |
| `-q, --quality <级别>` | `standard` | `draft` / `standard` / `high` |
| `--dry-run` | 关 | 不调 Tripo，只打印计划 |
| `-v, --verbose` | 关 | 更详细日志 |

---

## 🧩 Claude Code / ClawHub Skill

项目内置一个 **[Skill](./skills/tripo-game-skill/SKILL.md)**，
Claude Code、Cursor、Codex CLI 任何 Agent Harness 都能一键装。

装上之后，你就可以直接说：

> "把这个 UFO 游戏的 3D 模型升级一下"

Agent 会自己跑 `tripo-game detect` → 给你确认计划 →
跑 `tripo-game upgrade` → 帮你打开结果。

---

## 🔬 工作原理

```
┌──────────────────────┐   regex 扫描    ┌───────────────────────┐
│ AI 生成的 HTML       │ ───────────────▶│ 识别出 3D 对象         │
│ (GPT-5.5 / Codex …)  │                 │ 变量名 + 颜色 + 形状   │
└──────────────────────┘                 └───────────┬───────────┘
                                                     │ 英文 prompt
                                                     ▼
                                         ┌───────────────────────┐
                                         │ Tripo v2 text_to_model │
                                         │  → 带 PBR 贴图的 GLB   │
                                         └───────────┬───────────┘
                                                     │ assets/*.glb
                                                     ▼
                                         ┌───────────────────────┐
                                         │ 注入 overlay 脚本      │
                                         │ 游戏逻辑完全不变       │
                                         │ 只替换可见的几何体     │
                                         └───────────────────────┘
```

### 为什么用 overlay 而不是改原代码？

AI 写的代码又野又乱 —— TS 混 JSX、各种混搭 ESM。直接 AST 重写，
三份里有一份会炸。Overlay 模式的好处：

- **原脚本继续运行** —— 碰撞、动画、输入、物理一概不受影响
- **优雅降级**：哪怕一个模型失败了，其他依然显示，游戏依然能玩
- **完全可逆**：删掉注入的 `<script>` 就回到原样

---

## 🧠 为什么你会需要它

| 没有 `tripo-game` | 有了 `tripo-game` |
| --- | --- |
| GPT-5.5 给你一个能玩的游戏 —— 但全是方块 | 一样的游戏，几分钟后，全是真实 3D 模型 |
| 在 Blender 里建模 / 绑定 / 导出，3-5 小时起 | 0 小时。一条命令 |
| 发 Twitter/X demo 看着很"原型" | demo 看着像 Steam 独立游戏 |

## 📝 许可

MIT License © 2026 baichaoyu


## 🤝 致谢

- [Tripo](https://platform.tripo3d.ai/) —— 让这一切成为可能的文生 3D 引擎
- [Three.js](https://threejs.org/) —— 所有 AI 生成游戏的默认运行时
- 灵感来自 Claude Code / ClawHub Skill 生态
