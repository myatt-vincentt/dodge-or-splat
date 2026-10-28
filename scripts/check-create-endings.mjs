#!/usr/bin/env node
// The cross-repo assertion, template side — create-nontty-exit implementation.md
// §"Cross-repo assertion → The AGENTS.md fixture".
//
// The create-endings section in AGENTS.md describes what `vincentt create` returns. The behavior
// it describes lives in @vincentt-xr/cli, in a different repository on a different release
// cadence. AGENTS.md is copied into every project a creator scaffolds and is never read back, so a
// behavior change that does not land here in the same change is unseeable, unwarnable and
// unfixable (B-F2-9) — and this is the artifact with the failure history.
//
// This repo cannot run the CLI's suite, so it compares AGENTS.md's marked region against the
// tracked copy in `.github/agents-md-create.section.md`. The toolchain repo closes the loop from
// the other side: its own suite asserts the CLI's actual endings match the same fixture at
// `packages/cli/test/fixtures/agents-md-create-section.md`. Both repositories stay green only if
// both move.
//
// Deliberately no network fetch. A cross-repo check whose correctness depends on the network is a
// check that can be green because the network was down, and a bad version pin 404s into a vacuous
// pass. The tracked-copy shape is the one `check-recognition.mjs` already ships.

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BEGIN = '<!-- BEGIN create-endings (generated from @vincentt-xr/cli — do not edit here) -->';
const END = '<!-- END create-endings -->';

const SOURCE_REPO = 'vincentt-xr/toolchain';
const SOURCE_FIXTURE = 'packages/cli/test/fixtures/agents-md-create-section.md';

function fail(message) {
  console.error(`::error file=AGENTS.md::${message}`);
  process.exit(1);
}

const agentsPath = join(ROOT, 'AGENTS.md');
const trackedPath = join(ROOT, '.github/agents-md-create.section.md');

if (!existsSync(trackedPath)) {
  fail(
    `.github/agents-md-create.section.md is missing. It is the tracked copy of ${SOURCE_FIXTURE} ` +
      `in ${SOURCE_REPO} that this check compares against; without it this check would silently ` +
      `pass with nothing checked.`,
  );
}

const agents = readFileSync(agentsPath, 'utf8');
const tracked = readFileSync(trackedPath, 'utf8');

const begin = agents.indexOf(BEGIN);
const end = agents.indexOf(END);

if (begin === -1 || end === -1) {
  fail(
    `AGENTS.md carries no create-endings section. It describes what \`vincentt create\` returns ` +
      `and is asserted against ${SOURCE_FIXTURE} in ${SOURCE_REPO}; bring that fixture across ` +
      `into .github/agents-md-create.section.md and into AGENTS.md.`,
  );
}
if (end < begin) {
  fail(
    'the create-endings END marker precedes its BEGIN marker. An unclosed BEGIN swallows the ' +
      'rest of AGENTS.md into the generated region.',
  );
}
if (agents.split(BEGIN).length - 1 !== 1 || agents.split(END).length - 1 !== 1) {
  fail('AGENTS.md must carry exactly one BEGIN and one END create-endings marker.');
}

const section = `${agents.slice(begin, end + END.length)}\n`;

if (section !== tracked) {
  const n = Math.min(section.length, tracked.length);
  let offset = section.length === tracked.length ? -1 : n;
  for (let i = 0; i < n; i += 1) {
    if (section[i] !== tracked[i]) {
      offset = i;
      break;
    }
  }
  fail(
    `the create-endings section in AGENTS.md differs from the tracked copy at byte ${offset}. ` +
      `This section describes behavior owned by ${SOURCE_REPO} — change ${SOURCE_FIXTURE} there, ` +
      `let its suite prove the CLI actually ends that way, and bring the result across. Edited ` +
      `here alone, a claim about create's exit codes reaches every creator's tree without ` +
      `anything having asserted it is true.`,
  );
}

console.log('create-endings section matches its tracked copy.');
