import { useEffect, useMemo, useState } from 'react';
import { useDB, patch, markDone } from '../lib/db';
import { LESSONS, LESSON, STARTER_POOL } from '../content/curriculum';
import type { Lesson, Check } from '../content/types';
import { generate, type Q, type GenName } from '../lib/gen';
import { conjQ, VERBS, PERSONS, conj, dict, type Verb } from '../lib/conj';
import { lessonState, unlocked, PASS, pct, TAG_INFO } from '../lib/planner';
import { review, due, getCard, intervalText } from '../lib/srs';
import { shuffle } from '../lib/arabic';
import type { Surah } from '../lib/quran';
import { Page, Link, Ar, Mixed, Flag, Quiz, AyahWords, Report, ScoreLine, useStudyTimer, go, type QuizResult } from '../ui/core';
import { useSurahs, Loading, Tutor, Notes, Bookmark } from '../ui/hooks';

let cn = 0;
const checkQ = (l: Lesson, c: Check): Q => { const correct = c.options[c.answer]; const options = shuffle(c.options); return { id: `k${cn++}`, kind: 'mcq', tag: `${l.track}.concept.${l.id}`, prompt: c.q, ar: c.ar, options, optAr: c.optAr, answer: options.indexOf(correct), explain: c.why, ref: `lesson ${l.id}`, verified: false }; };
function build(l: Lesson, pool: Surah[], n: number, withChecks: boolean): Q[] {
  const fixed = withChecks ? l.checks.map((c) => checkQ(l, c)) : [];
  const cj = l.conj ? Array.from({ length: withChecks ? 3 : 4 }, () => conjQ(l.conj!)) : [];
  const gen = generate(l.gens, pool, Math.max(0, n - fixed.length - cj.length));
  return shuffle([...fixed, ...cj, ...gen]).slice(0, n);
}

function Conjugator({ tense }: { tense: 'perf' | 'impf' | 'impv' }) {
  const [v, setV] = useState<Verb>(VERBS[0]);
  return <div className="card flat"><div className="row between"><h3>Conjugator: sound Form I verbs</h3><Flag kind="rule" /></div>
    <div className="row" style={{ marginBottom: '.6rem' }}>{VERBS.map((x) => <button key={x.r.join('')} className={`btn sm ${x === v ? 'on' : ''}`} onClick={() => setV(x)}><Ar>{conj(x, 'perf', '3ms')}</Ar></button>)}</div>
    <p className="muted sm">Dictionary entry <Ar>{dict(v)}</Ar> “{v.en}”. Tables are computed by the regular rule; weak, doubled and hamzated verbs are taught separately.</p>
    <div className="tablewrap"><table><thead><tr><th>Doer</th><th>Pronoun</th><th>{tense === 'perf' ? 'Past' : tense === 'impf' ? 'Present' : 'Command'}</th></tr></thead>
      <tbody>{PERSONS.filter((p) => conj(v, tense, p[0])).map((p) => <tr key={p[0]}><td>{p[2]}</td><td><Ar>{p[1]}</Ar></td><td><Ar size={1.15}>{conj(v, tense, p[0])}</Ar></td></tr>)}</tbody></table></div></div>;
}

function Examples({ l, pool }: { l: Lesson; pool: Surah[] | null }) {
  const { data } = useSurahs([...new Set(l.examples.map((e) => +e.ref.split(':')[0]))]);
  if (!data) return <Loading />;
  return <>{l.examples.map((e, i) => { const [s, a] = e.ref.split(':').map(Number); const ay = data.find((x) => x.n === s)!.ayahs[a - 1]; return <div key={i} className="card flat" style={{ marginBottom: '.5rem' }}>
    <AyahWords words={ay.w.map((w) => w.t)} hi={e.hi.map((x) => x - 1)} size={1.55} />
    <div className="row between"><span className="sm"><Mixed text={e.note} /></span><span className="row"><Link to={`lab/${s}/${a}`} className="sm">{e.ref} in the Lab</Link><Flag kind="verified" /></span></div></div>; })}</>;
}

