/**
 * 冒烟测试：ID 引用、静态 HTML 内 id 唯一性、脚本文件存在、JS 语法检查。
 * 运行：node scripts/smoke-test.js
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.join(__dirname, "..");
let failed = false;

function fail(msg) {
  console.error("FAIL:", msg);
  failed = true;
}

function ok(msg) {
  console.log("OK:", msg);
}

// 1) main.js getElementById → index.html
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const main = fs.readFileSync(path.join(root, "main.js"), "utf8");
const ids = new Set();
const re = /getElementById\(\s*["']([^"']+)["']\s*\)/g;
let m;
while ((m = re.exec(main))) ids.add(m[1]);
const missing = [];
for (const id of ids) {
  if (!html.includes('id="' + id + '"') && !html.includes("id='" + id + "'")) missing.push(id);
}
console.log("getElementById refs:", ids.size);
if (missing.length) fail("main.js 引用的 id 在 index.html 中缺失: " + missing.join(", "));
else ok("main.js 与 index.html id 一致");

// 2) index.html 内 id 唯一性（不含 SVG 内 defs 可重复讨论 — 仅统计 id="..."）
const idAttrRe = /\bid\s*=\s*["']([^"']+)["']/gi;
const seen = new Map();
const dup = [];
while ((m = idAttrRe.exec(html))) {
  const id = m[1];
  if (seen.has(id)) {
    if (!dup.includes(id)) dup.push(id);
  } else {
    seen.set(id, 1);
  }
}
if (dup.length) fail("index.html 重复 id: " + dup.join(", "));
else ok("index.html 顶层 id 无重复");

// 3) script src 文件存在
const srcRe = /<script\s+[^>]*src\s*=\s*["']([^"']+)["']/gi;
while ((m = srcRe.exec(html))) {
  const rel = m[1];
  const fp = path.join(root, rel);
  if (!fs.existsSync(fp)) fail("脚本文件不存在: " + rel);
}
if (!failed) ok("script src 文件均存在");

// 4) node --check 所有项目 JS
const jsFiles = ["main.js", "js/lab-models.js", "js/heritage-lab.js", "scripts/verify-ids.js", "scripts/smoke-test.js"];
for (const rel of jsFiles) {
  const fp = path.join(root, rel);
  if (!fs.existsSync(fp)) continue;
  const r = spawnSync(process.execPath, ["--check", fp], { encoding: "utf8" });
  if (r.status !== 0) {
    fail("语法检查 " + rel + ": " + (r.stderr || r.stdout || "exit " + r.status));
  }
}
if (!failed) ok("所有 JS 通过 node --check");

// 5) 底栏与主舞台等关键节点（挑剔用户：缺一则整站不可用）
const required = [
  "btn-home",
  "btn-prev",
  "btn-next",
  "btn-music",
  "bgm",
  "main-stage",
  "lab-canvas",
  "heritage-canvas",
  "error-canvas",
  "extreme-canvas",
  "scroll-paper",
];
for (const id of required) {
  if (!html.includes('id="' + id + '"') && !html.includes("id='" + id + "'")) {
    fail("index.html 缺少关键 id: " + id);
  }
}
if (!failed) ok("关键交互 id 齐全");

process.exit(failed ? 1 : 0);
