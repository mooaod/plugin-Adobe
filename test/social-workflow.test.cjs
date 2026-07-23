const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

require.extensions['.jsx'] = require.extensions['.js'];
const host = require('../host/social-workflow.jsx');

test('exposes social workflow functions in the ExtendScript global scope', function () {
  const context = { $: { global: {} } };
  const source = fs.readFileSync('host/social-workflow.jsx', 'utf8');

  vm.runInNewContext(source, context);

  assert.equal(typeof context.$.global.createPresetArtboards, 'function');
  assert.equal(typeof context.$.global.listArtboards, 'function');
  assert.equal(typeof context.$.global.renameArtboards, 'function');
  assert.equal(typeof context.$.global.getExportCapabilities, 'function');
  assert.equal(typeof context.$.global.exportArtboards, 'function');
});

function makeApplication(artboards, options) {
  options = options || {};
  const added = [];
  let invalidatedAfterReject = false;
  const document = {
    artboards: artboards,
    exportCalls: [],
    activeIndex: null,
    exportFile: function (file, exportType, options) {
      this.exportCalls.push({ file: file, exportType: exportType, options: options });
    }
  };
  document.artboards.add = function (rect) {
    if (invalidatedAfterReject) {
      throw new Error('there is no document');
    }
    if (options.rejectRectangle && options.rejectRectangle(rect)) {
      if (options.invalidateAfterReject) {
        invalidatedAfterReject = true;
      }
      throw new Error('outside canvas');
    }
    if (options.addFailureAt === added.length) {
      throw new Error('add failed');
    }
    const artboard = { artboardRect: rect, name: '' };
    if (options.namingFailureAt === added.length) {
      Object.defineProperty(artboard, 'name', {
        get: function () { return ''; },
        set: function () { throw new Error('naming failed'); }
      });
    }
    added.push(artboard);
    document.artboards.push(artboard);
    return artboard;
  };
  document.artboards.setActiveArtboardIndex = function (index) {
    document.activeIndex = index;
  };
  return {
    documents: [document],
    activeDocument: document,
    added: added
  };
}

function withExportGlobals(run, options) {
  options = options || {};
  const previous = {
    File: global.File,
    ExportType: global.ExportType,
    ExportOptionsPNG24: global.ExportOptionsPNG24,
    ExportOptionsJPEG: global.ExportOptionsJPEG,
    ExportOptionsWebP: global.ExportOptionsWebP
  };
  global.File = function File(path) {
    this.path = path;
    this.exists = (options.existingPaths || []).indexOf(path) >= 0;
  };
  global.ExportType = options.withoutWebP
    ? { PNG24: 'PNG24', JPEG: 'JPEG' }
    : { PNG24: 'PNG24', JPEG: 'JPEG', WEBP: 'WEBP' };
  global.ExportOptionsPNG24 = function ExportOptionsPNG24() {};
  global.ExportOptionsJPEG = function ExportOptionsJPEG() {};
  global.ExportOptionsWebP = options.withoutWebP
    ? undefined
    : function ExportOptionsWebP() {};
  try {
    run();
  } finally {
    global.File = previous.File;
    global.ExportType = previous.ExportType;
    global.ExportOptionsPNG24 = previous.ExportOptionsPNG24;
    global.ExportOptionsJPEG = previous.ExportOptionsJPEG;
    global.ExportOptionsWebP = previous.ExportOptionsWebP;
  }
}

test('createPresetArtboards starts after the rightmost board and names the new preset', function () {
  const application = makeApplication([
    { artboardRect: [-300, 1080, 100, 0], name: 'Left' },
    { artboardRect: [200, 500, 900, 0], name: 'Right' }
  ]);

  const result = JSON.parse(host.createPresetArtboards(application, [
    { id: 'instagram-feed', width: 1080, height: 1080 }
  ]));

  assert.equal(result.created[0].name, 'instagram-feed_1080x1080 px');
  assert.deepEqual(application.added[0].artboardRect, [1020, 1080, 2100, 0]);
  assert.equal(application.activeDocument.activeIndex, 2);
});

test('createPresetArtboards falls back to the left when the right edge is outside the canvas', function () {
  const application = makeApplication([
    { artboardRect: [7520, 1500, 8600, 0], name: 'Near Right Edge' }
  ], {
    rejectRectangle: function (rect) { return rect[2] > 8192; }
  });

  const result = JSON.parse(host.createPresetArtboards(application, [
    { id: 'instagram-portrait', width: 1080, height: 1350 }
  ]));

  assert.equal(result.ok, true);
  assert.deepEqual(application.added[0].artboardRect, [6320, 1350, 7400, 0]);
});

