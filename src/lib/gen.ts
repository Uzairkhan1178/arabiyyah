// Exercise generation from the verified corpus. Every answer key here is read from a Quranic Arabic Corpus
// tag on an authentic word, so drills are unlimited without any AI-written "facts".
import { type Surah, type Ayah, type Word, type F, stemOf, parse, describe, CASES, MOODS, FORMS, PERSON, KINDS, TAGNAME, LEXMAP, lexId, wordAudio } from './quran';
import { shuffle, pick, sample } from './arabic';

export type Q = {
  id: string; kind: 'mcq' | 'tap' | 'order'; tag: string; prompt: string; order?: string[]; en?: string;
  ar?: string; big?: boolean;
  ayah?: { s: number; a: number; words: string[]; hi?: number[] };
  options?: string[]; optAr?: boolean; answer?: number; taps?: number[];
  explain: string; ref?: string; audio?: string; hideText?: boolean; item?: string; verified: boolean;
};
type Hit = { su: Surah; ay: Ayah; wi: number; w: Word; f: F; pre: F[]; suf: F[] };

export function wordsOf(pool: Surah[], maxLen = 22): Hit[] {
  const out: Hit[] = [];
  for (const su of pool) for (const ay of su.ayahs) {
    if (ay.al === false || ay.w.length > maxLen) continue;
    ay.w.forEach((w, wi) => {
      const st = stemOf(w); if (!st) return;
      out.push({ su, ay, wi, w, f: st.f, pre: w.s!.slice(0, st.i).map(parse), suf: w.s!.slice(st.i + 1).map(parse) });
    });
  }
  return out;
}
const ref = (h: Hit) => `${h.su.n}:${h.ay.a}:${h.wi + 1}`;
const ayahOf = (h: Hit, hi = true) => ({ s: h.su.n, a: h.ay.a, words: h.ay.w.map((w) => w.t), hi: hi ? [h.wi] : undefined });
const why = (h: Hit) => { const d = describe(h.w.s![h.w.s!.findIndex((s) => { const f = parse(s); return !f.pref && !f.suff; })]); return `${h.w.t} — ${d.title} (${d.ar}). ${d.lines.join('; ')}. Gloss: "${h.w.g || ''}". Source: Quranic Arabic Corpus, ${ref(h)}.`; };
const has = (f: F, ...k: string[]) => k.find((x) => f.set.has(x));
let qn = 0;
function mcq(h: Hit, tag: string, prompt: string, correct: string, others: string[], extra: Partial<Q> = {}): Q {
  const options = shuffle([correct, ...others.filter((o) => o !== correct)]);
  return { id: `q${qn++}`, kind: 'mcq', tag, prompt, ayah: ayahOf(h), options, answer: options.indexOf(correct), explain: why(h), ref: ref(h), verified: true, ...extra };
}
function balanced<T>(hits: Hit[], key: (h: Hit) => T | undefined): Hit | undefined {
  // Pick the answer class first, then a word of that class, so rare classes are not drowned out.
  const groups = new Map<T, Hit[]>();
  for (const h of hits) { const k = key(h); if (k !== undefined) { if (!groups.has(k)) groups.set(k, []); groups.get(k)!.push(h); } }
  if (!groups.size) return;
  return pick(pick([...groups.values()]));
}
const simplePrefix = (h: Hit) => h.pre.every((p) => p.set.has('DET'));

