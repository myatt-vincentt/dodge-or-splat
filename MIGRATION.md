# Migration notes

Per release tag, newest first. Read by the platform's own version surface
(`GET /platform/versions`) and served to creators' agents through `vincentt
outdated`. Accurate or absent — never speculative. `required: false` is the
authored "no action required," not silence.

## 1.7.1
required: false
No action required.
- The template grounding now maps every SDK `2.0.0-alpha.9` door, including instructions and particles, names the remaining face-effects pieces, and adds patterns for hand try-on, touch objects, instruction prompts and particles. The grounding file is not replaced by an upgrade, so only new scaffolds get it.
- New scaffolds now include a credited low-poly hand model, hand-v1.glb, in the public models folder, with a CREDITS.md entry for its CC BY 4.0 source. An upgrade adds neither file; a project that wants the model can copy both from a new scaffold.

## 1.7.0
required: true
The template now depends on SDK `2.0.0-alpha.9`, where left and right mean the person's own side and FaceTracker content turns with the head; remove any swap or negated rotation your scene added.
- SDK `2.0.0-alpha.9` is a required update. Scene code needs changing if it swapped left and right, negated a head yaw or pitch, used the removed FaceWarp3D settings, or relied on LipEffect drawing above hands and glasses. Hand presence must now reach 0.65 (was 0.5), so faint hands drop out sooner. The SDK's own migration note lists every change.
- Sample videos and a configured video or photo are now bound as a video or an image and drawn as filmed, instead of pre-mirrored and bound as a mirrored webcam. The picture is unchanged; left and right now name the filmed person's own side. An upgrade carries this, because the shell files are replaced.
- The hand bounding box's hand option and its automatic colours now follow the person's own hands. The component is creator-owned, so an existing copy keeps its code but reads the new SDK sides.
- The template now depends on harness `3.0.0`. A production page no longer downloads the Share and feedback overlays or their QR code library; both buttons still appear in preview. Nothing in the template imported the moved names. A project that imported a Share or feedback helper from the package root now fails to build until it imports it from the share or annotate entry instead.
- The template grounding now states that it targets SDK `2.0.0-alpha.9` and explains the person's-own-side rule. The grounding file is not replaced by an upgrade, so only new scaffolds get it.

## 1.6.2
required: false
No action required.
- Same content as the 1.6.1 tag, which never released (its release job refused for a missing note, and release tags cannot be deleted).
- The agent contract (AGENTS.md) now has a "Storing visitor data" section: keep visitor state in `localStorage` or `sessionStorage`, use only `__Host-` cookies when a cookie is needed, and put an app with real visitor sign-in on a custom domain, because published apps share the `vincentt.app` parent domain. AGENTS.md is not replaced by an upgrade, so only new scaffolds get it.

## 1.6.0
required: false
No action required.
- The template now depends on harness `2.0.0`. The preview tunnel client moved into the CLI, so the app no longer installs it or its WebSocket library. Nothing in the template imported it. An upgrade carries the new pin.
- A framed app whose own address carries `source=webcam` now starts on the webcam instead of a sample video. The console gallery's Live frame uses this. A creator's preview frame never sets it, and a configured source is still never overridden.
- Release tooling only: the template's release job now runs in a tag-only environment and refuses tags that are not bare semver on main. It does nothing in a creator's project.

## 1.5.9
required: false
No action required.
- New scaffolds now start with SDK `2.0.0-alpha.8`; existing projects retain their current SDK pin until they update or reseed.
- The SDK's sample-media list now offers the hosted sample videos before the webcam, so the source list starts with a video and the webcam is still listed.
- SDK `2.0.0-alpha.8` is additive: holistic and iris tracking, reusable gestures, segmentation overlays and person cut-out, a coordinate toolkit, capability and camera permission handling, an asset cache, a tracking configuration and product placement AR. Adaptive quality is now on by default and can be turned off on the provider.
- The template grounding now states that it targets SDK `2.0.0-alpha.8`, and keeps its "(alpha.8)" markers so a project on an older pin can see which APIs need the newer SDK. The grounding file is not replaced by an upgrade, so only new scaffolds get it.

## 1.5.8
required: false
No action required.
- A brand-new scaffold's starting scene now runs face tracking only; the hand bounding box still ships but is not mounted. The scene is creator-owned, so an existing project keeps whatever trackers it already mounts.
- The page no longer loads the Poppins font from Google Fonts, because nothing in the template uses it. A project that styled its own text with Poppins now falls back to the system font unless it loads the font itself.
- The page now opens its connection to the platform CDN early, so the tracking files do not wait on connection setup when they are requested.
- Production builds now preload the entry's static script chunks. This is in the build script, which an upgrade does not replace, so only new scaffolds get it.
- The agent contract (AGENTS.md) now says `vincentt create` exits 4 with the `vincentt login` remedy in a folder that already holds an app when there is no account and no terminal, and quotes the preview ending lines without em-dashes, matching the CLI release that ships alongside. AGENTS.md is not replaced by an upgrade, so only new scaffolds get it.
- New scaffolds now start with SDK `2.0.0-alpha.7`; existing projects retain their current SDK pin until they update or reseed.

## 1.5.7
required: false
No action required.
- Release tooling only: the starter now carries two checks for the template's own release tags and its `latest` pointer. They run only in the template repository and do nothing in a creator's project.

## 1.5.6
required: false
No action required.
- The starter's default scene now demonstrates face and hand bounding boxes plus a footer HUD. These are creator-owned files, so upgrading an existing project will not add them; only a brand-new scaffold receives them.
- The starter's agent-contract docs were corrected to point at the SDK's own grounding file instead of a merge step that does not exist. Those docs are not touched by the upgrade either, so this only affects newly-scaffolded projects.

## 1.5.5
required: false
No action required.
- The local preview script now falls back automatically when the platform CLI is not resolvable on the shell's PATH, instead of only printing an install hint.
