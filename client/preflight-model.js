(function (root) {
  'use strict';
  function canonicalName(preset) {
    return preset.id + '_' + preset.width + 'x' + preset.height + ' px';
  }
  function matchingArtboards(preset, artboards) {
    return artboards.filter(function (artboard) {
      return artboard.width === preset.width && artboard.height === preset.height;
    });
  }
  function duplicateRequiredSize(presets) {
    var sizes = {};
    var i;
    var key;
    for (i = 0; i < presets.length; i += 1) {
      key = '$' + presets[i].width + 'x' + presets[i].height;
      if (sizes[key]) {
        return { width: presets[i].width, height: presets[i].height };
      }
      sizes[key] = true;
    }
    return null;
  }
  function buildPreflightReport(presets, artboards) {
    var conflictingSize = duplicateRequiredSize(presets);
    var summary = { pass: 0, rename: 0, missing: 0, duplicate: 0 };
    if (conflictingSize) {
      return {
        ok: false,
        code: 'DUPLICATE_REQUIRED_SIZE',
        error: 'Required delivery presets conflict at ' + conflictingSize.width +
          ' × ' + conflictingSize.height + ' px. Select only one preset for this size.',
        conflictingSize: conflictingSize,
        results: []
      };
    }
    var results = presets.map(function (preset) {
      var matches = matchingArtboards(preset, artboards);
      var status = matches.length === 0 ? 'missing' : matches.length > 1 ? 'duplicate' :
        matches[0].name === canonicalName(preset) ? 'pass' : 'rename';
      summary[status] += 1;
      return { preset: preset, canonicalName: canonicalName(preset), status: status, artboards: matches };
    });
    return { summary: summary, results: results };
  }
  root.buildPreflightReport = buildPreflightReport;
  if (typeof module !== 'undefined') module.exports = { buildPreflightReport: buildPreflightReport };
}(this));
