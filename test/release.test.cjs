const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const EXPECTED_RELEASE_PATHS = [
  'CSXS',
  'assets',
  'catalog',
  'client',
  'host',
  'README.md'
];

function writeExecutable(filePath, contents) {
  fs.writeFileSync(filePath, contents, { mode: 0o700 });
}

function runReleaseFixture({
  entries = EXPECTED_RELEASE_PATHS,
  forbiddenPath,
  symlinkPath,
  signerExit = 0,
  verifyExit = 0,
  securityExit = 77
}) {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'signed-zxp-test-'));
  const binPath = path.join(fixtureRoot, 'bin');
  const toolPath = path.join(fixtureRoot, 'ZXPSignCmd');
  const certificatePath = path.join(fixtureRoot, 'certificate.p12');
  const scriptPath = path.join(fixtureRoot, 'scripts', 'build-signed-zxp.sh');

  fs.mkdirSync(binPath);
  fs.mkdirSync(path.dirname(scriptPath));
  EXPECTED_RELEASE_PATHS.slice(0, -1).forEach((entry) => {
    fs.mkdirSync(path.join(fixtureRoot, entry));
  });
  fs.writeFileSync(path.join(fixtureRoot, 'README.md'), 'fixture readme\n');
  fs.writeFileSync(path.join(fixtureRoot, 'release-files.txt'), `${entries.join('\n')}\n`);
  fs.writeFileSync(certificatePath, 'fixture certificate\n');
  writeExecutable(toolPath, `#!/usr/bin/env bash
if [ "$1" = "-sign" ]; then
  touch "$3"
  exit ${signerExit}
fi
exit ${verifyExit}
`);
  writeExecutable(path.join(binPath, 'security'), securityExit === 0
    ? '#!/usr/bin/env bash\nprintf fixture-password\n'
    : '#!/usr/bin/env bash\necho security-should-not-run >&2\nexit 77\n');
  writeExecutable(path.join(binPath, 'uname'), '#!/usr/bin/env bash\necho x86_64\n');
  if (forbiddenPath) {
    const targetPath = path.join(fixtureRoot, forbiddenPath);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, 'forbidden fixture\n');
  }
  if (symlinkPath) {
    fs.symlinkSync('../README.md', path.join(fixtureRoot, symlinkPath));
  }

  const source = fs.readFileSync('scripts/build-signed-zxp.sh', 'utf8')
    .replace('/Users/aibd/Library/Application Support/Moo_Ai/ZXPSignCmd/ZXPSignCmd', toolPath)
    .replace('/Users/aibd/Library/Application Support/Moo_Ai/Signing/ArtboardSizeRenamer.p12', certificatePath);
  fs.writeFileSync(scriptPath, source, { mode: 0o700 });

  try {
    const result = spawnSync('/bin/bash', [scriptPath], {
      cwd: fixtureRoot,
      encoding: 'utf8',
      env: { ...process.env, PATH: `${binPath}:${process.env.PATH}` }
    });
    return { fixtureRoot, result };
  } catch (error) {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
    throw error;
  }
}

test('signed release allowlist contains only runtime files', () => {
  const entries = fs.readFileSync('release-files.txt', 'utf8')
    .split(/\r?\n/)
    .filter(Boolean);

  assert.deepEqual(entries, EXPECTED_RELEASE_PATHS);
  entries.forEach((entry) => assert.equal(fs.existsSync(entry), true));
  ['.git', '.DS_Store', 'node_modules', 'test', 'docs', 'releases'].forEach((forbidden) => {
    assert.equal(entries.includes(forbidden), false);
  });
});

