const assert = require('node:assert/strict');
const test = require('node:test');
const { buildPreflightReport } = require('../client/preflight-model.js');

const feed = { id: 'instagram-feed', label: 'Instagram Feed', width: 1080, height: 1080 };
const portrait = { id: 'instagram-portrait', label: 'Instagram Portrait', width: 1080, height: 1350 };

test('classifies canonical, renameable, missing, and duplicate required presets', function () {
  const report = buildPreflightReport([feed, portrait, { id: 'story', label: 'Story', width: 1080, height: 1920 }, { id: 'facebook', label: 'Facebook', width: 1200, height: 630 }], [
    { index: 0, name: 'instagram-feed_1080x1080 px', width: 1080, height: 1080 },
    { index: 1, name: 'Portrait Draft', width: 1080, height: 1350 },
    { index: 2, name: 'Facebook A', width: 1200, height: 630 },
    { index: 3, name: 'Facebook B', width: 1200, height: 630 }
  ]);

  assert.deepEqual(report.summary, { pass: 1, rename: 1, missing: 1, duplicate: 1 });
  assert.deepEqual(report.results.map(function (result) { return result.status; }), ['pass', 'rename', 'missing', 'duplicate']);
});

test('uses the canonical name supplied by the preset dimensions', function () {
  assert.equal(buildPreflightReport([feed], [{ index: 7, name: 'wrong', width: 1080, height: 1080 }]).results[0].canonicalName, 'instagram-feed_1080x1080 px');
});

test('rejects required presets that share the same dimensions before classification', function () {
  const report = buildPreflightReport([
    feed,
    { id: 'square-alt', label: 'Square Alternate', width: 1080, height: 1080 }
  ], [
    { index: 0, name: 'Keep', width: 1080, height: 1080 }
  ]);

  assert.equal(report.ok, false);
  assert.equal(report.code, 'DUPLICATE_REQUIRED_SIZE');
  assert.deepEqual(report.conflictingSize, { width: 1080, height: 1080 });
  assert.match(report.error, /1080.*1080/);
  assert.deepEqual(report.results, []);
});
