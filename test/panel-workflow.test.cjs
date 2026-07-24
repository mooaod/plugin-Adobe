const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const controllerSource = fs.readFileSync(
  path.join(__dirname, '..', 'client', 'index.js'),
  'utf8'
);
const catalogSource = fs.readFileSync(
  path.join(__dirname, '..', 'client', 'catalog.js'),
  'utf8'
);
const exportModelSource = fs.readFileSync(
  path.join(__dirname, '..', 'client', 'export-model.js'),
  'utf8'
);
const preflightModelSource = fs.readFileSync(
  path.join(__dirname, '..', 'client', 'preflight-model.js'),
  'utf8'
);

function catalog(version) {
  return {
    schemaVersion: 1,
    catalogVersion: version || '1.0.0',
    updatedAt: '2026-07-17',
    presets: [
      { id: 'instagram-feed', label: 'Instagram Feed', width: 1080, height: 1080 }
    ]
  };
}

function fourPresetCatalog() {
  return {
    schemaVersion: 1,
    catalogVersion: '1.0.0',
    updatedAt: '2026-07-17',
    presets: [
      { id: 'instagram-feed', label: 'Instagram Feed', width: 1080, height: 1080 },
      { id: 'instagram-portrait', label: 'Instagram Portrait', width: 1080, height: 1350 },
      { id: 'instagram-story', label: 'Instagram Story', width: 1080, height: 1920 },
      { id: 'facebook-feed', label: 'Facebook Feed', width: 1200, height: 630 }
    ]
  };
}

function sameDimensionCatalog() {
  return {
    schemaVersion: 1,
    catalogVersion: '1.0.0',
    updatedAt: '2026-07-17',
    presets: [
      { id: 'instagram-feed', label: 'Instagram Feed', width: 1080, height: 1080 },
      { id: 'square-alt', label: 'Square Alternate', width: 1080, height: 1080 }
    ]
  };
}

function hostCallPayload(call, prefix) {
  assert.ok(call && call.indexOf(prefix) === 0, 'expected host call starting with ' + prefix);
  return JSON.parse(call.slice(prefix.length, -1));
}

class FakeElement {
  constructor(id, tagName) {
    this.id = id || '';
    this.tagName = tagName || 'div';
    this.children = [];
    this.dataset = {};
    this.attributes = {};
    this.hidden = false;
    this.listeners = {};
    this._textContent = '';
    this.value = '';
    this.checked = false;
    this.disabled = false;
    this.className = '';
    this.type = '';
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }

  getAttribute(name) {
    return this.attributes[name] || null;
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  get textContent() {
    return this._textContent + this.children.map(function (child) {
      return child.textContent;
    }).join('');
  }

  set textContent(value) {
    this._textContent = String(value);
    this.children = [];
  }

  get firstChild() {
    return this.children[0] || null;
  }

  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index >= 0) {
      this.children.splice(index, 1);
    }
    return child;
  }

  addEventListener(type, listener) {
    this.listeners[type] = listener;
  }

  dispatch(type) {
    if (this.listeners[type]) {
      this.listeners[type].call(this, { target: this });
    }
  }
}

function fakeDocument() {
  const ids = [
    'rename-button', 'preset-list', 'create-presets-button', 'catalog-info',
    'update-presets-button', 'format-select', 'artboard-list',
    'destination-input', 'export-button', 'collision-warning', 'status',
    'custom-preset-id', 'custom-preset-label', 'custom-preset-width',
    'custom-preset-height', 'add-custom-preset-button',
    'preflight-preset-list', 'run-preflight-button', 'preflight-summary',
    'preflight-results', 'create-missing-button', 'rename-fixable-button',
    'export-verified-button', 'presets-trigger', 'presets-body',
    'preflight-trigger', 'preflight-body', 'export-trigger', 'export-body'
  ];
  const elements = {};
  ids.forEach(function (id) {
    elements[id] = new FakeElement(id);
  });
  elements['format-select'].value = 'png';
  elements['destination-input'].value = '/exports';
  elements['presets-trigger'].dataset.accordionTarget = 'presets-body';
  elements['presets-trigger'].setAttribute('aria-expanded', 'true');
  elements['preflight-trigger'].dataset.accordionTarget = 'preflight-body';
  elements['preflight-trigger'].setAttribute('aria-expanded', 'true');
  elements['export-trigger'].dataset.accordionTarget = 'export-body';
  elements['export-trigger'].setAttribute('aria-expanded', 'false');
  elements['export-body'].hidden = true;

  return {
    elements: elements,
    getElementById: function (id) { return elements[id] || null; },
    createElement: function (tagName) { return new FakeElement('', tagName); },
    querySelectorAll: function (selector) {
      return selector === '.accordion-trigger'
        ? [
          elements['presets-trigger'],
          elements['preflight-trigger'],
          elements['export-trigger']
        ]
        : [];
    }
  };
}

function runPanel(options) {
  options = options || {};
  const document = fakeDocument();
  const artboardResults = options.artboardResults
    ? options.artboardResults.slice()
    : null;
  const renameResults = options.renameResults
    ? options.renameResults.slice()
    : null;
  const deferredPrefixes = [];
  const pendingCallbacks = [];
  const thrownPrefixes = [];
  const bridge = {
    calls: [],
    deferNext: function (prefix) {
      deferredPrefixes.push(prefix);
    },
    throwNext: function (prefix) {
      thrownPrefixes.push(prefix);
    },
    completeNext: function (prefix) {
      const index = pendingCallbacks.findIndex(function (pending) {
        return pending.script.indexOf(prefix) === 0;
      });
      assert.notEqual(index, -1, 'expected a pending callback for ' + prefix);
      const pending = pendingCallbacks.splice(index, 1)[0];
      pending.callback(pending.rawResult);
    },
    evalScript: function (script, callback) {
      let rawResult;
      this.calls.push(script);
      const thrownIndex = thrownPrefixes.findIndex(function (prefix) {
        return script.indexOf(prefix) === 0;
      });
      if (thrownIndex >= 0) {
        thrownPrefixes.splice(thrownIndex, 1);
        throw new Error('bridge start failed');
      }
      if (script.indexOf('$.evalFile') >= 0) {
        rawResult = options.hostLoadResult || JSON.stringify({ ok: true });
      } else if (script === 'getExportCapabilities()') {
        rawResult = JSON.stringify(options.capabilitiesResult || {
          ok: true,
          formats: { png: true, jpg: true, webp: true }
        });
      } else if (script === 'listArtboards(app)') {
        const artboardResult = artboardResults && artboardResults.length
          ? (artboardResults.length > 1 ? artboardResults.shift() : artboardResults[0])
          : options.artboardResult;
        rawResult = JSON.stringify(artboardResult || {
          ok: true,
          artboards: [{ index: 0, name: 'Board', width: 100, height: 100 }]
        });
      } else if (script.indexOf('renameArtboards(app, ') === 0) {
        rawResult = JSON.stringify(renameResults && renameResults.length
          ? (renameResults.length > 1 ? renameResults.shift() : renameResults[0])
          : { ok: true, renamed: [] });
      } else if (script.indexOf('exportArtboards(app, ') === 0 && options.exportResults) {
        rawResult = JSON.stringify(options.exportResults.shift());
      } else if (script.indexOf('createPresetArtboards(app, ') === 0 && options.createRawResult) {
        rawResult = options.createRawResult;
      } else {
        rawResult = JSON.stringify({ ok: true, created: [], exported: [] });
      }
      const deferredIndex = deferredPrefixes.findIndex(function (prefix) {
        return script.indexOf(prefix) === 0;
      });
      if (deferredIndex >= 0) {
        deferredPrefixes.splice(deferredIndex, 1);
        pendingCallbacks.push({
          script: script,
          callback: callback,
          rawResult: rawResult
        });
        return;
      }
      callback(rawResult);
    },
    getSystemPath: function (pathType) {
      return pathType === 'extension' ? '/extension root' : '/user-data';
    }
  };
  const cacheState = options.cacheState;
  const customState = options.customState;
  const writes = [];
  const cep = {
    fs: {
      readFile: function (filePath) {
        const value = filePath.indexOf('social-presets-custom.json') >= 0
          ? customState
          : cacheState;
        return value
          ? { err: 0, data: JSON.stringify(value) }
          : { err: 2, data: '' };
      },
      makedir: function () { return { err: 0 }; },
      writeFile: function (filePath, data) {
        writes.push({ filePath: filePath, data: data });
        return {
          err: options.customWriteError && filePath.indexOf('social-presets-custom.json') >= 0
            ? 5
            : 0
        };
      }
    }
  };
  const requests = [];

  function FakeXMLHttpRequest() {
    this.status = 0;
    this.responseText = '';
  }
  FakeXMLHttpRequest.prototype.open = function (method, url) {
    this.method = method;
    this.url = url;
  };
  FakeXMLHttpRequest.prototype.send = function (body) {
    this.body = body;
    requests.push(this);
    if (this.url === '../catalog/social-presets.json') {
      this.status = 200;
      this.responseText = JSON.stringify(options.bundledCatalog || catalog());
      this.onload();
      return;
    }
    const remote = options.remote || { type: 'error' };
    if (remote.type === 'load') {
      this.status = remote.status;
      this.responseText = remote.body;
      this.onload();
    } else {
      this.onerror();
    }
  };

  const context = {
    console: console,
    CSInterface: function () { return bridge; },
    Date: Date,
    document: document,
    JSON: JSON,
    SystemPath: { USER_DATA: 'userData', EXTENSION: 'extension' },
    XMLHttpRequest: FakeXMLHttpRequest,
    window: {
      cep: cep,
      confirm: function (message) {
        context.confirmMessages.push(message);
        if (message.indexOf('Delete custom preset') === 0) {
          return options.confirmDelete === true;
        }
        return options.confirmOverwrite === true;
      }
    },
    confirmMessages: []
  };
  vm.createContext(context);
  vm.runInContext(catalogSource, context);
  vm.runInContext(exportModelSource, context);
  vm.runInContext(preflightModelSource, context);
  vm.runInContext(controllerSource, context);

  return {
    bridge: bridge,
    document: document,
    requests: requests,
    writes: writes,
    confirmMessages: context.confirmMessages
  };
}

