const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

const EXPECTED_RELEASE_PATHS = [
  'CSXS',
  'assets',
  'catalog',
  'client',
  'host',
  'README.md'
];

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
  assert.match(script, /\/Users\/aibd\/Library\/Application Support\/Moo_Ai\/Signing\/ArtboardSizeRenamer\.p12/);
  assert.doesNotMatch(script, /BEGIN (RSA )?PRIVATE KEY/);
  assert.ok(verifyAt >= 0);
  assert.ok(publishAt > verifyAt);
});

test('release artifacts are ignored and signed installation is documented', () => {
  const gitignore = fs.readFileSync('.gitignore', 'utf8');
  const readme = fs.readFileSync('README.md', 'utf8');

  assert.match(gitignore, /^\/releases\/$/m);
  assert.match(readme, /Signed ZXP installation/);
  assert.match(readme, /การติดตั้ง Signed ZXP/);
});
