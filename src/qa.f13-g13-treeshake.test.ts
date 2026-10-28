// 4C · QA-F13-G13 — the switcher is tree-shaken out of a PRODUCTION build.
//
// Blast radius: a static import ships the switcher, its icon dependency and the
// 12 preset CDN URLs into EVERY PUBLISHED CREATOR BUNDLE — the platform's own
// debug UI riding along inside a creator's shipped experience.
//
// ── WHY THIS FILE EXISTS IN v2-template AND NOT IN toolchain ──────────────────
//
// f3's own tree-shake case (`toolchain/.../qa_f3_share_treeshake.test.ts`) had to
// leave its NEGATIVE half `it.skip`-ped and explicitly UNVERIFIED, because the
// honest seam is a CONSUMING APP'S production build and v2-template was not in
// that worktree. It is in THIS one, so f13 closes that gap rather than inheriting
// the skip: the assertions below read the REAL emitted production assets.
//
// ── THE PREREQUISITE IS ASSERTED, NOT ASSUMED ─────────────────────────────────
//
// A bundle-grep case whose bundle does not exist reports ZERO MARKERS, which is
// indistinguishable from a perfect tree-shake. So the suite FAILS LOUDLY when
// `dist/` is missing rather than passing vacuously — the disarmed-check shape this
// catalog exists to refuse. Run `npm run build` first.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const DIST = join(process.cwd(), "dist");
const ASSETS = join(DIST, "assets");

/** Every emitted .js asset, main bundle and code-split chunks alike. */
function emittedScripts(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) emittedScripts(full, out);
    else if (entry.endsWith(".js")) out.push(full);
  }
  return out;
}

/**
 * Switcher-only markers that must not reach a creator's shipped experience.
 *
 * These are IMPLEMENTATION strings — the switcher's own rendered copy — and NOT
 * the export name `MediaSourceSwitcher`. That distinction is load-bearing: the
 * export name legitimately appears in the entry bundle as the property read off a
 * dynamic import's resolved module (`then(m => m.MediaSourceSwitcher)`), so a
 * case grepping for it fails against a CORRECT code-split build. Only the
 * component's own copy proves its BODY was inlined.
 */
const SWITCHER_MARKERS = ["No camera source", "Open Media Menu", "No image preview"];
/** An icon-dependency marker, reachable ONLY from the switcher. */
const ICON_MARKER = "lucide";
/** The preset asset basenames — the 12 CDN URLs the record names. */
const PRESET_ASSETS = [
  "person_fist_sign.jpg",
  "person_fullbody.jpg",
  "person_fullbody.mp4",
  "person_looking.mp4",
  "person_peace_sign.jpg",
  "person_portrait.jpg",
  "person_shaking_head.mp4",
  "person_side_portrait.jpg",
  "person_thumbUp.mp4",
  "three_people_smiling.jpg",
  "two_people_smiling.jpg",
  "two_people_smiling.mp4",
];

