// Read-only access to the verified Quran data built by scripts/build_data.py, plus decoding of the
// Quranic Arabic Corpus tags into plain language. Nothing in this file writes or alters Quranic text.
import { settings } from './db';

export type Seg = [form: string, tag: 'N' | 'V' | 'P', feats: string];
export type Word = { t: string; g?: string; tr?: string; s?: Seg[] };
export type Ayah = { a: number; w: Word[]; en: string; ur: string; al?: boolean };
export type Surah = { n: number; ar: string; tl: string; en: string; type: string; basmala: string | null; ayahs: Ayah[] };
export type SurahMeta = { n: number; ar: string; tl: string; en: string; type: string; count: number; start: number };
export type Lex = { id: string; lem: string; tag: string; kind: string; root: string | null; n: number; vf: string | null; gl: [string, number][]; refs: string[]; rank: number };

const BASE = import.meta.env.BASE_URL;
export let SURAHS: SurahMeta[] = [];
export let PROVENANCE: any = {};
export let LEX: Lex[] = [];
export const LEXMAP = new Map<string, Lex>();
export let ROOTS: Record<string, { n: number; l: string[] }> = {};
const cache = new Map<number, Promise<Surah>>();

export async function initData() {
  const [meta, lex, roots] = await Promise.all(['meta', 'lexicon', 'roots'].map((f) => fetch(`${BASE}data/${f}.json`).then((r) => r.json())));
  SURAHS = meta.surahs; PROVENANCE = meta.provenance; LEX = lex; ROOTS = roots;
  LEX.forEach((l) => LEXMAP.set(l.id, l));
}
export function loadSurah(n: number): Promise<Surah> {
  let p = cache.get(n);
  if (!p) {
    p = fetch(`${BASE}data/quran/${n}.json`).then((r) => { if (!r.ok) throw new Error('Surah data unavailable offline'); return r.json(); });
    p.catch(() => cache.delete(n));
    cache.set(n, p);
  }
  return p;
}
export const ayahText = (a: Ayah) => a.w.map((w) => w.t).join(' ');
export const refStr = (s: number, a: number, w?: number) => (w ? `${s}:${a}:${w}` : `${s}:${a}`);
export const surahName = (n: number) => SURAHS[n - 1]?.tl || `Surah ${n}`;

// ---- audio ---------------------------------------------------------------------------------------
export const RECITERS: { id: string; name: string; note: string }[] = [
  { id: 'ar.husary', name: 'Mahmoud Khalil al-Husary', note: 'Slow, exact murattal — best for study' },
  { id: 'ar.minshawi', name: 'Muhammad Siddiq al-Minshawi', note: 'Measured murattal' },
  { id: 'ar.alafasy', name: 'Mishary Rashid Alafasy', note: 'Clear, moderate pace' },
  { id: 'ar.abdulbasitmurattal', name: 'Abdul Basit (murattal)', note: 'Classic murattal' },
  { id: 'ar.mahermuaiqly', name: 'Maher al-Muaiqly', note: 'Faster, prayer-style' },
  { id: 'everyayah:Husary_Muallim_128kbps', name: 'Al-Husary (Muallim / teaching)', note: 'Very slow, for memorisation' },
];
const p3 = (n: number) => String(n).padStart(3, '0');
export function ayahAudio(s: number, a: number, reciter = settings().reciter): string {
  if (reciter.startsWith('everyayah:')) return `https://everyayah.com/data/${reciter.slice(10)}/${p3(s)}${p3(a)}.mp3`;
  const bitrate = reciter === 'ar.abdulbasitmurattal' ? 192 : 128;
  return `https://cdn.islamic.network/quran/audio/${bitrate}/${reciter}/${SURAHS[s - 1].start + a}.mp3`;
}
// The Islamic Network CDN streams fine but does not allow cross-origin downloads, so offline copies of the
// same reciters are fetched from EveryAyah (which does) and stored under the streaming URL as the cache key.
const EVERYAYAH: Record<string, string> = { 'ar.husary': 'Husary_128kbps', 'ar.minshawi': 'Minshawy_Murattal_128kbps', 'ar.alafasy': 'Alafasy_128kbps', 'ar.abdulbasitmurattal': 'Abdul_Basit_Murattal_192kbps', 'ar.mahermuaiqly': 'MaherAlMuaiqly128kbps' };
export function ayahAudioDownload(s: number, a: number, reciter = settings().reciter): string {
  return EVERYAYAH[reciter] ? `https://everyayah.com/data/${EVERYAYAH[reciter]}/${p3(s)}${p3(a)}.mp3` : ayahAudio(s, a, reciter);
}
export const ayahAudioFallback = (s: number, a: number) => `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${SURAHS[s - 1].start + a}.mp3`;
export const wordAudio = (s: number, a: number, w: number) => `https://audio.qurancdn.com/wbw/${p3(s)}_${p3(a)}_${p3(w)}.mp3`;