test('uses same-day cached presets, lists artboards, and blocks colliding exports', function () {
  const cached = catalog('1.1.0');
  const panel = runPanel({
    cacheState: {
      catalog: cached,
      source: 'cache',
      lastSuccessfulCheck: new Date().toISOString()
    },
    artboardResult: {
      ok: true,
      artboards: [
        { index: 0, name: 'A/B', width: 100, height: 100 },
        { index: 1, name: 'A:B', width: 100, height: 100 }
      ]
    }
  });
  const remoteRequests = panel.requests.filter(function (request) {
    return request.url.indexOf('https://') === 0;
  });

  assert.match(panel.bridge.calls[0], /\$\.evalFile/);
  assert.match(panel.bridge.calls[0], /\/extension root\/host\/social-workflow\.jsx/);
  assert.equal(panel.bridge.calls[1], 'getExportCapabilities()');
  assert.equal(panel.bridge.calls[2], 'listArtboards(app)');
  assert.equal(remoteRequests.length, 0);
  assert.match(panel.document.elements.status.textContent, /Using cached presets/);
  assert.equal(panel.document.elements['export-button'].disabled, true);
  assert.match(panel.document.elements['collision-warning'].textContent, /A-B\.png/);
});

test('loads the social host workflow before listing artboards', function () {
  const panel = runPanel({
    cacheState: {
      catalog: catalog(),
      source: 'cache',
      lastSuccessfulCheck: new Date().toISOString()
    }
  });

  assert.match(panel.bridge.calls[0], /\$\.evalFile/);
  assert.equal(panel.bridge.calls[1], 'getExportCapabilities()');
  assert.equal(panel.bridge.calls[2], 'listArtboards(app)');
});

test('generated host loader returns JSON when ExtendScript has no JSON global', function () {
  const panel = runPanel({
    cacheState: {
      catalog: catalog(),
      source: 'cache',
      lastSuccessfulCheck: new Date().toISOString()
    }
  });
  const loadedPaths = [];
  const rawResult = vm.runInNewContext(panel.bridge.calls[0], {
    JSON: undefined,
    File: function File(filePath) { this.filePath = filePath; },
    $: {
      evalFile: function (file) { loadedPaths.push(file.filePath); }
    }
  });

  assert.doesNotMatch(panel.bridge.calls[0], /\bJSON\b/);
  assert.deepEqual(JSON.parse(rawResult), { ok: true });
  assert.deepEqual(loadedPaths, ['/extension root/host/social-workflow.jsx']);

  const failedResult = vm.runInNewContext(panel.bridge.calls[0], {
    JSON: undefined,
    File: function File(filePath) { this.filePath = filePath; },
    $: {
      evalFile: function () { throw 'missing "host"\\path\nnext'; }
    }
  });
  assert.deepEqual(JSON.parse(failedResult), {
    ok: false,
    error: 'missing "host"\\path\nnext'
  });
});

test('host load failure still renders offline presets and keeps host actions guarded', function () {
  const panel = runPanel({
    hostLoadResult: JSON.stringify({ ok: false, error: 'missing host file' }),
    cacheState: {
      catalog: catalog(),
      source: 'cache',
      lastSuccessfulCheck: new Date().toISOString()
    },
    remote: {
      type: 'load',
      status: 200,
      body: JSON.stringify(catalog('1.2.0'))
    }
  });

  assert.equal(panel.bridge.calls.length, 1);
  assert.equal(panel.document.elements['preset-list'].children.length, 1);
  assert.match(panel.document.elements.status.textContent, /Could not load social workflow/);
  assert.match(panel.document.elements.status.textContent, /missing host file/);
  assert.equal(panel.document.elements['create-presets-button'].disabled, true);
  assert.equal(panel.document.elements['export-button'].disabled, true);

  panel.document.elements['update-presets-button'].dispatch('click');
  assert.equal(panel.document.elements['preset-list'].children.length, 1);
  assert.equal(panel.document.elements['create-presets-button'].disabled, true);
  assert.equal(panel.document.elements['export-button'].disabled, true);

  panel.document.elements['create-presets-button'].dispatch('click');
  panel.document.elements['export-button'].dispatch('click');
  assert.equal(panel.bridge.calls.length, 1);
});

test('manual update always fetches after a successful same-day check', function () {
  const panel = runPanel({
    cacheState: {
      catalog: catalog('1.0.0'),
      source: 'cache',
      lastSuccessfulCheck: new Date().toISOString()
    },
    remote: {
      type: 'load',
      status: 200,
      body: JSON.stringify(catalog('1.2.0'))
    }
  });

  assert.equal(panel.requests.filter(function (request) {
    return request.url.indexOf('https://') === 0;
  }).length, 0);

  panel.document.elements['update-presets-button'].dispatch('click');
  const remoteRequests = panel.requests.filter(function (request) {
    return request.url.indexOf('https://') === 0;
  });

  assert.equal(remoteRequests.length, 1);
  assert.equal(
    remoteRequests[0].url,
    'https://raw.githubusercontent.com/mooaod/plugin-Adobe/main/social-presets.json'
  );
  assert.equal(remoteRequests[0].method, 'GET');
  assert.equal(remoteRequests[0].body, null);
  assert.match(panel.document.elements.status.textContent, /updated to 1\.2\.0/);
  assert.equal(panel.writes.length, 1);
  assert.deepEqual(
    Object.keys(JSON.parse(panel.writes[0].data)).sort(),
    ['catalog', 'lastSuccessfulCheck', 'source']
  );
});

test('failed automatic update retains and reports the valid cached catalog', function () {
  const panel = runPanel({
    cacheState: {
      catalog: catalog('1.1.0'),
      source: 'cache',
      lastSuccessfulCheck: '2026-07-15T00:00:00.000Z'
    },
    remote: { type: 'error' }
  });

  assert.equal(panel.document.elements['preset-list'].children.length, 1);
  assert.match(panel.document.elements.status.textContent, /Using cached presets/);
  assert.match(panel.document.elements.status.textContent, /could not be checked/i);
  assert.equal(panel.writes.length, 1);

  const persistedState = JSON.parse(panel.writes[0].data);
  assert.ok(persistedState.lastAttemptedCheck);

  const secondPanel = runPanel({
    cacheState: persistedState,
    remote: { type: 'error' }
  });
  const secondRemoteRequests = secondPanel.requests.filter(function (request) {
    return request.url.indexOf('https://') === 0;
  });

  assert.equal(secondRemoteRequests.length, 0);
  secondPanel.document.elements['update-presets-button'].dispatch('click');
  assert.equal(secondPanel.requests.filter(function (request) {
    return request.url.indexOf('https://') === 0;
  }).length, 1);
});

test('HTML loads catalog and export model before the panel controller', function () {
  const html = fs.readFileSync(path.join(__dirname, '..', 'client', 'index.html'), 'utf8');
  const catalogIndex = html.indexOf('catalog.js');
  const exportModelIndex = html.indexOf('export-model.js');
  const controllerIndex = html.indexOf('index.js');

  assert.ok(catalogIndex >= 0);
  assert.ok(exportModelIndex > catalogIndex);
  assert.ok(controllerIndex > exportModelIndex);
});

test('shows the operation status directly below the preset creation button', function () {
  const html = fs.readFileSync(path.join(__dirname, '..', 'client', 'index.html'), 'utf8');
  const createButtonIndex = html.indexOf('id="create-presets-button"');
  const statusIndex = html.indexOf('id="status"');
  const customFormIndex = html.indexOf('class="custom-preset-form"');

  assert.ok(createButtonIndex >= 0);
  assert.ok(statusIndex > createButtonIndex);
  assert.ok(statusIndex < customFormIndex);
});

