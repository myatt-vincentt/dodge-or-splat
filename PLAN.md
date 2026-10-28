# Plan — Dodge or Splat

Funny things are thrown at your face, endlessly. Lean or duck to dodge them; stay put and wear
the splat. Built on SDK 2.0.0-alpha.9 with the vincentt.studio head accessories. Front camera,
one player. No lives, no score, no end, no words.

## Design

- Throws come from the viewer's side, like someone standing behind the phone: from just past a
  screen edge (left, right, a bottom corner, now and then the top), close to the camera, in a
  short arc into the front of the face, getting smaller as they go. Mostly cream pies, plus
  suction darts, snowballs and fish.
- Each throw aims at where your face is when it is thrown and doesn't follow it. Still there on
  arrival: a hit. Moved: it flies past in front of you and falls away; a close one gets a whoosh
  of speed streaks.
- Pace: one throw about every 1.8 s at first, building over 40 s of play to about one every
  0.8 s, sometimes two at once from opposite sides. Three hits in a row give a 3 s breather.
- Hits land hard and stay a while, then leave on their own:
  - pie: a burst of cream blobs, the tin dropping away and a quick squash of the face; a thick,
    lumpy coat of whipped cream on the face that slides down, drips off the chin and clears
  - snowball: a powdery puff, snow on the face that melts, a snow pile on the head that sinks
  - suction dart: a thwack, a wobble on the forehead, then it pops off
  - fish: a wet slap and a splash; it flops on the cheek and slides off
  - now and then a pink bonk bump with dizzy birds
- Tap the screen to throw a pie at the face from where you tapped.
- Hint: a small see-through ghost head below the face leans out of the way of a little pie. It
  goes for good after your first dodge.

## How it works

- `src/splat/director.ts`: when and what to throw, the pace and the breathers.
- `flight.ts` (unit-tested): how a throw travels, and hit / near miss / miss.
- `Projectiles.tsx` + `flyers.ts`: the throws in flight, drawn over everything.
- `Burst.tsx`: the moment of a hit. `Whoosh.tsx`: near misses.
- `hits.ts`: what is on your face right now. `FaceMess.tsx`: cream and snow on the live face
  mesh, with the face squash. `Stuck.tsx` + `Bump.tsx`: the dart, snow pile, fish and bump on the
  filtered head (`FilteredHead.tsx`, the SDK's canonical head fit through a spring, with the
  head occluder).
- `Hint.tsx`: the hint.
- Dev only: 1–4 throw a pie, dart, snowball or fish that always hits, 5 a random one with a
  bump, 0 clears the face, P pauses the throws; `window.__splat` has the readings and counts.
