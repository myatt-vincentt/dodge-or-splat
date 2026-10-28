#!/usr/bin/env node
// Writes this template release's row to the platform release corpus
// (`POST /platform/releases`, component "template"), per f17 §2.3-§2.4.
//
// Reads the entry for the given version out of the root MIGRATION.md, which is
// this repo's whole treatment of the migration note: the template is not a
// changesets repo, so the note lives in a plain file keyed by tag rather than
// per-package. A MISSING OR MALFORMED ENTRY EXITS NON-ZERO — never best-effort
// — because a half-parsed note is worse than none: the corpus must never hold
// a note the endpoint would then serve incomplete.
//
// Run twice by release.yml: once with --dry-run as an early gate (parses and
// bounds-checks, no network, no secrets needed — so `latest` never moves for a
// tag with no valid note), and once for real after `latest` has moved, against
// every target in RELEASE_ROWS_TARGETS.
//
// --migration <path> reads the note from an explicit file instead of
// MIGRATION.md in the cwd. release.yml passes this pointed at a copy taken
// from origin/main, not from the tagged tree: the note is reviewed via PR into
// main and is append-only per version, so main's copy is the reviewed source
// for ANY tag — including one cut before this file existed, which the tagged
// tree can never carry.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const MIGRATION_FILE = 'MIGRATION.md';
const REQUEST_TIMEOUT_MS = 10_000;

// Mirrors the api's bounds (internal/domain/release.go) so a bad entry fails
// here, in review, rather than as a 400 from a workflow no one is watching.
// The api's content sanitizer (path tokens, tool imperatives, ANSI) is NOT
// duplicated here — that is server-enforced and the source of truth; this
// script only enforces what would otherwise fail silently at parse time.
export const MAX_SUMMARY = 200;
export const MAX_NOTES = 10;
export const MAX_NOTE_ENTRY = 500;

/** A MIGRATION.md entry could not be parsed, or none exists for the version. */
export class MigrationParseError extends Error {
  constructor(version, reason) {
    super(`MIGRATION.md entry for "${version}" is malformed: ${reason}`);
    this.version = version;
    this.reason = reason;
  }
}

const HEADING = /^##\s+(.+?)\s*$/;

// Splits MIGRATION.md into per-version blocks. Exported so a test can feed it
// a hostile fixture without touching disk.
export function splitEntries(content) {
  const lines = content.split(/\r?\n/);
  const blocks = new Map();
  let i = 0;
  while (i < lines.length && !HEADING.test(lines[i])) i += 1;
  while (i < lines.length) {
    const m = lines[i].match(HEADING);
    const version = m[1];
    i += 1;
    const body = [];
    while (i < lines.length && !HEADING.test(lines[i])) {
      body.push(lines[i]);
      i += 1;
    }
    blocks.set(version, body);
  }
  return blocks;
}

// Parses one version's block. STRICT: headings are exact published versions,
// `required` is mandatory and boolean, the summary is the first prose line,
// notes are `- ` bullets. Anything else — a missing required line, a missing
// summary, stray content after the notes — is the ENTIRE entry treated as
// absent, never partially parsed (f17 §2.4).
export function parseEntryBlock(version, blockLines) {
  let idx = 0;
  const skipBlank = () => {
    while (idx < blockLines.length && blockLines[idx].trim() === '') idx += 1;
  };

  skipBlank();
  const requiredLine = blockLines[idx];
  if (requiredLine !== 'required: true' && requiredLine !== 'required: false') {
    throw new MigrationParseError(version, 'missing or malformed "required: true|false" line');
  }
  const required = requiredLine === 'required: true';
  idx += 1;

  skipBlank();
  const summaryLine = blockLines[idx];
  if (
    summaryLine === undefined ||
    summaryLine.trim() === '' ||
    summaryLine.trim().startsWith('-')
  ) {
    throw new MigrationParseError(version, 'missing a summary line (the first prose line)');
  }
  const summary = summaryLine.trim();
  idx += 1;

  const notes = [];
  for (; idx < blockLines.length; idx += 1) {
    const trimmed = blockLines[idx].trim();
    if (trimmed === '') continue;
    if (trimmed.startsWith('- ')) {
      notes.push(trimmed.slice(2).trim());
      continue;
    }
    throw new MigrationParseError(
      version,
      `unexpected line after the summary (notes must be "- " bullets): "${blockLines[idx]}"`,
    );
  }

  return { required, summary, notes };
}

/** Bounds-checks a parsed entry, mirroring the api's MaxMigration* constants. */
export function validateBounds(version, entry) {
  if ([...entry.summary].length > MAX_SUMMARY) {
    throw new MigrationParseError(version, `summary exceeds ${MAX_SUMMARY} characters`);
  }
  if (entry.notes.length > MAX_NOTES) {
    throw new MigrationParseError(version, `more than ${MAX_NOTES} notes`);
  }
  for (const note of entry.notes) {
    if ([...note].length > MAX_NOTE_ENTRY) {
      throw new MigrationParseError(version, `a note exceeds ${MAX_NOTE_ENTRY} characters`);
    }
  }
}

/**
 * Finds and validates the entry for `version` in a MIGRATION.md's raw content.
 * Throws MigrationParseError on anything short of a clean, in-bounds entry.
 */
export function findEntry(content, version) {
  const blocks = splitEntries(content);
  if (!blocks.has(version)) {
    throw new MigrationParseError(version, 'no entry found for this version');
  }
  const entry = parseEntryBlock(version, blocks.get(version));
  validateBounds(version, entry);
  return entry;
}

