/**
 * The beacon endpoint is chosen at THIS build and nowhere else.
 *
 * `@vincentt-xr/analytics` publishes a pre-built `dist`, so the endpoint cannot be
 * decided inside that package — it would freeze when the package is published
 * rather than when a creator builds. It is substituted here instead, from a closed
 * list, which is what keeps a creator's own repo config from naming a host that
 * their viewers' beacons would then be sent to forever.
 */
import { describe, expect, it } from "vitest";

import { buildOptions } from "../esbuild.config.mjs";

const KEY = "globalThis.__VCT_BEACON__";

/** buildOptions reads process.env at CALL time, so each case sets and restores. */
function withEnv(value, fn) {
  const had = Object.prototype.hasOwnProperty.call(process.env, "VINCENTT_ENV");
  const prev = process.env.VINCENTT_ENV;
  if (value === undefined) delete process.env.VINCENTT_ENV;
  else process.env.VINCENTT_ENV = value;
  try {
    return fn();
  } finally {
    if (had) process.env.VINCENTT_ENV = prev;
    else delete process.env.VINCENTT_ENV;
  }
}

describe("the beacon endpoint define", () => {
  it("defines nothing when VINCENTT_ENV is unset", () => {
    // The ordinary creator build. Emitting no define means the bundle keeps the
    // package's own production literal and is byte-identical to the one that
    // shipped before this seam existed.
    const opts = withEnv(undefined, () => buildOptions({ mode: "production" }));
    expect(opts.define).not.toHaveProperty(KEY);
  });

  it("points a staging build at the staging api", () => {
    const opts = withEnv("staging", () => buildOptions({ mode: "production" }));
    expect(opts.define[KEY]).toBe(
      JSON.stringify("https://api.staging.vincentt.studio/v/beacon"),
    );
  });

  it("points a dev build at the dev api", () => {
    const opts = withEnv("dev", () => buildOptions({ mode: "production" }));
    expect(opts.define[KEY]).toBe(
      JSON.stringify("https://api.dev.vincentt.studio/v/beacon"),
    );
  });

  it("names production explicitly and gets the same host as unset", () => {
    const opts = withEnv("production", () => buildOptions({ mode: "production" }));
    expect(opts.define[KEY]).toBe(
      JSON.stringify("https://api.vincentt.studio/v/beacon"),
    );
  });

  it("FAILS THE BUILD on an unknown environment rather than falling back", () => {
    // The whole point. A silent fallback to production means a typo'd
    // `VINCENTT_ENV=stagng` builds a bundle that reports staging's viewers to
    // production, which drops them on slug lookup — the exact silent failure
    // this change exists to remove, reintroduced one letter at a time.
    expect(() => withEnv("stagng", () => buildOptions({ mode: "production" }))).toThrow(
      /not a known environment/,
    );
  });

  it("refuses an arbitrary host, which is the constraint doing its work", () => {
    expect(() =>
      withEnv("https://evil.example.com/v/beacon", () =>
        buildOptions({ mode: "production" }),
      ),
    ).toThrow(/not a known environment/);
  });

  it("emits only known hosts, whatever the environment", () => {
    // A whitelist over the values rather than the keys: this catches a future
    // edit that adds a fourth entry pointing somewhere unintended.
    const allowed = [
      JSON.stringify("https://api.vincentt.studio/v/beacon"),
      JSON.stringify("https://api.staging.vincentt.studio/v/beacon"),
      JSON.stringify("https://api.dev.vincentt.studio/v/beacon"),
    ];
    for (const env of ["production", "staging", "dev"]) {
      const opts = withEnv(env, () => buildOptions({ mode: "production" }));
      expect(allowed).toContain(opts.define[KEY]);
    }
  });
});
