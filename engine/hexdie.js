// hexdie.js — Harmonized Hex & Die resolution engine for The Chronicles of Auld Ewe.
// Built to RULES_CANON.md (rulings 1–5 + G2b: Signed Agency, Ovine Pull, Bolt).
//
// Pure functions: no DOM, no network, no hidden randomness (pass an rng or explicit rolls).
// Classic-script UMD: works from file:// in a browser (window.HexDie) and in Node (require).
//
// PRINCIPLE: the hexagram cast is FATE (ovine, neutral). The die and modifiers are AGENCY
// (human). Agency always strives toward success; fate does not care which way it falls.
(function (root) {
  'use strict';

  // ───────────────────────────── CONFIG (all rules are data) ─────────────────────────────
  var CONFIG = {
    // Outcome Tier from the die roll ALONE (canon ruling 3). Minimum roll for each tier.
    // d6 T 6 | C 5–4 | D 3–1 ; d8 T 8–7 | C 6–4 ; d12 T 12–10 | C 9–5 ; d20 T 20–16 | C 15–10.
    tiers: { 6: { T: 6, C: 4 }, 8: { T: 7, C: 4 }, 12: { T: 10, C: 5 }, 20: { T: 16, C: 10 } },

    // Roll-Over / Roll-Under fixed by Personal-DC band (canon ruling 4). Never GM choice.
    bands: [
      { from: 1,  to: 16, mode: 'over'  },
      { from: 17, to: 32, mode: 'under' },
      { from: 33, to: 48, mode: 'over'  },
      { from: 49, to: 64, mode: 'under' }
    ],

    // G2b-1 Signed Agency. Over:  Cast + Die + Mod >= DC.  Under: Cast <= DC + Die + Mod.
    signedAgency: true,

    // G2b-2 Ovine Pull: Twilight DCs (within `width` of an internal band edge) roll a d6.
    // distance from the edge -> d6 faces that flip the check into the neighbouring band's mode.
    pull: { enabled: true, flipOn: { 1: [1, 2], 2: [1] }, resistableWithFatePoint: false },

    // G2b-3 The Bolt: a natural 1 on the agency die counts as -die (the ram bolts).
    bolt: { enabled: true },

    // Step-down (canon ruling 5): GM-invoked ONLY. die -> [new die, penalty].
    // The penalty R moves the HEXAGRAM CAST against the player (difficulty stays in the body):
    // Roll-Over lowers the cast by R, Roll-Under raises it by R, clamped to 1..64. The die is untouched apart from its size.
    // Identical in Roll-Over; in Roll-Under, lowering the cast would HELP the player.
    stepDown: { 6: [6, 2], 8: [6, 4], 12: [8, 8], 20: [12, 10] },

    // Fate Points (canon ruling 1): every 2 FP spent = +1 Skulduggery (cumulative, floor).
    fate: { skulduggeryPer: 2, disasterMitigationCapPerScene: 2 },

    // Hexagram-line value (1–6) -> tier it can lift an outcome to. Matches every worked example
    // in the design documents (line 6 -> Triumph; 4–5 -> Conflict; 1–3 -> Disaster).
    lineTier: { 1: 'D', 2: 'D', 3: 'D', 4: 'C', 5: 'C', 6: 'T' },

    // Personal-DC adjustment from accumulated damage: N lines of level L => +-1 DC.
    // 6xL1 / 5xL2 / 4xL3 / 3xL4 / 2xL5 / 1xL6.
    dcDamageThreshold: { 1: 6, 2: 5, 3: 4, 4: 3, 5: 2, 6: 1 },

    // THE JOIN (proposed fixed table): DC pass/fail  x  Outcome Tier.
    // Rule of thumb: the PASS decides WHAT happens; the TIER decides what it COSTS and how it FEELS.
    join: {
      'pass:T': { name: 'Green Pasture',
        rule: 'Clean success. No complication. On an attack, you may Force a Line (canon).' },
      'pass:C': { name: 'Hard-Won Ground',
        rule: 'Success, with a complication: the GM adds a cost, delay or debate (see the Conflict narrative).' },
      'pass:D': { name: "The Wolf's Bargain",
        rule: 'Success, but fate carried a faltering hand: the GM names a serious price (a debt, a wound, a compromise). Fate Points may mitigate the Disaster (cap 2 per scene).' },
      'fail:T': { name: 'The Noble Stumble',
        rule: 'Failure, but the attempt was true: no penalty and you learn something (a clue or an opening). Your next attempt at this goal gains +1 (once).' },
      'fail:C': { name: 'Slipped Hold',
        rule: 'Failure; the situation holds. You may try again at a price (time, or 1 Fate Point), but no damage or lasting harm.' },
      'fail:D': { name: 'The Cliff Edge',
        rule: 'Failure, and a consequence lands (a damage line in combat; otherwise a hard move). The GM may offer a shortcut: success at the cost of +1 Skulduggery.' }
    }
  };

  var TIER_RANK = { D: 0, C: 1, T: 2 };
  var TIER_NAME = { T: 'Triumph', C: 'Conflict', D: 'Disaster' };

  // ───────────────────────────── helpers ─────────────────────────────
  function randint(rng, n) { return Math.floor(rng() * n) + 1; }

  function bandIndex(dc, cfg) {
    cfg = cfg || CONFIG;
    for (var i = 0; i < cfg.bands.length; i++) if (dc >= cfg.bands[i].from && dc <= cfg.bands[i].to) return i;
    throw new RangeError('Personal DC out of range 1-64: ' + dc);
  }

  function modeForDC(dc, cfg) { cfg = cfg || CONFIG; return cfg.bands[bandIndex(dc, cfg)].mode; }

  // Returns {distance, neighbourMode} for a Twilight DC, otherwise null.
  function twilight(dc, cfg) {
    cfg = cfg || CONFIG;
    var i = bandIndex(dc, cfg), b = cfg.bands[i], max = 0, k;
    for (k in cfg.pull.flipOn) max = Math.max(max, +k);
    var toTop = b.to - dc + 1, toBottom = dc - b.from + 1;
    if (i < cfg.bands.length - 1 && toTop <= max) return { distance: toTop, neighbourMode: cfg.bands[i + 1].mode };
    if (i > 0 && toBottom <= max) return { distance: toBottom, neighbourMode: cfg.bands[i - 1].mode };
    return null;
  }

  function tierFromRoll(die, roll, cfg) {
    var t = (cfg || CONFIG).tiers[die];
    if (!t) throw new RangeError('Unsupported die: d' + die + ' (canon dice are d6, d8, d12, d20)');
    return roll >= t.T ? 'T' : (roll >= t.C ? 'C' : 'D');
  }

  // Step-down is explicit. Returns {die, penalty}.
  function effectiveDie(die, stepDown, cfg) {
    cfg = cfg || CONFIG;
    if (!stepDown) return { die: die, penalty: 0 };
    var s = cfg.stepDown[die];
    if (!s) throw new RangeError('No step-down defined for d' + die);
    return { die: s[0], penalty: s[1] };
  }

  function joinCell(pass, tier, cfg) {
    return (cfg || CONFIG).join[(pass ? 'pass' : 'fail') + ':' + tier];
  }

  // ───────────────────────────── the check ─────────────────────────────
  // input: cast(1-64) roll(1..effective die) die(declared) mod dc [modeDc] [stepDown]
  //        [pullRoll(1-6)] [resistPull]
  // `modeDc` = the DC used to pick the band/mode; defaults to dc. Pass the character's BASE DC
  // when `dc` has been shifted by damage, so damage never flips a character's mode.
  function resolveCheck(input, cfg) {
    cfg = cfg || CONFIG;
    var eff = effectiveDie(input.die, !!input.stepDown, cfg);
    var roll = input.roll;
    if (!(roll >= 1 && roll <= eff.die)) throw new RangeError('roll ' + roll + ' not on a d' + eff.die);
    var dc = input.dc, modeDc = input.modeDc == null ? dc : input.modeDc;
    var mode = modeForDC(modeDc, cfg), pulled = false, tw = null;

    if (cfg.pull.enabled) {
      tw = twilight(modeDc, cfg);
      if (tw) {
        var faces = cfg.pull.flipOn[tw.distance] || [];
        if (faces.indexOf(input.pullRoll) !== -1) {
          var resisted = cfg.pull.resistableWithFatePoint && input.resistPull;
          if (!resisted) { mode = tw.neighbourMode; pulled = true; }
        }
      }
    }

    var bolted = !!(cfg.bolt.enabled && roll === 1);
    var push = bolted ? -eff.die : roll;
    var mod = input.mod || 0;
    var cast = input.cast, pass;
    // Step-down: shift the cast against the player, in the direction of the mode actually in force (after any Pull).
    var castAdj = mode === 'over' ? Math.max(1, cast - eff.penalty) : Math.min(64, cast + eff.penalty);
    cast = castAdj;
    if (cfg.signedAgency) pass = mode === 'over' ? cast + push + mod >= dc : cast <= dc + push + mod;
    else { var total = cast + push + mod; pass = mode === 'over' ? total >= dc : total <= dc; }

    var tier = tierFromRoll(eff.die, roll, cfg), cell = joinCell(pass, tier, cfg);
    return { pass: pass, tier: tier, tierName: TIER_NAME[tier], mode: mode, pulled: pulled,
             twilight: !!tw, bolted: bolted, cast: input.cast, castAdj: castAdj, roll: roll, die: eff.die, declaredDie: input.die,
             stepDownUsed: !!input.stepDown, stepDownPenalty: eff.penalty,
             join: cell, joinKey: (pass ? 'pass' : 'fail') + ':' + tier, input: input };
  }

  // Convenience: do the dice too. rng() must return a float in [0,1).
  function rollCheck(rng, input, cfg) {
    var eff = effectiveDie(input.die, !!input.stepDown, cfg);
    var roll = {}; for (var k in input) roll[k] = input[k];
    roll.cast = randint(rng, 64); roll.roll = randint(rng, eff.die); roll.pullRoll = randint(rng, 6);
    return resolveCheck(roll, cfg);
  }

  // ───────────────────────────── Fate Points (canon ruling 1) ─────────────────────────────
  function newFate(points) { return { fp: points || 0, spent: 0, sceneMitigation: 0 }; }
  function skulduggeryFromFate(f, cfg) { return Math.floor(f.spent / (cfg || CONFIG).fate.skulduggeryPer); }
  function spendFate(f, n) {
    n = n || 1;
    if (f.fp < n) throw new RangeError('Not enough Fate Points');
    return { fp: f.fp - n, spent: f.spent + n, sceneMitigation: f.sceneMitigation };
  }
  function newScene(f) { return { fp: f.fp, spent: f.spent, sceneMitigation: 0 }; }

  // Reveal a hexagram line (1-6): substitute the die result ONLY if it improves the tier AND the
  // line exceeds the roll. A natural-1 bolt is mastered when substituted (volition over instinct).
  function revealLine(result, line, cfg) {
    cfg = cfg || CONFIG;
    var lt = cfg.lineTier[line];
    if (!lt) throw new RangeError('line must be 1-6');
    if (!(line > result.roll) || TIER_RANK[lt] <= TIER_RANK[result.tier]) return { result: result, applied: false };
    var re = resolveCheck(withRoll(result.input, line, result.die), cfg);
    re.tier = lt; re.tierName = TIER_NAME[lt]; re.join = joinCell(re.pass, lt, cfg);
    re.joinKey = (re.pass ? 'pass' : 'fail') + ':' + lt; re.revealedLine = line;
    return { result: re, applied: true };
  }

  // +1 per FP to a DISASTER roll, up to 2 per scene. Returns {result, fate, used}.
  function mitigateDisaster(result, fate, points, cfg) {
    cfg = cfg || CONFIG;
    var cap = cfg.fate.disasterMitigationCapPerScene;
    var n = Math.min(points || 1, cap - fate.sceneMitigation, fate.fp);
    if (result.tier !== 'D' || n <= 0) return { result: result, fate: fate, used: 0 };
    var f = spendFate(fate, n); f.sceneMitigation = fate.sceneMitigation + n;
    var re = resolveCheck(withRoll(result.input, Math.min(result.die, result.roll + n), result.die), cfg);
    return { result: re, fate: f, used: n };
  }

  function withRoll(input, roll, effDie) {
    var o = {}; for (var k in input) o[k] = input[k];
    o.roll = roll; return o;
  }

  // ───────────────────────────── damage lines (canon ruling 3) ─────────────────────────────
  // Baseline: one d6 line. Advantage/disadvantage: roll 2d6, keep the better/worse for the actor,
  // where "better" = higher in Roll-Over domains and lower in Roll-Under domains.
  function keepLine(dice, mode, advantage) {
    if (dice.length === 1 || !advantage) return dice[0];
    var hi = Math.max.apply(null, dice), lo = Math.min.apply(null, dice);
    var keepHigh = (mode === 'over') === (advantage === 'adv');
    return keepHigh ? hi : lo;
  }
  function rollDamageLine(rng, mode, advantage) {
    var dice = advantage ? [randint(rng, 6), randint(rng, 6)] : [randint(rng, 6)];
    return { dice: dice, line: keepLine(dice, mode, advantage) };
  }

  // counts: {1:n1,...,6:n6} of damage lines suffered. Over DCs rise; Under DCs fall.
  // The MODE never changes (it is fixed by the base DC); only the number does.
  function adjustDC(baseDc, mode, counts, cfg) {
    cfg = cfg || CONFIG;
    var shift = 0, L;
    for (L = 1; L <= 6; L++) shift += Math.floor(((counts && counts[L]) || 0) / cfg.dcDamageThreshold[L]);
    var dc = mode === 'over' ? baseDc + shift : baseDc - shift;
    return { dc: Math.max(1, Math.min(64, dc)), shift: shift };
  }

  // ───────────────────────────── analysis ─────────────────────────────
  // Exact success probability by enumeration (every cast x die face x Pull face).
  function successProbability(p, cfg) {
    cfg = cfg || CONFIG;
    var eff = effectiveDie(p.die, !!p.stepDown, cfg), ok = 0, n = 0, cast, roll, pull;
    var pulls = cfg.pull.enabled && twilight(p.modeDc == null ? p.dc : p.modeDc, cfg) ? [1, 2, 3, 4, 5, 6] : [6];
    for (cast = 1; cast <= 64; cast++) for (roll = 1; roll <= eff.die; roll++) for (pull = 0; pull < pulls.length; pull++) {
      n++;
      if (resolveCheck({ cast: cast, roll: roll, die: p.die, mod: p.mod || 0, dc: p.dc, modeDc: p.modeDc,
                         stepDown: p.stepDown, pullRoll: pulls[pull] }, cfg).pass) ok++;
    }
    return ok / n;
  }

  var api = { CONFIG: CONFIG, TIER_NAME: TIER_NAME, randint: randint, modeForDC: modeForDC, twilight: twilight,
              tierFromRoll: tierFromRoll, effectiveDie: effectiveDie, joinCell: joinCell,
              resolveCheck: resolveCheck, rollCheck: rollCheck,
              newFate: newFate, spendFate: spendFate, newScene: newScene, skulduggeryFromFate: skulduggeryFromFate,
              revealLine: revealLine, mitigateDisaster: mitigateDisaster,
              keepLine: keepLine, rollDamageLine: rollDamageLine, adjustDC: adjustDC,
              successProbability: successProbability };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HexDie = api;
})(typeof window !== 'undefined' ? window : this);
