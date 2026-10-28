#!/usr/bin/env node
// The assembly check, template side — f14 implementation.md §4(2).
//
// The recognition section in AGENTS.md is GENERATED from `recognition.md` in vincentt-xr/
// agent-plugin. It is not authored here, and a hand-edit to it must fail the build with a message
// naming the source — otherwise a sentence could reach every creator's tree without ever reaching
// the file that also feeds the package, which is exactly the duplication the rule forbids.
//
// This repo cannot import the assembler (different repo, different release cadence), so it
// compares AGENTS.md's marked region against the tracked rendering in
// `.github/recognition.section.md`. The agent-plugin's own release gate closes the loop from the
// other side: it refuses to publish unless v2-template@latest carries this exact section.

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BEGIN = '<!-- BEGIN recognition (generated from recognition.md — do not edit here) -->';
const END = '<!-- END recognition -->';

const SOURCE_REPO = 'vincentt-xr/agent-plugin';

function fail(message) {
  console.error(`::error file=AGENTS.md::${message}`);
  process.exit(1);
}

const agentsPath = join(ROOT, 'AGENTS.md');
const trackedPath = join(ROOT, '.github/recognition.section.md');

if (!existsSync(trackedPath)) {
  fail(
    `.github/recognition.section.md is missing. It is the tracked rendering the check compares ` +
      `against; without it this check would silently pass with nothing checked.`,
  );
}

const agents = readFileSync(agentsPath, 'utf8');
const tracked = readFileSync(trackedPath, 'utf8');

const begin = agents.indexOf(BEGIN);
const end = agents.indexOf(END);

if (begin === -1 || end === -1) {
  fail(
    `AGENTS.md carries no recognition section. It is generated from recognition.md in ` +
      `${SOURCE_REPO}; re-run that repo's assembly and copy the result in.`,
  );
}
if (end < begin) {
  fail(
    'the recognition END marker precedes its BEGIN marker. An unclosed BEGIN swallows the rest ' +
      'of AGENTS.md into the generated region.',
  );
}
if (agents.split(BEGIN).length - 1 !== 1 || agents.split(END).length - 1 !== 1) {
  fail('AGENTS.md must carry exactly one BEGIN and one END recognition marker.');
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
    `the recognition section in AGENTS.md differs from the tracked rendering at byte ${offset}. ` +
      `This section is GENERATED — edit recognition.md in ${SOURCE_REPO}, re-run its assembly, ` +
      `and bring the result across. A sentence added here alone reaches every creator's tree ` +
      `without reaching the package, which is the duplication the rule forbids.`,
  );
}

console.log('Recognition section matches its tracked rendering.');
