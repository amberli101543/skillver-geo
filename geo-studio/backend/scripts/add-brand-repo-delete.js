const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..", "src");

const updateMethod = `
  async update(id: string, input: BrandInput): Promise<Brand | null> {
    const index = this.rows.findIndex((b) => b.id === id);
    if (index < 0) return null;
    const next = { id, ...input };
    this.rows[index] = next;
    return next;
  }`;

const deleteMethod = `
  async delete(id: string): Promise<boolean> {
    const index = this.rows.findIndex((b) => b.id === id);
    if (index < 0) return false;
    this.rows.splice(index, 1);
    return true;
  }`;

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (name.endsWith(".ts")) patchFile(p);
  }
}

function patchFile(file) {
  let content = fs.readFileSync(file, "utf8");
  if (!content.includes("class FakeBrandRepository")) return;

  const marker = "class FakeBrandRepository";
  const start = content.indexOf(marker);
  const nextClass = content.indexOf("\nclass ", start + marker.length);
  const nextDescribe = content.indexOf("\ndescribe(", start + marker.length);
  const end = [nextClass, nextDescribe].filter((i) => i >= 0).sort((a, b) => a - b)[0];
  if (end < 0) return;

  let block = content.slice(start, end);
  let changed = false;

  if (!block.includes("async update(")) {
    block = block.replace(/(\n\})\s*$/, `${updateMethod}\n}`);
    changed = true;
  }
  if (!block.includes("async delete(")) {
    block = block.replace(/(\n\})\s*$/, `${deleteMethod}\n}`);
    changed = true;
  }

  if (!changed) return;
  content = content.slice(0, start) + block + content.slice(end);
  fs.writeFileSync(file, content);
  console.log("patched", path.relative(root, file));
}

walk(root);
