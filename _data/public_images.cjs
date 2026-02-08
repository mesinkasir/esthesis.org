const { readdirSync, statSync } = require("node:fs");
const path = require("node:path");

const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".tif", ".tiff", ".bmp"]);

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

module.exports = () => {
  const root = path.join(__dirname, "..", "public", "images");
  let files = [];
  try {
    files = walk(root);
  } catch {
    files = [];
  }

  return files
    .filter((f) => IMAGE_EXTS.has(path.extname(f).toLowerCase()))
    .map((f) => "/images/" + path.relative(root, f).split(path.sep).join("/"))
    .sort();
};

