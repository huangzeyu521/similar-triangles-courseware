#Requires -Version 5.1
<#
.SYNOPSIS
  使用 Skills CLI (npx skills) 安装与网页设计 / 动画 / 交互 / 无障碍相关的推荐 Agent Skills。
.DESCRIPTION
  依赖: Node.js、npm/npx、可稳定访问 GitHub 的网络。
  检索来源: https://skills.sh/ 与 `npx skills find <关键词>`
  全局安装到用户级 skills 目录（与 `npx skills add ... -g` 行为一致）。
.NOTES
  若克隆失败，请检查代理/VPN、Git 配置，或稍后重试。
#>
$ErrorActionPreference = "Stop"

$packages = @(
  # UI/UX（检索量较高）
  "kimny1143/claude-code-template@ui-ux-pro-max",
  # 网页设计
  "erichowens/some_claude_skills@web-design-expert",
  "pascalorg/skills@web-design",
  # 网页动画与动效原则
  "connorads/dotfiles@web-animation-design",
  "dylantarre/animation-principles@education-learning",
  # 交互设计
  "petekp/agent-skills@interaction-design",
  "dereknex/skills@web-interface-guidelines",
  # 无障碍 / WCAG
  "oakoss/agent-skills@accessibility",
  "hack23/homepage@accessibility-wcag"
)

Write-Host "即将安装 $($packages.Count) 个 skills（全局 -g，非交互 -y）..." -ForegroundColor Cyan

foreach ($p in $packages) {
  Write-Host "`n>>> npx skills add $p -g -y" -ForegroundColor Yellow
  npx --yes skills add $p -g -y
  if ($LASTEXITCODE -ne 0) {
    Write-Warning "安装失败: $p （可单独重试）"
  }
}

Write-Host "`n完成。可用 `npx skills check` / `npx skills update` 维护。" -ForegroundColor Green
