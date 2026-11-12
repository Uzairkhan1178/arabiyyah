import { useMemo, useState } from 'react';
import { useDB, put, list, attempts, today } from '../lib/db';
import { LEX, LEXMAP, wordAudio, ayahAudio, type Surah } from '../lib/quran';
import { generate, vocabRecQ, wordsOf, type Q, type GenName } from '../lib/gen';
import { seed, ensureCard, cards } from '../lib/srs';
import { meaningOf } from '../lib/vocab';
import { lessonState, nextAssessment, acc, pct, TAG_INFO, dailyPlan } from '../lib/planner';
import { LESSONS, STARTER_POOL } from '../content/curriculum';
import { shuffle, sample } from '../lib/arabic';
import { Page, Link, Quiz, ScoreLine, Stat, type QuizResult } from '../ui/core';
import { useSurahs, Loading } from '../ui/hooks';

const BANDS: [number, number][] = [[1, 50], [51, 150], [151, 300], [301, 600], [601, 1000]];
let n = 0;
function earQs(su: Surah, words: number, ayahs: number): Q[] {
  const H = wordsOf([su], 30).filter((h) => h.w.g && h.f.tag !== 'P'); const gl = [...new Set(H.map((h) => h.w.g!))];
  const w = sample(H, words).map((h) => { const options = shuffle([h.w.g!, ...sample(gl.filter((g) => g !== h.w.g), 3)]); return { id: `a${n++}`, kind: 'mcq', tag: 'listen.word', prompt: 'Listen. What does this word mean?', audio: wordAudio(su.n, h.ay.a, h.wi + 1), hideText: true, ayah: { s: su.n, a: h.ay.a, words: h.ay.w.map((x) => x.t), hi: [h.wi] }, options, answer: options.indexOf(h.w.g!), explain: `${h.w.t} — “${h.w.g}”.`, ref: `${su.n}:${h.ay.a}:${h.wi + 1}`, verified: true } as Q; });
  const short = (t: string) => (t.length > 170 ? t.slice(0, 168) + '…' : t);
  const a = sample(su.ayahs.filter((x) => x.w.length >= 4 && x.w.length <= 18), ayahs).map((ay) => { const options = shuffle([short(ay.en), ...sample(su.ayahs.filter((x) => x.en !== ay.en), 3).map((x) => short(x.en))]); return { id: `a${n++}`, kind: 'mcq', tag: 'listen.ayah', prompt: 'Listen with the text hidden. Which translation matches?', audio: ayahAudio(su.n, ay.a), hideText: true, ayah: { s: su.n, a: ay.a, words: ay.w.map((x) => x.t) }, options, answer: options.indexOf(short(ay.en)), explain: `${su.tl} ${su.n}:${ay.a}.`, ref: `${su.n}:${ay.a}`, verified: true } as Q; });
  return [...w, ...a];
}
function buildQs(kind: string, pool: Surah[]): Q[] {
  const mulk = pool.find((s) => s.n === 67)!;
  if (kind === 'diagnostic') {
    const v = BANDS.flatMap(([lo, hi]) => sample(LEX.filter((l) => l.rank >= lo && l.rank <= hi && l.kind !== 'PN'), 5).map((l) => vocabRecQ(l, LEX, meaningOf)));
    const g = generate(['pos', 'definite', 'case', 'tense', 'doer', 'root', 'pron', 'derived', 'particle', 'form', 'voice', 'mood'], pool, 12);
    return [...v, ...g, ...earQs(mulk, 4, 2)];
  }
  const seen = [...new Set(cards('vocab').map((c) => c.id))].map((id) => LEXMAP.get(id)!).filter(Boolean);
  const passed = LESSONS.filter((l) => lessonState(l.id).passed || lessonState(l.id).read);
  const gens = [...new Set(passed.flatMap((l) => l.gens))] as GenName[];
  const sizes = kind === 'monthly' ? { v: 15, g: 15, c: 4, w: 4, a: 2 } : { v: 8, g: 7, c: 2, w: 2, a: 1 };
  return [...sample(seen.length ? seen : LEX.slice(0, 50), sizes.v).map((l) => vocabRecQ(l, LEX, meaningOf)), ...generate(gens.length ? gens : ['pos', 'root'], pool, sizes.g), ...generate(['meaning'], pool, sizes.c), ...earQs(mulk, sizes.w, sizes.a)];
}
function sectionOf(tag: string) { return tag.startsWith('vocab') ? 'Vocabulary' : tag.startsWith('listen') ? 'Listening' : tag.startsWith('nahw') ? 'Naḥw' : tag.startsWith('sarf') ? 'Ṣarf' : 'Other'; }

