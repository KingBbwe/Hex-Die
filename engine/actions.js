/*
 * actions.js: the Action Economy as data (source: "Universal Action Economy Framework", TCoAE_Action_Economy.pdf, 2026-11-27).
 * 60 named actions: three combat phases x offensive/defensive x ten. Only effects that change a TRACKED RESOURCE are modelled
 * (resilience, disquiet, skulduggery, grace, fate, tp); everything else (knockback, advantage, damage reduction by hexagram value,
 * armor bypass...) is kept as `note` text for the table to adjudicate.
 *
 * RULINGS APPLIED (commander, 2026-11-27):
 *   - Wherever the document SPENDS Grace, the cost is Fate Points instead (Grace is a meter and is never spent: RULES_CANON section 1).
 *   - Canon dice only (d6, d8, d12, d20). Amount dice the document wrote as d4 are d6 here, d10 are d12: each mapped up to the next
 *     canon die (Defensive Chant 1d4 -> 1d6, Skyrend Strike 10d10 -> 10d12...). Change one number here to adjust.
 * NOT RULED, so left as canon: the phase check dice (d8/d10/d12-d20) and per-phase hexagram ranges are not used; every check is cast 1-64 plus
 * the character's tier die. The document's L1-L6 line-effect table is not modelled (canon damage-line DC shifts stand).
 *
 * FLAGGED INTERPRETATIONS: `when` says which outcome tier triggers an effect ('always' when the document attaches it to the action itself).
 * Where the document states a damage amount without a tier (Hoof Strike, Trample Charge...) it is taken to land on Triumph. Where it says
 * "impose Disquiet" with no amount, no effect is modelled (note only). `condition` marks Ganga-only or Doshi-only effects.
 * Resource effects on a foe or on allies are returned to the table to apply; only 'self' effects change the actor's own state.
 */
