/**
 * Framed-configuration detection.
 *
 * Pure and dependency-free ON PURPOSE. The SDK's preset module carries 12 CDN
 * URLs and the switcher pulls in an icon dependency, so neither may be reached
 * by a static import from application source — a production build has to be
 * able to drop both. Everything here is a decision; the modules that satisfy
 * the decision are loaded dynamically at the call site.
 */

/** The two window handles the framing check compares. Injected so it is testable. */
export type FramingView = { self: unknown; top: unknown };

/**
 * True when this document is running inside a frame.
 *
 * A fact the app reads ABOUT ITSELF — no sender, no message, no channel from
 * the embedder. Deliberately true inside *any* frame, not just the console's:
 * which default a framed app opens on is the same question for every embedder.
 *
 * Cross-origin does not break it. Comparing `window.top` as an opaque handle is
 * same-origin-policy-safe; only reaching THROUGH it (`top.location`) throws, and
 * nothing here dereferences it.
 *
 * A missing or throwing `window` folds to NOT framed, so an unknown context
 * behaves like today's shipped top-level case rather than silently swapping the
 * creator's camera for a canned clip on their own machine.
 */
export const isFramed = (view?: FramingView): boolean => {
  const w = view ?? (typeof window === "undefined" ? undefined : window);
  if (!w) return false;
  try {
    return w.self !== w.top;
  } catch {
    return false;
  }
};

export type MediaSourceEnv = {
  VITE_INPUT_SOURCE?: string;
  VITE_INPUT_URL?: string;
  /** `"webcam"` keeps the live camera when framed. See `FRAMED_SOURCE_WEBCAM`. */
  VITE_FRAMED_SOURCE?: string;
};

export type MediaSourceChoice =
  | { kind: "video"; url?: string }
  | { kind: "photo"; url: string }
  | { kind: "framedPreset" }
  | { kind: "webcam" };

/**
 * The one startup parameter a framed app reads from its own address. The
 * console's gallery frame vendors a byte-identical copy of these two lines.
 */
export const FRAMED_SOURCE_PARAM = "source";
export const FRAMED_SOURCE_WEBCAM = "webcam";

/**
 * True when this document's own address asks for the webcam (`?source=webcam`).
 *
 * One value only: the first `source` value, exact and case-sensitive, after
 * percent-decoding. Anything else, the hash included, is ignored. A missing
 * `window` or a throw folds to false, so an unknown context keeps the shipped
 * framed default rather than raising a camera prompt.
 */
export const requestsWebcam = (search?: string): boolean => {
  try {
    const s = search ?? (typeof window === "undefined" ? "" : window.location.search);
    if (!s) return false;
    return new URLSearchParams(s).get(FRAMED_SOURCE_PARAM) === FRAMED_SOURCE_WEBCAM;
  } catch {
    return false;
  }
};

/**
 * Which media source this app starts on.
 *
 * A creator who CONFIGURED a source keeps it, framed or not, parameter or not:
 * overriding a deliberate config pointed at client footage would hide work they
 * did. Only the webcam default branch is framing-aware. A framed app opens on a
 * preset rather than raising a permission prompt nobody asked for, unless
 * someone asked for the webcam — and two parties can:
 *
 *   - the EMBEDDER, per frame, with `?source=webcam` on the app's own address
 *     (`webcamRequested`): the gallery's Live frame does this, the creator's
 *     preview frame never does;
 *   - the CREATOR, for every embed, with `VITE_FRAMED_SOURCE=webcam` at build
 *     time (vincentt-xr/v2-template#117): an experience that IS the camera — a
 *     hand-tracked game on a partner's page — has nothing to show without it.
 *     The host must still grant `allow="camera"` on the iframe, or the browser
 *     refuses the prompt. Unset, the console's preset default is unchanged.
 */
export const chooseMediaSource = (
  env: MediaSourceEnv,
  framed: boolean,
  webcamRequested = false,
): MediaSourceChoice => {
  if (env.VITE_INPUT_SOURCE === "video") return { kind: "video", url: env.VITE_INPUT_URL };
  if (env.VITE_INPUT_SOURCE === "photo" && env.VITE_INPUT_URL) {
    return { kind: "photo", url: env.VITE_INPUT_URL };
  }
  const creatorKeepsWebcam = env.VITE_FRAMED_SOURCE === FRAMED_SOURCE_WEBCAM;
  if (framed && !webcamRequested && !creatorKeepsWebcam) return { kind: "framedPreset" };
  return { kind: "webcam" };
};

/**
 * The framed default is a MOVING clip rather than a still, so the creator sees
 * the tracker respond rather than a frozen detection. Picking by `kind` rather
 * than by index means a preset list reordered upstream still yields a video.
 */
export const pickFramedDefault = <T extends { kind: string }>(presets: T[]): T | undefined =>
  presets.find((p) => p.kind === "video");

/** The announce's kind vocabulary. The console renders these; the SDK does not use them. */
export type AnnouncedPresetKind = "video" | "image" | "camera";

/** One preset as it travels to the console. `url` is deliberately absent. */
export type AnnouncedPreset = {
  id: string;
  label: string;
  kind: AnnouncedPresetKind;
  mirrored: boolean;
};

/**
 * The SDK's kind vocabulary is not the wire's: the SDK says `webcam`, the
 * channel says `camera`. Translating here rather than at the console keeps the
 * SDK at zero change and keeps the console free of SDK vocabulary.
 */
const ANNOUNCED_KIND: Record<string, AnnouncedPresetKind> = {
  video: "video",
  image: "image",
  webcam: "camera",
};

/**
 * Whether the creator sees this source mirrored.
 *
 * DERIVED FROM `kind`, because the SDK's preset type carries no such field —
 * mirroring is a session-level flag there, not a property of a preset. The
 * derivation is not a guess: the SDK mirrors only the `webcam` source kind, and
 * the binder passes `sourceKind` "video" / "image" for every clip and still, so
 * a webcam ends up mirrored on screen and a clip or a still ends up drawn as
 * filmed. That asymmetry is what the console's mirror mark reports.
 *
 * If the SDK ever declares mirroring per preset, this is the one line to delete.
 */
const isMirrored = (kind: AnnouncedPresetKind): boolean => kind === "camera";

/**
 * The app's preset list, in the shape the console is announced.
 *
 * `url` is dropped ON PURPOSE and this is a security property, not a trim: the
 * console names an `id` and the app resolves it against the SDK list it already
 * holds, so a creator-controlled URL never reaches console chrome to be
 * rendered as an `href`, a `src`, or a thumbnail.
 *
 * A preset whose kind is outside the closed vocabulary is DROPPED rather than
 * passed through, so an SDK that adds a kind cannot put an unrenderable entry
 * into console chrome.
 */
export const announcedPresets = <T extends { id: string; kind: string; label: string }>(
  presets: T[],
): AnnouncedPreset[] =>
  presets.flatMap((p) => {
    const kind = ANNOUNCED_KIND[p.kind];
    if (!kind) return [];
    return [{ id: p.id, label: p.label, kind, mirrored: isMirrored(kind) }];
  });