function LessonView({ l, mode }: { l: Lesson; mode?: string }) {
  useDB(); useStudyTimer(l.track);
  const { data: pool, error } = useSurahs(STARTER_POOL); const st = lessonState(l.id); const [res, setRes] = useState<QuizResult | null>(null); const [run, setRun] = useState(0);
  const qs = useMemo(() => (pool && mode ? build(l, pool, mode === 'check' ? 10 : mode === 'review' ? 4 : 8, mode === 'check') : []), [pool, mode, l.id, run]);
  useEffect(() => { setRes(null); }, [mode, l.id, run]);
  useEffect(() => { if (!mode && !st.read && unlocked(l)) patch(`lesson/${l.id}`, { read: true }); }, [l.id, mode]);
  const base = `${l.track}/${l.id}`;
  const done = (r: QuizResult) => {
    const score = r.correct / Math.max(1, r.total);
    if (mode === 'check') {
      const passed = score >= PASS;
      patch(`lesson/${l.id}`, { best: Math.max(st.best || 0, score), tries: (st.tries || 0) + 1, passed: st.passed || passed, failed: passed ? 0 : (st.failed || 0) + 1, passedAt: st.passed ? (st as any).passedAt : passed ? Date.now() : undefined });
      if (passed) review('grammar', l.id, 'apply', score >= 0.95 ? 4 : 3);
    } else if (mode === 'review') review('grammar', l.id, 'apply', score === 1 ? 3 : score >= 0.75 ? 2 : 1);
    markDone(l.track); setRes(r);
  };
  if (!unlocked(l)) return <div className="card"><h2>Locked</h2><p>This lesson builds on: {l.prereq.map((p) => <span key={p}><Link to={`${LESSON.get(p)!.track}/${p}`}>{LESSON.get(p)!.title}</Link>{' '}</span>)}. Pass their mastery checks first. Foundations cannot be skipped.</p></div>;
  if (mode) {
    if (!pool) return <Loading error={error} />;
    if (res) { const score = res.correct / Math.max(1, res.total); const passed = score >= PASS;
      return <div className="card" style={{ maxWidth: 760 }}>
        <h2>{mode === 'check' ? (passed ? 'Mastery check passed' : 'Not yet passed') : mode === 'review' ? 'Concept review recorded' : 'Practice complete'}</h2><ScoreLine r={res} />
        {mode === 'check' && !passed && <><p>Passing needs {Math.round(PASS * 100)}%. Here is the idea put another way:</p><div className="callout"><b>Another way to see it <Flag kind="authored" /></b><Mixed text={l.alt || 'Re-read the lesson, then try the practice drill before the next attempt.'} /></div></>}
        {mode === 'check' && passed && <p>The concept now enters spaced review. It comes back {getCard('grammar', l.id, 'apply') ? intervalText(getCard('grammar', l.id, 'apply')!) : 'soon'} as a short application drill, and again at growing intervals.</p>}
        {res.wrong.length > 0 && <><h3>What you missed</h3><ul>{res.wrong.map((q) => <li key={q.id}><Mixed text={q.explain.split('\n')[0]} /></li>)}</ul></>}
        <div className="row"><button className="btn primary" onClick={() => setRun(run + 1)}>{mode === 'check' && !passed ? 'Try the check again' : 'Another round'}</button><Link className="btn" to={base}>Back to the lesson</Link>{mode !== 'drill' && !passed && <Link className="btn" to={`${base}/drill`}>Practice first</Link>}</div></div>; }
    return <><p className="muted sm">{mode === 'check' ? `Mastery check: 10 questions, ${Math.round(PASS * 100)}% to pass. Authored concept questions plus words drawn from Al-Fātiḥa, Al-Mulk and Ar-Raḥmān.` : mode === 'review' ? 'Spaced review: four application questions.' : 'Practice: not graded towards the lesson.'}</p><Quiz key={run} questions={qs} mod={l.track} kind={mode} onDone={done} /></>;
  }
  return <div className="lesson">
    <div className="row" style={{ marginBottom: '.8rem' }}><span className={`chip ${st.passed ? 'mastered' : 'learning'}`}>{st.passed ? `passed · best ${pct(st.best)}` : st.tries ? `not yet passed · best ${pct(st.best)}` : 'not yet attempted'}</span><Bookmark id={`lesson:${l.id}`} label={l.title} /><Flag kind="authored" /></div>
    {l.status === 'outline' ? <div className="callout"><b>Explanation not yet written</b>The corpus-generated drills and mastery check for this topic work now. The written explanation is added through the content guide (docs/CONTENT-GUIDE.md).</div> : <>
      <p style={{ fontSize: '1.08rem' }}><b>Goal.</b> {l.goal}</p>
      {l.body.map((b, i) => <div key={i}>{b.h && <h3>{b.h}</h3>}{b.p && <p><Mixed text={b.p} /></p>}{b.table && <div className="tablewrap"><table><thead><tr>{b.table[0].map((h, k) => <th key={k}>{h}</th>)}</tr></thead><tbody>{b.table.slice(1).map((r, k) => <tr key={k}>{r.map((c, m) => <td key={m}><Mixed text={c} /></td>)}</tr>)}</tbody></table></div>}</div>)}
      {l.conj && <Conjugator tense={l.conj} />}
      <div className="callout"><b>Urdu bridge</b><Mixed text={l.urdu} /></div>
      <div className="callout"><b>Where Urdu speakers slip</b><Mixed text={l.pitfall} /></div>
      <h3>In the Quran</h3><Examples l={l} pool={pool} /></>}
    <div className="row" style={{ margin: '1.2rem 0' }}><Link className="btn" to={`${base}/drill`}>Practice drill</Link><Link className="btn primary" to={`${base}/check`}>{st.passed ? 'Retake mastery check' : 'Take the mastery check'}</Link></div>
    <Notes id={`lesson:${l.id}`} />
    <div style={{ marginTop: '1rem' }}><Tutor context={`Lesson: ${l.title} (${l.ar}). Goal: ${l.goal}\n${l.body.map((b) => [b.h, b.p, b.table?.map((r) => r.join(' | ')).join('\n')].filter(Boolean).join('\n')).join('\n')}`} /></div>
    <p style={{ marginTop: '1rem' }}><Report where={`lesson ${l.id}`} /></p>
  </div>;
}
function Targeted({ tag }: { tag: string }) {
  const info = TAG_INFO[tag]; const { data: pool, error } = useSurahs(STARTER_POOL); const [res, setRes] = useState<QuizResult | null>(null); const [run, setRun] = useState(0);
  useStudyTimer(tag.split('.')[0]);
  const qs = useMemo(() => (pool && info ? generate(info.gens as GenName[], pool, 10) : []), [pool, tag, run]);
  if (!info) return <p>Unknown drill.</p>; if (!pool) return <Loading error={error} />;
  if (res) return <div className="card"><h2>Targeted drill: {info.label}</h2><ScoreLine r={res} /><div className="row"><button className="btn primary" onClick={() => { setRes(null); setRun(run + 1); }}>Another ten</button>{info.lesson && <Link className="btn" to={`${LESSON.get(info.lesson)!.track}/${info.lesson}`}>Re-read the lesson</Link>}</div></div>;
  return <><p className="muted sm">Ten questions on one weak point, drawn from verified corpus tags.</p><Quiz key={run} questions={qs} mod={tag.split('.')[0]} kind="targeted" onDone={setRes} /></>;
}
export default function Grammar({ track, id, mode }: { track: 'sarf' | 'nahw'; id?: string; mode?: string }) {
  useDB(); const name = track === 'sarf' ? 'Ṣarf' : 'Naḥw'; const ar = track === 'sarf' ? 'الصَّرْف' : 'النَّحْو';
  if (id === 'drill' && mode) return <Page title={`${name}: targeted drill`} sub={<Link to={track}>← All {name} lessons</Link>}><Targeted tag={mode} /></Page>;
  const l = id ? LESSON.get(id) : undefined;
  if (l) return <Page title={`${l.track === 'nahw' ? 'N' : 'Ṣ'}${l.n}. ${l.title}`} ar={l.ar} sub={<Link to={track}>← All {name} lessons</Link>}><LessonView l={l} mode={mode} /></Page>;
  const ls = LESSONS.filter((x) => x.track === track); const dueIds = new Set(due('grammar').map((c) => c.id));
  return <Page title={name} ar={ar} sub={track === 'sarf' ? 'How words are built: roots, patterns, conjugation and the verb forms. The aim is to take an unfamiliar Quranic word apart.' : 'How words relate in a sentence: roles, case endings, and the particles that change them. Taught on real ayahs.'}>
    {ls.some((x) => dueIds.has(x.id)) && <div className="card accent" style={{ marginBottom: '1rem' }}><h3>Concept reviews due</h3><div className="row">{ls.filter((x) => dueIds.has(x.id)).map((x) => <Link key={x.id} className="btn sm" to={`${track}/${x.id}/review`}>{x.title}</Link>)}</div></div>}
    <div className="list">{ls.map((x) => { const st = lessonState(x.id); const open = unlocked(x); return <Link key={x.id} to={`${track}/${x.id}`} className={`lrow ${open ? '' : 'locked'}`}><span className="num">{x.n}</span><span><b>{x.title}</b> <Ar>{x.ar}</Ar><br /><span className="muted sm">Phase {x.phase}{x.status === 'outline' ? ' · drills only for now' : ''}{x.goal ? ` · ${x.goal}` : ''}</span></span><span className={`chip ${st.passed ? 'mastered' : open ? 'learning' : 'new'}`}>{st.passed ? 'passed' : open ? 'open' : 'locked'}</span></Link>; })}</div>
  </Page>;
}
