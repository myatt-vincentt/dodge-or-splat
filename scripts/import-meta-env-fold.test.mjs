// @vitest-environment node
// #112 — a dev-only branch guarded by `import.meta.env.DEV` is DEAD CODE in a
// production build, and ALIVE in a dev build.
//
// esbuild constant-folds `import.meta.env.DEV` only when that exact member
// expression is defined as a literal. The config used to define the object
// alone, which left every `if (import.meta.env.DEV)` as a runtime property read
// — and a clip loader, its 5 MB video and a debug overlay shipped in a published
// bundle that way. This builds a probe through the config's REAL define map, so
// the assertion is on what the production build actually does, not on the
// shape of the map.
//
// The positive control (dev keeps the branch) is what stops a probe that
// silently stopped compiling the guard from passing as "folded".

import { describe, expect, it } from "vitest";
import esbuild from "esbuild";
import {
  buildOptions,
  importMetaEnvDefine,
  parseEnvFile,
  viteEnvVars,
} from "../esbuild.config.mjs";

const DEV_MARKER = "DEV_ONLY_BRANCH_e7c1";
const PROD_MARKER = "PROD_ONLY_BRANCH_e7c1";
const DEV_MODULE_MARKER = "DEV_ONLY_MODULE_e7c1";

// Mirrors how application source guards: a block, a ternary, a lazy import.
const PROBE = `
  if (import.meta.env.DEV) console.log("${DEV_MARKER}");
  if (import.meta.env.PROD) console.log("${PROD_MARKER}");
  export const mode = import.meta.env.MODE;
  export const base = import.meta.env.BASE_URL;
  export const env = import.meta.env;
  export const loader = import.meta.env.DEV ? () => import("virtual:dev-only") : null;
`;

// A virtual module standing in for a dev-only file (a clip loader, an overlay).
const devOnlyModule = {
  name: "virtual-dev-only",
  setup(build) {
    build.onResolve({ filter: /^virtual:dev-only$/ }, (args) => ({
      path: args.path,
      namespace: "virtual",
    }));
    build.onLoad({ filter: /.*/, namespace: "virtual" }, () => ({
      contents: `export const marker = "${DEV_MODULE_MARKER}";`,
      loader: "js",
    }));
  },
};

async function bundle(mode) {
  const { define } = buildOptions({ mode });
  const result = await esbuild.build({
    stdin: { contents: PROBE, loader: "ts", resolveDir: process.cwd() },
    bundle: true,
    write: false,
    format: "esm",
    // Syntax minification is what turns a folded `if (false)` into nothing, and
    // the production config minifies. Identifiers and whitespace stay readable
    // so a failure prints something a human can read.
    minifySyntax: true,
    minifyWhitespace: false,
    minifyIdentifiers: false,
    treeShaking: true,
    define,
    plugins: [devOnlyModule],
    logLevel: "silent",
  });
  return result.outputFiles.map((f) => f.text).join("\n");
}

