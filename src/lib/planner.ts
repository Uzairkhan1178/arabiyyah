// Daily plan, mastery gates, competencies and adaptation. Everything here is computed from stored
// evidence (attempt log + FSRS cards); nothing is awarded for time spent or for pressing "complete".
import { get, list, settings, attempts, today, type Attempt, DEFAULT_ALLOC } from './db';
import { cards, due, cardStatus, vocabStatus, getCard, type CardRec } from './srs';
import { LEX, LEXMAP } from './quran';
import { LESSONS, LESSON, PHASES, type Phase } from '../content/curriculum';
import type { Lesson } from '../content/types';
import type { GenName } from './gen';

export const PASS = 0.8;
export type LessonState = { best?: number; passed?: boolean; tries?: number; read?: boolean; failed?: number };
export const lessonState = (id: string): LessonState => get(`lesson/${id}`) || {};
export const unlocked = (l: Lesson) => l.prereq.every((p) => lessonState(p).passed);
export function currentLesson(track: 'nahw' | 'sarf'): Lesson | undefined {
  return LESSONS.filter((l) => l.track === track).find((l) => !lessonState(l.id).passed && unlocked(l));
}
export function currentPhase(): Phase {
  return PHASES.find((p) => p.lessons.some((id) => !lessonState(id).passed)) || PHASES[PHASES.length - 1];
}

// ---- accuracy helpers ----------------------------------------------------------------------------
export function acc(as: Attempt[], test: (a: Attempt) => boolean): { n: number; ok: number; rate: number | null } {
  const f = as.filter(test); const ok = f.filter((a) => a.ok).length;
  return { n: f.length, ok, rate: f.length ? ok / f.length : null };
}
const pre = (p: string) => (a: Attempt) => (a.tag || '').startsWith(p);

export const TAG_INFO: Record<string, { label: string; gens: GenName[]; lesson?: string }> = {
  'nahw.pos': { label: 'Ism / fiʿl / ḥarf', gens: ['pos', 'tapVerb'], lesson: 'n1' },
  'nahw.definite': { label: 'Definite vs indefinite', gens: ['definite'], lesson: 'n2' },
  'nahw.case': { label: 'Case endings', gens: ['case', 'tapMarfu', 'tapMansub', 'tapMajrur'], lesson: 'n3' },
  'nahw.jarr': { label: 'Prepositions', gens: ['tapJarr', 'tapMajrur'], lesson: 'n4' },
  'nahw.pron': { label: 'Attached pronouns', gens: ['pron', 'tapPron'], lesson: 'n8' },
  'nahw.particle': { label: 'Particles and their effects', gens: ['particle'], lesson: 'n4' },
  'nahw.mood': { label: 'Verb moods', gens: ['mood'], lesson: 'n15' },
  'sarf.root': { label: 'Finding the root', gens: ['root'], lesson: 's1' },
  'sarf.tense': { label: 'Past / present / command', gens: ['tense'], lesson: 's2' },
  'sarf.doer': { label: 'Doer inside the verb', gens: ['doer'], lesson: 's2' },
  'sarf.form': { label: 'Verb forms', gens: ['form'], lesson: 's9' },
  'sarf.derived': { label: 'Participles and maṣdar', gens: ['derived'], lesson: 's6' },
  'sarf.voice': { label: 'Active / passive', gens: ['voice'], lesson: 's8' },
  'sarf.gn': { label: 'Gender and number', gens: ['gn'], lesson: 's11' },
};
export type Weak = { tag: string; label: string; rate: number; n: number; gens: GenName[]; lesson?: string };
/** Concepts answered wrong often enough, recently enough, to deserve a targeted drill. */
export function weakSpots(days = 21): Weak[] {
  const as = attempts(days); const out: Weak[] = [];
  for (const [tag, info] of Object.entries(TAG_INFO)) {
    const r = acc(as, (a) => a.tag === tag);
    if (r.n >= 6 && r.rate! < 0.7) out.push({ tag, label: info.label, rate: r.rate!, n: r.n, gens: info.gens, lesson: info.lesson });
  }
  return out.sort((a, b) => a.rate - b.rate);
}
/** Root families with repeated vocabulary failures. */
export function weakRoots(days = 30): { root: string; fails: number; items: string[] }[] {
  const m = new Map<string, { fails: number; items: Set<string> }>();
  for (const a of attempts(days)) {
    if (a.ok || a.mod !== 'vocab' || !a.item) continue;
    const root = LEXMAP.get(a.item)?.root; if (!root) continue;
    const r = m.get(root) || { fails: 0, items: new Set<string>() }; r.fails++; r.items.add(a.item); m.set(root, r);
  }
  return [...m.entries()].filter(([, v]) => v.fails >= 3).map(([root, v]) => ({ root, fails: v.fails, items: [...v.items] })).sort((a, b) => b.fails - a.fails);
}
export function listeningGap(days = 21) {
  const as = attempts(days);
  const ear = acc(as, (a) => a.tag === 'vocab.listen' || a.mod === 'listen');
  const eye = acc(as, (a) => a.tag === 'vocab.rec' || a.tag === 'vocab.ctx');
  const gap = ear.rate !== null && eye.rate !== null && ear.n >= 12 && eye.n >= 12 ? eye.rate - ear.rate : 0;
  return { ear, eye, gap, shift: gap > 0.15 };
}
export function hifzHealth(days = 14) {
  const r = acc(attempts(days), (a) => a.mod === 'hifz' && a.kind === 'review');
  const dueN = due('hifz').length;
  // New memorisation is paused while revision is slipping or a backlog exists.
  const allowNew = (r.rate === null || r.n < 5 || r.rate >= 0.85) && dueN <= 12;
  return { ...r, dueN, allowNew, reason: !allowNew ? (dueN > 12 ? `${dueN} revisions are overdue` : `revision accuracy is ${Math.round((r.rate || 0) * 100)}%`) : '' };
}