test('leaves every preset unselected when the panel opens', function () {
  const panel = runPanel({
    cacheState: {
      catalog: catalog(),
      source: 'cache',
      lastSuccessfulCheck: new Date().toISOString()
    }
  });
  const presetCheckbox = panel.document.elements['preset-list'].children[0].children[0];

  assert.equal(presetCheckbox.checked, false);
  assert.equal(panel.document.elements['create-presets-button'].disabled, true);
});

test('starts required delivery presets unchecked and disables preflight actions', function () {
  const panel = runPanel({ cacheState: { catalog: catalog(), source: 'cache', lastSuccessfulCheck: new Date().toISOString() } });
  assert.equal(panel.document.elements['preflight-preset-list'].children[0].children[0].checked, false);
  assert.equal(panel.document.elements['run-preflight-button'].disabled, true);
  assert.equal(panel.document.elements['export-verified-button'].disabled, true);
});

test('accordion cards collapse independently while preserving destination, report, and selections', function () {
  const panel = runPanel({ bundledCatalog: fourPresetCatalog() });
  const presets = panel.document.elements['presets-body'];
  const preflight = panel.document.elements['preflight-body'];
  const exportBody = panel.document.elements['export-body'];
  const presetsTrigger = panel.document.elements['presets-trigger'];
  const preflightTrigger = panel.document.elements['preflight-trigger'];
  const exportTrigger = panel.document.elements['export-trigger'];
  const required = panel.document.elements['preflight-preset-list'].children[0].children[0];
  const normalExportSelection = panel.document.elements['artboard-list'].children[0].children[0];

  required.checked = true;
  required.dispatch('change');
  normalExportSelection.checked = false;
  normalExportSelection.dispatch('change');
  panel.document.elements['destination-input'].value = '/preserved-destination';
  panel.document.elements['destination-input'].dispatch('input');
  panel.document.elements['run-preflight-button'].dispatch('click');

  presetsTrigger.dispatch('click');
  assert.equal(presets.hidden, true);
  assert.equal(preflight.hidden, false);
  assert.equal(exportBody.hidden, true);
  preflightTrigger.dispatch('click');
  assert.equal(preflight.hidden, true);
  assert.equal(presets.hidden, true);
  assert.equal(exportBody.hidden, true);
  exportTrigger.dispatch('click');
  assert.equal(exportBody.hidden, false);
  assert.equal(exportTrigger.getAttribute('aria-expanded'), 'true');
  assert.equal(presets.hidden, true);
  assert.equal(preflight.hidden, true);
  exportTrigger.dispatch('click');
  assert.equal(exportBody.hidden, true);
  assert.equal(panel.document.elements['destination-input'].value, '/preserved-destination');
  assert.equal(required.checked, true);
  assert.equal(normalExportSelection.checked, false);
  assert.equal(panel.document.elements['preflight-summary'].children.length, 4);
  assert.equal(panel.document.elements['preflight-results'].children.length, 1);
});

test('preflight renders fixed-order semantic summary rows for every status', function () {
  const panel = runPanel({
    bundledCatalog: fourPresetCatalog(),
    artboardResult: {
      ok: true,
      artboards: [
        { index: 0, name: 'instagram-feed_1080x1080 px', width: 1080, height: 1080 },
        { index: 1, name: 'Portrait draft', width: 1080, height: 1350 },
        { index: 2, name: 'instagram-story_1080x1920 px', width: 1080, height: 1920 }
      ]
    }
  });
  const required = panel.document.elements['preflight-preset-list'].children;
  let i;

  for (i = 0; i < required.length; i += 1) {
    required[i].children[0].checked = true;
    required[i].children[0].dispatch('change');
  }
  panel.document.elements['run-preflight-button'].dispatch('click');

  assert.equal(panel.document.elements['preflight-summary'].children.length, 4);
  assert.deepEqual(
    panel.document.elements['preflight-summary'].children.map(function (row) {
      return row.dataset.status + ':' + row.children[1].textContent;
    }),
    ['pass:2 Pass', 'rename:1 Rename', 'missing:1 Missing', 'duplicate:0 Duplicate']
  );
  assert.equal(panel.document.elements['preflight-summary'].children[0].children[0].textContent, '✓');
  assert.equal(panel.document.elements['preflight-summary'].children[0].children[0].getAttribute('aria-hidden'), 'true');
  assert.equal(panel.document.elements['preflight-summary'].children[0].children[2].textContent, 'Pass');
  assert.equal(panel.document.elements['preflight-summary'].children[0].children[2].getAttribute('aria-hidden'), 'true');
});

test('Run Preflight fetches Illustrator changes again before every rerun and renders matching names', function () {
  const panel = runPanel({
    cacheState: {
      catalog: catalog(), source: 'cache',
      lastSuccessfulCheck: new Date().toISOString()
    },
    artboardResults: [
      { ok: true, artboards: [
        { index: 0, name: 'instagram-feed_1080x1080 px', width: 1080, height: 1080 }
      ] },
      { ok: true, artboards: [
        { index: 0, name: 'instagram-feed_1080x1080 px', width: 1080, height: 1080 }
      ] },
      { ok: true, artboards: [
        { index: 0, name: 'Feed A', width: 1080, height: 1080 },
        { index: 1, name: 'Feed B', width: 1080, height: 1080 }
      ] }
    ]
  });
  const required = panel.document.elements['preflight-preset-list'].children;
  required[0].children[0].checked = true;
  required[0].children[0].dispatch('change');

  panel.document.elements['run-preflight-button'].dispatch('click');
  assert.match(panel.document.elements['preflight-summary'].textContent, /1 Pass/);
  panel.document.elements['run-preflight-button'].dispatch('click');

  assert.equal(panel.bridge.calls.filter(function (call) {
    return call === 'listArtboards(app)';
  }).length, 3);
  assert.match(panel.document.elements['preflight-summary'].textContent, /1 Duplicate/);
  assert.match(panel.document.elements['preflight-results'].children[0].textContent, /Feed A/);
  assert.match(panel.document.elements['preflight-results'].children[0].textContent, /Feed B/);
  assert.equal(panel.document.elements['artboard-list'].children.length, 2);
});

test('Run Preflight preserves normal export selections when artboards are unchanged', function () {
  const unchangedArtboards = [
    { index: 0, name: 'instagram-feed_1080x1080 px', width: 1080, height: 1080 },
    { index: 7, name: 'Reference', width: 400, height: 400 }
  ];
  const panel = runPanel({
    cacheState: {
      catalog: catalog(), source: 'cache',
      lastSuccessfulCheck: new Date().toISOString()
    },
    artboardResults: [
      { ok: true, artboards: unchangedArtboards },
      { ok: true, artboards: unchangedArtboards }
    ]
  });
  const required = panel.document.elements['preflight-preset-list'].children;
  const normalExportSelection = panel.document.elements['artboard-list'].children;
  required[0].children[0].checked = true;
  required[0].children[0].dispatch('change');
  normalExportSelection[1].children[0].checked = false;
  normalExportSelection[1].children[0].dispatch('change');

  panel.document.elements['run-preflight-button'].dispatch('click');

  assert.equal(
    panel.document.elements['artboard-list'].children[1].children[0].checked,
    false
  );
  panel.document.elements['export-button'].dispatch('click');
  const exportCall = panel.bridge.calls.filter(function (call) {
    return call.indexOf('exportArtboards(app, ') === 0;
  }).pop();
  assert.deepEqual(
    hostCallPayload(exportCall, 'exportArtboards(app, ').artboardIndexes,
    [0]
  );
});

test('Run Preflight reports document closure, clears stale results, and unlocks safely', function () {
  const panel = runPanel({
    cacheState: {
      catalog: catalog(), source: 'cache',
      lastSuccessfulCheck: new Date().toISOString()
    },
    artboardResults: [
      { ok: true, artboards: [
        { index: 0, name: 'instagram-feed_1080x1080 px', width: 1080, height: 1080 }
      ] },
      { ok: false, error: 'Open an Illustrator document first.' }
    ]
  });
  const required = panel.document.elements['preflight-preset-list'].children;
  required[0].children[0].checked = true;
  required[0].children[0].dispatch('change');
  panel.bridge.deferNext('listArtboards(app)');

  panel.document.elements['run-preflight-button'].dispatch('click');
  assert.equal(panel.document.elements['run-preflight-button'].disabled, true);
  assert.equal(panel.document.elements['create-presets-button'].disabled, true);
  assert.equal(panel.document.elements['rename-button'].disabled, true);
  panel.bridge.completeNext('listArtboards(app)');

  assert.equal(panel.document.elements['preflight-summary'].textContent, '');
  assert.equal(panel.document.elements['preflight-results'].textContent, '');
  assert.equal(panel.document.elements['create-missing-button'].disabled, true);
  assert.equal(panel.document.elements['rename-fixable-button'].disabled, true);
  assert.equal(panel.document.elements['export-verified-button'].disabled, true);
  assert.equal(panel.document.elements['artboard-list'].children.length, 0);
  assert.match(panel.document.elements.status.textContent, /Open an Illustrator document first/);
  assert.equal(panel.document.elements['run-preflight-button'].disabled, false);
  assert.equal(panel.document.elements['rename-button'].disabled, false);
});

