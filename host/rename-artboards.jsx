function formatSizeName(width, height) {
  return Math.round(width) + 'x' + Math.round(height) + ' px';
}

function renameAllArtboards(application) {
  if (!application.documents || application.documents.length === 0) {
    return '{"ok":false,"error":"Open an Illustrator document first."}';
  }

  var artboards = application.activeDocument.artboards;
  for (var i = 0; i < artboards.length; i += 1) {
    var rect = artboards[i].artboardRect;
    artboards[i].name = formatSizeName(
      Math.abs(rect[2] - rect[0]),
      Math.abs(rect[1] - rect[3])
    );
  }

  return '{"ok":true,"renamed":' + artboards.length + '}';
}

if (typeof module !== 'undefined') {
  module.exports = {
    formatSizeName: formatSizeName,
    renameAllArtboards: renameAllArtboards
  };
}
