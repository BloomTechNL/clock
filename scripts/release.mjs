import process from 'node:process';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  readFileSync,
  readdirSync,
  writeFileSync,
  mkdtempSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { CommitParser } from 'conventional-commits-parser';
import semver from 'semver';

const manifest = JSON.parse(readFileSync('package.json', 'utf8'));
const registry = 'https://registry.npmjs.org';
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const head = git('rev-parse', 'HEAD');

function command(program, ...args) {
  execFileSync(program, args, { stdio: 'inherit' });
}

async function readRegistry() {
  const response = await globalThis.fetch(
    `${registry}/${encodeURIComponent(manifest.name)}`,
    {
      headers: { 'cache-control': 'no-cache' },
      signal: globalThis.AbortSignal.timeout(30000),
    },
  );
  if (response.status === 404) return null;
  if (!response.ok)
    throw new Error(`npm registry returned HTTP ${response.status}`);
  return response.json();
}

function tagRelease(version, commit) {
  const tag = `v${version}`;
  const existing = git('tag', '--list', tag);
  if (existing) {
    if (git('rev-list', '-n', '1', tag) !== commit) {
      throw new Error(`${tag} does not point to the published commit`);
    }
    return;
  }
  command('git', 'tag', tag, commit);
  command('git', 'push', 'origin', `refs/tags/${tag}`);
}

function nextVersion(previous, base) {
  const parser = new CommitParser({
    breakingHeaderPattern: /^(\w*)(?:\((.*)\))?!: (.*)$/,
    noteKeywords: ['BREAKING CHANGE', 'BREAKING-CHANGE'],
  });
  const messages = git('log', '-z', '--format=%B', `${base}..HEAD`).split('\0');
  let bump;
  for (const message of messages) {
    if (!message.trim()) continue;
    const commit = parser.parse(message);
    if (commit.notes.length > 0) return semver.inc(previous, 'major');
    if (commit.type === 'feat') bump = 'minor';
    if (commit.type === 'fix' && !bump) bump = 'patch';
  }
  return bump ? semver.inc(previous, bump) : null;
}

function smokeTest(tarball, version) {
  const directory = mkdtempSync(join(tmpdir(), 'clock-smoke-'));
  try {
    execFileSync(
      'npm',
      ['install', '--ignore-scripts', '--no-audit', '--no-fund', tarball],
      {
        cwd: directory,
        stdio: 'inherit',
      },
    );
    execFileSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        "import { SystemClock } from '@bloom-group/clock'; import { FileClockStorage } from '@bloom-group/clock/file'; if (!(await new SystemClock().now()) || typeof FileClockStorage !== 'function') throw new Error('Invalid package exports');",
      ],
      { cwd: directory, stdio: 'inherit' },
    );
    const installed = JSON.parse(
      readFileSync(
        join(directory, 'node_modules', manifest.name, 'package.json'),
        'utf8',
      ),
    );
    if (installed.version !== version || installed.releaseCommit !== head) {
      throw new Error('The packed release version or commit does not match');
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function pack(version) {
  const directory = mkdtempSync(join(tmpdir(), 'clock-pack-'));
  try {
    command('pnpm', 'build');
    writeFileSync(
      'package.json',
      JSON.stringify({ ...manifest, version, releaseCommit: head }, null, 2) +
        '\n',
    );
    command('npm', 'pack', '--ignore-scripts', '--pack-destination', directory);
    const [filename] = readdirSync(directory);
    const tarball = join(directory, filename);
    smokeTest(tarball, version);
    return tarball;
  } catch (error) {
    rmSync(directory, { recursive: true, force: true });
    throw error;
  } finally {
    writeFileSync('package.json', originalManifest);
  }
}

const originalManifest = readFileSync('package.json');

function isCurrentMain() {
  const remoteHead = git(
    'ls-remote',
    '--exit-code',
    'origin',
    'refs/heads/main',
  ).split('\t')[0];
  if (head === remoteHead) return true;
  process.stdout.write('A newer push is on main. Skipping this release.\n');
  return false;
}

async function release() {
  if (!isCurrentMain()) return;
  const published = await readRegistry();
  if (!published) {
    process.stdout.write(
      'Initial npm publish pending. See the bootstrap steps in AGENTS.md.\n',
    );
    return;
  }
  const latest = published?.['dist-tags']?.latest;
  if (!semver.valid(latest) || semver.prerelease(latest)) {
    throw new Error(
      'A stable npm latest version is required. See the bootstrap steps in AGENTS.md.',
    );
  }

  const versionManifest = published.versions[latest];
  let base = versionManifest.releaseCommit ?? versionManifest.gitHead;
  if (!base && git('tag', '--list', `v${latest}`)) {
    base = git('rev-list', '-n', '1', `v${latest}`);
  }
  if (
    !/^[0-9a-f]{40}$/.test(base ?? '') ||
    spawnSync('git', ['merge-base', '--is-ancestor', base, head]).status !== 0
  ) {
    throw new Error(
      `Cannot establish the main commit for npm version ${latest}`,
    );
  }
  tagRelease(latest, base);
  const version = nextVersion(latest, base);
  if (!version) {
    process.stdout.write(
      'No release-worthy commits since the last published version.\n',
    );
    return;
  }
  if (published.versions[version] || git('tag', '--list', `v${version}`)) {
    throw new Error(
      `Release version ${version} already exists. Check npm dist-tags and Git tags.`,
    );
  }

  const tarball = pack(version);
  try {
    const current = await readRegistry();
    if (
      current?.['dist-tags']?.latest !== latest ||
      current?.versions[version]
    ) {
      throw new Error(
        'npm changed while preparing the release. Rerun from main.',
      );
    }
    if (!isCurrentMain()) return;
    command('npm', 'publish', tarball, '--access', 'public', '--tag', 'latest');
    tagRelease(version, head);
  } finally {
    rmSync(dirname(tarball), { recursive: true, force: true });
  }
}

switch (process.argv[2]) {
  case 'check':
  case 'bootstrap': {
    if (
      process.argv[2] === 'bootstrap' &&
      (git('status', '--porcelain') || !isCurrentMain())
    ) {
      throw new Error('Bootstrap requires a clean checkout of origin/main');
    }
    const tarball = pack(manifest.version);
    if (process.argv[2] === 'bootstrap') {
      process.stdout.write(`Initial release tarball: ${tarball}\n`);
    } else {
      rmSync(dirname(tarball), { recursive: true, force: true });
    }
    break;
  }
  case 'publish':
    await release();
    break;
  default:
    throw new Error('Expected check, bootstrap, or publish');
}
