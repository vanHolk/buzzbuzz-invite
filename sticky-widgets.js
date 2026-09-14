/* Sticky Ask the Hive FAB (shared by bee lore pages). */
(function initAskHive() {
  var ASK_HIVE_ENABLED = true;
  var askHivePreview =
    new URLSearchParams(window.location.search).get('askHive') === '1';
  var showAskHive = ASK_HIVE_ENABLED || askHivePreview;
  if (!showAskHive) return;

  var root = document.getElementById('ask-hive');
  var fab = document.getElementById('ask-hive-fab');
  var panel = document.getElementById('ask-hive-panel');
  var backdrop = document.getElementById('ask-hive-backdrop');
  var closeBtn = document.getElementById('ask-hive-close');
  var statusEl = document.getElementById('ask-hive-status');
  var fallbackEl = document.getElementById('ask-hive-fallback');
  if (!root || !fab || !panel) return;

  document.documentElement.classList.add('ask-hive-on');
  root.hidden = false;

  /**
   * Provider config — consumer prefill URLs are UNDOCUMENTED / fragile.
   * Do not treat ChatGPT / Claude / Perplexity query params as official APIs.
   */
  var PROVIDERS = {
    chatgpt: {
      id: 'chatgpt',
      label: 'Ask ChatGPT',
      baseUrl: 'https://chatgpt.com/',
      queryParam: 'q',
      supportsPromptPrefill: true,
      enabled: true,
      openMode: 'anchor'
    },
    claude: {
      id: 'claude',
      label: 'Ask Claude',
      baseUrl: 'https://claude.ai/new',
      queryParam: 'q',
      supportsPromptPrefill: true,
      enabled: true,
      openMode: 'anchor'
    },
    perplexity: {
      id: 'perplexity',
      label: 'Ask Perplexity',
      baseUrl: 'https://www.perplexity.ai/',
      queryParam: 'q',
      supportsPromptPrefill: true,
      enabled: true,
      openMode: 'anchor'
    },
    grok: {
      id: 'grok',
      label: 'Ask Grok',
      baseUrl: 'https://grok.com/',
      queryParam: 'q',
      supportsPromptPrefill: true,
      enabled: true,
      openMode: 'anchor'
    },
    copy: {
      id: 'copy',
      label: 'Copy prompt',
      baseUrl: '',
      supportsPromptPrefill: false,
      enabled: true,
      openMode: 'copy'
    },
    gemini: {
      id: 'gemini',
      label: 'Copy and open Gemini',
      baseUrl: 'https://gemini.google.com/app',
      supportsPromptPrefill: false,
      enabled: true,
      openMode: 'copy-open'
    }
  };

  var PROMPTS = {
    en:
      "I'm viewing BuzzBuzz at " + window.location.href.split('#')[0] + ".\n\n" +
      "BuzzBuzz is a playful social step-tracking app designed to help friends and families stay active together. Users join small Hives, contribute their daily steps, and care for expressive virtual bees. The experience is intended to feel warmer and less competitive than traditional fitness tracking apps.\n\n" +
      "Based on the information available on the page, explain:\n" +
      "1. How BuzzBuzz works\n" +
      "2. Who it is best suited for\n" +
      "3. How Hives support motivation and connection\n" +
      "4. How it differs from more competitive fitness apps such as Strava\n\n" +
      "Clearly distinguish facts found on the page from any assumptions or general advice.",
    ko:
      "지금 BuzzBuzz 페이지를 보고 있어요: " + window.location.href.split('#')[0] + "\n\n" +
      "BuzzBuzz는 친구·가족이 함께 가볍게 걸을 수 있게 만든 소셜 만보기 앱이에요. 작은 하이브에 들어가 하루 걸음을 모으고, 표정이 있는 가상 벌을 돌보는 방식이에요. 전통적인 경쟁형 피트니스 앱보다 더 따뜻하고 부담이 적게 느껴지도록 설계됐어요.\n\n" +
      "페이지에 있는 정보를 바탕으로 아래를 설명해 주세요:\n" +
      "1. BuzzBuzz가 어떻게 작동하는지\n" +
      "2. 어떤 사람에게 잘 맞는지\n" +
      "3. 하이브가 동기부여와 연결감에 어떻게 도움이 되는지\n" +
      "4. Strava처럼 더 경쟁적인 피트니스 앱과 어떻게 다른지\n\n" +
      "페이지에서 확인되는 사실과, 추정이나 일반적인 조언을 분명히 구분해 주세요."
  };

  var STR = {
    en: {
      copied: 'Prompt copied',
      copyError: "Couldn't copy. Select the text below and copy it yourself.",
      geminiHint: 'Paste the prompt in Gemini.',
      closeAria: 'Close'
    },
    ko: {
      copied: '프롬프트를 복사했어요',
      copyError: '복사를 못 했어요. 아래 텍스트를 직접 복사해 주세요.',
      geminiHint: 'Gemini에 붙여넣어 주세요.',
      closeAria: '닫기'
    }
  };

  var isOpen = false;
  var mqSheet = window.matchMedia('(max-width: 760px)');
  var inertTargets = [];

  function locale() {
    return document.documentElement.lang === 'ko' ? 'ko' : 'en';
  }

  function trackAskHive(eventName, detail) {
    var payload = detail || {};
    payload.locale = locale();
    payload.pageType = 'bee-lore';
    try {
      window.dispatchEvent(new CustomEvent('ask-hive:' + eventName, { detail: payload }));
    } catch (e) {}
  }

  function getPrompt() {
    return PROMPTS[locale()] || PROMPTS.en;
  }

  function providerUrl(provider, prompt) {
    if (!provider || !provider.supportsPromptPrefill) return provider.baseUrl || '#';
    var url = new URL(provider.baseUrl);
    url.searchParams.set(provider.queryParam || 'q', prompt);
    return url.toString();
  }

  function refreshAnchorHrefs() {
    var prompt = getPrompt();
    Object.keys(PROVIDERS).forEach(function (id) {
      var provider = PROVIDERS[id];
      if (!provider.enabled || provider.openMode !== 'anchor') return;
      var el = root.querySelector('[data-ask-provider="' + id + '"]');
      if (!el) return;
      el.setAttribute('href', providerUrl(provider, prompt));
    });
  }

  function setStatus(message, tone) {
    statusEl.textContent = message || '';
    if (tone) statusEl.setAttribute('data-tone', tone);
    else statusEl.removeAttribute('data-tone');
  }

  function showFallback(text) {
    fallbackEl.textContent = text;
    fallbackEl.classList.add('is-visible');
  }

  function hideFallback() {
    fallbackEl.classList.remove('is-visible');
    fallbackEl.textContent = '';
  }

  function isSheetMode() {
    return mqSheet.matches;
  }

  function getFocusable() {
    return Array.prototype.slice.call(
      panel.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')
    ).filter(function (el) {
      if (el.hasAttribute('disabled') || el.getAttribute('aria-hidden') === 'true') return false;
      var style = window.getComputedStyle(el);
      return style.visibility !== 'hidden' && style.display !== 'none';
    });
  }

  function setBackgroundInert(on) {
    inertTargets.forEach(function (el) {
      if (on) el.setAttribute('inert', '');
      else el.removeAttribute('inert');
    });
  }

  function openPanel() {
    if (isOpen) return;
    isOpen = true;
    hideFallback();
    setStatus('');
    refreshAnchorHrefs();
    panel.hidden = false;
    root.classList.add('is-open');
    fab.setAttribute('aria-expanded', 'true');

    if (isSheetMode()) {
      root.classList.add('is-sheet-open');
      backdrop.hidden = false;
      panel.setAttribute('aria-modal', 'true');
      setBackgroundInert(true);
    } else {
      root.classList.remove('is-sheet-open');
      backdrop.hidden = true;
      panel.removeAttribute('aria-modal');
      setBackgroundInert(false);
    }

    var focusables = getFocusable();
    (focusables[0] || closeBtn).focus();
    trackAskHive('open', {});
  }

  function closePanel() {
    if (!isOpen) return;
    isOpen = false;
    panel.hidden = true;
    backdrop.hidden = true;
    root.classList.remove('is-open', 'is-sheet-open');
    fab.setAttribute('aria-expanded', 'false');
    panel.removeAttribute('aria-modal');
    setBackgroundInert(false);
    fab.focus();
    trackAskHive('close', {});
  }

  function togglePanel() {
    if (isOpen) closePanel();
    else openPanel();
  }

  function copyPrompt(providerId) {
    var prompt = getPrompt();
    var strings = STR[locale()];
    var id = providerId || 'copy';
    function ok() {
      setStatus(strings.copied, 'ok');
      hideFallback();
      trackAskHive('copy_prompt', { providerId: id, prefillAttempted: false });
      return true;
    }
    function fail() {
      setStatus(strings.copyError, 'err');
      showFallback(prompt);
      trackAskHive('copy_error', { providerId: id, prefillAttempted: false });
      return false;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(prompt).then(ok).catch(fail);
    }
    try {
      var ta = document.createElement('textarea');
      ta.value = prompt;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      var success = document.execCommand('copy');
      document.body.removeChild(ta);
      return Promise.resolve(success ? ok() : fail());
    } catch (e) {
      return Promise.resolve(fail());
    }
  }

  inertTargets = Array.prototype.slice.call(document.body.children).filter(function (el) {
    return el.id !== 'ask-hive';
  });

  fab.addEventListener('click', function () { togglePanel(); });
  closeBtn.addEventListener('click', function () { closePanel(); });
  backdrop.addEventListener('click', function () { closePanel(); });

  document.addEventListener('keydown', function (e) {
    if (!isOpen) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      closePanel();
      return;
    }
    if (e.key !== 'Tab' || !isSheetMode()) return;
    var focusables = getFocusable();
    if (!focusables.length) return;
    var first = focusables[0];
    var last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  document.addEventListener('pointerdown', function (e) {
    if (!isOpen || isSheetMode()) return;
    if (root.contains(e.target)) return;
    closePanel();
  });

  function onBreakpointChange() {
    if (!isOpen) return;
    closePanel();
  }
  if (typeof mqSheet.addEventListener === 'function') {
    mqSheet.addEventListener('change', onBreakpointChange);
  } else if (typeof mqSheet.addListener === 'function') {
    mqSheet.addListener(onBreakpointChange);
  }

  root.querySelectorAll('[data-ask-provider]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      var id = el.getAttribute('data-ask-provider');
      var provider = PROVIDERS[id];
      if (!provider || !provider.enabled) {
        e.preventDefault();
        return;
      }
      trackAskHive('provider_select', {
        providerId: id,
        prefillAttempted: !!provider.supportsPromptPrefill
      });

      if (provider.openMode === 'copy') {
        e.preventDefault();
        copyPrompt('copy');
        return;
      }

      if (provider.openMode === 'copy-open') {
        e.preventDefault();
        var strings = STR[locale()];
        var a = document.createElement('a');
        a.href = provider.baseUrl;
        a.target = '_blank';
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        trackAskHive('external_open', {
          providerId: id,
          prefillAttempted: false
        });
        copyPrompt('gemini').then(function (ok) {
          if (ok) {
            setStatus(strings.copied + ' — ' + strings.geminiHint, 'ok');
          }
        });
        return;
      }

      trackAskHive('external_open', {
        providerId: id,
        prefillAttempted: true
      });
    });
  });

  window.__askHiveOnLangChange = function () {
    refreshAnchorHrefs();
    if (isOpen) {
      setStatus('');
      hideFallback();
    }
  };

  refreshAnchorHrefs();
})();