// ---- vocabulary queue ----------------------------------------------------------------------------
export function vocabCounts() {
  const c = { new: 0, learning: 0, review: 0, difficult: 0, mastered: 0 };
  const seen = new Set(cards('vocab').map((x) => x.id));
  seen.forEach((id) => c[vocabStatus(id)]++);
  return { ...c, introduced: seen.size };
}
export function nextNewWords(n: number) {
  const seen = new Set(cards('vocab').map((x) => x.id));
  const cap = currentPhase().vocabTo;
  return LEX.filter((l) => l.rank <= cap + 50 && !seen.has(l.id)).slice(0, n);
}
export function introducedToday() {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  return attempts(2).filter((a) => a.kind === 'intro' && a.t >= +start).length;
}

// ---- daily plan ----------------------------------------------------------------------------------
export type Segment = { id: string; title: string; detail: string; to: string; minutes: number; spent: number; done: boolean; note?: string };
export function allocation() {
  const a = { ...DEFAULT_ALLOC, ...settings().alloc };
  const notes: Record<string, string> = {};
  const g = listeningGap();
  if (g.shift && a.vocab >= 6) { a.vocab -= 3; a.lab += 3; notes.lab = `+3 min listening: by-ear accuracy (${pct(g.ear.rate)}) trails reading (${pct(g.eye.rate)})`; }
  return { a, notes };
}
export const pct = (x: number | null | undefined) => (x === null || x === undefined ? '—' : `${Math.round(x * 100)}%`);
export function dailyPlan(): Segment[] {
  const { a, notes } = allocation(); const d = today(); const spent = (k: string) => Math.round(d.min?.[k] || 0); const done = (k: string) => !!d.done?.[k];
  const vDue = due('vocab').length; const newLeft = Math.max(0, settings().newWords - introducedToday());
  const ns = currentLesson('nahw'); const ss = currentLesson('sarf');
  const gDue = (t: string) => due('grammar').filter((c) => LESSON.get(c.id)?.track === t).length;
  const lab = get('set/lab') || { s: 1, a: 1 }; const hh = hifzHealth();
  const st = (l?: Lesson) => (l ? `${lessonState(l.id).read ? 'Mastery check' : 'Lesson'} ${l.n}: ${l.title}` : 'All lessons passed — review drills');
  return [
    { id: 'vocab', title: 'Vocabulary', detail: `${vDue} reviews due · ${newLeft} new words`, to: 'vocabulary', minutes: a.vocab, spent: spent('vocab'), done: done('vocab') },
    { id: 'sarf', title: 'Ṣarf', detail: `${st(ss)}${gDue('sarf') ? ` · ${gDue('sarf')} concept reviews` : ''}`, to: 'sarf', minutes: a.sarf, spent: spent('sarf'), done: done('sarf') },
    { id: 'nahw', title: 'Naḥw', detail: `${st(ns)}${gDue('nahw') ? ` · ${gDue('nahw')} concept reviews` : ''}`, to: 'nahw', minutes: a.nahw, spent: spent('nahw'), done: done('nahw') },
    { id: 'lab', title: 'Quran listening & comprehension', detail: `Lab: ${lab.s}:${lab.a} · then a listening drill`, to: 'lab', minutes: a.lab, spent: spent('lab') + spent('listen'), done: done('lab'), note: notes.lab },
    { id: 'hifz', title: 'Ḥifẓ & revision', detail: `${hh.dueN} ayahs due${hh.allowNew ? ` · up to ${settings().hifzNew} new` : ' · new memorisation paused'}`, to: 'hifz', minutes: a.hifz, spent: spent('hifz'), done: done('hifz'), note: hh.allowNew ? undefined : `Paused because ${hh.reason}` },
    { id: 'conv', title: 'Conversation', detail: 'Phrases and one short exchange', to: 'conversation', minutes: a.conv, spent: spent('conv'), done: done('conv') },
  ];
}
export function streak(): { days: number; week: boolean[] } {
  const dayMin = (off: number) => { const d = new Date(); d.setDate(d.getDate() - off); const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; const r = get(`day/${k}`); return r ? Object.values(r.min || {}).reduce((s: number, x: any) => s + x, 0) as number : 0; };
  let days = 0; for (let i = dayMin(0) >= 5 ? 0 : 1; i < 400 && dayMin(i) >= 5; i++) days++;
  return { days, week: [6, 5, 4, 3, 2, 1, 0].map((i) => dayMin(i) >= 5) };
}

