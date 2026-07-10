#!/usr/bin/env node
/**
 * Enforces docs/ARCHITECTURE.md import boundaries.
 * Exit 1 on violations.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src");

/** Only ai/llm-client.ts may import the client module itself. */
const LLM_CLIENT_ALLOWED = new Set(["ai/llm-client.ts"]);

const FORBIDDEN_PATTERNS = [
  {
    id: "llm-client",
    re: /from\s+["'][^"']*llm-client["']/,
    allowed: LLM_CLIENT_ALLOWED,
    message: "LLM calls must go through ai/ facades (see docs/ARCHITECTURE.md)",
  },
  {
    id: "prompt-registry-outside-ai",
    re: /from\s+["'][^"']*prompt-registry["']/,
    allowed: null,
    message: "Prompt registry is ai/ layer only",
  },
];

function isUnderAi(rel) {
  return rel.startsWith("ai/");
}

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === "node_modules" || name === "dist") continue;
      walk(p, files);
    } else if (/\.(ts|tsx)$/.test(name) && !/\.e2e\.test\.ts$/.test(name)) {
      files.push(p);
    }
  }
  return files;
}

const errors = [];

for (const file of walk(SRC)) {
  const rel = relative(join(SRC), file).replace(/\\/g, "/");
  const text = readFileSync(file, "utf8");

  for (const rule of FORBIDDEN_PATTERNS) {
    if (!rule.re.test(text)) continue;
    if (rule.id === "prompt-registry-outside-ai") {
      if (!isUnderAi(rel)) {
        errors.push(`${rel}: ${rule.message} (${rule.id})`);
      }
      continue;
    }
    if (rule.id === "llm-client" && isUnderAi(rel)) {
      continue;
    }
    if (rule.allowed.has(rel)) continue;
    errors.push(`${rel}: ${rule.message} (${rule.id})`);
  }

  if (/\/[^/]+\.controller\.ts$/.test(rel) && /requestChatJson|PrismaService/.test(text)) {
    errors.push(`${rel}: controller must not call LLM or Prisma directly`);
  }
}

if (errors.length) {
  console.error("Architecture boundary check FAILED:\n");
  for (const e of errors) console.error(`  - ${e}`);
  console.error("\nSee docs/ARCHITECTURE.md");
  process.exit(1);
}

console.log("Architecture boundary check OK");