test('signed release script keeps secrets external and verifies before publishing', () => {
  const script = fs.readFileSync('scripts/build-signed-zxp.sh', 'utf8');
  const verifyAt = script.indexOf('-verify');
  const publishAt = script.indexOf('mv -- "$temporary_zxp" "$output_zxp"');

  assert.match(script, /security find-generic-password/);
  assert.match(script, /Moo_Ai Artboard Size Renamer Signing/);
  assert.match(script, /\/Users\/aibd\/Library\/Application Support\/Moo_Ai\/ZXPSignCmd\/ZXPSignCmd/);
  assert.match(script, /\/Users\/aibd\/Library\/Application Support\/Moo_Ai\/Signing\/ArtboardSizeRenamer\.p12/);
  assert.match(script, /timestamp_url="http:\/\/timestamp\.digicert\.com"/);
  assert.match(script, /-tsa "\$timestamp_url"/);
  ['.git', '.DS_Store', 'node_modules', 'test', 'docs', 'releases', '*.p12', '*password*', 'zxpsigncmd'].forEach((forbidden) => {
    assert.match(script, new RegExp(forbidden.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
  });
  assert.doesNotMatch(script, /BEGIN (RSA )?PRIVATE KEY/);
  assert.ok(verifyAt >= 0);
  assert.ok(publishAt > verifyAt);
});

test('release build rejects a modified allowlist before reading Keychain secrets', () => {
  const { fixtureRoot, result } = runReleaseFixture({
    entries: [...EXPECTED_RELEASE_PATHS, 'test']
  });

  try {
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /release-files\.txt must contain exactly/);
    assert.doesNotMatch(result.stderr, /security-should-not-run/);
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test('release build rejects forbidden nested package content before reading Keychain secrets', () => {
  const { fixtureRoot, result } = runReleaseFixture({ forbiddenPath: 'assets/.DS_Store' });

  try {
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Forbidden release content/);
    assert.doesNotMatch(result.stderr, /security-should-not-run/);
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test('release build rejects nested certificates and symlinks before reading Keychain secrets', () => {
  const certificate = runReleaseFixture({ forbiddenPath: 'client/signing.p12' });
  const symlink = runReleaseFixture({ symlinkPath: 'host/readme-link' });

  try {
    assert.match(certificate.result.stderr, /Forbidden release content/);
    assert.doesNotMatch(certificate.result.stderr, /security-should-not-run/);
    assert.match(symlink.result.stderr, /Symlinked release content/);
    assert.doesNotMatch(symlink.result.stderr, /security-should-not-run/);
  } finally {
    fs.rmSync(certificate.fixtureRoot, { recursive: true, force: true });
    fs.rmSync(symlink.fixtureRoot, { recursive: true, force: true });
  }
});

test('release build does not publish when signing fails', () => {
  const { fixtureRoot, result } = runReleaseFixture({ signerExit: 42, securityExit: 0 });

  try {
    assert.equal(result.status, 42);
    assert.equal(fs.existsSync(path.join(fixtureRoot, 'releases', 'ArtboardSizeRenamer-v1.0.0-signed.zxp')), false);
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test('release build does not publish when verification fails', () => {
  const { fixtureRoot, result } = runReleaseFixture({ securityExit: 0, verifyExit: 43 });

  try {
    assert.equal(result.status, 43);
    assert.equal(fs.existsSync(path.join(fixtureRoot, 'releases', 'ArtboardSizeRenamer-v1.0.0-signed.zxp')), false);
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test('successful release writes a portable basename-only checksum', () => {
  const { fixtureRoot, result } = runReleaseFixture({ securityExit: 0 });
  const checksumPath = path.join(
    fixtureRoot,
    'releases',
    'ArtboardSizeRenamer-v1.0.0-signed.zxp.sha256'
  );

  try {
    assert.equal(result.status, 0, result.stderr);
    assert.equal(
      fs.existsSync(path.join(fixtureRoot, 'releases', 'ArtboardSizeRenamer-v1.0.0-signed.zxp')),
      true
    );
    assert.match(
      fs.readFileSync(checksumPath, 'utf8'),
      /^[a-f0-9]{64}  ArtboardSizeRenamer-v1\.0\.0-signed\.zxp\n$/
    );
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test('release artifacts are ignored and signed installation is documented', () => {
  const gitignore = fs.readFileSync('.gitignore', 'utf8');
  const readme = fs.readFileSync('README.md', 'utf8');

  assert.match(gitignore, /^\/releases\/$/m);
  assert.match(readme, /Signed ZXP installation/);
  assert.match(readme, /การติดตั้ง Signed ZXP/);
});
