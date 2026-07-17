const assert = require('node:assert/strict');
const test = require('node:test');

require.extensions['.jsx'] = require.extensions['.js'];
const host = require('../host/social-workflow.jsx');

function makeApplication(artboards) {
  const added = [];
  const document = {
    artboards: artboards,
    exportCalls: [],
    activeIndex: null,
    exportFile: function (file, exportType, options) {
      this.exportCalls.push({ file: file, exportType: exportType, options: options });
    }
  };
  document.artboards.add = function (rect) {
    const artboard = { artboardRect: rect, name: '' };
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

function withExportGlobals(run) {
  const previous = {
    File: global.File,
    ExportType: global.ExportType,
    ExportOptionsPNG24: global.ExportOptionsPNG24,
    ExportOptionsJPEG: global.ExportOptionsJPEG,
    ExportOptionsWebP: global.ExportOptionsWebP
  };
  global.File = function File(path) { this.path = path; };
  global.ExportType = { PNG24: 'PNG24', JPEG: 'JPEG', WEBP: 'WEBP' };
  global.ExportOptionsPNG24 = function ExportOptionsPNG24() {};
  global.ExportOptionsJPEG = function ExportOptionsJPEG() {};
  global.ExportOptionsWebP = function ExportOptionsWebP() {};
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
