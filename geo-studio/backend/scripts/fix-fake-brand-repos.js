const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..", "src");

const fakeClass = `class FakeBrandRepository extends BrandRepository {
  private readonly rows: Brand[] = [];
  private seq = 0;

  async create(input: BrandInput): Promise<Brand> {
    const brand: Brand = { id: \`brand_\${++this.seq}\`, ...input };
    this.rows.push(brand);
    return brand;
  }

  async findById(id: string): Promise<Brand | null> {
    return this.rows.find((b) => b.id === id) ?? null;
  }

  async list(): Promise<Brand[]> {
    return [...this.rows];
  }

  async update(id: string, input: BrandInput): Promise<Brand | null> {
    const index = this.rows.findIndex((b) => b.id === id);
    if (index < 0) return null;
    const next = { id, ...input };
    this.rows[index] = next;
    return next;
  }

  async delete(id: string): Promise<boolean> {
    const index = this.rows.findIndex((b) => b.id === id);
    if (index < 0) return false;
    this.rows.splice(index, 1);
    return true;
  }
}
`;

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (name.endsWith(".ts")) fixFile(p);
  }
}

function fixFile(file) {
  const c = fs.readFileSync(file, "utf8");
  if (!c.includes("class FakeBrandRepository")) return;
  const start = c.indexOf("class FakeBrandRepository");
  const describeIdx = c.indexOf("describe(", start);
  if (describeIdx < 0) return;
  const head = c.slice(0, start);
  const tail = c.slice(describeIdx);
  fs.writeFileSync(file, `${head}${fakeClass}\n\n${tail}`);
  console.log("fixed", path.relative(root, file));
}

walk(root);
