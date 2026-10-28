/**
 * Server-side production build. Bundles with esbuild and emits a hashed
 * index.html. Mirrors the in-browser preview (same esbuild.config).
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import esbuild from "esbuild";
import { buildOptions } from "../esbuild.config.mjs";
import { applyAppMetadata, readAppConfig } from "./app-metadata.mjs";
import { staticImportClosure } from "./static-imports.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const distDir = path.join(root, "dist");

await fs.rm(distDir, { recursive: true, force: true });
const options = buildOptions({ mode: "production", root });

// A configured input source survives into the bundle on purpose (a creator may
// ship client footage), but a clip left over from development is the more
// common way to get here. Say so, loudly enough to read, without refusing.
const configuredSource = options.define["import.meta.env.VITE_INPUT_SOURCE"];
// An empty value is "no source" to the app (framed.ts), so it is no warning.
if (configuredSource && configuredSource !== JSON.stringify("")) {
  const url = options.define["import.meta.env.VITE_INPUT_URL"] ?? "(unset)";
  console.warn(
    `build: VITE_INPUT_SOURCE=${configuredSource} VITE_INPUT_URL=${url} is baked into this ` +
      `production bundle — it will start on that source, not the webcam. ` +
      `Keep dev-only clips in .env.development, which a build never reads.`,
  );
}

if (options.define["import.meta.env.VITE_FRAMED_SOURCE"] === JSON.stringify("webcam")) {
  console.warn(
    "build: VITE_FRAMED_SOURCE=webcam is baked in — framed embeds (the console's preview " +
      "frame included) will ask for the camera instead of playing a sample clip.",
  );
}

const result = await esbuild.build(options);

// Mirror /public into dist so root-relative refs (favicon, og:image, fonts)
// are served by the published bundle.
const publicDir = path.join(root, "public");
try {
  await fs.cp(publicDir, distDir, { recursive: true });
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}

const { outputs } = result.metafile;
const urlOf = (out) =>
  "/" + path.relative(distDir, path.resolve(out)).split(path.sep).join("/");

let entry = "";
let css = "";
for (const [out, meta] of Object.entries(outputs)) {
  if (meta.entryPoint?.endsWith("main.tsx") && out.endsWith(".js")) entry = out;
  if (out.endsWith(".css")) css = urlOf(out);
}
const js = urlOf(entry);

// The entry's static imports are otherwise discovered only after the entry has
// downloaded and parsed. Dynamic imports are left out on purpose: they are
// code-split so a visitor who never takes that path never downloads them.
const head = [
  ...(css ? [`<link rel="stylesheet" href="${css}" />`] : []),
  ...staticImportClosure(outputs, entry).map(
    (out) => `<link rel="modulepreload" href="${urlOf(out)}" />`,
  ),
];

// The creator's title, description and share image come from app.config.json
// (their file), not from index.html (ours). See scripts/app-metadata.mjs.
let html = applyAppMetadata(
  await fs.readFile(path.join(root, "index.html"), "utf8"),
  readAppConfig(root),
);
html = html.replace(
  /<link[^>]+href="\/src\/index\.css"[^>]*>/,
  head.join("\n    "),
);
html = html.replace(
  /<script[^>]+src="\/src\/main\.tsx"[^>]*><\/script>/,
  `<script type="module" src="${js}"></script>`,
);
await fs.writeFile(path.join(distDir, "index.html"), html);

console.log("build complete:", js);