// ---- tag decoding --------------------------------------------------------------------------------
export type F = { tag: string; set: Set<string>; root?: string; lem?: string; vf?: number; mood?: string; fam?: string; pref: boolean; suff: boolean };
export function parse(seg: Seg): F {
  const f: F = { tag: seg[1], set: new Set(), pref: false, suff: false };
  for (const p of seg[2].split('|')) {
    const i = p.indexOf(':');
    if (i < 0) { f.set.add(p); continue; }
    const k = p.slice(0, i), v = p.slice(i + 1);
    if (k === 'ROOT') f.root = v; else if (k === 'LEM') f.lem = v; else if (k === 'VF') f.vf = +v; else if (k === 'MOOD') f.mood = v; else if (k === 'FAM') f.fam = v;
  }
  f.pref = f.set.has('PREF'); f.suff = f.set.has('SUFF');
  return f;
}
/** The main segment of a word: the first one that is neither a prefix nor a suffix. */
export function stemOf(w: Word): { seg: Seg; f: F; i: number } | undefined {
  if (!w.s) return;
  for (let i = 0; i < w.s.length; i++) { const f = parse(w.s[i]); if (!f.pref && !f.suff) return { seg: w.s[i], f, i }; }
  const f = parse(w.s[0]);
  return { seg: w.s[0], f, i: 0 };
}
export const lexId = (f: F) => (f.lem ? `${f.lem}|${f.tag}` : undefined);

