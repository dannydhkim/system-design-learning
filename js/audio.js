// Sound: effects, an announcer, and background music. All files are in audio/ (CC0, see audio/CREDITS.md) and are part
// of the offline copy. Settings: effects (settings.sound), announcer (settings.voice, settings.voiceKind), music
// (settings.music, off until turned on; settings.musicVol). Browsers only start audio after the first tap or key press, so nothing plays
// before that.
(function (SD) {
  'use strict';
  var SFX = ['ok', 'ok2', 'bad', 'coin', 'tick', 'hit', 'boom', 'laser', 'levelup', 'win', 'lose', 'rankup', 'quest'];
  // Announcer. Callers name a moment (SD.audio.say('streak5')); the style chosen in Settings decides the line. The
  // arcade style is a fighting-game announcer and also calls answer streaks; the two calm voices skip those. The arcade
  // recordings are the Kenney voices lowered in pitch with a short arena echo (see audio/CREDITS.md).
  var CALM = { bossStart: 'ready', arcadeStart: 'go', finalPhase: 'final_round', perfect: 'congratulations', bossWin: 'mission_completed',
    bossLose: 'mission_failed', gameOver: 'game_over', timeUp: 'time_over', highScore: 'new_highscore', levelUp: 'level_up',
    quest: 'objective_achieved', promoted: 'congratulations', hurry: 'hurry_up' };
  var LINES = {
    arcade: { bossStart: 'prepare_yourself', arcadeStart: 'fight', finalPhase: 'final_round', streak5: 'combo',
      streakBroken: 'combo_breaker', perfect: 'flawless_victory', bossWin: 'winner', bossLose: 'you_lose', gameOver: 'game_over',
      timeUp: 'time_over', highScore: 'new_highscore', levelUp: 'level_up', quest: 'objective_achieved', promoted: 'congratulations', hurry: 'hurry_up' },
    female: CALM, male: CALM
  };
  function style() { var k = set().voiceKind; return LINES[k] ? k : 'arcade'; }
  // A playlist per scene. Tracks play in shuffled order, one after another, so no single loop repeats.
  var MUSIC = { study: 9, arcade: 9, boss: 6 };
  var TITLES = {'study': ['Determined Pursuit', 'Fantasy Orchestral Theme', 'Covert Operations', 'Cyberpunk Moonlight Sonata', 'Atmospheric puzzles', 'Liquid Flame', 'Cyber March', 'All The Fight Left', 'Black Diamond'], 'arcade': ['Let the Games Begin', 'Battle Theme A', 'Hunter-class Lifeform', 'Action Theme Song', 'Drum and bass', 'Final Hour', 'Lucid Trigger', 'Lunar Arrow', 'Chase'], 'boss': ['Boss Battle #2 (Symphonic Metal)', 'Epic Boss Battle', 'Battle RPG Theme', 'Android Assault', 'Cyborg', 'Finale']};
  // One-shot jingles. Only one may play at a time (see play): several firing together was the overlap at a boss result.
  var JINGLE = { levelup: 1, win: 1, lose: 1, rankup: 1, quest: 1, boom: 1 };
  // Literal paths, so tools/check-sw.mjs puts them in the offline copy.
  var FILES = [
    'audio/music/study1.mp3',
    'audio/music/study2.mp3',
    'audio/music/study3.mp3',
    'audio/music/study4.mp3',
    'audio/music/study5.mp3',
    'audio/music/study6.mp3',
    'audio/music/study7.mp3',
    'audio/music/study8.mp3',
    'audio/music/study9.mp3',
    'audio/music/arcade1.mp3',
    'audio/music/arcade2.mp3',
    'audio/music/arcade3.mp3',
    'audio/music/arcade4.mp3',
    'audio/music/arcade5.mp3',
    'audio/music/arcade6.mp3',
    'audio/music/arcade7.mp3',
    'audio/music/arcade8.mp3',
    'audio/music/arcade9.mp3',
    'audio/music/boss1.mp3',
    'audio/music/boss2.mp3',
    'audio/music/boss3.mp3',
    'audio/music/boss4.mp3',
    'audio/music/boss5.mp3',
    'audio/music/boss6.mp3',
    'audio/voice/arcade/prepare_yourself.mp3',
    'audio/voice/arcade/fight.mp3',
    'audio/voice/arcade/combo.mp3',
    'audio/voice/arcade/combo_breaker.mp3',
    'audio/voice/arcade/flawless_victory.mp3',
    'audio/voice/arcade/winner.mp3',
    'audio/voice/arcade/you_lose.mp3',
    'audio/voice/arcade/final_round.mp3',
    'audio/voice/arcade/game_over.mp3',
    'audio/voice/arcade/level_up.mp3',
    'audio/voice/arcade/new_highscore.mp3',
    'audio/voice/arcade/objective_achieved.mp3',
    'audio/voice/arcade/congratulations.mp3',
    'audio/voice/arcade/hurry_up.mp3',
    'audio/voice/arcade/time_over.mp3',
    'audio/sfx/ok.mp3', 'audio/sfx/ok2.mp3', 'audio/sfx/bad.mp3', 'audio/sfx/coin.mp3', 'audio/sfx/tick.mp3',
    'audio/sfx/hit.mp3', 'audio/sfx/boom.mp3', 'audio/sfx/laser.mp3', 'audio/sfx/levelup.mp3', 'audio/sfx/win.mp3',
    'audio/sfx/lose.mp3', 'audio/sfx/rankup.mp3', 'audio/sfx/quest.mp3', 'audio/voice/female/go.mp3',
    'audio/voice/female/ready.mp3', 'audio/voice/female/final_round.mp3', 'audio/voice/female/mission_completed.mp3',
    'audio/voice/female/mission_failed.mp3', 'audio/voice/female/congratulations.mp3',
    'audio/voice/female/new_highscore.mp3', 'audio/voice/female/game_over.mp3', 'audio/voice/female/time_over.mp3',
    'audio/voice/female/hurry_up.mp3', 'audio/voice/female/level_up.mp3',
    'audio/voice/female/objective_achieved.mp3', 'audio/voice/male/go.mp3', 'audio/voice/male/ready.mp3',
    'audio/voice/male/final_round.mp3', 'audio/voice/male/mission_completed.mp3',
    'audio/voice/male/mission_failed.mp3', 'audio/voice/male/congratulations.mp3',
    'audio/voice/male/new_highscore.mp3', 'audio/voice/male/game_over.mp3', 'audio/voice/male/time_over.mp3',
    'audio/voice/male/hurry_up.mp3', 'audio/voice/male/level_up.mp3', 'audio/voice/male/objective_achieved.mp3',
    ];
  function path(kind, name) { return 'audio/' + kind + '/' + name + '.mp3'; }
  function set() { return (SD.state && SD.state.settings) || {}; }

  var ctx = null, buffers = {}, unlocked = false;
  function context() {
    if (!ctx) { var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; ctx = new AC(); }
    if (ctx.state === 'suspended') ctx.resume().catch(function () {});
    return ctx;
  }
  function buffer(file) {
    if (!buffers[file]) buffers[file] = fetch(file).then(function (r) { if (!r.ok) throw new Error(file); return r.arrayBuffer(); })
      .then(function (b) { return new Promise(function (ok, bad) { context().decodeAudioData(b, ok, bad); }); })
      .catch(function (e) { delete buffers[file]; throw e; });
    return buffers[file];
  }
  function playFile(file, gain) {
    var c = context();
    if (!c || !unlocked) return Promise.resolve(0);
    return buffer(file).then(function (buf) {
      var s = c.createBufferSource(), g = c.createGain();
      g.gain.value = gain; s.buffer = buf; s.connect(g); g.connect(c.destination); s.start();
      return buf.duration;
    }, function () { return 0; });
  }

  // Sound effect by name (see SFX). Two limits keep effects from piling up: the same effect is not restarted within
  // 90 ms, and while a jingle plays (about a second) any other jingle is dropped.
  var lastPlay = {}, jingleUntil = 0;
  function play(name) {
    if (set().sound === false || SFX.indexOf(name) < 0) return;
    var now = Date.now();
    if (lastPlay[name] && now - lastPlay[name] < 90) return;
    if (JINGLE[name]) { if (now < jingleUntil) return; jingleUntil = now + 1100; }
    lastPlay[name] = now;
    playFile(path('sfx', name), JINGLE[name] ? 0.5 : 0.4);
  }

  // The rubber duck's quack, synthesised (no file): two short nasal blips, each a sawtooth whose pitch falls,
  // shaped by a band-pass filter. The second is a little higher, which keeps it cute rather than loud.
  var lastQuack = 0;
  function quack() {
    var c = context();
    if (!c || !unlocked || set().sound === false || Date.now() - lastQuack < 400) return;
    lastQuack = Date.now();
    var t0 = c.currentTime + 0.02;
    [[0, 880, 520], [0.17, 990, 600]].forEach(function (q) {
      var t = t0 + q[0], o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(q[1], t); o.frequency.exponentialRampToValueAtTime(q[2], t + 0.12);
      f.type = 'bandpass'; f.frequency.setValueAtTime(1500, t); f.Q.value = 4;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
      o.connect(f); f.connect(g); g.connect(c.destination);
      o.start(t); o.stop(t + 0.15);
    });
  }

  // Announcer lines play one at a time, after any jingle that is sounding. Only the latest waiting line is kept, and
  // the same line is not repeated within 8 seconds.
  var waiting = null, speaking = false, lastSaid = {};
  function say(line) {
    line = LINES[style()][line];
    if (set().voice === false || !line) return;
    var now = Date.now();
    if (lastSaid[line] && now - lastSaid[line] < 8000) return;
    lastSaid[line] = now;
    waiting = line;
    sayNext();
  }
  function sayNext() {
    if (speaking || !waiting) return;
    var wait = jingleUntil - Date.now();
    if (wait > 0) { speaking = true; setTimeout(function () { speaking = false; sayNext(); }, wait + 60); return; }
    var line = waiting; waiting = null; speaking = true;
    duck(true);
    playFile(path('voice/' + style(), line), 0.8).then(function (d) {
      setTimeout(function () { speaking = false; if (!waiting) duck(false); sayNext(); }, Math.max(150, d * 1000 + 150));
    });
  }

  // Background music, driven by a small player model (see js/player.js for the controls).
  //   · Each track has its own <audio> element and fade, so a fade-out is never cancelled by the next track's fade-in.
  //   · Play/pause is settings.music: pausing keeps the element, so playing again resumes at the same second.
  //   · Playlists: study, arcade and boss. "Follow the page" (the default) picks one by where you are; a playlist can
  //     also be pinned (settings.musicScene).
  //   · Order: shuffled, in order, or repeating one track (settings.musicLoop). Previous goes back through what played.
  var cur = null, routeScene = 'study', queue = [], queueScene = null, history = [], blocked = false, MUSIC_VOL = 0.26;
  var SCENE_NAMES = { study: 'Study', arcade: 'Arcade', boss: 'Boss fight' };
  function vol() { return MUSIC_VOL * (typeof set().musicVol === 'number' ? set().musicVol : 1); }
  function fade(a, target, then) {
    clearInterval(a._fade);
    a._fade = setInterval(function () {
      var d = target - a.volume;
      if (Math.abs(d) < 0.02) { a.volume = Math.max(0, target); clearInterval(a._fade); if (then) then(); return; }
      a.volume = Math.max(0, Math.min(1, a.volume + Math.sign(d) * 0.02));
    }, 40);
  }
  function duck(on) { if (cur && !cur.paused && !cur._pausing) fade(cur, on ? vol() * 0.35 : vol()); }
  function sceneMode() { var m = set().musicScene; return MUSIC[m] ? m : 'auto'; }
  function effScene() { var m = sceneMode(); return m === 'auto' ? (MUSIC[routeScene] ? routeScene : 'study') : m; }
  function loopMode() { var m = set().musicLoop; return m === 'order' || m === 'one' ? m : 'shuffle'; }
  function isMuted(sc, n) { return !!(set().mutedTracks || {})[sc + n]; }
  function playable(sc) { var r = []; for (var n = 1; n <= MUSIC[sc]; n++) if (!isMuted(sc, n)) r.push(n); return r; }
  function save() { try { SD.save(); } catch (e) { /* state may not be ready */ } }
  // The next track of scene sc after track `from` (or null): in order, or from a shuffled queue that skips turned-off tracks.
  function pick(sc, from, mode) {
    var ok = playable(sc);
    if (!ok.length) return null;
    if (mode === 'order') { var later = ok.filter(function (n) { return n > (from || 0); }); return later.length ? later[0] : ok[0]; }
    if (queueScene !== sc) { queue = []; queueScene = sc; }
    queue = queue.filter(function (n) { return ok.indexOf(n) >= 0; });
    if (!queue.length) { queue = SD.shuffle(ok.slice()); if (ok.length > 1 && queue[0] === from) queue.push(queue.shift()); }
    return queue.shift();
  }
  function startTrack(sc, n, noHistory) {
    var old = cur;
    if (old && !noHistory) { history.push(old._scene + old._n); if (history.length > 40) history.shift(); }
    var a = new Audio('audio/music/' + sc + n + '.mp3');
    a._n = n; a._scene = sc; a.volume = 0; a.loop = loopMode() === 'one';
    a.onended = function () {
      if (cur !== a) return;
      var nn = pick(a._scene, a._n, loopMode() === 'order' ? 'order' : 'shuffle');
      if (nn == null) { cur = null; return; }
      startTrack(a._scene, nn, false);
    };
    if (old) { old.onended = null; fade(old, 0, function () { old.pause(); old.src = ''; }); }
    cur = a; blocked = false;
    a.play().then(function () { if (cur === a) fade(a, vol()); }, function () { if (cur === a) blocked = true; });
    mediaSession(a);
  }
  function pauseCur() {
    var a = cur; if (!a || a.paused) return;
    a._pausing = true;
    fade(a, 0, function () { if (cur === a || a._pausing) a.pause(); a._pausing = false; });
  }
  function resumeCur() {
    var a = cur; if (!a) return;
    a._pausing = false; blocked = false;
    var go = function () { a.play().then(function () { if (cur === a) fade(a, vol()); }, function () { if (cur === a) blocked = true; }); };
    if (a.paused) { a.volume = 0; go(); } else fade(a, vol());
  }
  // Make what is playing match the settings and the page: nothing, or a track from the right playlist.
  function reconcile() {
    var want = !!(set().music && unlocked), sc = effScene();
    if (!want) { if (cur) pauseCur(); return; }
    if (cur && cur._scene === sc) { if (cur.paused || cur._pausing) resumeCur(); return; }
    var n = pick(sc, null, loopMode() === 'order' ? 'order' : 'shuffle');
    if (n == null) { if (cur) pauseCur(); return; }
    startTrack(sc, n, false);
  }
  function music(name) {
    if (name) { if (name !== routeScene) queue = []; routeScene = name; }
    reconcile();
  }
  function setEnabled(on) { set().music = !!on; save(); reconcile(); }
  function playing() { return !!cur && !cur.paused && !cur._pausing; }
  function next() {
    var sc = cur ? cur._scene : effScene(), n = pick(sc, cur ? cur._n : null, loopMode() === 'order' ? 'order' : 'shuffle');
    if (n == null) return;
    set().music = true; save(); startTrack(sc, n, false);
  }
  function prev() {
    if (cur && cur.currentTime > 3) { cur.currentTime = 0; return; }   // like most players: a restart first
    var sc = effScene();
    while (history.length) {
      var m = /^([a-z]+)(\d+)$/.exec(history.pop());
      if (m && m[1] === sc && !isMuted(m[1], +m[2])) { set().music = true; save(); startTrack(m[1], +m[2], true); return; }
    }
    if (cur) cur.currentTime = 0;
  }
  function mediaSession(a) {
    if (!('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({ title: TITLES[a._scene][a._n - 1], artist: 'System Design Quest', album: SCENE_NAMES[a._scene] });
      var acts = { play: function () { setEnabled(true); }, pause: function () { setEnabled(false); }, nexttrack: next, previoustrack: prev };
      Object.keys(acts).forEach(function (k) { try { navigator.mediaSession.setActionHandler(k, acts[k]); } catch (e) { /* unsupported action */ } });
    } catch (e) { /* media session is optional */ }
  }

  // The first tap or key press unlocks audio. A tap on the music controls only unlocks: the control then decides.
  function unlock(e) {
    if (unlocked) return;
    unlocked = true; context();
    document.removeEventListener('pointerdown', unlock, true); document.removeEventListener('keydown', unlock, true);
    if (e && e.target && e.target.closest && e.target.closest('.player, .musicbtn')) return;
    reconcile();
  }
  document.addEventListener('pointerdown', unlock, true);
  document.addEventListener('keydown', unlock, true);
  // Pause the music while the app is in the background, and pick it up again when it comes back.
  document.addEventListener('visibilitychange', function () {
    if (!cur) return;
    if (document.hidden) { if (!cur.paused) { cur._hiddenPause = true; cur.pause(); } }
    else if (cur._hiddenPause) { cur._hiddenPause = false; if (set().music) resumeCur(); }
  });

  SD.audio = {
    play: play, say: say, music: music, quack: quack,
    // Player controls.
    toggle: function () { setEnabled(!playing()); },
    pause: function () { setEnabled(false); }, resume: function () { setEnabled(true); },
    next: next, prev: prev, skip: next,
    seek: function (frac) { if (cur && isFinite(cur.duration) && cur.duration > 0) cur.currentTime = Math.max(0, Math.min(1, frac)) * cur.duration; },
    setLoop: function (m) { set().musicLoop = (m === 'order' || m === 'one') ? m : 'shuffle'; save(); queue = []; if (cur) cur.loop = loopMode() === 'one'; },
    cycleLoop: function () { var m = loopMode(); SD.audio.setLoop(m === 'shuffle' ? 'order' : m === 'order' ? 'one' : 'shuffle'); },
    setScene: function (m) { set().musicScene = MUSIC[m] ? m : 'auto'; save(); queue = []; reconcile(); },
    playTrack: function (id) {
      var m = /^([a-z]+)(\d+)$/.exec(id); if (!m || !MUSIC[m[1]] || +m[2] < 1 || +m[2] > MUSIC[m[1]]) return;
      if (!(sceneMode() === 'auto' && m[1] === routeScene)) set().musicScene = m[1];   // keep the choice from being replaced at once
      set().music = true; save(); startTrack(m[1], +m[2], false);
    },
    mute: function (id) { var st = set(); st.mutedTracks = st.mutedTracks || {}; st.mutedTracks[id] = 1; save(); queue = []; if (cur && cur._scene + cur._n === id) next(); },
    unmute: function (id) { var st = set(); if (st.mutedTracks) delete st.mutedTracks[id]; save(); queue = []; },
    unmuteAll: function () { set().mutedTracks = {}; save(); queue = []; reconcile(); },
    refresh: function () { if (cur && playing()) fade(cur, vol()); reconcile(); },
    // What the player shows.
    state: function () {
      var st = set(), sc = effScene(), off = st.mutedTracks || {};
      return { enabled: !!st.music, unlocked: unlocked, playing: playing(), blocked: blocked,
        track: cur ? { id: cur._scene + cur._n, scene: cur._scene, n: cur._n, title: TITLES[cur._scene][cur._n - 1] } : null,
        time: cur ? cur.currentTime : 0, duration: cur && isFinite(cur.duration) ? cur.duration : 0,
        loop: loopMode(), sceneMode: sceneMode(), scene: sc, routeScene: routeScene, volume: typeof st.musicVol === 'number' ? st.musicVol : 1,
        tracks: TITLES[sc].map(function (title, k) { var id = sc + (k + 1); return { id: id, title: title, muted: !!off[id], current: !!cur && cur._scene === sc && cur._n === k + 1 }; }) };
    },
    now: function () { var s = SD.audio.state(); return s.track; },
    titleOf: function (id) { var m = /^([a-z]+)(\d+)$/.exec(id); return m && TITLES[m[1]] ? TITLES[m[1]][m[2] - 1] : id; },
    playing: playing,
    SFX: SFX, LINES: LINES, FILES: FILES
  };
})(window.SD);
