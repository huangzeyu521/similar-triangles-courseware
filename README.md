# 《利用相似三角形测高》交互课件（HTML5）

## 目录结构

| 路径 | 说明 |
|------|------|
| `index.html` | 页面骨架：国风卷轴主导航（七关蛇形闯关路线：顶行 1→4、底行 5→7 + 墨径 SVG）、各模块视图、底栏 |
| `flag1.png` | 「悬赏榜 · 情境挑战」主视觉背景图（与 `index.html` 同目录） |
| `style.css` | 全局样式：国风色板、卷轴展开/收拢、竹简导航、液态玻璃反馈等 |
| `main.js` | 路由、情境任务卡、卷轴收拢后跳转、速算/测验/极限挑战逻辑 |
| `js/lab-models.js` | 方案比拼（`MeasureLab`）、鉴误阁 / 极限风力（`ErrorAmpLab`）— Canvas 均随容器宽度铺满 |
| `js/heritage-lab.js` | 古建测绘局 Canvas（`HeritageLab`，同左铺满逻辑） |
| `scripts/smoke-test.js` | 冒烟测试（id、语法、关键节点） |
| `scripts/verify-ids.js` | 校验 `main.js` 的 `getElementById` 与 `index.html` 一致 |
| `package.json` | `npm test` → 连续执行上述两脚本 |
| `.github/workflows/deploy-github-pages.yml` | push 到 `main` 时自动部署 GitHub Pages |

## 模块一览（古风命名）

1. **悬赏榜** — 情境挑战  
2. **测绘局** — 方案比拼（影子 / 平面镜 / 标杆）  
3. **古建测绘** — 互动测绘（Canvas）+ **算经闯关**（《孙子算经》《九章算术》名题）  
4. **算学馆** — 数据速算：影子法（人高 / 标杆）、平面镜法、标杆法多模板随机，±0.1 m 判分  
5. **鉴误阁** — 误差分析（倾斜 + 风力）  
6. **科举考** — 随堂评价：手电+平面镜测城墙、纸板测树高、台阶折影等  
7. **极限挑战** — **高阶闯关** + **风力模拟**（手动倾角固定 0°）

## 运行方式

用本地静态服务器打开目录（或直接双击 `index.html`）。无需构建步骤。

首页七关入口不再先做卷轴横向收拢（避免切换中间态整屏只剩窄条），进入子模块时由视图 `opacity` 过渡完成切换感。

### 自检

```bash
node scripts/smoke-test.js
node scripts/verify-ids.js
```

或在 `htmlpages` 目录执行：

```bash
npm test
```

（含：`main.js` 与 `index.html` 的 id 对齐、`index.html` 内 `id` 唯一性、脚本文件存在、`node --check` 语法检查、底栏与画布等关键 `id` 存在性；`npm test` 会连续跑 `smoke-test` 与 `verify-ids`。）

## GitHub Pages 自动部署

仓库内已配置 **GitHub Actions**（`.github/workflows/deploy-github-pages.yml`）：每次 **push 到 `main`** 会自动把站点根目录部署到 GitHub Pages。

**首次启用（只需做一次）：**

1. 打开 GitHub 仓库 → **Settings** → **Pages**。
2. **Build and deployment** → **Source** 选 **GitHub Actions**（不要选 “Deploy from a branch”，否则与 Actions 部署冲突）。
3. 将含 workflow 的提交 **push 到 `main`**，在 **Actions** 页可看到 “Deploy to GitHub Pages” 运行；约 1～2 分钟后站点生效。

访问地址一般为：`https://<你的用户名>.github.io/<仓库名>/`，例如：`https://huangzeyu521.github.io/similar-triangles-courseware/`

## Git 与 GitHub（本目录为独立仓库）

日常只在 **`D:\MyAIProject\pptdesign\htmlpages`** 里维护课件，与上层 `pptdesign` 仓库分开。

```bash
cd D:\MyAIProject\pptdesign\htmlpages
git status
git add -A
git commit -m "说明你的修改"
```

首次关联 GitHub 远程（把地址换成你的仓库）：

```bash
git remote add origin https://github.com/你的用户名/你的仓库名.git
git push -u origin main
```

若远程已有错误历史需覆盖：`git push -u origin main --force`（慎用）。

**说明**：上层仓库 `D:\MyAIProject\pptdesign` 的 `.gitignore` 已加入 `htmlpages/`，避免父仓库再跟踪课件文件。若父仓库里仍记录着旧的 `htmlpages` 路径，请在**关闭占用 Git 的 IDE 操作后**，在 `pptdesign` 根目录执行一次：

```bash
cd D:\MyAIProject\pptdesign
git rm -r --cached htmlpages
git add .gitignore
git commit -m "chore: 课件改由 htmlpages 独立仓库维护"
```
