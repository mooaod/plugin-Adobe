const test = require('node:test');
const assert = require('node:assert/strict');
const catalog = require('../client/catalog.js');

function validCatalog(overrides) {
  return Object.assign({
    schemaVersion: 1,
    catalogVersion: '1.0.0',
    updatedAt: '2026-07-17',
    presets: [{ id: 'instagram-feed', label: 'Instagram Feed', width: 1080, height: 1080 }]
  }, overrides);
}

test('accepts valid schema 1 catalog', () => {
  const result = catalog.validateCatalog(validCatalog());
  assert.equal(result.ok, true);
  assert.deepEqual(result.catalog, validCatalog());
});

test('rejects duplicate IDs', () => {
  const result = catalog.validateCatalog(validCatalog({
    presets: [
      { id: 'same', label: 'One', width: 1080, height: 1080 },
      { id: 'same', label: 'Two', width: 1080, height: 1350 }
    ]
  }));
  assert.deepEqual(result, { ok: false, error: 'Preset IDs must be unique.' });
});

test('rejects catalog fields that do not meet the schema requirements', () => {
  assert.deepEqual(catalog.validateCatalog(validCatalog({ schemaVersion: 2 })), {
    ok: false, error: 'Unsupported catalog schema version.'
  });
  assert.deepEqual(catalog.validateCatalog(validCatalog({ catalogVersion: '  ' })), {
    ok: false, error: 'Catalog version is required.'
  });
  assert.deepEqual(catalog.validateCatalog(validCatalog({
    presets: [{ id: 'one', label: '', width: 1080, height: 1080 }]
  })), { ok: false, error: 'Preset labels are required.' });
  assert.deepEqual(catalog.validateCatalog(validCatalog({
    presets: [{ id: 'one', label: 'One', width: 1080.5, height: 1080 }]
  })), { ok: false, error: 'Preset dimensions must be positive whole numbers.' });
});

test('uses a valid cached catalog before the bundled catalog', () => {
  const bundled = validCatalog({ catalogVersion: '1.0.0' });
  const cached = validCatalog({ catalogVersion: '1.1.0' });
  assert.deepEqual(catalog.selectCatalog(bundled, cached), cached);
  assert.deepEqual(catalog.selectCatalog(bundled, { invalid: true }), bundled);
});

test('checks at most once per calendar day', () => {
  const now = new Date('2026-07-17T15:00:00Z');
  assert.equal(catalog.shouldCheckToday(null, now), true);
  assert.equal(catalog.shouldCheckToday('2026-07-17T01:00:00Z', now), false);
  assert.equal(catalog.shouldCheckToday('2026-07-16T23:59:59Z', now), true);
});

test('exposes the one canonical HTTPS catalog URL', () => {
  assert.equal(
    catalog.CATALOG_URL,
    'https://raw.githubusercontent.com/mooaod/plugin-Adobe/main/social-presets.json'
  );
});
