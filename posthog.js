/**
 * PostHog Product Analytics for the BuzzBuzz website.
 * Official JavaScript web SDK (snippet). Initializes at most once per page.
 */
(function () {
  if (window.__BUZZBUZZ_POSTHOG_INIT__) return;

  window.buzzbuzzCapture = function (eventName, properties) {
    if (!window.posthog || typeof window.posthog.capture !== 'function') return;
    window.posthog.capture(eventName, properties || {});
  };

  var config = window.BUZZBUZZ_POSTHOG || {};
  var apiKey = typeof config.apiKey === 'string' ? config.apiKey.trim() : '';
  var apiHost = typeof config.host === 'string' ? config.host.trim() : '';
  var isDevelopment = /(^localhost$|^127\.0\.0\.1$|\.localhost$)/.test(window.location.hostname);

  if (!apiKey) {
    if (isDevelopment) {
      throw new Error('POSTHOG_PROJECT_API_KEY variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once POSTHOG_PROJECT_API_KEY is configured');
    }
    return;
  }

  if (!apiHost) {
    if (isDevelopment) {
      throw new Error('POSTHOG_HOST variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once POSTHOG_HOST is configured');
    }
    return;
  }

  window.__BUZZBUZZ_POSTHOG_INIT__ = true;

  var SENSITIVE_QUERY_PARAMS = ['i', 'inviteId', 'hiveId', 'from', 'referrer'];

  function sanitizeUrlString(raw) {
    if (typeof raw !== 'string' || !raw) return raw;
    if (raw.indexOf('intent://') === 0) {
      return 'intent://[redacted]';
    }
    try {
      var isCustomScheme = raw.indexOf('buzzbuzz://') === 0;
      var url = isCustomScheme
        ? new URL(raw.replace(/^buzzbuzz:\/\//, 'https://buzzbuzz.invalid/'))
        : new URL(raw, window.location.origin);
      SENSITIVE_QUERY_PARAMS.forEach(function (key) {
        url.searchParams.delete(key);
      });
      if (isCustomScheme) {
        return 'buzzbuzz://' + url.host.replace(/^buzzbuzz\.invalid$/, '') + url.pathname + url.search + url.hash;
      }
      return url.toString();
    } catch (err) {
      return raw.split('?')[0];
    }
  }

  function looksLikeUrl(value) {
    return (
      /^https?:\/\//i.test(value) ||
      value.indexOf('buzzbuzz://') === 0 ||
      value.indexOf('intent://') === 0 ||
      value.indexOf('kakaotalk://') === 0
    );
  }

  function sanitizeValue(value) {
    if (typeof value === 'string') {
      return looksLikeUrl(value) ? sanitizeUrlString(value) : value;
    }
    if (Array.isArray(value)) {
      return value.map(sanitizeValue);
    }
    if (value && typeof value === 'object') {
      var out = {};
      Object.keys(value).forEach(function (key) {
        var lower = key.toLowerCase();
        if (
          lower === 'i' ||
          lower === 'inviteid' ||
          lower === 'hiveid' ||
          lower === 'from' ||
          lower === 'email' ||
          lower === 'username' ||
          lower === 'name'
        ) {
          return;
        }
        out[key] = sanitizeValue(value[key]);
      });
      return out;
    }
    return value;
  }

  function sanitizeEvent(event) {
    if (!event) return event;
    if (event.properties) event.properties = sanitizeValue(event.properties);
    if (event.$set) event.$set = sanitizeValue(event.$set);
    if (event.$set_once) event.$set_once = sanitizeValue(event.$set_once);
    return event;
  }

  !function (t, e) {
    var o, n, p, r;
    e.__SV || (window.posthog = e, e._i = [], e.init = function (i, s, a) {
      function g(t, e) {
        var o = e.split('.');
        2 == o.length && (t = t[o[0]], e = o[1]);
        t[e] = function () {
          t.push([e].concat(Array.prototype.slice.call(arguments, 0)));
        };
      }
      (p = t.createElement('script')).type = 'text/javascript';
      p.crossOrigin = 'anonymous';
      p.async = !0;
      p.src = s.api_host.replace('.i.posthog.com', '-assets.i.posthog.com') + '/static/array.js';
      (r = t.getElementsByTagName('script')[0]).parentNode.insertBefore(p, r);
      var u = e;
      void 0 !== a ? u = e[a] = [] : a = 'posthog';
      u.people = u.people || [];
      u.toString = function (t) {
        var e = 'posthog';
        return 'posthog' !== a && (e += '.' + a), t || (e += ' (stub)'), e;
      };
      u.people.toString = function () {
        return u.toString(1) + '.people (stub)';
      };
      o = 'init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug'.split(' ');
      for (n = 0; n < o.length; n++) g(u, o[n]);
      e._i.push([i, s, a]);
    }, e.__SV = 1);
  }(document, window.posthog || []);

  window.posthog.init(apiKey, {
    api_host: apiHost,
    defaults: '2026-01-30',
    autocapture: true,
    capture_pageview: true,
    capture_exceptions: {
      capture_unhandled_errors: true,
      capture_unhandled_rejections: true,
      capture_console_errors: false
    },
    person_profiles: 'identified_only',
    disable_session_recording: false,
    get_current_url: function () {
      return sanitizeUrlString(window.location.href);
    },
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: '#fromText'
    },
    before_send: sanitizeEvent
  });
})();
