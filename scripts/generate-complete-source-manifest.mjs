import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const projectRoot = process.cwd();
const sourceRoot = path.join(projectRoot, "upstream", "nirva-ai-complete");
const outputPath = path.join(projectRoot, "docs", "complete-source-manifest.json");

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  }));
  return nested.flat();
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function categoryFor(filePath) {
  if (filePath.startsWith("apps/nirva-studio-os/")) return "Studio OS";
  if (filePath.startsWith("client/")) return "Client App";
  if (filePath.startsWith("server/")) return "Server & Media Engine";
  if (filePath.startsWith("sdk/")) return "SDKs";
  if (filePath.startsWith("mobile/")) return "Mobile";
  if (filePath.startsWith("shared/")) return "Shared Domain";
  if (/^(deploy|monitoring|scripts|\.github)\//.test(filePath)) return "Infrastructure";
  if (filePath.startsWith("docs/") || filePath.endsWith(".md")) return "Documentation";
  return "Project Foundation";
}

const absoluteFiles = (await walk(sourceRoot)).sort();
const files = await Promise.all(absoluteFiles.map(async (absolute) => {
  const relativePath = path.relative(sourceRoot, absolute).split(path.sep).join("/");
  const content = await readFile(absolute);
  return {
    path: relativePath,
    category: categoryFor(relativePath),
    bytes: content.byteLength,
    sha256: sha256(content),
  };
}));

const categories = Object.entries(files.reduce((summary, file) => {
  const current = summary[file.category] ?? { files: 0, bytes: 0 };
  current.files += 1;
  current.bytes += file.bytes;
  summary[file.category] = current;
  return summary;
}, {})).map(([name, totals]) => ({ name, ...totals }));

const imagePattern = /\.(png|jpe?g|webp|gif|svg|ico)$/i;
const canonicalIndex = files.map((file) => `${file.sha256}  ${file.path}`).join("\n") + "\n";
const manifest = {
  schemaVersion: 1,
  generatedAt: "2026-08-19",
  source: {
    repository: "Nirvacore/nirva-AI",
    branch: "claude/nirva-media-nle-vision-h0v1z0",
    commit: "12b703434d724b1aff04675602d52356ee9c2198",
    preservedAt: "upstream/nirva-ai-complete",
  },
  integrity: {
    algorithm: "sha256",
    rootChecksum: sha256(Buffer.from(canonicalIndex)),
  },
  totals: {
    files: files.length,
    bytes: files.reduce((total, file) => total + file.bytes, 0),
    images: files.filter((file) => imagePattern.test(file.path)).length,
  },
  categories: categories.sort((a, b) => b.files - a.files),
  images: files.filter((file) => imagePattern.test(file.path)),
  files,
};

await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Wrote ${files.length} source records to ${path.relative(projectRoot, outputPath)}`);
