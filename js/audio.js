// Sound: effects, an announcer, and background music. All files are in audio/ (CC0, see audio/CREDITS.md) and are part
// of the offline copy. Three switches in Settings: effects (settings.sound), announcer (settings.voice), music
// (settings.music, off until turned on). Browsers only start audio after the first tap or key press, so nothing plays
// before that.
(function (SD) {
  'use strict';
  var SFX = ['ok', 'ok2', 'bad', 'coin', 'tick', 'hit', 'boom', 'laser', 'levelup', 'win', 'lose', 'rankup', 'quest'];
  var VOICE = ['prepare_yourself', 'fight', 'combo', 'multi_kill', 'combo_breaker', 'flawless_victory', 'winner', 'you_lose',
    'final_round', 'game_over', 'level_up', 'new_highscore', 'objective_achieved', 'congratulations', 'hurry_up', 'time_over',
    'power_up', 'mission_completed'];
  var MUSIC = { study: 'audio/music/study.mp3', arcade: 'audio/music/arcade.mp3', boss: 'audio/music/boss.mp3' };
  // Literal paths, so tools/check-sw.mjs puts them in the offline copy.
  var FILES = [
    'audio/sfx/ok.mp3', 'audio/sfx/ok2.mp3', 'audio/sfx/bad.mp3', 'audio/sfx/coin.mp3', 'audio/sfx/tick.mp3', 'audio/sfx/hit.mp3',
    'audio/sfx/boom.mp3', 'audio/sfx/laser.mp3', 'audio/sfx/levelup.mp3', 'audio/sfx/win.mp3', 'audio/sfx/lose.mp3',
    'audio/sfx/rankup.mp3', 'audio/sfx/quest.mp3',
    'audio/voice/prepare_yourself.mp3', 'audio/voice/fight.mp3', 'audio/voice/combo.mp3', 'audio/voice/multi_kill.mp3',
    'audio/voice/combo_breaker.mp3', 'audio/voice/flawless_victory.mp3', 'audio/voice/winner.mp3', 'audio/voice/you_lose.mp3',
    'audio/voice/final_round.mp3', 'audio/voice/game_over.mp3', 'audio/voice/level_up.mp3', 'audio/voice/new_highscore.mp3',
    'audio/voice/objective_achieved.mp3', 'audio/voice/congratulations.mp3', 'audio/voice/hurry_up.mp3',
    'audio/voice/time_over.mp3', 'audio/voice/power_up.mp3', 'audio/voice/mission_completed.mp3'
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

  // Sound effect by name (see SFX).
  function play(name) {
    if (set().sound === false || SFX.indexOf(name) < 0) return;
    playFile(path('sfx', name), 0.55);
  }

  // Announcer lines play one at a time; a line asked for while another plays waits, and a queue of more than two is
  // trimmed so callouts stay tied to what just happened. The same line is not repeated within 4 seconds.
  var queue = [], speaking = false, lastSaid = {};
  function say(line) {
    if (set().voice === false || VOICE.indexOf(line) < 0) return;
    var now = Date.now();
    if (lastSaid[line] && now - lastSaid[line] < 4000) return;
    lastSaid[line] = now;
    queue.push(line); if (queue.length > 2) queue.shift();
    next();
  }
  function next() {
    if (speaking || !queue.length) return;
    speaking = true;
    duck(true);
    playFile(path('voice', queue.shift()), 0.9).then(function (d) {
      setTimeout(function () { speaking = false; if (!queue.length) duck(false); next(); }, Math.max(150, d * 1000 + 120));
    });
  }

  // Background music: one looping track per scene, faded in and out.
  var el = null, scene = null, fadeTimer = null, MUSIC_VOL = 0.28;
  function vol() { return MUSIC_VOL * (typeof set().musicVol === 'number' ? set().musicVol : 1); }
  function fadeTo(target, then) {
    clearInterval(fadeTimer);
    if (!el) return then && then();
    var a = el;
    fadeTimer = setInterval(function () {
      var d = target - a.volume;
      if (Math.abs(d) < 0.02) { a.volume = target; clearInterval(fadeTimer); if (then) then(); return; }
      a.volume = Math.max(0, Math.min(1, a.volume + Math.sign(d) * 0.02));
    }, 40);
  }
  function duck(on) { if (el && !el.paused) fadeTo(on ? vol() * 0.35 : vol()); }
  function music(name) {
    scene = name;
    var want = set().music && unlocked && MUSIC[name] ? MUSIC[name] : null;
    if (el && el.dataset.src === want) { if (want && el.paused) el.play().catch(function () {}); return; }
    var old = el;
    if (old) fadeTo(0, function () { old.pause(); });
    el = null;
    if (!want) return;
    el = new Audio(want); el.dataset.src = want; el.loop = true; el.volume = 0;
    el.play().then(function () { fadeTo(vol()); }, function () {});
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
  document.addEventListener('visibilitychange', function () { if (el) { if (document.hidden) el.pause(); else if (set().music) el.play().catch(function () {}); } });

  SD.audio = { playing: function () { return !!el && !el.paused; }, play: play, say: say, music: music, refresh: function () { if (el) el.volume = vol(); music(scene); }, SFX: SFX, VOICE: VOICE, FILES: FILES };
})(window.SD);
