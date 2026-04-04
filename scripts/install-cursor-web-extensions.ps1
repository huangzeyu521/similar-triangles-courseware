#Requires -Version 5.1
<#
.SYNOPSIS
  为 Cursor 安装网页 / H5 / 静态前端开发常用扩展（等价于 VS Code Marketplace）。
.DESCRIPTION
  使用 Cursor 自带的 `cursor --install-extension`。
  若本机 `cursor` 不在 PATH，请修改 $CursorBin 为实际 cursor.exe / cursor.cmd 路径。
#>
$ErrorActionPreference = "Stop"

$CursorBin = "cursor"
if (-not (Get-Command $CursorBin -ErrorAction SilentlyContinue)) {
  $candidates = @(
    "D:\Program Files\cursor\resources\app\bin\cursor.cmd",
    "$env:LOCALAPPDATA\Programs\cursor\resources\app\bin\cursor.cmd",
    "${env:ProgramFiles}\Cursor\resources\app\bin\cursor.cmd"
  )
  foreach ($c in $candidates) {
    if (Test-Path -LiteralPath $c) {
      $CursorBin = $c
      break
    }
  }
}

$extensions = @(
  "ritwickdey.LiveServer",              # 本地静态页预览
  "esbenp.prettier-vscode",             # 格式化
  "formulahendry.auto-rename-tag",      # HTML 标签同步改名
  "ecmel.vscode-html-css",              # HTML/CSS 智能提示
  "zignd.html-css-class-completion",     # class 补全
  "dbaeumer.vscode-eslint",              # JS 质量
  "james-yu.latex-workshop"              # 数学公式 / LaTeX 排版（教案与讲义）
)

Write-Host "使用 Cursor: $CursorBin" -ForegroundColor Cyan
foreach ($id in $extensions) {
  Write-Host "`n>>> 安装扩展: $id" -ForegroundColor Yellow
  & $CursorBin --install-extension $id --force
}

Write-Host "`n已执行安装命令。可用同一 CLI 查看: cursor --list-extensions" -ForegroundColor Green
