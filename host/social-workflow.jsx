function jsonQuote(value) {
  return '"' + String(value == null ? '' : value)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t') + '"';
}

function errorResult(message) {
  return '{"ok":false,"error":' + jsonQuote(message) + '}';
}

function activeDocument(application) {
  if (!application || !application.documents || application.documents.length === 0 || !application.activeDocument) {
    return null;
  }

  return application.activeDocument;
}

function presetArtboardName(preset) {
  return preset.id + '_' + preset.width + 'x' + preset.height + ' px';
}

function validPreset(preset) {
  return preset && typeof preset.id === 'string' && preset.id &&
    typeof preset.width === 'number' && preset.width > 0 &&
    typeof preset.height === 'number' && preset.height > 0;
}

function dimensions(rect) {
  return {
    width: Math.abs(rect[2] - rect[0]),
    height: Math.abs(rect[1] - rect[3])
  };
}

function artboardJson(index, artboard) {
  var size = dimensions(artboard.artboardRect);
  return '{"index":' + index + ',"name":' + jsonQuote(artboard.name) +
    ',"width":' + size.width + ',"height":' + size.height + '}';
}

function createPresetArtboards(application, presets) {
  var document = activeDocument(application);
  var i;
  var maximumRight;
  var artboards;
  var created = [];
  var left;

  if (!document) {
    return errorResult('Open an Illustrator document first.');
  }
  if (!presets || typeof presets.length !== 'number') {
    return errorResult('Provide one or more social presets.');
  }
  for (i = 0; i < presets.length; i += 1) {
    if (!validPreset(presets[i])) {
      return errorResult('Each preset needs an id, width, and height.');
    }
  }

  artboards = document.artboards;
  for (i = 0; i < artboards.length; i += 1) {
    var right = artboards[i].artboardRect[2];
    if (maximumRight === undefined || right > maximumRight) {
      maximumRight = right;
    }
  }
  left = maximumRight === undefined ? 0 : maximumRight + 120;

  for (i = 0; i < presets.length; i += 1) {
    var preset = presets[i];
    var artboard = artboards.add([left, preset.height, left + preset.width, 0]);
    artboard.name = presetArtboardName(preset);
    created.push(artboardJson(artboards.length - 1, artboard));
    left += preset.width + 120;
  }

  return '{"ok":true,"created":[' + created.join(',') + ']}';
}

function listArtboards(application) {
  var document = activeDocument(application);
  var items = [];
  var i;

  if (!document) {
    return errorResult('Open an Illustrator document first.');
  }

  for (i = 0; i < document.artboards.length; i += 1) {
    items.push(artboardJson(i, document.artboards[i]));
  }

  return '{"ok":true,"artboards":[' + items.join(',') + ']}';
}

function sanitizeFilename(name) {
  var sanitized = String(name == null ? '' : name)
    .replace(/[<>:"\/\\|?*\s]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return sanitized || 'artboard';
}

function findFilenameCollisions(artboards, format) {
  var counts = {};
  var seenCollisions = {};
  var collisions = [];
  var extension = String(format).toLowerCase();
  var i;

  for (i = 0; i < artboards.length; i += 1) {
    var filename = sanitizeFilename(artboards[i].name) + '.' + extension;
    var key = '$' + filename.toLowerCase();
    if (counts[key]) {
      counts[key] += 1;
      if (!seenCollisions[key]) {
        seenCollisions[key] = true;
        collisions.push(filename);
      }
    } else {
      counts[key] = 1;
    }
  }

  return collisions;
}

function exportFormat(format) {
  var normalized = String(format == null ? '' : format).toLowerCase();
  if (normalized === 'png') {
    return { extension: 'png', type: ExportType.PNG24, optionName: 'ExportOptionsPNG24', clipping: true };
  }
  if (normalized === 'jpg') {
    return { extension: 'jpg', type: ExportType.JPEG, optionName: 'ExportOptionsJPEG', clipping: true };
  }
  if (normalized === 'webp') {
    return { extension: 'webp', type: ExportType.WEBP, optionName: 'ExportOptionsWebP', clipping: false };
  }
  return null;
}

function newExportOptions(format) {
  var options;
  if (format.optionName === 'ExportOptionsPNG24') {
    options = new ExportOptionsPNG24();
  } else if (format.optionName === 'ExportOptionsJPEG') {
    options = new ExportOptionsJPEG();
  } else {
    options = new ExportOptionsWebP();
  }
  if (format.clipping) {
    options.artBoardClipping = true;
  }
  return options;
}

function destinationFile(destination, basename) {
  var separator = /[\\\/]$/.test(destination) ? '' : '/';
  return new File(destination + separator + basename);
}

function exportArtboards(application, request) {
  var document = activeDocument(application);
  var format;
  var items = [];
  var i;
  var collisions;

  if (!document) {
    return errorResult('Open an Illustrator document first.');
  }
  if (!request || !request.artboardIndexes || typeof request.artboardIndexes.length !== 'number' ||
      !request.destination || typeof request.destination !== 'string') {
    return errorResult('Provide artboards, a destination, and an export format.');
  }

  format = exportFormat(request.format);
  if (!format) {
    return errorResult('Export format must be PNG, JPG, or WebP.');
  }

  for (i = 0; i < request.artboardIndexes.length; i += 1) {
    var index = request.artboardIndexes[i];
    if (typeof index !== 'number' || Math.floor(index) !== index || index < 0 || index >= document.artboards.length) {
      return errorResult('Select valid artboards to export.');
    }
    items.push(document.artboards[index]);
  }

  collisions = findFilenameCollisions(items, format.extension);
  if (collisions.length) {
    return errorResult('Export filename collision: ' + collisions[0]);
  }

  var exported = [];
  for (i = 0; i < request.artboardIndexes.length; i += 1) {
    var artboard = document.artboards[request.artboardIndexes[i]];
    var basename = sanitizeFilename(artboard.name);
    try {
      document.artboards.setActiveArtboardIndex(request.artboardIndexes[i]);
      document.exportFile(destinationFile(request.destination, basename), format.type, newExportOptions(format));
      exported.push(basename + '.' + format.extension);
    } catch (error) {
      return errorResult('Failed to export artboard: ' + artboard.name);
    }
  }

  return '{"ok":true,"exported":[' + (function () {
    var names = [];
    var exportIndex;
    for (exportIndex = 0; exportIndex < exported.length; exportIndex += 1) {
      names.push(jsonQuote(exported[exportIndex]));
    }
    return names.join(',');
  }()) + ']}';
}

if (typeof module !== 'undefined') {
  module.exports = {
    createPresetArtboards: createPresetArtboards,
    listArtboards: listArtboards,
    exportArtboards: exportArtboards,
    sanitizeFilename: sanitizeFilename,
    findFilenameCollisions: findFilenameCollisions,
    presetArtboardName: presetArtboardName
  };
}
