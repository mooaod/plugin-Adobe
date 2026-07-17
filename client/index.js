(function () {
  'use strict';

  var button = document.getElementById('rename-button');
  var status = document.getElementById('status');
  var csInterface = new CSInterface();

  function restore(message) {
    status.textContent = message;
    button.disabled = false;
  }

  button.addEventListener('click', function () {
    button.disabled = true;
    status.textContent = 'Renaming…';

    try {
      csInterface.evalScript('renameAllArtboards(app)', function (rawResult) {
        try {
          var result = JSON.parse(rawResult);
          status.textContent = result.ok
            ? 'Renamed ' + result.renamed + ' artboard(s).'
            : result.error;
          button.disabled = false;
        } catch (error) {
          restore('Could not read Illustrator’s response. Please try again.');
        }
      });
    } catch (error) {
      restore('Could not start renaming. Please try again.');
    }
  });
}());
