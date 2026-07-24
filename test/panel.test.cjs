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

test('panel controller invokes the host rename operation and reports its result', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'client', 'index.js'), 'utf8');

  assert.match(source, /evalScript/);
  assert.match(source, /renameAllArtboards\(app\)/);
  assert.match(source, /operationInProgress\s*=\s*true/);
  assert.match(source, /button\.disabled\s*=\s*operationBusy\(\)/);
  assert.match(source, /result\.renamed/);
});
