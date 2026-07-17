const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

test('panel controller invokes the host rename operation and reports its result', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'client', 'index.js'), 'utf8');

  assert.match(source, /evalScript/);
  assert.match(source, /renameAllArtboards\(app\)/);
  assert.match(source, /button\.disabled\s*=\s*true/);
  assert.match(source, /result\.renamed/);
});
