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
  function buildPreflightReport(presets, artboards) {
    var summary = { pass: 0, rename: 0, missing: 0, duplicate: 0 };
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