test('Run Preflight unlocks when the host bridge cannot start', function () {
  const panel = runPanel({
    cacheState: {
      catalog: catalog(), source: 'cache',
      lastSuccessfulCheck: new Date().toISOString()
    }
  });
  const required = panel.document.elements['preflight-preset-list'].children;
  required[0].children[0].checked = true;
  required[0].children[0].dispatch('change');
  panel.bridge.throwNext('listArtboards(app)');

  panel.document.elements['run-preflight-button'].dispatch('click');

  assert.match(panel.document.elements.status.textContent, /Could not refresh Illustrator artboards/);
  assert.equal(panel.document.elements['run-preflight-button'].disabled, false);
  assert.equal(panel.document.elements['rename-button'].disabled, false);
  assert.equal(panel.document.elements['create-presets-button'].disabled, true);
});

test('Run Preflight explains an empty requirement selection without calling the host', function () {
  const panel = runPanel({
    cacheState: {
      catalog: catalog(), source: 'cache',
      lastSuccessfulCheck: new Date().toISOString()
    }
  });
  const callsBefore = panel.bridge.calls.length;

  panel.document.elements['run-preflight-button'].dispatch('click');

  assert.equal(panel.bridge.calls.length, callsBefore);
  assert.equal(
    panel.document.elements.status.textContent,
    'Select at least one required delivery size.'
  );
});

test('rejects same-dimension requirements and leaves every preflight action safe', function () {
  const panel = runPanel({
    cacheState: {
      catalog: sameDimensionCatalog(), source: 'cache',
      lastSuccessfulCheck: new Date().toISOString()
    },
    artboardResult: {
      ok: true,
      artboards: [
        { index: 0, name: 'Keep', width: 1080, height: 1080 }
      ]
    }
  });
  const required = panel.document.elements['preflight-preset-list'].children;
  required[0].children[0].checked = true;
  required[0].children[0].dispatch('change');
  required[1].children[0].checked = true;
  required[1].children[0].dispatch('change');

  panel.document.elements['run-preflight-button'].dispatch('click');

  assert.match(panel.document.elements.status.textContent, /1080.*1080/);
  assert.equal(panel.document.elements['preflight-summary'].textContent, '');
  assert.equal(panel.document.elements['create-missing-button'].disabled, true);
  assert.equal(panel.document.elements['rename-fixable-button'].disabled, true);
  assert.equal(panel.document.elements['export-verified-button'].disabled, true);
  panel.document.elements['create-missing-button'].dispatch('click');
  panel.document.elements['rename-fixable-button'].dispatch('click');
  panel.document.elements['export-verified-button'].dispatch('click');
  assert.equal(panel.bridge.calls.some(function (call) {
    return call.indexOf('createPresetArtboards(app, ') === 0 ||
      call.indexOf('renameArtboards(app, ') === 0 ||
      call.indexOf('exportArtboards(app, ') === 0;
  }), false);
});

test('legacy create and rename hold the unified operation lock through refresh', function () {
  const panel = runPanel({
    cacheState: {
      catalog: catalog(), source: 'cache',
      lastSuccessfulCheck: new Date().toISOString()
    },
    artboardResult: {
      ok: true,
      artboards: [
        { index: 0, name: 'Board', width: 100, height: 100 }
      ]
    }
  });
  const createPreset = panel.document.elements['preset-list'].children[0].children[0];
  const required = panel.document.elements['preflight-preset-list'].children[0].children[0];
  const operationControls = [
    'create-presets-button', 'rename-button', 'run-preflight-button',
    'create-missing-button', 'rename-fixable-button',
    'export-button', 'export-verified-button'
  ];
  function assertLocked() {
    operationControls.forEach(function (id) {
      assert.equal(panel.document.elements[id].disabled, true, id + ' should be locked');
    });
  }
  createPreset.checked = true;
  createPreset.dispatch('change');
  required.checked = true;
  required.dispatch('change');

  panel.bridge.deferNext('createPresetArtboards(app, ');
  panel.bridge.deferNext('listArtboards(app)');
  panel.document.elements['create-presets-button'].dispatch('click');
  assertLocked();
  panel.document.elements['run-preflight-button'].dispatch('click');
  panel.document.elements['rename-button'].dispatch('click');
  assert.equal(panel.bridge.calls.filter(function (call) {
    return call === 'renameAllArtboards(app)';
  }).length, 0);
  panel.bridge.completeNext('createPresetArtboards(app, ');
  assertLocked();
  panel.bridge.completeNext('listArtboards(app)');
  assert.equal(panel.document.elements['create-presets-button'].disabled, false);
  assert.equal(panel.document.elements['rename-button'].disabled, false);

  panel.bridge.deferNext('renameAllArtboards(app)');
  panel.bridge.deferNext('listArtboards(app)');
  panel.document.elements['rename-button'].dispatch('click');
  assertLocked();
  panel.document.elements['create-presets-button'].dispatch('click');
  assert.equal(panel.bridge.calls.filter(function (call) {
    return call.indexOf('createPresetArtboards(app, ') === 0;
  }).length, 1);
  panel.bridge.completeNext('renameAllArtboards(app)');
  assertLocked();
  panel.bridge.completeNext('listArtboards(app)');
  assert.equal(panel.document.elements['create-presets-button'].disabled, false);
  assert.equal(panel.document.elements['rename-button'].disabled, false);
});

test('fresh Run Preflight locks both legacy mutations until its callback completes', function () {
  const panel = runPanel({
    cacheState: {
      catalog: catalog(), source: 'cache',
      lastSuccessfulCheck: new Date().toISOString()
    },
    artboardResult: {
      ok: true,
      artboards: [
        { index: 0, name: 'instagram-feed_1080x1080 px', width: 1080, height: 1080 }
      ]
    }
  });
  const createPreset = panel.document.elements['preset-list'].children[0].children[0];
  const required = panel.document.elements['preflight-preset-list'].children[0].children[0];
  createPreset.checked = true;
  createPreset.dispatch('change');
  required.checked = true;
  required.dispatch('change');
  panel.bridge.deferNext('listArtboards(app)');

  panel.document.elements['run-preflight-button'].dispatch('click');

  assert.equal(panel.document.elements['create-presets-button'].disabled, true);
  assert.equal(panel.document.elements['rename-button'].disabled, true);
  panel.document.elements['create-presets-button'].dispatch('click');
  panel.document.elements['rename-button'].dispatch('click');
  assert.equal(panel.bridge.calls.filter(function (call) {
    return call.indexOf('createPresetArtboards(app, ') === 0 ||
      call === 'renameAllArtboards(app)';
  }).length, 0);
  panel.bridge.completeNext('listArtboards(app)');
  assert.equal(panel.document.elements['create-presets-button'].disabled, false);
  assert.equal(panel.document.elements['rename-button'].disabled, false);
});

test('runs preflight, creates only missing presets, renames only fixable artboards, and exports pass results', function () {
  const panel = runPanel({
    cacheState: { catalog: fourPresetCatalog(), source: 'cache', lastSuccessfulCheck: new Date().toISOString() },
    artboardResults: [
      { ok: true, artboards: [
        { index: 0, name: 'instagram-feed_1080x1080 px', width: 1080, height: 1080 },
        { index: 1, name: 'Portrait draft', width: 1080, height: 1350 }
      ] },
      { ok: true, artboards: [
        { index: 0, name: 'instagram-feed_1080x1080 px', width: 1080, height: 1080 },
        { index: 1, name: 'Portrait draft', width: 1080, height: 1350 }
      ] },
      { ok: true, artboards: [
        { index: 0, name: 'instagram-feed_1080x1080 px', width: 1080, height: 1080 },
        { index: 1, name: 'Portrait draft', width: 1080, height: 1350 },
        { index: 2, name: 'instagram-story_1080x1920 px', width: 1080, height: 1920 }
      ] },
      { ok: true, artboards: [
        { index: 0, name: 'instagram-feed_1080x1080 px', width: 1080, height: 1080 },
        { index: 1, name: 'Portrait draft', width: 1080, height: 1350 },
        { index: 2, name: 'instagram-story_1080x1920 px', width: 1080, height: 1920 }
      ] },
      { ok: true, artboards: [
        { index: 0, name: 'instagram-feed_1080x1080 px', width: 1080, height: 1080 },
        { index: 1, name: 'instagram-portrait_1080x1350 px', width: 1080, height: 1350 },
        { index: 2, name: 'instagram-story_1080x1920 px', width: 1080, height: 1920 }
      ] },
      { ok: true, artboards: [
        { index: 0, name: 'instagram-feed_1080x1080 px', width: 1080, height: 1080 },
        { index: 1, name: 'instagram-portrait_1080x1350 px', width: 1080, height: 1350 },
        { index: 2, name: 'instagram-story_1080x1920 px', width: 1080, height: 1920 }
      ] }
    ]
  });
  const required = panel.document.elements['preflight-preset-list'].children;
  required[0].children[0].checked = true; required[0].children[0].dispatch('change');
  required[1].children[0].checked = true; required[1].children[0].dispatch('change');
  required[2].children[0].checked = true; required[2].children[0].dispatch('change');
  panel.document.elements['run-preflight-button'].dispatch('click');
  assert.match(panel.document.elements['preflight-summary'].textContent, /1 Pass.*1 Rename.*1 Missing/);
  assert.match(
    panel.document.elements['preflight-results'].children[0].textContent,
    /instagram-feed_1080x1080 px/
  );
  assert.match(
    panel.document.elements['preflight-results'].children[1].textContent,
    /Portrait draft/
  );
  panel.document.elements['create-missing-button'].dispatch('click');
  const createPayload = hostCallPayload(panel.bridge.calls.find(function (call) {
    return call.indexOf('createPresetArtboards(app, ') === 0;
  }), 'createPresetArtboards(app, ');
  assert.deepEqual(createPayload.map(function (preset) { return preset.id; }), [
    'instagram-story'
  ]);
  panel.document.elements['run-preflight-button'].dispatch('click');
  panel.document.elements['rename-fixable-button'].dispatch('click');
  const renamePayload = hostCallPayload(panel.bridge.calls.find(function (call) {
    return call.indexOf('renameArtboards(app, ') === 0;
  }), 'renameArtboards(app, ');
  assert.deepEqual(renamePayload, [{
    index: 1,
    name: 'instagram-portrait_1080x1350 px'
  }]);
  panel.document.elements['run-preflight-button'].dispatch('click');
  panel.document.elements['export-verified-button'].dispatch('click');
  const exportPayload = hostCallPayload(panel.bridge.calls.find(function (call) {
    return call.indexOf('exportArtboards(app, ') === 0;
  }), 'exportArtboards(app, ');
  assert.deepEqual(exportPayload.artboardIndexes, [0, 1, 2]);
});