export type GenName = keyof typeof GENS;
export const GENS = {
  pos: (H: Hit[]) => { const h = balanced(H.filter(simplePrefix), (h) => h.f.tag); return h && mcq(h, 'nahw.pos', 'Is the highlighted word an ism, a fiʿl or a ḥarf?', TAGNAME[h.f.tag][0], Object.values(TAGNAME).map((x) => x[0])); },
  case: (H: Hit[]) => { const h = balanced(H.filter((h) => h.f.tag === 'N' && !h.f.set.has('PRON')), (h) => has(h.f, 'NOM', 'ACC', 'GEN')); return h && mcq(h, 'nahw.case', 'What is the case (iʿrāb) of the highlighted noun?', CASES[has(h.f, 'NOM', 'ACC', 'GEN')!][0], Object.values(CASES).map((x) => x[0])); },
  definite: (H: Hit[]) => { const h = balanced(H.filter((h) => h.f.tag === 'N' && !h.suf.length && !h.f.set.has('PN')), (h) => h.pre.some((p) => p.set.has('DET')) ? 'd' : h.f.set.has('INDEF') ? 'i' : undefined); return h && mcq(h, 'nahw.definite', 'Is the highlighted noun definite or indefinite?', h.f.set.has('INDEF') ? 'indefinite (nakira)' : 'definite (maʿrifa)', ['indefinite (nakira)', 'definite (maʿrifa)']); },
  gn: (H: Hit[]) => { const G: Record<string, string> = { MS: 'masculine singular', FS: 'feminine singular', MP: 'masculine plural', FP: 'feminine plural', MD: 'masculine dual', FD: 'feminine dual' }; const h = balanced(H.filter((h) => h.f.tag === 'N' && !h.f.set.has('PRON')), (h) => has(h.f, ...Object.keys(G))); if (!h) return; const c = G[has(h.f, ...Object.keys(G))!]; return mcq(h, 'sarf.gn', 'What are the gender and number of the highlighted word?', c, sample(Object.values(G).filter((x) => x !== c), 3)); },
  tense: (H: Hit[]) => { const h = balanced(H.filter((h) => h.f.tag === 'V'), (h) => has(h.f, 'PERF', 'IMPF', 'IMPV')); return h && mcq(h, 'sarf.tense', 'Which kind of verb is highlighted?', KINDS[has(h.f, 'PERF', 'IMPF', 'IMPV')!][0], ['PERF', 'IMPF', 'IMPV'].map((x) => KINDS[x][0])); },
  doer: (H: Hit[]) => { const P = Object.keys(PERSON); const h = balanced(H.filter((h) => h.f.tag === 'V'), (h) => has(h.f, ...P)); if (!h) return; const c = has(h.f, ...P)!; const lab = (p: string) => `${PERSON[p][0]} — ${PERSON[p][1]}`; const others = sample(P.filter((p) => PERSON[p][0] !== PERSON[c][0] && !/two/.test(PERSON[p][0])), 3).map(lab); return mcq(h, 'sarf.doer', 'Who is the doer built into this verb?', lab(c), others); },
  form: (H: Hit[]) => { const h = balanced(H.filter((h) => h.f.tag === 'V' && h.f.vf && h.f.vf <= 10 && h.f.vf !== 9), (h) => h.f.vf); if (!h) return; const all = [1, 2, 3, 4, 5, 6, 7, 8, 10]; return mcq(h, 'sarf.form', 'Which verb form (wazn) is this?', 'Form ' + FORMS[h.f.vf!], sample(all.filter((x) => x !== h.f.vf), 3).map((x) => 'Form ' + FORMS[x]), { optAr: true }); },
  root: (H: Hit[]) => { const R = H.filter((h) => h.f.root && h.f.root.length === 3); const h = pick(R); if (!h) return; const sp = (r: string) => r.split('').join(' '); const others = sample([...new Set(R.map((x) => x.f.root!))].filter((r) => r !== h.f.root), 3).map(sp); return mcq(h, 'sarf.root', 'Which root does the highlighted word come from?', sp(h.f.root!), others, { optAr: true }); },
  derived: (H: Hit[]) => { const D = ['ACT_PCPL', 'PASS_PCPL', 'VN']; const h = balanced(H.filter((h) => h.f.tag === 'N'), (h) => has(h.f, ...D)); return h && mcq(h, 'sarf.derived', 'What kind of derived noun is highlighted?', `${KINDS[has(h.f, ...D)!][0]} (${KINDS[has(h.f, ...D)!][1]})`, D.map((x) => `${KINDS[x][0]} (${KINDS[x][1]})`)); },
  voice: (H: Hit[]) => { const h = balanced(H.filter((h) => h.f.tag === 'V' && !h.f.set.has('IMPV')), (h) => h.f.set.has('PASS')); return h && mcq(h, 'sarf.voice', 'Is this verb active or passive?', h.f.set.has('PASS') ? 'passive (majhūl)' : 'active (maʿlūm)', ['passive (majhūl)', 'active (maʿlūm)']); },
  mood: (H: Hit[]) => { const h = balanced(H.filter((h) => h.f.tag === 'V' && h.f.set.has('IMPF') && h.f.mood), (h) => h.f.mood); return h && mcq(h, 'nahw.mood', 'What is the mood of this muḍāriʿ verb?', MOODS[h.f.mood!][0], Object.values(MOODS).map((x) => x[0])); },
  particle: (H: Hit[]) => { const K = ['P', 'NEG', 'COND', 'ACC', 'INTG', 'CERT', 'RES', 'CONJ', 'SUB', 'VOC', 'FUT', 'RET', 'PRO']; const h = balanced(H.filter((h) => h.f.tag === 'P' && !h.pre.length), (h) => has(h.f, ...K)); if (!h) return; const c = has(h.f, ...K)!; return mcq(h, 'nahw.particle', 'What kind of particle is highlighted?', `${KINDS[c][0]} — ${KINDS[c][2]}`, sample(K.filter((k) => k !== c), 3).map((k) => `${KINDS[k][0]} — ${KINDS[k][2]}`)); },
  pron: (H: Hit[]) => { const P = Object.keys(PERSON); const C = H.filter((h) => h.suf.some((s) => s.set.has('PRON')) && h.f.tag !== 'V'); const h = balanced(C, (h) => has(h.suf.find((s) => s.set.has('PRON'))!, ...P)); if (!h) return; const c = has(h.suf.find((s) => s.set.has('PRON'))!, ...P)!; const lab = (p: string) => `${PERSON[p][0]} — ${PERSON[p][1]}`; return mcq(h, 'nahw.pron', 'Which pronoun is attached to the end of this word?', lab(c), sample(P.filter((p) => PERSON[p][0] !== PERSON[c][0] && !/\(m\.\)|\(f\.\)$/.test(PERSON[p][0])), 3).map(lab)); },
  tapVerb: (H: Hit[]) => tap(H, 'nahw.pos', 'Tap every verb (fiʿl) in this ayah.', (h) => h.f.tag === 'V'),
  tapMajrur: (H: Hit[]) => tap(H, 'nahw.case', 'Tap every majrūr noun in this ayah.', (h) => h.f.tag === 'N' && h.f.set.has('GEN')),
  tapJarr: (H: Hit[]) => tap(H, 'nahw.jarr', 'Tap every word that is or carries a preposition (ḥarf jarr).', (h) => (h.f.tag === 'P' && h.f.set.has('P')) || h.pre.some((p) => p.set.has('P'))),
  tapMarfu: (H: Hit[]) => tap(H, 'nahw.case', 'Tap every marfūʿ noun in this ayah.', (h) => h.f.tag === 'N' && h.f.set.has('NOM')),
  tapMansub: (H: Hit[]) => tap(H, 'nahw.case', 'Tap every manṣūb noun in this ayah.', (h) => h.f.tag === 'N' && h.f.set.has('ACC')),
  tapPron: (H: Hit[]) => tap(H, 'nahw.pron', 'Tap every word that carries an attached pronoun.', (h) => h.suf.some((s) => s.set.has('PRON'))),
  meaning: (H: Hit[]) => { const C = H.filter((h) => h.w.g && h.f.tag !== 'P'); const h = pick(C); if (!h) return; return mcq(h, 'vocab.ctx', 'What does the highlighted word mean here?', h.w.g!, sample([...new Set(C.map((x) => x.w.g!))].filter((g) => g !== h.w.g), 3), { item: lexId(h.f) }); },
};
function tap(H: Hit[], tag: string, prompt: string, test: (h: Hit) => boolean): Q | undefined {
  const byAyah = new Map<Ayah, Hit[]>();
  for (const h of H) { if (h.ay.w.length < 4 || h.ay.w.length > 14) continue; if (!byAyah.has(h.ay)) byAyah.set(h.ay, []); byAyah.get(h.ay)!.push(h); }
  const cands = [...byAyah.values()].filter((hs) => { const n = hs.filter(test).length; return n >= 1 && n <= 4 && hs.length === hs[0].ay.w.length; });
  const hs = pick(cands); if (!hs) return;
  const taps = hs.filter(test).map((h) => h.wi);
  return { id: `q${qn++}`, kind: 'tap', tag, prompt, ayah: ayahOf(hs[0], false), taps, explain: hs.filter(test).map((h) => why(h)).join('\n'), ref: `${hs[0].su.n}:${hs[0].ay.a}`, verified: true };
}
export function generate(names: GenName[], pool: Surah[], n: number): Q[] {
  const H = wordsOf(pool); const out: Q[] = []; const seen = new Set<string>();
  for (let i = 0; out.length < n && i < n * 8; i++) {
    const q = GENS[names[i % names.length]](H) as Q | undefined;
    if (!q || seen.has(q.tag + q.ref)) continue;
    seen.add(q.tag + q.ref); out.push(q);
  }
  return out;
}

