const test = require('node:test'), assert = require('node:assert/strict');
const H = require('../engine/hexdie.js'), CH = require('../engine/character.js');
const fixture = require('./fixtures/character.example.json');

test('the vendored Character bands equal the engine bands (guards the two repos drifting apart)', () => {
  assert.deepEqual(CH.BANDS.map(b => [b.from, b.to, b.mode]), H.CONFIG.bands.map(b => [b.from, b.to, b.mode]));
  for (let dc = 1; dc <= 64; dc++) assert.equal(CH.modeForDC(dc), H.modeForDC(dc), 'DC ' + dc);
});

test('the example Character from identify-eweself validates and every DC mode agrees with the engine', () => {
  const v = CH.validateCharacter(fixture); assert.deepEqual(v.errors, []); assert.ok(v.ok);
  for (const d of CH.DOMAINS) assert.equal(fixture.dc[d].mode, H.modeForDC(fixture.dc[d].value), d);
});

test('every DC of a Character can be resolved by the engine in the mode the Character states', () => {
  for (const d of CH.DOMAINS) {
    const dc = fixture.dc[d].value, r = H.resolveCheck({ cast: 30, roll: 3, die: fixture.dieTier, mod: 0, dc, pullRoll: 6 });
    assert.equal(r.mode, fixture.dc[d].mode, d);
  }
});

test('a Character with a stale or wrong mode is rejected', () => {
  const bad = JSON.parse(JSON.stringify(fixture)); bad.dc.physical.mode = bad.dc.physical.mode === 'over' ? 'under' : 'over';
  assert.ok(!CH.validateCharacter(bad).ok);
});
