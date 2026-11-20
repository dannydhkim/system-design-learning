// The music player: a 🎵 button in the header that opens a panel with play/pause, previous, next, a seek bar, repeat
// and order, volume, a choice of playlist, and the track list with a "never play this" switch. It is built once and
// lives outside the page content, so it keeps playing and stays open while you move between lessons. It can be
// minimized to a slim bar (track, previous, play/pause, next). All state is in
// SD.audio (js/audio.js); this file only draws it and sends it commands.
(function (SD) {
  'use strict';
  var h = SD.h, clear = SD.clear, A = SD.audio;
  var SCENES = [['auto', 'Follow the page'], ['study', 'Study'], ['arcade', 'Arcade'], ['boss', 'Boss']];
  var LOOPS = { shuffle: ['🔀', 'Shuffle', 'Playing the playlist in random order. Press for in order.'], order: ['🔁', 'In order', 'Playing the playlist in order. Press to repeat one track.'], one: ['🔂', 'Repeat one', 'Repeating this track. Press to shuffle.'] };
  var panel = null, mini = null, btn = null, timer = null, KEEP = 'sdq.player', seeking = false, dragVol = false, lastKey = '', E = {};

  function fmt(t) { t = Math.max(0, Math.floor(t || 0)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); }

  function build() {
    E.title = h('div', { class: 'ptitle', 'aria-live': 'polite' }, '');
    E.sub = h('div', { class: 'psub muted' }, '');
    E.seek = h('input', { type: 'range', min: '0', max: '1000', value: '0', 'aria-label': 'Seek' });
    E.seek.addEventListener('input', function () { seeking = true; E.cur.textContent = fmt(+E.seek.value / 1000 * (A.state().duration || 0)); });
    E.seek.addEventListener('change', function () { A.seek(+E.seek.value / 1000); seeking = false; refresh(); });
    E.cur = h('span', {}, '0:00'); E.dur = h('span', {}, '0:00');
    E.prev = h('button', { class: 'btn pbtn', type: 'button', title: 'Previous (restarts the track first)', 'aria-label': 'Previous track', onclick: function () { A.prev(); setTimeout(refresh, 60); } }, '⏮');
    E.play = h('button', { class: 'btn pbtn primary', type: 'button', onclick: function () { A.toggle(); setTimeout(refresh, 60); } }, '▶');
    E.next = h('button', { class: 'btn pbtn', type: 'button', title: 'Next track', 'aria-label': 'Next track', onclick: function () { A.next(); setTimeout(refresh, 60); } }, '⏭');
    E.loop = h('button', { class: 'btn pbtn', type: 'button', onclick: function () { A.cycleLoop(); refresh(); } }, '🔀');
    E.vol = h('input', { type: 'range', min: '0', max: '100', value: '100', 'aria-label': 'Music volume' });
    E.vol.addEventListener('input', function () { dragVol = true; SD.state.settings.musicVol = +E.vol.value / 100; A.refresh(); });
    E.vol.addEventListener('change', function () { dragVol = false; SD.save(); });
    E.tabs = SCENES.map(function (s) { return h('button', { class: 'btn mini ptab', type: 'button', 'data-scene': s[0], onclick: function () { A.setScene(s[0]); lastKey = ''; refresh(); } }, s[1]); });
    E.list = h('ul', { class: 'ptracks' });
    E.note = h('div', { class: 'muted pnote' }, '');
    panel = h('div', { class: 'player', role: 'dialog', 'aria-label': 'Music player', hidden: true },
      h('div', { class: 'prow' }, h('div', { class: 'pgrow' }, E.title, E.sub), h('button', { class: 'btn mini', type: 'button', title: 'Minimize to a small bar', 'aria-label': 'Minimize the music player', onclick: function () { show('mini'); } }, '▁'), h('button', { class: 'btn mini', type: 'button', 'aria-label': 'Close the music player', onclick: function () { show('closed'); } }, '✕')),
      h('div', { class: 'pseek' }, E.cur, E.seek, E.dur),
      h('div', { class: 'prow pctl' }, E.prev, E.play, E.next, E.loop),
      h('div', { class: 'pseek' }, h('span', { 'aria-hidden': 'true' }, '🔊'), E.vol),
      h('div', { class: 'ptabs', role: 'group', 'aria-label': 'Playlist' }, E.tabs),
      E.list, E.note);
    panel.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.stopPropagation(); show('closed', true); } });
    document.body.appendChild(panel);
    // The minimized bar: track, previous, play/pause, next, and a way back to the full player.
    E.mtitle = h('div', { class: 'mtitle' }, '');
    E.mplay = h('button', { class: 'btn mini pbtn', type: 'button', onclick: function () { A.toggle(); setTimeout(refresh, 60); } }, '▶');
    mini = h('div', { class: 'miniplayer', role: 'group', 'aria-label': 'Music player (minimized)', hidden: true },
      h('button', { class: 'mtitlebtn', type: 'button', title: 'Open the full player', 'aria-label': 'Open the full music player', onclick: function () { show('full'); } }, '♪ ', E.mtitle),
      h('button', { class: 'btn mini pbtn', type: 'button', 'aria-label': 'Previous track', onclick: function () { A.prev(); setTimeout(refresh, 60); } }, '⏮'), E.mplay,
      h('button', { class: 'btn mini pbtn', type: 'button', 'aria-label': 'Next track', onclick: function () { A.next(); setTimeout(refresh, 60); } }, '⏭'),
      h('button', { class: 'btn mini', type: 'button', 'aria-label': 'Close the music player', onclick: function () { show('closed'); } }, '✕'));
    mini.addEventListener('keydown', function (e) { if (e.key === 'Escape') show('closed', true); });
    document.body.appendChild(mini);
  }

  function refresh() {
    if (!panel) return;
    var s = A.state(), L = LOOPS[s.loop];
    E.title.textContent = s.track ? s.track.title : s.enabled ? (s.unlocked ? 'Starting…' : 'Tap anywhere to start') : 'Press play to start the music';
    E.sub.textContent = (s.track ? { study: 'Study', arcade: 'Arcade', boss: 'Boss fight' }[s.track.scene] + ' playlist' : 'Playlist: ' + SCENES.filter(function (x) { return x[0] === s.scene; }).map(function (x) { return x[1]; })[0] || '') + (s.blocked ? ' · press play' : '');
    E.play.textContent = s.playing ? '⏸' : '▶';
    E.play.title = s.playing ? 'Pause' : 'Play'; E.play.setAttribute('aria-label', E.play.title);
    E.loop.textContent = L[0] + ' ' + L[1]; E.loop.title = L[2]; E.loop.setAttribute('aria-label', L[1] + '. ' + L[2]);
    if (!seeking) { E.seek.value = s.duration ? Math.round(s.time / s.duration * 1000) : 0; E.cur.textContent = fmt(s.time); }
    E.dur.textContent = fmt(s.duration);
    if (!dragVol) E.vol.value = Math.round(s.volume * 100);
    E.tabs.forEach(function (t) { var on = t.getAttribute('data-scene') === s.sceneMode; t.setAttribute('aria-pressed', on ? 'true' : 'false'); t.classList.toggle('on', on); });
    var key = s.scene + '|' + (s.track ? s.track.id : '') + '|' + s.tracks.map(function (t) { return t.muted ? 1 : 0; }).join('');
    if (key !== lastKey) {
      lastKey = key; clear(E.list);
      s.tracks.forEach(function (t) {
        E.list.appendChild(h('li', { class: 'ptrack' + (t.current ? ' now' : '') + (t.muted ? ' off' : '') },
          h('button', { class: 'plink', type: 'button', title: 'Play this track', onclick: function () { A.playTrack(t.id); lastKey = ''; setTimeout(refresh, 60); } }, (t.current ? '♪ ' : '') + t.title),
          t.muted ? h('button', { class: 'btn mini', type: 'button', onclick: function () { A.unmute(t.id); lastKey = ''; refresh(); } }, 'Restore')
            : h('button', { class: 'btn mini', type: 'button', title: 'Never play this track', 'aria-label': 'Never play ' + t.title, onclick: function () { A.mute(t.id); lastKey = ''; setTimeout(refresh, 80); } }, '🚫')));
      });
    }
    var rs = A.restarts();
    E.note.textContent = (s.sceneMode === 'auto' ? 'The playlist follows the page: study on lessons, arcade in arcade games, boss in boss fights.' : 'This playlist is pinned. Choose "Follow the page" to let the page pick.') +
      (rs ? ' The app reloaded ' + rs + ' time' + (rs === 1 ? '' : 's') + ' in the last day while music was playing (iOS can do this to home-screen apps); the track resumes where it was.' : '');
    E.mtitle.textContent = s.track ? s.track.title : s.enabled ? (s.unlocked ? 'Starting…' : 'Tap anywhere to start') : 'Press play';
    E.mplay.textContent = s.playing ? '⏸' : '▶'; E.mplay.setAttribute('aria-label', s.playing ? 'Pause' : 'Play');
    updateButton(s);
  }

  function updateButton(s) {
    if (!btn) return;
    s = s || A.state();
    btn.classList.toggle('playing', s.playing);
    btn.title = s.track ? (s.playing ? 'Playing: ' : 'Paused: ') + s.track.title : 'Music player';
  }

  // The player is in one of three states: closed (just the header button), mini (a slim bar) or full. The choice is
  // remembered for next time, except that a full panel comes back as the slim bar rather than covering the page.
  function show(state, refocus) {
    if (!panel) build();
    panel.hidden = state !== 'full'; mini.hidden = state !== 'mini';
    document.body.classList.toggle('has-mini', state === 'mini');
    if (btn) btn.setAttribute('aria-expanded', state === 'full' ? 'true' : 'false');
    clearInterval(timer); timer = null;
    if (state !== 'closed') { lastKey = ''; refresh(); timer = setInterval(refresh, 500); }
    try { localStorage.setItem(KEEP, state === 'full' ? 'mini' : state); } catch (e) { /* storage may be unavailable */ }
    if (state === 'full') E.play.focus(); else if (refocus && btn) btn.focus();
  }
  function open() { show('full'); }
  function close(refocus) { if (panel && (!panel.hidden || !mini.hidden)) show('closed', refocus); }
  function state() { return !panel ? 'closed' : !panel.hidden ? 'full' : !mini.hidden ? 'mini' : 'closed'; }

  // The header button. One element, re-added each time the header is redrawn.
  function button() {
    if (!btn) {
      btn = h('button', { class: 'meter musicbtn', type: 'button', 'aria-haspopup': 'dialog', 'aria-expanded': 'false', 'aria-label': 'Music player', title: 'Music player',
        onclick: function () { show(state() === 'closed' || state() === 'mini' ? 'full' : 'closed'); } }, '🎵');
      var saved = null; try { saved = localStorage.getItem(KEEP); } catch (e) { /* storage may be unavailable */ }
      if (saved === 'mini') setTimeout(function () { show('mini'); }, 0);
      setInterval(function () { if (state() === 'closed') updateButton(); }, 1500);
    }
    return btn;
  }

  SD.player = { button: button, open: open, close: close, state: state };
})(window.SD);
