/* VI Grožio salonas — pokalbio asistentė (pokalbis.html), be serverio ir tinklo.
   Savininkei: keiskite tik 1 dalį. Patikra: node tools/qa/chat-test.mjs */
((root, make) => {
const api = root.VIChat = make();
if (typeof module == 'object') module.exports = api;
if (typeof document == 'object') api.ui(document);
})(globalThis, () => {
'use strict';

/* ===== 1. DUOMENYS =====
   Raktažodžiai — žodžių pradžios be lietuviškų raidžių („manik“ tinka „manikiūrui“),
   „=žodis“ — tik visas žodis, „žodis:.5“ — svoris. */
const HOURS = [['Pirmadienis–penktadienis', '08:00–18:00'], ['Šeštadienis', '08:00–15:00'], ['Sekmadienis', 'nedirbame']];
const AFTER = 'Kitu laiku ar sekmadienį — pagal išankstinį susitarimą.';
const INDRE = '+370 618 45 646'; // Indrė, kirpėja-stilistė; bendro salono numerio nėra
const VALE = '+370 640 30 066';  // Valentina, grožio specialistė
const ADDRESS = 'P. Butlerienės g. 6, Marijampolė';
const FB = 'https://www.facebook.com/share/17bGisHhSd/';
const IG = 'https://www.instagram.com/vi_grozio_salonas/';
const K = 'kirpim kerp =kirpti ', H = (l, p, k) => [l, 'nuo ' + p + ' €', k];
// [id (kainos.html#id), pavadinimas, raktažodžiai, [[paslauga, kaina, raktažodžiai, pastaba] | 'grupė'], 'I' = pas Indrę, pastaba]
const SERVICES = [
  ['makiazas', 'Makiažas', 'makiaz', [
    ['Ilgalaikis makiažas (antakiai, akių pravedimai, lūpos)', '130–140 €', 'ilgalaik permanent tatuir pravedim lup antak'],
    ['– Pirminė korekcija', '30 €', 'pirmin korekc'],
    ['– Spalvos atnaujinimas', '70–100 €', 'spalv atnaujin'],
    ['Makiažas', '35–50 €', 'proging vestuv']]],
  ['antakiai', 'Antakiai ir blakstienos', 'antak blakst', [
    ['Antakių korekcija, dažymas', '13 €', 'antak korekc dazym form'],
    ['Blakstienų dažymas', '5 €', 'blakst dazym']]],
  ['nagai', 'Nagai', 'nag manik', [
    ['Japoniškas manikiūras', '20 €', 'japon'],
    ['Gelinis lakavimas', '23 €', 'geli lak shellac']]],
  ['pedikiuras', 'Pedikiūras', 'pedik', [
    ['SPA pedikiūras', '32 €', '=spa'],
    ['Ekspres pedikiūras', '28 €', 'ekspres greit']]],
  ['depiliacija', 'Depiliacija', 'depil salinim:1.1', [
    'Depiliacija vašku', ['Šlaunys', '18–20 €', 'vask slaun koj'], ['Blauzdos', '15–18 €', 'vask blauzd koj'], ['Veido', '3–10 €', 'vask veid usu smakr'],
    'Depiliacija cukrumi', ['Pažastys', '12 €', 'cukr pazast'], ['Bikini', '22–25 €', 'cukr bikin']]],
  ['veidas', 'Veido procedūros', 'veid odos kosmetolog procedur:.5', [
    ['KOBIDO masažas', '40–55 €', 'kobid masaz japon', 'KOBIDO masažą galima ir padovanoti — yra kuponas „Poilsis Jūsų sielai. Jaunystė ir grožis – veidui.“'],
    ['Rūgštinis pilingas', '40–60 €', 'piling rugst'],
    ['Veido valymas', '40 €', 'valym valyt']]],
  ['masazas', 'Masažas', 'masaz', [
    ['Klasikinis kūno masažas (50 min)', '50 €', 'klasik kun nugar atpalaid']]],
  ['plaukai', 'Plaukai', 'plauk kirpej kirpyk', [
    'Kirpimai',
    H('Moteriškas kirpimas', 20, K + 'moter:1.2'), H('Galiukų kirpimas', 15, K + 'galiuka:1.2 galiuku:1.2'),
    H('Kirpčiukų kirpimas', 7, K + 'kirpciuk:1.2'), H('Kirpimas karštomis žirklėmis', 25, K + 'karst:1.2 zirkl:1.2'),
    H('Vyriškas kirpimas', 20, K + 'vyr:1.2'), H('Vaikiškas kirpimas', 15, K + 'vaik:1.2'),
    'Dažymai',
    H('Šaknų dažymas', 30, 'dazym sakn'), H('Šaknų dažymas su tonavimu', 40, 'dazym sakn tonav'),
    H('Plaukų tonavimas', 30, 'dazym tonav'), H('Sudėtingi dažymai', 60, 'dazym sudeting'),
    H('Visos galvos dažymas sruogelėmis', 50, 'dazym sruog galv'), H('Šaknų dažymas sruogelėmis', 30, 'dazym sakn sruog'),
    'Sušukavimai ir procedūros',
    H('Trumpų plaukų sušukavimas', 20, 'susuk sukuosen trump:1.2'), H('Vidutinio ilgio plaukų sušukavimas', 25, 'susuk sukuosen vidutin:1.2'),
    H('Ilgų plaukų sušukavimas', 35, 'susuk sukuosen =ilgu:1.2 =ilgiems:1.2'), H('Plaukų cheminis šukavimas', 30, 'chemin:1.2 sukav garban'),
    H('Atstatymo procedūros', 20, 'atstat:1.2 gydym prieziur kauk'), H('Plaukų poliravimas', 25, 'polir:1.2')], 'I',
    'Kainos „nuo“ — galutinė priklauso nuo plaukų ilgio ir procedūros.'],
];
const GIFTS = [['Dovanų kuponas „Dovana Tau“ (Valentinos paslaugoms)', 'Suma pagal pageidavimą'],
  ['KOBIDO masažo kuponas', '40–55 €'], ['VI dovanų dėžutė su natūralių akmenų apyranke', 'Pasiteiraukite']];
// [id, mygtukas, raktažodžiai, svoris, tema, apie kurią NEŽINOME (siūloma skambinti)]
const TOPICS = [
  ['labas', 'Sveiki', '=labas =laba sveik =hello =hi', .6],
  ['aciu', 'Ačiū', 'aciu dekoj dekui'],
  ['iki', 'Iki', '=iki =viso =sudie =ate pasimatym', .95],
  ['botas', 'Ar Jūs žmogus?', 'robot =botas =bot zmog =ai dirbtin =gyvas operator konsultant'],
  ['kainos', 'Kainos', 'kain =kiek brang pig =eur paslaug:1.2 teikiat siulot atliekat', .5],
  ['registracija', 'Kaip užsiregistruoti?', 'registr uzsira uzsireg rezerv laisv:1.2 vizit uzrasy ateit:.6'],
  ['kontaktai', 'Kontaktai', 'telefon numer kontakt skambin susisiek =sms zinut parasy facebo feisb =fb instag meistr:.8', .9],
  ['adresas', 'Kur Jus rasti?', 'adres =kur:.6 rasti randat gatv butlerien marijamp:.5 zemelap nuvaz nueit atvyk marsrut =vieta'],
  ['laikas', 'Darbo laikas', 'dirba nedirb =darbo valand atidar uzdar savaitgal sestad sekmad pirmad penktad =siandien:.4 rytoj:.6 grafik =laikas:.6 =vakare velai =val', 1],
  ['parkavimas', 'Automobilio statymas', 'parkav stovejim automobil pasistat', 1, 'automobilio statymą'],
  ['mokejimas', 'Atsiskaitymas', 'atsiskait mokej moket kortel gryn apmok', 1, 'atsiskaitymo būdus'],
  ['dovanos', 'Dovanų kuponai', 'dovan kupon sertifik apyrank dezut akmen', 1.1],
  ['atsiliepimai', 'Atsiliepimai', 'atsiliep review ivertin rekomend komentar', 1.1],
  ['valentina', 'Apie Valentiną', 'valentin specialist', .85],
  ['indre', 'Apie Indrę', 'indr stilist', .85],
];

/* ===== 2. VARIKLIS ===== */
const norm = s => String(s).toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[^a-z0-9]+/g, ' ').trim();
const keys = (s, m = 1) => s.split(' ').map(k => (k = k.split(':'), [k[0], (+k[1] || 1) * m]));
const near = (a, b) => { // Damerau–Levenshtein ≤ 1
  let i = 0;
  while (a[i] && a[i] == b[i]) i++;
  const x = a.slice(i + 1), y = b.slice(i + 1);
  return x == y || x == b.slice(i) || a.slice(i) == y || a[i] == b[i + 1] && a[i + 1] == b[i] && a.slice(i + 2) == b.slice(i + 2);
};
const hit = (t, k) => { // .8 — viena klaida (nuo 5 raidžių)
  const ex = k[0] == '=', K = ex ? k.slice(1) : k;
  return (ex ? t == K : t.startsWith(K)) ? 1 : t.length > 4 && K.length > 4 && [-1, 0, 1].some(e => near(ex ? t : t.slice(0, K.length + e), K)) ? .8 : 0;
};
const weigh = (toks, ks) => toks.map(t => Math.max(0, ...ks.map(([k, w]) => hit(t, k) * w)));
const sum = a => a.reduce((x, y) => x + y, 0);
const INTENTS = SERVICES.map(([id, name, k, list, who, note], cap) => (cap = name, { id, name, svc: 1, k: keys(k), who, note,
  rows: list.flatMap(x => x.trim ? (cap = x, []) : { l: x[0], p: x[1], k: keys(x[2]), note: x[3], cap }) })).concat(TOPICS.map(([id, name, k, m, unk]) => ({ id, name, k: keys(k, m), rows: [], unk })));
const byId = Object.fromEntries(INTENTS.map(I => [I.id, I])), isSvc = id => byId[id]?.svc;

function score(I, toks) {
  const base = weigh(toks, I.k);
  let best = [], rows = [], top = 0;
  for (const r of I.rows) {
    const h = weigh(toks, r.k), s = sum(h);
    if (!h.some((v, i) => v && !base[i])) continue;
    if (s > top + .001) [top, rows, best] = [s, [r], h];
    else if (s > top - .001) rows.push(r), best = best.map((v, i) => Math.max(v, h[i]));
  }
  return { id: I.id, s: sum(base.map((v, i) => Math.max(v, (best[i] || 0) * .9))), rows };
}
function match(text, ctx = {}) {
  const toks = norm(text).split(' '), all = INTENTS.map(I => score(I, toks)).filter(r => r.s >= .5).sort((a, b) => b.s - a.s);
  const svc = all.find(r => isSvc(r.id))?.id || ctx.last;
  if (ctx.force) return { id: ctx.force, rows: [], ...all.find(r => r.id == ctx.force), svc };
  let list = all.filter(r => r.id != 'labas' && r.id != 'kainos'); // konkretu > bendra
  if (!list[0]) list = all.filter(r => r.id != 'labas' || !all[1]);
  if (!list[0]) return { id: 'nezinau', rows: [] };
  const tied = list.filter(r => list[0].s - r.s < .01), reg = tied.find(r => r.id == 'registracija'); // lygu → klausti
  return tied[1] && !reg ? { id: '?', opts: tied.slice(0, 3).map(r => r.id) } : { ...reg || tied[0], svc };
}

/* ===== 3. ATSAKYMAI ===== */
const tel = (n, l, sub) => ({ href: 'tel:' + n.replace(/ /g, ''), l, sub: sub + n });
const sms = (n, sub) => q => ({ href: 'sms:' + n.replace(/ /g, '') + (q ? '?body=' + encodeURIComponent(q) : ''), l: 'Rašyti SMS', sub });
// I Indrė, V Valentina, M/N SMS Indrei/Valentinai, F Facebook, G Instagram, K maršrutas
const BTN = { I: tel(INDRE, 'Skambinti Indrei', 'Plaukai · '), V: tel(VALE, 'Skambinti Valentinai', 'Grožio procedūros · '),
  M: sms(INDRE, 'Indrei · plaukai'), N: sms(VALE, 'Valentinai'),
  F: { href: FB, l: 'Facebook', sub: 'Atsiliepimai ir naujienos', ext: 1 }, G: { href: IG, l: 'Instagram', sub: '@vi_grozio_salonas', ext: 1 },
  K: { href: 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(ADDRESS), l: 'Maršrutas', sub: 'Google Maps', ext: 1 } };
const acts = (s, q, go) => [...s].map(c => BTN[c].call ? BTN[c](q) : BTN[c]).concat(go ? { href: go[0], l: go[1] } : []);
const ALL = SERVICES.map(s => s[0]).join(' '), WHO = s => s ? 'pas kirpėją-stilistę Indrę, ' + INDRE : 'pas grožio specialistę Valentiną, ' + VALE;
const T = { // [tekstas, mygtukai, pasiūlymai, nuoroda]
  labas: ['Sveiki! Kuo galiu padėti? Klauskite apie paslaugas, kainas ar darbo laiką.'],
  aciu: ['Prašom! Gražios Jums dienos.'],
  iki: ['Iki pasimatymo VI salone! Gražios Jums dienos.'],
  botas: ['Esu automatinė asistentė, ne žmogus — atsakau tik iš salono informacijos. Žmogus atsilieps telefonu ar SMS žinute.', 'IVMN'],
  kontaktai: ['Skambinkite tiesiai meistrei: Indrei — dėl plaukų, Valentinai — dėl kitų procedūrų. Mus rasite ir „Facebook“ bei „Instagram“.', 'IVFG'],
  adresas: ['Mus rasite adresu ' + ADDRESS + '. Prieš atvykdami užsiregistruokite telefonu.', 'KIV', 'laikas registracija parkavimas'],
  laikas: ['VI salono darbo laikas:', 'IV', 'registracija adresas kainos'],
  valentina: ['Valentina — VI salono grožio specialistė: makiažas, antakiai, nagai, pedikiūras, depiliacija, veido procedūros ir kūno masažas.', 'V', ALL.replace(' plaukai', ''), ['kainos.html#valentina', 'Jos kainos']],
  indre: ['Indrė — VI salono kirpėja-stilistė: kirpimai, dažymai, sušukavimai ir plaukų procedūros.', 'I', 'plaukai registracija laikas', ['kainos.html#plaukai', 'Jos kainos']],
  atsiliepimai: ['Klientų atsiliepimus rasite mūsų „Facebook“ puslapyje — laukiame ir Jūsų įspūdžių!', 'FG', 'kainos registracija dovanos'],
  nezinau: ['Atsiprašau, į tai atsakyti negaliu — žinau tik salono paslaugas, kainas ir kontaktus. Paskambinkite arba parašykite SMS meistrei (klausimą jau įrašiau).', 'IVMN', 'kainos registracija adresas'],
  unk: ['Tikslios informacijos apie {} neturiu, tad nenoriu suklaidinti — pasitikslinkite telefonu.', 'IV', 'registracija adresas kainos'],
  kainos: ['Salone rūpinamės plaukais, nagais, veidu ir kūnu. Pasirinkite paslaugą — parodysiu visas jos kainas.', '', ALL, ['kainos.html', 'Visas kainoraštis']],
  dovanos: ['Dovanoms siūlome:', 'VI', 'veidas adresas kainos', ['kainos.html#dovanos', 'Apie dovanas']],
  registracija: ['Laisvų laikų internete nerodome — laiką suderinsite skambučiu arba SMS žinute. ' + AFTER, 'IVMN', 'kainos adresas laikas'],
  '?': ['Norėčiau patikslinti — apie ką klausiate?'],
};
function reply(q, ctx = {}) {
  const m = match(q, ctx), I = byId[m.id] || {}, b = ctx.chip ? '' : q; // į SMS — tik paties lankytojo klausimas
  const t = I.svc ? [] : T[I.unk ? 'unk' : m.id];
  const r = { p: [(t[0] || '').replace('{}', I.unk)], acts: acts(t[1] || '', b, t[3]), chips: t[2] || m.opts?.join(' ') };
  if (I.svc) { // paklaustos eilutės (su „–“ šeima) ar visa lentelė
    let par;
    const fam = I.rows.map(x => x.l[0] == '–' ? par : (par = x)), F = m.rows.map(x => fam[I.rows.indexOf(x)]);
    const show = F[0] ? I.rows.filter((x, i) => F.includes(fam[i])) : I.rows;
    r.p = [F[0] ? 'Pagal salono kainoraštį:' : I.name + ' — salono kainoraštis:'];
    r.tbl = [...new Set(show.map(x => x.cap))].map(cap => ({ cap, rows: show.filter(x => x.cap == cap).map(x => [x.l, x.p]) }));
    r.after = show.map(x => x.note).concat(I.note, 'Registruokitės ' + WHO(I.who) + '.').filter(Boolean);
    r.acts = acts(I.who ? 'IM' : 'V', b, ['kainos.html#' + I.id, 'Visos kainos']);
    r.chips = 'registracija ' + (show.some(x => x.note) ? 'dovanos' : 'kainos') + ' laikas';
  }
  if (m.id == 'kainos') r.tbl = [{ cap: 'Paslaugos ir kainos', rows: INTENTS.filter(I => I.svc).map(I => {
    const v = Math.min(...I.rows.map(x => x.l[0] != '–' && parseFloat(x.p.replace('nuo ', '')) || 1e9));
    return [I.name, 'nuo ' + v + ' €'];
  }) }];
  if (m.id == 'laikas') r.tbl = [{ cap: 'Darbo laikas', rows: HOURS }], r.after = [AFTER];
  if (m.id == 'dovanos') r.tbl = [{ cap: 'Dovanos', rows: GIFTS }], r.after = ['Kuponą įsigysite paskambinę arba užsukę į saloną.'];
  if (m.id == 'registracija') {
    const S = byId[m.svc];
    r.p.unshift(S ? S.name + ' — registruokitės ' + WHO(S.who) + '.' : 'Plaukų paslaugoms registruokitės ' + WHO(1) + ', kitoms — ' + WHO() + '.');
    if (S) r.acts = acts(S.who ? 'IM' : 'VN', b);
  }
  r.chips = (r.chips || 'kainos registracija laikas dovanos adresas').split(' ').map(c => ({ l: byId[c].name, f: c, q: m.opts ? q : '' }));
  return Object.assign(r, { id: m.id, rows: (m.rows || []).map(x => x.l) });
}

/* ===== 4. SĄSAJA ===== */
function ui(d) {
  const $ = s => d.querySelector(s), log = $('#cx-log'), W = window;
  const form = $('#cx-form'), ta = $('#cx-in'), bar = $('#cx-chips'), stage = $('.cx-stage'), init = [log.innerHTML, bar.innerHTML];
  const store = v => { try { return v ? sessionStorage.setItem('vi-chat', JSON.stringify(v.slice(-40))) : JSON.parse(sessionStorage.getItem('vi-chat')); } catch {} };
  let hist = store() || [], last = '', queue = Promise.resolve(), gen = 0, refocus;
  const el = (t, c = '', ...x) => { const e = d.createElement(t); e.className = c; e.append(...x); return e; };
  const down = n => log.scrollTop = n.offsetHeight > log.clientHeight - 40 ? n.offsetTop - 12 : 1e6;
  const add = (who, ...kids) => { const n = el('div', 'cx-msg cx-msg--' + who, el('div', 'cx-bubble', ...kids)); log.append(n); down(n); return n; };
  const chips = (list = []) => bar.replaceChildren(...list.map(c => Object.assign(el('button', 'cx-chip', c.l), { type: 'button', value: c.f, name: c.q })));
  function bot(r) {
    add('bot', ...r.p.map(t => el('p', '', t)),
      ...(r.tbl || []).map(t => el('div', 'cx-tbl', el('p', 'cx-cap', t.cap),
        el('ul', '', ...t.rows.map(([a, b]) => el('li', a[0] == '–' ? 'is-sub' : '', el('span', '', a), el('b', '', b)))))),
      ...(r.after || []).map(t => el('p', 'cx-aside', t)),
      el('div', 'cx-acts', ...r.acts.map(x => Object.assign(el('a', 'cx-act' + (x.c || ''), el('span', '', x.l, el('small', '', x.sub || ''))),
        { href: x.href }, x.ext && { target: '_blank', rel: 'noopener' }))));
    chips(r.chips);
    refocus &&= bar.firstChild?.focus();
    if (isSvc(r.id)) last = r.id;
  }
  function send(text, force, shown) {
    if (!(text = text.trim())) return;
    add('me', el('p', '', shown || text)); chips();
    const r = reply(text, { force, last, chip: shown == text }), g = gen;
    hist.push({ me: shown || text }, r); store(hist);
    queue = queue.then(() => new Promise(done => {
      const dots = add('bot cx-msg--typing', el('i'), el('i'), el('i')); dots.setAttribute('aria-hidden', 'true');
      setTimeout(() => { dots.remove(); g == gen && bot(r); done(); }, W.VI?.reduced ? 150 : Math.min(1400, 450 + r.p.join('').length * 5));
    }));
  }
  if (hist[0]) { log.replaceChildren(); hist.forEach(h => h.me ? add('me', el('p', '', h.me)) : bot(h)); }
  form.onsubmit = e => { e.preventDefault(); send(ta.value); ta.value = ''; };
  ta.onkeydown = e => { if (e.key == 'Enter' && !e.shiftKey && !e.isComposing) e.preventDefault(), form.requestSubmit(); };
  bar.onclick = e => { const b = e.target.closest('button'); if (b) refocus = 1, send(b.name || b.textContent, b.value, b.textContent); };
  $('#cx-reset').onclick = () => { hist = []; last = ''; gen++; store(hist); log.innerHTML = init[0]; bar.innerHTML = init[1]; W.VI?.finePointer && ta.focus(); };
  const vv = W.visualViewport; // telefono klaviatūra
  if (vv) vv.onresize = () => {
    const kb = innerWidth < 1000 && vv.scale < 1.05 && vv.height < innerHeight - 120;
    stage.classList.toggle('is-kb', kb);
    stage.style.height = kb ? vv.height + 'px' : '';
    if (kb) scrollTo(0, 0), log.scrollTop = 1e6;
  };
  const q = new URLSearchParams(location.search).get('q');
  if (q) history.replaceState(null, '', location.pathname), send(q.slice(0, 300));
}

return { norm, near, match, reply, ui, HOURS };
});
