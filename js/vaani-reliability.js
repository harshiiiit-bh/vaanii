/* VAANI reliability patch — Oct 15, 2026
   - Dashboard portrait falls back to a bundled SVG if the remote image fails.
   - GitHub Pages account writes keep a per-account local recovery copy.
   - A missing, damaged, or stale primary account can be recovered on login.
*/
(function () {
  'use strict';

  const LOCAL_MODE =
    /(?:^|\.)github\.io$/i.test(location.hostname) ||
    location.protocol === 'file:';

  function bindDashboardPortrait() {
    document.querySelectorAll('.vd-officer-image').forEach(function (img) {
      if (img.dataset.vaaniFallbackBound === '1') return;
      img.dataset.vaaniFallbackBound = '1';

      function useLocalFallback() {
        if (img.dataset.vaaniFallback === '1') return;
        img.dataset.vaaniFallback = '1';
        img.classList.add('is-local-fallback');
        // Keep the approved remote src attribute intact; layer a bundled image
        // over it instead so diagnostics and existing contracts stay stable.
        const stage = img.closest('.vd-officer-stage');
        if (!stage || stage.querySelector('.vd-officer-local-fallback')) return;
        const fallback = document.createElement('img');
        fallback.className = 'vd-officer-local-fallback';
        fallback.src = 'assets/officer-vaani.svg';
        fallback.alt = 'Officer VAANI';
        fallback.loading = 'eager';
        fallback.decoding = 'async';
        stage.appendChild(fallback);
      }

      img.addEventListener('error', useLocalFallback);
      // The remote image may have failed before this script was attached.
      if (img.complete && img.naturalWidth === 0) useLocalFallback();
    });
  }

  function ensureOfficer() {
    try {
      if (typeof window.vaaniCharacterEnsure !== 'function') return;
      if (document.getElementById('vaaniMentor')) return;

      // Let the elite dock's normal boot run first. If it did not create the
      // mentor (for example, after a script hiccup), make one recovery attempt.
      if (typeof window.vaaniCharacterOnMount === 'function') {
        window.setTimeout(function () {
          if (!document.getElementById('vaaniMentor')) {
            window.vaaniCharacterEnsure();
          }
        }, 750);
      } else {
        window.vaaniCharacterEnsure();
      }
    } catch (err) {
      console.warn('[VAANI] Officer recovery could not complete:', err);
    }
  }

  bindDashboardPortrait();
  ensureOfficer();

  window.addEventListener('pageshow', function () {
    bindDashboardPortrait();
    ensureOfficer();
  });
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) ensureOfficer();
  });

  if (!LOCAL_MODE) return;

  const ACCOUNT_PREFIX = 'vbv_veer_bhogya_account_';
  const BACKUP_PREFIX = 'vaani_account_backup_v1_';
  const accountKey = function (code) { return ACCOUNT_PREFIX + code; };
  const backupKey = function (code) { return BACKUP_PREFIX + code; };

  function cleanCode(value) {
    return String(value || '').replace(/\D/g, '').slice(0, 6);
  }

  function record(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function isCombinedAccount(raw) {
    if (typeof raw !== 'string' || !raw) return false;
    try {
      const parsed = JSON.parse(raw);
      return record(parsed) &&
        (record(parsed.vaani) || record(parsed.vbv));
    } catch (_) {
      return false;
    }
  }

  function activeCode() {
    try {
      return typeof ACTIVE_CODE !== 'undefined' ? cleanCode(ACTIVE_CODE) : '';
    } catch (_) {
      return '';
    }
  }

  function currentSnapshot() {
    try {
      return JSON.stringify({
        vaani: typeof State !== 'undefined' && record(State) ? State : {},
        vbv: typeof DATA !== 'undefined' && record(DATA) ? DATA : {}
      });
    } catch (err) {
      console.warn('[VAANI] Recovery snapshot could not be serialized:', err);
      return null;
    }
  }

  function safeGet(key) {
    try { return localStorage.getItem(key); } catch (_) { return null; }
  }

  function safeSet(key, value) {
    try { localStorage.setItem(key, value); return true; } catch (_) { return false; }
  }

  function notifyRecovered() {
    const message = 'VAANI restored your latest saved progress from its local recovery copy.';
    try {
      if (typeof window.toast === 'function') window.toast(message);
      else console.info('[VAANI] ' + message);
    } catch (_) {
      console.info('[VAANI] ' + message);
    }
  }

  // Keep a recovery copy around every account write. We save the in-memory
  // snapshot first, so a failed primary write still leaves the latest attempt
  // recoverable. On success, replace it with the exact primary value.
  const nativePersist = window.persistCombinedAccount;
  if (typeof nativePersist === 'function' && !nativePersist.__vaaniRecoveryWrapped) {
    const wrappedPersist = async function () {
      const code = activeCode();
      if (!code || code.length !== 6) {
        return nativePersist.apply(this, arguments);
      }

      const snapshot = currentSnapshot();
      if (snapshot && isCombinedAccount(snapshot)) {
        safeSet(backupKey(code), snapshot);
      }

      let ok = false;
      try {
        ok = await nativePersist.apply(this, arguments);
      } catch (err) {
        console.warn('[VAANI] Account save failed; recovery copy retained.', err);
        return false;
      }

      if (ok) {
        const primary = safeGet(accountKey(code));
        if (isCombinedAccount(primary)) safeSet(backupKey(code), primary);
      }
      return ok;
    };
    wrappedPersist.__vaaniRecoveryWrapped = true;
    window.persistCombinedAccount = wrappedPersist;
  }

  // Restore only when the local primary and the recovery copy differ. A
  // mismatch is expected after a primary write failed; successful saves keep
  // them aligned. Re-login after restoring so the in-memory State is refreshed.
  const nativeLogin = window.loginWithCode;
  if (typeof nativeLogin === 'function' && !nativeLogin.__vaaniRecoveryWrapped) {
    const wrappedLogin = async function (rawCode) {
      const code = cleanCode(rawCode);
      const result = await nativeLogin.apply(this, arguments);
      if (code.length !== 6) return result;

      const primaryKey = accountKey(code);
      const recoverKey = backupKey(code);
      const primary = safeGet(primaryKey);
      const backup = safeGet(recoverKey);

      if (isCombinedAccount(backup) && backup !== primary) {
        // Don't lose the primary if a retry unexpectedly fails.
        if (!safeSet(primaryKey, backup)) return result;
        try {
          const recovered = await nativeLogin.call(this, rawCode);
          if (recovered && recovered.ok) {
            notifyRecovered();
            return recovered;
          }
        } catch (_) {}
        if (primary === null) {
          try { localStorage.removeItem(primaryKey); } catch (_) {}
        } else {
          safeSet(primaryKey, primary);
        }
        return result;
      }

      // Seed the recovery copy the first time an existing account is opened.
      if (result && result.ok && isCombinedAccount(primary) && !isCombinedAccount(backup)) {
        safeSet(recoverKey, primary);
      }
      return result;
    };
    wrappedLogin.__vaaniRecoveryWrapped = true;
    window.loginWithCode = wrappedLogin;
  }
})();
