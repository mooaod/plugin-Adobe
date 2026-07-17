var CATALOG_URL = 'https://raw.githubusercontent.com/mooaod/plugin-Adobe/main/social-presets.json';

function invalid(error) {
  return { ok: false, error: error };
}

function validateCatalog(value) {
  if (!value || typeof value !== 'object') {
    return invalid('Catalog must be an object.');
  }
  if (value.schemaVersion !== 1) {
    return invalid('Unsupported catalog schema version.');
  }
  if (typeof value.catalogVersion !== 'string' || !value.catalogVersion.trim()) {
    return invalid('Catalog version is required.');
  }
  if (!Array.isArray(value.presets)) {
    return invalid('Catalog presets must be an array.');
  }

  var ids = {};
  for (var index = 0; index < value.presets.length; index += 1) {
    var preset = value.presets[index];
    if (!preset || typeof preset !== 'object' || typeof preset.id !== 'string' || !preset.id.trim()) {
      return invalid('Preset IDs are required.');
    }
    if (ids[preset.id]) {
      return invalid('Preset IDs must be unique.');
    }
    ids[preset.id] = true;
    if (typeof preset.label !== 'string' || !preset.label.trim()) {
      return invalid('Preset labels are required.');
    }
    if (!Number.isInteger(preset.width) || preset.width <= 0 ||
        !Number.isInteger(preset.height) || preset.height <= 0) {
      return invalid('Preset dimensions must be positive whole numbers.');
    }
  }

  return { ok: true, catalog: value };
}

function selectCatalog(bundled, cached) {
  var cachedResult = validateCatalog(cached);
  if (cachedResult.ok) {
    return cachedResult.catalog;
  }
  var bundledResult = validateCatalog(bundled);
  return bundledResult.ok ? bundledResult.catalog : null;
}

function shouldCheckToday(lastCheckedAt, now) {
  if (!lastCheckedAt) {
    return true;
  }
  var lastChecked = new Date(lastCheckedAt);
  var current = now ? new Date(now) : new Date();
  if (isNaN(lastChecked.getTime()) || isNaN(current.getTime())) {
    return true;
  }
  return lastChecked.getUTCFullYear() !== current.getUTCFullYear() ||
    lastChecked.getUTCMonth() !== current.getUTCMonth() ||
    lastChecked.getUTCDate() !== current.getUTCDate();
}

if (typeof module !== 'undefined') {
  module.exports = {
    CATALOG_URL: CATALOG_URL,
    validateCatalog: validateCatalog,
    selectCatalog: selectCatalog,
    shouldCheckToday: shouldCheckToday
  };
}
