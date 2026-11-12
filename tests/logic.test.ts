import 'fake-indexeddb/auto';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { initDB, put, get, list, exportAll, importAll, wipeAll, logAttempt, setSettings } from '../src/lib/db';
import { review, ensureCard, getCard, vocabStatus, cardStatus, due, seed } from '../src/lib/srs';
import { GENS, wordsOf, generate, vocabRecQ, vocabCtxQ, type GenName } from '../src/lib/gen';
import { parse, stemOf, describe as describeSeg, type Surah, type Lex } from '../src/lib/quran';
import { conj, VERBS, conjQ } from '../src/lib/conj';
import { unvowel, stripHarakat } from '../src/lib/arabic';
import { wazn } from '../src/lib/vocab';
import { VOCAB_NOTES } from '../src/content/vocab';
import { LESSONS, LESSON, PHASES } from '../src/content/curriculum';
import { ANALYSES } from '../src/content/analyses';

const J = (p: string) => JSON.parse(readFileSync(p, 'utf8'));
const mulk: Surah = J('public/data/quran/67.json'); const rahman: Surah = J('public/data/quran/55.json'); const fatiha: Surah = J('public/data/quran/1.json');
const lex: Lex[] = J('public/data/lexicon.json'); const meta = J('public/data/meta.json');
const pool = [fatiha, mulk, rahman];
let dbn = 0;
beforeEach(async () => { await initDB('t' + dbn++); });