describe("QA-F13-G13 · the switcher is tree-shaken out of a production build", () => {
  it("PREREQUISITE · a production build exists to inspect", () => {
    // Named rather than skipped. A missing dist makes every marker count zero,
    // which reads exactly like a clean bundle.
    expect(
      existsSync(ASSETS),
      `no production build at ${ASSETS}. Run \`npm run build\` before this suite — ` +
        "a bundle-grep case whose bundle does not exist reports zero markers, which " +
        "is indistinguishable from a perfect tree-shake.",
    ).toBe(true);
    expect(emittedScripts(ASSETS).length).toBeGreaterThan(0);
  });

  it("POSITIVE CONTROL · the markers EXIST to be found somewhere in the emitted output", () => {
    // R2. Without this, every "absent from the entry bundle" assertion below would
    // also pass against a build where the switcher was never wired at all — which
    // is a different defect wearing the same green.
    const all = emittedScripts(ASSETS)
      .map((f) => readFileSync(f, "utf8"))
      .join("\n");
    for (const marker of [...SWITCHER_MARKERS, ICON_MARKER]) {
      expect(
        all,
        `"${marker}" appears NOWHERE in the emitted output. Either the switcher is ` +
          "not wired at all, or these markers no longer identify it — and in both " +
          "cases the absence assertions below prove nothing.",
      ).toContain(marker);
    }
  });

  it("the ENTRY bundle carries no switcher, no icon dependency and no preset URL", () => {
    // The entry is what every visitor to a published experience downloads
    // unconditionally. The switcher must not be in it.
    const entries = emittedScripts(ASSETS).filter((f) => /\/main-[^/]+\.js$/.test(f));
    expect(entries.length, "expected exactly one entry bundle").toBeGreaterThan(0);

    for (const entry of entries) {
      const code = readFileSync(entry, "utf8");
      for (const marker of SWITCHER_MARKERS) {
        // A bare dynamic-import SPECIFIER naming the chunk is expected and fine;
        // the switcher's own CODE is what must not be inlined here.
        expect(code, `the entry bundle inlines "${marker}"`).not.toContain(marker);
      }
      expect(code, "the entry bundle inlines the icon dependency").not.toContain(ICON_MARKER);
      for (const asset of PRESET_ASSETS) {
        expect(code, `the entry bundle inlines the preset URL "${asset}"`).not.toContain(asset);
      }
    }
  });

  it("the switcher is reached only through a code-split chunk, never preloaded", () => {
    // The load-bearing property: a visitor who never triggers the framed path
    // never downloads the switcher. A `<link rel="modulepreload">` or a static
    // import would defeat that while leaving the entry-bundle assertion green.
    const html = readFileSync(join(DIST, "index.html"), "utf8");
    expect(
      html,
      "index.html preloads the media-source chunk, so every visitor downloads the " +
        "switcher whether or not any code path needs it",
    ).not.toMatch(/media-source/);

    const chunks = emittedScripts(ASSETS).filter((f) => /media-source/.test(f));
    expect(
      chunks.length,
      "the switcher must live in its OWN code-split chunk; inlined into a shared " +
        "chunk it ships with whatever else that chunk carries",
    ).toBe(1);
  });

  it("the guarded switcher mount is not statically reachable from application source", () => {
    // The SEAM that makes the tree-shake achievable, asserted at the source rather
    // than the bundle: `import(...)` inside an effect behind a constant guard,
    // never a top-level `import ... from`. A static import defeats every bundler.
    const control = readFileSync(join(process.cwd(), "src/MediaSourceControl.tsx"), "utf8");
    expect(
      control,
      "MediaSourceControl must not statically import the SDK's media-source module",
    ).not.toMatch(/^\s*import\s[^\n]*@vincentt-xr\/sdk\/debug-ui\/media-source/m);
    expect(control).toMatch(/import\(\s*["']@vincentt-xr\/sdk\/debug-ui\/media-source["']\s*\)/);
  });

  it("REPORTED · the framed-preset path pulls the same chunk in production, switcher and all", () => {
    // A FINDING, recorded as an assertion so it cannot be lost.
    //
    // `enabled` defaults to `import.meta.env.DEV`, so the SWITCHER's own mount is
    // dead in a published bundle. But the framed-preset startup path imports the
    // SAME module for `sdkVideoMediaSources`, and that path is live in production.
    // So a published bundle that is ever framed fetches a chunk carrying the
    // switcher component, the icon dependency and all 12 preset URLs.
    //
    // This is NOT the static-import defect G13 primarily guards — the chunk is
    // code-split and is never downloaded by an ordinary unframed visitor, which is
    // the property that actually protects a creator's shipped experience. It is
    // recorded because the record's wording ("a production build contains NO
    // MediaSourceSwitcher, no icon dependency and none of the 12 preset CDN URLs")
    // is stricter than what the design can deliver: a framed app NEEDS a preset,
    // and the preset list ships beside the switcher in one SDK entry point.
    //
    // Splitting them is an SDK change, and this feature budgets the SDK at ZERO
    // change — so this asserts the reachable truth rather than failing a correct
    // implementation against an unachievable wording. See the QA report's
    // FINDING-3.
    const chunk = emittedScripts(ASSETS).find((f) => /media-source/.test(f));
    expect(chunk, "the media-source chunk must exist").toBeDefined();
    const code = readFileSync(chunk!, "utf8");
    expect(code).toContain("Open Media Menu");
    expect(code).toContain("sdkVideoMediaSources");

    // The bound that keeps this acceptable: the chunk stays SMALL and SEPARATE.
    // If it ever merges into the entry bundle the case above fails; if it grows
    // past a debug-UI's worth of bytes, that is a signal worth reading.
    const kb = statSync(chunk!).size / 1024;
    expect(kb, `the media-source chunk is ${kb.toFixed(1)}kb`).toBeLessThan(64);
  });
});
