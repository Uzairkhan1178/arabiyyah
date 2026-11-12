import { useDB, get, list, attempts } from '../lib/db';
import { competencies, weakSpots, weakRoots, acc, pct, currentPhase, phaseProgress, hifzHealth, listeningGap } from '../lib/planner';
import { getCard, cards } from '../lib/srs';
import { stemOf, lexId, surahName } from '../lib/quran';
import { FAMILIAR } from '../content/curriculum';
import { Page, Link, Stat, Bar, Ar } from '../ui/core';
import { useSurahs } from '../ui/hooks';

function Minutes() {
  const days = Array.from({ length: 28 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (27 - i)); const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; const r = get(`day/${k}`); return { d, m: r ? (Object.values(r.min || {}).reduce((s: number, x: any) => s + x, 0) as number) : 0 }; });
  const max = Math.max(60, ...days.map((x) => x.m)); const W = 560, H = 130, bw = W / 28;
  return <svg viewBox={`0 0 ${W} ${H + 18}`} className="chart" role="img" aria-label="Minutes studied per day, last 28 days">
    <line x1="0" x2={W} y1={H - (60 / max) * H} y2={H - (60 / max) * H} className="goal" /><text x={W - 2} y={H - (60 / max) * H - 3} textAnchor="end">60 min</text>
    {days.map((x, i) => <g key={i}><rect x={i * bw + 3} y={H - (x.m / max) * H} width={bw - 6} height={(x.m / max) * H} rx="2"><title>{x.d.toLocaleDateString()}: {Math.round(x.m)} min</title></rect>{i % 7 === 6 && <text x={i * bw + bw / 2} y={H + 13} textAnchor="middle">{x.d.getDate()}/{x.d.getMonth() + 1}</text>}</g>)}
  </svg>;
}
function Coverage() {
  const { data } = useSurahs(FAMILIAR);
  if (!data) return <p className="muted sm">Loading passages…</p>;
  return <>{data.map((su) => { let tot = 0, known = 0, met = 0; for (const ay of su.ayahs) for (const w of ay.w) { tot++; const st = stemOf(w); const id = st && lexId(st.f); if (!id) continue; const c = getCard('vocab', id, 'rec'); if (c && c.reps > 0) met++; if (c && c.state === 2 && c.stability >= 7) known++; }
    return <div key={su.n} style={{ marginBottom: '.7rem' }}><div className="row between"><b>{su.tl}</b><span className="muted sm">{pct(known / tot)} of its {tot} words securely recognised · {pct(met / tot)} introduced</span></div><Bar value={known} of={tot} /></div>; })}</>;
}
export default function Progress() {
  useDB(); const c = competencies(); const weak = weakSpots(); const roots = weakRoots(); const as = attempts(30); const ph = currentPhase(); const pp = phaseProgress(ph); const hh = hifzHealth(); const g = listeningGap();
  const dims = (['rec', 'recall', 'ctx', 'listen'] as const).map((d) => ({ d, r: acc(as, (a) => a.tag === `vocab.${d}`) }));
  const row = (label: string, r: { n: number; rate: number | null }) => <tr key={label}><td>{label}</td><td style={{ width: '40%' }}><Bar value={r.rate || 0} /></td><td>{pct(r.rate)}</td><td className="muted sm">{r.n} answers</td></tr>;
  return <Page title="Progress and Analytics" ar="التَّقَدُّم" sub="Competence measured from answers and retention. Time is shown for consistency only; it earns nothing.">
    <div className="grid g4" style={{ marginBottom: '1.2rem' }}><Stat n={c.wordsRecognised} label="words recognised (stable)" sub={`≈ ${pct(c.tokenCoverage)} of running Quranic words`} /><Stat n={c.wordsRecalled} label="words recalled unaided" /><Stat n={c.roots} label="roots recognised" /><Stat n={c.lessonsPassed} label="grammar structures passed" /><Stat n={c.vocab.mastered} label="words mastered" sub="recall + context or ear" /><Stat n={pct(c.listening.rate)} label="listening accuracy" /><Stat n={pct(c.comprehension.rate)} label="ayah comprehension" /><Stat n={pct(c.hifz.rate)} label="ḥifẓ retention" /></div>
    <div className="grid g2">
      <div className="card"><h3>Accuracy by competence, last 30 days</h3><div className="tablewrap"><table><tbody>
        {dims.map((x) => row(`Vocabulary: ${{ rec: 'recognition', recall: 'recall', ctx: 'in context', listen: 'by ear' }[x.d]}`, x.r))}
        {row('Grammar application', c.grammar)}{row('Listening (words and ayahs)', c.listening)}{row('Ayah comprehension (Lab)', c.comprehension)}{row('Ḥifẓ revision', c.hifz)}{row('Unvowelled reading', c.reading)}{row('Conversation', c.conversation)}
      </tbody></table></div>{g.shift && <p className="sm">Listening trails reading by {Math.round(g.gap * 100)} points; the daily plan has shifted time to listening.</p>}</div>
      <div className="card"><h3>Study time, last 28 days</h3><Minutes /><p className="muted sm">Dashed line: the 60-minute target.</p>
        <h3 style={{ marginTop: '1rem' }}>Vocabulary by state</h3><div className="row">{(['learning', 'review', 'difficult', 'mastered'] as const).map((s) => <span key={s} className={`chip ${s}`}>{s}: {c.vocab[s]}</span>)}<span className="chip">introduced: {c.vocab.introduced}</span></div></div>
      <div className="card"><h3>Words recognised in your memorised surahs</h3><Coverage /><p className="muted sm">Memorising a surah and understanding it are tracked separately. This bar is understanding.</p></div>
      <div className="card"><h3>Phase {ph.id} gates</h3>{pp.parts.map((p) => <div key={p.label} style={{ marginBottom: '.5rem' }}><div className="row between"><span>{p.label}</span><span className="muted sm">{p.value} / {p.of}</span></div><Bar value={p.value} of={p.of} /></div>)}<p className="sm"><Link to="curriculum">See all gates</Link> · ḥifẓ: {hh.dueN} due, {pct(hh.rate)} over 14 days</p></div>
      <div className="card"><h3>Weak grammar points</h3>{weak.length ? <ul>{weak.map((w) => <li key={w.tag}>{w.label}: {pct(w.rate)} over {w.n} — <Link to={`${w.tag.split('.')[0]}/drill/${w.tag}`}>drill</Link></li>)}</ul> : <p className="muted">None flagged. A point is flagged below 70% over at least six recent answers.</p>}</div>
      <div className="card"><h3>Root families you miss</h3>{roots.length ? <ul>{roots.slice(0, 6).map((r) => <li key={r.root}><Ar>{r.root.split('').join(' ')}</Ar> — {r.fails} misses · <Link to="vocabulary/roots">study the family</Link></li>)}</ul> : <p className="muted">None flagged.</p>}</div>
    </div>
    <p className="muted sm" style={{ marginTop: '1rem' }}>{list('log').length} answers and {cards().length} scheduled items stored on this device. {list('bm').length} bookmarks · {list('note').length} notes.</p>
    {list('bm').length > 0 && <div className="card flat"><h3>Bookmarks</h3><div className="row">{list('bm').map((b) => <Link key={b.k} className="btn sm" to={b.id.startsWith('ayah:') ? `lab/${b.id.slice(5).replace(':', '/')}` : `${b.id.slice(7).startsWith('n') ? 'nahw' : 'sarf'}/${b.id.slice(7)}`}>{b.label}</Link>)}</div></div>}
  </Page>;
}
export { surahName };