test('createPresetArtboards chooses a safe rectangle before Illustrator invalidates the document reference', function () {
  const application = makeApplication([
    { artboardRect: [5548.95963996574, -3556.53958083981, 6628.95963996574, -5476.53958083981], name: 'First' },
    { artboardRect: [4348.95963996574, -3556.53958083981, 14359.0811893482, -5476.53958083981], name: 'Rightmost' }
  ], {
    rejectRectangle: function (rect) { return rect[2] > 15000; },
    invalidateAfterReject: true
  });

  const result = JSON.parse(host.createPresetArtboards(application, [
    { id: 'instagram-feed', width: 1080, height: 1080 }
  ]));

  assert.equal(result.ok, true);
  assert.ok(Math.abs(application.added[0].artboardRect[0] - 3148.95963996574) < 0.000001);
  assert.deepEqual(application.added[0].artboardRect.slice(1), [-4396.53958083981, 4228.95963996574, -5476.53958083981]);
});

test('createPresetArtboards falls back below when both horizontal sides are outside the canvas', function () {
  const application = makeApplication([
    { artboardRect: [-8100, 1000, -7000, 0], name: 'Near Left Edge' },
    { artboardRect: [7000, 1000, 8100, 0], name: 'Near Right Edge' }
  ], {
    rejectRectangle: function (rect) { return rect[0] < -8192 || rect[2] > 8192; }
  });

  const result = JSON.parse(host.createPresetArtboards(application, [
    { id: 'instagram-portrait', width: 1080, height: 1350 }
  ]));

  assert.equal(result.ok, true);
  assert.deepEqual(application.added[0].artboardRect, [-8100, -120, -7020, -1470]);
});

test('createPresetArtboards falls back above when right, left, and below are outside the canvas', function () {
  const application = makeApplication([
    { artboardRect: [-8100, 1000, -7000, 0], name: 'Near Left Edge' },
    { artboardRect: [7000, 1000, 8100, 0], name: 'Near Right Edge' }
  ], {
    rejectRectangle: function (rect) {
      return rect[0] < -8192 || rect[2] > 8192 || rect[3] < -1000;
    }
  });

  const result = JSON.parse(host.createPresetArtboards(application, [
    { id: 'instagram-portrait', width: 1080, height: 1350 }
  ]));

  assert.equal(result.ok, true);
  assert.deepEqual(application.added[0].artboardRect, [-8100, 2470, -7020, 1120]);
});

test('listArtboards returns each board with its index and dimensions', function () {
  const application = makeApplication([
    { artboardRect: [0, 1080, 1080, 0], name: 'instagram-feed_1080x1080 px' }
  ]);

  assert.deepEqual(JSON.parse(host.listArtboards(application)), {
    ok: true,
    artboards: [{ index: 0, name: 'instagram-feed_1080x1080 px', width: 1080, height: 1080 }]
  });
});

test('renameArtboards renames validated artboard indexes in ascending order', function () {
  const application = makeApplication([
    { artboardRect: [0, 100, 100, 0], name: 'First' },
    { artboardRect: [120, 100, 220, 0], name: 'Second' }
  ]);

  assert.deepEqual(JSON.parse(host.renameArtboards(application, [
    { index: 1, name: 'second_100x100 px' },
    { index: 0, name: 'first_100x100 px' }
  ])), { ok: true, renamed: [
    { index: 0, name: 'first_100x100 px' },
    { index: 1, name: 'second_100x100 px' }
  ] });
});

test('renameArtboards changes nothing when any requested change is invalid', function () {
  const application = makeApplication([{ artboardRect: [0, 100, 100, 0], name: 'Keep' }]);
  const result = JSON.parse(host.renameArtboards(application, [{ index: 0, name: 'Changed' }, { index: 4, name: 'Nope' }]));

  assert.equal(result.ok, false);
  assert.equal(application.activeDocument.artboards[0].name, 'Keep');
});

test('createPresetArtboards returns partial created items when adding an artboard fails', function () {
  const application = makeApplication([], { addFailureAt: 1 });

  const result = JSON.parse(host.createPresetArtboards(application, [
    { id: 'first', width: 100, height: 100 },
    { id: 'second', width: 200, height: 200 }
  ]));

  assert.equal(result.ok, false);
  assert.equal(result.code, 'CREATE_FAILED');
  assert.match(result.error, /second/);
  assert.match(result.error, /\[220,200,420,0\]/);
  assert.deepEqual(result.created, [
    { index: 0, name: 'first_100x100 px', width: 100, height: 100 }
  ]);
});

test('createPresetArtboards returns structured partial results when naming fails', function () {
  const application = makeApplication([], { namingFailureAt: 1 });

  const result = JSON.parse(host.createPresetArtboards(application, [
    { id: 'first', width: 100, height: 100 },
    { id: 'second', width: 200, height: 200 }
  ]));

  assert.equal(result.ok, false);
  assert.equal(result.code, 'CREATE_FAILED');
  assert.match(result.error, /second/);
  assert.deepEqual(result.created, [
    { index: 0, name: 'first_100x100 px', width: 100, height: 100 },
    { index: 1, name: '', width: 200, height: 200 }
  ]);
});