(function (root) {
  'use strict';
  var T = 'triumph', C = 'conflict', D = 'disaster', A = 'always';
  // effect(when, target, resource, dir, amount [, condition]); amount is a number or 'NdF' with F in 6,8,12,20
  function e(when, target, resource, dir, amount, condition) { var o = { when: when, target: target, resource: resource, dir: dir, amount: amount }; if (condition) o.condition = condition; return o; }
  var lose = function (when, target, resource, amount, cond) { return e(when, target, resource, 'lose', amount, cond); };
  var gain = function (when, target, resource, amount, cond) { return e(when, target, resource, 'gain', amount, cond); };
  function act(phase, side, name, effects, note) { return { phase: phase, side: side, name: name, kind: phase === 'head' ? 'instinctual' : phase === 'melee' ? 'volitional' : 'synergistic', effects: effects || [], note: note || '' }; }
  var H = 'head', M = 'melee', R = 'armed', O = 'offense', F = 'defense';

  var ACTIONS = [
    // Phase 1: Head Combat (Instinctual)
    act(H, O, 'Horn Lock', [lose(T, 'foe', 'resilience', '1d6'), lose(C, 'foe', 'resilience', 1), lose(C, 'self', 'resilience', 1), gain(D, 'self', 'disquiet', 1)], 'Opposed Hex & Die roll.'),
    act(H, O, 'Charge Rush', [gain(T, 'foe', 'disquiet', 1)], 'Force the opponent back 1d6 metres.'),
    act(H, O, 'Ancestral Taunt', [], 'Impose Disquiet on the foe (amount not given). Triumph: +2 to your next roll.'),
    act(H, O, 'Ground Stomp', [], 'Triumph: the opponent rerolls with Disadvantage.'),
    act(H, O, "Ewe's Resolve", [], 'Auto-win if Triumph and the DC are met. Legendary Feat.'),
    act(H, O, 'Headbutt Barrage', [lose(T, 'foe', 'resilience', '1d6')], 'Three rapid strikes, best 2 of 3 rounds.'),
    act(H, O, 'Primal Roar', [gain(C, 'self', 'disquiet', 1)], "Force a reroll on the opponent's next action."),
    act(H, O, 'Hexagram Surge', [], 'Add the hexagram value to Resilience loss.'),
    act(H, O, 'Lockbreaker', [lose(D, 'self', 'resilience', 2)], 'Escape grapples with Advantage.'),
    act(H, O, 'Ovine Fury', [gain(A, 'self', 'skulduggery', 5)], 'Enter Seeing Red early.'),
    act(H, F, 'Horn Guard', [], 'Reduce Resilience loss by the hexagram value.'),
    act(H, F, 'Yield Gracefully', [gain(A, 'self', 'grace', 2)], 'Concede.'),
    act(H, F, 'Ancestral Ward', [], 'Allies gain +2 to resist Disquiet.'),
    act(H, F, 'Stalwart Stance', [lose(T, 'foe', 'resilience', '1d6')], 'Ignore knockback. Triumph reflects the loss.'),
    act(H, F, 'Hexagram Shield', [], 'Use the hexagram value as damage reduction.'),
    act(H, F, 'Tactical Retreat', [lose(C, 'self', 'resilience', 1)], 'Disengage without penalty.'),
    act(H, F, 'Resilient Lock', [gain(D, 'self', 'disquiet', 1)], 'Reroll a failed Defense roll.'),
    act(H, F, 'Bleat of Unity', [lose(A, 'allies', 'skulduggery', 1)], 'Rally allies.'),
    act(H, F, 'Earthroot', [gain(T, 'self', 'grace', 1)], 'Stabilize position: immune to prone.'),
    act(H, F, 'Sacred Concession', [gain(A, 'self', 'grace', 3)], 'End combat honorably.'),
    // Phase 2: Melee Combat (Volitional)
    act(M, O, 'Hoof Strike', [lose(T, 'foe', 'resilience', '1d8')], 'Triumph also knocks the foe prone.'),
    act(M, O, 'Grapple Takedown', [lose(T, 'foe', 'resilience', '1d6')], 'Opposed roll to restrain.'),
    act(M, O, 'Precision Jab', [gain(T, 'self', 'grace', 1)], 'Bypass armor.'),
    act(M, O, 'Disarm Feint', [gain(A, 'self', 'skulduggery', 1)], 'Remove a weapon.'),
    act(M, O, 'Whirlwind Kick', [], 'Hit 2 foes. Conflict: Resilience loss reduced by 1d6.'),
    act(M, O, 'Hexagram Combo', [], 'Chain attacks using hexagram lines.'),
    act(M, O, 'Skull Bash', [], 'Add Disquiet equal to the Resilience loss dealt.'),
    act(M, O, 'Trample Charge', [lose(T, 'foe', 'resilience', '2d6')], 'Move 5m.'),
    act(M, O, 'Cornering Blow', [gain(T, 'foe', 'disquiet', 1)], 'Trap the foe against terrain.'),
    act(M, O, 'Leg Sweep', [], 'Prone foe; Advantage for allies.'),
    act(M, F, 'Dodge Roll', [], 'Avoid Resilience loss. Triumph: counterattack.'),
    act(M, F, 'Shield Block', [], 'Reduce Resilience loss by 1d8.'),
    act(M, F, 'Guardian Stance', [], 'Protect an ally within 2m. Triumph: redirect the damage to yourself.'),
    act(M, F, 'Hexagram Parry', [], 'Use the hexagram value as damage reduction.'),
    act(M, F, 'Tactical Reposition', [lose(C, 'self', 'resilience', 1)], 'Shift 3m without penalty.'),
    act(M, F, 'Defensive Chant', [lose(A, 'self', 'skulduggery', '1d6')], 'Remove Skulduggery.'),
    act(M, F, 'Brace Impact', [], 'Halve Resilience loss but lose the Minor Action.'),
    act(M, F, 'Distracting Flourish', [gain(A, 'self', 'grace', 1)], 'Draw aggro.'),
    act(M, F, 'Resilience Surge', [lose(A, 'self', 'fate', 1), gain(A, 'self', 'resilience', '1d6')], 'The document converts 1 Grace; by ruling it costs 1 Fate Point.'),
    act(M, F, 'Honorable Yield', [lose(A, 'self', 'skulduggery', 3)], 'End combat honorably.'),
    // Phase 3: Armed Combat (Synergistic)
    act(R, O, 'Skyrend Strike', [lose(A, 'foe', 'resilience', '10d12'), gain(A, 'self', 'skulduggery', 10)], 'Legendary Feat.'),
    act(R, O, 'Hexagram Shot', [], 'Triumph bypasses armor.'),
    act(R, O, 'Magical Barrage', [gain(A, 'self', 'skulduggery', 2, 'doshi')], 'Cast a spell and make a weapon attack.'),
    act(R, O, 'Thunderhoof Charge', [lose(T, 'foe', 'resilience', '3d8')], 'Trample a line of foes.'),
    act(R, O, 'Dual Wield', [], 'Attack twice. Disaster: the weapon breaks.'),
    act(R, O, 'Soulfire Blade', [], 'Add the hexagram value to Resilience loss.'),
    act(R, O, 'Aetherix Overload', [gain(D, 'self', 'skulduggery', '1d6')], 'Sacrifice the weapon for double damage.'),
    act(R, O, 'Rending Hexagram', [], 'Apply a hexagram debuff.'),
    act(R, O, 'Precision Volley', [], 'Ignore range penalties. Triumph: critical (double Resilience loss).'),
    act(R, O, 'Corruption Surge', [], 'Deal +1d12 Resilience loss per Skulduggery point held; risks Broken Honor.'),
    act(R, F, 'Ward of Grace', [gain(A, 'self', 'grace', 2, 'ganga')], 'Absorb 1d12 Resilience loss.'),
    act(R, F, 'Hexagram Barrier', [], 'Block attacks equal to the hexagram lines.'),
    act(R, F, 'Sacrificial Guard', [], "Take an ally's damage and convert it to Skulduggery."),
    act(R, F, 'Purifying Light', [lose(A, 'self', 'skulduggery', '2d6')], 'Hexagram 40.'),
    act(R, F, 'Aegis Formation', [], 'Allies gain damage reduction 5 against Resilience loss.'),
    act(R, F, 'Counterflux', [gain(A, 'self', 'skulduggery', '1d6', 'doshi')], 'Reflect spell damage.'),
    act(R, F, 'Ancestral Recall', [], "Reroll a Disaster using the hexagram's changing lines."),
    act(R, F, 'Sanctuary Veil', [lose(A, 'self', 'fate', 3)], 'Become immune to Resilience loss.'),
    act(R, F, 'Harmonic Resonance', [], 'Share with allies. The document shares Grace; by ruling it costs Fate Points (amount not given).'),
    act(R, F, 'Final Stand', [gain(A, 'self', 'skulduggery', 10)], 'Auto-succeed the Defense.')
  ].map(function (a, i) { a.id = i + 1; return a; });

  // Special states and other stated sources of Skulduggery
  var STATES = [
    { name: 'Seeing Red (offensive)', effects: [], note: '+1d12 Resilience loss but lose 1 ally.' },
    { name: 'Seeing Red (defensive)', effects: [gain(A, 'self', 'skulduggery', 5)], note: 'Ignore damage.' }
  ];
  var DISHONOR = [
    { name: 'Draw a weapon', effects: [gain(A, 'self', 'skulduggery', 1)], note: 'Stated in the document example. Skipping phases also earns Skulduggery, but no amount is given.' }
  ];
  // Fate Point interventions the document states (costs are Fate Points already)
  var FATE_INTERVENTIONS = [
    { name: 'Reroll a Disaster (Head Combat)', cost: 1 },
    { name: 'Convert an Armed Combat Disaster to Conflict', cost: 2 }
  ];

  var FACES = [6, 8, 12, 20];
  function parseAmount(a) { if (typeof a === 'number') return { n: a, faces: 0 }; var m = /^(\d+)d(\d+)$/.exec(a); return { n: +m[1], faces: +m[2] }; }
  function find(name) { for (var i = 0; i < ACTIONS.length; i++) { if (ACTIONS[i].name === name) return ACTIONS[i]; } return null; }
  function problems() {
    var out = [];
    ACTIONS.concat(STATES, DISHONOR).forEach(function (a) { a.effects.forEach(function (x) {
      var p = parseAmount(x.amount);
      if (p.faces !== 0 && FACES.indexOf(p.faces) < 0) out.push(a.name + ': non-canon die d' + p.faces);
    }); });
    return out;
  }
  var api = { ACTIONS: ACTIONS, STATES: STATES, DISHONOR: DISHONOR, FATE_INTERVENTIONS: FATE_INTERVENTIONS, FACES: FACES, parseAmount: parseAmount, find: find, problems: problems };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.AuldEweActions = api;
})(typeof self !== 'undefined' ? self : this);
