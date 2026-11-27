'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const A = require('../engine/actions.js');

test('60 actions: three phases x offense/defense x ten, unique names, kind follows phase', () => {
  assert.equal(A.ACTIONS.length, 60); assert.equal(new Set(A.ACTIONS.map(a => a.name)).size, 60);
  for (const phase of ['head', 'melee', 'armed']) for (const side of ['offense', 'defense']) assert.equal(A.ACTIONS.filter(a => a.phase === phase && a.side === side).length, 10, phase + side);
  assert.deepEqual([...new Set(A.ACTIONS.filter(a => a.phase === 'head').map(a => a.kind))], ['instinctual']);
  assert.deepEqual([...new Set(A.ACTIONS.filter(a => a.phase === 'melee').map(a => a.kind))], ['volitional']);
  assert.deepEqual([...new Set(A.ACTIONS.filter(a => a.phase === 'armed').map(a => a.kind))], ['synergistic']);
  A.ACTIONS.forEach((a, i) => assert.equal(a.id, i + 1));
});

test('canon dice only: no d2, d4 or d10 anywhere', () => { assert.deepEqual(A.problems(), []); });

test('ruling: no action spends Grace; every Grace effect is a gain, and the old Grace conversion costs a Fate Point', () => {
  A.ACTIONS.forEach(a => a.effects.filter(x => x.resource === 'grace').forEach(x => assert.equal(x.dir, 'gain', a.name)));
  const surge = A.find('Resilience Surge');
  assert.deepEqual(surge.effects.map(x => x.resource + ':' + x.dir + ':' + x.amount), ['fate:lose:1', 'resilience:gain:1d6']);
  assert.deepEqual(A.find('Sanctuary Veil').effects.map(x => x.resource + ':' + x.dir + ':' + x.amount), ['fate:lose:3']);
});

test('Skulduggery sources and sinks stated in the document are all present', () => {
  const sk = (n) => A.find(n).effects.filter(x => x.resource === 'skulduggery').map(x => x.dir + ' ' + x.amount + (x.condition ? ' (' + x.condition + ')' : '')).join(',');
  assert.equal(sk('Ovine Fury'), 'gain 5'); assert.equal(sk('Disarm Feint'), 'gain 1'); assert.equal(sk('Skyrend Strike'), 'gain 10');
  assert.equal(sk('Final Stand'), 'gain 10'); assert.equal(sk('Magical Barrage'), 'gain 2 (doshi)'); assert.equal(sk('Counterflux'), 'gain 1d6 (doshi)');
  assert.equal(sk('Aetherix Overload'), 'gain 1d6'); assert.equal(sk('Bleat of Unity'), 'lose 1'); assert.equal(sk('Defensive Chant'), 'lose 1d6');
  assert.equal(sk('Honorable Yield'), 'lose 3'); assert.equal(sk('Purifying Light'), 'lose 2d6');
  assert.equal(A.STATES[1].effects[0].amount, 5); assert.equal(A.DISHONOR[0].effects[0].amount, 1);
  assert.equal(A.find('Yield Gracefully').effects[0].amount, 2); assert.equal(A.find('Sacred Concession').effects[0].amount, 3);
});

test('every effect is well formed', () => {
  const W = ['triumph', 'conflict', 'disaster', 'always'], TG = ['self', 'foe', 'allies'], RS = ['resilience', 'disquiet', 'skulduggery', 'grace', 'fate', 'tp'];
  A.ACTIONS.forEach(a => a.effects.forEach(x => { assert.ok(W.includes(x.when) && TG.includes(x.target) && RS.includes(x.resource) && ['gain', 'lose'].includes(x.dir), a.name); assert.ok(typeof x.amount === 'number' ? x.amount > 0 : /^\d+d(6|8|12|20)$/.test(x.amount), a.name); if (x.condition) assert.ok(['ganga', 'doshi'].includes(x.condition)); }));
});
