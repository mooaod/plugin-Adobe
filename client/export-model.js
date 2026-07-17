function sanitizeFilename(name) {
  var sanitized = String(name == null ? '' : name)
    .replace(/[<>:"\/\\|?*\s]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return sanitized || 'artboard';
}

function normalizedExtension(format) {
  return String(format == null ? '' : format).toLowerCase().replace(/^\.+|\s+$/g, '');
}

function findFilenameCollisions(artboards, format) {
  var extension = normalizedExtension(format);
  var counts = {};
  var collisions = [];
  var collisionNames = {};
  var i;

  for (i = 0; i < artboards.length; i += 1) {
    var filename = sanitizeFilename(artboards[i].name) + '.' + extension;
    var key = '$' + filename;

    if (counts[key]) {
      counts[key] += 1;
      if (!collisionNames[key]) {
        collisionNames[key] = true;
        collisions.push(filename);
      }
    } else {
      counts[key] = 1;
    }
  }

  return collisions;
}

if (typeof module !== 'undefined') {
  module.exports = {
    sanitizeFilename: sanitizeFilename,
    findFilenameCollisions: findFilenameCollisions
  };
}