export const CASES: Record<string, [string, string, string]> = {
  NOM: ['marfūʿ (nominative)', 'مَرْفُوع', 'subject-type role; usually ends in ḍamma'],
  ACC: ['manṣūb (accusative)', 'مَنْصُوب', 'object-type role; usually ends in fatḥa'],
  GEN: ['majrūr (genitive)', 'مَجْرُور', 'after a preposition or as muḍāf ilayh; usually ends in kasra'],
};
export const MOODS: Record<string, [string, string]> = { IND: ['marfūʿ (indicative)', 'مَرْفُوع'], SUBJ: ['manṣūb (subjunctive)', 'مَنْصُوب'], JUS: ['majzūm (jussive)', 'مَجْزُوم'] };
export const FORMS = ['', 'I  فَعَلَ', 'II  فَعَّلَ', 'III  فَاعَلَ', 'IV  أَفْعَلَ', 'V  تَفَعَّلَ', 'VI  تَفَاعَلَ', 'VII  اِنْفَعَلَ', 'VIII  اِفْتَعَلَ', 'IX  اِفْعَلَّ', 'X  اِسْتَفْعَلَ', 'XI', 'XII'];
export const PERSON: Record<string, [string, string]> = {
  '1S': ['I', 'أَنَا'], '1P': ['we', 'نَحْنُ'], '2MS': ['you (m. sg.)', 'أَنْتَ'], '2FS': ['you (f. sg.)', 'أَنْتِ'], '2D': ['you two', 'أَنْتُمَا'], '2MD': ['you two (m.)', 'أَنْتُمَا'], '2FD': ['you two (f.)', 'أَنْتُمَا'],
  '2MP': ['you (m. pl.)', 'أَنْتُمْ'], '2FP': ['you (f. pl.)', 'أَنْتُنَّ'], '3MS': ['he / it', 'هُوَ'], '3FS': ['she / it', 'هِيَ'], '3D': ['they two', 'هُمَا'], '3MD': ['they two (m.)', 'هُمَا'], '3FD': ['they two (f.)', 'هُمَا'],
  '3MP': ['they (m.)', 'هُمْ'], '3FP': ['they (f.)', 'هُنَّ'],
};
const GN: Record<string, string> = { M: 'masculine', F: 'feminine', MS: 'masculine singular', FS: 'feminine singular', MD: 'masculine dual', FD: 'feminine dual', MP: 'masculine plural', FP: 'feminine plural', D: 'dual' };
/** Particle and noun sub-types: [English, Arabic term, what it does] */
export const KINDS: Record<string, [string, string, string]> = {
  P: ['preposition', 'حَرْف جَرّ', 'puts the following noun in the genitive (majrūr)'],
  DET: ['definite article', 'أَل التَّعْرِيف', 'makes the noun definite'],
  CONJ: ['conjunction', 'حَرْف عَطْف', 'joins to what came before; the joined word copies its case'],
  NEG: ['negative particle', 'حَرْف نَفْي', 'negates'],
  ACC: ['inna-family particle', 'حَرْف نَصْب (إِنَّ وأَخَوَاتُهَا)', 'its noun becomes manṣūb, its predicate stays marfūʿ'],
  COND: ['conditional particle', 'حَرْف شَرْط', 'sets up "if … then …"'],
  SUB: ['subordinating particle', 'حَرْف مَصْدَرِيّ', 'turns the following verb into "that …"; an makes the verb manṣūb'],
  CERT: ['particle of certainty', 'حَرْف تَحْقِيق', 'qad: "certainly / already"'],
  RES: ['restriction particle', 'أَدَاة حَصْر / اِسْتِثْنَاء', '"except / only"'],
  INTG: ['interrogative', 'اِسْتِفْهَام', 'asks a question'],
  VOC: ['vocative particle', 'حَرْف نِدَاء', 'calls someone: "O …"'],
  EMPH: ['emphatic lām', 'لَام التَّوْكِيد', 'adds emphasis'],
  FUT: ['future particle', 'حَرْف اِسْتِقْبَال', 'sa-/sawfa: "will"'],
  PRP: ['lām of purpose', 'لَام التَّعْلِيل', '"so that"; the verb after it is manṣūb'],
  REM: ['resumption particle', 'حَرْف اِسْتِئْنَاف', 'starts a new sentence'],
  RSLT: ['result particle', 'فَاء الجَوَاب', 'introduces the result of a condition'],
  CIRC: ['circumstantial wāw', 'وَاو الحَال', '"while …"'],
  AMD: ['amendment particle', 'حَرْف اِسْتِدْرَاك', '"but / rather"'],
  RET: ['retraction particle', 'حَرْف إِضْرَاب', 'bal: "rather / nay"'],
  PREV: ['preventive mā', 'مَا الكَافَّة', 'cancels the effect of inna (innamā)'],
  ANS: ['answer particle', 'حَرْف جَوَاب', 'yes / no'],
  EXP: ['exceptive / explanatory particle', 'حَرْف تَفْصِيل', 'separates items'],
  SUR: ['surprise particle', 'حَرْف فُجَاءَة', '"and behold"'],
  SUP: ['supplemental particle', 'حَرْف زَائِد', 'extra particle for emphasis'],
  AVR: ['aversion particle', 'حَرْف رَدْع', 'kallā: "by no means!"'],
  EXH: ['exhortation particle', 'حَرْف تَحْضِيض', '"why not …?"'],
  EXL: ['explanation particle', 'حَرْف تَفْسِير', 'explains'],
  INC: ['inceptive particle', 'حَرْف اِبْتِدَاء', 'opens a sentence'],
  EQ: ['equalisation particle', 'حَرْف تَسْوِيَة', '"whether … or"'],
  CAUS: ['causal particle', 'حَرْف سَبَبِيَّة', '"so that / because"'],
  COM: ['comitative wāw', 'وَاو المَعِيَّة', '"along with"'],
  ATT: ['attention particle', 'حَرْف تَنْبِيه', 'hā-: draws attention'],
  PRO: ['prohibition particle', 'لَا النَّاهِيَة', '"do not"; the verb after it is majzūm'],
  INT: ['interpretation particle', 'حَرْف تَفْسِير', '"that is"'],
  IMPN: ['imperative verbal noun', 'اِسْم فِعْل أَمْر', 'a noun used as a command'],
  PN: ['proper noun', 'عَلَم', 'a name'],
  ADJ: ['adjective', 'صِفَة / نَعْت', 'describes a noun and agrees with it'],
  PRON: ['pronoun', 'ضَمِير', 'stands in for a noun'],
  DEM: ['demonstrative', 'اِسْم إِشَارَة', '"this / that"'],
  REL: ['relative pronoun', 'اِسْم مَوْصُول', '"who / which / that"'],
  T: ['time adverb', 'ظَرْف زَمَان', 'tells when'],
  LOC: ['place adverb', 'ظَرْف مَكَان', 'tells where'],
  ACT_PCPL: ['active participle', 'اِسْم فَاعِل', 'the one who does the action'],
  PASS_PCPL: ['passive participle', 'اِسْم مَفْعُول', 'the one the action is done to'],
  VN: ['verbal noun', 'مَصْدَر', 'the action itself as a noun'],
  INL: ['disconnected letters', 'حُرُوف مُقَطَّعَة', 'opening letters of a surah'],
  PERF: ['past verb', 'فِعْل مَاضٍ', 'completed action'],
  IMPF: ['present / future verb', 'فِعْل مُضَارِع', 'ongoing or future action'],
  IMPV: ['command verb', 'فِعْل أَمْر', 'an order'],
};
export const TAGNAME: Record<string, [string, string]> = { N: ['noun (ism)', 'اِسْم'], V: ['verb (fiʿl)', 'فِعْل'], P: ['particle (ḥarf)', 'حَرْف'] };

