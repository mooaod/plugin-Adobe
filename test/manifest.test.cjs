const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

function readPngDimensions(filePath) {
  const png = fs.readFileSync(filePath);
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(png.toString('ascii', 12, 16), 'IHDR');
  return {
    width: png.readUInt32BE(16),
    height: png.readUInt32BE(20)
  };
}

test('ships normal and high-DPI dark panel icon assets', () => {
  const normalIcon = 'assets/artboard-size-renamer-icon-dark.png';
  const retinaIcon = 'assets/artboard-size-renamer-icon-dark@2X.png';

  assert.equal(fs.existsSync(normalIcon), true);
  assert.equal(fs.existsSync(retinaIcon), true);
  assert.deepEqual(readPngDimensions(normalIcon), { width: 16, height: 16 });
  assert.deepEqual(readPngDimensions(retinaIcon), { width: 32, height: 32 });
});

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
