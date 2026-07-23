(function () {
  'use strict';

  var CACHE_DIRECTORY = 'com.aibd.artboardsizerenamer';
  var CACHE_FILENAME = 'social-presets-cache.json';
  var CUSTOM_PRESETS_FILENAME = 'social-presets-custom.json';
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
  var customPresetId = document.getElementById('custom-preset-id');
  var customPresetLabel = document.getElementById('custom-preset-label');
  var customPresetWidth = document.getElementById('custom-preset-width');
  var customPresetHeight = document.getElementById('custom-preset-height');
  var addCustomPresetButton = document.getElementById('add-custom-preset-button');
  var preflightPresetList = document.getElementById('preflight-preset-list');
  var runPreflightButton = document.getElementById('run-preflight-button');
  var preflightSummary = document.getElementById('preflight-summary');
  var preflightResults = document.getElementById('preflight-results');
  var createMissingButton = document.getElementById('create-missing-button');
  var renameFixableButton = document.getElementById('rename-fixable-button');
  var exportVerifiedButton = document.getElementById('export-verified-button');
  var status = document.getElementById('status');
  var csInterface = new CSInterface();
  var activeCatalog = null;
  var activeBaseCatalog = null;
  var catalogSource = 'bundled';
  var artboards = [];
  var presetCheckboxes = [];
  var preflightCheckboxes = [];
  var artboardCheckboxes = [];
  var preflightReport = null;
  var preflightBusy = false;
  var exportBusy = false;
  var hostReady = false;
  var hostLoadError = '';
  var cachedState = readCache();
  var customPresets = readCustomPresets();

  function setStatus(message) {
    status.textContent = message;
  }

  function clearElement(element) {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }

  function storagePath(filename) {
    var userData = csInterface.getSystemPath(SystemPath.USER_DATA).replace(/[\\\/]$/, '');
    return userData + '/' + CACHE_DIRECTORY + '/' + filename;
  }

  function cachePath() {
    return storagePath(CACHE_FILENAME);
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

  function readCustomPresets() {
    var result;
    var parsed;
    var validated;
    try {
      if (!window.cep || !window.cep.fs) {
        return [];
      }
      result = window.cep.fs.readFile(storagePath(CUSTOM_PRESETS_FILENAME));
      if (!result || result.err !== 0) {
        return [];
      }
      parsed = JSON.parse(result.data);
      if (!parsed || parsed.schemaVersion !== 1) {
        return [];
      }
      validated = validateCustomPresets(parsed.presets);
      return validated.ok ? validated.presets : [];
    } catch (error) {
      return [];
    }
  }

  function persistCustomPresets() {
    var userData;
    var directory;
    var writeResult;
    try {
      if (!window.cep || !window.cep.fs) {
        return false;
      }
      userData = csInterface.getSystemPath(SystemPath.USER_DATA).replace(/[\\\/]$/, '');
      directory = userData + '/' + CACHE_DIRECTORY;
      window.cep.fs.makedir(directory);
      writeResult = window.cep.fs.writeFile(
        directory + '/' + CUSTOM_PRESETS_FILENAME,
        JSON.stringify({ schemaVersion: 1, presets: customPresets })
      );
      return !!writeResult && writeResult.err === 0;
    } catch (error) {
      return false;
    }
  }

  function persistCache(catalog, successfulAt, attemptedAt) {
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
        source: 'cache'
      };
      if (successfulAt) {
        value.lastSuccessfulCheck = successfulAt;
      }
      if (attemptedAt) {
        value.lastAttemptedCheck = attemptedAt;
      }
      window.cep.fs.makedir(directory);
      window.cep.fs.writeFile(directory + '/' + CACHE_FILENAME, JSON.stringify(value));
      cachedState = value;
    } catch (error) {
      // A cache failure must not interrupt preset creation or export.
    }
  }

  function writeCache(catalog, checkedAt) {
    persistCache(catalog, checkedAt, cachedState && cachedState.lastAttemptedCheck);
  }

  function recordAutomaticAttempt(attemptedAt) {
    persistCache(
      activeBaseCatalog,
      cachedState && cachedState.lastSuccessfulCheck,
      attemptedAt
    );
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

  function hostFailureMessage(extra) {
    return 'Could not load social workflow: ' + hostLoadError +
      (activeCatalog ? ' Offline presets remain available to view.' : '') +
      (extra ? ' ' + extra : '');
  }

  function updateCreateState() {
    createButton.disabled = !hostReady || selectedPresets().length === 0;
  }

  function selectedPreflightPresets() {
    var selected = [];
    var i;
    if (!activeCatalog) {
      return selected;
    }
    for (i = 0; i < preflightCheckboxes.length; i += 1) {
      if (preflightCheckboxes[i].checked) {
        selected.push(activeCatalog.presets[
          Number(preflightCheckboxes[i].dataset.presetIndex)
        ]);
      }
    }
    return selected;
  }

  function preflightCanExport(report) {
    return report && report.summary.missing === 0 && report.summary.duplicate === 0 &&
      report.summary.pass > 0;
  }

  function fixableRenameChanges(report) {
    return report.results.filter(function (result) { return result.status === 'rename'; })
      .map(function (result) {
        return { index: result.artboards[0].index, name: result.canonicalName };
      });
  }

  function operationBusy() {
    return preflightBusy || exportBusy;
  }

  function updatePreflightState() {
    runPreflightButton.disabled = operationBusy() || !hostReady ||
      selectedPreflightPresets().length === 0;
    createMissingButton.disabled = operationBusy() || !hostReady || !preflightReport ||
      preflightReport.summary.missing === 0;
    renameFixableButton.disabled = operationBusy() || !hostReady || !preflightReport ||
      preflightReport.summary.rename === 0;
    exportVerifiedButton.disabled = operationBusy() || !hostReady ||
      !preflightCanExport(preflightReport) ||
      !destinationInput.value.trim();
  }

  function clearPreflightReport() {
    preflightReport = null;
    preflightSummary.textContent = '';
    preflightSummary.className = 'preflight-summary';
    clearElement(preflightResults);
    updatePreflightState();
  }

  function renderPreflightReport(report) {
    var i;
    var result;
    var item;
    preflightSummary.textContent = report.summary.pass + ' Pass · ' +
      report.summary.rename + ' Rename · ' +
      report.summary.missing + ' Missing · ' +
      report.summary.duplicate + ' Duplicate';
    preflightSummary.className = 'preflight-summary';
    clearElement(preflightResults);
    for (i = 0; i < report.results.length; i += 1) {
      result = report.results[i];
      item = document.createElement('div');
      item.className = 'preflight-result ' + result.status;
      item.textContent = result.preset.label + ' — ' +
        result.status.charAt(0).toUpperCase() + result.status.slice(1);
      preflightResults.appendChild(item);
    }
  }

  function runPreflight() {
    var requiredPresets = selectedPreflightPresets();
    if (operationBusy() || !hostReady || !requiredPresets.length) {
      updatePreflightState();
      return;
    }
    preflightReport = buildPreflightReport(requiredPresets, artboards);
    renderPreflightReport(preflightReport);
    updatePreflightState();
  }

  function renderCatalog(catalog, source) {
    var i;
    activeBaseCatalog = catalog;
    activeCatalog = mergeCatalogWithCustom(catalog, customPresets);
    catalogSource = source;
    presetCheckboxes = [];
    preflightCheckboxes = [];
    clearElement(presetList);
    clearElement(preflightPresetList);

    for (i = 0; i < activeCatalog.presets.length; i += 1) {
      var preset = activeCatalog.presets[i];
      var label = document.createElement('label');
      var checkbox = document.createElement('input');
      var description = document.createElement('span');
      var preflightLabel = document.createElement('label');
      var preflightCheckbox = document.createElement('input');
      var preflightDescription = document.createElement('span');
      label.className = 'check-item';
      checkbox.type = 'checkbox';
      checkbox.checked = false;
      checkbox.dataset.presetIndex = String(i);
      checkbox.addEventListener('change', updateCreateState);
      description.textContent = preset.label + ' — ' + preset.width + ' × ' + preset.height + ' px';
      label.appendChild(checkbox);
      label.appendChild(description);
      presetList.appendChild(label);
      presetCheckboxes.push(checkbox);
      preflightLabel.className = 'check-item';
      preflightCheckbox.type = 'checkbox';
      preflightCheckbox.checked = false;
      preflightCheckbox.dataset.presetIndex = String(i);
      preflightCheckbox.addEventListener('change', clearPreflightReport);
      preflightDescription.textContent = preset.label + ' — ' +
        preset.width + ' × ' + preset.height + ' px';
      preflightLabel.appendChild(preflightCheckbox);
      preflightLabel.appendChild(preflightDescription);
      preflightPresetList.appendChild(preflightLabel);
      preflightCheckboxes.push(preflightCheckbox);
    }
    updateCreateState();
    clearPreflightReport();
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
    if (!hostReady || operationBusy()) {
      exportButton.disabled = true;
      return;
    }
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

  function hasSameArtboardSnapshot(previousItems, currentItems) {
    var i;
    if (previousItems.length !== currentItems.length) {
      return false;
    }
    for (i = 0; i < previousItems.length; i += 1) {
      if (previousItems[i].index !== currentItems[i].index ||
          previousItems[i].name !== currentItems[i].name ||
          previousItems[i].width !== currentItems[i].width ||
          previousItems[i].height !== currentItems[i].height) {
        return false;
      }
    }
    return true;
  }

  function updateRevalidatedArtboards(items) {
    if (hasSameArtboardSnapshot(artboards, items)) {
      artboards = items;
      updateExportState();
      return;
    }
    renderArtboards(items);
  }

  function parseHostResult(rawResult) {
    try {
      return JSON.parse(rawResult);
    } catch (error) {
      return {
        ok: false,
        error: 'Illustrator returned an error: ' + String(rawResult || 'No response.')
      };
    }
  }

  function refreshArtboards(onComplete) {
    try {
      csInterface.evalScript('listArtboards(app)', function (rawResult) {
        var result = parseHostResult(rawResult);
        clearPreflightReport();
        if (result.ok) {
          renderArtboards(result.artboards);
        } else {
          artboards = [];
          renderArtboards([]);
          setStatus(result.error);
        }
        if (onComplete) {
          onComplete();
        }
      });
    } catch (error) {
      artboards = [];
      clearPreflightReport();
      renderArtboards([]);
      setStatus('Could not refresh Illustrator artboards. Please try again.');
      if (onComplete) {
        onComplete();
      }
    }
  }

  function enableSupportedExportFormats(onReady) {
    csInterface.evalScript('getExportCapabilities()', function (rawResult) {
      var result = parseHostResult(rawResult);
      if (result.ok && result.formats && result.formats.webp) {
        var option = document.createElement('option');
        option.value = 'webp';
        option.textContent = 'WebP';
        formatSelect.appendChild(option);
      }
      onReady();
    });
  }

  function loadHostWorkflow(onReady) {
    var extensionPath;
    var workflowPath;
    var expression;
    try {
      extensionPath = csInterface.getSystemPath(SystemPath.EXTENSION).replace(/[\\\/]$/, '');
      workflowPath = extensionPath + '/host/social-workflow.jsx';
      expression = '(function(){function escapeJson(value){return String(value)' +
        '.replace(/\\\\/g,"\\\\\\\\").replace(/"/g,"\\\\\\\"")' +
        '.replace(/\\r/g,"\\\\r").replace(/\\n/g,"\\\\n").replace(/\\t/g,"\\\\t");}' +
        'try{$.evalFile(new File(' + extendScriptString(workflowPath) +
        '));return \'{"ok":true}\';}catch(error){return \'{"ok":false,"error":"\' +' +
        'escapeJson(error) + \'"}\';}}())';
      csInterface.evalScript(expression, function (rawResult) {
        var result = parseHostResult(rawResult);
        if (!result.ok) {
          hostLoadError = result.error;
          updateCreateState();
          updateExportState();
          updatePreflightState();
          setStatus(hostFailureMessage());
          return;
        }
        hostReady = true;
        hostLoadError = '';
        updateCreateState();
        updateExportState();
        updatePreflightState();
        enableSupportedExportFormats(onReady);
      });
    } catch (error) {
      hostLoadError = error.message;
      updateCreateState();
      updateExportState();
      updatePreflightState();
      setStatus(hostFailureMessage());
    }
  }

  function extendScriptString(value) {
    return "'" + String(value)
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\r/g, '\\r')
      .replace(/\n/g, '\\n')
      .replace(/\u2028/g, '\\u2028')
      .replace(/\u2029/g, '\\u2029') + "'";
  }

  function remoteFailure() {
    updateButton.disabled = false;
    if (hostLoadError) {
      setStatus(hostFailureMessage('Preset updates could not be checked.'));
    } else if (activeCatalog) {
      setStatus(usingCatalogMessage('Preset updates could not be checked.'));
    } else {
      setStatus('Preset updates could not be checked and no valid offline catalog is available.');
    }
  }

  function checkRemoteCatalog(isAutomatic) {
    var request;
    if (isAutomatic) {
      recordAutomaticAttempt(new Date().toISOString());
    }
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
      setStatus(hostLoadError
        ? hostFailureMessage('Preset catalog updated to ' + validated.catalog.catalogVersion + '.')
        : 'Preset catalog updated to ' + validated.catalog.catalogVersion + '.');
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
      setStatus(hostLoadError ? hostFailureMessage() : usingCatalogMessage());
    } else {
      createButton.disabled = true;
      catalogInfo.textContent = 'No valid presets available';
      setStatus('No valid offline preset catalog is available.');
    }
    if (shouldCheckToday(cachedState &&
        (cachedState.lastAttemptedCheck || cachedState.lastSuccessfulCheck), new Date())) {
      checkRemoteCatalog(true);
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
    clearPreflightReport();
    setStatus('Renaming…');

    try {
      csInterface.evalScript('renameAllArtboards(app)', function (rawResult) {
        try {
          var result = JSON.parse(rawResult);
          setStatus(result.ok
            ? 'Renamed ' + result.renamed + ' artboard(s).'
            : result.error);
          button.disabled = false;
          refreshArtboards();
        } catch (error) {
          restore('Could not read Illustrator’s response. Please try again.');
          refreshArtboards();
        }
      });
    } catch (error) {
      restore('Could not start renaming. Please try again.');
    }
  });

  createButton.addEventListener('click', function () {
    var presets = selectedPresets();
    if (!hostReady) {
      updateCreateState();
      setStatus(hostLoadError ? hostFailureMessage() : 'Social workflow is not ready yet.');
      return;
    }
    if (!presets.length) {
      setStatus('Select at least one preset to create.');
      return;
    }
    createButton.disabled = true;
    clearPreflightReport();
    setStatus('Creating selected presets…');
    csInterface.evalScript('createPresetArtboards(app, ' + JSON.stringify(presets) + ')', function (rawResult) {
      var result = parseHostResult(rawResult);
      updateCreateState();
      if (!result.ok) {
        setStatus(result.error);
        refreshArtboards();
        return;
      }
      setStatus('Created ' + result.created.length + ' preset artboard(s).');
      refreshArtboards();
    });
  });

  addCustomPresetButton.addEventListener('click', function () {
    var candidate = {
      id: customPresetId.value.trim(),
      label: customPresetLabel.value.trim(),
      width: Number(customPresetWidth.value),
      height: Number(customPresetHeight.value)
    };
    var validation = validateCustomPresets([candidate]);
    var i;

    if (!validation.ok) {
      setStatus(validation.error);
      return;
    }
    if (activeCatalog) {
      for (i = 0; i < activeCatalog.presets.length; i += 1) {
        if (activeCatalog.presets[i].id === candidate.id) {
          setStatus('Preset ID already exists. Choose a unique ID.');
          return;
        }
      }
    }
    customPresets.push(candidate);
    if (!persistCustomPresets()) {
      customPresets.pop();
      setStatus('Could not save the custom preset.');
      return;
    }
    if (activeBaseCatalog) {
      renderCatalog(activeBaseCatalog, catalogSource);
    }
    customPresetId.value = '';
    customPresetLabel.value = '';
    customPresetWidth.value = '';
    customPresetHeight.value = '';
    setStatus('Added custom preset ' + candidate.label + '.');
  });

  runPreflightButton.addEventListener('click', runPreflight);

  function finishPreflightMutation() {
    refreshArtboards(function () {
      preflightBusy = false;
      updateExportState();
      updatePreflightState();
    });
  }

  createMissingButton.addEventListener('click', function () {
    var missing = [];
    var i;
    if (operationBusy() || !hostReady || !preflightReport) {
      updatePreflightState();
      return;
    }
    for (i = 0; i < preflightReport.results.length; i += 1) {
      if (preflightReport.results[i].status === 'missing') {
        missing.push(preflightReport.results[i].preset);
      }
    }
    if (!missing.length) {
      updatePreflightState();
      return;
    }
    preflightBusy = true;
    clearPreflightReport();
    updateExportState();
    setStatus('Creating missing preset artboards…');
    try {
      csInterface.evalScript(
        'createPresetArtboards(app, ' + JSON.stringify(missing) + ')',
        function (rawResult) {
          var result = parseHostResult(rawResult);
          setStatus(result.ok
            ? 'Created ' + result.created.length + ' missing preset artboard(s).'
            : result.error);
          finishPreflightMutation();
        }
      );
    } catch (error) {
      preflightBusy = false;
      updateExportState();
      updatePreflightState();
      setStatus('Could not start creating missing artboards. Please try again.');
    }
  });

  renameFixableButton.addEventListener('click', function () {
    var changes;
    if (operationBusy() || !hostReady || !preflightReport) {
      updatePreflightState();
      return;
    }
    changes = fixableRenameChanges(preflightReport);
    if (!changes.length) {
      updatePreflightState();
      return;
    }
    preflightBusy = true;
    clearPreflightReport();
    updateExportState();
    setStatus('Renaming fixable artboards…');
    try {
      csInterface.evalScript(
        'renameArtboards(app, ' + JSON.stringify(changes) + ')',
        function (rawResult) {
          var result = parseHostResult(rawResult);
          setStatus(result.ok
            ? 'Renamed ' + result.renamed.length + ' fixable artboard(s).'
            : result.error);
          finishPreflightMutation();
        }
      );
    } catch (error) {
      preflightBusy = false;
      updateExportState();
      updatePreflightState();
      setStatus('Could not start renaming fixable artboards. Please try again.');
    }
  });

  function finishExport() {
    exportBusy = false;
    updateExportState();
    updatePreflightState();
  }

  function completeExport(exportRequest, rawResult) {
    var result = parseHostResult(rawResult);
    var confirmationMessage;
    if (result.ok) {
      setStatus('Exported ' + result.exported.length + ' artboard(s).');
      finishExport();
      return;
    }
    if (result.code === 'OUTPUT_EXISTS' && result.conflicts &&
        result.conflicts.length && exportRequest.overwriteExisting !== true) {
      confirmationMessage = 'These files already exist:\n\n' +
        result.conflicts.join('\n') + '\n\nOverwrite all of them?';
      if (window.confirm(confirmationMessage)) {
        exportRequest.overwriteExisting = true;
        setStatus('Exporting and overwriting confirmed files…');
        sendExportRequest(exportRequest);
        return;
      }
      setStatus('Export cancelled; no existing files were overwritten.');
      finishExport();
      return;
    }
    setStatus(result.error);
    finishExport();
  }

  function sendExportRequest(exportRequest) {
    try {
      csInterface.evalScript(
        'exportArtboards(app, ' + JSON.stringify(exportRequest) + ')',
        function (rawResult) {
          completeExport(exportRequest, rawResult);
        }
      );
    } catch (error) {
      setStatus('Could not start exporting. Please try again.');
      finishExport();
    }
  }

  exportButton.addEventListener('click', function () {
    var selected = selectedArtboards();
    var collisions = findFilenameCollisions(selected, formatSelect.value);
    var indexes = [];
    var i;
    if (operationBusy() || !hostReady) {
      updateExportState();
      setStatus(hostLoadError ? hostFailureMessage() : 'Social workflow is not ready yet.');
      return;
    }
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
    exportBusy = true;
    updateExportState();
    updatePreflightState();
    setStatus('Exporting selected artboards…');
    sendExportRequest(exportRequest);
  });

  function passPresetKeys(report) {
    var keys = [];
    var i;
    for (i = 0; i < report.results.length; i += 1) {
      if (report.results[i].status === 'pass') {
        keys.push(report.results[i].preset.id + ':' + report.results[i].canonicalName);
      }
    }
    keys.sort();
    return keys;
  }

  function hasSamePassSet(previousReport, freshReport) {
    var previousKeys = passPresetKeys(previousReport);
    var freshKeys = passPresetKeys(freshReport);
    var i;
    if (previousKeys.length !== freshKeys.length) {
      return false;
    }
    for (i = 0; i < previousKeys.length; i += 1) {
      if (previousKeys[i] !== freshKeys[i]) {
        return false;
      }
    }
    return true;
  }

  function requiredPresetIdentitySnapshot(requiredPresets) {
    var snapshot = [];
    var i;
    for (i = 0; i < requiredPresets.length; i += 1) {
      snapshot.push({
        id: requiredPresets[i].id,
        width: requiredPresets[i].width,
        height: requiredPresets[i].height
      });
    }
    return snapshot;
  }

  function hasSameRequiredPresetSnapshot(snapshot, requiredPresets) {
    var i;
    if (snapshot.length !== requiredPresets.length) {
      return false;
    }
    for (i = 0; i < snapshot.length; i += 1) {
      if (snapshot[i].id !== requiredPresets[i].id ||
          snapshot[i].width !== requiredPresets[i].width ||
          snapshot[i].height !== requiredPresets[i].height) {
        return false;
      }
    }
    return true;
  }

  exportVerifiedButton.addEventListener('click', function () {
    var approvedReport = preflightReport;
    var approvedRequiredPresetSnapshot = requiredPresetIdentitySnapshot(
      selectedPreflightPresets()
    );
    if (operationBusy() || !hostReady || !preflightCanExport(approvedReport) ||
        !destinationInput.value.trim()) {
      updatePreflightState();
      return;
    }
    exportBusy = true;
    updateExportState();
    updatePreflightState();
    setStatus('Revalidating verified artboards…');
    try {
      csInterface.evalScript('listArtboards(app)', function (rawResult) {
        var result = parseHostResult(rawResult);
        var requiredPresets;
        var freshReport;
        var indexes = [];
        var i;
        if (!result.ok) {
          setStatus(result.error);
          finishExport();
          return;
        }
        updateRevalidatedArtboards(result.artboards);
        requiredPresets = selectedPreflightPresets();
        if (!hasSameRequiredPresetSnapshot(
          approvedRequiredPresetSnapshot,
          requiredPresets
        )) {
          clearPreflightReport();
          setStatus(
            'Verified export stopped because the required preset selection changed. ' +
            'Run Preflight again.'
          );
          finishExport();
          return;
        }
        freshReport = buildPreflightReport(requiredPresets, result.artboards);
        preflightReport = freshReport;
        renderPreflightReport(freshReport);
        updatePreflightState();
        if (!preflightCanExport(freshReport) ||
            !hasSamePassSet(approvedReport, freshReport)) {
          setStatus('Verified export stopped because the artboards changed. Review Preflight.');
          finishExport();
          return;
        }
        for (i = 0; i < freshReport.results.length; i += 1) {
          if (freshReport.results[i].status === 'pass') {
            indexes.push(freshReport.results[i].artboards[0].index);
          }
        }
        setStatus('Exporting verified artboards…');
        sendExportRequest({
          artboardIndexes: indexes,
          destination: destinationInput.value.trim(),
          format: formatSelect.value
        });
      });
    } catch (error) {
      setStatus('Could not revalidate Illustrator artboards. Please try again.');
      finishExport();
    }
  });

  updateButton.addEventListener('click', function () {
    checkRemoteCatalog(false);
  });
  formatSelect.addEventListener('change', function () {
    updateExportState();
    updatePreflightState();
  });
  destinationInput.addEventListener('input', function () {
    updateExportState();
    updatePreflightState();
  });

  loadBundledCatalog();
  loadHostWorkflow(refreshArtboards);
}());
