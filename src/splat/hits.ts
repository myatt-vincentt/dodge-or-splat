// What is on your face right now. Every kind holds at most one hit; a new
// hit of the same kind starts it over. Each hit stays for its kind's LIFE
// (sliding off, melting or popping off at the end of it, see the pieces),
// then it is gone. Endless: no lives, no score, no end.
//
// A tiny store (useSyncExternalStore), changed only on a hit or when one is
// gone — never per frame.
import { useSyncExternalStore } from "react";

import { KINDS, type Kind } from "./props";

/** Seconds each kind stays on, its way off included. */
export const LIFE: Readonly<Record<Kind | "bump", number>> = {
  pie: 6.6,
  snow: 5.5,
  dart: 3.2,
  fish: 3.8,
  bump: 4,
};

export type Hit = {
  /** Unique per hit, so a new hit restarts its piece. */
  id: number;
  /** When it landed (performance.now() seconds). */
  at: number;
};

export type OnFace = Readonly<Record<Kind | "bump", Hit | null>>;

const empty = () =>
  Object.fromEntries([...KINDS, "bump"].map((k) => [k, null])) as Record<
    Kind | "bump",
    Hit | null
  >;

let state: OnFace = empty();
let nextId = 1;
const timers = new Map<Kind | "bump", number>();
const listeners = new Set<() => void>();
const set = (next: OnFace) => {
  state = next;
  listeners.forEach((l) => l());
};

const put = (what: Kind | "bump") => {
  const hit = { id: nextId, at: performance.now() / 1000 };
  nextId += 1;
  set({ ...state, [what]: hit });
  window.clearTimeout(timers.get(what));
  timers.set(
    what,
    window.setTimeout(() => {
      if (state[what]?.id === hit.id) set({ ...state, [what]: null });
    }, LIFE[what] * 1000),
  );
};

export const hits = {
  get: () => state,
  subscribe: (l: () => void) => {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
  /** A hit lands (and maybe raises a bonk bump). */
  hit: (kind: Kind, bonk: boolean) => {
    put(kind);
    if (bonk) put("bump");
  },
  /** Everything off at once (dev). */
  clear: () => {
    timers.forEach((t) => window.clearTimeout(t));
    timers.clear();
    set(empty());
  },
};

export const useOnFace = () =>
  useSyncExternalStore(hits.subscribe, hits.get, hits.get);

/** Seconds since a hit landed. */
export const ageOf = (hit: Hit) => performance.now() / 1000 - hit.at;
