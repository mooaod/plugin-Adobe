const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('registers an Illustrator CEP panel', () => {
  const manifest = fs.readFileSync('CSXS/manifest.xml', 'utf8');
  assert.match(manifest, /Host Name="ILST" Version="19\.0"/);
  assert.match(manifest, /<ScriptPath>\.\/host\/rename-artboards\.jsx<\/ScriptPath>/);
  assert.match(manifest, /<Type>Panel<\/Type>/);
});

test('allows the social panel to start tall and resize vertically', () => {
  const manifest = fs.readFileSync('CSXS/manifest.xml', 'utf8');

  assert.match(manifest, /<Size>\s*<Width>360<\/Width>\s*<Height>620<\/Height>\s*<\/Size>/);
  assert.match(manifest, /<MinSize>\s*<Width>300<\/Width>\s*<Height>280<\/Height>\s*<\/MinSize>/);
  assert.match(manifest, /<MaxSize>\s*<Width>720<\/Width>\s*<Height>1400<\/Height>\s*<\/MaxSize>/);
});
