// The hexagram line table (engine/narratives.js "lookup") must be the King Wen sequence, bottom line first.
const test = require('node:test'), assert = require('node:assert');
const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'engine', 'narratives.js'), 'utf8');
const block = k => { const i = src.indexOf('"' + k + '"'); return JSON.parse(src.slice(src.indexOf('{', i), src.indexOf('}', i) + 1)); };
const L = block('lookup'), names = block('names');
const T = { Qian: '111', Zhen: '100', Kan: '010', Gen: '001', Kun: '000', Xun: '011', Li: '101', Dui: '110' };
const hex = (lower, upper) => T[lower] + T[upper];

test('64 entries, six lines each, all different', () => {
  for (let n = 1; n <= 64; n++) assert.match(L[n], /^[01]{6}$/, 'hexagram ' + n);
  assert.strictEqual(new Set(Object.values(L)).size, 64);
});
test('known hexagrams (lower trigram, upper trigram)', () => {
  const cases = { 1: ['Qian', 'Qian'], 2: ['Kun', 'Kun'], 3: ['Zhen', 'Kan'], 4: ['Kan', 'Gen'], 11: ['Qian', 'Kun'], 12: ['Kun', 'Qian'],
    24: ['Zhen', 'Kun'], 29: ['Kan', 'Kan'], 30: ['Li', 'Li'], 51: ['Zhen', 'Zhen'], 52: ['Gen', 'Gen'], 57: ['Xun', 'Xun'], 58: ['Dui', 'Dui'],
    63: ['Li', 'Kan'], 64: ['Kan', 'Li'], 43: ['Qian', 'Dui'], 49: ['Li', 'Dui'] };
  for (const [n, [lo, up]] of Object.entries(cases)) assert.strictEqual(L[n], hex(lo, up), names[n] + ' (' + n + ')');
});
test('King Wen pairs: each even hexagram is its odd partner turned over, or its complement when symmetric', () => {
  for (let n = 1; n <= 63; n += 2) {
    const a = L[n], b = L[n + 1], inv = [...a].reverse().join(''), comp = [...a].map(c => (c === '1' ? '0' : '1')).join('');
    assert.ok((a !== inv && b === inv) || (a === inv && b === comp), 'pair ' + n + '/' + (n + 1));
  }
});
