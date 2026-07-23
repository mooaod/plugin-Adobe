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

class FakeElement {
  constructor(id, tagName) {
    this.id = id || '';
    this.tagName = tagName || 'div';
    this.children = [];
    this.dataset = {};
    this.listeners = {};
    this.textContent = '';
    this.value = '';
    this.checked = false;
    this.disabled = false;
    this.className = '';
    this.type = '';
  }

  appendChild(child) {
    this.children.push(child);
    return child;
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
      this.listeners[type]({ target: this });
    }
  }
}

function fakeDocument() {
  const ids = [
    'rename-button', 'preset-list', 'create-presets-button', 'catalog-info',
    'update-presets-button', 'format-select', 'artboard-list',
    'destination-input', 'export-button', 'collision-warning', 'status',
    'custom-preset-id', 'custom-preset-label', 'custom-preset-width',
    'custom-preset-height', 'add-custom-preset-button'
  ];
  const elements = {};
  ids.forEach(function (id) {
    elements[id] = new FakeElement(id);
  });
  elements['format-select'].value = 'png';
  elements['destination-input'].value = '/exports';

  return {
    elements: elements,
    getElementById: function (id) { return elements[id] || null; },
    createElement: function (tagName) { return new FakeElement('', tagName); }
  };
}

function runPanel(options) {
  options = options || {};
  const document = fakeDocument();
  const bridge = {
    calls: [],
    evalScript: function (script, callback) {
      this.calls.push(script);
      if (script.indexOf('$.evalFile') >= 0) {
        callback(options.hostLoadResult || JSON.stringify({ ok: true }));
      } else if (script === 'getExportCapabilities()') {
        callback(JSON.stringify(options.capabilitiesResult || {
          ok: true,
          formats: { png: true, jpg: true, webp: true }
        }));
      } else if (script === 'listArtboards(app)') {
        callback(JSON.stringify(options.artboardResult || {
          ok: true,
          artboards: [{ index: 0, name: 'Board', width: 100, height: 100 }]
        }));
      } else if (script.indexOf('exportArtboards(app, ') === 0 && options.exportResults) {
        callback(JSON.stringify(options.exportResults.shift()));
      } else if (script.indexOf('createPresetArtboards(app, ') === 0 && options.createRawResult) {
        callback(options.createRawResult);
      } else {
        callback(JSON.stringify({ ok: true, created: [], exported: [] }));
      }
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
