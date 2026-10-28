#!/usr/bin/env node
// QA-F5-C4: the template carries the outside-files contract, host-neutral and pinned.
//
// "10 MB" and "2048 px" are the cross-repo pin against @vincentt-xr/cli's publish warning
// (QA-F4-C12/C13 in vincentt-xr/toolchain assert the same two literals on the CLI side).
// Text only, no network: a check that can pass because a fetch failed is not a check.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const SUBSECTION = '### Bringing in files from outside the library';
const BEFORE = '### Searching the curated library';
const AFTER = '## Communicating';
const CONNECTORS_URL = 'https://vincentt.studio/connectors';
const REQUIRED = ['public/assets/<source>/', 'CREDITS.md', '10 MB', '2048 px', 'meshopt'];
// B-F3-5: the contract names no agent host and uses no host's configuration syntax.
const HOSTS = ['Claude', 'Codex', 'Cursor', 'ChatGPT', 'Copilot', 'Windsurf', 'Gemini'];
const HOST_SYNTAX = ['mcp add', 'mcp.json', 'settings.json'];
const GROUNDING_SECTION = '## Assets and frame-loop performance';

const errors = [];
const fail = (file, message) => errors.push(`::error file=${file}::${message}`);

/** Headings outside fenced code blocks, with their line index and level. */
function headings(lines) {
  const out = [];
  let fence = null;
  lines.forEach((line, i) => {
    const m = /^\s*(`{3,}|~{3,})/.exec(line);
    if (m) {
      if (fence === null) fence = m[1][0];
      else if (m[1][0] === fence) fence = null;
      return;
    }
    if (fence !== null) return;
    const h = /^(#{1,6})\s/.exec(line);
    if (h) out.push({ i, level: h[1].length, text: line.trimEnd() });
  });
  return out;
}

/** Line ranges of every <!-- BEGIN x --> ... <!-- END x --> generated region. */
function generatedRegions(lines) {
  const regions = [];
  let open = -1;
  lines.forEach((line, i) => {
    if (/<!--\s*BEGIN\s/.test(line)) open = i;
    else if (/<!--\s*END\s/.test(line) && open !== -1) {
      regions.push([open, i]);
      open = -1;
    }
  });
  if (open !== -1) regions.push([open, lines.length - 1]);
  return regions;
}

function count(haystack, needle) {
  return haystack.split(needle).length - 1;
}

const agents = readFileSync(join(ROOT, 'AGENTS.md'), 'utf8');
const lines = agents.split('\n');
const hs = headings(lines);

const subs = hs.filter((h) => h.text === SUBSECTION);
if (subs.length !== 1) {
  fail('AGENTS.md', `expected exactly one "${SUBSECTION}", found ${subs.length}.`);
} else {
  const sub = subs[0];
  const before = hs.find((h) => h.text === BEFORE);
  const after = hs.find((h) => h.text === AFTER);
  if (!before || before.i > sub.i) {
    fail('AGENTS.md', `"${SUBSECTION}" must come after "${BEFORE}".`);
  }
  if (!after || after.i < sub.i) {
    fail('AGENTS.md', `"${SUBSECTION}" must come before "${AFTER}".`);
  }

  const next = hs.find((h) => h.i > sub.i && h.level <= 3);
  const endLine = next ? next.i : lines.length;
  for (const [b, e] of generatedRegions(lines)) {
    if (sub.i <= e && endLine > b) {
      fail(
        'AGENTS.md',
        `"${SUBSECTION}" overlaps the generated region at lines ${b + 1}-${e + 1}; a regeneration would erase it.`,
      );
    }
  }

  const body = lines.slice(sub.i, endLine).join('\n');
  for (const s of REQUIRED) {
    if (!body.includes(s)) fail('AGENTS.md', `"${SUBSECTION}" is missing the string "${s}".`);
  }
  const urlInBody = count(body, CONNECTORS_URL);
  const urlInFile = count(agents, CONNECTORS_URL);
  if (urlInBody !== 1 || urlInFile !== 1) {
    fail(
      'AGENTS.md',
      `"${CONNECTORS_URL}" must appear exactly once, in "${SUBSECTION}" (found ${urlInBody} there, ${urlInFile} in the file).`,
    );
  }
  for (const host of HOSTS) {
    if (new RegExp(`\\b${host}\\b`, 'i').test(body)) {
      fail('AGENTS.md', `"${SUBSECTION}" names the agent host "${host}". "Connector" is the only word for the mechanism (B-F3-5).`);
    }
  }
  for (const s of HOST_SYNTAX) {
    if (body.toLowerCase().includes(s)) {
      fail('AGENTS.md', `"${SUBSECTION}" uses host configuration syntax "${s}" (B-F3-5).`);
    }
  }
}

const grounding = readFileSync(join(ROOT, 'GROUNDING.md'), 'utf8');
const glines = grounding.split('\n');
const ghs = headings(glines);
const gsec = ghs.find((h) => h.text === GROUNDING_SECTION);
if (!gsec) {
  fail('GROUNDING.md', `"${GROUNDING_SECTION}" is missing.`);
} else {
  const gnext = ghs.find((h) => h.i > gsec.i && h.level <= 2);
  const gbody = glines.slice(gsec.i, gnext ? gnext.i : glines.length).join('\n');
  for (const s of ['Bringing in files from outside the library', 'CREDITS.md']) {
    if (!gbody.includes(s)) fail('GROUNDING.md', `"${GROUNDING_SECTION}" is missing the string "${s}".`);
  }
}

if (errors.length > 0) {
  for (const e of errors) console.error(e);
  process.exit(1);
}
console.log('outside-assets contract present, placed, pinned and host-neutral.');
