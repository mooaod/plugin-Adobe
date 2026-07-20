const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const zlib = require('node:zlib');

function readPngDimensions(filePath) {
  const png = fs.readFileSync(filePath);
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(png.toString('ascii', 12, 16), 'IHDR');
  return {
    width: png.readUInt32BE(16),
    height: png.readUInt32BE(20)
  };
}

function readPngRgba(filePath) {
  const png = fs.readFileSync(filePath);
  const { width, height } = readPngDimensions(filePath);
  assert.equal(png[24], 8, 'PNG must use 8-bit channels');
  assert.equal(png[25], 6, 'PNG must use RGBA color type');
  assert.equal(png[28], 0, 'PNG must not be interlaced');

  const compressedChunks = [];
  for (let offset = 8; offset < png.length;) {
    const length = png.readUInt32BE(offset);
    const type = png.toString('ascii', offset + 4, offset + 8);
    if (type === 'IDAT') compressedChunks.push(png.subarray(offset + 8, offset + 8 + length));
    offset += length + 12;
  }

  const scanlines = zlib.inflateSync(Buffer.concat(compressedChunks));
  const stride = width * 4;
  const rgba = Buffer.alloc(stride * height);
  let sourceOffset = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = scanlines[sourceOffset++];
    for (let x = 0; x < stride; x += 1) {
      const value = scanlines[sourceOffset++];
      const left = x >= 4 ? rgba[y * stride + x - 4] : 0;
      const above = y > 0 ? rgba[(y - 1) * stride + x] : 0;
      const upperLeft = y > 0 && x >= 4 ? rgba[(y - 1) * stride + x - 4] : 0;
      if (filter === 0) rgba[y * stride + x] = value;
      else if (filter === 1) rgba[y * stride + x] = (value + left) & 0xff;
      else if (filter === 2) rgba[y * stride + x] = (value + above) & 0xff;
      else if (filter === 3) rgba[y * stride + x] = (value + Math.floor((left + above) / 2)) & 0xff;
      else if (filter === 4) {
        const p = left + above - upperLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - above);
        const pc = Math.abs(p - upperLeft);
        rgba[y * stride + x] = (value + (pa <= pb && pa <= pc ? left : pb <= pc ? above : upperLeft)) & 0xff;
      } else {
        assert.fail(`Unsupported PNG filter: ${filter}`);
      }
    }
  }
  return { width, height, rgba };
}

test('ships normal and high-DPI dark panel icon assets', () => {
  const normalIcon = 'assets/artboard-size-renamer-icon-dark.png';
  const retinaIcon = 'assets/artboard-size-renamer-icon-dark@2X.png';

  assert.equal(fs.existsSync(normalIcon), true);
  assert.equal(fs.existsSync(retinaIcon), true);
  assert.deepEqual(readPngDimensions(normalIcon), { width: 16, height: 16 });
  assert.deepEqual(readPngDimensions(retinaIcon), { width: 32, height: 32 });
});

test('ships transparent dark-panel icon backgrounds with a visible light glyph', () => {
  for (const iconPath of [
    'assets/artboard-size-renamer-icon-dark.png',
    'assets/artboard-size-renamer-icon-dark@2X.png'
  ]) {
    const { width, height, rgba } = readPngRgba(iconPath);
    const cornerAlphas = [
      rgba[3],
      rgba[(width - 1) * 4 + 3],
      rgba[((height - 1) * width) * 4 + 3],
      rgba[(height * width - 1) * 4 + 3]
    ];
    assert.deepEqual(cornerAlphas, [0, 0, 0, 0], `${iconPath} must have transparent corners`);

    const visiblePixels = [];
    for (let offset = 0; offset < rgba.length; offset += 4) {
      if (rgba[offset + 3] > 0) visiblePixels.push(rgba.subarray(offset, offset + 4));
    }
    assert.ok(visiblePixels.length > 0, `${iconPath} must contain a visible glyph`);
    assert.ok(
      visiblePixels.some(([red, green, blue]) => red >= 180 && green >= 180 && blue >= 180),
      `${iconPath} glyph must be light enough for a dark panel`
    );
  }
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