export type Described = { role: 'prefix' | 'stem' | 'suffix'; form: string; title: string; ar: string; lines: string[]; f: F };
export function describe(seg: Seg, hostTag?: string): Described {
  const f = parse(seg);
  const role = f.pref ? 'prefix' : f.suff ? 'suffix' : 'stem';
  const lines: string[] = [];
  let title = TAGNAME[f.tag][0], ar = TAGNAME[f.tag][1];
  const sub = [...f.set].find((x) => KINDS[x] && x !== 'PREF' && x !== 'SUFF');
  if (f.tag === 'P') {
    const k = [...f.set].find((x) => KINDS[x]);
    if (k) { title = KINDS[k][0]; ar = KINDS[k][1]; lines.push(KINDS[k][2]); }
    if (f.fam) lines.push(`behaves like ${f.fam} and its sisters`);
  } else if (f.tag === 'V') {
    const tense = ['PERF', 'IMPF', 'IMPV'].find((x) => f.set.has(x))!;
    if (tense) { title = KINDS[tense][0]; ar = KINDS[tense][1]; lines.push(KINDS[tense][2]); }
    if (f.vf) lines.push(`Form ${FORMS[f.vf] || f.vf}`);
    if (f.set.has('PASS')) lines.push('passive voice (مَبْنِيّ لِلْمَجْهُول): the doer is not named');
    const p = Object.keys(PERSON).find((x) => f.set.has(x));
    if (p) lines.push(`doer: ${PERSON[p][0]} (${PERSON[p][1]})`);
    if (f.mood && tense === 'IMPF') lines.push(`mood: ${MOODS[f.mood]?.[0] || f.mood}`);
  } else {
    if (f.set.has('PRON')) {
      const p = Object.keys(PERSON).find((x) => f.set.has(x));
      title = f.suff ? 'attached pronoun' : 'pronoun'; ar = f.suff ? 'ضَمِير مُتَّصِل' : 'ضَمِير مُنْفَصِل';
      if (p) lines.push(`${PERSON[p][0]} (${PERSON[p][1]})`);
      if (f.suff) lines.push(hostTag === 'N' ? 'attached to a noun: possessor (muḍāf ilayh)' : hostTag === 'P' ? 'attached to a particle: governed by it' : 'attached to a verb: its subject or its object');
    } else if (sub) { title = KINDS[sub][0]; ar = KINDS[sub][1]; lines.push(KINDS[sub][2]); }
    if (f.set.has('ADJ') && sub !== 'ADJ') lines.push('used as an adjective (ṣifa)');
    const gn = Object.keys(GN).find((x) => f.set.has(x));
    if (gn && !f.set.has('PRON')) lines.push(GN[gn]);
    const c = Object.keys(CASES).find((x) => f.set.has(x));
    if (c) lines.push(`case: ${CASES[c][0]} — ${CASES[c][2]}`);
    if (f.set.has('INDEF')) lines.push('indefinite (nakira) — carries tanwīn');
    if (f.vf && f.vf > 1) lines.push(`derived from verb Form ${FORMS[f.vf]}`);
  }
  if (f.root) lines.push(`root: ${f.root.split('').join(' ')}`);
  return { role, form: seg[0], title, ar, lines, f };
}

