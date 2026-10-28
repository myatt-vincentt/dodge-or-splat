/**
 * QA-F17-G3 · the required-REJECT corpus AT THE `v2-template` CI SEAM.
 *
 * The catalog requires this corpus to be asserted in TWO places, and the second
 * is not redundant: the CLI's `validateZonePath` protects a creator's machine at
 * upgrade time, and `scripts/check-zone-manifest.mjs` protects THE ARTIFACT at
 * tag time. They are two implementations of one floor, in two repos, and that
 * is precisely the shape where two green suites certify a drift.
 *
 * A CHECK THAT DOES NOT RUN AT THE TAG DOES NOT PROTECT THE ARTIFACT — which is
 * why the catalog names `smoke-build.yml` AND `release.yml`, and why the last
 * test here reads the workflows rather than trusting that someone wired it.
 *
 * ONE TABLE, ONE CASE (the budget ruling): every row exercises the same seam
 * with the same assertion.
 */
import { test, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { checkEntry } = await import(path.join(REPO, 'scripts/check-zone-manifest.mjs'));

/**
 * `checkEntry` RETURNS AN ARRAY OF REASON STRINGS. Empty means accepted.
 *
 * Named here once because the first version of this file assumed a
 * `{ok:false, rule}` object — the CLI floor's shape — and every assertion then
 * read `result.ok !== true` on an array, which is `undefined !== true`, i.e.
 * TRUE for an accepted path as well as a refused one. Test 1 passed while
 * asserting nothing, and that is the exact failure mode this whole file exists
 * to prevent. The two repos really do return different shapes; the corpus is
 * shared, the plumbing is not.
 */
const refusals = (entry, zone) => checkEntry(entry, zone) ?? [];
const isRefused = (entry, zone) => refusals(entry, zone).length > 0;

/**
 * The required-REJECT corpus.
 *
 * Transcribed from the CATALOG, not read off either implementation. Where the
 * two repos disagree about a path, one of these fails — which is the whole
 * reason the corpus is asserted twice.
 */
const REQUIRED_REJECT = [
  // Rule 4 — a segment begins with a dot.
  '.git/hooks/pre-commit',
  '.git/config',
  '.env',
  '.npmrc',
  '.gitignore',
  '.github/workflows/release.yml',
  // `.eslintrc.json` CANNOT PASS THE FLOOR, so it is not in the manifest. The
  // template ships it, and rule 4 refuses every dot-leading root file before
  // any allowlist is consulted — so it joins `scripts/*.mjs` in the
  // reported-not-upgraded set rather than the floor being widened for it.
  '.eslintrc.json',
  // Rule 5 — node_modules.
  'node_modules/.bin/esbuild',
  // Rule 6 — top-level absence.
  'pnpm-lock.yaml',
  'Makefile',
  'Dockerfile',
  // Rule 2 / 6 / 7 — the creator's surface and the grounding contracts.
  //
  // `src/Scene.tsx` is the one entry that NEEDS a deny-by-name: it is a
  // two-segment `src/` path with an allowed extension, so every structural rule
  // admits it. The three grounding contracts are single-segment root files
  // absent from the allowlist, so rule 6 refuses them and rule 7 refuses the
  // `.md` again — they need no deny entry, and adding one would put a
  // vendor-specific agent filename into shipped source.
  'src/Scene.tsx',
  'AGENTS.md',
  'GROUNDING.md',
  'CLAUDE.md',
  // Rule 1 — the unicode family. Each renders as an ordinary path in a
  // manifest diff while naming a different file, which defeats the human review
  // that is the last control once the mechanical ones are satisfied.
  'src/App\u202Etsx.txt',
  'src/\u0410pp.tsx',
  'src/App\u2215Scene.tsx',
  'src/App.tsx\u200B',
  'src/App.tsx\u00A0',
  // Rule 6 — the build scripts execute on the creator's machine.
  'scripts/dev.mjs',
  'scripts/preview.mjs',
  'scripts/build.mjs',
  // Rule 3 — traversal and absolutes.
  '../../etc/passwd',
  '/etc/passwd',
  'src/../../x',
  'C:\\x',
  'src\\App.tsx',
  // Rule 7 — extensions the floor must close.
  'src/setup.sh',
  'src/config.yaml',
];

/**
 * The POSITIVE CONTROL: the real manifest's own `platform` list.
 *
 * WITHOUT IT A FLOOR THAT REJECTS EVERYTHING SCORES GREEN — and that is not
 * hypothetical here: the publish validator this floor replaced hard-requires
 * `index.html` and FAILS the legitimate zone set, so a reuse would have gone
 * red on the happy path and the cheapest fix would have been to drop the
 * control while the record still claimed it.
 *
 * Read from the SHIPPED manifest rather than a copy, so the control is the
 * artifact's own list.
 */
const MANIFEST_PATH = path.join(REPO, '.vincentt-template.json');

test('QA-F17-G3 (CI seam): every required-REJECT entry is refused, and names its rule', () => {
  const accepted = [];
  for (const entry of REQUIRED_REJECT) {
    if (!isRefused(entry, 'platform')) accepted.push(entry);
  }
  expect(accepted, `the v2-template floor ACCEPTED ${accepted.length} impermissible path(s):\n` +
      `${JSON.stringify(accepted, null, 2)}\n` +
      `These are refused by the CLI's own floor. Two implementations of one floor in ` +
      `two repos that disagree is the drift a contract-tier corpus exists to catch: ` +
      `the CLI would refuse the manifest a tag shipped as valid.`).toEqual([]);
});

test('QA-F17-G3 (CI seam): `src/Scene.tsx` is refused under `platform` and ACCEPTED under `creator`', () => {
  // `creator` is the never-written list, so a denied name there is the manifest
  // AGREEING with the floor rather than attacking it. Applying the deny rule to
  // both arrays refuses every legitimate manifest — the same defect shape as
  // the publish validator's `index.html` requirement.
  const asPlatform = refusals('src/Scene.tsx', 'platform');
  expect(asPlatform.length > 0, 'src/Scene.tsx was accepted under `platform`. It passes every structural rule, so ' +
      'only a deny-by-name stops a manifest that lists the creator\'s own file as a ' +
      'write target — and the whole safety argument rests on that file.').toBe(true);

  const asCreator = refusals('src/Scene.tsx', 'creator');
  expect(asCreator.length === 0, `src/Scene.tsx was REFUSED under \`creator\`: ${JSON.stringify(asCreator)}. That ` +
      `refuses the legitimate zone set, which is how a control that fails the happy ` +
      `path gets dropped under build pressure.`).toBe(true);
});

test('QA-F17-G3 (CI seam): the SHIPPED manifest passes its own floor', () => {
  if (!existsSync(MANIFEST_PATH)) {
    expect.unreachable(`no .vincentt-template.json at ${MANIFEST_PATH}. The manifest is the zone ` +
        `authority and is per-version; without it every upgrade is BLOCKED, which is ` +
        `the day-one state rather than a passing one.`);
  }
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
  expect(manifest.schema, 'the manifest schema is not 1').toBe(1);

  const refused = [];
  for (const zone of ['platform', 'creator']) {
    for (const entry of manifest[zone] ?? []) {
      const reasons = refusals(entry, zone);
      if (reasons.length > 0) refused.push({ zone, entry, reasons });
    }
  }
  expect(refused, `the shipped manifest's own entries were refused by the floor:\n` +
      `${JSON.stringify(refused, null, 2)}`).toEqual([]);

  // The positive control has to be non-trivial: an empty `platform` list would
  // satisfy the loop above while shipping a manifest that upgrades nothing.
  expect((manifest.platform ?? []).length >= 10, `the manifest's platform list holds ${(manifest.platform ?? []).length} entries; a ` +
      `near-empty overwrite set makes this control vacuous`).toBe(true);
  // And `src/Scene.tsx` is in `creator` and NEVER in `platform` — contract
  // obligation 6, one line, because the whole safety argument rests on it.
  expect((manifest.creator ?? []).includes('src/Scene.tsx'), 'src/Scene.tsx is not in the manifest\'s `creator` list').toBe(true);
  expect(!(manifest.platform ?? []).includes('src/Scene.tsx'), 'src/Scene.tsx is in the manifest\'s `platform` list — the overwrite set').toBe(true);
});

test('QA-F17-G3 (CI seam): the check runs in BOTH smoke-build.yml AND release.yml', () => {
  // A CHECK THAT DOES NOT RUN AT THE TAG DOES NOT PROTECT THE ARTIFACT. The
  // manifest at the TAG is the one every `vincentt upgrade` reads, so a PR-only
  // check leaves a single-actor lever over the file that decides what may be
  // overwritten in every creator's repository.
  for (const wf of ['smoke-build.yml', 'release.yml']) {
    const file = path.join(REPO, '.github/workflows', wf);
    expect(existsSync(file), `no ${wf}`).toBe(true);
    const body = readFileSync(file, 'utf8');
    expect(body.includes('check-zone-manifest.mjs'), `${wf} does not run scripts/check-zone-manifest.mjs. ` +
        (wf === 'release.yml'
          ? 'At the tag this is the only thing standing between a hostile manifest and ' +
            'every creator who upgrades.'
          : 'A manifest edit would reach the tag unchecked.')).toBe(true);
  }

  // In `release.yml` it must run BEFORE the tag becomes `latest`, or a refused
  // manifest has already become the artifact creators scaffold from.
  //
  // ANCHORED ON THE STEP, NOT ON THE WORD. A `/latest/` search matches the
  // workflow's own header prose (`Moves the \`latest\` tag to…`) and
  // `runs-on: ubuntu-latest`, both of which precede every step — so the naive
  // search reported a correct workflow as broken. The subject is the ordering
  // of two STEPS, so the assertion locates two steps.
  const release = readFileSync(path.join(REPO, '.github/workflows/release.yml'), 'utf8');
  const checkIdx = release.indexOf('check-zone-manifest.mjs');
  expect(checkIdx >= 0, 'release.yml does not run the manifest check').toBe(true);

  const moveStep = release.search(/^\s*-\s*name:\s*Move\s*`?latest`?/m);
  expect(moveStep >= 0, 'release.yml has no `Move latest` step; the ordering this asserts cannot be located, ' +
      'so the assertion would pass vacuously').toBe(true);
  expect(checkIdx < moveStep, `the manifest check (offset ${checkIdx}) runs AFTER the \`Move latest\` step ` +
      `(offset ${moveStep}). A refused manifest would already have become the artifact ` +
      `every new creator scaffolds from.`).toBe(true);
});
