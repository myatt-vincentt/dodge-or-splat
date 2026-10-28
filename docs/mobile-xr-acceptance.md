# Mobile XR acceptance harness

Run this on a physical phone through `pnpm preview` or another HTTPS origin.
Build or start the development shell with
`VITE_MOBILE_XR_ACCEPTANCE_HARNESS=true`. It exposes a **Mobile XR acceptance**
panel beside the real media-source switcher. The panel captures the active XR
canvas using the same `capture.ts` hooks that a creator uses in a scene; it is
opt-in and is not mounted or requested by ordinary published sessions.

```sh
VITE_MOBILE_XR_ACCEPTANCE_HARNESS=true pnpm dev
```

Record the device, browser, OS, orientation, source, and result for every
failure. A green automated check does not replace these checks.

## Automated gate

Run before device testing:

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

These prove the shell compiles, its unit coverage remains intact, and an
ordinary build does not mount the opt-in harness. They cannot grant a device
camera permission, rotate a real viewport, or verify a native recording.

## On-device checklist

### 1. Permission, startup, and recovery

- [ ] Open the HTTPS preview with no saved camera decision and grant permission.
      The camera image, face box, title, and acceptance panel appear; the panel
      reports `Session: ready`.
- [ ] Block or deny the next camera request. The shell shows its camera-unavailable
      state without a blank canvas or uncaught error.
- [ ] Re-enable camera permission in browser/site settings, reload, and grant it.
      The session reaches ready without clearing the page cache or reinstalling.
- [ ] Reload once after successful startup. The camera and face tracker recover;
      the face box follows a moving face.

### 2. Sources and tracker lifecycle

- [ ] In development, use the real media-source switcher to move webcam → video
      (or image) → webcam. Each selected source becomes visible and the shell does
      not remain frozen.
- [ ] Return to webcam and move a face through frame. The box restarts tracking
      after a source change and remains aligned with the face.
- [ ] In a framed preview, use the console source control instead. Verify there
      is only one switcher and the selected source updates the active composition.

### 3. Responsive layout and touch

- [ ] Check portrait. The title, face box, footer, source control, and harness
      remain inside the visible frame.
- [ ] Rotate to landscape, wait for layout to settle, then repeat the face-box
      alignment check. No element receives a second mirror, crop, or Y-axis offset.
- [ ] Exercise a square viewport in browser responsive mode and then repeat on
      device where supported. Screen text stays readable and the title does not
      stretch vertically.
- [ ] Tap both harness controls and the source switcher. Their hit targets work
      without blocking the canvas or leaving a stuck pointer state.

### 4. Capture and visual composition

- [ ] Tap **Capture photo** while the face box and title are visible. Confirm the
      panel says `Photo: Passed` and inspect the result: it contains the camera/R3F
      composition, not browser DOM chrome.
- [ ] Start **Record video**, move or switch source, then stop. Confirm
      `Video: Passed` and play the recorded file; it has current frames rather than
      a black, stale, or mirrored canvas.
- [ ] During both captures, verify the visible screen title and tracker overlay
      align with the rendered camera content. DOM-only controls are intentionally
      absent from the canvas capture.

## Exit criteria

All automated commands pass and every applicable device checkbox passes on at
least one supported phone/browser combination. Log an issue with the failed
step, device/browser details, source mode, and a screenshot or short recording
when any checkbox fails.
