# dev-media

Optional dev-only preview media. Nothing here ships: only
`src/DevMediaSwitcher.tsx` reads this folder, and it is stripped from
production builds.

You don't need anything here. Without a webcam, `pnpm dev` starts on the SDK's
built-in "Person Shaking Head" video and lists every SDK sample video and
image. In development, 1–4 throw a pie, a suction dart, a snowball or a fish
that always hits (5: a random one with a bonk bump), and 0 wipes your face
clean. `?demo=0` stops the automatic throws.

To preview with your own clip, add it at `dev-media/splat.mp4` (H.264 MP4); it
is listed first and used as the start. Clips here are git-ignored. Restart
`pnpm dev` after adding or removing one.
