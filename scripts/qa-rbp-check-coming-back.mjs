#!/usr/bin/env node
// QA-F2-G34 · ASSERTION B — the cross-repo contract's `v2-template` half.
//
// EXEMPT case, always written. The listing verb's behavior changes, and
// AGENTS.md is the ONE text site that does not ship inside the same versioned
// artifact as the code: it is scaffolded into the creator's repository at `init`
// time and is never read back. So it is asserted here rather than in `toolchain`
// — a `toolchain` runner checks out `toolchain` alone, and a hardcoded copy of
// this file's text would pass while the real file drifts. f14 recorded that
// failure verbatim when it moved three arms out of qa.f14.subtractive.test.ts.
//
// ─────────────────────────────────────────────────────────────────────────────
// THREE OUTCOMES, the shape of QA-F14-08(a).
//
// The honest subject is WHAT `init` ACTUALLY CLONES. The CLI's
// DEFAULT_TEMPLATE_REF is "latest" (toolchain scaffold/index.ts), which is a
// moving tag — not `main`, and not a PR branch. So:
//
//   PASS    — the ref `init` clones carries the verb, the remedy, the guidance,
//             the verbatim unknown string, and the do-not-cd instruction.
//   BLOCKED — the ref PREDATES the guidance entirely: it carries no `### Picking
//             up a project` section at all. That is the narrow, checkable
//             "the tag has not moved yet" condition, and it is the EXPECTED
//             state in the window between merging this change and cutting the
//             tag. It is reported, never passed, and never silently skipped.
//   FAIL    — the ref HAS the section but with different words. That is drift,
//             and it is loud. A tag that half-carries the contract is worse than
//             one that does not carry it, because the promise reads as kept.
//
// `deployment-plan.md` must carry the tag cut. The v2-template PR is not a
// follow-up: until `latest` moves, every repository scaffolded by `init` gets a
// contract that does not know the listing reports a location.
// ─────────────────────────────────────────────────────────────────────────────

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** The ref `vincentt init` actually clones. Not `main`, not a branch. */
const CLONED_REF = process.env.QA_RBP_REF ?? 'latest';

/**
 * What the contract must carry. Each is matched VERBATIM, because an agent
 * matching the CLI's output has to find the same words in both places — that is
 * the whole reason the unknown string is repeated rather than paraphrased.
 */
const REQUIRED = [
  {
    needle: 'vincentt projects',
    why:
      'the verb list does not name `vincentt projects`. The recognition section promises the ' +
      'contract says how to find out which project a folder is; the listing verb is that answer.',
  },
  {
    needle: 'vincentt link <project-id>',
    why:
      'the contract does not name `vincentt link <project-id>`. It is the remedy the unknown ' +
      'case points at, and without it that branch has no next step.',
  },
  {
    needle: 'no folder known on this machine',
    why:
      'the contract does not repeat the CLI\'s unknown-case string verbatim. An agent matching ' +
      'output must find the same words here.',
  },
  {
    needle: 'It does not go there.',
    why:
      'the contract does not say the listing reports a location without going there. An agent ' +
      'handed a path is the reader most likely to `cd` into it.',
  },
  {
    needle: 'Do not `cd` into it',
    why:
      'the contract does not name the literal verb an agent is about to emit. "Do not change ' +
      'directory" is the concept; `cd` is the token.',
  },
];

/** The section whose ABSENCE is what makes a stale tag BLOCKED rather than FAIL. */
const SECTION = '### Picking up a project';

function contractAt(ref) {
  try {
    return execFileSync('git', ['show', `${ref}:AGENTS.md`], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch {
    return undefined;
  }
}

function report(verdict, lines) {
  console.log(`QA-F2-G34(B) · ${verdict}`);
  for (const l of lines) console.log(`  ${l}`);
}

const onDisk = readFileSync(join(ROOT, 'AGENTS.md'), 'utf8');
const atRef = contractAt(CLONED_REF);

// The working tree is checked first and unconditionally: it is what the PR is
// asking to merge, and a missing needle here is a FAIL at any tag state.
const treeMissing = REQUIRED.filter((r) => !onDisk.includes(r.needle));
if (!onDisk.includes(SECTION)) {
  treeMissing.push({ needle: SECTION, why: 'the contract carries no coming-back guidance.' });
}
if (treeMissing.length > 0) {
  report('FAIL — the working tree does not carry the contract', treeMissing.map((m) => m.why));
  for (const m of treeMissing) console.error(`::error file=AGENTS.md::${m.why}`);
  process.exit(1);
}

if (atRef === undefined) {
  report('BLOCKED', [
    `the ref \`${CLONED_REF}\` does not exist in this checkout, so what \`init\` clones cannot be read.`,
    'Fetch tags, or cut the tag. This is not a pass.',
  ]);
  process.exit(0);
}

const refMissing = REQUIRED.filter((r) => !atRef.includes(r.needle));
const refHasSection = atRef.includes(SECTION);

if (refMissing.length === 0 && refHasSection) {
  report('PASS', [
    `the ref \`${CLONED_REF}\` — which is what \`vincentt init\` clones — carries the listing verb,`,
    'the link remedy, the coming-back guidance, the verbatim unknown string and the do-not-cd rule.',
  ]);
  process.exit(0);
}

if (!refHasSection) {
  // The NARROW checkable condition: the tag predates the guidance entirely.
  report('BLOCKED — the tag has not moved yet', [
    `the ref \`${CLONED_REF}\` carries no "${SECTION}" section at all, so it predates this change.`,
    'This is the EXPECTED state between merging and cutting the tag, and it is why',
    '`deployment-plan.md` must carry the tag cut. Every repository scaffolded before the tag',
    'moves keeps a contract that does not know the listing reports a location — the creator',
    'loses a shortcut, never an ability, because the capability lives in the CLI.',
    '',
    'Flips to PASS with no edit to this check once `latest` moves.',
  ]);
  process.exit(0);
}

// The tag HAS the section but with different words. Loud.
report('FAIL — the tag carries the section with different words', [
  `the ref \`${CLONED_REF}\` has "${SECTION}" but is missing:`,
  ...refMissing.map((m) => `- ${m.needle}: ${m.why}`),
  '',
  'A tag that half-carries the contract is worse than one that does not: the promise reads as',
  'kept while an agent matching the CLI\'s output finds different words.',
]);
for (const m of refMissing) console.error(`::error file=AGENTS.md::${m.why}`);
process.exit(1);
