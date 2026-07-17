const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('registers an Illustrator CEP panel', () => {
  const manifest = fs.readFileSync('CSXS/manifest.xml', 'utf8');
  assert.match(manifest, /Host Name="ILST" Version="19\.0"/);
  assert.match(manifest, /<ScriptPath>\.\/host\/rename-artboards\.jsx<\/ScriptPath>/);
  assert.match(manifest, /<Type>Panel<\/Type>/);
});
