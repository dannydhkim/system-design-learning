// Cloud sync: keeps one online copy of the progress, a file in a private GitHub repository, in step with this device.
//
// Saving never waits for the network: SD.save() writes to this browser as before, and this module catches up later.
// A cycle reads the online file, folds it into SD.state with the same merge two tabs use, and writes the result back
// only if it holds something the online file lacks. The write names the version it read (the file's sha), so GitHub
// refuses it if another device wrote in between; the cycle then reads again and retries. No copy is ever overwritten
// unread.
//
// The token and the repository settings live in localStorage['sdq.github'], never in the progress file.
(function (SD) {
  'use strict';

  var GHKEY = 'sdq.github', METAKEY = 'sdq.cloud';
  var DEFAULTS = { owner: 'dannydhkim', repo: 'system-design-progress', branch: 'main', path: 'progress.json' };
  var CODE_REPO = 'system-design-learning';   // public: progress must never be written there
  var DEBOUNCE = 45000;       // sync this long after the last save …
  var MAX_WAIT = 180000;      // … but never leave a change unsynced longer than this while saves keep coming
  var POLL = 300000;          // while the app is open, look for the other device's progress this often
  var FRESH = 30000;          // coming back to the app syncs again unless the last sync is younger than this
  var RETRY_MIN = 15000, RETRY_MAX = 300000;
  var TRIES = 4;              // attempts at a write that keeps losing to another device
  var KEEPALIVE_MAX = 60000;  // browsers refuse a keepalive body over 64 KB

  function readJSON(key) { try { var v = JSON.parse(localStorage.getItem(key)); return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; } catch (e) { return {}; } }
  function writeJSON(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* storage may be unavailable */ } }

  /* ---------- Settings ---------- */
  // An earlier version pushed progress to progress/progress.json in the code repository, which is public. Such a
  // setting is moved to the private defaults once; the token is kept, and the Settings card says if it does not fit.
  function conf() {
    var c = readJSON(GHKEY), k, moved = false;
    if (c.repo === CODE_REPO) { delete c.repo; delete c.path; delete c.branch; moved = true; }
    for (k in DEFAULTS) if (!c[k] || typeof c[k] !== 'string') c[k] = DEFAULTS[k];
    if (typeof c.token !== 'string') c.token = '';
    if (typeof c.label !== 'string') c.label = '';
    if (moved) writeJSON(GHKEY, c);
    return c;
  }
  function meta() { return readJSON(METAKEY); }
  function setMeta(k, v) { var m = meta(); m[k] = v; writeJSON(METAKEY, m); }

  /* ---------- GitHub Contents API ---------- */
  function b64(str) { return btoa(unescape(encodeURIComponent(str))); }
  function unb64(str) { return decodeURIComponent(escape(atob(str.replace(/\s/g, '')))); }
  function enc(x) { return encodeURIComponent(x); }
  function repoUrl(c) { return 'https://api.github.com/repos/' + enc(c.owner) + '/' + enc(c.repo); }
  function fileUrl(c) { return repoUrl(c) + '/contents/' + c.path.split('/').filter(Boolean).map(enc).join('/'); }
  function call(c, method, url, body, keepalive) {
    var o = { method: method, headers: { Authorization: 'Bearer ' + c.token, Accept: 'application/vnd.github+json' }, cache: 'no-store' };
    if (body) { o.body = body; o.headers['Content-Type'] = 'application/json'; }
    if (keepalive) o.keepalive = true;
    return fetch(url, o).then(null, function () { throw { kind: 'net' }; });
  }
  function header(r, name) { try { return r.headers && r.headers.get ? r.headers.get(name) : null; } catch (e) { return null; } }
  // Turn a refusal into what to do about it. Never includes the token.
  function refusal(r) {
    var after = +header(r, 'retry-after'), reset = +header(r, 'x-ratelimit-reset'), left = header(r, 'x-ratelimit-remaining');
    if (r.status === 429 || (r.status === 403 && (after > 0 || left === '0'))) {
      var wait = after > 0 ? after * 1000 : reset > 0 ? reset * 1000 - Date.now() : 60000;
      return { kind: 'rate', wait: Math.min(3600000, Math.max(5000, wait)) };
    }
    if (r.status === 401) return { kind: 'auth', text: 'GitHub rejected the token. It may have expired or been revoked.' };
    if (r.status === 403) return { kind: 'auth', text: 'The token is not allowed to do this. It needs “Contents: read and write” on the progress repository.' };
    return { kind: 'http', text: 'GitHub answered ' + r.status + '.' };
  }
  // Before the first sync of a session: the repository must exist and be private.
  var checked = null;
  function checkRepo(c) {
    var id = c.owner + '/' + c.repo;
    if (checked === id) return Promise.resolve();
    return call(c, 'GET', repoUrl(c)).then(function (r) {
      if (r.status === 404) throw { kind: 'setup', text: 'The repository ' + id + ' was not found, or the token cannot see it. Create it as a private repository and give the token access to it.' };
      if (!r.ok) throw refusal(r);
      return r.json();
    }).then(function (repo) {
      if (!repo || repo.private !== true) throw { kind: 'setup', text: 'The repository ' + id + ' is public, so anyone could read your progress. Make it private, or choose a private repository.' };
      checked = id;
    });
  }
  // The online copy: null when there is no file yet, otherwise { sha, state }.
  function getFile(c) {
    return call(c, 'GET', fileUrl(c) + '?ref=' + enc(c.branch)).then(function (r) {
      if (r.status === 404) return null;
      if (!r.ok) throw refusal(r);
      return r.json().then(function (f) {
        var obj = null;
        try { obj = JSON.parse(unb64(f.content)); } catch (e) { obj = null; }
        if (!obj || typeof obj !== 'object' || obj.v !== 1) throw { kind: 'setup', text: 'The file ' + c.path + ' in ' + c.owner + '/' + c.repo + ' is not a progress file. Delete it there or choose another file path; sync will not overwrite it.' };
        return { sha: f.sha, state: SD.normalize(obj) };
      });
    });
  }
  function putBody(c, fileSha, pretty) {
    var label = c.label.replace(/[^\w .,'()-]/g, '').trim().slice(0, 40);
    var b = { message: 'Sync from ' + (label || 'a device'), content: b64(pretty ? JSON.stringify(SD.state, null, 1) : JSON.stringify(SD.state)), branch: c.branch };
    if (fileSha) b.sha = fileSha;
    return JSON.stringify(b);
  }

  /* ---------- Status ---------- */
  // off: no token · syncing · synced · waiting: changes not online yet · offline · auth: needs a new token ·
  // setup: the repository or file is wrong · conflict: one copy was reset and the owner must choose
  var cloud = SD.cloud = { status: 'off', text: '', conflict: null, onChange: null };
  function set(status, text) {
    text = text || '';
    if (cloud.status === status && cloud.text === text) return;
    cloud.status = status; cloud.text = text;
    if (SD.notify) SD.notify();
    if (cloud.onChange) cloud.onChange();
  }
  function stopped() { return cloud.status === 'auth' || cloud.status === 'setup' || cloud.status === 'conflict'; }
  function dirty() { return !!SD.state && SD.state.updatedAt !== meta().mark; }
  function synced(at) { setMeta('mark', at); setMeta('at', Date.now()); }
  cloud.lastSync = function () { return meta().at || 0; };
  cloud.conf = conf;
  cloud.DEFAULTS = DEFAULTS;

  /* ---------- A reset on one side ---------- */
  // merge() keeps the copy that was reset or imported last and drops the other whole. That is right for a reset the
  // owner made knowing it applies everywhere, and wrong when it would silently drop real progress: a device that was
  // reset before sync was set up, or progress this device made that never reached the online copy. Those are asked.
  function hasProgress(s) { return s.xp > 0 || Object.keys(s.cards).length > 0 || Object.keys(s.topics).length > 0; }
  function clash(remote) {
    var s = SD.state;
    if (remote.resetAt === s.resetAt) return null;
    if (s.resetAt > remote.resetAt) return hasProgress(remote) && meta().okReset !== s.resetAt ? { drops: 'online', at: s.resetAt, remote: remote } : null;
    return hasProgress(s) && dirty() ? { drops: 'device', at: remote.resetAt, remote: remote } : null;
  }
  // The owner confirmed a reset or import, having been told it applies to every synced device.
  cloud.ackReset = function () { if (SD.state) setMeta('okReset', SD.state.resetAt); };
  // keep: 'device' or 'online'. The kept copy is stamped as the latest reset, so it wins on every device.
  cloud.resolve = function (keep) {
    var q = cloud.conflict;
    if (!q) return Promise.resolve();
    cloud.conflict = null;
    if (keep === 'online') SD.replaceState(q.remote);
    else SD.keepOver(q.remote.resetAt);
    cloud.ackReset();
    set('waiting');
    return run(true);
  };

  /* ---------- One cycle ---------- */
  var sha = null;   // version of the online file that SD.state already contains; null when unknown
  function cycle(c) {
    var tries = 0;
    function attempt() {
      return getFile(c).then(function (remote) {
        var ahead;
        sha = null;
        if (remote) {
          var q = clash(remote.state);
          if (q) throw { kind: 'conflict', q: q };
          ahead = SD.foldCloud(remote.state);
          sha = remote.sha;
        } else ahead = SD.state.updatedAt > 0;   // nothing online yet: publish what this device has, if anything
        if (!ahead) return synced(SD.state.updatedAt);
        var at = SD.state.updatedAt;
        return call(c, 'PUT', fileUrl(c), putBody(c, remote && remote.sha, true)).then(function (r) {
          if (r.status === 409 || r.status === 422) {   // the file changed since it was read
            sha = null;
            if (++tries < TRIES) return attempt();
            throw { kind: 'http', text: 'Another device kept writing at the same time.' };
          }
          if (r.status === 404) throw { kind: 'setup', text: 'GitHub could not write ' + c.path + ' on branch ' + c.branch + ' of ' + c.owner + '/' + c.repo + '. Check the branch name, and that the token has “Contents: read and write”.' };
          if (!r.ok) throw refusal(r);
          return r.json().then(function (j) { sha = j && j.content && j.content.sha || null; synced(at); });
        });
      });
    }
    return checkRepo(c).then(attempt);
  }

  /* ---------- Scheduling ---------- */
  var running = null, again = false, timer = null, timerAt = 0, backoff = 0, firstDirty = 0, lastRun = 0;
  function later(ms) {
    var at = Date.now() + ms;
    if (timer && timerAt <= at) return;   // an earlier run is already due
    clearTimeout(timer); timerAt = at;
    timer = setTimeout(function () { timer = null; run(); }, ms);
  }
  function unschedule() { clearTimeout(timer); timer = null; }
  // One tab at a time where the browser can arrange it; two at once is still safe, only wasteful.
  function locked(fn) {
    var locks = typeof navigator !== 'undefined' && navigator.locks;
    if (!locks || !locks.request) return fn();
    return locks.request('sdq.cloud', { ifAvailable: true }, function (lock) { return lock ? fn() : 'busy'; });
  }
  function run(force) {
    var c = conf();
    if (!c.token) { unschedule(); set('off'); return Promise.resolve(); }
    if (!SD.state) return Promise.resolve();
    if (stopped() && !force) return Promise.resolve();
    if (running) { again = true; return running; }
    unschedule(); lastRun = Date.now();
    set('syncing');
    running = locked(function () { return cycle(c); }).then(function (res) {
      running = null;
      if (res === 'busy') { set(dirty() ? 'waiting' : 'synced'); return later(20000); }
      backoff = 0; firstDirty = 0;
      if (dirty()) { set('waiting'); queue(); } else set('synced');   // a save landed while the write was in flight
    }, function (e) {
      running = null;
      e = e && e.kind ? e : { kind: 'http', text: 'Sync failed unexpectedly.' };
      if (e.kind === 'conflict') { cloud.conflict = e.q; set('conflict'); SD.toast('☁ Cloud sync needs a decision — open Settings'); return; }
      if (e.kind === 'auth' || e.kind === 'setup') return set(e.kind, e.text);
      if (e.kind === 'rate') { set('waiting', 'GitHub asked to slow down. Sync will try again shortly.'); return later(e.wait); }
      backoff = Math.min(RETRY_MAX, backoff ? backoff * 2 : RETRY_MIN);
      if (e.kind === 'net') set('offline'); else set('waiting', (e.text || '') + ' Sync will try again.');
      later(backoff);
    }).then(function () { if (again) { again = false; return run(); } });
    return running;
  }
  // A save happened: sync once things go quiet.
  function queue() {
    var now = Date.now();
    if (!firstDirty) firstDirty = now;
    var ms = Math.min(DEBOUNCE, Math.max(0, firstDirty + MAX_WAIT - now));
    clearTimeout(timer); timerAt = now + ms;
    timer = setTimeout(function () { timer = null; run(); }, ms);
  }
  var seen = null;
  function onState() {
    if (!SD.state || SD.state.updatedAt === seen) return;
    seen = SD.state.updatedAt;
    if (!conf().token || stopped() || !dirty()) return;
    if (cloud.status === 'synced') set('waiting');
    if (!running && cloud.status !== 'offline') queue();
  }
  // Leaving or hiding the page: one best-effort write that may outlive it. It names the version this device last
  // saw, so it lands only if no other device wrote since; otherwise it is refused and the next launch syncs.
  function flush() {
    var c = conf();
    if (!c.token || !sha || running || stopped() || !dirty()) return;
    var body = putBody(c, sha, false), at = SD.state.updatedAt;
    if (body.length > KEEPALIVE_MAX) return;
    sha = null;   // spent either way
    call(c, 'PUT', fileUrl(c), body, true).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { if (j && j.content && j.content.sha && SD.state.updatedAt === at) { sha = j.content.sha; synced(at); if (cloud.status === 'waiting') set('synced'); } })
      .then(null, function () { /* the next sync picks it up */ });
  }
  function wake() { if (!running && (dirty() || Date.now() - lastRun > FRESH)) run(); }

  cloud.syncNow = function () { backoff = 0; return run(true); };
  // Change a setting from the Settings card. A new token or repository clears whatever stopped sync before.
  cloud.setConf = function (k, v) {
    var c = conf();
    c[k] = String(v == null ? '' : v).trim();
    if (!c[k] && DEFAULTS[k]) c[k] = DEFAULTS[k];
    writeJSON(GHKEY, c);
    if (k === 'label') return;
    checked = null; sha = null; backoff = 0;
    if (cloud.status !== 'conflict') { cloud.text = ''; if (stopped()) cloud.status = 'waiting'; }
    run();
  };
  cloud.start = function () {
    seen = SD.state ? SD.state.updatedAt : null;
    SD.on(onState);
    window.addEventListener('online', function () { backoff = 0; run(); });
    window.addEventListener('offline', function () { if (conf().token && !stopped() && !running) set('offline'); });
    window.addEventListener('focus', wake);
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flush(); else wake(); });
    setInterval(function () { if (document.visibilityState !== 'hidden') run(); }, POLL);
    return run();
  };

  // What to show: a short word for the HUD and a sentence for Settings.
  cloud.describe = function () {
    var at = cloud.lastSync(), when = at ? 'Last synced ' + new Date(at).toLocaleString() + '.' : 'Not synced yet.';
    switch (cloud.status) {
      case 'synced': return { icon: '☁✓', word: 'Synced', text: 'Everything on this device is online. ' + when, cls: 'ok' };
      case 'syncing': return { icon: '☁…', word: 'Syncing', text: 'Syncing now…', cls: '' };
      case 'waiting': return { icon: '☁●', word: 'Changes waiting', text: (cloud.text || 'Changes are saved on this device and will go online shortly.') + ' ' + when, cls: '' };
      case 'offline': return { icon: '☁✕', word: 'Offline', text: 'GitHub cannot be reached. Progress is saved on this device and will sync when the connection is back. ' + when, cls: 'warn' };
      case 'auth': return { icon: '☁⚠', word: 'Sync needs a new token', text: cloud.text + ' Paste a new token below.', cls: 'bad' };
      case 'setup': return { icon: '☁⚠', word: 'Sync setup problem', text: cloud.text, cls: 'bad' };
      case 'conflict': return { icon: '☁⚠', word: 'Sync needs a decision', text: 'Sync is paused until you choose which copy to keep.', cls: 'bad' };
      default: return { icon: '', word: 'Local only', text: 'Progress is saved on this device only. Add a token to sync between devices.', cls: '' };
    }
  };
})(window.SD);
