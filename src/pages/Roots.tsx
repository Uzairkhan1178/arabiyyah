import { useEffect, useMemo, useState } from 'react';
import { useDB, logAttempt, markDone, attempts } from '../lib/db';
import { ROOTS, surahName, wordAudio, type Lex } from '../lib/quran';
import { family, studyRoots, rootQuiz, rootCard, rootQueue, sp } from '../lib/roots';
import { ROOT_NOTES } from '../content/roots';
import { review, cardStatus, intervalText, due } from '../lib/srs';
import { meaningOf, noteOf } from '../lib/vocab';
import { weakRoots, acc, pct } from '../lib/planner';
import { norm } from '../lib/arabic';
import type { Q } from '../lib/gen';
import { Link, Ar, Ur, Flag, Quiz, ScoreLine, AudioBtn, AudioError, Report, useStudyTimer, go, type QuizResult } from '../ui/core';

const to = (r: string) => `vocabulary/root/${encodeURIComponent(r)}`;
function Run({ root, onDone }: { root: string; onDone: (r: QuizResult) => void }) {
  const [qs, setQs] = useState<Q[] | null>(null);
  useEffect(() => { let live = true; setQs(null); rootQuiz(root).then((q) => live && setQs(q)); return () => { live = false; }; }, [root]);
  if (!qs) return <p className="muted">Preparing questions…</p>;
  return <Quiz key={root} questions={qs} mod="vocab" kind="root" onDone={(r) => { const s = r.correct / Math.max(1, r.total); review('root', root, 'rec', s >= 0.9 ? 3 : s >= 0.7 ? 2 : 1); onDone(r); }} />;
}
export function RootFamily({ root }: { root: string }) {
  const fam = family(root); const note = ROOT_NOTES[root]; const groups = [...new Set(fam.map((m) => m.cat))];
  return <div className="card">
    <div className="row between"><div className="stim big" style={{ textAlign: 'start' }}><Ar>{sp(root)}</Ar></div><div style={{ textAlign: 'end' }}><span className="chip">{ROOTS[root]?.n}× in the Quran · {fam.length} words</span><br /><span className={`chip ${cardStatus(rootCard(root))}`}>{cardStatus(rootCard(root))}</span></div></div>
    {note ? <><h2 style={{ marginBottom: '.2rem' }}>{note.idea}</h2><p className="muted sm">Core idea of the root <Flag kind="authored" />{note.note ? <> · {note.note}</> : null}</p></> : <p className="muted sm">No written core idea for this root yet. Read it from the family below: what do the meanings share?</p>}
    {groups.map((g) => <div key={g} style={{ marginTop: '.8rem' }}><div className="eyebrow">{g} · <Ar>{fam.find((m) => m.cat === g)!.ar}</Ar></div>
      <div className="tablewrap fam"><table><tbody>{fam.filter((m) => m.cat === g).map((m) => { const r = m.l.refs[0]?.split(':').map(Number); const n = noteOf(m.l); return <tr key={m.l.id}>
        <td style={{ whiteSpace: 'nowrap' }}><Link to={`vocabulary/word/${encodeURIComponent(m.l.id)}`}><Ar size={1.15}>{m.l.lem}</Ar></Link></td>
        <td>{meaningOf(m.l)}{n?.cognate ? <> · <Ur>{n.ur}</Ur></> : null}</td><td>{m.pattern ? <Ar>{m.pattern}</Ar> : <span className="muted sm">—</span>}</td><td className="muted sm">{m.l.n}×</td>
        <td className="sm">{r ? <span className="row"><Link to={`lab/${r[0]}/${r[1]}`}>{surahName(r[0])} {r[0]}:{r[1]}</Link><AudioBtn small url={wordAudio(r[0], r[1], r[2])} label="Hear" /></span> : null}</td></tr>; })}</tbody></table></div></div>)}
    <AudioError />
    <p className="muted sm">Words, counts and occurrences: <Flag kind="verified" /> · Patterns: <Flag kind="rule" /> (shown only when all three root letters are visible in the word). A root gives a field of meaning; each word’s own meaning comes from how the Quran uses it.</p>
    <Report where={`root ${root}`} />
  </div>;
}
export function RootPage({ root }: { root: string }) {
  useDB(); useStudyTimer('vocab'); const [mode, setMode] = useState<'study' | 'test'>('study'); const [res, setRes] = useState<QuizResult | null>(null); const c = rootCard(root);
  if (!ROOTS[root]) return <p>Unknown root.</p>;
  return <div style={{ maxWidth: 860 }}>
    {mode === 'study' ? <><RootFamily root={root} /><p style={{ marginTop: '.8rem' }}><button className="btn primary" onClick={() => { setRes(null); setMode('test'); }}>Test me on this family</button> {c && <span className="muted sm">Next review {intervalText(c)}</span>}</p></>
      : res ? <div className="card"><h2>Root {sp(root)}</h2><ScoreLine r={res} /><div className="row"><button className="btn" onClick={() => setMode('study')}>See the family again</button><Link className="btn" to="vocabulary/roots">All roots</Link></div></div>
      : <Run root={root} onDone={(r) => { markDone('roots'); setRes(r); }} />}
  </div>;
}
export function RootSession() {
  useDB(); useStudyTimer('vocab'); const [q] = useState(() => rootQueue()); const items = useMemo(() => [...q.due.map((r) => ({ r, fresh: false })), ...q.fresh.map((r) => ({ r, fresh: true }))], [q]);
  const [i, setI] = useState(0); const [studied, setStudied] = useState(false); const [tot, setTot] = useState({ n: 0, ok: 0 }); const it = items[i];
  if (!it) return <div className="card"><h2>{items.length ? 'Root session complete' : 'No root families due'}</h2>{tot.n > 0 && <p className="score"><b>{tot.ok} / {tot.n}</b> correct across {items.length} families</p>}<Link className="btn" to="vocabulary/roots">Root families</Link></div>;
  return <div style={{ maxWidth: 860 }}><p className="muted sm">Family {i + 1} of {items.length} · {it.fresh ? 'new root' : 'review'}</p>
    {it.fresh && !studied ? <><RootFamily root={it.r} /><p style={{ marginTop: '.8rem' }}><button className="btn primary" onClick={() => { logAttempt({ mod: 'vocab', kind: 'root-intro', ok: true, item: `root:${it.r}` }); setStudied(true); }}>Studied — test me</button></p></>
      : <Run root={it.r} onDone={(r) => { setTot((t) => ({ n: t.n + r.total, ok: t.ok + r.correct })); markDone('roots'); setStudied(false); setI(i + 1); }} />}</div>;
}
export function RootsTab() {
  useDB(); const [s, setS] = useState(''); const [n, setN] = useState(40); const weak = weakRoots(); const q = rootQueue(); const as = attempts(30);
  const all = useMemo(() => { const k = norm(s); return studyRoots().filter((r) => !s || norm(r).includes(k.replace(/\s/g, '')) || (ROOT_NOTES[r]?.idea || '').includes(s.toLowerCase()) || family(r).some((m) => meaningOf(m.l).toLowerCase().includes(s.toLowerCase()))); }, [s]);
  const chips = (r: string) => <div className="row">{family(r).slice(0, 8).map((m) => <span key={m.l.id} className="chip"><Ar>{m.l.lem}</Ar> {meaningOf(m.l)}</span>)}</div>;
  return <>
    <div className="card accent" style={{ marginBottom: '1rem' }}><div className="row between"><div><h2 style={{ margin: 0 }}>Root recognition</h2><span className="muted sm">{q.due.length} families due · {q.fresh.length} new today · {due('root').length ? '' : 'nothing overdue · '}last 30 days {pct(acc(as, (a) => (a.tag || '').startsWith('root.')).rate)}</span></div><button className="btn primary" onClick={() => go('vocabulary/rootsession')}>Start</button></div>
      <p className="muted sm" style={{ margin: '.5rem 0 0' }}>Each family is tested six ways: pick its member, spot the intruder, name the root of a word, predict a meaning from the root and the pattern, recognise it by ear, and find it inside an ayah. Look-alike roots are used as wrong answers on purpose.</p></div>
    {weak.length > 0 && <div className="card" style={{ marginBottom: '1rem' }}><h3>Families you keep missing</h3>{weak.slice(0, 5).map((w) => <div key={w.root} style={{ marginBottom: '.5rem' }}><Link to={to(w.root)}><b><Ar>{sp(w.root)}</Ar></b></Link> <span className="muted sm">{w.fails} misses</span>{chips(w.root)}</div>)}</div>}
    <input value={s} onChange={(e) => { setS(e.target.value); setN(40); }} placeholder="Search by root letters or by meaning" aria-label="Search roots" style={{ width: '100%', marginBottom: '.6rem' }} />
    <p className="muted sm">{all.length} three-letter roots with two or more words in the Quran, most frequent first.</p>
    <div className="list">{all.slice(0, n).map((r) => <Link key={r} to={to(r)} className="lrow rootrow"><span className="num"><Ar>{sp(r)}</Ar></span><span><b>{ROOT_NOTES[r]?.idea || meaningOf(family(r)[0].l)}</b><br />{chips(r)}</span><span style={{ textAlign: 'end' }}><span className="chip">{ROOTS[r].n}×</span><br /><span className={`chip ${cardStatus(rootCard(r))}`}>{cardStatus(rootCard(r))}</span></span></Link>)}</div>
    {all.length > n && <p><button className="btn" onClick={() => setN(n + 60)}>Show more</button></p>}
  </>;
}
