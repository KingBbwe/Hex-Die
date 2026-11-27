// End-to-end page test. Needs jsdom: npm i -D jsdom. Offline stylesheets/config.local.js are expected to fail to load.
const { JSDOM, VirtualConsole } = require('jsdom');
const file = require('path').join(__dirname, '..', 'index.html');
const errors = []; const checks = [];
const ok = (name, cond, extra) => { checks.push([cond ? 'PASS' : 'FAIL', name, extra || '']); };
function load(pre, url) {
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => { if (!/config\.local\.js|Could not load script|Could not load link/.test(String(e.message))) errors.push('jsdomError: ' + e.message); });
  vc.on('error', m => errors.push('console.error: ' + m));
  return JSDOM.fromFile(file, Object.assign(url ? { url } : {}, { runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      w.confirm = () => true; w.alert = m => { (w.__alerts = w.__alerts || []).push(m); };
      w.crypto = require('crypto').webcrypto; w.__fetches = [];
      const mem = {}; Object.defineProperty(w, 'localStorage', { value: { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); } } });
      w.fetch = (u, o) => { w.__fetches.push({ u, o }); return Promise.resolve({ ok: true, json: async () => ({}) }); };
      pre && pre(w);
    } })).then(d => new Promise(r => d.window.addEventListener('load', () => setTimeout(() => r(d.window), 80))));
}
(async () => {
  // ---- 1. statistical run: 500 rolls with reveals / mitigation / wounds
  let w = await load(); let $ = id => w.document.getElementById(id);
  const cells = new Set(); let pull = 0, bolt = 0, up = 0, legend = 0;
  for (let i = 0; i < 500; i++) {
    $('dc').value = 1 + Math.floor(Math.random() * 64); $('dieType').value = [6, 8, 12, 20][i % 4];
    $('stepDownToggle').checked = i % 7 === 0; $('modifier').value = (i % 5) - 2;
    $(['personalMode', 'generalMode', 'actionMode'][i % 3]).click();
    if (i % 50 === 0) $('newSceneBtn').click();
    if ($('fatePoints').value < 5 && i % 3 === 0) w.addFatePoint();
    $('rollButton').click();
    const t = $('result').querySelector('h3').textContent; cells.add(t.split(' — ')[0]);
    const txt = $('result').textContent; if (/Ovine Pull/.test(txt)) pull++; if (/The Bolt/.test(txt)) bolt++; if (/Legendary Feat/.test(txt)) legend++;
    if (i % 4 === 0 && !$('oraclizeBtn').disabled) { $('oraclizeBtn').click(); if (/tier rises/.test($('result').textContent)) up++; }
    if (i % 6 === 0 && !$('mitigateBtn').disabled) $('mitigateBtn').click();
    if (i % 40 === 0) $('dmgBtn').click();
  }
  ok('all six join cells appear', cells.size === 6, [...cells].join(' | '));
  ok('Pull, Bolt, tier-rise and Legendary all observed', pull && bolt && up && legend, `pull ${pull} bolt ${bolt} up ${up} legend ${legend}`);
  ok('Fate Points stay within 0..5', +$('fatePoints').value >= 0 && +$('fatePoints').value <= 5, $('fatePoints').value);
  $('dc').value = ''; $('rollButton').click();
  ok('empty DC rejected', /1 to 64/.test($('result').textContent));
  ok('d100 option removed', ![...$('dieType').options].some(o => o.value === '100'));
  ok('no secrets in page', !/\d{8,}:[A-Za-z0-9_-]{30,}/.test(w.document.documentElement.outerHTML) && !/1002185533073/.test(w.document.documentElement.outerHTML));
  ok('no fetch without config', w.__fetches.length === 0, String(w.__fetches.length));

  // ---- 2. Telegram only when configured; plain text; no Markdown parse mode
  w = await load(x => { x.TELEGRAM_BOT_TOKEN = 'TESTTOKEN'; x.TELEGRAM_CHAT_ID = '-1009999999999'; }); $ = id => w.document.getElementById(id);
  $('dc').value = 20; $('rollButton').click();
  const f = w.__fetches.find(x => /Harmonized/.test(x.o.body)); const body = f && JSON.parse(f.o.body);
  ok('Telegram posts to bot URL with configured chat', f && f.u === 'https://api.telegram.org/botTESTTOKEN/sendMessage' && body.chat_id === '-1009999999999', f && f.u);
  ok('Telegram body is plain text (no parse_mode)', body && !('parse_mode' in body) && /Harmonized Hex & Die/.test(body.text));

  // ---- 3. GM code works across devices (fresh browser has no shared storage)
  w = await load(); $ = id => w.document.getElementById(id);
  $('groupName').value = 'Ewe Crew ✨'; $('chatId').value = '-1001234567890'; w.setupNewGameGroup();
  const code = $('gmCodeText').textContent; ok('GM code generated', /^GM_/.test(code), code);
  $('chatId').value = 'nonsense'; w.setupNewGameGroup(); ok('bad chat id rejected', (w.__alerts || []).some(a => /does not look like/.test(a)));
  let w2 = await load(x => { x.TELEGRAM_BOT_TOKEN = 'T2'; x.TELEGRAM_CHAT_ID = '-1000000000000'; });
  w2.document.getElementById('gmCode').value = code; w2.document.getElementById('playerName').value = 'Bleat'; w2.joinGameGroup();
  ok('second device joins with the code', (w2.__alerts || []).some(a => /Ewe Crew/.test(a)), (w2.__alerts || []).join('|'));
  w2.document.getElementById('dc').value = 10; w2.document.getElementById('rollButton').click();
  const f2 = JSON.parse(w2.__fetches.find(x => /Harmonized/.test(x.o.body)).o.body);
  ok('joined player\'s rolls go to the GM\'s chat, tagged with their name', f2.chat_id === '-1001234567890' && /Bleat/.test(f2.text));
  w2.document.getElementById('gmCode').value = 'GM_garbage'; w2.joinGameGroup(); ok('garbage GM code rejected', (w2.__alerts || []).some(a => /Invalid GM code/.test(a)));

  // ---- 4. Fate Point persistence: legacy shape + daily regen with cap
  w = await load(x => x.localStorage.setItem('auldEweFatePoints', JSON.stringify({ points: 2, timestamp: Date.now() - 25 * 3600e3 })));
  ok('legacy FP shape migrates; +3 daily regen capped at 5', w.document.getElementById('fatePoints').value === '5', w.document.getElementById('fatePoints').value);
  w = await load(x => x.localStorage.setItem('auldEweFatePoints', JSON.stringify({ points: 2, timestamp: Date.now() - 3600e3 })));
  ok('no regen inside 24h', w.document.getElementById('fatePoints').value === '2', w.document.getElementById('fatePoints').value);

  // ---- 5. Character import
  const fx = require('./fixtures/character.example.json'), CHm = require('../engine/character.js');
  const fileURL = 'file://' + file;
  w = await load(null, fileURL + '#' + CHm.toFragment(fx)); $ = id => w.document.getElementById(id);
  ok('character arrives by URL fragment and the fragment is cleared', /Aralen/.test($('characterInfo').textContent) && w.location.hash === '', $('characterInfo').textContent);
  ok('four domain buttons with DC and mode', $('domainBtns').children.length === 4 && /Intellectual 5 · Over/.test($('domainBtns').children[0].textContent) && /Physical 20 · Under/.test($('domainBtns').children[1].textContent), [...$('domainBtns').children].map(b => b.textContent).join(' | '));
  $('domain-physical').click();
  ok('picking a domain fills the DC and shows its mode', $('dc').value === '20' && /Roll-Under/.test($('modeHint').textContent), $('modeHint').textContent);
  ok('character die tier preselects the die', $('dieType').value === String(fx.dieTier));
  w.__fetches.length = 0; w.TELEGRAM_BOT_TOKEN = 'T'; w.TELEGRAM_CHAT_ID = '-1000000000001';
  $('rollButton').click();
  ok('result is labelled with the domain', /Physical check/.test($('result').textContent));
  const tf = w.__fetches.find(x => /Harmonized/.test(x.o.body));
  ok('Telegram names the character and the domain', tf && /Aralen/.test(JSON.parse(tf.o.body).text) && /Physical check/.test(JSON.parse(tf.o.body).text));
  $('dc').value = 21; $('dc').dispatchEvent(new w.Event('input'));
  ok('editing the DC by hand drops the domain label', !$('domain-physical').classList.contains('active'));
  $('rollButton').click(); ok('and the result is no longer labelled', !/Physical check/.test($('result').textContent));
  // remembered across reload on the same origin store
  const keep = w.localStorage.getItem('auldEweActiveCharacter');
  w = await load(x => x.localStorage.setItem('auldEweActiveCharacter', keep)); $ = id => w.document.getElementById(id);
  ok('character is remembered between visits', /Aralen/.test($('characterInfo').textContent));
  // file picker
  w = await load(); $ = id => w.document.getElementById(id);
  const feed = (text) => new Promise(r => { const f = new w.File([text], 'c.json', { type: 'application/json' }); Object.defineProperty($('characterFile'), 'files', { value: [f], configurable: true }); $('characterFile').dispatchEvent(new w.Event('change')); setTimeout(r, 60); });
  await feed(JSON.stringify(fx)); ok('file picker loads a Character', /Aralen/.test($('characterInfo').textContent));
  await feed('not json'); ok('non-JSON file is refused politely', /not valid JSON/.test($('characterInfo').textContent));
  const tampered = JSON.parse(JSON.stringify(fx)); tampered.dc.spiritual.mode = 'under';
  await feed(JSON.stringify(tampered)); ok('a Character whose mode disagrees with its DC is rejected', /Not a usable Character/.test($('characterInfo').textContent), $('characterInfo').textContent.slice(0, 80));
  const future = JSON.parse(JSON.stringify(fx)); future.version = 2;
  await feed(JSON.stringify(future)); ok('an unknown schema version is rejected', /version/.test($('characterInfo').textContent));

  // skills: picker, modifier arithmetic
  w = await load(); $ = id => w.document.getElementById(id);
  ok('skill picker hidden until a Character loads', $('skillGroup').style.display === 'none');
  await feed(JSON.stringify(fx));
  ok('skill picker appears with a Character', $('skillGroup').style.display === '');
  const mine = Object.keys(fx.skills);
  ok("picker lists the character's skills first, then the rest at -2", $('skillSelect').querySelector('optgroup').label === 'Your skills' && $("skillSelect").querySelectorAll("option").length === 1 + 134, $('skillSelect').querySelectorAll('option').length);
  const other = [...$('skillSelect').querySelectorAll('option')].map(o => o.value).find(v => v && !mine.includes(v));
  async function formulaFor(skill, modv) {
    $('dieType').value = '6'; $('modifier').value = String(modv); $('skillSelect').value = skill; $('dc').value = '40';
    $('rollButton').click(); await new Promise(r => setTimeout(r, 30));
    return [...$('result').querySelectorAll('p')].map(p => p.textContent).find(t => /=|\+/.test(t) && /dc|DC|vs/i.test(t)) || $('result').textContent;
  }
  // an Acquired Skillset the character holds appears and adds its modifier (0); one not held does not appear
  const fxA = JSON.parse(JSON.stringify(fx)); fxA.acquired = { 'Rapport Building': 0 };
  await feed(JSON.stringify(fxA));
  const acqOpts = [...$('skillSelect').querySelectorAll('optgroup')].filter(g => g.label === 'Acquired skillsets').flatMap(g => [...g.querySelectorAll('option')].map(o => o.value));
  ok('a held Acquired Skillset is offered, an unheld one is not', acqOpts.join() === 'Rapport Building', acqOpts.join());
  ok('skills show their attribute', /· (Inspiration|Intellect|Prowess|SelfAwareness|Instinct|Drive|Energy|Emotion|Will) \(/.test($('skillSelect').textContent));
  await feed(JSON.stringify(fx));
  const fMine = await formulaFor(mine[0], 0), fOther = await formulaFor(other, 0), fOther3 = await formulaFor(other, 3), fNone = await formulaFor('', 0);
  ok('an assigned skill adds nothing (modifier 0)', /^\d+ \+ (\d+|\(−\d+ Bolt\)) = /.test(fMine), fMine);
  ok('an unassigned skill subtracts 2', /^\d+ \+ (\d+|\(−\d+ Bolt\)) − 2 = /.test(fOther), fOther);
  ok('the skill modifier stacks with the manual modifier (3 + -2 = +1)', /^\d+ \+ (\d+|\(−\d+ Bolt\)) \+ 1 = /.test(fOther3), fOther3);
  ok('no skill selected adds nothing', /^\d+ \+ (\d+|\(−\d+ Bolt\)) = /.test(fNone), fNone);
  console.log(checks.map(c => c.join('  ')).join('\n'));
  console.log('JS errors:', errors.length ? errors : 'none');
  process.exit(checks.some(c => c[0] === 'FAIL') || errors.length ? 1 : 0);
})();
