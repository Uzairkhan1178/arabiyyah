import { useDB } from '../lib/db';
import { PHASES, WEEKS_A, LESSON, LESSONS } from '../content/curriculum';
import { lessonState, unlocked, currentPhase, phaseProgress, pct } from '../lib/planner';
import { Page, Link, Ar, Bar } from '../ui/core';

export default function Curriculum() {
  useDB(); const cur = currentPhase();
  const row = (id: string) => { const l = LESSON.get(id)!; const st = lessonState(id); return <Link key={id} to={`${l.track}/${l.id}`} className={`lrow ${unlocked(l) ? '' : 'locked'}`}>
    <span className="num">{l.track === 'nahw' ? 'N' : 'Ṣ'}{l.n}</span><span><b>{l.title}</b> <Ar>{l.ar}</Ar><br /><span className="muted sm">{l.prereq.length ? `Needs ${l.prereq.map((p) => (LESSON.get(p)!.track === 'nahw' ? 'N' : 'Ṣ') + LESSON.get(p)!.n).join(', ')}` : 'No prerequisite'}{l.status === 'outline' ? ' · drills ready, explanation not yet written' : ''}</span></span>
    <span className={`chip ${st.passed ? 'mastered' : unlocked(l) ? 'learning' : 'new'}`}>{st.passed ? `passed ${pct(st.best)}` : unlocked(l) ? (st.tries ? `best ${pct(st.best)}` : 'open') : 'locked'}</span></Link>; };
  return <Page title="My Curriculum" ar="المَنْهَج" sub="Two roadmaps. Dates are a pacing guide; you advance only by passing mastery checks, and no fluency date is promised.">
    {PHASES.map((p) => { const pp = phaseProgress(p); return <section key={p.id} className="card" style={{ marginBottom: '1rem' }}>
      <div className="row between"><div><div className="eyebrow">{p.id === 'A' ? 'Roadmap A' : 'Roadmap B'} · {p.window}{p.id === cur.id ? ' · current' : ''}</div><h2>Phase {p.id}: {p.title}</h2></div><div style={{ minWidth: 160 }}><Bar value={pp.overall} /><span className="muted sm">{pct(pp.overall)} of gates met</span></div></div>
      <p>{p.aim}</p>
      <dl className="kv"><dt>Vocabulary</dt><dd>top {p.vocabTo} words by Quranic frequency</dd><dt>Quran Lab</dt><dd>{p.lab}</dd><dt>Reading</dt><dd>{p.reading}</dd><dt>Listening</dt><dd>{p.listening}</dd></dl>
      <h3 style={{ marginTop: '1rem' }}>Lessons, in order</h3>
      <div className="list">{p.lessons.map(row)}</div>
      <h3 style={{ marginTop: '1rem' }}>Gates to leave this phase</h3>
      <ul>{p.gates.map((g) => <li key={g}>{g}</li>)}</ul>
      {p.id === 'A' && <><h3>Suggested pacing, weeks 1–7</h3><div className="tablewrap"><table><thead><tr><th>Week</th><th>Naḥw</th><th>Ṣarf</th><th>Quran Lab</th><th>Focus</th></tr></thead><tbody>{WEEKS_A.map((w) => <tr key={w.week}><td>{w.week}</td><td>{LESSON.get(w.nahw)!.title}</td><td>{LESSON.get(w.sarf)!.title}</td><td>{w.lab}</td><td>{w.focus}</td></tr>)}</tbody></table></div>
        <p className="muted sm">The numerical targets (250 recognised, 150 recalled) assume eight new words a day at 90% retention. They are recalculated from your diagnostic and your real review load; if reviews pile up, new words slow down automatically.</p></>}
    </section>; })}
    <p className="muted sm">{LESSONS.filter((l) => l.status === 'full').length} of {LESSONS.length} lessons have full written explanations. The others already have corpus-generated drills and mastery checks; their explanations are added through the content guide.</p>
  </Page>;
}
