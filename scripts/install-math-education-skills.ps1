#Requires -Version 5.1
<#
.SYNOPSIS
  通过 `npx skills find` 检索到的几何/数学教学相关 Agent Skills 批量安装。
.DESCRIPTION
  检索关键词示例：geometry math education, mathematics teaching, interactive learning, visualization stem

  已检索到的候选包（skills.sh）：
  - jamesrochabrun/skills@math-teacher （安装量高；大仓库可能超时，可多试几次）
  - wangyendt/wayne-skills@tutor-math-geometry （几何辅导向）
  - xingyun-new/skills-xiaosimen@math-teacher
  - rohitg00/manim-video-generator@math-visualizer （Manim 数学可视化）
  - xiaotianfotos/skills@tutor
  - szeyu/vibe-study-skills@math-tutor
  - vercel-labs/skill-geist-learning-labs@geist-learning-lab （学习场景）
  - pauljbernard/content@curriculum-develop-multimedia （课程多媒体）
  - simota/agent-skills@canvas （Canvas 图形）
  - aiagentwithdhruv/skills@excalidraw-visuals （图解）

  使用：在可稳定访问 GitHub 的网络下执行；失败项单独重试：
    npx skills add <owner/repo@skill> -g -y
.NOTES
  Skills CLI: https://skills.sh/
#>
$ErrorActionPreference = "Stop"

$packages = @(
  "jamesrochabrun/skills@math-teacher",
  "wangyendt/wayne-skills@tutor-math-geometry",
  "xingyun-new/skills-xiaosimen@math-teacher",
  "rohitg00/manim-video-generator@math-visualizer",
  "xiaotianfotos/skills@tutor",
  "szeyu/vibe-study-skills@math-tutor",
  "vercel-labs/skill-geist-learning-labs@geist-learning-lab",
  "pauljbernard/content@curriculum-develop-multimedia",
  "simota/agent-skills@canvas",
  "aiagentwithdhruv/skills@excalidraw-visuals"
)

Write-Host "即将安装 $($packages.Count) 个数学/几何教学相关 skills（-g -y）..." -ForegroundColor Cyan

foreach ($p in $packages) {
  Write-Host "`n>>> npx skills add $p -g -y" -ForegroundColor Yellow
  npx --yes skills add $p -g -y
  if ($LASTEXITCODE -ne 0) {
    Write-Warning "安装失败: $p （网络超时时可稍后单独执行同一命令）"
  }
}

Write-Host "`n完成。维护: npx skills check / npx skills update" -ForegroundColor Green
