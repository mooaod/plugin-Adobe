(function () {
  'use strict';

  var CACHE_DIRECTORY = 'com.aibd.artboardsizerenamer';
  var CACHE_FILENAME = 'social-presets-cache.json';
  var BUNDLED_CATALOG_PATH = '../catalog/social-presets.json';
  var button = document.getElementById('rename-button');
  var presetList = document.getElementById('preset-list');
  var createButton = document.getElementById('create-presets-button');
  var catalogInfo = document.getElementById('catalog-info');
  var updateButton = document.getElementById('update-presets-button');
  var formatSelect = document.getElementById('format-select');
  var artboardList = document.getElementById('artboard-list');
  var destinationInput = document.getElementById('destination-input');
  var exportButton = document.getElementById('export-button');
  var collisionWarning = document.getElementById('collision-warning');
  var status = document.getElementById('status');
  var csInterface = new CSInterface();
  var activeCatalog = null;
  var catalogSource = 'bundled';
  var artboards = [];
  var presetCheckboxes = [];
  var artboardCheckboxes = [];
  var cachedState = readCache();

  function setStatus(message) {
    status.textContent = message;
  }

  function clearElement(element) {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }

  function cachePath() {
    var userData = csInterface.getSystemPath(SystemPath.USER_DATA).replace(/[\\\/]$/, '');
    return userData + '/' + CACHE_DIRECTORY + '/' + CACHE_FILENAME;
  }

  function readCache() {
    var result;
    var parsed;
    try {
      if (!window.cep || !window.cep.fs) {
        return null;
      }
      result = window.cep.fs.readFile(cachePath());
      if (!result || result.err !== 0) {
        return null;
      }
      parsed = JSON.parse(result.data);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (error) {
      return null;
    }
  }

  function writeCache(catalog, checkedAt) {
    var userData;
    var directory;
    var value;
    try {
      if (!window.cep || !window.cep.fs) {
        return;
      }
      userData = csInterface.getSystemPath(SystemPath.USER_DATA).replace(/[\\\/]$/, '');
      directory = userData + '/' + CACHE_DIRECTORY;
      value = {
        catalog: catalog,
        source: 'cache',
        lastSuccessfulCheck: checkedAt
      };
      window.cep.fs.makedir(directory);
      window.cep.fs.writeFile(directory + '/' + CACHE_FILENAME, JSON.stringify(value));
      cachedState = value;
    } catch (error) {
      // A cache failure must not interrupt preset creation or export.
    }
  }

  function catalogDescription() {
    if (!activeCatalog) {
      return 'No valid presets available';
    }
    return 'v' + activeCatalog.catalogVersion + ' · ' + catalogSource +
      (activeCatalog.updatedAt ? ' · ' + activeCatalog.updatedAt : '');
  }

  function usingCatalogMessage(extra) {
    var sourceLabel = catalogSource === 'cache' ? 'cached' : catalogSource;
    return 'Using ' + sourceLabel + ' presets (v' + activeCatalog.catalogVersion + ').' +
      (extra ? ' ' + extra : '');
  }

  function renderCatalog(catalog, source) {
    var i;
    activeCatalog = catalog;
    catalogSource = source;
    presetCheckboxes = [];
    clearElement(presetList);

    for (i = 0; i < catalog.presets.length; i += 1) {
      var preset = catalog.presets[i];
      var label = document.createElement('label');
      var checkbox = document.createElement('input');
      var description = document.createElement('span');
      label.className = 'check-item';
      checkbox.type = 'checkbox';
      checkbox.checked = true;
      checkbox.dataset.presetIndex = String(i);
      description.textContent = preset.label + ' — ' + preset.width + ' × ' + preset.height + ' px';
      label.appendChild(checkbox);
      label.appendChild(description);
      presetList.appendChild(label);
      presetCheckboxes.push(checkbox);
    }
    createButton.disabled = catalog.presets.length === 0;
    catalogInfo.textContent = catalogDescription();
  }

  function selectedPresets() {
    var selected = [];
    var i;
    if (!activeCatalog) {
      return selected;
    }
    for (i = 0; i < presetCheckboxes.length; i += 1) {
      if (presetCheckboxes[i].checked) {
        selected.push(activeCatalog.presets[Number(presetCheckboxes[i].dataset.presetIndex)]);
      }
    }
    return selected;
  }

  function selectedArtboards() {
    var selected = [];
    var i;
    for (i = 0; i < artboardCheckboxes.length; i += 1) {
      if (artboardCheckboxes[i].checked) {
        selected.push(artboards[Number(artboardCheckboxes[i].dataset.artboardIndex)]);
      }
    }
    return selected;
  }

  function updateExportState() {
    var selected = selectedArtboards();
    var collisions = findFilenameCollisions(selected, formatSelect.value);
    if (collisions.length) {
      collisionWarning.textContent = 'Filename collision: ' + collisions.join(', ');
      exportButton.disabled = true;
      return;
    }
    if (!destinationInput.value.trim()) {
      collisionWarning.textContent = 'Choose a destination folder.';
      exportButton.disabled = true;
      return;
    }
    collisionWarning.textContent = '';
    exportButton.disabled = selected.length === 0;
  }

  function renderArtboards(items) {
    var i;
    artboards = items;
    artboardCheckboxes = [];
    clearElement(artboardList);
    for (i = 0; i < artboards.length; i += 1) {
      var artboard = artboards[i];
      var label = document.createElement('label');
      var checkbox = document.createElement('input');
      var description = document.createElement('span');
      label.className = 'check-item';
      checkbox.type = 'checkbox';
      checkbox.checked = true;
      checkbox.dataset.artboardIndex = String(i);
      checkbox.addEventListener('change', updateExportState);
      description.textContent = artboard.name + ' — ' + artboard.width + ' × ' + artboard.height + ' px';
      label.appendChild(checkbox);
      label.appendChild(description);
      artboardList.appendChild(label);
      artboardCheckboxes.push(checkbox);
    }
    updateExportState();
  }

  function parseHostResult(rawResult) {
    try {
      return JSON.parse(rawResult);
    } catch (error) {
      return { ok: false, error: 'Could not read Illustrator’s response. Please try again.' };
    }
  }

  function refreshArtboards() {
    csInterface.evalScript('listArtboards(app)', function (rawResult) {
      var result = parseHostResult(rawResult);
      if (result.ok) {
        renderArtboards(result.artboards);
      } else {
        artboards = [];
        renderArtboards([]);
        setStatus(result.error);
      }
    });
  }

  function loadHostWorkflow(onReady) {
    var extensionPath;
    var workflowPath;
    var expression;
    try {
      extensionPath = csInterface.getSystemPath(SystemPath.EXTENSION).replace(/[\\\/]$/, '');
      workflowPath = extensionPath + '/host/social-workflow.jsx';
      expression = '(function(){try{$.evalFile(new File(' + JSON.stringify(workflowPath) +
        '));return JSON.stringify({ok:true});}catch(error){return JSON.stringify({ok:false,error:String(error)});}}())';
      csInterface.evalScript(expression, function (rawResult) {
        var result = parseHostResult(rawResult);
        if (!result.ok) {
          createButton.disabled = true;
          exportButton.disabled = true;
          setStatus('Could not load social workflow: ' + result.error);
          return;
        }
        onReady();
      });
    } catch (error) {
      createButton.disabled = true;
      exportButton.disabled = true;
      setStatus('Could not load social workflow: ' + error.message);
    }
  }

  function remoteFailure() {
    updateButton.disabled = false;
    if (activeCatalog) {
      setStatus(usingCatalogMessage('Preset updates could not be checked.'));
    } else {
      setStatus('Preset updates could not be checked and no valid offline catalog is available.');
    }
  }

  function checkRemoteCatalog() {
    var request;
    if (CATALOG_URL.indexOf('https://') !== 0) {
      remoteFailure();
      return;
    }
    updateButton.disabled = true;
    request = new XMLHttpRequest();
    request.open('GET', CATALOG_URL, true);
    request.onload = function () {
      var parsed;
      var validated;
      if (request.status !== 200) {
        remoteFailure();
        return;
      }
      try {
        parsed = JSON.parse(request.responseText);
      } catch (error) {
        remoteFailure();
        return;
      }
      validated = validateCatalog(parsed);
      if (!validated.ok) {
        remoteFailure();
        return;
      }
      renderCatalog(validated.catalog, 'remote');
      writeCache(validated.catalog, new Date().toISOString());
      updateButton.disabled = false;
      setStatus('Preset catalog updated to ' + validated.catalog.catalogVersion + '.');
    };
    request.onerror = remoteFailure;
    request.send(null);
  }

  function finishCatalogInitialization(bundledCatalog) {
    var cachedValidation = validateCatalog(cachedState && cachedState.catalog);
    var bundledValidation = validateCatalog(bundledCatalog);
    var selected = selectCatalog(
      bundledValidation.ok ? bundledValidation.catalog : null,
      cachedValidation.ok ? cachedValidation.catalog : null
    );
    if (selected) {
      renderCatalog(selected, cachedValidation.ok ? 'cache' : 'bundled');
      setStatus(usingCatalogMessage());
    } else {
      createButton.disabled = true;
      catalogInfo.textContent = 'No valid presets available';
      setStatus('No valid offline preset catalog is available.');
    }
    if (shouldCheckToday(cachedState && cachedState.lastSuccessfulCheck, new Date())) {
      checkRemoteCatalog();
    }
  }

  function loadBundledCatalog() {
    var request = new XMLHttpRequest();
    request.open('GET', BUNDLED_CATALOG_PATH, true);
    request.onload = function () {
      var bundled = null;
      if (request.status === 0 || request.status === 200) {
        try {
          bundled = JSON.parse(request.responseText);
        } catch (error) {
          bundled = null;
        }
      }
      finishCatalogInitialization(bundled);
    };
    request.onerror = function () {
      finishCatalogInitialization(null);
    };
    request.send(null);
  }

  function restore(message) {
    setStatus(message);
    button.disabled = false;
  }

  button.addEventListener('click', function () {
    button.disabled = true;
    setStatus('Renaming…');

    try {
      csInterface.evalScript('renameAllArtboards(app)', function (rawResult) {
        try {
          var result = JSON.parse(rawResult);
          setStatus(result.ok
            ? 'Renamed ' + result.renamed + ' artboard(s).'
            : result.error);
          button.disabled = false;
        } catch (error) {
          restore('Could not read Illustrator’s response. Please try again.');
        }
      });
    } catch (error) {
      restore('Could not start renaming. Please try again.');
    }
  });

  createButton.addEventListener('click', function () {
    var presets = selectedPresets();
    if (!presets.length) {
      setStatus('Select at least one preset to create.');
      return;
    }
    createButton.disabled = true;
    setStatus('Creating selected presets…');
    csInterface.evalScript('createPresetArtboards(app, ' + JSON.stringify(presets) + ')', function (rawResult) {
      var result = parseHostResult(rawResult);
      createButton.disabled = false;
      if (!result.ok) {
        setStatus(result.error);
        return;
      }
      setStatus('Created ' + result.created.length + ' preset artboard(s).');
      refreshArtboards();
    });
  });

  exportButton.addEventListener('click', function () {
    var selected = selectedArtboards();
    var collisions = findFilenameCollisions(selected, formatSelect.value);
    var indexes = [];
    var i;
    if (collisions.length) {
      updateExportState();
      return;
    }
    for (i = 0; i < selected.length; i += 1) {
      indexes.push(selected[i].index);
    }
    var exportRequest = {
      artboardIndexes: indexes,
      destination: destinationInput.value.trim(),
      format: formatSelect.value
    };
    exportButton.disabled = true;
    setStatus('Exporting selected artboards…');
    csInterface.evalScript('exportArtboards(app, ' + JSON.stringify(exportRequest) + ')', function (rawResult) {
      var result = parseHostResult(rawResult);
      if (result.ok) {
        setStatus('Exported ' + result.exported.length + ' artboard(s).');
      } else {
        setStatus(result.error);
      }
      updateExportState();
    });
  });

  updateButton.addEventListener('click', checkRemoteCatalog);
  formatSelect.addEventListener('change', updateExportState);
  destinationInput.addEventListener('input', updateExportState);

  loadHostWorkflow(function () {
    refreshArtboards();
    loadBundledCatalog();
  });
}());