test('keeps every preflight action locked until fix mutation and refresh callbacks finish', function () {
  const panel = runPanel({
    cacheState: {
      catalog: fourPresetCatalog(), source: 'cache',
      lastSuccessfulCheck: new Date().toISOString()
    },
    artboardResults: [
      { ok: true, artboards: [
        { index: 0, name: 'instagram-feed_1080x1080 px', width: 1080, height: 1080 },
        { index: 1, name: 'Portrait draft', width: 1080, height: 1350 }
      ] },
      { ok: true, artboards: [
        { index: 0, name: 'instagram-feed_1080x1080 px', width: 1080, height: 1080 },
        { index: 1, name: 'Portrait draft', width: 1080, height: 1350 }
      ] },
      { ok: true, artboards: [
        { index: 0, name: 'instagram-feed_1080x1080 px', width: 1080, height: 1080 },
        { index: 1, name: 'Portrait draft', width: 1080, height: 1350 },
        { index: 2, name: 'instagram-story_1080x1920 px', width: 1080, height: 1920 }
      ] },
      { ok: true, artboards: [
        { index: 0, name: 'instagram-feed_1080x1080 px', width: 1080, height: 1080 },
        { index: 1, name: 'Portrait draft', width: 1080, height: 1350 },
        { index: 2, name: 'instagram-story_1080x1920 px', width: 1080, height: 1920 }
      ] },
      { ok: true, artboards: [
        { index: 0, name: 'instagram-feed_1080x1080 px', width: 1080, height: 1080 },
        { index: 1, name: 'instagram-portrait_1080x1350 px', width: 1080, height: 1350 },
        { index: 2, name: 'instagram-story_1080x1920 px', width: 1080, height: 1920 }
      ] }
    ]
  });
  const required = panel.document.elements['preflight-preset-list'].children;
  const controls = [
    'run-preflight-button', 'create-missing-button',
    'rename-fixable-button', 'export-verified-button'
  ];
  function assertPreflightLocked() {
    controls.forEach(function (id) {
      assert.equal(panel.document.elements[id].disabled, true, id + ' should be locked');
    });
  }
  required[0].children[0].checked = true; required[0].children[0].dispatch('change');
  required[1].children[0].checked = true; required[1].children[0].dispatch('change');
  required[2].children[0].checked = true; required[2].children[0].dispatch('change');
  panel.document.elements['run-preflight-button'].dispatch('click');

  panel.bridge.deferNext('createPresetArtboards(app, ');
  panel.bridge.deferNext('listArtboards(app)');
  panel.document.elements['create-missing-button'].dispatch('click');
  assertPreflightLocked();
  panel.document.elements['create-missing-button'].dispatch('click');
  assert.equal(panel.bridge.calls.filter(function (call) {
    return call.indexOf('createPresetArtboards(app, ') === 0;
  }).length, 1);
  panel.bridge.completeNext('createPresetArtboards(app, ');
  assertPreflightLocked();
  panel.bridge.completeNext('listArtboards(app)');
  assert.equal(panel.document.elements['run-preflight-button'].disabled, false);

  panel.document.elements['run-preflight-button'].dispatch('click');
  panel.bridge.deferNext('renameArtboards(app, ');
  panel.bridge.deferNext('listArtboards(app)');
  panel.document.elements['rename-fixable-button'].dispatch('click');
  assertPreflightLocked();
  panel.document.elements['rename-fixable-button'].dispatch('click');
  assert.equal(panel.bridge.calls.filter(function (call) {
    return call.indexOf('renameArtboards(app, ') === 0;
  }).length, 1);
  panel.bridge.completeNext('renameArtboards(app, ');
  assertPreflightLocked();
  panel.bridge.completeNext('listArtboards(app)');
  assert.equal(panel.document.elements['run-preflight-button'].disabled, false);
});

test('blocks both export paths until a preflight mutation refresh finishes', function () {
  const panel = runPanel({
    cacheState: {
      catalog: fourPresetCatalog(), source: 'cache',
      lastSuccessfulCheck: new Date().toISOString()
    },
    artboardResults: [
      { ok: true, artboards: [
        { index: 0, name: 'instagram-feed_1080x1080 px', width: 1080, height: 1080 },
        { index: 1, name: 'Portrait draft', width: 1080, height: 1350 }
      ] },
      { ok: true, artboards: [
        { index: 0, name: 'instagram-feed_1080x1080 px', width: 1080, height: 1080 },
        { index: 1, name: 'Portrait draft', width: 1080, height: 1350 }
      ] },
      { ok: true, artboards: [
        { index: 0, name: 'instagram-feed_1080x1080 px', width: 1080, height: 1080 },
        { index: 1, name: 'instagram-portrait_1080x1350 px', width: 1080, height: 1350 }
      ] }
    ]
  });
  const required = panel.document.elements['preflight-preset-list'].children;
  const controls = [
    'run-preflight-button', 'create-missing-button', 'rename-fixable-button',
    'export-button', 'export-verified-button'
  ];
  required[0].children[0].checked = true; required[0].children[0].dispatch('change');
  required[1].children[0].checked = true; required[1].children[0].dispatch('change');
  panel.document.elements['run-preflight-button'].dispatch('click');
  assert.equal(panel.document.elements['rename-fixable-button'].disabled, false);
  assert.equal(panel.document.elements['export-verified-button'].disabled, false);

  panel.bridge.deferNext('renameArtboards(app, ');
  panel.bridge.deferNext('listArtboards(app)');
  panel.document.elements['rename-fixable-button'].dispatch('click');

  controls.forEach(function (id) {
    assert.equal(panel.document.elements[id].disabled, true, id + ' should be locked');
  });
  panel.document.elements['export-button'].dispatch('click');
  panel.document.elements['export-verified-button'].dispatch('click');
  assert.equal(panel.bridge.calls.filter(function (call) {
    return call.indexOf('exportArtboards(app, ') === 0;
  }).length, 0);

  panel.bridge.completeNext('renameArtboards(app, ');
  assert.equal(panel.document.elements['export-button'].disabled, true);
  panel.bridge.completeNext('listArtboards(app)');
  assert.equal(panel.document.elements['run-preflight-button'].disabled, false);
  assert.equal(panel.document.elements['export-button'].disabled, false);
});