function Run({ kind }: { kind: string }) {
  const { data, error } = useSurahs(STARTER_POOL); const [res, setRes] = useState<QuizResult | null>(null); const [est, setEst] = useState<number | null>(null);
  const qs = useMemo(() => (data ? buildQs(kind, data) : []), [data, kind]);
  if (!data) return <Loading error={error} />;
  const finish = (r: QuizResult) => {
    const sections: Record<string, [number, number]> = {};
    Object.entries(r.byTag).forEach(([t, [o, k]]) => { const s = (sections[sectionOf(t)] = sections[sectionOf(t)] || [0, 0]); s[0] += o; s[1] += k; });
    let known: number | null = null;
    if (kind === 'diagnostic') {
      // Estimate the known vocabulary per frequency band, corrected for guessing among four options.
      const wrong = new Set(r.wrong.map((q) => q.item)); known = 0;
      for (const [lo, hi] of BANDS) { const band = qs.filter((q) => q.tag === 'vocab.rec' && q.item && LEXMAP.get(q.item)!.rank >= lo && LEXMAP.get(q.item)!.rank <= hi); if (!band.length) continue; const p = band.filter((q) => !wrong.has(q.item)).length / band.length; known += Math.max(0, (p - 0.25) / 0.75) * (hi - lo + 1); }
      known = Math.round(known); setEst(known);
    }
    put(`assess/${Date.now()}`, { kind, t: Date.now(), correct: r.correct, total: r.total, sections, byTag: r.byTag, known }); setRes(r);
  };
  if (res) { const weak = Object.entries(res.byTag).filter(([t, [o, k]]) => TAG_INFO[t] && o / k < 0.6);
    return <div className="card" style={{ maxWidth: 760 }}><h2>{kind[0].toUpperCase() + kind.slice(1)} assessment recorded</h2><ScoreLine r={res} />
      <div className="tablewrap"><table><thead><tr><th>Area</th><th>Score</th></tr></thead><tbody>{Object.entries(res.byTag).map(([t, [o, k]]) => <tr key={t}><td>{TAG_INFO[t]?.label || sectionOf(t) + ' · ' + t.split('.')[1]}</td><td>{o} / {k}</td></tr>)}</tbody></table></div>
      {est !== null && <p>Estimated recognition vocabulary within the top 1,000 Quranic words: <b>about {est}</b>. Words you answered correctly start with a longer first interval and go straight to recall and in-context testing; they are not taught as new. The estimate is rough (five words per band) and is refined by daily reviews.</p>}
      {weak.length > 0 && <p>Lowest areas: {weak.map(([t]) => TAG_INFO[t].label).join(', ')}. These are normal starting points; the matching lessons come early in Phase A.</p>}
      <div className="row"><Link className="btn primary" to="">Go to today’s plan</Link><Link className="btn" to="assessments">Assessment history</Link></div></div>; }
  return <><p className="muted sm">{qs.length} questions. No hints, no translations. Answer from what you know now; guessing lowers the accuracy of your plan.</p>
    <Quiz questions={qs} mod="assess" kind={kind} onDone={finish} onAnswer={(q, ok) => { if (kind === 'diagnostic' && q.tag === 'vocab.rec' && q.item && ok) { seed('vocab', q.item, 'rec', true); ensureCard('vocab', q.item, 'recall'); ensureCard('vocab', q.item, 'ctx'); } }} /></>;
}
export default function Assessments({ kind }: { kind?: string }) {
  useDB(); const na = nextAssessment(); const hist = list('assess').sort((a, b) => b.t - a.t);
  if (kind && ['diagnostic', 'weekly', 'monthly'].includes(kind)) return <Page title={`${kind[0].toUpperCase() + kind.slice(1)} assessment`} sub={<Link to="assessments">← Assessments</Link>}><Run key={kind} kind={kind} /></Page>;
  const t = attempts(1).filter((a) => a.t >= new Date().setHours(0, 0, 0, 0)); const plan = dailyPlan();
  return <Page title="Assessments" ar="التَّقْوِيم" sub="Progress is judged by what you can do unaided. Assessment questions come from verified data and never show hints.">
    <div className="card" style={{ marginBottom: '1rem' }}><div className="eyebrow">Daily assessment · today</div>
      {t.length ? <div className="grid g4"><Stat n={pct(acc(t, () => true).rate)} label={`overall, ${t.length} answers`} /><Stat n={pct(acc(t, (a) => a.mod === 'vocab').rate)} label="vocabulary" /><Stat n={pct(acc(t, (a) => /^(nahw|sarf)/.test(a.tag || '')).rate)} label="grammar" /><Stat n={pct(acc(t, (a) => a.mod === 'listen' || a.tag === 'vocab.listen').rate)} label="by ear" /></div> : <p className="muted" style={{ margin: 0 }}>Built from every answer you give today. Nothing answered yet.</p>}
      <p className="muted sm" style={{ margin: '.6rem 0 0' }}>{plan.filter((p) => p.done).length} of {plan.length} parts of today’s plan complete · {Math.round(Object.values(today().min || {}).reduce((s: number, x: any) => s + x, 0) as number)} minutes studied.</p></div>
    <div className="list">
      <Link to="assessments/diagnostic" className="lrow"><span className="num">◎</span><span><b>Placement diagnostic</b><br /><span className="muted sm">43 questions: vocabulary across five frequency bands, grammar recognition, listening. Sets your starting point; repeat it periodically to re-measure.</span></span><span className={`chip ${na.diagnostic ? 'difficult' : 'review'}`}>{na.diagnostic ? 'not taken' : 'taken'}</span></Link>
      <Link to="assessments/weekly" className="lrow"><span className="num">7</span><span><b>Weekly assessment</b><br /><span className="muted sm">20 questions on what you have been taught so far.</span></span><span className={`chip ${na.weekly <= 0 ? 'difficult' : 'new'}`}>{na.weekly <= 0 ? 'due' : `in ${na.weekly} d`}</span></Link>
      <Link to="assessments/monthly" className="lrow"><span className="num">30</span><span><b>Monthly cumulative review</b><br /><span className="muted sm">40 questions across everything introduced since the start.</span></span><span className={`chip ${na.monthly <= 0 ? 'difficult' : 'new'}`}>{na.monthly <= 0 ? 'due' : `in ${na.monthly} d`}</span></Link>
    </div>
    <h2 style={{ marginTop: '1.4rem' }}>History</h2>
    {hist.length ? <div className="tablewrap"><table><thead><tr><th>Date</th><th>Type</th><th>Score</th><th>By area</th></tr></thead><tbody>{hist.map((h) => <tr key={h.k}><td>{new Date(h.t).toLocaleDateString()}</td><td>{h.kind}</td><td>{h.correct}/{h.total} ({pct(h.correct / h.total)})</td><td className="sm">{Object.entries(h.sections || {}).map(([s, v]: any) => `${s} ${v[0]}/${v[1]}`).join(' · ')}{h.known != null ? ` · ≈${h.known} words known` : ''}</td></tr>)}</tbody></table></div> : <p className="muted">No assessments yet.</p>}
  </Page>;
}