test('exportArtboards exports a PNG using an extension-free basename', function () {
  withExportGlobals(function () {
    const application = makeApplication([
      { artboardRect: [0, 1080, 1080, 0], name: 'instagram-feed_1080x1080 px' }
    ]);

    assert.deepEqual(JSON.parse(host.exportArtboards(application, {
      artboardIndexes: [0], destination: '/tmp/social', format: 'png'
    })), { ok: true, exported: ['instagram-feed_1080x1080-px.png'] });
    assert.equal(application.activeDocument.activeIndex, 0);
    assert.equal(application.activeDocument.exportCalls[0].file.path, '/tmp/social/instagram-feed_1080x1080-px');
    assert.equal(application.activeDocument.exportCalls[0].exportType, 'PNG24');
    assert.equal(application.activeDocument.exportCalls[0].options.artBoardClipping, true);
  });
});

test('exportArtboards returns without exporting when sanitized filenames collide', function () {
  withExportGlobals(function () {
    const application = makeApplication([
      { artboardRect: [0, 100, 100, 0], name: 'A/B' },
      { artboardRect: [120, 100, 220, 0], name: 'A:B' }
    ]);

    assert.deepEqual(JSON.parse(host.exportArtboards(application, {
      artboardIndexes: [0, 1], destination: '/tmp/social', format: 'png'
    })), { ok: false, error: 'Export filename collision: A-B.png' });
    assert.equal(application.activeDocument.exportCalls.length, 0);
  });
});

test('exportArtboards returns without exporting when filenames differ only by case', function () {
  withExportGlobals(function () {
    const application = makeApplication([
      { artboardRect: [0, 100, 100, 0], name: 'A' },
      { artboardRect: [120, 100, 220, 0], name: 'a' }
    ]);

    assert.deepEqual(JSON.parse(host.exportArtboards(application, {
      artboardIndexes: [0, 1], destination: '/tmp/social', format: 'png'
    })), { ok: false, error: 'Export filename collision: a.png' });
    assert.equal(application.activeDocument.exportCalls.length, 0);
  });
});

test('reports WebP unavailable without touching missing Illustrator globals while PNG remains supported', function () {
  withExportGlobals(function () {
    const application = makeApplication([
      { artboardRect: [0, 100, 100, 0], name: 'Board' }
    ]);

    assert.deepEqual(JSON.parse(host.getExportCapabilities()), {
      ok: true,
      formats: { png: true, jpg: true, webp: false }
    });
    assert.deepEqual(JSON.parse(host.exportArtboards(application, {
      artboardIndexes: [0], destination: '/tmp/social', format: 'webp'
    })), {
      ok: false,
      code: 'FORMAT_UNAVAILABLE',
      format: 'webp',
      error: 'WebP export is unavailable in this Illustrator version.'
    });
    assert.equal(application.activeDocument.exportCalls.length, 0);

    assert.deepEqual(JSON.parse(host.exportArtboards(application, {
      artboardIndexes: [0], destination: '/tmp/social', format: 'png'
    })), { ok: true, exported: ['Board.png'] });
  }, { withoutWebP: true });
});

test('preflights every existing output and exports nothing until overwrite is explicit', function () {
  const existingPaths = [
    '/tmp/social/One.png',
    '/tmp/social/Three.png'
  ];
  withExportGlobals(function () {
    const application = makeApplication([
      { artboardRect: [0, 100, 100, 0], name: 'One' },
      { artboardRect: [120, 100, 220, 0], name: 'Two' },
      { artboardRect: [240, 100, 340, 0], name: 'Three' }
    ]);

    assert.deepEqual(JSON.parse(host.exportArtboards(application, {
      artboardIndexes: [0, 1, 2], destination: '/tmp/social', format: 'png'
    })), {
      ok: false,
      code: 'OUTPUT_EXISTS',
      error: 'Existing output files require overwrite confirmation.',
      conflicts: ['One.png', 'Three.png']
    });
    assert.equal(application.activeDocument.exportCalls.length, 0);

    assert.deepEqual(JSON.parse(host.exportArtboards(application, {
      artboardIndexes: [0, 1, 2], destination: '/tmp/social', format: 'png',
      overwriteExisting: true
    })), { ok: true, exported: ['One.png', 'Two.png', 'Three.png'] });
    assert.equal(application.activeDocument.exportCalls.length, 3);
  }, { existingPaths: existingPaths });
});

test('jsonQuote produces valid JSON for arbitrary control characters in host errors', function () {
  const application = makeApplication([], { addFailureAt: 0 });
  application.activeDocument.artboards.add = function () {
    throw new Error('bad\b\f\u0001\u2028value');
  };

  const result = JSON.parse(host.createPresetArtboards(application, [
    { id: 'unsafe', width: 100, height: 100 }
  ]));

  assert.match(result.error, /unsafe/);
});
