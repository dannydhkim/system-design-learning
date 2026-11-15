// Sound: effects, an announcer, and background music. All files are in audio/ (CC0, see audio/CREDITS.md) and are part
// of the offline copy. Settings: effects (settings.sound), announcer (settings.voice, settings.voiceKind), music
// (settings.music, off until turned on; settings.musicVol). Browsers only start audio after the first tap or key press, so nothing plays
// before that.
(function (SD) {
  'use strict';
  var SFX = ['ok', 'ok2', 'bad', 'coin', 'tick', 'hit', 'boom', 'laser', 'levelup', 'win', 'lose', 'rankup', 'quest'];
  // Announcer lines (two voices, chosen in Settings). Kept to big moments: a level, a quest, a boss result, a high score.
  var VOICE = ['go', 'ready', 'final_round', 'mission_completed', 'mission_failed', 'congratulations', 'new_highscore', 'game_over', 'time_over', 'hurry_up', 'level_up', 'objective_achieved'];
  // A playlist per scene. Tracks play in shuffled order, one after another, so no single loop repeats.
  var MUSIC = { study: 5, arcade: 4, boss: 3 };
  // One-shot jingles. Only one may play at a time (see play): several firing together was the overlap at a boss result.
  var JINGLE = { levelup: 1, win: 1, lose: 1, rankup: 1, quest: 1, boom: 1 };
  // Literal paths, so tools/check-sw.mjs puts them in the offline copy.
  var FILES = [
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
    'audio/music/study1.mp3', 'audio/music/study2.mp3', 'audio/music/study3.mp3', 'audio/music/study4.mp3',
    'audio/music/study5.mp3', 'audio/music/arcade1.mp3', 'audio/music/arcade2.mp3', 'audio/music/arcade3.mp3',
    'audio/music/arcade4.mp3', 'audio/music/boss1.mp3', 'audio/music/boss2.mp3', 'audio/music/boss3.mp3'
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

  // Announcer lines play one at a time, after any jingle that is sounding. Only the latest waiting line is kept, and
  // the same line is not repeated within 8 seconds.
  var waiting = null, speaking = false, lastSaid = {};
  function say(line) {
    if (set().voice === false || VOICE.indexOf(line) < 0) return;
    var now = Date.now();
    if (lastSaid[line] && now - lastSaid[line] < 8000) return;
    lastSaid[line] = now;
    waiting = line;
    next();
  }
  function next() {
    if (speaking || !waiting) return;
    var wait = jingleUntil - Date.now();
    if (wait > 0) { speaking = true; setTimeout(function () { speaking = false; next(); }, wait + 60); return; }
    var line = waiting; waiting = null; speaking = true;
    duck(true);
    playFile(path('voice/' + (set().voiceKind === 'male' ? 'male' : 'female'), line), 0.8).then(function (d) {
      setTimeout(function () { speaking = false; if (!waiting) duck(false); next(); }, Math.max(150, d * 1000 + 150));
    });
  }

  // Background music. Each track has its own <audio> element and its own fade, so a fade-out is never cancelled by the
  // next track's fade-in (that bug let two tracks play at once). When a track ends, the next in the scene's shuffled
  // playlist starts.
  var cur = null, scene = null, order = [], MUSIC_VOL = 0.26;
  function vol() { return MUSIC_VOL * (typeof set().musicVol === 'number' ? set().musicVol : 1); }
  function fade(a, target, then) {
    clearInterval(a._fade);
    a._fade = setInterval(function () {
      var d = target - a.volume;
      if (Math.abs(d) < 0.02) { a.volume = Math.max(0, target); clearInterval(a._fade); if (then) then(); return; }
      a.volume = Math.max(0, Math.min(1, a.volume + Math.sign(d) * 0.02));
    }, 40);
  }
  function duck(on) { if (cur && !cur.paused) fade(cur, on ? vol() * 0.35 : vol()); }
  function stop() {
    var old = cur; cur = null;
    if (old) { old.onended = null; fade(old, 0, function () { old.pause(); old.src = ''; }); }
  }
  function startNext() {
    if (!order.length) {
      order = SD.shuffle(Array.from({ length: MUSIC[scene] }, function (_, k) { return k + 1; }));
      if (cur && order.length > 1 && cur._n === order[0]) order.push(order.shift());   // do not repeat the track just heard
    }
    var n = order.shift(), a = new Audio('audio/music/' + scene + n + '.mp3');
    a._n = n; a._scene = scene; a.volume = 0;
    a.onended = function () { if (cur === a) { cur = null; startNext(); } };
    stop(); cur = a;
    a.play().then(function () { if (cur === a) fade(a, vol()); }, function () { if (cur === a) cur = null; });
  }
  function music(name) {
    if (name) { if (name !== scene) order = []; scene = name; }
    var on = set().music && unlocked && MUSIC[scene];
    if (!on) return stop();
    if (cur && cur._scene === scene) { if (cur.paused) cur.play().catch(function () {}); return; }
    startNext();
  }

  // The first tap or key press unlocks audio; the music for the current scene starts then.
  function unlock() {
    if (unlocked) return;
    unlocked = true; context();
    document.removeEventListener('pointerdown', unlock, true); document.removeEventListener('keydown', unlock, true);
    music(scene);
  }
  document.addEventListener('pointerdown', unlock, true);
  document.addEventListener('keydown', unlock, true);
  // Pause the music while the app is in the background.
  document.addEventListener('visibilitychange', function () { if (cur) { if (document.hidden) cur.pause(); else if (set().music) cur.play().catch(function () {}); } });

  SD.audio = {
    play: play, say: say, music: music, skip: function () { if (cur) startNext(); },
    refresh: function () { if (cur) fade(cur, vol()); music(); },
    playing: function () { return !!cur && !cur.paused; },
    SFX: SFX, VOICE: VOICE, FILES: FILES
  };
})(window.SD);
