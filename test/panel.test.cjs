const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

test('panel markup provides accessible independent accordion cards', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'client', 'index.html'), 'utf8');

  assert.match(html, /<button\b(?=[^>]*\bid="presets-trigger")(?=[^>]*\baria-expanded="true")(?=[^>]*\baria-controls="presets-body")(?=[^>]*\bdata-accordion-target="presets-body")[^>]*>/);
  assert.match(html, /<button\b(?=[^>]*\bid="preflight-trigger")(?=[^>]*\baria-expanded="true")(?=[^>]*\baria-controls="preflight-body")(?=[^>]*\bdata-accordion-target="preflight-body")[^>]*>/);
  assert.match(html, /<button\b(?=[^>]*\bid="export-trigger")(?=[^>]*\baria-expanded="false")(?=[^>]*\baria-controls="export-body")(?=[^>]*\bdata-accordion-target="export-body")[^>]*>/);
  assert.match(html, /id="export-body"[\s\S]*hidden/);
  assert.match(html, /<title>Artboard Size Renamer<\/title>/);
});

test('panel header omits the nonfunctional decorative menu', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'client', 'index.html'), 'utf8');

  assert.doesNotMatch(html, /header-menu/);
  assert.doesNotMatch(html, /☰/);
});

test('presets card separates the rename utility with a semantic divider', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'client', 'index.html'), 'utf8');

  assert.match(html, /<\/div>\s*<hr class="utility-divider">\s*<div class="utility"><button id="rename-button"/);
});

test('panel stylesheet defines card, accordion, and semantic status treatments', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'client', 'style.css'), 'utf8');

  assert.match(css, /\.panel-card\s*\{/);
  assert.doesNotMatch(css, /\.header-menu\s*\{/);
  assert.match(css, /\.accordion-trigger\[aria-expanded="true"\]/);
  assert.match(css, /\.preflight-summary-row\.pass/);
  assert.match(css, /\.preflight-summary-row\.rename/);
  assert.match(css, /\.preflight-summary-row\.missing/);
  assert.match(css, /\.preflight-summary-row\.duplicate/);
  assert.match(css, /\.custom-preset-badge\s*\{/);
  assert.match(css, /\.delete-preset-button\s*\{/);
  assert.match(css, /@media\s*\(max-width:\s*320px\)/);
  assert.match(css, /grid-template-columns:\s*30px\s+minmax\(0,\s*1fr\)\s+auto/);
  assert.match(css, /\.preflight-summary-row\s*>\s*:nth-child\(2\)\s*\{[^}]*overflow-wrap:\s*anywhere/);
  assert.match(css, /\.preflight-result\s*\{[^}]*overflow-wrap:\s*anywhere;[^}]*word-break:\s*break-word/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.chevron\s*\{[\s\S]*?transition:\s*none/);
  assert.match(css, /:root\s*\{[^}]*font:\s*13px\/1\.4/);
  assert.match(css, /h1\s*\{[^}]*font-size:\s*16px/);
  assert.match(css, /\.accordion-trigger\s*\{[^}]*padding:\s*10px\s+12px;[^}]*font-size:\s*15px/);
  assert.match(css, /\.panel-card\s*\{[^}]*margin:\s*0\s+0\s+8px;[^}]*border-radius:\s*6px/);
  assert.match(css, /\.preflight-summary-row\s*\{[^}]*grid-template-columns:\s*30px\s+minmax\(0,\s*1fr\)\s+auto;[^}]*font-size:\s*13px/);

  const compactMedia = css.match(/@media\s*\(max-width:\s*320px\)\s*\{([\s\S]*?)\n\}/);
  assert.ok(compactMedia, 'defines a compact 320px media block');
  const compactCss = compactMedia[1];
  assert.match(compactCss, /\.panel-header,\s*\.accordion-body\s*\{[^}]*padding-left:\s*10px;[^}]*padding-right:\s*10px/);
  assert.match(compactCss, /\.accordion-trigger\s*\{[^}]*padding:\s*9px\s+10px;[^}]*font-size:\s*14px/);
  assert.match(compactCss, /\.preflight-summary-row\s*\{[^}]*grid-template-columns:\s*26px\s+1fr;[^}]*font-size:\s*12px/);
});