test('blocks every preflight action while a normal export callback is pending', function () {
  const panel = runPanel({
    cacheState: {
      catalog: fourPresetCatalog(), source: 'cache',
      lastSuccessfulCheck: new Date().toISOString()
    },
    artboardResult: {
      ok: true,
      artboards: [
        { index: 0, name: 'instagram-feed_1080x1080 px', width: 1080, height: 1080 },
        { index: 1, name: 'Portrait draft', width: 1080, height: 1350 }
      ]
    }
  });
  const required = panel.document.elements['preflight-preset-list'].children;
  const controls = [
    'run-preflight-button', 'create-missing-button', 'rename-fixable-button',
    'export-button', 'export-verified-button'
  ];
  required[0].children[0].checked = true; required[0].children[0].dispatch('change');
  required[1].children[0].checked = true; required[1].children[0].dispatch('change');
  required[2].children[0].checked = true; required[2].children[0].dispatch('change');
  panel.document.elements['run-preflight-button'].dispatch('click');
  assert.equal(panel.document.elements['create-missing-button'].disabled, false);
  assert.equal(panel.document.elements['rename-fixable-button'].disabled, false);

  panel.bridge.deferNext('exportArtboards(app, ');
  panel.document.elements['export-button'].dispatch('click');

  controls.forEach(function (id) {
    assert.equal(panel.document.elements[id].disabled, true, id + ' should be locked');
  });
  panel.document.elements['create-missing-button'].dispatch('click');
  panel.document.elements['rename-fixable-button'].dispatch('click');
  assert.equal(panel.bridge.calls.filter(function (call) {
    return call.indexOf('createPresetArtboards(app, ') === 0 ||
      call.indexOf('renameArtboards(app, ') === 0;
  }).length, 0);

  panel.bridge.completeNext('exportArtboards(app, ');
  assert.equal(panel.document.elements['run-preflight-button'].disabled, false);
  assert.equal(panel.document.elements['create-missing-button'].disabled, false);
  assert.equal(panel.document.elements['rename-fixable-button'].disabled, false);
});

test('revalidates current artboards and refuses verified export when the fresh report changes', function () {
  const panel = runPanel({
    cacheState: {
      catalog: catalog(), source: 'cache',
      lastSuccessfulCheck: new Date().toISOString()
    },
    artboardResults: [
      { ok: true, artboards: [
        { index: 0, name: 'instagram-feed_1080x1080 px', width: 1080, height: 1080 }
      ] },
      { ok: true, artboards: [
        { index: 0, name: 'instagram-feed_1080x1080 px', width: 1080, height: 1080 }
      ] },
      { ok: true, artboards: [
        { index: 0, name: 'Feed A', width: 1080, height: 1080 },
        { index: 1, name: 'Feed B', width: 1080, height: 1080 }
      ] }
    ]
  });
  const required = panel.document.elements['preflight-preset-list'].children;
  required[0].children[0].checked = true;
  required[0].children[0].dispatch('change');
  panel.document.elements['run-preflight-button'].dispatch('click');
  assert.match(panel.document.elements['preflight-summary'].textContent, /1 Pass/);

  panel.document.elements['export-verified-button'].dispatch('click');

  assert.match(panel.document.elements['preflight-summary'].textContent, /1 Duplicate/);
  assert.match(panel.document.elements.status.textContent, /changed|stopped|review/i);
  assert.equal(panel.bridge.calls.filter(function (call) {
    return call.indexOf('exportArtboards(app, ') === 0;
  }).length, 0);
});

test('refuses verified export when required presets change during delayed revalidation', function () {
  const unchangedArtboards = [
    { index: 0, name: 'instagram-feed_1080x1080 px', width: 1080, height: 1080 },
    { index: 1, name: 'Portrait draft', width: 1080, height: 1350 }
  ];
  const panel = runPanel({
    cacheState: {
      catalog: fourPresetCatalog(), source: 'cache',
      lastSuccessfulCheck: new Date().toISOString()
    },
    artboardResults: [
      { ok: true, artboards: unchangedArtboards },
      { ok: true, artboards: unchangedArtboards }
    ]
  });
  const required = panel.document.elements['preflight-preset-list'].children;
  required[0].children[0].checked = true;
  required[0].children[0].dispatch('change');
  panel.document.elements['run-preflight-button'].dispatch('click');

  panel.bridge.deferNext('listArtboards(app)');
  panel.document.elements['export-verified-button'].dispatch('click');
  [
    'run-preflight-button', 'create-missing-button', 'rename-fixable-button',
    'export-button', 'export-verified-button'
  ].forEach(function (id) {
    assert.equal(panel.document.elements[id].disabled, true, id + ' should be locked');
  });
  required[1].children[0].checked = true;
  required[1].children[0].dispatch('change');
  panel.bridge.completeNext('listArtboards(app)');

  assert.equal(panel.document.elements['preflight-summary'].textContent, '');
  assert.match(panel.document.elements.status.textContent, /required|selection|requirements/i);
  assert.equal(panel.bridge.calls.filter(function (call) {
    return call.indexOf('exportArtboards(app, ') === 0;
  }).length, 0);
});

test('preserves normal export selections when verified revalidation sees unchanged artboards', function () {
  const unchangedArtboards = [
    { index: 0, name: 'instagram-feed_1080x1080 px', width: 1080, height: 1080 },
    { index: 7, name: 'Reference', width: 400, height: 400 }
  ];
  const panel = runPanel({
    cacheState: {
      catalog: catalog(), source: 'cache',
      lastSuccessfulCheck: new Date().toISOString()
    },
    artboardResults: [
      { ok: true, artboards: unchangedArtboards },
      { ok: true, artboards: unchangedArtboards }
    ]
  });
  const required = panel.document.elements['preflight-preset-list'].children;
  const normalExportSelection = panel.document.elements['artboard-list'].children;
  required[0].children[0].checked = true;
  required[0].children[0].dispatch('change');
  panel.document.elements['run-preflight-button'].dispatch('click');
  normalExportSelection[1].children[0].checked = false;
  normalExportSelection[1].children[0].dispatch('change');

  panel.bridge.deferNext('listArtboards(app)');
  panel.document.elements['export-verified-button'].dispatch('click');
  panel.bridge.completeNext('listArtboards(app)');

  assert.equal(
    panel.document.elements['artboard-list'].children[1].children[0].checked,
    false
  );
  panel.document.elements['export-button'].dispatch('click');
  const exportCalls = panel.bridge.calls.filter(function (call) {
    return call.indexOf('exportArtboards(app, ') === 0;
  });
  const normalExportPayload = hostCallPayload(
    exportCalls[exportCalls.length - 1],
    'exportArtboards(app, '
  );
  assert.deepEqual(normalExportPayload.artboardIndexes, [0]);
});

test('shares one export lock through the initial call and confirmed overwrite retry', function () {
  const panel = runPanel({
    cacheState: {
      catalog: catalog(), source: 'cache',
      lastSuccessfulCheck: new Date().toISOString()
    },
    artboardResult: {
      ok: true,
      artboards: [
        { index: 0, name: 'instagram-feed_1080x1080 px', width: 1080, height: 1080 }
      ]
    },
    confirmOverwrite: true,
    exportResults: [
      {
        ok: false,
        code: 'OUTPUT_EXISTS',
        error: 'Existing output files require overwrite confirmation.',
        conflicts: ['instagram-feed_1080x1080 px.png']
      },
      { ok: true, exported: ['instagram-feed_1080x1080 px.png'] }
    ]
  });
  const required = panel.document.elements['preflight-preset-list'].children;
  required[0].children[0].checked = true;
  required[0].children[0].dispatch('change');
  panel.document.elements['run-preflight-button'].dispatch('click');
  const operationControls = [
    'create-presets-button', 'rename-button', 'run-preflight-button',
    'create-missing-button', 'rename-fixable-button',
    'export-button', 'export-verified-button'
  ];
  function assertOperationLocked() {
    operationControls.forEach(function (id) {
      assert.equal(panel.document.elements[id].disabled, true, id + ' should be locked');
    });
  }

  panel.bridge.deferNext('exportArtboards(app, ');
  panel.document.elements['export-button'].dispatch('click');
  assertOperationLocked();
  panel.document.elements['export-verified-button'].dispatch('click');
  assert.equal(panel.bridge.calls.filter(function (call) {
    return call.indexOf('exportArtboards(app, ') === 0;
  }).length, 1);

  panel.bridge.deferNext('exportArtboards(app, ');
  panel.bridge.completeNext('exportArtboards(app, ');
  assertOperationLocked();
  assert.equal(panel.bridge.calls.filter(function (call) {
    return call.indexOf('exportArtboards(app, ') === 0;
  }).length, 2);

  panel.bridge.completeNext('exportArtboards(app, ');
  assert.equal(panel.document.elements['export-button'].disabled, false);
  assert.equal(panel.document.elements['export-verified-button'].disabled, false);
});

test('clears a preflight report when delivery requirements change', function () {
  const panel = runPanel({
    cacheState: {
      catalog: fourPresetCatalog(), source: 'cache',
      lastSuccessfulCheck: new Date().toISOString()
    },
    artboardResult: {
      ok: true,
      artboards: [
        { index: 0, name: 'instagram-feed_1080x1080 px', width: 1080, height: 1080 }
      ]
    }
  });
  const required = panel.document.elements['preflight-preset-list'].children;

  required[0].children[0].checked = true;
  required[0].children[0].dispatch('change');
  panel.document.elements['run-preflight-button'].dispatch('click');
  assert.match(panel.document.elements['preflight-summary'].textContent, /1 Pass/);

  required[1].children[0].checked = true;
  required[1].children[0].dispatch('change');
  assert.equal(panel.document.elements['preflight-summary'].textContent, '');
  assert.equal(panel.document.elements['export-verified-button'].disabled, true);
});

