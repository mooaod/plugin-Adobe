const assert = require('node:assert/strict');
const test = require('node:test');

require.extensions['.jsx'] = require.extensions['.js'];
const api = require('../host/rename-artboards.jsx');

test('formatSizeName rounds dimensions and appends px', function () {
  assert.equal(api.formatSizeName(1920.4, 1079.6), '1920x1080 px');
});

test('renameAllArtboards reports when there is no open document', function () {
  assert.equal(
    api.renameAllArtboards({ documents: [] }),
    '{"ok":false,"error":"Open an Illustrator document first."}'
  );
});

test('renameAllArtboards renames every artboard from its rectangle dimensions', function () {
  const artboards = [
    { artboardRect: [0, 1080, 1920, 0], name: 'Landscape' },
    { artboardRect: [0, 1920, 1080, 0], name: 'Portrait' }
  ];
  const application = {
    documents: [{}],
    activeDocument: { artboards: artboards }
  };

  assert.equal(api.renameAllArtboards(application), '{"ok":true,"renamed":2}');
  assert.equal(artboards[0].name, '1920x1080 px');
  assert.equal(artboards[1].name, '1080x1920 px');
});
