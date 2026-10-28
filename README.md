# Dodge or Splat

Funny things are thrown at your face, and they never stop: mostly cream pies, plus suction darts,
snowballs and fish. They come from the phone's side, from past the screen edges, faster and
faster. Lean or duck and they whoosh past; stay put and they hit hard and stay a while. A pie
leaves a thick coat of whipped cream that slides down and drips off your chin, a snowball leaves
snow that melts, a dart wobbles on your forehead, a fish flops on your cheek. Tap the screen to
throw a pie yourself. No lives, no score, no end.

- Throws aim where your face is when they're thrown (`src/splat/director.ts`, `flight.ts`) and
  draw over everything (`Projectiles.tsx`); near misses get a whoosh (`Whoosh.tsx`).
- Cream and snow sit on the live face mesh, so they move with your expressions
  (`FaceMess.tsx`); the dart, snow pile, fish and bonk bump are vincentt.studio head accessories
  on the SDK's canonical head fit with the head occluder (`Stuck.tsx`).
- The only hint is a small see-through ghost head that leans out of a pie's way (`Hint.tsx`).
- Models: `public/models/vincentt-funny-*.glb` (`src/splat/props.ts`). Credits in `CREDITS.md`.
- Dev preview without a camera: the media switcher starts on the SDK's sample video; 1–5 throw
  a sure hit, 0 clears the face, P pauses the throws. How it works: `PLAN.md`.

---

# v2-template

The Vincentt starter app: a real React + R3F + Vincentt XR SDK (`@vincentt-xr/sdk`)
WebXR app, bundled by esbuild.

## Shape

```
src/
  main.tsx            mount — never edited
  App.tsx             protected shell: XRProvider + AspectRatioContainer +
                      XRScene + media-source binding, camera, lighting,
                      VideoBackground, PreviewAnchors — never edited
  Scene.tsx           the agent's surface: add SDK components and R3F
                      primitives here
  PreviewAnchors.tsx  editor-preview integration — never edited
```

See `AGENTS.md` and `GROUNDING.md` for the API reference and how to author scenes.

## Develop

```
pnpm install
pnpm dev          # esbuild dev server on localhost:5173 (output in .dev/)
pnpm preview      # on-device preview over a secure tunnel (needs `vincentt login`)
pnpm typecheck
pnpm build        # production bundle to dist/
```

## Release

`vincentt init` scaffolds from the **`latest` tag**, not from `main`. Merging to `main` does
not ship a template to creators — cutting a release does.

```
git tag 1.1.0 <sha>      # bare semver, no `v` prefix
git push origin 1.1.0    # the Release workflow verifies the tag, then moves `latest`
```

The Release workflow (`.github/workflows/release.yml`) installs from the frozen lockfile,
builds, and typechecks **the tagged tree** before force-updating `latest` to it. A tag that
fails leaves `latest` where it was, so a broken release cannot reach a new creator.

The job runs in the `release` environment, which accepts bare-semver tags only. To re-run it by
hand, dispatch it from the tag itself ("Use workflow from: 1.1.0"); a dispatch from `main` is
refused.

**Never move `latest` by hand.** It is force-updated by that workflow and nowhere else; moving
it manually decouples the pointer from the version it claims to be.

Creators can pin a specific version — `vincentt init --template 1.0.0` — which is the escape
hatch when a release turns out to be bad. That is why the version tags are immutable and only
`latest` moves.

### `MIGRATION.md` and the platform release row

Root `MIGRATION.md` carries one entry per released tag, newest first, authored in the same
PR as the change: `required: true|false`, a one-line summary, and optional notes bullets.
`required: false` means no consumer action is needed, never that the entry was skipped. The
Release workflow refuses to move `latest` for a tag with no valid entry, then — once `latest`
has moved — posts that entry as this release's row to the platform (`POST
/platform/releases`, component `template`), via `scripts/release-row.mjs`. Both steps read
`MIGRATION.md` from `main`, not from the tagged tree: the note is reviewed via PR into `main`
and is append-only per version, so `main`'s copy is the reviewed source for any tag, including
one cut before this file existed. That row is what `vincentt outdated` reads back to tell a
creator's agent what changed and what to do about it.