describe('Quran data integrity', () => {
  it('has 114 surahs and 6,236 ayahs', () => { expect(meta.surahs.length).toBe(114); expect(meta.surahs.reduce((s: number, x: any) => s + x.count, 0)).toBe(6236); });
  it('keeps Al-Mulk at 30 ayahs and Ar-Rahman at 78, basmala held separately', () => { expect(mulk.ayahs.length).toBe(30); expect(rahman.ayahs.length).toBe(78); expect(mulk.basmala!.split(' ').length).toBe(4); expect(mulk.ayahs[0].w[0].t).toBe('تَبَٰرَكَ'); expect(fatiha.basmala).toBeNull(); });
  it('the refrain of Ar-Rahman occurs 31 times, identical each time', () => { const r = rahman.ayahs.filter((a) => a.w.length === 4 && a.w[0].t.normalize('NFC') === 'فَبِأَىِّ'.normalize('NFC')); expect(r.length).toBe(31); expect(new Set(r.map((a) => a.w.map((w) => w.t).join(' '))).size).toBe(1); });
  it('corpus segments rebuild the Tanzil word for the three starter surahs', () => { let bad = 0, n = 0; for (const s of pool) for (const a of s.ayahs) for (const w of a.w) { n++; if (w.s!.map((x) => x[0]).join('') !== w.t) bad++; } expect(bad / n).toBeLessThan(0.01); });
  it('reports the four unaligned ayahs and never attaches grammar to them', () => { expect(meta.provenance.misaligned.length).toBe(4); const b = J('public/data/quran/2.json') as Surah; const ay = b.ayahs[180]; expect(ay.al).toBe(false); expect(ay.w.every((w) => !w.s)).toBe(true); });
});
describe('tag decoding', () => {
  it('reads 67:1 word 3 as preposition + genitive noun + pronoun', () => { const w = mulk.ayahs[0].w[2]; expect(w.s!.length).toBe(3); const st = stemOf(w)!; expect(st.f.root).toBe('يدي'); expect(st.f.set.has('GEN')).toBe(true); expect(describeSeg(w.s![0]).title).toBe('preposition'); expect(describeSeg(w.s![2], 'N').lines.join(' ')).toMatch(/possessor/); });
  it('reads the verb form of the first word of Al-Mulk as VI', () => { expect(parse(mulk.ayahs[0].w[0].s![0]).vf).toBe(6); });
});
describe('generated exercises are keyed to corpus tags', () => {
  const H = wordsOf(pool);
  for (const name of Object.keys(GENS) as GenName[]) it(`${name}: 40 questions have a consistent answer key`, () => {
    let made = 0;
    for (let i = 0; i < 40; i++) { const q = (GENS[name] as any)(H); if (!q) continue; made++;
      if (q.kind === 'mcq') { expect(q.answer).toBeGreaterThanOrEqual(0); expect(new Set(q.options).size).toBe(q.options.length); expect(q.options.length).toBeGreaterThanOrEqual(2); }
      else { expect(q.taps.length).toBeGreaterThan(0); q.taps.forEach((t: number) => expect(t).toBeLessThan(q.ayah.words.length)); } }
    expect(made).toBeGreaterThan(20);
  });
  it('case question on a known word gives the corpus case', () => { const only = wordsOf([{ ...mulk, ayahs: [mulk.ayahs[0]] }]).filter((h) => h.w.t === 'ٱلْمُلْكُ'); const q = GENS.case(only)!; expect(q.options![q.answer!]).toMatch(/marfūʿ/); });
  it('tap-the-verbs on 67:2 marks exactly the verbs', () => { const H2 = wordsOf([{ ...mulk, ayahs: [mulk.ayahs[1]] }]); const verbs = H2.filter((h) => h.f.tag === 'V').map((h) => h.wi); expect(verbs.length).toBe(2); });
  it('generate() returns distinct questions', () => { const qs = generate(['case', 'pos', 'tense'], pool, 12); expect(qs.length).toBe(12); expect(new Set(qs.map((q) => q.tag + q.ref)).size).toBe(12); });
  it('vocabulary questions carry the right answer', () => { const l = lex.find((x) => x.lem === 'خَلَقَ')!; const m = (x: Lex) => x.gl[0]?.[0] || ''; const q = vocabRecQ(l, lex, m); expect(q.options![q.answer!]).toBe(m(l)); const c = vocabCtxQ(l, mulk)!; expect(c.ayah!.words[c.ayah!.hi![0]]).toMatch(/خَلَق|خلق/); });
});
describe('conjugation rules (sound Form I)', () => {
  const k = VERBS[0], a = VERBS[2];
  it('past', () => { expect(conj(k, 'perf', '3ms')).toBe('كَتَبَ'); expect(conj(k, 'perf', '3mp')).toBe('كَتَبُوا'); expect(conj(k, 'perf', '1p')).toBe('كَتَبْنَا'); expect(conj(a, 'perf', '2ms')).toBe('عَلِمْتَ'); expect(conj(k, 'perf', '3fs')).toBe('كَتَبَتْ'); });
  it('present', () => { expect(conj(k, 'impf', '3ms')).toBe('يَكْتُبُ'); expect(conj(a, 'impf', '3mp')).toBe('يَعْلَمُونَ'); expect(conj(k, 'impf', '2fs')).toBe('تَكْتُبِينَ'); expect(conj(k, 'impf', '1p')).toBe('نَكْتُبُ'); });
  it('command', () => { expect(conj(k, 'impv', '2ms')).toBe('اُكْتُبْ'); expect(conj(a, 'impv', '2mp')).toBe('اِعْلَمُوا'); expect(conj(k, 'impv', '3ms')).toBeUndefined(); });
  it('drill has a unique right answer', () => { for (let i = 0; i < 50; i++) { const q = conjQ('perf'); expect(q.options!.filter((o) => o === q.options![q.answer!]).length).toBe(1); } });
});
describe('spaced repetition and mastery', () => {
  it('a new card is due now and moves into the future when answered well', () => { const c = ensureCard('vocab', 'x|N', 'rec'); expect(c.due).toBeLessThanOrEqual(Date.now()); const r = review('vocab', 'x|N', 'rec', 3); expect(r.due).toBeGreaterThan(Date.now()); expect(r.reps).toBe(1); });
  it('one correct answer is not mastery', () => { review('vocab', 'x|N', 'rec', 4); expect(vocabStatus('x|N')).not.toBe('mastered'); });
  it('recognition alone never becomes mastery, however strong', () => { let t = new Date(); for (let i = 0; i < 8; i++) { const c = review('vocab', 'y|N', 'rec', 3, t); t = new Date(c.due + 1000); } expect(getCard('vocab', 'y|N', 'rec')!.stability).toBeGreaterThan(21); expect(vocabStatus('y|N')).toBe('review'); });
  it('strong recall plus strong context is mastery', () => { for (const d of ['rec', 'recall', 'ctx'] as const) { let t = new Date(); for (let i = 0; i < 8; i++) { const c = review('vocab', 'z|N', d, 3, t); t = new Date(c.due + 1000); } } expect(vocabStatus('z|N')).toBe('mastered'); });
  it('repeated lapses mark a card difficult', () => { let t = new Date(); for (let i = 0; i < 4; i++) { let c = review('vocab', 'w|N', 'rec', 3, t); c = review('vocab', 'w|N', 'rec', 3, new Date(c.due + 1000)); c = review('vocab', 'w|N', 'rec', 1, new Date(c.due + 864e5 * 30)); t = new Date(c.due + 1000); } expect(cardStatus(getCard('vocab', 'w|N', 'rec'))).toBe('difficult'); });
  it('higher target retention schedules sooner', () => { setSettings({ retention: 0.85 }); let c = seed('vocab', 'r1|N', 'rec', true); const lo = c.due; setSettings({ retention: 0.93 }); c = seed('vocab', 'r2|N', 'rec', true); expect(c.due).toBeLessThan(lo); });
  it('due() lists only cards whose time has come', () => { ensureCard('vocab', 'a|N', 'rec'); review('vocab', 'b|N', 'rec', 4); expect(due('vocab').map((c) => c.id)).toEqual(['a|N']); });
});
describe('persistence and backup', () => {
  it('survives a restart of the database', async () => { const name = 'persist' + Math.random(); await initDB(name); put('note/a', { text: 'hello' }); review('hifz', '67:1', 'hifz', 3); await new Promise((r) => setTimeout(r, 30)); await initDB(name); expect(get('note/a')!.text).toBe('hello'); expect(getCard('hifz', '67:1', 'hifz')!.reps).toBe(1); });
  it('backup then wipe then restore brings everything back, without the API key', async () => { put('set/settings', { aiKey: 'sk-secret', newWords: 12 }); put('note/a', { text: 'x' }); logAttempt({ mod: 'vocab', kind: 'review', ok: true }); const dump = exportAll(); expect(dump).not.toContain('sk-secret'); await wipeAll(); expect(list('note').length).toBe(0); const r = await importAll(dump, 'merge'); expect(r.added).toBe(3); expect(get('note/a')!.text).toBe('x'); expect(get('set/settings')!.newWords).toBe(12); });
  it('merge keeps the newer copy of a record', async () => { put('note/a', { text: 'old' }); const dump = exportAll(); await new Promise((r) => setTimeout(r, 5)); put('note/a', { text: 'new' }); const r = await importAll(dump, 'merge'); expect(r.kept).toBe(1); expect(get('note/a')!.text).toBe('new'); });
  it('rejects a file that is not a backup', async () => { await expect(importAll('{"x":1}', 'merge')).rejects.toThrow(); });
});
describe('reading ladder', () => {
  const s = 'ذَهَبَ الطَّالِبُ إِلَى المَدْرَسَةِ.';
  it('stage 1 is untouched and stage 5 has no marks', () => { expect(unvowel(s, 1)).toBe(s); expect(unvowel(s, 5)).toBe('ذهب الطالب إلى المدرسة.'); });
  it('stage 4 keeps only shadda', () => { expect(unvowel(s, 4)).toBe('ذهب الطّالب إلى المدرسة.'); });
  it('stage 3 keeps shadda and the final vowel', () => { expect(unvowel(s, 3)).toBe('ذهبَ الطّالبُ إلى المدرسةِ.'); });
  it('each stage removes at least as much as the one before', () => { const marks = (t: string) => t.length - stripHarakat(t).length; for (let k = 1; k < 5; k++) expect(marks(unvowel(s, k + 1))).toBeLessThanOrEqual(marks(unvowel(s, k))); });
});
describe('authored content is wired to real data', () => {
  it('every curated vocabulary note matches a dictionary entry', () => { const ids = new Set(lex.map((l) => l.id.normalize('NFC'))); const miss = Object.keys(VOCAB_NOTES).filter((k) => !ids.has(k.normalize('NFC'))); expect(miss).toEqual([]); });
  it('every lesson example points at words that exist', () => { for (const l of LESSONS) for (const e of l.examples) { const [s, a] = e.ref.split(':').map(Number); const su: Surah = J(`public/data/quran/${s}.json`); const ay = su.ayahs[a - 1]; expect(ay, e.ref).toBeTruthy(); e.hi.forEach((h) => expect(ay.w[h - 1], `${l.id} ${e.ref} #${h}`).toBeTruthy()); } });
  it('lesson prerequisites exist and form no cycle', () => { const seen = new Set<string>(); const visit = (id: string, path: string[]) => { expect(path.includes(id), `cycle at ${id}`).toBe(false); const l = LESSON.get(id); expect(l, id).toBeTruthy(); l!.prereq.forEach((p) => visit(p, [...path, id])); seen.add(id); }; LESSONS.forEach((l) => visit(l.id, [])); expect(seen.size).toBe(LESSONS.length); });
  it('every lesson belongs to exactly one phase', () => { const all = PHASES.flatMap((p) => p.lessons); expect(new Set(all).size).toBe(all.length); expect([...all].sort()).toEqual(LESSONS.map((l) => l.id).sort()); });
  it('authored concept checks have a valid answer', () => { for (const l of LESSONS) for (const c of l.checks) { expect(c.answer).toBe(0); expect(new Set(c.options).size).toBe(c.options.length); } });
  it('authored sentence analyses reference real word positions', () => { for (const [ref, an] of Object.entries(ANALYSES)) { const [s, a] = ref.split(':').map(Number); const ay = (J(`public/data/quran/${s}.json`) as Surah).ayahs[a - 1]; const used = an.parts.flatMap((p) => p.w); used.forEach((w) => expect(ay.w[w - 1], `${ref} word ${w}`).toBeTruthy()); expect(new Set(used).size, `${ref} covers each word once`).toBe(ay.w.length); } });
  it('pattern rule gives fa3iil for a sound root and nothing for a weak one', () => { expect(wazn('عَلِيم', 'علم')).toBe('فَعِيل'); expect(wazn('قالَ', 'قول')).toBeNull(); });
});
