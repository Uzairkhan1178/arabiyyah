// Root-recognition engine. Families, categories and answer keys come from the corpus (verified); the only
// authored part is the optional "core idea" note per root.
import { LEX, LEXMAP, ROOTS, loadSurah, wordAudio, stemOf, KINDS, FORMS, type Lex, type Surah } from './quran';
import { meaningOf, wazn } from './vocab';
import { shuffle, sample, pick } from './arabic';
import { cards, due, type CardRec } from './srs';
import { attempts } from './db';
import type { Q } from './gen';

export const sp = (r: string) => r.split('').join(' ');
export type Member = { l: Lex; cat: string; ar: string; order: number; pattern: string | null };
export function category(l: Lex): [string, string, number] {
  if (l.tag === 'V') return [`Verb, Form ${FORMS[+(l.vf || 1)]?.split('  ')[0] || l.vf}`, FORMS[+(l.vf || 1)]?.split('  ')[1] || 'فِعْل', +(l.vf || 1)];
  if (l.der === 'VN') return ['Verbal noun (the action itself)', KINDS.VN[1], 20];
  if (l.der === 'ACT_PCPL') return ['Doer noun (the one who does it)', KINDS.ACT_PCPL[1], 21];
  if (l.der === 'PASS_PCPL') return ['Done-to noun (the one it is done to)', KINDS.PASS_PCPL[1], 22];
  if (l.kind === 'ADJ') return ['Quality / adjective', KINDS.ADJ[1], 23];
  if (l.kind === 'PN') return ['Name', KINDS.PN[1], 30];
  return ['Noun', 'اِسْم', 24];
}
export function family(root: string): Member[] {
  return (ROOTS[root]?.l || []).map((id) => LEXMAP.get(id)!).filter(Boolean).map((l) => { const [cat, ar, order] = category(l); return { l, cat, ar, order, pattern: wazn(l.lem, root) }; }).sort((a, b) => a.order - b.order || b.l.n - a.l.n);
}
let study: string[] | null = null;
/** Three-letter roots with at least two derived words, most frequent first. */
export function studyRoots(): string[] {
  if (!study) study = Object.entries(ROOTS).filter(([r, v]) => r.length === 3 && v.l.length >= 2).sort((a, b) => b[1].n - a[1].n).map(([r]) => r);
  return study;
}
/** Roots that look alike: they share two letters (then one), so telling them apart takes real recognition. */
export function lookalikes(root: string, n: number): string[] {
  const share = (r: string) => [...new Set(r)].filter((c) => root.includes(c)).length;
  const all = studyRoots().filter((r) => r !== root);
  const two = all.filter((r) => share(r) >= 2), one = all.filter((r) => share(r) === 1);
  return [...sample(two, n), ...sample(one, n)].slice(0, n);
}
let qn = 0;
const mk = (q: Partial<Q> & { prompt: string; tag: string; explain: string }): Q => ({ id: `r${qn++}`, kind: 'mcq', verified: true, ...q } as Q);
function choice(tag: string, prompt: string, right: string, others: string[], extra: Partial<Q>): Q | undefined {
  const o = [...new Set(others)].filter((x) => x !== right).slice(0, 3); if (o.length < 2) return;
  const options = shuffle([right, ...o]);
  return mk({ tag, prompt, options, answer: options.indexOf(right), explain: '', ...extra });
}
export async function rootQuiz(root: string): Promise<Q[]> {
  const fam = family(root).filter((m) => m.l.kind !== 'PN'); const out: (Q | undefined)[] = []; if (!fam.length) return [];
  const alike = lookalikes(root, 6); const intruders = alike.flatMap((r) => family(r).slice(0, 2)).filter((m) => m.l.kind !== 'PN');
  const list = fam.map((m) => `${m.l.lem} (${meaningOf(m.l)})`).slice(0, 6).join(' · '); const item = `root:${root}`;
  const a = pick(fam);
  out.push(choice('root.member', `Which of these words comes from the root ${sp(root)}?`, a.l.lem, sample(intruders, 6).map((m) => m.l.lem), { optAr: true, item, explain: `${a.l.lem} is built on ${sp(root)} as a ${a.cat.toLowerCase()}. The family: ${list}.` }));
  if (fam.length >= 3) { const x = pick(intruders); if (x) out.push(choice('root.odd', `Three of these words share the root ${sp(root)}. Which one does NOT belong?`, x.l.lem, sample(fam, 3).map((m) => m.l.lem), { optAr: true, item, explain: `${x.l.lem} comes from ${sp(x.l.root!)} (${meaningOf(x.l)}). The others belong to ${sp(root)}.` })); }
  const b = pick(fam.filter((m) => m.l.id !== a.l.id).length ? fam.filter((m) => m.l.id !== a.l.id) : fam);
  out.push(choice('root.of', 'Which root is this word built on?', sp(root), alike.map(sp), { ar: b.l.lem, big: true, optAr: true, item, explain: `${b.l.lem} “${meaningOf(b.l)}” — root ${sp(root)}${b.pattern ? `, pattern ${b.pattern}` : ''}.` }));
  const c = pick(fam); const near = LEX.filter((x) => x.tag === c.l.tag && x.root !== root && Math.abs(x.rank - c.l.rank) < 200);
  out.push(choice('root.meaning', `This word is a ${c.cat.toLowerCase()} from the root ${sp(root)}. What does it mean?`, meaningOf(c.l), sample(near, 8).map(meaningOf), { ar: c.l.lem, big: true, item, explain: `${c.l.lem}: ${meaningOf(c.l)}. ${c.l.n}× in the Quran.` }));
  const withRef = fam.filter((m) => m.l.refs.length);
  if (withRef.length) {
    const d = pick(withRef); const [s, ay, w] = d.l.refs[0].split(':').map(Number);
    out.push(choice('root.ear', 'Listen to one word. Which root is it built on?', sp(root), alike.map(sp), { audio: wordAudio(s, ay, w), optAr: true, item, ref: d.l.refs[0], explain: `You heard a form of ${d.l.lem} (${meaningOf(d.l)}) from ${s}:${ay}.` }));
    try {
      const e = pick(withRef); const [s2, a2] = e.l.refs[0].split(':').map(Number); const su: Surah = await loadSurah(s2); const ayah = su.ayahs[a2 - 1];
      const taps = ayah.w.map((x, i) => (stemOf(x)?.f.root === root ? i : -1)).filter((i) => i >= 0);
      if (ayah.al !== false && ayah.w.length <= 16 && ayah.w.length >= 3 && taps.length) out.push(mk({ kind: 'tap', tag: 'root.spot', prompt: `Tap every word in this ayah that comes from the root ${sp(root)}.`, ayah: { s: s2, a: a2, words: ayah.w.map((x) => x.t) }, taps, item, ref: `${s2}:${a2}`, explain: taps.map((i) => `${ayah.w[i].t} — “${ayah.w[i].g}”`).join('\n') }));
    } catch { /* surah not available offline: skip the in-ayah question */ }
  }
  return shuffle(out.filter(Boolean) as Q[]);
}
export const rootCard = (root: string) => cards('root').find((c) => c.id === root) as CardRec | undefined;
export function rootQueue(newPerDay = 2): { due: string[]; fresh: string[] } {
  const have = new Set(cards('root').map((c) => c.id)); const start = new Date().setHours(0, 0, 0, 0);
  const introduced = attempts(2).filter((a) => a.kind === 'root-intro' && a.t >= start).length;
  return { due: due('root').slice(0, 6).map((c) => c.id), fresh: studyRoots().filter((r) => !have.has(r)).slice(0, Math.max(0, newPerDay - introduced)) };
}
