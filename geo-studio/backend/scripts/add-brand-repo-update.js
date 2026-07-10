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

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (name.endsWith(".ts")) fixFile(p);
  }
}

function fixFile(file) {
  let c = fs.readFileSync(file, "utf8");
  if (!c.includes("class FakeBrandRepository")) return;
  if (c.includes("async update(id: string, input: BrandInput)")) return;
  const next = c.replace(
    /(async list\(\): Promise<Brand\[\]> \{\s*return \[\.\.\.this\.rows\];\s*\})/,
    `$1${updateMethod}`,
  );
  if (next === c) return;
  fs.writeFileSync(file, next);
  console.log("updated", path.relative(root, file));
}

walk(root);