test('preset description label preserves compact row spacing', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'client', 'style.css'), 'utf8');

  assert.match(css, /\.preset-description\s*\{[^}]*margin:\s*0;/);
});

test('panel controller invokes the host rename operation and reports its result', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'client', 'index.js'), 'utf8');

  assert.match(source, /evalScript/);
  assert.match(source, /renameAllArtboards\(app\)/);
  assert.match(source, /operationInProgress\s*=\s*true/);
  assert.match(source, /button\.disabled\s*=\s*operationBusy\(\)/);
  assert.match(source, /result\.renamed/);
});

test('panel provides an accessible hidden custom preset delete modal', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'client', 'index.html'), 'utf8');

  assert.match(html, /<p\b(?=[^>]*\bid="status")(?=[^>]*\btabindex="-1")[^>]*>/);
  assert.match(html, /<div\b(?=[^>]*\bid="delete-preset-modal")(?=[^>]*\brole="dialog")(?=[^>]*\baria-modal="true")(?=[^>]*\baria-labelledby="delete-preset-modal-title")(?=[^>]*\baria-describedby="delete-preset-modal-message")(?=[^>]*\bhidden)[^>]*>/);
  assert.match(html, /<h2 id="delete-preset-modal-title">Delete Custom Preset\?<\/h2>/);
  assert.match(html, /<p id="delete-preset-modal-message"><\/p>/);
  assert.match(html, /<button id="cancel-delete-preset-button"[^>]*>Cancel<\/button>/);
  assert.match(html, /<button id="confirm-delete-preset-button"[^>]*>Delete<\/button>/);
});

test('panel stylesheet defines the compact destructive modal treatment', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'client', 'style.css'), 'utf8');
  const overlayCss = css.match(/\.modal-overlay\s*\{([^}]*)\}/);
  const actionsCss = css.match(/\.modal-actions\s*\{([^}]*)\}/);

  assert.ok(overlayCss, 'defines the modal overlay');
  assert.ok(actionsCss, 'defines the modal actions');
  assert.match(overlayCss[1], /position:\s*fixed/);
  assert.match(overlayCss[1], /top:\s*0/);
  assert.match(overlayCss[1], /right:\s*0/);
  assert.match(overlayCss[1], /bottom:\s*0/);
  assert.match(overlayCss[1], /left:\s*0/);
  assert.match(overlayCss[1], /display:\s*flex/);
  assert.match(overlayCss[1], /align-items:\s*center/);
  assert.match(overlayCss[1], /justify-content:\s*center/);
  assert.doesNotMatch(overlayCss[1], /display:\s*grid/);
  assert.doesNotMatch(overlayCss[1], /place-items\s*:/);
  assert.doesNotMatch(overlayCss[1], /\binset\s*:/);
  assert.match(css, /\.modal-overlay\[hidden\]\s*\{[^}]*display:\s*none/);
  assert.match(css, /\.confirmation-modal\s*\{[^}]*box-sizing:\s*border-box;[^}]*max-width:\s*320px/);
  assert.match(actionsCss[1], /display:\s*flex/);
  assert.doesNotMatch(actionsCss[1], /\bgap\s*:/);
  assert.match(css, /\.modal-actions button \+ button\s*\{[^}]*margin-left:\s*8px/);
  assert.match(css, /button\.destructive\s*\{[^}]*border-color:\s*#b94a4a/);
});

test('older deletion design points to the superseding in-panel modal design', () => {
  const design = fs.readFileSync(
    path.join(
      __dirname,
      '..',
      'docs',
      'superpowers',
      'specs',
      '2026-07-17-custom-preset-deletion-design.md'
    ),
    'utf8'
  );

  assert.match(
    design,
    /\]\(\.\/2026-07-24-custom-preset-delete-modal-design\.md\)/
  );
  assert.match(design, /แทนที่การยืนยันแบบ native/);
  assert.match(design, /supersedes native confirmation/);
  assert.doesNotMatch(design, /ปุ่มจะเรียก\s*`window\.confirm\(\)`/);
  assert.doesNotMatch(design, /The button calls\s*`window\.confirm\(\)`/);
});