test('never renames duplicates or exports a report containing duplicates', function () {
  const panel = runPanel({
    cacheState: {
      catalog: catalog(), source: 'cache',
      lastSuccessfulCheck: new Date().toISOString()
    },
    artboardResult: {
      ok: true,
      artboards: [
        { index: 0, name: 'Feed A', width: 1080, height: 1080 },
        { index: 1, name: 'Feed B', width: 1080, height: 1080 }
      ]
    }
  });
  const required = panel.document.elements['preflight-preset-list'].children;

  required[0].children[0].checked = true;
  required[0].children[0].dispatch('change');
  panel.document.elements['run-preflight-button'].dispatch('click');

  assert.match(panel.document.elements['preflight-summary'].textContent, /1 Duplicate/);
  assert.equal(panel.document.elements['rename-fixable-button'].disabled, true);
  assert.equal(panel.document.elements['export-verified-button'].disabled, true);
  panel.document.elements['rename-fixable-button'].dispatch('click');
  panel.document.elements['export-verified-button'].dispatch('click');
  assert.equal(panel.bridge.calls.some(function (call) {
    return call.indexOf('renameArtboards(app, ') === 0;
  }), false);
  assert.equal(panel.bridge.calls.some(function (call) {
    return call.indexOf('exportArtboards(app, ') === 0;
  }), false);
});

test('restores verified export availability after a successful export', function () {
  const panel = runPanel({
    cacheState: {
      catalog: catalog(), source: 'cache',
      lastSuccessfulCheck: new Date().toISOString()
    },
    artboardResult: {
      ok: true,
      artboards: [
        { index: 0, name: 'instagram-feed_1080x1080 px', width: 1080, height: 1080 }
      ]
    }
  });
  const required = panel.document.elements['preflight-preset-list'].children;

  required[0].children[0].checked = true;
  required[0].children[0].dispatch('change');
  panel.document.elements['run-preflight-button'].dispatch('click');
  panel.document.elements['export-verified-button'].dispatch('click');

  assert.equal(panel.document.elements['export-verified-button'].disabled, false);
});

test('clears preflight before existing preset creation even when the host response fails', function () {
  const panel = runPanel({
    cacheState: {
      catalog: catalog(), source: 'cache',
      lastSuccessfulCheck: new Date().toISOString()
    },
    artboardResult: {
      ok: true,
      artboards: [
        { index: 0, name: 'instagram-feed_1080x1080 px', width: 1080, height: 1080 }
      ]
    },
    createRawResult: 'EvalScript error.'
  });
  const required = panel.document.elements['preflight-preset-list'].children;
  const createPreset = panel.document.elements['preset-list'].children;

  required[0].children[0].checked = true;
  required[0].children[0].dispatch('change');
  panel.document.elements['run-preflight-button'].dispatch('click');
  createPreset[0].children[0].checked = true;
  createPreset[0].children[0].dispatch('change');
  panel.document.elements['create-presets-button'].dispatch('click');

  assert.equal(panel.document.elements['preflight-summary'].textContent, '');
  assert.equal(panel.document.elements['export-verified-button'].disabled, true);
});

test('clears preflight and refreshes artboards after the existing rename utility', function () {
  const panel = runPanel({
    cacheState: {
      catalog: catalog(), source: 'cache',
      lastSuccessfulCheck: new Date().toISOString()
    },
    artboardResult: {
      ok: true,
      artboards: [
        { index: 0, name: 'instagram-feed_1080x1080 px', width: 1080, height: 1080 }
      ]
    }
  });
  const required = panel.document.elements['preflight-preset-list'].children;
  required[0].children[0].checked = true;
  required[0].children[0].dispatch('change');
  panel.document.elements['run-preflight-button'].dispatch('click');
  const listCallsAfterPreflight = panel.bridge.calls.filter(function (call) {
    return call === 'listArtboards(app)';
  }).length;
  panel.document.elements['rename-button'].dispatch('click');

  assert.equal(panel.document.elements['preflight-summary'].textContent, '');
  assert.equal(panel.bridge.calls.filter(function (call) {
    return call === 'listArtboards(app)';
  }).length, listCallsAfterPreflight + 1);
});

test('creates checked presets and exports checked artboards with validated JSON requests', function () {
  const panel = runPanel({
    cacheState: {
      catalog: catalog(),
      source: 'cache',
      lastSuccessfulCheck: new Date().toISOString()
    },
    artboardResult: {
      ok: true,
      artboards: [{ index: 4, name: 'Story Board', width: 1080, height: 1920 }]
    }
  });

  const presetCheckbox = panel.document.elements['preset-list'].children[0].children[0];
  presetCheckbox.checked = true;
  presetCheckbox.dispatch('change');
  panel.document.elements['create-presets-button'].dispatch('click');
  const createCall = panel.bridge.calls.find(function (call) {
    return call.indexOf('createPresetArtboards(app, ') === 0;
  });
  assert.match(createCall, /"id":"instagram-feed"/);

  panel.document.elements['export-button'].dispatch('click');
  const exportCall = panel.bridge.calls.find(function (call) {
    return call.indexOf('exportArtboards(app, ') === 0;
  });
  assert.match(exportCall, /"artboardIndexes":\[4\]/);
  assert.match(exportCall, /"destination":"\/exports"/);
  assert.match(exportCall, /"format":"png"/);
});

test('reports the raw Illustrator response when preset creation cannot be parsed', function () {
  const panel = runPanel({
    cacheState: {
      catalog: catalog(), source: 'cache', lastSuccessfulCheck: new Date().toISOString()
    },
    createRawResult: 'EvalScript error.'
  });
  const presetCheckbox = panel.document.elements['preset-list'].children[0].children[0];

  presetCheckbox.checked = true;
  presetCheckbox.dispatch('change');
  panel.document.elements['create-presets-button'].dispatch('click');

  assert.match(panel.document.elements.status.textContent, /EvalScript error\./);
});

test('deselecting one colliding artboard re-enables export', function () {
  const panel = runPanel({
    cacheState: {
      catalog: catalog(),
      source: 'cache',
      lastSuccessfulCheck: new Date().toISOString()
    },
    artboardResult: {
      ok: true,
      artboards: [
        { index: 0, name: 'A/B', width: 100, height: 100 },
        { index: 1, name: 'A:B', width: 100, height: 100 }
      ]
    }
  });
  const secondCheckbox = panel.document.elements['artboard-list'].children[1].children[0];

  assert.equal(panel.document.elements['export-button'].disabled, true);
  secondCheckbox.checked = false;
  secondCheckbox.dispatch('change');

  assert.equal(panel.document.elements['export-button'].disabled, false);
  assert.equal(panel.document.elements['collision-warning'].textContent, '');
});

test('exposes WebP only when the Illustrator host reports support', function () {
  const unsupported = runPanel({
    cacheState: {
      catalog: catalog(), source: 'cache', lastSuccessfulCheck: new Date().toISOString()
    },
    capabilitiesResult: {
      ok: true, formats: { png: true, jpg: true, webp: false }
    }
  });
  const supported = runPanel({
    cacheState: {
      catalog: catalog(), source: 'cache', lastSuccessfulCheck: new Date().toISOString()
    }
  });

  assert.equal(unsupported.document.elements['format-select'].children.length, 0);
  assert.equal(supported.document.elements['format-select'].children.length, 1);
  assert.equal(supported.document.elements['format-select'].children[0].value, 'webp');
  assert.equal(supported.document.elements['format-select'].children[0].textContent, 'WebP');
});

test('asks once with every existing-file conflict and retries only after confirmation', function () {
  const panel = runPanel({
    cacheState: {
      catalog: catalog(), source: 'cache', lastSuccessfulCheck: new Date().toISOString()
    },
    artboardResult: {
      ok: true,
      artboards: [
        { index: 0, name: 'One', width: 100, height: 100 },
        { index: 1, name: 'Two', width: 100, height: 100 }
      ]
    },
    confirmOverwrite: true,
    exportResults: [
      {
        ok: false,
        code: 'OUTPUT_EXISTS',
        error: 'Existing output files require overwrite confirmation.',
        conflicts: ['One.png', 'Two.png']
      },
      { ok: true, exported: ['One.png', 'Two.png'] }
    ]
  });

  panel.document.elements['export-button'].dispatch('click');

  const exportCalls = panel.bridge.calls.filter(function (call) {
    return call.indexOf('exportArtboards(app, ') === 0;
  });
  assert.equal(panel.confirmMessages.length, 1);
  assert.match(panel.confirmMessages[0], /One\.png/);
  assert.match(panel.confirmMessages[0], /Two\.png/);
  assert.doesNotMatch(exportCalls[0], /overwriteExisting/);
  assert.match(exportCalls[1], /"overwriteExisting":true/);
  assert.match(panel.document.elements.status.textContent, /Exported 2/);
});