// ---- competencies --------------------------------------------------------------------------------
const stable = (c?: CardRec) => !!c && c.state === 2 && c.stability >= 7;
export function competencies() {
  const vc = cards('vocab'); const as30 = attempts(30);
  const recog = vc.filter((c) => c.dim === 'rec' && stable(c)); const recall = vc.filter((c) => c.dim === 'recall' && stable(c));
  const roots = new Set(recog.map((c) => LEXMAP.get(c.id)?.root).filter(Boolean));
  const total = LEX.reduce((s, l) => s + l.n, 0);
  const cover = recog.reduce((s, c) => s + (LEXMAP.get(c.id)?.n || 0), 0) / total;
  const lessonsPassed = LESSONS.filter((l) => lessonState(l.id).passed).length;
  return {
    wordsRecognised: recog.length, wordsRecalled: recall.length, roots: roots.size, tokenCoverage: cover, lessonsPassed,
    vocab: vocabCounts(),
    listening: acc(as30, (a) => a.mod === 'listen' || a.tag === 'vocab.listen'),
    comprehension: acc(as30, pre('lab.')),
    grammar: acc(as30, (a) => /^(nahw|sarf)\./.test(a.tag || '')),
    hifz: acc(as30, (a) => a.mod === 'hifz' && a.kind === 'review'),
    reading: acc(as30, pre('read.')),
    conversation: acc(as30, pre('conv.')),
  };
}
export function phaseProgress(p: Phase = currentPhase()) {
  const c = competencies();
  const parts = [
    { label: 'Lessons passed', value: p.lessons.filter((id) => lessonState(id).passed).length, of: p.lessons.length },
    { label: 'Words recognised', value: Math.min(c.wordsRecognised, Math.round(p.vocabTo * 0.83)), of: Math.round(p.vocabTo * 0.83) },
    { label: 'Words recalled', value: Math.min(c.wordsRecalled, Math.round(p.vocabTo * 0.5)), of: Math.round(p.vocabTo * 0.5) },
  ];
  const overall = parts.reduce((s, x) => s + x.value / x.of, 0) / parts.length;
  return { parts, overall };
}
export function nextAssessment() {
  const done = list('assess').sort((a, b) => b.t - a.t);
  const last = (kind: string) => done.find((x) => x.kind === kind)?.t as number | undefined;
  const first = Math.min(...list('day').map((d) => +new Date(d.k.slice(4))), Date.now());
  const dueIn = (kind: string, every: number) => { const base = last(kind) ?? first; return Math.ceil((base + every * 864e5 - Date.now()) / 864e5); };
  return { diagnostic: !last('diagnostic'), weekly: dueIn('weekly', 7), monthly: dueIn('monthly', 30) };
}
export { getCard };
