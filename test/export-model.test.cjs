const assert = require('node:assert/strict');
const test = require('node:test');

const exportModel = require('../client/export-model.js');

test('sanitizeFilename replaces forbidden character and whitespace runs', function () {
  assert.equal(exportModel.sanitizeFilename('IG: Story/01'), 'IG-Story-01');
});

test('sanitizeFilename supplies an artboard fallback when the result is empty', function () {
  assert.equal(exportModel.sanitizeFilename('  : / ?  '), 'artboard');
});

test('findFilenameCollisions reports duplicate sanitized export names', function () {
  assert.deepEqual(
    exportModel.findFilenameCollisions([{ name: 'A/B' }, { name: 'A:B' }], 'png'),
    ['A-B.png']
  );
});

test('findFilenameCollisions reports export names that differ only by case', function () {
  assert.deepEqual(
    exportModel.findFilenameCollisions([{ name: 'A' }, { name: 'a' }], 'png'),
    ['a.png']
  );
});

test('findFilenameCollisions compares extensions case-insensitively', function () {
  assert.deepEqual(
    exportModel.findFilenameCollisions([{ name: 'One' }, { name: 'Two' }], 'JPG'),
    []
  );
});