test('does not retry existing-file conflicts when overwrite confirmation is declined', function () {
  const panel = runPanel({
    cacheState: {
      catalog: catalog(), source: 'cache', lastSuccessfulCheck: new Date().toISOString()
    },
    confirmOverwrite: false,
    exportResults: [{
      ok: false,
      code: 'OUTPUT_EXISTS',
      error: 'Existing output files require overwrite confirmation.',
      conflicts: ['Board.png']
    }]
  });

  panel.document.elements['export-button'].dispatch('click');

  assert.equal(panel.confirmMessages.length, 1);
  assert.equal(panel.bridge.calls.filter(function (call) {
    return call.indexOf('exportArtboards(app, ') === 0;
  }).length, 1);
  assert.match(panel.document.elements.status.textContent, /cancelled/i);
});

test('persists custom presets separately and keeps them merged after a remote update', function () {
  const panel = runPanel({
    cacheState: {
      catalog: catalog('1.0.0'), source: 'cache', lastSuccessfulCheck: new Date().toISOString()
    },
    customState: {
      schemaVersion: 1,
      presets: [{ id: 'saved', label: 'Saved Custom', width: 321, height: 654 }]
    },
    remote: {
      type: 'load', status: 200, body: JSON.stringify(catalog('2.0.0'))
    }
  });

  assert.equal(panel.document.elements['preset-list'].children.length, 2);
  panel.document.elements['update-presets-button'].dispatch('click');
  assert.equal(panel.document.elements['preset-list'].children.length, 2);
  assert.match(
    panel.document.elements['preset-list'].children[1].children[1].textContent,
    /Saved Custom/
  );
  assert.equal(panel.writes.filter(function (write) {
    return write.filePath.indexOf('social-presets-custom.json') >= 0;
  }).length, 0);
});

test('shows Custom and Delete only for custom presets', function () {
  const panel = runPanel({
    cacheState: {
      catalog: catalog(), source: 'cache', lastSuccessfulCheck: new Date().toISOString()
    },
    customState: {
      schemaVersion: 1,
      presets: [{ id: 'saved', label: 'Saved Custom', width: 321, height: 654 }]
    }
  });
  const builtInRow = panel.document.elements['preset-list'].children[0];
  const customRow = panel.document.elements['preset-list'].children[1];
  const customPreflightRow = panel.document.elements['preflight-preset-list'].children[1];

  assert.equal(builtInRow.children.length, 2);
  assert.equal(customRow.children[2].className, 'custom-preset-badge');
  assert.equal(customRow.children[2].textContent, 'Custom');
  assert.equal(customRow.children[3].className, 'delete-preset-button');
  assert.equal(customRow.children[3].textContent, 'Delete');
  assert.equal(customPreflightRow.children.length, 2);
});

test('deletes a confirmed custom preset from its separate store', function () {
  const panel = runPanel({
    cacheState: {
      catalog: catalog(), source: 'cache', lastSuccessfulCheck: new Date().toISOString()
    },
    customState: {
      schemaVersion: 1,
      presets: [{ id: 'saved', label: 'Saved Custom', width: 321, height: 654 }]
    },
    confirmDelete: true
  });

  panel.document.elements['preset-list'].children[1].children[3].dispatch('click');

  const customWrite = panel.writes.find(function (write) {
    return write.filePath.indexOf('social-presets-custom.json') >= 0;
  });
  assert.match(panel.confirmMessages[0], /Delete custom preset "Saved Custom"/);
  assert.deepEqual(JSON.parse(customWrite.data), { schemaVersion: 1, presets: [] });
  assert.equal(panel.document.elements['preset-list'].children.length, 1);
  assert.equal(panel.document.elements['preflight-preset-list'].children.length, 1);
  assert.match(panel.document.elements.status.textContent, /Deleted custom preset Saved Custom/);
});

test('does not delete a custom preset when confirmation is cancelled', function () {
  const panel = runPanel({
    cacheState: {
      catalog: catalog(), source: 'cache', lastSuccessfulCheck: new Date().toISOString()
    },
    customState: {
      schemaVersion: 1,
      presets: [{ id: 'saved', label: 'Saved Custom', width: 321, height: 654 }]
    },
    confirmDelete: false
  });

  panel.document.elements['preset-list'].children[1].children[3].dispatch('click');

  assert.match(panel.confirmMessages[0], /Delete custom preset "Saved Custom"/);
  assert.equal(panel.writes.length, 0);
  assert.equal(panel.document.elements['preset-list'].children.length, 2);
  assert.equal(panel.document.elements['preflight-preset-list'].children.length, 2);
});

test('keeps a custom preset when deletion cannot be persisted', function () {
  const panel = runPanel({
    cacheState: {
      catalog: catalog(), source: 'cache', lastSuccessfulCheck: new Date().toISOString()
    },
    customState: {
      schemaVersion: 1,
      presets: [{ id: 'saved', label: 'Saved Custom', width: 321, height: 654 }]
    },
    confirmDelete: true,
    customWriteError: true
  });

  panel.document.elements['preset-list'].children[1].children[3].dispatch('click');

  assert.equal(panel.document.elements['preset-list'].children.length, 2);
  assert.equal(panel.document.elements['preflight-preset-list'].children.length, 2);
  assert.match(panel.document.elements.status.textContent, /Could not delete/);
});

test('locks custom preset deletion while a host operation is pending', function () {
  const panel = runPanel({
    cacheState: {
      catalog: catalog(), source: 'cache', lastSuccessfulCheck: new Date().toISOString()
    },
    customState: {
      schemaVersion: 1,
      presets: [{ id: 'saved', label: 'Saved Custom', width: 321, height: 654 }]
    },
    confirmDelete: true
  });
  const required = panel.document.elements['preflight-preset-list'].children[0].children[0];
  const deleteButton = panel.document.elements['preset-list'].children[1].children[3];
  required.checked = true;
  required.dispatch('change');
  panel.bridge.deferNext('listArtboards(app)');

  panel.document.elements['run-preflight-button'].dispatch('click');

  assert.equal(deleteButton.disabled, true);
  deleteButton.dispatch('click');
  assert.equal(panel.confirmMessages.length, 0);
  panel.bridge.completeNext('listArtboards(app)');
  assert.equal(deleteButton.disabled, false);
});

test('automatic update bookkeeping never copies custom presets into the catalog cache', function () {
  const panel = runPanel({
    cacheState: {
      catalog: catalog('1.0.0'), source: 'cache',
      lastSuccessfulCheck: '2026-07-15T00:00:00.000Z'
    },
    customState: {
      schemaVersion: 1,
      presets: [{ id: 'saved', label: 'Saved Custom', width: 321, height: 654 }]
    },
    remote: { type: 'error' }
  });
  const cacheWrite = panel.writes.find(function (write) {
    return write.filePath.indexOf('social-presets-cache.json') >= 0;
  });

  assert.ok(cacheWrite);
  assert.deepEqual(JSON.parse(cacheWrite.data).catalog.presets, catalog('1.0.0').presets);
});

test('adds a valid custom preset through the panel and writes only the custom store', function () {
  const panel = runPanel({
    cacheState: {
      catalog: catalog(), source: 'cache', lastSuccessfulCheck: new Date().toISOString()
    }
  });
  panel.document.elements['custom-preset-id'].value = 'my-banner';
  panel.document.elements['custom-preset-label'].value = 'My Banner';
  panel.document.elements['custom-preset-width'].value = '1200';
  panel.document.elements['custom-preset-height'].value = '628';

  panel.document.elements['add-custom-preset-button'].dispatch('click');

  assert.equal(panel.document.elements['preset-list'].children.length, 2);
  const customWrites = panel.writes.filter(function (write) {
    return write.filePath.indexOf('social-presets-custom.json') >= 0;
  });
  assert.equal(customWrites.length, 1);
  assert.deepEqual(JSON.parse(customWrites[0].data), {
    schemaVersion: 1,
    presets: [{ id: 'my-banner', label: 'My Banner', width: 1200, height: 628 }]
  });
});

test('does not show an unsaved custom preset when the separate store write fails', function () {
  const panel = runPanel({
    cacheState: {
      catalog: catalog(), source: 'cache', lastSuccessfulCheck: new Date().toISOString()
    },
    customWriteError: true
  });
  panel.document.elements['custom-preset-id'].value = 'not-saved';
  panel.document.elements['custom-preset-label'].value = 'Not Saved';
  panel.document.elements['custom-preset-width'].value = '100';
  panel.document.elements['custom-preset-height'].value = '200';

  panel.document.elements['add-custom-preset-button'].dispatch('click');

  assert.equal(panel.document.elements['preset-list'].children.length, 1);
  assert.match(panel.document.elements.status.textContent, /Could not save/);
});

test('HTML contains custom preset inputs and does not expose WebP before capability detection', function () {
  const html = fs.readFileSync(path.join(__dirname, '..', 'client', 'index.html'), 'utf8');

  assert.match(html, /id="custom-preset-id"/);
  assert.match(html, /id="custom-preset-label"/);
  assert.match(html, /id="custom-preset-width"/);
  assert.match(html, /id="custom-preset-height"/);
  assert.match(html, /id="add-custom-preset-button"/);
  assert.doesNotMatch(html, /<option value="webp">/);
});