/** Parses "name=url,name=url" into [{name, url}]. Throws on a malformed pair. */
export function parseTargets(spec) {
  return spec
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((pair) => {
      const eq = pair.indexOf('=');
      if (eq <= 0) {
        throw new Error(`malformed target "${pair}" in RELEASE_ROWS_TARGETS (expected name=url)`);
      }
      return { name: pair.slice(0, eq).trim(), url: pair.slice(eq + 1).trim() };
    });
}

/** The env var a target's release-publisher token is read from. */
export function tokenEnvVar(targetName) {
  return `RELEASE_PUBLISHER_TOKEN_${targetName.toUpperCase()}`;
}

/** Builds the POST body for one release row. Identical across every target. */
export function buildBody(version, entry) {
  return {
    component: 'template',
    version,
    migration: {
      required: entry.required,
      summary: entry.summary,
      notes: entry.notes,
    },
    source: {
      repo: 'vincentt-xr/v2-template',
      sha: process.env.GITHUB_SHA ?? '',
      runId: process.env.GITHUB_RUN_ID ?? '',
    },
  };
}

/**
 * POSTs the row to one target. Never throws — every outcome, including a
 * transport fault or a missing token, comes back as a tagged result so the
 * caller can report on every target before deciding whether to fail.
 *
 * outcome is 'written' | 'corrected' | 'unchanged' | 'refused' | 'error'.
 * 'corrected' is the newest row's note replaced in place; an api that predates
 * the `corrected` field reads as false.
 */
export async function postRelease(target, body, fetchImpl = fetch) {
  const token = process.env[tokenEnvVar(target.name)];
  if (!token) {
    return { target: target.name, outcome: 'error', detail: `${tokenEnvVar(target.name)} is not set` };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetchImpl(`${target.url}/platform/releases`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    let json = {};
    try {
      json = await res.json();
    } catch {
      // A non-JSON body on a non-2xx response is reported by status alone below.
    }
    if (res.ok) {
      if (json.corrected === true) {
        return { target: target.name, outcome: 'corrected', release: json.release };
      }
      return { target: target.name, outcome: json.written ? 'written' : 'unchanged' };
    }
    return {
      target: target.name,
      outcome: 'refused',
      code: json.code ?? `http_${res.status}`,
      reason: json.detail?.reason,
      message: json.message,
    };
  } catch (err) {
    const detail = err.name === 'AbortError' ? `timed out after ${REQUEST_TIMEOUT_MS}ms` : err.message;
    return { target: target.name, outcome: 'error', detail };
  } finally {
    clearTimeout(timer);
  }
}

export const SUCCESS_OUTCOMES = new Set(['written', 'corrected', 'unchanged']);

export function formatResult(result) {
  switch (result.outcome) {
    case 'written':
    case 'unchanged':
      return `${result.target}: ${result.outcome}`;
    case 'corrected':
      return result.release
        ? `${result.target}: corrected ${result.release}`
        : `${result.target}: corrected`;
    case 'refused':
      return `${result.target}: refused (${result.code}${result.reason ? `: ${result.reason}` : ''}${
        result.message ? ` — ${result.message}` : ''
      })`;
    default:
      return `${result.target}: error (${result.detail})`;
  }
}

/**
 * Parses argv into `{version, dryRun, migrationPath}`. `--migration` takes the
 * very next argv entry as its value (never sniffed as the version), and a
 * trailing `--migration` with nothing after it is a usage error rather than a
 * silently-ignored flag.
 */
export function parseArgs(argv) {
  const dryRun = argv.includes('--dry-run');
  const migrationIdx = argv.indexOf('--migration');
  let migrationPath;
  if (migrationIdx !== -1) {
    migrationPath = argv[migrationIdx + 1];
    if (!migrationPath) {
      throw new Error('--migration requires a path argument');
    }
  }
  const version = argv.find((a, i) => {
    if (a.startsWith('--')) return false;
    if (i > 0 && argv[i - 1] === '--migration') return false;
    return true;
  });
  return { version, dryRun, migrationPath };
}

async function main() {
  let version;
  let dryRun;
  let migrationPath;
  try {
    ({ version, dryRun, migrationPath } = parseArgs(process.argv.slice(2)));
  } catch (err) {
    console.error(`release-row: ${err.message}`);
    process.exit(1);
  }

  if (!version) {
    console.error('usage: release-row.mjs <version> [--dry-run] [--migration <path>]');
    process.exit(1);
  }

  const resolvedMigrationPath = migrationPath
    ? resolve(migrationPath)
    : resolve(process.cwd(), MIGRATION_FILE);
  let content;
  try {
    content = readFileSync(resolvedMigrationPath, 'utf8');
  } catch (err) {
    console.error(`release-row: could not read ${resolvedMigrationPath}: ${err.message}`);
    process.exit(1);
  }

  let entry;
  try {
    entry = findEntry(content, version);
  } catch (err) {
    console.error(`release-row: ${err.message}`);
    process.exit(1);
  }

  const body = buildBody(version, entry);

  if (dryRun) {
    console.log(JSON.stringify(body, null, 2));
    return;
  }

  const targetsSpec = process.env.RELEASE_ROWS_TARGETS;
  if (!targetsSpec) {
    console.error('release-row: RELEASE_ROWS_TARGETS is not set');
    process.exit(1);
  }

  let targets;
  try {
    targets = parseTargets(targetsSpec);
  } catch (err) {
    console.error(`release-row: ${err.message}`);
    process.exit(1);
  }

  // Every target is attempted before the run fails, so one bad token or one
  // down box does not hide the state of the others.
  const results = [];
  for (const target of targets) {
    results.push(await postRelease(target, body));
  }

  let failed = false;
  for (const result of results) {
    console.log(formatResult(result));
    if (!SUCCESS_OUTCOMES.has(result.outcome)) failed = true;
  }

  if (failed) process.exit(1);
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]).endsWith('release-row.mjs');
if (invokedDirectly) {
  main();
}
