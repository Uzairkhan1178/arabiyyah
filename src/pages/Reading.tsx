import { useState } from 'react';
import { useDB, get, put, logAttempt, attempts } from '../lib/db';
import { PASSAGES, type Passage } from '../content/reading';
import { unvowel } from '../lib/arabic';
import { acc, pct } from '../lib/planner';
import { shuffle } from '../lib/arabic';
import { Page, Link, Ar, Flag, Report, useStudyTimer, speak, hasArabicVoice } from '../ui/core';

const STAGES = ['', 'Fully vowelled', 'Partially vowelled', 'Case endings and shadda only', 'Shadda only', 'Unvowelled'];
/** Stage reached: move up when the last 12 line-readings at the current stage are at least 85% clean. */
export function readingStage(): number {
  let st = get('set/reading')?.stage || 1;
  const r = acc(attempts(60).filter((a) => a.tag === `read.line.${st}`).slice(-12), () => true);
  if (r.n >= 12 && r.rate! >= 0.85 && st < 5) { st++; put('set/reading', { stage: st }); }
  return st;
}
function Run({ p, stage }: { p: Passage; stage: number }) {
  const [i, setI] = useState(0); const [shown, setShown] = useState(false); const [bad, setBad] = useState<number[]>([]); const [phase, setPhase] = useState<'lines' | 'amb' | 'qs' | 'done'>('lines'); const [sel, setSel] = useState<number | null>(null); const [qi, setQi] = useState(0); const [score, setScore] = useState({ lines: 0, clean: 0, q: 0, qok: 0 });
  const [ambOpts] = useState(() => shuffle(p.amb.options.map((o, k) => ({ o, k })))); const [qOpts, setQOpts] = useState(() => shuffle(p.qs[0].options.map((o, k) => ({ o, k }))));
  if (phase === 'lines') { const ln = p.lines[i]; const words = ln.ar.split(' ');
    return <div className="grid" style={{ maxWidth: 760 }}><p className="muted sm">Line {i + 1} of {p.lines.length} · Stage {stage}: {STAGES[stage]}</p>
      <p className="prompt">Read this line aloud with full vowels, then check.</p>
      <div className="card"><div className="stim" dir="rtl"><Ar size={1.5}>{unvowel(ln.ar, stage)}</Ar></div></div>
      {!shown ? <button className="btn primary" onClick={() => setShown(true)}>Show the vowelled line</button> : <>
        <div className="card"><div dir="rtl" className="ayah ar" style={{ fontSize: '1.9em' }}>{words.map((w, k) => <button key={k} className={`w ${bad.includes(k) ? 'bad' : ''}`} onClick={() => setBad((b) => (b.includes(k) ? b.filter((x) => x !== k) : [...b, k]))}>{w}</button>)}</div><p style={{ textAlign: 'center' }}>{ln.en}</p>
          {hasArabicVoice() && <div className="row" style={{ justifyContent: 'center' }}><button className="btn sm" onClick={() => speak(ln.ar)}>▶ Device voice</button></div>}</div>
        <p className="muted sm">Tap any word you vowelled wrongly. {bad.length} marked.</p>
        <button className="btn primary" onClick={() => { logAttempt({ mod: 'read', kind: 'line', tag: `read.line.${stage}`, ok: bad.length === 0, ref: `${p.id}:${i}` }); setScore((s) => ({ ...s, lines: s.lines + 1, clean: s.clean + (bad.length === 0 ? 1 : 0) })); setBad([]); setShown(false); if (i + 1 < p.lines.length) setI(i + 1); else setPhase('amb'); }}>Record and continue</button></>}</div>; }
  if (phase === 'amb') { const a = p.amb; const right = ambOpts.findIndex((x) => x.k === a.answer);
    return <div className="grid" style={{ maxWidth: 760 }}><p className="prompt">Without vowels this word could be read several ways. Which reading fits the sentence?</p>
      <div className="card"><div className="stim" dir="rtl"><Ar size={1.4}>{unvowel(p.lines[a.line].ar, 5)}</Ar></div><p className="muted sm" style={{ textAlign: 'center' }}>The word: <Ar>{a.bare}</Ar></p></div>
      <div className="opts">{ambOpts.map((x, k) => <button key={k} disabled={sel !== null} className={`opt ${sel !== null && k === right ? 'ok' : ''} ${sel === k && k !== right ? 'bad' : ''}`} onClick={() => { setSel(k); logAttempt({ mod: 'read', kind: 'amb', tag: 'read.amb', ok: k === right, ref: p.id }); setScore((s) => ({ ...s, q: s.q + 1, qok: s.qok + (k === right ? 1 : 0) })); }}><Ar size={1.2}>{x.o[0]}</Ar><span>{x.o[1]}</span></button>)}</div>
      {sel !== null && <div className={`fb ${sel === right ? 'ok' : 'bad'}`}><p>{a.why}</p><div className="row between"><Flag kind="authored" /><button className="btn primary" onClick={() => { setSel(null); setPhase('qs'); }}>Continue</button></div></div>}</div>; }
  if (phase === 'qs') { const q = p.qs[qi]; const right = qOpts.findIndex((x) => x.k === q.answer);
    return <div className="grid" style={{ maxWidth: 760 }}><p className="muted sm">Comprehension {qi + 1} of {p.qs.length} — answer from the unvowelled text.</p>
      <div className="card flat" dir="rtl">{p.lines.map((l, k) => <p key={k} style={{ margin: 0 }}><Ar>{unvowel(l.ar, Math.max(stage, 4))}</Ar></p>)}</div><p className="prompt">{q.q}</p>
      <div className="opts">{qOpts.map((x, k) => <button key={k} disabled={sel !== null} className={`opt ${sel !== null && k === right ? 'ok' : ''} ${sel === k && k !== right ? 'bad' : ''}`} onClick={() => { setSel(k); logAttempt({ mod: 'read', kind: 'comp', tag: 'read.comp', ok: k === right, ref: p.id }); setScore((s) => ({ ...s, q: s.q + 1, qok: s.qok + (k === right ? 1 : 0) })); }}>{x.o}</button>)}</div>
      {sel !== null && <button className="btn primary" onClick={() => { setSel(null); if (qi + 1 < p.qs.length) { setQOpts(shuffle(p.qs[qi + 1].options.map((o, k) => ({ o, k })))); setQi(qi + 1); } else { put(`readdone/${p.id}`, { id: p.id, stage, t: Date.now() }); setPhase('done'); } }}>Continue</button>}</div>; }
  return <div className="card" style={{ maxWidth: 760 }}><h2>Passage complete</h2><p className="score"><b>{score.clean} / {score.lines}</b> lines read cleanly · <b>{score.qok} / {score.q}</b> questions right</p><div className="row"><Link className="btn primary" to="reading">More passages</Link></div><p style={{ marginTop: '.8rem' }}><Report where={`reading ${p.id}`} /></p></div>;
}
export default function Reading({ id }: { id?: string }) {
  useDB(); useStudyTimer('read'); const auto = readingStage(); const [stage, setStage] = useState(auto); const as = attempts(60);
  const p = PASSAGES.find((x) => x.id === id);
  if (p) return <Page title={p.title} sub={<><Link to="reading">← Reading practice</Link> · {p.focus}</>}><Run key={p.id + stage} p={p} stage={stage} /></Page>;
  return <Page title="Reading Practice" ar="القِرَاءَة" sub="Learning to read without vowel marks, using grammar and context to choose the right reading.">
    <div className="callout"><b>Quranic text is never unvowelled here</b>These passages are ordinary Modern Standard Arabic written for practice. Quranic recitation always uses the complete Uthmani text with its vowels; the app never asks you to guess it.</div>
    <div className="card" style={{ marginBottom: '1rem' }}><div className="row between"><div><div className="eyebrow">Your stage, from evidence</div><h2 style={{ margin: 0 }}>Stage {auto}: {STAGES[auto]}</h2><span className="muted sm">Clean lines at this stage: {pct(acc(as, (a) => a.tag === `read.line.${auto}`).rate)} · moves up at 85% over 12 lines · ambiguity questions {pct(acc(as, (a) => a.tag === 'read.amb').rate)}</span></div>
      <label>Practise at<select value={stage} onChange={(e) => setStage(+e.target.value)}>{[1, 2, 3, 4, 5].map((s) => <option key={s} value={s}>Stage {s}: {STAGES[s]}</option>)}</select></label></div></div>
    <div className="list">{PASSAGES.map((x, i) => { const d = get(`readdone/${x.id}`); return <Link key={x.id} to={`reading/${x.id}`} className="lrow"><span className="num">{i + 1}</span><span><b>{x.title}</b><br /><span className="muted sm">{x.focus} · {x.lines.length} lines</span></span><span className={`chip ${d ? 'review' : 'new'}`}>{d ? `done at stage ${d.stage}` : 'new'}</span></Link>; })}</div>
    <p className="muted sm" style={{ marginTop: '1rem' }}>Passages: <Flag kind="authored" /> Repeat a passage at a higher stage: the goal is to supply the vowels from your knowledge of patterns and case.</p>
  </Page>;
}