/** Rule-derived structural hints. These are heuristics over verified tags, shown as hints, never as verified iʿrāb. */
export function hints(ay: Ayah, wi: number): string[] {
  const out: string[] = [];
  const w = ay.w[wi];
  if (!w?.s) return out;
  const st = stemOf(w)!;
  const pre = w.s.slice(0, st.i).map(parse);
  const prev = wi > 0 ? stemOf(ay.w[wi - 1]) : undefined;
  if (st.f.set.has('GEN')) {
    if (pre.some((p) => p.set.has('P'))) out.push('Majrūr because a preposition is attached to it (jārr wa majrūr).');
    else if (prev && prev.f.tag === 'P' && prev.f.set.has('P')) out.push('Majrūr because of the preposition before it (jārr wa majrūr).');
    else if (prev && prev.f.tag === 'N' && !prev.f.set.has('INDEF') && !st.f.set.has('ADJ')) out.push('Genitive right after a noun with no tanwīn: likely muḍāf ilayh of an iḍāfa.');
    else if (st.f.set.has('ADJ')) out.push('Adjective matching the genitive noun before it (naʿt follows its manʿūt).');
  }
  if (w.s.some((s) => { const f = parse(s); return f.suff && f.set.has('PRON'); }) && st.f.tag === 'N') out.push('Noun + attached pronoun: an iḍāfa; the pronoun is the muḍāf ilayh.');
  if (st.f.tag === 'V' && wi === 0) out.push('The ayah opens with a verb: a verbal sentence (jumla fiʿliyya).');
  if (st.f.set.has('ACC') && st.f.tag === 'P') out.push('Expect a manṣūb noun right after this particle (its ism), then a marfūʿ predicate (its khabar).');
  if (st.f.mood === 'JUS') out.push('Majzūm: look just before it for lam, lā of prohibition, or a conditional particle.');
  if (st.f.mood === 'SUBJ') out.push('Manṣūb verb: look just before it for an, lan, kay, ḥattā or the lām of purpose.');
  return out;
}
