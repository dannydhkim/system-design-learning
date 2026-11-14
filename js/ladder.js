// Ranked ladder: rating points (RP) won and lost on every answer, with ranks named after the scale a system reaches.
// Each tier has three divisions (III, II, I) of 100 RP; the top tier has no ceiling. RP can fall, but never below the
// start of the tier already reached (a division can be lost, a tier cannot). State: SD.state.ladder = { rp, peak }.
// Across devices the copy saved last wins, and the peak keeps the larger value (SD.merge in core.js).
(function (SD) {
  'use strict';
  var TIERS = [
    { name: 'Localhost', icon: '💻' },
    { name: 'Single Server', icon: '🖥️' },
    { name: 'Replicated', icon: '🪞' },
    { name: 'Sharded', icon: '🧩' },
    { name: 'Multi-Region', icon: '🌍' },
    { name: 'Planet-Scale', icon: '🪐' }
  ];
  var DIV = 100, PER_TIER = 3 * DIV, TOP = (TIERS.length - 1) * PER_TIER;
  // What each event is worth. A flashcard graded Good or Easy counts as right, Again or Hard as wrong (SD.hit).
  var RP = { right: 5, wrong: -4, streakEvery: 5, streakBonus: 2, bossWin: 30, bossLoss: -10, highScore: 10 };

  function info(rp) {
    rp = Math.max(0, rp || 0);
    if (rp >= TOP) return { tier: TIERS.length - 1, div: 0, name: TIERS[TIERS.length - 1].name, icon: TIERS[TIERS.length - 1].icon, label: TIERS[TIERS.length - 1].name, into: rp - TOP, span: 0, pct: 1, rp: rp };
    var t = Math.floor(rp / PER_TIER), d = Math.floor((rp - t * PER_TIER) / DIV);
    var roman = ['III', 'II', 'I'][d];
    return { tier: t, div: d, name: TIERS[t].name, icon: TIERS[t].icon, label: TIERS[t].name + ' ' + roman, into: rp % DIV, span: DIV, pct: (rp % DIV) / DIV, rp: rp };
  }
  function state() {
    var s = SD.state;
    if (!s.ladder) s.ladder = { rp: 0, peak: 0 };
    return s.ladder;
  }
  // Adds (or takes) RP and announces a promotion or demotion. Returns the change actually applied.
  function add(delta) {
    var L = state(), before = info(L.rp), floor = before.tier * PER_TIER;
    var rp = Math.max(floor, L.rp + delta), applied = rp - L.rp;
    L.rp = rp; L.peak = Math.max(L.peak, rp);
    var after = info(rp);
    if (after.tier > before.tier) {
      SD.toast(after.icon + ' Promoted to ' + after.label + '!', 'gold'); SD.confetti();
      if (SD.audio) { SD.audio.play('rankup'); SD.audio.say('congratulations'); }
    } else if (after.tier === before.tier && after.div > before.div) {
      SD.toast(after.icon + ' Rank up: ' + after.label, 'gold');
      if (SD.audio) SD.audio.play('rankup');
    } else if (after.div < before.div) {
      SD.toast('Demoted to ' + after.label + '. Win it back.');
      if (SD.audio) SD.audio.play('lose');
    }
    return applied;
  }

  SD.ladder = { TIERS: TIERS, DIV: DIV, PER_TIER: PER_TIER, RP: RP, info: info, now: function () { return info(state().rp); }, peak: function () { return info(state().peak); }, add: add };
})(window.SD);