// ---- vocabulary questions ------------------------------------------------------------------------
import type { Lex } from './quran';
export const cleanGloss = (g: string) => g.replace(/\([^)]*\)|\[[^\]]*\]/g, ' ').replace(/\s+/g, ' ').trim().replace(/^(and|but|so|then|or|for|indeed,?|verily,?)\s+(?=\S)/i, '');
export function lemmaMeaning(l: Lex, overlay?: { en?: string }): string { return overlay?.en || cleanGloss(l.gl[0]?.[0] || '') || '—'; }
export function vocabRecQ(l: Lex, all: Lex[], meaning: (x: Lex) => string): Q {
  const near = all.filter((x) => x.id !== l.id && x.tag === l.tag && Math.abs(x.rank - l.rank) < 120 && meaning(x) !== meaning(l));
  const options = shuffle([meaning(l), ...[...new Set(sample(near, 12).map(meaning))].slice(0, 3)]);
  return { id: `q${qn++}`, kind: 'mcq', tag: 'vocab.rec', prompt: 'What does this word mean?', ar: l.lem, big: true, options, answer: options.indexOf(meaning(l)), explain: `${l.lem} — ${meaning(l)}${l.root ? ` · root ${l.root.split('').join(' ')}` : ''} · ${l.n}× in the Quran.`, item: l.id, verified: true };
}
export function vocabCtxQ(l: Lex, su: Surah): Q | undefined {
  const H = wordsOf([su], 26); const hits = H.filter((h) => lexId(h.f) === l.id && h.w.g);
  const h = pick(hits); if (!h) return;
  const others = sample([...new Set(H.filter((x) => x.w.g && lexId(x.f) !== l.id && x.f.tag === h.f.tag).map((x) => x.w.g!))].filter((g) => g !== h.w.g), 3);
  if (others.length < 2) return;
  return mcq(h, 'vocab.ctx', 'What does the highlighted word mean in this ayah?', h.w.g!, others, { item: l.id });
}
export function vocabListenQ(l: Lex, all: Lex[]): Q | undefined {
  const r = l.refs[0]; if (!r) return;
  const [s, a, w] = r.split(':').map(Number);
  const near = sample(all.filter((x) => x.id !== l.id && x.tag === l.tag && Math.abs(x.rank - l.rank) < 150), 3);
  const options = shuffle([l.lem, ...near.map((x) => x.lem)]);
  return { id: `q${qn++}`, kind: 'mcq', tag: 'vocab.listen', prompt: 'Listen. Which word (dictionary form) did you hear?', audio: wordAudio(s, a, w), hideText: true, options, optAr: true, answer: options.indexOf(l.lem), explain: `You heard a form of ${l.lem} from ${s}:${a}.`, ref: r, item: l.id, verified: true };
}
