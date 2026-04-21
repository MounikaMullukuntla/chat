/**
 * key-manager.js — Embeddable vanilla JS API key manager
 *
 * No React, no bundler, no build step required.
 * Reads/writes localStorage['settings_api-keys'] — same format as the
 * chat repo's LocalStorageManager (chat/lib/storage/local-storage-manager.ts).
 *
 * Public API (window.KeyManager):
 *   KeyManager.init(containerEl, options)  — render widget into a container element
 *   KeyManager.get(providerId)             — returns key string or null
 *   KeyManager.set(providerId, value)      — writes to settings_api-keys
 *   KeyManager.has(providerId)             — boolean
 *   KeyManager.remove(providerId)          — deletes from settings_api-keys
 *   KeyManager.getAll()                    — returns full settings_api-keys object
 *   KeyManager.migrateFromLegacy()         — one-time migration from aPro / ${aiType}_api_key
 *
 * Note: encryption (Phase 1b) will be added here once crypto.ts is implemented
 * in the Next.js app, keeping both in sync.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'settings_api-keys';

  // ── Storage helpers ──────────────────────────────────────────────────────────

  function readAll() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch (_) {
      return {};
    }
  }

  function writeAll(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function getKey(providerId) {
    return readAll()[providerId] || null;
  }

  function setKey(providerId, value) {
    var data = readAll();
    data[providerId] = value;
    writeAll(data);
  }

  function removeKey(providerId) {
    var data = readAll();
    delete data[providerId];
    writeAll(data);
  }

  function hasKey(providerId) {
    return !!getKey(providerId);
  }

  // ── Legacy migration ─────────────────────────────────────────────────────────

  var ENV_TO_PROVIDER = {
    GEMINI_API_KEY:     'google',
    ANTHROPIC_API_KEY:  'anthropic',
    OPENAI_API_KEY:     'openai',
    XAI_API_KEY:        'xai',
    GROQ_API_KEY:       'groq',
    TOGETHER_API_KEY:   'together',
    FIREWORKS_API_KEY:  'fireworks',
    MISTRAL_API_KEY:    'mistral',
    PERPLEXITY_API_KEY: 'perplexity',
    DEEPSEEK_API_KEY:   'deepseek',
  };

  var LEGACY_KEY_TO_PROVIDER = {
    gemini_api_key:   'google',
    claude_api_key:   'anthropic',
    openai_api_key:   'openai',
    xai_api_key:      'xai',
    groq_api_key:     'groq',
  };

  function migrateFromLegacy() {
    var data = readAll();
    var changed = false;

    // Migrate from aPro (requests/engine format)
    try {
      var aProRaw = localStorage.getItem('aPro');
      if (aProRaw) {
        var aPro = JSON.parse(aProRaw);
        Object.keys(ENV_TO_PROVIDER).forEach(function (envKey) {
          var providerId = ENV_TO_PROVIDER[envKey];
          if (aPro[envKey] && !data[providerId]) {
            data[providerId] = aPro[envKey];
            changed = true;
          }
        });
        localStorage.removeItem('aPro');
      }
    } catch (_) {}

    // Migrate from per-key ${aiType}_api_key entries
    Object.keys(LEGACY_KEY_TO_PROVIDER).forEach(function (legacyKey) {
      var providerId = LEGACY_KEY_TO_PROVIDER[legacyKey];
      try {
        var value = localStorage.getItem(legacyKey);
        if (value && !data[providerId]) {
          data[providerId] = value;
          changed = true;
        }
        if (value) localStorage.removeItem(legacyKey);
      } catch (_) {}
    });

    if (changed) writeAll(data);
  }

  // ── SVG icons ────────────────────────────────────────────────────────────────

  var ICON_CHECK = '<svg viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14zm3.53-9.47a.75.75 0 0 0-1.06-1.06L7 7.94 5.53 6.47a.75.75 0 0 0-1.06 1.06l2 2a.75.75 0 0 0 1.06 0l4-4z"/></svg>';
  var ICON_CIRCLE = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" xmlns="http://www.w3.org/2000/svg"><circle cx="8" cy="8" r="6.25"/></svg>';
  var ICON_CHEVRON = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6l4 4 4-4"/></svg>';
  var ICON_EYE = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"/><circle cx="8" cy="8" r="2"/></svg>';
  var ICON_EYE_OFF = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" d="M2 2l12 12M6.5 6.6A2 2 0 0 0 9.4 9.5M4.2 4.3C2.7 5.3 1.5 7 1.5 8s2 4.5 6.5 4.5c1.3 0 2.4-.3 3.3-.7M7 3.6C7.3 3.5 7.7 3.5 8 3.5c4.5 0 6.5 3 6.5 4.5 0 .7-.4 1.5-1.1 2.3"/></svg>';
  var ICON_INFO = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" xmlns="http://www.w3.org/2000/svg"><circle cx="8" cy="8" r="6.25"/><path stroke-linecap="round" d="M8 7v4M8 5.5v.5"/></svg>';

  // ── Widget renderer ──────────────────────────────────────────────────────────

  function init(containerEl, options) {
    if (!containerEl) return;
    options = options || {};

    var providers = (window.KeyManagerProviders || []);
    containerEl.innerHTML = '';
    containerEl.className = (containerEl.className + ' km-widget').trim();

    var list = document.createElement('div');
    list.className = 'km-provider-list';

    providers.forEach(function (provider) {
      list.appendChild(buildProviderCard(provider));
    });

    containerEl.appendChild(list);

    // Security notice
    var notice = document.createElement('div');
    notice.className = 'km-notice';
    notice.innerHTML = ICON_INFO + ' Keys are stored in your browser\'s localStorage. They are never sent to any server by this page.';
    containerEl.appendChild(notice);
  }

  function buildProviderCard(provider) {
    var card = document.createElement('div');
    card.className = 'km-provider';
    card.id = 'km-provider-' + provider.id;

    var header = buildProviderHeader(provider, card);
    var body = buildProviderBody(provider);

    header.addEventListener('click', function () {
      var expanded = header.getAttribute('aria-expanded') === 'true';
      header.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      body.hidden = expanded;
    });

    card.appendChild(header);
    card.appendChild(body);
    return card;
  }

  function buildProviderHeader(provider, card) {
    var header = document.createElement('button');
    header.type = 'button';
    header.className = 'km-provider-header';
    header.setAttribute('aria-expanded', 'false');

    var statusIcon = document.createElement('span');
    statusIcon.className = 'km-status-icon ' + (hasKey(provider.id) ? 'has-key' : 'no-key');
    statusIcon.innerHTML = hasKey(provider.id) ? ICON_CHECK : ICON_CIRCLE;

    var name = document.createElement('span');
    name.className = 'km-provider-name';
    name.textContent = provider.name;

    var meta = document.createElement('span');
    meta.className = 'km-provider-meta';
    var modelCount = provider.models.length;
    meta.textContent = modelCount ? modelCount + ' model' + (modelCount !== 1 ? 's' : '') : '';

    var chevron = document.createElement('span');
    chevron.className = 'km-chevron';
    chevron.innerHTML = ICON_CHEVRON;

    header.appendChild(statusIcon);
    header.appendChild(name);
    header.appendChild(meta);
    header.appendChild(chevron);

    return header;
  }

  function buildProviderBody(provider) {
    var body = document.createElement('div');
    body.className = 'km-provider-body';
    body.hidden = true;

    // Key input section
    var keyRow = document.createElement('div');
    keyRow.className = 'km-key-row';

    var label = document.createElement('div');
    label.className = 'km-key-label';
    label.innerHTML = '<span>API Key</span>' +
      '<a class="km-get-key-link" href="' + escapeAttr(provider.getKeyUrl) + '" target="_blank" rel="noopener">Get key ↗</a>';

    var inputWrap = document.createElement('div');
    inputWrap.className = 'km-key-input-wrap';

    var input = document.createElement('input');
    input.type = 'password';
    input.className = 'km-key-input';
    input.placeholder = provider.keyPlaceholder || 'Paste your API key';
    input.value = getKey(provider.id) || '';
    input.setAttribute('autocomplete', 'off');

    var toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'km-btn';
    toggleBtn.innerHTML = ICON_EYE;
    toggleBtn.title = 'Show/hide key';

    toggleBtn.addEventListener('click', function () {
      var isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      toggleBtn.innerHTML = isPassword ? ICON_EYE_OFF : ICON_EYE;
    });

    var saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'km-btn km-btn-primary';
    saveBtn.textContent = 'Save';

    var clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'km-btn km-btn-danger';
    clearBtn.textContent = 'Clear';

    var statusMsg = document.createElement('div');
    statusMsg.className = 'km-status-msg';

    function refreshHeaderStatus() {
      // Update the parent card's status icon
      var card = document.getElementById('km-provider-' + provider.id);
      if (!card) return;
      var icon = card.querySelector('.km-status-icon');
      if (!icon) return;
      var present = hasKey(provider.id);
      icon.className = 'km-status-icon ' + (present ? 'has-key' : 'no-key');
      icon.innerHTML = present ? ICON_CHECK : ICON_CIRCLE;
    }

    saveBtn.addEventListener('click', function () {
      var val = input.value.trim();
      if (!val) {
        showStatus(statusMsg, 'Enter a key to save.', 'err');
        return;
      }
      setKey(provider.id, val);
      showStatus(statusMsg, 'Key saved.', 'ok');
      refreshHeaderStatus();
    });

    clearBtn.addEventListener('click', function () {
      input.value = '';
      input.type = 'password';
      toggleBtn.innerHTML = ICON_EYE;
      removeKey(provider.id);
      showStatus(statusMsg, 'Key removed.', 'ok');
      refreshHeaderStatus();
    });

    inputWrap.appendChild(input);
    inputWrap.appendChild(toggleBtn);
    inputWrap.appendChild(saveBtn);
    inputWrap.appendChild(clearBtn);

    keyRow.appendChild(label);
    keyRow.appendChild(inputWrap);
    keyRow.appendChild(statusMsg);
    body.appendChild(keyRow);

    // Model list
    if (provider.models.length > 0) {
      var modelSection = document.createElement('div');
      modelSection.className = 'km-model-list';

      var modelLabel = document.createElement('div');
      modelLabel.className = 'km-model-list-label';
      modelLabel.textContent = 'Models';
      modelSection.appendChild(modelLabel);

      provider.models.forEach(function (model) {
        var row = document.createElement('div');
        row.className = 'km-model-row' + (model.active ? '' : ' inactive');
        row.id = 'km-model-' + model.id;

        var nameEl = document.createElement('span');
        nameEl.className = 'km-model-name';
        nameEl.textContent = model.name;

        var descEl = document.createElement('span');
        descEl.className = 'km-model-desc';
        descEl.textContent = model.description;

        row.appendChild(nameEl);

        if (model.isDefault) {
          var badge = document.createElement('span');
          badge.className = 'km-model-badge';
          badge.textContent = 'default';
          row.appendChild(badge);
        }

        row.appendChild(descEl);
        modelSection.appendChild(row);
      });

      body.appendChild(modelSection);
    } else {
      var noModels = document.createElement('p');
      noModels.className = 'km-no-models';
      noModels.textContent = 'No models configured.';
      body.appendChild(noModels);
    }

    return body;
  }

  function showStatus(el, msg, type) {
    el.textContent = msg;
    el.className = 'km-status-msg ' + (type || '');
    setTimeout(function () {
      if (el.textContent === msg) el.textContent = '';
    }, 3000);
  }

  function escapeAttr(str) {
    return (str || '').replace(/"/g, '&quot;');
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  window.KeyManager = {
    init: init,
    get: getKey,
    set: setKey,
    has: hasKey,
    remove: removeKey,
    getAll: readAll,
    migrateFromLegacy: migrateFromLegacy,
  };
})();
