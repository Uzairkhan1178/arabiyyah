// Spaced repetition on FSRS (ts-fsrs). One card per (item, skill dimension), so recognising a word,
// recalling it, understanding it in context and hearing it are scheduled — and judged — separately.
import { fsrs, generatorParameters, createEmptyCard, State, type Card, type Grade } from 'ts-fsrs';
import { get, put, list, settings, type Rec } from './db';

export type Dim = 'rec' | 'recall' | 'ctx' | 'listen' | 'apply' | 'comp' | 'hifz' | 'say';
export type CardRec = Rec & { type: string; id: string; dim: Dim; due: number; stability: number; difficulty: number; reps: number; lapses: number; state: number; last?: number; f: any };

export const DIM_LABEL: Record<string, string> = { rec: 'Recognition', recall: 'Recall', ctx: 'In context', listen: 'By ear', apply: 'Application', comp: 'Comprehension', hifz: 'Memorisation', say: 'Production' };

export const cardKey = (type: string, id: string, dim: Dim) => `card/${type}|${id}|${dim}`;
export const getCard = (type: string, id: string, dim: Dim) => get<CardRec>(cardKey(type, id, dim));

function sched() {
  const s = settings();
  return fsrs(generatorParameters({ request_retention: Math.min(0.97, Math.max(0.75, s.retention)), maximum_interval: 365, enable_fuzz: false }));
}
const ser = (c: Card) => ({ ...c, due: +new Date(c.due), last_review: c.last_review ? +new Date(c.last_review) : undefined });
const deser = (f: any): Card => ({ ...f, due: new Date(f.due), last_review: f.last_review ? new Date(f.last_review) : undefined });

export function ensureCard(type: string, id: string, dim: Dim, now = new Date()): CardRec {
  const cur = getCard(type, id, dim);
  if (cur) return cur;
  const f = ser(createEmptyCard(now));
  return put(cardKey(type, id, dim), { type, id, dim, f, due: f.due, stability: 0, difficulty: 0, reps: 0, lapses: 0, state: 0 }) as CardRec;
}

/** rating: 1 Again, 2 Hard, 3 Good, 4 Easy */
export function review(type: string, id: string, dim: Dim, rating: 1 | 2 | 3 | 4, now = new Date()): CardRec {
  const cur = ensureCard(type, id, dim, now);
  const { card } = sched().next(deser(cur.f), now, rating as Grade);
  const f = ser(card);
  return put(cardKey(type, id, dim), { type, id, dim, f, due: f.due, stability: card.stability, difficulty: card.difficulty, reps: card.reps, lapses: card.lapses, state: card.state, last: +now }) as CardRec;
}

/** Seed a card with an evidence-based head start (used after a diagnostic or hifz assessment). */
export function seed(type: string, id: string, dim: Dim, good: boolean, now = new Date()) {
  let c = review(type, id, dim, good ? 4 : 1, now);
  if (good) c = review(type, id, dim, 3, new Date(+now + 1000));
  return c;
}

export function cards(type?: string): CardRec[] {
  const all = list<CardRec>('card');
  return type ? all.filter((c) => c.type === type) : all;
}
export function due(type?: string, now = Date.now()): CardRec[] {
  return cards(type).filter((c) => c.due <= now).sort((a, b) => a.due - b.due);
}

export type Status = 'new' | 'learning' | 'review' | 'difficult' | 'mastered';
export function cardStatus(c?: CardRec): Status {
  if (!c || c.reps === 0) return 'new';
  if (c.lapses >= 3 || (c.reps >= 4 && c.difficulty >= 8.5)) return 'difficult';
  if (c.state !== State.Review || c.stability < 7) return 'learning';
  return 'review';
}
export const STRONG_DAYS = 21;
const strong = (c?: CardRec) => !!c && c.state === State.Review && c.stability >= STRONG_DAYS;

/** A word is mastered only when recall is strong AND at least one other kind of understanding is too. */
export function vocabStatus(id: string): Status {
  const d = (['rec', 'recall', 'ctx', 'listen'] as Dim[]).map((x) => getCard('vocab', id, x));
  if (!d.some((c) => c && c.reps > 0)) return 'new';
  if (strong(d[1]) && (strong(d[2]) || strong(d[3]))) return 'mastered';
  const st = d.filter(Boolean).map((c) => cardStatus(c));
  if (st.includes('difficult')) return 'difficult';
  if (st.includes('learning')) return 'learning';
  return 'review';
}
export function retrievability(c: CardRec, now = Date.now()): number {
  if (!c.last || !c.stability) return 0;
  const t = (now - c.last) / 864e5;
  return Math.pow(1 + (19 / 81) * (t / c.stability), -0.5);
}
export function intervalText(c: CardRec, now = Date.now()) {
  const d = (c.due - now) / 864e5;
  if (d <= 0) return 'due now';
  if (d < 1 / 24) return `in ${Math.max(1, Math.round(d * 1440))} min`;
  if (d < 1) return `in ${Math.round(d * 24)} h`;
  return `in ${Math.round(d)} d`;
}
