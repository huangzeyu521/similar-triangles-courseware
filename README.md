# 《利用相似三角形测高》交互课件（HTML5）

## 目录结构

| 路径 | 说明 |
|------|------|
| `index.html` | 页面骨架：国风卷轴主导航（七关闯关路线图 + 墨径 SVG）、各模块视图、底栏 |
| `style.css` | 全局样式：国风色板、卷轴展开/收拢、竹简导航、液态玻璃反馈等 |
| `main.js` | 路由、情境任务卡、卷轴收拢后跳转、速算/测验/极限挑战逻辑 |
| `js/lab-models.js` | 方案比拼（`MeasureLab`）、鉴误阁 / 极限风力（`ErrorAmpLab`）— Canvas 均随容器宽度铺满 |
| `js/heritage-lab.js` | 古建测绘局 Canvas（`HeritageLab`，同左铺满逻辑） |
| `scripts/smoke-test.js` | 冒烟测试（id、语法、关键节点） |
| `scripts/verify-ids.js` | 校验 `main.js` 的 `getElementById` 与 `index.html` 一致 |
| `package.json` | `npm test` → 连续执行上述两脚本 |

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
