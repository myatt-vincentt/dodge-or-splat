# Vincentt Project — Template Grounding

This file documents the **template-local helpers** that live in this project's
`src/` (capture, gesture-hold, HTML overlays, sprite-sheet animation), plus
project-shape notes and common patterns.

The **SDK component/hook API** (`@vincentt-xr/sdk` — trackers, screen-space
layout, `<ScreenText>`, `<Panel>`, mesh/texture conventions) is **not** in this
file. It ships inside the SDK package, and in this project it is on disk at:

```
node_modules/@vincentt-xr/sdk/GROUNDING.md
```

This template targets `@vincentt-xr/sdk` **`2.0.0-alpha.9`**. Sections below
marked **(alpha.8)** describe APIs that arrived in that version: holistic
tracking, iris tracking, the coordinate-space toolkit, reusable gesture
detection and the `PersonCutout` edge controls. A project still pinned to an
older SDK fails those imports with "no exported member"; check
`node_modules/@vincentt-xr/sdk/package.json`, and use the older path named next
to each one until the pin moves. When the version changes, re-check the
installed SDK grounding and update examples against the installed package rather
than assuming older component behavior.

Sections marked **(alpha.9)** describe APIs that arrived in `2.0.0-alpha.9`:
two new doors (`/instructions` and `/particles`), the hand rig and hand try-on,
touch objects, body triggers, makeup, face swap, liquify, face characters and
head accessories. Some are **experimental** (`Faceless`, `HairLock`,
`WristAttachment`, `ForearmOccluder`, and liquify's hands in front): their props
may change in a later alpha, and the SDK grounding marks them.

**Since alpha.9, left and right mean the person's own side on every source**
(the selfie webcam, the rear camera, clips and stills): `hand="left"` is their
real left hand, `face.leftEye` their real left eye, `armRaisedLeft` their real
left arm. Content inside `<FaceTracker>` or `<HeadBinding>` now turns with the
head. Never add a left/right swap or a negated rotation to compensate; the SDK
grounding's "Left and right" section lists which raw readings still use the
image's sides and the helpers that convert them.

Read that file when you begin a scene. It is the authoritative reference for
every SDK component, hook, and prop, and it is far larger than this one — this
file covers only the template-local helpers. Nothing merges the two: if you have
read only this file, you have not yet seen the SDK API.

Run `pnpm install` first if the SDK grounding file is missing. The installed
package's grounding is authoritative for the exact SDK version in this project.

The same package also ships longer-form docs beside it in
`node_modules/@vincentt-xr/sdk/docs/` (guides, examples, per-API pages, and a
migration guide). Reach for those when the grounding reference is too terse.

Edit `src/Scene.tsx`. Compose the SDK components/hooks with the template helpers
below and R3F primitives. Use `<ScreenSpaceUI>` with `<ScreenText>` for ordinary
screen copy; use `<ScreenTransform>` when explicit authored transform/layout is
needed. There is no lifecycle DSL — per-frame logic is R3F `useFrame`, per-mount
setup is `useEffect`, both inside the scene component.

`App.tsx` already owns the platform shell. Do not add another `XRProvider`,
`XRScene`, `AspectRatioContainer`, `VideoBackground`, `PerspectiveCamera`,
media-source binder, or platform diagnostics inside `Scene.tsx`.

---

## SDK import doors

The SDK is split into task-domain entry points. A symbol imported from the wrong
door fails with "no exported member". The SDK grounding shows the literal import
for each API; this is the map of which door to open.

- **`@vincentt-xr/sdk`** — core: providers, scene, screen-space layout, runtime
  renderers (`Transform3D`, `MeshRenderer`, `SceneObjectRenderer`), `ScreenText`,
  `Panel`, `SpriteAnimation`, `VideoBackground`, `AspectRatioContainer`,
  capture/share (`useFrameCapture`, `useMediaRecorder`, `dataURLtoFile`), audio.
- **`@vincentt-xr/sdk/tracking`** — trackers: `FaceTracker`, `HandTracker`,
  `GestureTracker`, `BodyTracker`, `Segmentation`, `TrackingAnchor`,
  `GestureTrigger`, the bare `FaceMesh`, `useFaceResults`, `useFaceInfo`,
  `useFaceAction`. **(alpha.8)** `HolisticTracker` (+ `.Face` / `.Hand` /
  `.Body`, `useHolisticTracking`, `getHolisticSignals`), `useIrisTracking`
  (+ `IRIS_LANDMARKS`), `useGesture`, `GestureListener`, `GESTURES`,
  `defineGesture`. **(alpha.9)** the hand rig and hand try-on (`HandRig`,
  `HandOccluder`, `HandAttachment`, `HandTattoo`, `HandCutout`; experimental
  `WristAttachment`, `ForearmOccluder`), touch objects (`HandTouch`,
  `Touchable`, `useHandTouch`), body triggers (`BodyTrigger`,
  `useBodyTrigger`), `ShoulderOccluder`, `CanonicalTorsoFrame`, `useHairMask`.
- **`@vincentt-xr/sdk/face-effects`** — face deep: FaceMesh material config,
  retouch, canonical mesh, head-binding. **(alpha.8)** `IrisEffect`,
  `LipEffect`, `SegmentationOverlay` face-region masks. **(alpha.9)** makeup
  (`Blush`, `Contour`, `Highlighter`, `Eyeshadow`, `Eyeliner`, `Brows`,
  `MakeupDesign`, `MadeUpCamera`, `useMakeupSkinTone`), drawing on the live
  face (`FaceAtlasLayer`), `FaceSwap` / `FaceMirror` / `FaceTextureLayer` (your
  own face texture with `useFaceTexture`; `FaceTransfer` without React),
  `FaceLiquify`, `FaceWarp3D`, face characters (`FaceRig`, `ExternalFaceMesh`,
  `FaceReprojection`, `FaceMorph`, `FaceExpressionController`), `FaceInset`,
  content pinned to the face surface (`PinToFaceMesh`, `FaceSurfaceOccluder`),
  head accessories (`HeadAttachment`, `CanonicalHeadFrame`, `Earrings`,
  `Necklace`, `FacePiercing`, `SpringSwing`, and `HeadOccluder`'s new `neck`
  bust, also `NeckOccluder`), and the experimental `Faceless` and `HairLock`.
- **`@vincentt-xr/sdk/instructions`** **(alpha.9)** — prompts that ask for a
  hand gesture, a face expression or a body pose with a ghost 3D hint:
  `HandInstruction`, `FaceInstruction`, `BodyInstruction`, the generic
  `Instruction`; the detectors `useHandGesture`, `useFaceExpression`,
  `useBodyPose`; the vocabularies `HAND_GESTURES`, `FACE_EXPRESSIONS`,
  `BODY_POSES`; the hint kit (`useGhostModel`, `HintStage`).
- **`@vincentt-xr/sdk/particles`** **(alpha.9)** — GPU particles:
  `ParticleEmitter` (placed anywhere; inside a tracker it follows it),
  `PARTICLE_PRESETS`, and the `ParticleSystem` building block.
- **`@vincentt-xr/sdk`** also exports the coordinate helpers: the
  `*ScreenPixels` family today, and **(alpha.8)** the coordinate-space toolkit
  (`feedToWorld`, `feedToViewport`, `feedToScreenPixels`, `trackerToFeed`,
  `feedToTracker`, `trackerToWorld`, `sourceToFeed`, `feedToSource`,
  `computeFeedCrop`, `isMirroredSourceKind`) plus `PersonCutout`.
- **`@vincentt-xr/sdk/scene-object`** — public authoring state: scene-object and
  component types, factories, selectors, immutable store operations, and the
  render-group API.
- **`@vincentt-xr/sdk/low-level`** — escape hatch: raw model-node reads, selector
  hooks, custom-tracker plumbing (`useXRContext`, `useXRReady`, `useXRError`,
  `useXRCameraTexture`, `useXRModelNode`). **(alpha.8)** `useXRFeedCrop`, the
  gesture engine and measures (`stepGestureDetector`, `measurePinch`,
  `OscillationTracker`, …), the
  iris compute seam. **(alpha.9)** `useXRFeedAspect`, the hand rig and touch
  pieces (`HandRigContext`, `TouchWorld`). Reach here only when core + tracking
  can't express it.

Trackers self-register when mounted — no `registerXRPipeline` call.

## Camera effects, render layers, and DOM HUDs

`App.tsx` owns the one `VideoBackground` at `renderOrder={-999}`. Do not add a
second camera plane in `Scene.tsx`. For a camera-image effect, read the already
composed SDK texture with `useXRCameraTexture`, render nothing until it exists,
and put the custom full-screen material immediately above the background.

```tsx
import { useXRCameraTexture } from "@vincentt-xr/sdk/low-level";

const CameraEffect = () => {
  const cameraTexture = useXRCameraTexture();
  if (!cameraTexture) return null; // tracker/media startup and source swaps

  return (
    <mesh position={[0, 0, -0.98]} renderOrder={-998}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        uniforms={{ cameraTexture: { value: cameraTexture } }}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
};
```

Use the same camera texture for a face-bound shader, but keep ordinary 3D
depth testing enabled so the mesh respects its own geometry. A translucent face
effect uses `transparent` with `depthWrite={false}`; add `alphaTest` only for a
deliberate hard cutout. Opaque 3D meshes normally keep both `depthTest` and
`depthWrite` enabled. `renderOrder` orders work within a render call; it does
not replace material depth settings or impose a universal order across opaque
and transparent queues.

For UI that must be captured in screenshots and recordings, prefer
`ScreenSpaceUI`, `ScreenText`, `ScreenImage`, or `ScreenShape`. Use the DOM
`<Overlay>` helper only for browser-native controls, QR codes, or other content
that must remain HTML. It starts with `pointerEvents="none"` and an `Html`
`zIndexRange`, so it cannot block camera gestures. Set `interactive` only for a
visible control with a deliberate touch target, then return it to noninteractive
when hidden. DOM z-index determines DOM stacking only; it cannot draw over a
later R3F pass, and DOM content is intentionally absent from canvas capture.

Verified references: [depth-lens camera shader](https://github.com/vincentt-xr/depth-lens/blob/main/src/Scene.tsx)
and [connect-pair interactive DOM HUD](https://github.com/vincentt-xr/connect-pair-game/blob/main/src/Game.tsx).

## Choose a scene architecture and state model

Keep the protected `App.tsx` shell responsible for session, camera, media, and
the one R3F canvas. Put experience composition in `Scene.tsx`, then choose the
smallest architecture that matches the scene:

- **Direct composition:** one fixed effect or a few related meshes. Compose
  tracker components, `ScreenSpaceUI`, and R3F nodes directly in `Scene.tsx`.
- **Delegated components:** an effect has its own lifecycle, assets, or input
  contract. Extract a named component and pass explicit props; the parent owns
  phase transitions and user-visible state.
- **DOM-first flow:** forms, games, QR handoff, or accessibility-first controls.
  Use `<Html>` / `Overlay` for DOM interaction and keep AR meshes as visual or
  tracking support. Do not place raw DOM inside the R3F scene.
- **Data-driven render groups:** only for editor-like, reorderable, or layered
  scenes. Use the scene-object store, `createRenderPlan`,
  `SequentialRenderPasses`, and `SceneObjectRenderer`; do not introduce render
  groups for a fixed two-mesh scene.

Use React state for values the user must see or that determine React structure:
phase, selected asset, score, visibility, and serialized scene data. Keep
per-frame counters, smoothed landmarks, object references, cooldowns, and
material uniforms in `useRef` and mutate them in `useFrame`. Promote a value to
React state only when a visible UI or component tree must change. This avoids a
render loop triggering React renders at camera frame rate.

Lazy-load a module when it is optional at startup, large, and isolated behind a
stable boundary: debug-only controls, a one-time scene, or a media-source
picker are good candidates. Keep startup-critical tracker, camera, and first
scene modules static. Gate the import itself, not only its rendered output, and
provide a `Suspense` fallback that does not obscure the camera.

The [Jungle themed AR scene](https://github.com/vincentt-xr/Jungle-themed-AR-Experience/blob/main/src/Scene.tsx)
is the advanced render-group reference; [Portrait Photobooth](https://github.com/vincentt-xr/portrait-photobooth/blob/main/src/Scene.tsx)
shows delegated experience state. Follow their data ownership, not their exact
assets or scene behavior.

## Lint rules for scene modules

`pnpm lint` runs the airbnb + TypeScript rules over `src/`, with two overrides
chosen for R3F scenes so a scene split across files lints clean with no
per-file disables:

- **R3F props are allowed in every `src/**/*.tsx`.** `position`, `args`,
  `rotation`, `material`, `geometry`, `intensity`, `renderOrder`, `transparent`,
  `side` and the rest are not DOM attributes, and `react/no-unknown-property`
  would flag each one. The override is off for every `.tsx` under `src/`, not
  only `src/Scene.tsx`, so `src/magnetic/Field.tsx` is as clean as the file it
  was split from. Do not add `/* eslint-disable react/no-unknown-property */`
  at the top of a file: the lint runs with unused-directive reporting on, and the
  directive is now an error.
- **In-place simulation updates.** airbnb's `no-param-reassign` (with
  `props: true`) rejects `body.velocity.x += …` on a function parameter, which
  is how a per-frame simulation step is written when it must not allocate.
  Name the module `*.sim.ts` (or put it under a `sim/` folder) and property
  mutation on parameters is allowed there; reassigning the parameter itself
  stays an error. Keep that pattern in the simulation module and pass results
  out by mutating typed arrays or objects the caller owns, as the
  [frame-loop guidance](#assets-and-frame-loop-performance) describes. A
  one-off elsewhere takes a scoped `/* eslint-disable no-param-reassign */` …
  `/* eslint-enable */` around the function, the way `src/sprite.tsx` does, not a
  file-wide one.

## Assets and frame-loop performance

Use an asset path that matches its ownership. Put public, URL-addressable files
under `public/` and reference them from root (`/assets/frame.png`); use a static
ES module import for a scene-owned image, GIF, font, audio file, or model so the
bundler fingerprints it and reports a missing file at build time. Pass a loaded
`THREE.Texture` to `ScreenImage` or `SpriteSheet`; use a managed video/canvas
texture only when its frames must change at runtime. GIFs work through
`ScreenImage`'s GIF source or a sprite-sheet atlas. Do not use an alpha video
as a mobile overlay; use an alpha WebP/PNG atlas instead.

Preload assets that the first visible scene cannot work without, and defer
optional assets until the phase that needs them. A deferred import must be
behind the condition that makes it useful. Dispose manually created textures,
materials, audio nodes, timers, object URLs, and event listeners in an effect
cleanup; R3F disposes JSX-owned geometry and materials on unmount.

Keep repeated geometry, screen transforms, palette entries, and level layouts
as shared constants or data arrays, then map them into components. This gives
every repeated item the same coordinate and render rules, avoids copy/paste
drift, and lets a single phase/state value select the active data. Do not create
new vectors, textures, arrays, or React callbacks every frame.

`useFrame` is for mutable visual work: update refs, uniforms, mesh transforms,
or typed arrays there. React state is for a visible event or structural change:
a phase transition, score update, selected asset, or completed capture. If a
per-frame value needs to appear in the DOM, throttle or publish only meaningful
changes instead of calling a React setter at camera frame rate.

Working patterns: [Jungle sprite-sheet and ref updates](https://github.com/vincentt-xr/Jungle-themed-AR-Experience/blob/main/src/sprite.tsx),
[connect-pair data-driven board](https://github.com/vincentt-xr/connect-pair-game/blob/main/src/gameData.ts),
and the template's own `src/sprite.tsx` frame-loop implementation.

Files fetched from outside the library (a Sketchfab model, a Figma or Canva export) follow the
rules in `AGENTS.md`, "Bringing in files from outside the library": they go under
`public/assets/<source>/`, models are one GLB compressed with meshopt and WebP (never Draco or
KTX2), loaded with `useGLTF`, and every one gets a row in `CREDITS.md`.

## Authoring self-review before handoff

Run this list after every scene change. It is deliberately short enough to use
in a new session; follow the linked sections when an answer is uncertain.

1. **Name both coordinate spaces.** State where the input starts (DOM client,
   normalized image, SDK tracker point, media pixel, or world point) and where
   it must finish (design pixels, `ScreenSpaceUI`, or world space). Use the
   [coordinate contract](#coordinate-contract--declare-the-source-before-placing-anything)
   helper for that pair.
2. **Convert once.** The selected SDK helper owns mirror, cover/contain crop,
   and origin changes. Delete any second `1 - x`, CSS mirror, manual crop, or
   Y-axis flip after that helper.
3. **Choose the primitive deliberately.** Use `ScreenText` for copy,
   `ScreenImage` for raster/media, `ScreenShape` for vector geometry, and a
   `ScreenTransform` only when composing lower-level screen content. Check the
   [screen primitive guide](#choose-the-screen-primitive-before-writing-layout-code)
   before adding a raw plane or DOM overlay.
4. **Mount only needed tracking.** Prefer app-facing tracker hooks/components;
   use `TrackingAnchor` for ordinary 3D attachment and the low-level door only
   for a custom measurement or skeleton. Declare tracker frame rate and verify
   loss/reacquisition behavior.
5. **Assign rendering ownership.** Keep one `VideoBackground`; choose canvas
   screen UI when it must be captured; make DOM HUD pointer capture explicit;
   and confirm transparency, alpha test, depth settings, and render order using
   the [camera/rendering guide](#camera-effects-render-layers-and-dom-huds).
6. **Check assets and frame work.** Use a supported asset path, preload only
   first-scene requirements, clean up manual resources, share repeated layout
   data, and keep per-frame mutation in refs rather than React setters. See
   [assets and frame-loop performance](#assets-and-frame-loop-performance).
7. **Cite a canonical precedent for nontrivial work.** Link a matching project
   under `Templates/Done` (not a historical experiment), explain the property
   being reused, and keep the new behavior scoped to the current template.
8. **Run matching proof.** Always run `pnpm typecheck`, `pnpm lint`, `pnpm test`,
   and `pnpm build`. Run the [mobile acceptance harness](docs/mobile-xr-acceptance.md)
   for camera, tracker, source, responsive-layout, touch, capture, or overlay
   changes. Include the exact result and any required device evidence in the PR.

## Developing without a camera — local clip input

The template reads `VITE_INPUT_SOURCE` and `VITE_INPUT_URL` from the process
environment and from `.env`, `.env.local`, `.env.development` (dev only) and
`.env.production` (build only), and starts the session on that source instead of
the webcam:

```
VITE_INPUT_SOURCE=video VITE_INPUT_URL=/hand-wave.mp4 pnpm dev   # a looping clip
VITE_INPUT_SOURCE=photo VITE_INPUT_URL=/portrait.jpg  pnpm dev   # one still frame
```

Put the clip under `public/` (served from the root) or point at a full URL. Keep
a dev clip in `.env.development` so `pnpm build` never bakes it in; a clip that
should ship goes in `.env`, and the build prints what it carries. Clips and
stills are drawn as filmed, never mirrored, and the shell tells the SDK which
kind of source it bound, so landmarks land where the footage shows them and
left/right name the filmed person's own side. A hidden or embedded tab that refuses to play the clip is
retried automatically. Do not write a clip loader in `src/Scene.tsx` — the shell
owns the media source, and `App.tsx` already does this.

## Mobile acceptance before release

Use the development-only shell controls and the complete physical-device
[mobile XR acceptance harness](docs/mobile-xr-acceptance.md) before shipping a
template change. Its automated commands catch repository regressions; its
on-device checklist covers camera permission recovery, source and tracker
restart, orientation, touch, canvas capture, and overlay alignment.

## Coordinate contract — declare the source before placing anything

The SDK's [screen-space coordinate API](https://github.com/vincentt-xr/sdk/blob/main/docs/api/screen-space-coordinates.mdx)
is the source of truth for conversion ownership. This section records only the
template's pinned-SDK compatibility rule; update it when the template changes
SDK version instead of copying another coordinate implementation here.

Screen primitives use SDK design pixels by default: a 720×1280 canvas with its
origin at the centre and positive Y upward. Screen-pixel helpers map that canvas
across the full live viewport on each axis; it is not a letterboxed camera
coordinate system. `ScreenTransform2DSettings` is intentionally contain-fitted
so serialized editor layouts preserve their authored aspect ratio. Keep an
image's aspect ratio with its fit mode inside its screen rectangle, never by
adding manual crop or mirror math to its position.

| Source data                                | Origin and axes                                   | Convert once with                                                                                    |
| ------------------------------------------ | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Face landmark or bounds from `useFaceInfo` | **feed** space: normalized 0..1, top-left, Y down | `normalizedToScreenPixels({ point, viewportSize })` (alpha.8: `feedToScreenPixels(point, viewport)`) |
| Low-level hand, gesture, or body point     | **tracker** space: centre-origin; X right, Y up   | `trackerPointToScreenPixels({ point, viewportSize })`                                                |
| Iris / holistic result point (alpha.8)     | feed (`center`, face) or tracker (hands, pose)    | the same two helpers, by space                                                                       |
| DOM pointer/client point                   | viewport top-left, Y down                         | `clientToScreenPixels({ point, rect })`                                                              |
| Camera-media pixel                         | **source** media top-left, Y down, never mirrored | `mediaToScreenPixels({ point, layout, mirrored })`; alpha.8: `sourceToFeed(point, useXRFeedCrop())`  |
| Any feed / tracker point into 3D           | feed or tracker                                   | `TrackingAnchor`; alpha.8: `feedToWorld(point, camera)` / `trackerToWorld(point, camera)` on z = 0   |
| World point                                | Three.js world space                              | `worldToScreenPixels({ point, camera, viewportSize })`; hide when depth is outside `[-1, 1]`         |

**The spaces, named (alpha.8).** The SDK's coordinate toolkit names six spaces
and owns every move between them: **source** (raw media pixels, never
mirrored) → **feed** (the camera texture: source cover-cropped to the render
size, enlarged by `perf.cameraZoom`, mirrored for the webcam only — where every
landmark and mask lives) ↔ **tracker** (feed recentred, Y up) ↔ **viewport**
(CSS pixels; the feed fills it, so they agree per axis) ↔ **screen** (design
pixels) and → **world** (z = 0 plane). `useXRFeedCrop()` (`/low-level`) returns
the live source → feed transform when you must reach the raw frame. Positions
never need a mirror flip; direction signs do, through `isMirroredSourceKind`,
never an inline `sourceKind === "webcam"`.

**Convert a point once only.** The helper owns origin flipping, viewport mapping,
and any mirror/crop rule in its contract. Do not apply a second `1 - x`, manual
cover crop, or top-left/centre conversion afterward.

`trackerPointToScreenPixels` is exported from the SDK core entry.
`src/HandBoundingBox.tsx` still carries the older
fallback — tracker point → normalized top-left point →
`normalizedToScreenPixels` — which produces the same pixels. When you touch
that component, replace the fallback with the helper rather than keeping two
conversion paths; do not add a second path in new code.

## Choose the screen primitive before writing layout code

- **`ScreenText`**: ordinary prompts, scores, instructions, and labels. Use its
  canvas `position` and `size` for authored design-pixel layouts.
- **`ScreenImage`**: raster images, GIFs, photo placeholders, and textured 2D
  overlays. It owns the screen transform; use `fit` for content aspect.
- **`ScreenShape`**: editable vector rectangles, circles, and lines. Use it for
  outlines, masks, and debug geometry; line endpoints are normalized within the
  shape, not design pixels.
- **`ScreenTransform`**: a responsive anchor rectangle for lower-level custom
  mesh or text composition. Anchors are `[-1, 1]`, centre-origin, Y up.
- **`ScreenTransform2DSettings`**: serialized/editor-compatible pixel layouts
  for `ScreenText` and `ScreenShape`. Resolve or merge these through SDK helpers;
  do not reproduce its mapping math in an app.

## Tracker choice

Use `useFaceInfo` or `useFaceDetection` for face logic and screen overlays;
their landmarks and bounds are normalized tracker-input values. Use
`TrackingAnchor` for straightforward 3D attachment to a named face, hand, or
body landmark. Read a low-level tracker node only for bespoke skeletons or
cursors. Mount only the trackers the scene uses, choose `targetFps`
deliberately, keep per-frame values in refs, and use React state only for
visible phase or HUD changes.

**(alpha.8) New choices, in order of preference:**

- **Gestures → `useGesture` / `<GestureListener>`** (`/tracking`), not a
  hand-rolled threshold in `useFrame`. One engine gives enter/exit hysteresis,
  hold, cooldown, a confidence gate and tracking-loss grace, with
  `onBegin` / `onEnd` events. Built-ins: face `mouthOpen`, `smile`, `blink`,
  `browRaise`, `headNod`, `headShake`; hand `pinch`, `grab`, `openPalm`,
  `handRaised`, `wave`, `oneFinger`, `peaceSign`, `threeFingers`,
  `fourFingers`, `fist`, `palm`, `thumbUp`, `thumbDown`; body `armRaised`
  (`Left` / `Right` / `both`), `tPose`; `defineGesture` for your own. They
  read the landmark trackers, so a hand gesture needs no `<GestureTracker>`.
  `<GestureTrigger>` and the template's `useGestureHold` remain the tools for
  the recognizer's _named labels_ (`victory`, `thumb_up`) from
  `<GestureTracker>`.
- **Face + hands + pose together → `<HolisticTracker>`** with `.Face`,
  `.Hand hand="left|right"`, `.Body` children; every `TrackingAnchor` target
  works unchanged under them. One model, one inference, 13.7 MB download.
  Caveats: single person; no head rotation (keep `<FaceTracker>` for roll);
  with face blendshapes on, inference runs on the CPU (`delegate="auto"`
  falls back) and is several times slower, so set
  `outputFaceBlendshapes={false}` when you only need landmarks. Never mount
  it beside `<FaceTracker>` / `<HandTracker>` / `<BodyTracker>` — that runs
  two models.
- **Eye decorations, pupil overlays, iris recolouring → `<IrisEffect>`**
  (`/face-effects`) and `useIrisTracking` (`/tracking`). Shader, image or
  custom material per iris, driven by the same shared face model. Its
  `offset` is the iris position inside the eyelid opening, **not gaze**; use
  blendshapes (`useFaceAction` eye-look / blink) for expression events.
  Best following at face `targetFps` 60, but that heats phones — ship the
  session default and `leadMs` unless the eye effect is the point.
- **Background replacement / person cut-out → `<PersonCutout>`** (core)
  over a full-screen `ScreenImage`, with `maskFeather` / `maskErode` for
  edge spill. It acquires the portrait segmentation itself; no
  `<Segmentation>` needed. `usePersonMask` + `<SegmentationOverlay>` for a
  tinted person / background layer; `useHairMask` for hair.

Model downloads per tracker: face 3.8 MB, hand 7.8 MB, gesture 8.4 MB, body
5.8 MB, holistic 13.7 MB (alpha.8). Each is a first-load cost on the phone.

## Tracking bounding boxes — from `src/FaceBoundingBox.tsx` and `src/HandBoundingBox.tsx`

The starter includes two reusable screen-space components. **The starting scene
runs face tracking only: hands are off by default.** `src/Scene.tsx` mounts
`<FaceBoundingBox />`; `src/HandBoundingBox.tsx` ships in the project but is not
mounted.

To add hands, add this import and this one line to `src/Scene.tsx`:

```tsx
import { HandBoundingBox } from "./HandBoundingBox";

<HandBoundingBox />;
```

Add hands only when the scene needs them. Each tracker adds its own model
download (the hand model is ~7.8 MB) and its own wasm compile on the phone, so
a second tracker costs the viewer that much more on first load and in memory.

The SDK supplies the tracking data and `ScreenShape`; these template components
turn that data into visible rectangle outlines. `FaceBoundingBox` reads the
blessed `useFaceInfo` bounds. `HandBoundingBox` reads the official hand model
node through `@vincentt-xr/sdk/low-level` because the SDK does not expose a
production `HandBoundingBox` component on an app-facing entry point. Its low-level
points are transformed tracker coordinates, not normalized tracker input. It
converts them once to normalized top-left coordinates and then calls
`normalizedToScreenPixels`; the equivalent single call is
`trackerPointToScreenPixels`, which the component should adopt
when next edited. Neither route mirrors or crops the camera feed a second time.

Both components are screen-space overlays and accept `color`, `padding`,
`opacity`, `strokeWidth`, and `renderOrder`. `HandBoundingBox` additionally
accepts `hand="left" | "right" | "both"` (the person's own hand, on every
source); omit it to show both hands. They
acquire the shared tracking models themselves. Add `FaceTracker` or
`HandTracker` separately only when you need to attach tracked 3D children or
use tracker contexts.

## Footer HUD — from `src/FooterHud.tsx`

Use `<FooterHud />` for the small HTML footer. It uses Drei's R3F `<Html>`
bridge, spans the full canvas width at the bottom edge, respects the device
safe area, uses subtle entrance/shimmer motion, and lets camera gestures pass
through.

---

## `useGestureHold({ gesture, holdMs, armDelayMs, enabled, onTrigger })` — hold-to-trigger (from `src/gesture.ts`)

`<GestureTrigger>` (SDK) is one-shot. `useGestureHold` fires after a gesture has been **held** for `holdMs`, debounced so a stray misclassified frame can't latch it. It re-arms when the gesture is released, so the next hold fires again. Needs a `<GestureTracker />` (SDK) mounted.

```tsx
import { GestureTracker } from "@vincentt-xr/sdk/tracking";
import { useGestureHold } from "./gesture";

<GestureTracker />;

// hold the peace sign ~0.6s to take the photo
useGestureHold({ gesture: "victory", holdMs: 600, onTrigger: takePhoto });
```

- `holdMs: 0` fires on first detection (instant); larger values require a deliberate hold.
- **`armDelayMs` (default 500) is the scene-transition guard.** When a gesture advances to a new scene, the user's hand is often still in that gesture as the next scene mounts — without an arm delay the new scene would fire instantly off the lingering gesture. The default keeps "the next scene doesn't double-fire" working out of the box. Pass `armDelayMs: 0` only if you genuinely want instant-on-mount.
- `enabled: false` gates it without unmounting (e.g. only accept the gesture after a celebration finishes).
- **(alpha.8)** For landmark gestures — pinch, grab, wave, nod, a raised arm,
  the finger-count signs — use the SDK's `useGesture(name, { holdMs,
cooldownMs, onBegin, onEnd })` or `<GestureListener>` instead: it has the
  hold, hysteresis, cooldown and tracking-loss handling built in and needs no
  `<GestureTracker>`. Keep `useGestureHold` for the recognizer's named labels.
  Example: `useGesture("peaceSign", { holdMs: 600, cooldownMs: 1500, onBegin: takePhoto })`
  is the landmark-based twin of the `victory` hold below.

```tsx
// Scene A: instant peace-sign advances to Scene B
useGestureHold({ gesture: "victory", holdMs: 0, onTrigger: goToSceneB });

// Scene B: the default arm delay ignores the peace sign that's still up from leaving A
useGestureHold({ gesture: "victory", holdMs: 0, onTrigger: goToSceneC });
```

---

## Capture (photo + video) — from `src/capture.ts`

Trigger-agnostic capture primitives. Wire them to whatever the project uses — a gesture, a click, a timer — the hooks don't care. Both flows return `{ blob, dataUrl }` so previews, downloads, uploads, and shares are all one-line follow-ups.

### `usePhotoCapture()` — single-shot photo from the live R3F render

```tsx
import { usePhotoCapture, saveToDevice } from "./capture";
import { GestureTracker, GestureTrigger } from "@vincentt-xr/sdk/tracking";

const { capture, latest } = usePhotoCapture();

<GestureTracker />
<GestureTrigger
  gestures={["victory"]}
  onTrigger={async () => {
    const photo = await capture();
    saveToDevice(photo, "snap.png");
  }}
/>

const LatestPreview = ({ dataUrl }: { dataUrl: string }) => {
  const texture = useTexture(dataUrl);

  return (
    <ScreenTransform anchors={{ left: 0.4, right: 0.9, top: 0.9, bottom: 0.6 }}>
      <mesh name="thumb">
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={texture} />
      </mesh>
    </ScreenTransform>
  );
};

// optional preview thumbnail (R3F mesh)
{latest && <LatestPreview dataUrl={latest.dataUrl} />}
```

### `useVideoCapture({ audio? })` — record the live canvas to a video blob

```tsx
import { useVideoCapture, saveToDevice } from "./capture";

const { start, stop, isRecording } = useVideoCapture({ audio: true });

<GestureTrigger gestures={["open_palm"]} onTrigger={() => start()} />
<GestureTrigger gestures={["closed_fist"]} onTrigger={async () => {
  const video = await stop();
  saveToDevice(video, "clip.webm");
}} />
```

`isRecording` is reactive — use it to drive a "● REC" indicator or pulse a UI element while filming. Audio is off by default so kiosk / silent contexts don't surface a mic prompt; pass `{ audio: true }` for mobile capture with sound.

### `saveToDevice(media, filename)` — browser download

Mobile: triggers the browser or OS save/share flow. Desktop: triggers a browser download to the user's configured download location. Kiosk contexts usually want to upload `media.blob` to a server instead — skip this helper and `fetch(uploadUrl, { method: "POST", body: media.blob })`.

### `shareMedia(media, opts?)` — native share sheet

Opens the OS share sheet (Instagram / WhatsApp / Messages) on devices that support the Web Share API with files; falls back to a download elsewhere. Returns `{ shared }` so you can branch — e.g. show a "scan to get it on your phone" QR when the native sheet isn't available.

```tsx
import { useVideoCapture, shareMedia } from "./capture";

const { stop } = useVideoCapture();

const video = await stop();
const { shared } = await shareMedia(video, {
  filename: "my-ar-clip.webm",
  title: "My AR clip",
});
if (!shared) {
  // desktop / kiosk: it downloaded instead. Show a QR or upload + display a link.
}
```

These template hooks are thin wrappers over the SDK's own capture surface
(`useMediaRecorder`, `useFrameCapture`, `dataURLtoFile` — all on the core door).
Prefer the template hooks: they manage the latest preview, return a `Blob` for
uploads, and keep the photo/video API shapes symmetric. Go direct to the SDK hooks
only when you need recorder state the wrappers don't expose.

For a low-level synchronous alternative, the SDK's `session.captureFrame(): string` returns a raw `data:image/png;base64,...` string.

---

## HTML overlays (QR codes, sharp DOM UI) — from `src/overlay.tsx`

Most chrome (frames, prompts, badges) belongs in the 3D scene via `<ScreenSpaceUI>` (SDK) — it composites with the AR content and tracks correctly. Use HTML overlays only for content that must be pixel-sharp and is awkward in 3D, chiefly **QR codes** (they moire and soften when projected onto a textured plane).

Overlays render as plain DOM positioned over the canvas, inside the portrait frame. They are NOT R3F — use HTML/CSS inside them, not meshes. Place an overlay anywhere in your `Scene.tsx` return; it portals visually above the canvas via absolute positioning.

### `<Overlay corner margin interactive>` — positioned DOM layer

```tsx
import { Overlay, QRCode } from "./overlay";

// "Scan to open on your phone" — kiosk entry point
<Overlay corner="bottom-right" margin={32}>
  <QRCode value="https://myapp.vincentt.app" size={180} />
</Overlay>;
```

`corner` is one of `top-left | top-right | bottom-left | bottom-right | center` (default `bottom-right`). `interactive` (default false) lets pointer events through so the overlay never blocks gestures; set it `true` only for a tappable control on a touch kiosk.

### `<QRCode value size light dark padded>` — crisp scannable QR

```tsx
import { usePhotoCapture, shareMedia } from "./capture";
import { Overlay, QRCode } from "./overlay";
import { useState } from "react";

const { capture } = usePhotoCapture();
const [shareUrl, setShareUrl] = useState<string | null>(null);

// after a capture, upload the blob and show a QR to the resulting URL
const onSnap = async () => {
  const photo = await capture();
  const { shared } = await shareMedia(photo, { filename: "snap.png" });
  if (!shared) {
    // desktop/kiosk: upload and surface a QR instead of a download
    const url = await uploadAndGetUrl(photo.blob); // your endpoint
    setShareUrl(url);
  }
};

{
  shareUrl && (
    <Overlay corner="center">
      <QRCode value={shareUrl} size={220} />
    </Overlay>
  );
}
```

Renders as SVG (sharp at any size). `padded` (default true) draws a white quiet-zone card so the code stays scannable over a busy camera feed. QR is **display/encode only** — there is no camera-side QR scanning in the template.

### Gotcha: give replaced elements (`<img>`, `<video>`) a sized wrapper

`<Overlay>` bridges out of the canvas via a wrapper that shrink-wraps its content. Text and `<QRCode>` carry their own intrinsic size, so they render fine. A bare `<img>` or `<video>` does **not** — it collapses to ~0px (just its border) and looks invisible. Wrap media in a `div` with explicit `width` + `height`, give it `overflow: hidden`, and let the media fill it:

```tsx
import { usePhotoCapture } from "./capture";
import { Overlay } from "./overlay";

const { latest } = usePhotoCapture();

// preview the last photo, bottom-left
{
  latest && (
    <Overlay corner="bottom-left" margin={20}>
      <div
        style={{
          width: 110,
          height: 146,
          overflow: "hidden",
          borderRadius: 10,
          border: "2px solid #fff",
        }}
      >
        <img
          src={latest.dataUrl}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      </div>
    </Overlay>
  );
}
```

The same applies to a `useVideoCapture()` `latest` preview — wrap the `<video>` in a sized `div`. (To preview captures as a 3D plane instead, use `useTexture(latest.dataUrl)` on a `<mesh>` inside `<ScreenSpaceUI>` — see the capture section.)

---

## Sprite-sheet animation — from `src/sprite.tsx`

A sprite sheet is one image holding a grid of animation frames. Use it for countdowns, animated stickers, mascots, and particle bursts — anything frame-by-frame.

> **The SDK also ships a sprite player — `<SpriteAnimation>` (core door).** The two
> are not interchangeable, so pick by where the sprite lives:
>
> - **Screen-space overlay** (a frame border, an instruction graphic, anything
>   anchored to the viewport) — use the SDK's `<SpriteAnimation sheet={{ url, cols,
rows, frames, fps }} anchors={...} />`. It must live inside a `<ScreenSpaceUI>`,
>   defaults to full-screen, and contain-fits via `contentAspect`.
> - **World-space, or anything needing per-frame control** (a sticker pinned to a
>   landmark inside `<TrackingAnchor>`, a one-shot countdown with `onComplete`, a
>   particle burst) — use the template's `<SpriteSheet>` / `useSpriteSheet` /
>   `useInstancedSpriteUV` below. The SDK component has no world-space, no `loop`,
>   no `playing`, and no `onComplete`.
>
> Note the prop shapes differ: the SDK takes one `sheet` object (`cols`/`rows`/
> `frames` plus a `url` it loads itself); the template takes a loaded `texture` plus
> flat `columns`/`rows`/`frameCount`. Don't mix them.

Two tiers:

### `<SpriteSheet>` — a single animated sprite (the common case)

A textured plane that cycles through the sheet's cells. Extra mesh props pass through, so it composes in screen-space (inside `<ScreenTransform>`) or world-space (inside `<TrackingAnchor>`) unchanged. Frames read left-to-right, top row first.

```tsx
import { useTexture } from "@react-three/drei";
import { SpriteSheet } from "./sprite";

const sheet = useTexture("https://cdn.../countdown.png"); // a 1x3 sheet: "3","2","1"

// screen-center countdown that plays once
<ScreenTransform anchors={{ left: -0.25, right: 0.25, top: 0.25, bottom: -0.25 }}>
  <SpriteSheet name="countdown" texture={sheet} columns={1} rows={3} fps={1} loop={false} onComplete={snap} />
</ScreenTransform>

// or pinned to the forehead as an animated sticker (4x4 sheet, looping)
<FaceTracker>
  <TrackingAnchor target="face.forehead">
    <SpriteSheet name="sticker" texture={stickerSheet} columns={4} rows={4} fps={12} scale={[0.3, 0.3, 1]} />
  </TrackingAnchor>
</FaceTracker>
```

Props: `texture`, `columns`, `rows`, `fps` (default 12), `loop` (default true), `playing` (default true — gate playback), `frameCount` (default `columns*rows`; set lower if the sheet has blank trailing cells), `onComplete` (fires when a non-looping animation ends). Plus any mesh prop (`name`, `scale`, `position`, `renderOrder`, `opacity`).

### `useSpriteSheet(opts)` — the hook, when you need the raw frame

Returns `{ map, frame, setFrame }`. Apply `map` to your own material; read `frame` for per-frame logic; call `setFrame(i)` to jump/restart. `<SpriteSheet>` is just this hook on a plane.

### `useInstancedSpriteUV({ texture, columns, rows, count })` — sprite particles (advanced)

For many sprites in one draw call (confetti, sparkles). It gives you only the reusable **mechanic** — per-instance UV cell + alpha through a pre-patched material — and you write the spawn/physics loop yourself (particle behavior is always bespoke).

```tsx
import { useInstancedSpriteUV } from "./sprite";

const sprite = useInstancedSpriteUV({
  texture: confettiSheet,
  columns: 4,
  rows: 4,
  count: 1500,
});

useEffect(() => {
  const g = meshRef.current.geometry;
  g.setAttribute("instanceUvOffset", sprite.uvOffset);
  g.setAttribute("instanceAlpha", sprite.alpha);
}, []);

useFrame((_s, delta) => {
  // your physics: move each instance's matrix, set its cell + alpha
  sprite.setCell(i, cellIndex); // which sheet cell this instance shows
  sprite.alpha.setX(i, fade); // per-instance fade
  sprite.alpha.needsUpdate = true;
});

<instancedMesh ref={meshRef} args={[undefined, sprite.material, 1500]}>
  <planeGeometry args={[0.1, 0.1]} />
</instancedMesh>;
```

---

## Common patterns

Each pattern names which primitives compose it (SDK components + template helpers). Use as starting points; combine and adapt freely.

### gesture-photo-booth (the canonical photo flow)

- `<GestureTracker />` (SDK) to enable gesture detection
- `<ScreenSpaceUI>` (SDK) overlay with a "do the peace sign" prompt and decorative frame
- `<GestureTrigger gestures={["victory"]} onTrigger={...}>` (SDK) fires the capture (or `useGestureHold` for a debounced hold-to-trigger)
- `usePhotoCapture()` (template) returns the photo; hand to state, download, or share
- Optional: 3-2-1 countdown `<SpriteSheet>` (template) before the capture

### face-decoration (single-scene face effect)

- `<FaceTracker>` wrapping `<TrackingAnchor target="face.forehead">` (SDK) with a 3D mesh/texture
- Optional `<FaceTracker.Mesh />` (SDK) for full deforming face coverage
- No interaction required — the decoration simply follows the face

### hand-effect / body-effect

- `<HandTracker>` or `<BodyTracker>` (SDK) + `<TrackingAnchor target="hand.indexTip">` / `<TrackingAnchor target="body.leftShoulder">`
- 3D objects follow the landmark each frame

### segmentation-background

- `<Segmentation type="portrait" />` (SDK; registers the segmentation pipeline; mounts alongside a state/ref for the mask)
- Pass the resulting mask texture to `<VideoBackground segmentationMask={mask} customBackground={replacementColor} />` (SDK) in App.tsx
- **(alpha.8)** or, for any background media: `<ScreenSpaceUI>` with a full-screen `<ScreenImage>` (image / video / GIF / shader plane) at a low `renderOrder` and `<PersonCutout renderOrder={100} />` above it; tune `maskFeather` / `maskErode` for edge spill

### gesture-controlled (no tracker visuals)

- `<GestureTracker>` + `<GestureTrigger>` (SDK) drives effects (particles, scene transitions, animations) off the recognizer's named labels without any visible hand/face overlay
- **(alpha.8)** `<GestureListener gesture="pinch" onBegin={…} onEnd={…} />` or `useGesture` (SDK) for landmark gestures — pinch to grab, wave to reset, nod to confirm, raised arm to start — with hold / cooldown / loss handling and no `<GestureTracker>`

### holistic-scene (alpha.8)

- `<HolisticTracker>` (SDK) once, above any phase switch, with `<HolisticTracker.Face>`, `<HolisticTracker.Hand hand="right">`, `<HolisticTracker.Body>` and `TrackingAnchor` children; `getHolisticSignals(result)` for combined cues such as a raised open hand while smiling
- `outputFaceBlendshapes={false}` when expressions are not needed (keeps inference on the GPU)

### hand-try-on (alpha.9)

- `<HandOccluder hand="right" model={handGltf.scene} inflate={-0.1}>` (SDK, `/tracking`), one per hand, outside any tracker: the real hand hides the back of what it wears
- Inside it: `<HandAttachment joint="ringMcp" along={0.6}>` for a ring, `<HandTattoo>` for art on the skin; experimental `<WristAttachment along={1.6}>` for a watch, with `forearm` and `armMask="skin"` on the `HandOccluder`
- The model is a rigged hand on the SDK's rig contract: the template ships `public/models/hand-v1.glb` (see the SDK grounding's hand rig section); it is CC BY, so show its credit text from `CREDITS.md` in the experience

### touch-objects (alpha.9)

- `<HandTouch showColliders>` (SDK, `/tracking`) once, outside any tracker, with `<Touchable shape="sphere" size={0.4} position={[0, 0.5, 0]} onTap={…} />` children: pinch to grab and throw, push and poke, hover and tap
- `pointer` lets the mouse or touch screen play too (desktop without a camera)

### instruction-prompt (alpha.9)

- `<HandInstruction gesture="peace" text="Peace to start" model={hand.scene} poses={hand.animations} onComplete={start} />` (SDK, `/instructions`) inside `XRScene`: a looping ghost hand shows the gesture, holding it for `holdMs` (400) completes it; it acquires the hand model itself (no `HandTracker`, not `GestureTracker`)
- `<FaceInstruction expression="smile" text="Smile to start" model={face.scene} onComplete={start} />` for an expression; `<BodyInstruction pose="hooray" text="Arms up to start" model={body.scene} poses={body.animations} onComplete={start} />` for a body pose
- The ghost needs a model, loaded with `useLoader`: for hands the template ships `public/models/hand-v1.glb` (a rig-contract hand with the 11 gesture clips; CC BY, so show its credit text from `CREDITS.md` in the experience); for a face, a model with expression morph targets (the SDK's `face-v1.glb`, meshopt-compressed); for a body, a humanoid with one clip per pose plus an `idle` clip. Add any model you bring to `public/models/` and `CREDITS.md`
- Vocabularies: `HAND_GESTURES`, `FACE_EXPRESSIONS`, `BODY_POSES` (and `defineHandGesture` / `defineFaceExpression` / `defineBodyPose` for your own); `onStatusChange` reports waiting / detected / holding / done
- `useHandGesture` / `useFaceExpression` / `useBodyPose` for the detection alone, with your own UI (`<Instruction>` for another layout)

### particles (alpha.9)

- `<ParticleEmitter preset="laser" target="eyes" />` (SDK, `/particles`): laser eyes, one emitter in front of each eye; inside a `FaceTracker` it follows that face, anywhere else it tracks the face itself
- A custom emitter is placed like any 3D object (its +Z is forward): `<ParticleEmitter shape="cone" angle={20} rate={120} speed={40} lifetime={1.2} color={["#ffffff", "#ff3b30"]} size={[1.2, 0.2]} />`; inside a tracker, `HeadAttachment` or `TrackingAnchor` it follows that face or hand
- Particles live on in world space: a moving emitter leaves a trail, `emitting={false}` stops new ones and the old ones finish; `gravity`, `wind` and `drag` shape their path, `sprite="streak"` stretches them along the motion
- Thousands cost one draw (the GPU works out each particle from its spawn record); keep `rate × lifetime` sensible on phones

### iris-eye-effect (alpha.8)

- `<IrisEffect mode="shader" color="#4fa3ff" />` or `mode="image"` with a texture (SDK, `/face-effects`); `material` for a custom shader fed by the shared iris uniforms
- Clip behind the eyelids with a `CanonicalFaceMeshRenderer` repainting the feed without the eye openings at a higher `renderOrder` (see `docs/api/iris-tracking.mdx`)

---

## Lessons from shipped projects

What creators' agents ran into on real builds, with the fix that landed and the
workaround for a project still on an older template. Each item links its issue;
when the issue is closed the template already behaves as described and the
workaround is only for projects scaffolded before it. The repository is
`vincentt-xr/v2-template` unless named.

- **Dev-only code and production builds** ([#112](https://github.com/vincentt-xr/v2-template/issues/112)).
  A branch behind `if (import.meta.env.DEV)` is dead code in `pnpm build`: the
  config defines each `import.meta.env` key as a literal, and `process.env.NODE_ENV`
  folds the same way. On a template older than this, only `process.env.NODE_ENV`
  folded; a `DEV` guard shipped its branch (a clip loader and its video in one
  project), so guard with `process.env.NODE_ENV !== "production"` there.
- **Developing without a camera** ([#113](https://github.com/vincentt-xr/v2-template/issues/113)).
  `VITE_INPUT_SOURCE=video VITE_INPUT_URL=/clip.mp4 pnpm dev`, or the same two
  lines in `.env.development`; see
  [Developing without a camera](#developing-without-a-camera--local-clip-input).
  Do not write a clip loader in `Scene.tsx`. On an older template the variables
  were documented but never injected; a hand-written loader behind a
  `NODE_ENV` guard was the only route.
- **`pnpm build` and the dev page** ([#114](https://github.com/vincentt-xr/v2-template/issues/114)).
  Dev output lives in `.dev/`, so a build during `pnpm dev` does not swap the dev
  page onto the production bundle. On an older template both wrote `dist/`:
  restart `pnpm dev` after any `pnpm build`, or the page silently serves
  production code and dev-only input "disappears" like a camera bug.
- **The dev address** ([#115](https://github.com/vincentt-xr/v2-template/issues/115)).
  `http://localhost:5173` answers on IPv4 and IPv6. An older template bound
  `127.0.0.1` only; a browser resolving `localhost` to `::1` (an embedded preview
  browser does) got connection refused — open `http://127.0.0.1:5173` there.
- **New files under `src/` and CI** ([#116](https://github.com/vincentt-xr/v2-template/issues/116)).
  In a creator's repository an unlisted `src/` file is the creator's own and the
  smoke build stays green; the completeness rule is strict only in the template
  repo. On an older template, add every new `src/` file to
  `.vincentt-template.json` under `creator`, or the zone-manifest step fails with
  "classified in neither list".
- **Framed apps and the webcam** ([#117](https://github.com/vincentt-xr/v2-template/issues/117)).
  Inside any iframe the shell plays a sample clip instead of the webcam unless
  the frame's address says `?source=webcam` or the build set
  `VITE_FRAMED_SOURCE=webcam`; the host must also put `allow="camera"` on the
  frame. The shell publishes `loading | ready | error` for the host; see
  "Embedding the experience in another page" in `AGENTS.md`. On an older template
  only `?source=webcam` existed and there was no status signal.
- **Lint on a scene split across files** ([#118](https://github.com/vincentt-xr/v2-template/issues/118)):
  see [Lint rules for scene modules](#lint-rules-for-scene-modules). Older
  templates allowed R3F props in `src/Scene.tsx` only; copy the two R3F
  overrides from the current `.eslintrc.json` (it is never replaced by an upgrade).
- **Title and share card** ([#119](https://github.com/vincentt-xr/v2-template/issues/119)):
  `app.config.json`, not `index.html`. Older templates kept them in `index.html`,
  which an upgrade replaces; re-apply after upgrading, or copy
  `scripts/app-metadata.mjs` with the current `build.mjs` / `dev.mjs`.
- **Hand sample media** ([console#135](https://github.com/vincentt-xr/console/issues/135)):
  the SDK's sample presets have no hand-centric clip yet, so a hand-tracking scene
  previewed in the console frame shows a face. Preview on the phone, or use a
  local clip as above.

**Hand interaction patterns that held up** (a force-field game driven by one hand,
SDK alpha.7/alpha.8):

- **Smooth the palm, not the fingertips.** Drive the effect from the palm centre
  (the mean of wrist and the four finger bases) passed through a One Euro filter;
  per-landmark smoothing lags the gesture. `TrackingAnchor smoothing={15}` is the
  SDK's One Euro for anchored 3D children. For a value you read in `useFrame`
  the SDK core exports `smoothVector2` / `smoothVector3` (frame-rate-independent
  exponential damping, not One Euro); they beat a raw per-frame lerp but still
  follow throttled samples, so keep a One Euro of your own on the palm centre
  when the effect must not step.
- **Derive palm / fist / pinch from landmarks, with hysteresis.** Open palm when
  the mean fingertip-to-wrist distance exceeds an *enter* threshold, closed when
  it drops below a lower *exit* threshold; pinch from thumb-tip to index-tip
  distance normalised by palm width, again with two thresholds. One threshold
  flickers at the boundary. On alpha.8 this is what `useGesture` /
  `<GestureListener gesture="pinch" | "grab" | "openPalm">` does for you, with
  hold, cooldown and tracking-loss grace; prefer it.
- **One hand model.** Read landmarks from `<HandTracker>` (or `useGesture`, which
  shares it) and derive the gestures; do not mount `<GestureTracker>` beside it
  for a label the landmarks already give you. Two models mean two downloads
  (7.8 MB + 8.4 MB), two wasm compiles and two inferences per frame on the phone.
  Keep `<GestureTracker>` + `useGestureHold` for the recognizer's named labels
  (`victory`, `thumb_up`) when those are the point.

## Notes

- `VideoBackground`, camera, and lighting are already mounted in `src/App.tsx`. Do NOT add a second background plane — it covers the camera.
- Assets are referenced by **URL**. For the platform's curated library, run
  `vincentt assets search "<what you want>"` — see the Assets section in `AGENTS.md`.
- Tracker components self-register — no `registerXRPipeline` call needed.
- Page title, description and share image live in `app.config.json` (the
  creator's file), written into `index.html` at build. Do not edit `index.html`
  for them; it is a platform file an upgrade replaces. See "Page title and share
  preview" in `AGENTS.md`.
- Framed (any iframe), the shell swaps the webcam for a sample clip unless the
  frame's address says `?source=webcam` or the build set
  `VITE_FRAMED_SOURCE=webcam`. The shell also publishes `loading | ready | error`
  for embedders (`<html data-experience>`, the `experience:status` window event,
  a `postMessage` to the parent). Do not re-implement either in `Scene.tsx`; see
  "Embedding the experience in another page" in `AGENTS.md`.
- Always name your meshes — `name="..."` enables runtime lookup and visual-feedback editing.
