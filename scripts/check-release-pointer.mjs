// Daily check of what `vincentt init` actually hands a creator: the `latest`
// tag. Fails when `latest` is not the highest release tag (a release job died
// before moving it), or when the SDK/harness versions locked at `latest` are
// not npm's `latest` dist-tag (a package shipped and the template never
// followed). Reads the repo this file lives in; tags must be fetched.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const POINTER = 'latest';
export const FOLLOWED = ['@vincentt-xr/sdk', '@vincentt-xr/harness'];

const RELEASE_TAG = /^(\d+)\.(\d+)\.(\d+)$/;

export function highestReleaseTag(tags) {
  let best = null;
  for (const tag of tags) {
    const m = RELEASE_TAG.exec(tag.trim());
    if (!m) continue;
    const parts = m.slice(1).map(Number);
    if (!best || compareParts(parts, best.parts) > 0) best = { tag: tag.trim(), parts };
  }
  return best?.tag ?? null;
}

function compareParts(a, b) {
  for (let i = 0; i < 3; i += 1) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

// The version the root importer resolves `pkg` to. The lockfile, not the
// package.json specifier, is what a scaffold installs: `^1.5.0` says nothing
// about which 1.x a creator gets.
export function lockedVersion(lockText, pkg) {
  const lines = lockText.split('\n');
  const start = lines.findIndex((l) => l === 'importers:');
  if (start === -1) return null;
  const rootAt = lines.findIndex((l, i) => i > start && l === '  .:');
  if (rootAt === -1) return null;
  const keys = [`      '${pkg}':`, `      ${pkg}:`];
  for (let i = rootAt + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^ {0,2}\S/.test(line)) break;
    if (!keys.includes(line)) continue;
    for (let j = i + 1; j < lines.length && lines[j].startsWith('        '); j += 1) {
      const m = /^ {8}version: ([^(\s]+)/.exec(lines[j]);
      if (m) return m[1];
    }
    return null;
  }
  return null;
}

export function pointerFailures({ pointerSha, highestTag, highestSha }) {
  if (!highestTag) return ['no bare-semver release tag found'];
  if (!pointerSha) return [`tag \`${POINTER}\` does not exist`];
  if (pointerSha !== highestSha) {
    return [
      `\`${POINTER}\` is at ${pointerSha}, but the highest release tag ${highestTag} is at ${highestSha}; the release job for ${highestTag} did not move \`${POINTER}\``,
    ];
  }
  return [];
}

export function pinFailures(locked, distLatest) {
  const failures = [];
  for (const pkg of FOLLOWED) {
    const have = locked[pkg];
    const want = distLatest[pkg];
    if (!have) failures.push(`${pkg} is not locked in the template at \`${POINTER}\``);
    else if (!want) failures.push(`${pkg} has no \`latest\` dist-tag on npm`);
    else if (have !== want) {
      failures.push(`${pkg}: the template at \`${POINTER}\` locks ${have}, npm \`latest\` is ${want}`);
    }
  }
  return failures;
}

function git(...args) {
  const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
  return execFileSync('git', ['-C', root, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
}

function tagSha(tag) {
  try {
    return git('rev-list', '-n1', `refs/tags/${tag}`);
  } catch {
    return null;
  }
}

function main() {
  const highestTag = highestReleaseTag(git('tag', '-l').split('\n'));
  const failures = pointerFailures({
    pointerSha: tagSha(POINTER),
    highestTag,
    highestSha: highestTag ? tagSha(highestTag) : null,
  });

  if (tagSha(POINTER)) {
    const lockText = git('show', `refs/tags/${POINTER}:pnpm-lock.yaml`);
    const locked = {};
    const distLatest = {};
    for (const pkg of FOLLOWED) {
      locked[pkg] = lockedVersion(lockText, pkg);
      const tags = JSON.parse(
        execFileSync('npm', ['view', pkg, 'dist-tags', '--json'], { encoding: 'utf8' }),
      );
      distLatest[pkg] = tags.latest ?? null;
      console.log(`${pkg}: locked at \`${POINTER}\` ${locked[pkg]}, npm latest ${distLatest[pkg]}`);
    }
    failures.push(...pinFailures(locked, distLatest));
  }

  console.log(`\`${POINTER}\` -> ${tagSha(POINTER)}; highest release tag ${highestTag}`);
  if (failures.length === 0) console.log('OK');
  for (const f of failures) console.log(`::error::${f}`);
  process.exit(failures.length ? 1 : 0);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
