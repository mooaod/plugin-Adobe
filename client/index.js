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
  var operationInProgress = false;
  var hostReady = false;
  var hostLoadError = '';
  var cachedState = readCache();
  var customPresets = readCustomPresets();

  function initializeAccordions() {
    var triggers = document.querySelectorAll
      ? document.querySelectorAll('.accordion-trigger')
      : [];
    var i;
    for (i = 0; i < triggers.length; i += 1) {
      triggers[i].addEventListener('click', function () {
        var body = document.getElementById(this.dataset.accordionTarget);
        var expanded = this.getAttribute('aria-expanded') === 'true';
        if (!body) {
          return;
        }
        this.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        body.hidden = expanded;
      });
    }
  }

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
    createButton.disabled = operationBusy() || !hostReady || selectedPresets().length === 0;
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
    return operationInProgress;
  }

  function updateLegacyRenameState() {
    button.disabled = operationBusy();
  }

  function updateOperationInputs() {
    var disabled = operationBusy();
    var i;
    for (i = 0; i < presetCheckboxes.length; i += 1) {
      presetCheckboxes[i].disabled = disabled;
    }
    for (i = 0; i < preflightCheckboxes.length; i += 1) {
      preflightCheckboxes[i].disabled = disabled;
    }
    for (i = 0; i < artboardCheckboxes.length; i += 1) {
      artboardCheckboxes[i].disabled = disabled;
    }
    formatSelect.disabled = disabled;
    destinationInput.disabled = disabled;
    addCustomPresetButton.disabled = disabled;
  }

  function updateOperationState() {
    updateLegacyRenameState();
    updateOperationInputs();
    updateCreateState();
    updateExportState();
    updatePreflightState();
  }

  function beginOperation() {
    if (operationBusy()) {
      updateOperationState();
      return false;
    }
    operationInProgress = true;
    updateOperationState();
    return true;
  }

  function finishOperation() {
    operationInProgress = false;
    updateOperationState();
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
    clearElement(preflightSummary);
    preflightSummary.className = 'preflight-summary';
    clearElement(preflightResults);
    updatePreflightState();
  }

  function preflightStatusMeta(statusName) {
    return {
      pass: { icon: '✓', label: 'Pass' },
      rename: { icon: '!', label: 'Rename' },
      missing: { icon: '×', label: 'Missing' },
      duplicate: { icon: '−', label: 'Duplicate' }
    }[statusName];
  }

  function appendPreflightSummaryRow(statusName, count) {
    var meta = preflightStatusMeta(statusName);
    var row = document.createElement('div');
    var icon = document.createElement('span');
    var countLabel = document.createElement('span');
    var badge = document.createElement('span');
    row.className = 'preflight-summary-row ' + statusName;
    row.dataset.status = statusName;
    icon.className = 'preflight-status-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = meta.icon;
    countLabel.textContent = count + ' ' + meta.label;
    badge.className = 'preflight-status-badge';
    badge.textContent = meta.label;
    row.appendChild(icon);
    row.appendChild(countLabel);
    row.appendChild(badge);
    preflightSummary.appendChild(row);
  }

  function renderPreflightReport(report) {
    var i;
    var j;
    var result;
    var item;
    var matchingNames;
    clearElement(preflightSummary);
    preflightSummary.className = 'preflight-summary';
    appendPreflightSummaryRow('pass', report.summary.pass);
    appendPreflightSummaryRow('rename', report.summary.rename);
    appendPreflightSummaryRow('missing', report.summary.missing);
    appendPreflightSummaryRow('duplicate', report.summary.duplicate);
    clearElement(preflightResults);
    for (i = 0; i < report.results.length; i += 1) {
      result = report.results[i];
      item = document.createElement('div');
      item.className = 'preflight-result ' + result.status;
      matchingNames = [];
      for (j = 0; j < result.artboards.length; j += 1) {
        matchingNames.push(result.artboards[j].name);
      }
      item.textContent = result.preset.label + ' — ' +
        result.status.charAt(0).toUpperCase() + result.status.slice(1) +
        (matchingNames.length ? ' — ' + matchingNames.join(', ') : '');
      preflightResults.appendChild(item);
    }
  }

  function runPreflight() {
    var requiredPresets = selectedPreflightPresets();
    var requiredPresetSnapshot;
    if (operationBusy()) {
      updatePreflightState();
      return;
    }
    if (!requiredPresets.length) {
      setStatus('Select at least one required delivery size.');
      updatePreflightState();
      return;
    }
    if (!hostReady) {
      setStatus(hostLoadError ? hostFailureMessage() : 'Social workflow is not ready yet.');
      updatePreflightState();
      return;
    }
    requiredPresetSnapshot = requiredPresetIdentitySnapshot(requiredPresets);
    beginOperation();
    clearPreflightReport();
    setStatus('Checking current Illustrator artboards…');
    try {
      csInterface.evalScript('listArtboards(app)', function (rawResult) {
        var result = parseHostResult(rawResult);
        var report;
        if (!result.ok) {
          artboards = [];
          renderArtboards([]);
          clearPreflightReport();
          setStatus(result.error);
          finishOperation();
          return;
        }
        updateRevalidatedArtboards(result.artboards);
        if (!hasSameRequiredPresetSnapshot(
          requiredPresetSnapshot,
          selectedPreflightPresets()
        )) {
          clearPreflightReport();
          setStatus('Preflight stopped because the required preset selection changed. Run it again.');
          finishOperation();
          return;
        }
        report = buildPreflightReport(requiredPresets, result.artboards);
        if (report && report.ok === false) {
          clearPreflightReport();
          setStatus(report.error);
          finishOperation();
          return;
        }
        preflightReport = report;
        renderPreflightReport(preflightReport);
        setStatus('Preflight complete.');
        finishOperation();
      });
    } catch (error) {
      artboards = [];
      renderArtboards([]);
      clearPreflightReport();
      setStatus('Could not refresh Illustrator artboards. Please try again.');
      finishOperation();
    }
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
    clearPreflightReport();
    updateOperationState();
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

  button.addEventListener('click', function () {
    if (!beginOperation()) {
      return;
    }
    clearPreflightReport();
    setStatus('Renaming…');

    try {
      csInterface.evalScript('renameAllArtboards(app)', function (rawResult) {
        var result = parseHostResult(rawResult);
        setStatus(result.ok
          ? 'Renamed ' + result.renamed + ' artboard(s).'
          : result.error);
        refreshArtboards(finishOperation);
      });
    } catch (error) {
      setStatus('Could not start renaming. Please try again.');
      finishOperation();
    }
  });

  createButton.addEventListener('click', function () {
    var presets = selectedPresets();
    if (operationBusy()) {
      updateOperationState();
      return;
    }
    if (!hostReady) {
      updateCreateState();
      setStatus(hostLoadError ? hostFailureMessage() : 'Social workflow is not ready yet.');
      return;
    }
    if (!presets.length) {
      setStatus('Select at least one preset to create.');
      return;
    }
    beginOperation();
    clearPreflightReport();
    setStatus('Creating selected presets…');
    try {
      csInterface.evalScript(
        'createPresetArtboards(app, ' + JSON.stringify(presets) + ')',
        function (rawResult) {
          var result = parseHostResult(rawResult);
          setStatus(result.ok
            ? 'Created ' + result.created.length + ' preset artboard(s).'
            : result.error);
          refreshArtboards(finishOperation);
        }
      );
    } catch (error) {
      setStatus('Could not start creating preset artboards. Please try again.');
      finishOperation();
    }
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

    if (operationBusy()) {
      updateOperationState();
      return;
    }
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
    refreshArtboards(finishOperation);
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
    beginOperation();
    clearPreflightReport();
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
      setStatus('Could not start creating missing artboards. Please try again.');
      finishOperation();
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
    beginOperation();
    clearPreflightReport();
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
      setStatus('Could not start renaming fixable artboards. Please try again.');
      finishOperation();
    }
  });

  function finishExport() {
    finishOperation();
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
    beginOperation();
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
    beginOperation();
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
        if (freshReport && freshReport.ok === false) {
          clearPreflightReport();
          setStatus(freshReport.error);
          finishExport();
          return;
        }
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
    if (operationBusy()) {
      updateOperationState();
      return;
    }
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

  initializeAccordions();
  loadBundledCatalog();
  loadHostWorkflow(refreshArtboards);
}());
