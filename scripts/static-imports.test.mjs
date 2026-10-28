import { describe, expect, it } from "vitest";
import { staticImportClosure } from "./static-imports.mjs";

const stat = (path) => ({ path, kind: "import-statement" });
const dyn = (path) => ({ path, kind: "dynamic-import" });

describe("staticImportClosure", () => {
  it("follows static imports transitively, once each, without the entry", () => {
    const outputs = {
      "main.js": { imports: [stat("a.js"), stat("b.js")] },
      "a.js": { imports: [stat("shared.js"), stat("main.js")] },
      "b.js": { imports: [stat("shared.js")] },
      "shared.js": { imports: [] },
    };
    expect(staticImportClosure(outputs, "main.js")).toEqual(["a.js", "b.js", "shared.js"]);
  });

  it("does not follow dynamic imports, nor static imports only they reach", () => {
    const outputs = {
      "main.js": { imports: [stat("a.js"), dyn("media-source.js")] },
      "a.js": { imports: [] },
      "media-source.js": { imports: [stat("lucide.js")] },
      "lucide.js": { imports: [] },
    };
    expect(staticImportClosure(outputs, "main.js")).toEqual(["a.js"]);
  });

  it("skips externals", () => {
    const outputs = {
      "main.js": { imports: [{ path: "https://x/y.js", kind: "import-statement", external: true }] },
    };
    expect(staticImportClosure(outputs, "main.js")).toEqual([]);
  });
});
