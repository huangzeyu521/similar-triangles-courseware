/**
 * 一次性校验：main.js 中 getElementById 引用的 id 均在 index.html 中存在
 */
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
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
if (missing.length) {
  console.error("MISSING ids:", missing);
  process.exit(1);
}
console.log("OK: all ids found.");
