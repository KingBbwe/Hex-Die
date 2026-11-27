// Run:  node --test tests/
const test = require('node:test');
const assert = require('node:assert/strict');
const H = require('../engine/hexdie.js');

const clone = (o) => JSON.parse(JSON.stringify(o));
const pct = (x) => Math.round(x * 1000) / 10;
const DICE = [6, 8, 12, 20];
const P = (dc, die, extra, cfg) => H.successProbability(Object.assign({ dc: dc, die: die }, extra || {}), cfg);

function mulberry(seed) { return function () { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

test('outcome tiers match the canon tables exactly, per die', () => {
  const want = { 6: [1/6, 2/6, 3/6], 8: [2/8, 3/8, 3/8], 12: [3/12, 5/12, 4/12], 20: [5/20, 6/20, 9/20] };
  for (const d of DICE) {
    const c = { T: 0, C: 0, D: 0 };
    for (let r = 1; r <= d; r++) c[H.tierFromRoll(d, r)]++;
    assert.deepEqual([c.T / d, c.C / d, c.D / d], want[d], 'd' + d);
  }
});

test('d100 is not canon: unsupported die throws', () => {
  assert.throws(() => H.tierFromRoll(100, 50), /Unsupported die/);
});

test('Over/Under mode is fixed by DC band, including every boundary', () => {
  const exp = (dc) => (dc <= 16 || (dc >= 33 && dc <= 48)) ? 'over' : 'under';
  for (let dc = 1; dc <= 64; dc++) assert.equal(H.modeForDC(dc), exp(dc), 'DC ' + dc);
  assert.equal(H.modeForDC(48), 'over');   // the old Cyber branch wrongly sent 48 to Under
  assert.equal(H.modeForDC(49), 'under');
  assert.throws(() => H.modeForDC(65));
});

test('reference probabilities reproduce the ratified analysis to the decimal (d6)', () => {
  const ref = { 1: 98.4, 10: 89.6, 15: 72.7, 16: 63.0, 17: 46.4, 24: 41.1, 32: 54.2, 33: 54.2, 48: 46.4, 49: 63.0, 64: 98.4 };
  for (const dc in ref) assert.equal(pct(P(+dc, 6)), ref[dc], 'DC ' + dc);
});

test('G2b-1: a positive modifier never lowers success in either mode (every DC, every die)', () => {
  for (const d of DICE) for (let dc = 1; dc <= 64; dc++)
    assert.ok(P(dc, d, { mod: 3 }) >= P(dc, d, { mod: -3 }), `d${d} DC${dc}`);
});

test('G2b-1: levelling up never lowers success (every DC, d6 -> d8 -> d12 -> d20)', () => {
  for (let dc = 1; dc <= 64; dc++) for (let i = 1; i < DICE.length; i++)
    assert.ok(P(dc, DICE[i]) >= P(dc, DICE[i - 1]) - 1e-12, `DC${dc} d${DICE[i - 1]}->d${DICE[i]}`);
});

test('G2b-1: Over and Under bands average out equally (perfect duality)', () => {
  for (const d of [6, 20]) {
    let o = 0, no = 0, u = 0, nu = 0;
    for (let dc = 1; dc <= 64; dc++) { const p = P(dc, d); if (H.modeForDC(dc) === 'over') { o += p; no++; } else { u += p; nu++; } }
    assert.ok(Math.abs(o / no - u / nu) < 1e-9, 'd' + d);
  }
});

test('G2b-2: Ovine Pull shrinks the seam cliffs far below canon-as-ratified', () => {
  for (const d of [6, 20]) {
    const seam = (a, b) => Math.abs(P(a, d) - P(b, d)) * 100;
    assert.ok(seam(16, 17) < 18, `16/17 d${d}: ${seam(16, 17)}`);
    assert.ok(seam(48, 49) < 18, `48/49 d${d}: ${seam(48, 49)}`);
    assert.ok(seam(32, 33) < 1e-9, '32/33 d' + d);
  }
  const canon = clone(H.CONFIG); canon.signedAgency = false; canon.pull.enabled = false; canon.bolt.enabled = false;
  assert.ok(Math.abs(P(16, 6, {}, canon) - P(17, 6, {}, canon)) * 100 > 60, 'canon cliff was 61 pts');
});

test('G2b-2: Pull only touches Twilight DCs; flips on 1-2 adjacent, 1 one step out', () => {
  const tw = []; for (let dc = 1; dc <= 64; dc++) if (H.twilight(dc)) tw.push(dc);
  assert.deepEqual(tw, [15, 16, 17, 18, 31, 32, 33, 34, 47, 48, 49, 50]);
  const base = { cast: 20, roll: 4, die: 6, mod: 0 };
  assert.equal(H.resolveCheck(Object.assign({ dc: 17, pullRoll: 2 }, base)).pulled, true);
  assert.equal(H.resolveCheck(Object.assign({ dc: 17, pullRoll: 3 }, base)).pulled, false);
  assert.equal(H.resolveCheck(Object.assign({ dc: 18, pullRoll: 1 }, base)).pulled, true);
  assert.equal(H.resolveCheck(Object.assign({ dc: 18, pullRoll: 2 }, base)).pulled, false);
  assert.equal(H.resolveCheck(Object.assign({ dc: 24, pullRoll: 1 }, base)).pulled, false);
});

test('G2b-3: Bolt reverses agency on a natural 1 at full die size; FP substitution masters it', () => {
  const r = H.resolveCheck({ cast: 12, roll: 1, die: 6, mod: 0, dc: 10, pullRoll: 6 });
  assert.equal(r.bolted, true); assert.equal(r.pass, false);                 // 12 + (-6) = 6 < 10
  const off = clone(H.CONFIG); off.bolt.enabled = false;
  assert.equal(H.resolveCheck({ cast: 12, roll: 1, die: 6, mod: 0, dc: 10, pullRoll: 6 }, off).pass, true); // 12+1=13 >= 10
  const rev = H.revealLine(r, 5);
  assert.equal(rev.applied, true); assert.equal(rev.result.bolted, false); assert.equal(rev.result.pass, true);
});

test('step-down is explicit and never helps the player in either mode', () => {
  assert.equal(H.effectiveDie(20, false).die, 20);
  assert.deepEqual(H.effectiveDie(20, true), { die: 12, penalty: 10 });
  assert.deepEqual(H.effectiveDie(12, true), { die: 8, penalty: 8 });
  for (const d of DICE) for (let dc = 1; dc <= 64; dc++)
    assert.ok(P(dc, d, { stepDown: true }) <= P(dc, d) + 1e-12, `d${d} DC${dc}`);
  const rng = mulberry(7); let max = 0;
  for (let i = 0; i < 2000; i++) max = Math.max(max, H.rollCheck(rng, { die: 20, dc: 30, mod: 0, stepDown: true }).roll);
  assert.ok(max <= 12, 'stepped-down d20 never exceeds 12'); max = 0;
  for (let i = 0; i < 2000; i++) max = Math.max(max, H.rollCheck(rng, { die: 20, dc: 30, mod: 0 }).roll);
  assert.equal(max, 20, 'unstepped d20 reaches 20');
});

test('line reveal only ever improves a tier, and only when the line beats the roll', () => {
  const rng = mulberry(11);
  for (let i = 0; i < 3000; i++) {
    const die = DICE[i % 4], r = H.rollCheck(rng, { die: die, dc: 1 + (i % 64), mod: 0 });
    for (let line = 1; line <= 6; line++) {
      const v = H.revealLine(r, line), rank = { D: 0, C: 1, T: 2 };
      assert.ok(rank[v.result.tier] >= rank[r.tier], 'never worsens');
      if (v.applied) assert.ok(line > r.roll && rank[v.result.tier] > rank[r.tier]);
    }
  }
  // documented example: d12 roll 4 (Disaster), line 5 -> Conflict ; line 6 -> Triumph
  const d = H.resolveCheck({ cast: 30, roll: 4, die: 12, dc: 20, pullRoll: 6 });
  assert.equal(d.tier, 'D'); assert.equal(H.revealLine(d, 5).result.tier, 'C'); assert.equal(H.revealLine(d, 6).result.tier, 'T');
  assert.equal(H.revealLine(d, 4).applied, false, 'equal line leaves the roll standing');
});

test('Fate: 2 FP spent = +1 Skulduggery (cumulative floor); Disaster mitigation capped at 2 per scene', () => {
  let f = H.newFate(5);
  f = H.spendFate(f, 1); assert.equal(H.skulduggeryFromFate(f), 0);
  f = H.spendFate(f, 1); assert.equal(H.skulduggeryFromFate(f), 1);
  f = H.spendFate(f, 1); assert.equal(H.skulduggeryFromFate(f), 1);   // 3 spent -> still 1
  assert.throws(() => H.spendFate(H.newFate(0), 1));
  let fate = H.newFate(10), res = H.resolveCheck({ cast: 30, roll: 2, die: 20, dc: 40, pullRoll: 6 });
  const a = H.mitigateDisaster(res, fate, 1); assert.equal(a.used, 1);
  const b = H.mitigateDisaster(a.result, a.fate, 5); assert.equal(b.used, 1);       // only 1 of 2 left
  const c = H.mitigateDisaster(b.result, b.fate, 1); assert.equal(c.used, 0);       // cap reached
  assert.equal(c.fate.sceneMitigation, 2);
  assert.equal(H.mitigateDisaster(H.resolveCheck({ cast: 30, roll: 18, die: 20, dc: 40, pullRoll: 6 }), fate, 2).used, 0, 'not a Disaster');
  assert.equal(H.newScene(c.fate).sceneMitigation, 0);
});

test('advantage keeps the better line for the actor: higher in Over, lower in Under (and reverse for disadvantage)', () => {
  assert.equal(H.keepLine([2, 6], 'over', 'adv'), 6);
  assert.equal(H.keepLine([2, 6], 'over', 'dis'), 2);
  assert.equal(H.keepLine([2, 6], 'under', 'adv'), 2);
  assert.equal(H.keepLine([2, 6], 'under', 'dis'), 6);
  assert.equal(H.keepLine([4], 'over', null), 4);
});

test('damage shifts DCs by threshold; Over rises, Under falls, and the MODE never flips', () => {
  assert.equal(H.adjustDC(42, 'over', { 5: 2 }).dc, 43);          // 2xL5 => +1
  assert.equal(H.adjustDC(42, 'over', { 5: 4 }).dc, 44);          // 4xL5 => +2
  assert.equal(H.adjustDC(30, 'under', { 6: 1 }).dc, 29);         // 1xL6 => -1
  assert.equal(H.adjustDC(30, 'under', { 1: 5 }).shift, 0);       // 5xL1 < 6xL1
  assert.equal(H.adjustDC(30, 'under', { 1: 6 }).shift, 1);
  const r = H.resolveCheck({ cast: 5, roll: 3, die: 6, dc: 17, modeDc: 16, pullRoll: 6 });   // DC shifted to 17, base 16
  assert.equal(r.mode, 'over', 'mode follows the BASE dc');
});

test('THE JOIN: all six cells exist; pass/fail and tier are independent axes', () => {
  for (const k of ['pass:T', 'pass:C', 'pass:D', 'fail:T', 'fail:C', 'fail:D']) assert.ok(H.CONFIG.join[k].name && H.CONFIG.join[k].rule, k);
  const rng = mulberry(3), seen = {};
  for (let i = 0; i < 6000; i++) seen[H.rollCheck(rng, { die: 20, dc: 1 + (i % 64), mod: 0 }).joinKey] = 1;
  assert.deepEqual(Object.keys(seen).sort(), ['fail:C', 'fail:D', 'fail:T', 'pass:C', 'pass:D', 'pass:T']);
});

test('rollCheck is deterministic for a seed and rejects impossible rolls', () => {
  const a = H.rollCheck(mulberry(99), { die: 12, dc: 20, mod: 1 }), b = H.rollCheck(mulberry(99), { die: 12, dc: 20, mod: 1 });
  assert.deepEqual([a.cast, a.roll, a.pass], [b.cast, b.roll, b.pass]);
  assert.throws(() => H.resolveCheck({ cast: 1, roll: 7, die: 6, dc: 10, pullRoll: 1 }));
});

// ── VACUITY TRAP: prove the property tests above can actually fail ──
test('VACUITY: canon-as-ratified (no Signed Agency) FAILS the modifier and level-up properties', () => {
  const canon = clone(H.CONFIG); canon.signedAgency = false; canon.pull.enabled = false; canon.bolt.enabled = false;
  let modViolations = 0, lvlViolations = 0;
  for (let dc = 1; dc <= 64; dc++) {
    if (P(dc, 6, { mod: 3 }, canon) < P(dc, 6, { mod: -3 }, canon)) modViolations++;
    if (P(dc, 20, {}, canon) < P(dc, 6, {}, canon) - 1e-12) lvlViolations++;
  }
  assert.ok(modViolations > 20, 'expected the +mod harm in Under bands, got ' + modViolations);
  assert.ok(lvlViolations > 20, 'expected the level-up demotion in Under bands, got ' + lvlViolations);
});

test('step-down moves the CAST against the player: down in Roll-Over, up in Roll-Under, clamped 1..64', () => {
  const o = H.resolveCheck({ cast: 30, roll: 4, die: 12, mod: 0, dc: 10, stepDown: true });   // d12 -> d8, R = 8; DC 10 is Roll-Over
  assert.equal(o.mode, 'over'); assert.equal(o.castAdj, 22); assert.equal(o.cast, 30); assert.equal(o.die, 8);
  const u = H.resolveCheck({ cast: 30, roll: 4, die: 12, mod: 0, dc: 20, stepDown: true });   // DC 20 is Roll-Under
  assert.equal(u.mode, 'under'); assert.equal(u.castAdj, 38);
  assert.equal(H.resolveCheck({ cast: 3, roll: 2, die: 20, mod: 0, dc: 5, stepDown: true }).castAdj, 1);    // clamp low
  assert.equal(H.resolveCheck({ cast: 62, roll: 2, die: 20, mod: 0, dc: 20, stepDown: true }).castAdj, 64); // clamp high
  assert.equal(H.resolveCheck({ cast: 30, roll: 4, die: 12, mod: 0, dc: 10 }).castAdj, 30);                 // no step-down: unchanged
});
test('step-down: the modifier is left alone (difficulty lives in the body, not the die)', () => {
  const a = H.resolveCheck({ cast: 40, roll: 5, die: 8, mod: 3, dc: 20, stepDown: true });
  const b = H.resolveCheck({ cast: 40, roll: 5, die: 8, mod: 3, dc: 20 });
  assert.equal(a.castAdj - b.castAdj, 4);    // d8 -> d6, R = 4, Roll-Under: cast raised by 4
});
test('step-down never helps, in any mode, for any cast, roll or die (exhaustive)', () => {
  for (const die of [6, 8, 12, 20]) for (const dc of [1, 10, 16, 17, 25, 32, 33, 40, 48, 49, 60, 64]) for (let cast = 1; cast <= 64; cast += 3)
    for (let roll = 1; roll <= 6; roll++) for (const pull of [3, 1]) {
      const off = H.resolveCheck({ cast, roll, die, mod: 0, dc, pullRoll: pull }), on = H.resolveCheck({ cast, roll, die, mod: 0, dc, stepDown: true, pullRoll: pull });
      if (on.pass && !off.pass) assert.fail(`step-down helped: d${die} DC${dc} cast${cast} roll${roll}`);
    }
});
