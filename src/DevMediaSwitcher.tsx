// DevMediaSwitcher.tsx — dev-only: preview with the SDK's sample media, plus an
// optional local clip.
//
// The template's own media switcher (App.tsx → MediaSourceControl) appears in
// development once a source is announced, which only happens when the webcam
// works. In a browser without a camera (the built-in preview) it never shows,
// so this fills exactly that gap: when the webcam fails it shows the SDK's
// MediaSourceSwitcher with every SDK sample video and image and the webcam, and
// starts on the SDK's "Person Shaking Head" video. Nothing to
// download first.
//
// Optional: drop a clip at dev-media/splat.mp4 and it is listed first and
// used as the start instead (git-ignored; see dev-media/README.md). It lives
// outside src/ (the zone manifest can't classify .mp4) and outside public/
// (which ships). With a working webcam this stays out of the way and the
// template's switcher is the one you see.
//   ?input=webcam  never take over
//
// Never reaches production: Scene.tsx lazy-imports this module behind an inline
// `process.env.NODE_ENV` check, which esbuild folds.
import { useCallback, useEffect, useRef, useState } from "react";
import type { ComponentType } from "react";
import { Html } from "@react-three/drei";
import { XRMediaSource } from "@vincentt-xr/sdk";
import {
  useXRContext,
  useXRError,
  useXRReady,
} from "@vincentt-xr/sdk/low-level";

import { streamFromImageUrl } from "./mediaStream";

type Preset = {
  id: string;
  kind: "webcam" | "image" | "video";
  label: string;
  url?: string;
};
type SwitcherModule = {
  Switcher: ComponentType<{
    value: Preset;
    onChange: (p: Preset) => void;
    sources: Preset[];
  }>;
  sources: Preset[];
};

/** The optional local clip's file name in dev-media/ (without `.mp4`). */
const LOCAL_CLIP = "splat";

/**
 * The local clip as a preset, or null without one. The template-literal import
 * is a glob for esbuild (it bundles whatever matches dev-media/*.mp4), so a
 * fresh clone with no clip still builds (with an "empty-glob" warning). With no
 * match the generated lookup throws synchronously rather than rejecting, so the
 * import runs inside a `.then` to turn that into a rejection.
 */
const loadLocalClip = (): Promise<Preset | null> =>
  Promise.resolve()
    .then(
      () =>
        import(`../dev-media/${LOCAL_CLIP}.mp4`) as Promise<{
          default: string;
        }>,
    )
    .then((m) => ({
      id: "local-clip",
      kind: "video" as const,
      label: "Splat (local)",
      url: m.default,
    }))
    .catch(() => null);

/** Without a local clip, start on this SDK sample: a face turning. */
const SDK_START = "person_shaking_head.mp4";

type CaptureCanvas = HTMLCanvasElement & {
  captureStream: (fps?: number) => MediaStream;
};

/**
 * A looping clip, pre-mirrored like the template's `streamFromVideoUrl` (to
 * cancel the SDK's selfie flip), but it keeps retrying `play()`: Chrome pauses
 * video-only media in a hidden tab, and a single rejected `play()` would abort
 * the swap.
 */
const streamFromClip = async (url: string) => {
  const video = document.createElement("video");
  video.crossOrigin = "anonymous";
  video.src = url;
  video.loop = true;
  video.muted = true;
  video.playsInline = true;
  await new Promise<void>((resolve, reject) => {
    video.onloadeddata = () => resolve();
    video.onerror = () => reject(new Error(`failed to load ${url}`));
  });
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d canvas context unavailable");
  let stopped = false;
  let raf = 0;
  const draw = () => {
    if (stopped) return;
    if (video.paused) video.play().catch(() => {});
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    ctx.restore();
    raf = requestAnimationFrame(draw);
  };
  video.play().catch(() => {});
  draw();
  return {
    stream: (canvas as CaptureCanvas).captureStream(),
    stop: () => {
      stopped = true;
      cancelAnimationFrame(raf);
      video.pause();
    },
  };
};

const DevMediaSwitcher = () => {
  const { session } = useXRContext();
  const ready = useXRReady();
  const error = useXRError();
  const [mod, setMod] = useState<SwitcherModule | null>(null);
  const [value, setValue] = useState<Preset | null>(null);
  const started = useRef(false);
  const stopVideo = useRef<(() => void) | undefined>();

  useEffect(() => () => stopVideo.current?.(), []);

  const apply = useCallback(
    async (p: Preset) => {
      setValue(p);
      stopVideo.current?.();
      stopVideo.current = undefined;
      try {
        if (p.kind === "webcam") {
          await session.setMediaSource({ source: XRMediaSource.WEBCAM });
        } else if (p.url) {
          let stream: MediaStream;
          if (p.kind === "image") {
            stream = await streamFromImageUrl(p.url);
          } else {
            const handle = await streamFromClip(p.url);
            stopVideo.current = handle.stop;
            ({ stream } = handle);
          }
          await session.setMediaSource({
            source: XRMediaSource.STREAM,
            stream,
          });
        }
        await session.start();
      } catch (e) {
        // eslint-disable-next-line no-console -- dev-only diagnostic
        console.warn("[DevMediaSwitcher]", e);
      }
    },
    [session],
  );

  // Take over only when the webcam failed (no camera / permission denied).
  useEffect(() => {
    if (
      started.current ||
      new URLSearchParams(window.location.search).get("input") === "webcam"
    )
      return;
    if (!error) return;
    started.current = true;
    Promise.all([
      import("@vincentt-xr/sdk/debug-ui/media-source"),
      loadLocalClip(),
    ]).then(([m, local]) => {
      const sdk = m.defaultMediaSources as unknown as Preset[];
      const sources = local ? [local, ...sdk] : sdk;
      setMod({
        Switcher:
          m.MediaSourceSwitcher as unknown as SwitcherModule["Switcher"],
        sources,
      });
      const first =
        local ??
        sources.find((s) => s.url?.endsWith(SDK_START)) ??
        sources.find((s) => s.kind === "video");
      if (first) apply(first);
    });
  }, [error, ready, apply]);

  if (!mod || !value) return null;
  const { Switcher } = mod;
  return (
    // Full-screen but click-through: only the switcher itself takes taps, so
    // the HUD's buttons and the dev mouse still work under it.
    <Html fullscreen zIndexRange={[40, 0]} style={{ pointerEvents: "none" }}>
      <div style={{ pointerEvents: "auto" }}>
        <Switcher value={value} onChange={apply} sources={mod.sources} />
      </div>
    </Html>
  );
};

export default DevMediaSwitcher;