describe("#113 · VITE_* variables reach import.meta.env", () => {
  it("parses an env file: comments, quotes, export, trailing comments", () => {
    expect(
      parseEnvFile(
        [
          "# a comment",
          "",
          "VITE_INPUT_SOURCE=video",
          'VITE_INPUT_URL="/clips/hand.mp4"',
          "export VITE_X='single'",
          "VITE_Y=raw value # trailing",
          "NOT_VITE=hidden",
          "broken line without equals",
        ].join("\n"),
      ),
    ).toEqual({
      VITE_INPUT_SOURCE: "video",
      VITE_INPUT_URL: "/clips/hand.mp4",
      VITE_X: "single",
      VITE_Y: "raw value",
      NOT_VITE: "hidden",
    });
  });

  it("merges files in Vite's order, process env last, VITE_ keys only", () => {
    const files = {
      ".env": "VITE_A=env\nVITE_B=env\nVITE_C=env\nSECRET=no",
      ".env.local": "VITE_B=local",
      ".env.development": "VITE_C=dev\nVITE_INPUT_SOURCE=video",
      ".env.development.local": "VITE_C=dev-local",
    };
    const readFile = (f) => files[f];
    expect(viteEnvVars({ mode: "development", processEnv: { VITE_A: "proc", PATH: "/x" }, readFile }))
      .toEqual({ VITE_A: "proc", VITE_B: "local", VITE_C: "dev-local", VITE_INPUT_SOURCE: "video" });
    // A production build never reads the development files.
    expect(viteEnvVars({ mode: "production", processEnv: {}, readFile })).toEqual({
      VITE_A: "env",
      VITE_B: "local",
      VITE_C: "env",
    });
  });

  it("ignores a VITE_ key that is not an identifier instead of failing the build", () => {
    const warn = console.warn;
    const warned = [];
    console.warn = (m) => warned.push(m);
    try {
      expect(viteEnvVars({ mode: "development", processEnv: { "VITE_FOO-BAR": "1", VITE_OK: "2" }, readFile: () => undefined }))
        .toEqual({ VITE_OK: "2" });
    } finally {
      console.warn = warn;
    }
    expect(warned[0]).toContain("VITE_FOO-BAR");
  });

  it("defines each VITE_ key as a literal and inside the object", () => {
    const define = importMetaEnvDefine(false, { VITE_INPUT_SOURCE: "video", VITE_INPUT_URL: "/c.mp4" });
    expect(define["import.meta.env.VITE_INPUT_SOURCE"]).toBe('"video"');
    expect(define["import.meta.env.VITE_INPUT_URL"]).toBe('"/c.mp4"');
    expect(JSON.parse(define["import.meta.env"])).toMatchObject({
      VITE_INPUT_SOURCE: "video",
      VITE_INPUT_URL: "/c.mp4",
      DEV: true,
    });
    // The built-ins cannot be overridden by a VITE_ file.
    expect(importMetaEnvDefine(true, { DEV: true, MODE: "x" })["import.meta.env.DEV"]).toBe("false");
  });

  it("the documented one-liner drives the build's define map", () => {
    const saved = { ...process.env };
    process.env.VITE_INPUT_SOURCE = "video";
    process.env.VITE_INPUT_URL = "/clip.mp4";
    try {
      const { define } = buildOptions({ mode: "development" });
      expect(define["import.meta.env.VITE_INPUT_SOURCE"]).toBe('"video"');
      expect(define["import.meta.env.VITE_INPUT_URL"]).toBe('"/clip.mp4"');
    } finally {
      delete process.env.VITE_INPUT_SOURCE;
      delete process.env.VITE_INPUT_URL;
      Object.assign(process.env, saved);
    }
  });
});

describe("#112 · import.meta.env keys fold in a production build", () => {
  it("defines the object AND each key, so both read styles resolve", () => {
    const define = importMetaEnvDefine(true);
    expect(define["import.meta.env"]).toBe(
      JSON.stringify({ MODE: "production", PROD: true, DEV: false, BASE_URL: "/" }),
    );
    expect(define["import.meta.env.DEV"]).toBe("false");
    expect(define["import.meta.env.PROD"]).toBe("true");
    expect(define["import.meta.env.MODE"]).toBe('"production"');
    expect(define["import.meta.env.BASE_URL"]).toBe('"/"');
    // The whole-object define is reachable through buildOptions unchanged.
    expect(buildOptions({ mode: "production" }).define["import.meta.env"]).toBe(
      define["import.meta.env"],
    );
  });

  it("PRODUCTION · the DEV-guarded branch and the dev-only module are gone", async () => {
    const out = await bundle("production");
    expect(out, "the `if (import.meta.env.DEV)` block was kept").not.toContain(DEV_MARKER);
    expect(out, "the lazy dev-only import was kept").not.toContain(DEV_MODULE_MARKER);
    expect(out, "the PROD branch must survive").toContain(PROD_MARKER);
    // No runtime member read of the env is left behind for a guard to miss.
    // (esbuild labels the object define with a `<define:import.meta.env>`
    // comment, which is not a read.)
    expect(out).not.toMatch(/import\.meta\.env\.[A-Z_]+/);
    expect(out).toContain('"production"');
  });

  it("POSITIVE CONTROL · a development build keeps the DEV branch", async () => {
    const out = await bundle("development");
    expect(out).toContain(DEV_MARKER);
    expect(out).toContain(DEV_MODULE_MARKER);
    expect(out).not.toContain(PROD_MARKER);
    expect(out).toContain('"development"');
  });
});
