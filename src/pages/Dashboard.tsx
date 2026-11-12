import { useState } from 'react';
import { get, put, useDB, today, attempts } from '../lib/db';
import { dailyPlan, currentPhase, phaseProgress, streak, weakSpots, nextAssessment, competencies, currentLesson, hifzHealth, acc, pct } from '../lib/planner';
import { due } from '../lib/srs';
import { surahName } from '../lib/quran';
import { Page, Link, Ring, Stat, Bar, go } from '../ui/core';

export default function Dashboard() {
  useDB();
  const profile = get('set/profile'); const [name, setName] = useState('');
  const plan = dailyPlan(); const phase = currentPhase(); const pp = phaseProgress(phase); const st = streak(); const weak = weakSpots(); const na = nextAssessment(); const c = competencies();
  const total = plan.reduce((s, x) => s + x.minutes, 0); const spent = plan.reduce((s, x) => s + x.spent, 0); const doneN = plan.filter((x) => x.done).length;
  const lab = get('set/lab') || { s: 1, a: 1 }; const hh = hifzHealth();
  const t = attempts(1).filter((a) => a.t >= new Date().setHours(0, 0, 0, 0)); const tAcc = acc(t, () => true);
  const next = plan.find((x) => !x.done);
  if (!profile) return <Page title="Welcome" ar="أَهْلًا وَسَهْلًا" sub="A personal study environment for understanding the Quran directly in Arabic.">
    <div className="card" style={{ maxWidth: 640 }}>
      <h2>Before the first session</h2>
      <p>Your progress is stored on this device. Take a backup from Settings regularly, and use it to move to another device.</p>
      <p>The first task is a short placement diagnostic. It measures what you already recognise, so the plan starts from evidence, and words you already know are not taught as new.</p>
      <form className="row" onSubmit={(e) => { e.preventDefault(); put('set/profile', { name: name.trim() || 'Student', started: Date.now(), urdu: true, memorised: [67, 55] }); go('assessments/diagnostic'); }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" aria-label="Your name" /><button className="btn primary">Start with the diagnostic</button>
      </form>
    </div>
  </Page>;
  return <Page title={`As-salāmu ʿalaykum, ${profile.name}`} sub={<>Phase {phase.id}: {phase.title} · {phase.window}. {phase.aim}</>}>
    <div className="hero">
      <section>
        <div className="row between" style={{ marginBottom: '.6rem' }}><h2 style={{ margin: 0 }}>Today’s {total} minutes</h2><span className="muted sm">{spent} min studied · {doneN}/{plan.length} parts complete</span></div>
        <div className="plan">
          {plan.map((s) => <Link key={s.id} to={s.to} className={`seg ${s.done ? 'done' : ''}`}>
            <span className="min">{s.minutes}<small>MIN</small></span>
            <span><b>{s.title}</b><span className="muted sm">{s.detail}</span>{s.note && <span className="note"><br />{s.note}</span>}</span>
            <span className="muted sm">{s.done ? '✓ done' : s.spent ? `${s.spent} min` : ''}</span>
          </Link>)}
        </div>
        {next && <p style={{ marginTop: '.8rem' }}><Link to={next.to} className="btn primary">{spent ? 'Continue' : 'Begin'}: {next.title}</Link></p>}
        <div className="card flat" style={{ marginTop: '1rem' }}>
          <div className="eyebrow">Today’s measurable outcome</div>
          {tAcc.n ? <p style={{ margin: 0 }}>{tAcc.n} answers today, {pct(tAcc.rate)} correct. By ear: {pct(acc(t, (a) => a.mod === 'listen' || a.tag === 'vocab.listen').rate)} · Grammar: {pct(acc(t, (a) => /^(nahw|sarf)/.test(a.tag || '')).rate)} · Vocabulary: {pct(acc(t, (a) => a.mod === 'vocab').rate)}</p> : <p className="muted" style={{ margin: 0 }}>Nothing answered yet today. Each part ends with questions; the results appear here.</p>}
        </div>
      </section>
      <aside className="grid">
        <div className="card">
          <div className="eyebrow">Phase {phase.id} mastery</div>
          <div className="row"><Ring value={pp.overall} size={76} /><div className="grow">{pp.parts.map((p) => <div key={p.label} className="sm"><div className="row between"><span>{p.label}</span><span className="muted">{p.value}/{p.of}</span></div><Bar value={p.value} of={p.of} /></div>)}</div></div>
          <p className="muted sm" style={{ margin: '.6rem 0 0' }}>Measured from answers and retention, not from time or completed screens.</p>
        </div>
        <div className="card">
          <div className="eyebrow">This week</div>
          <div className="row between"><div className="dots" aria-label="Last seven days">{st.week.map((on, i) => <i key={i} className={on ? 'on' : ''} />)}</div><b>{st.days} day{st.days === 1 ? '' : 's'} running</b></div>
        </div>
        <div className="card">
          <div className="eyebrow">In progress</div>
          <dl className="kv">
            <dt>Naḥw</dt><dd>{currentLesson('nahw')?.title || 'all passed'}</dd>
            <dt>Ṣarf</dt><dd>{currentLesson('sarf')?.title || 'all passed'}</dd>
            <dt>Lab</dt><dd><Link to={`lab/${lab.s}/${lab.a}`}>{surahName(lab.s)} {lab.s}:{lab.a}</Link></dd>
            <dt>Vocabulary</dt><dd>{due('vocab').length} due · {c.vocab.introduced} introduced · {c.vocab.mastered} mastered</dd>
            <dt>Ḥifẓ</dt><dd>{hh.dueN} due · last 14 days {pct(hh.rate)}</dd>
          </dl>
        </div>
        <div className="card">
          <div className="eyebrow">Assessments</div>
          {na.diagnostic ? <p><Link to="assessments/diagnostic">Placement diagnostic</Link> — not taken yet.</p> : <>
            <p style={{ margin: 0 }}>Weekly: {na.weekly <= 0 ? <Link to="assessments/weekly">due now</Link> : `in ${na.weekly} day${na.weekly === 1 ? '' : 's'}`}</p>
            <p style={{ margin: 0 }}>Monthly: {na.monthly <= 0 ? <Link to="assessments/monthly">due now</Link> : `in ${na.monthly} days`}</p></>}
        </div>
      </aside>
    </div>
    {weak.length > 0 && <section style={{ marginTop: '1.4rem' }}>
      <h2>Weak spots to repair</h2>
      <div className="grid g3">{weak.slice(0, 3).map((w) => <div key={w.tag} className="card accent"><b>{w.label}</b><p className="muted sm">{pct(w.rate)} correct over {w.n} recent answers.</p><Link className="btn sm" to={`${w.tag.split('.')[0]}/drill/${w.tag}`}>Targeted drill</Link></div>)}</div>
    </section>}
    <section style={{ marginTop: '1.4rem' }} className="grid g4">
      <Stat n={c.wordsRecognised} label="words recognised" sub={`≈ ${pct(c.tokenCoverage)} of running Quranic words`} />
      <Stat n={c.wordsRecalled} label="words recalled unaided" />
      <Stat n={c.roots} label="roots recognised" sub="of about 1,650" />
      <Stat n={c.lessonsPassed} label="grammar structures passed" />
    </section>
  </Page>;
}
