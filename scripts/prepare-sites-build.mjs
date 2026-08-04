import { readFile, writeFile } from "node:fs/promises";

const wranglerPath = new URL("../dist/server/wrangler.json", import.meta.url);
const config = JSON.parse(await readFile(wranglerPath, "utf8"));

// Cloudflare made nodejs_compat the default on 2026-08-04 and now rejects an
// explicit duplicate flag. Keep it in the Vite input for vinext compilation,
// then remove only the redundant deployment declaration from the built output.
if (Array.isArray(config.compatibility_flags)) {
  config.compatibility_flags = config.compatibility_flags.filter(
    (flag) => flag !== "nodejs_compat",
  );
  if (config.compatibility_flags.length === 0) delete config.compatibility_flags;
}

await writeFile(wranglerPath, `${JSON.stringify(config)}\n`);
