const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

test('panel markup provides accessible independent accordion cards', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'client', 'index.html'), 'utf8');

  assert.match(html, /id="presets-trigger"[\s\S]*aria-expanded="true"/);
  assert.match(html, /id="preflight-trigger"[\s\S]*aria-expanded="true"/);
  assert.match(html, /id="export-trigger"[\s\S]*aria-expanded="false"/);
  assert.match(html, /aria-controls="presets-body"/);
  assert.match(html, /aria-controls="preflight-body"/);
  assert.match(html, /aria-controls="export-body"/);
  assert.match(html, /id="export-body"[\s\S]*hidden/);
});

test('panel controller invokes the host rename operation and reports its result', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'client', 'index.js'), 'utf8');

  assert.match(source, /evalScript/);
  assert.match(source, /renameAllArtboards\(app\)/);
  assert.match(source, /operationInProgress\s*=\s*true/);
  assert.match(source, /button\.disabled\s*=\s*operationBusy\(\)/);
  assert.match(source, /result\.renamed/);
});
