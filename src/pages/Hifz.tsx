import { useEffect, useMemo, useRef, useState } from 'react';
import { useDB, get, put, del, list, patch, logAttempt, markDone, settings } from '../lib/db';
import { SURAHS, ayahAudio, ayahAudioFallback, loadSurah, type Surah, type Ayah } from '../lib/quran';
import { review, due, cards, getCard, cardStatus, retrievability, intervalText, type CardRec } from '../lib/srs';
import { hifzHealth, pct } from '../lib/planner';
import { shuffle, sample } from '../lib/arabic';
import { Page, Link, Ar, AyahWords, AudioBtn, AudioError, Stat, Bar, useStudyTimer, playAudio, stopAudio, go } from '../ui/core';
import { SurahSelect, Loading } from '../ui/hooks';

type Item = { s: number; a: number; why: 'due' | 'assess' | 'new'; mode: 'recall' | 'missing' | 'next' | 'learn' };
const tracked = () => { const t = list('hifzset'); return t.length ? t.sort((x, y) => x.addedAt - y.addedAt) : []; };
const cardOf = (s: number, a: number) => getCard('hifz', `${s}:${a}`, 'hifz');
function strength(s: number) { const cs = cards('hifz').filter((c) => c.id.startsWith(`${s}:`)); const n = SURAHS[s - 1].count; return { tested: cs.length, n, avg: cs.length ? cs.reduce((x, c) => x + retrievability(c), 0) / cs.length : 0, due: cs.filter((c) => c.due <= Date.now()).length }; }

function buildQueue(): Item[] {
  const q: Item[] = due('hifz').slice(0, 12).map((c) => { const [s, a] = c.id.split(':').map(Number); return { s, a, why: 'due' as const, mode: (['recall', 'missing', 'next'] as const)[c.reps % 3] }; });
  let assess = 6;
  for (const t of tracked()) { if (t.status !== 'memorised') continue; for (let a = 1; a <= SURAHS[t.s - 1].count && assess > 0; a++) if (!cardOf(t.s, a)) { q.push({ s: t.s, a, why: 'assess', mode: 'recall' }); assess--; } }
  if (hifzHealth().allowNew) { let nw = settings().hifzNew; for (const t of tracked()) { if (t.status !== 'learning') continue; for (let a = 1; a <= SURAHS[t.s - 1].count && nw > 0; a++) if (!cardOf(t.s, a)) { q.push({ s: t.s, a, why: 'new', mode: 'learn' }); nw--; } } }
  return q.map((it) => (it.mode === 'next' && it.a >= SURAHS[it.s - 1].count ? { ...it, mode: 'recall' as const } : it));
}
function record(it: Item, rating: 1 | 2 | 3 | 4, wrong: number[]) {
  review('hifz', `${it.s}:${it.a}`, 'hifz', rating);
  logAttempt({ mod: 'hifz', kind: it.why === 'due' ? 'review' : it.why, tag: `hifz.${it.mode}`, ok: rating >= 2, ref: `${it.s}:${it.a}` });
  wrong.forEach((w) => { const k = `mist/${it.s}:${it.a}:${w + 1}`; patch(k, { n: (get(k)?.n || 0) + 1, s: it.s, a: it.a, w: w + 1 }); });
}

function Recall({ su, it, onDone }: { su: Surah; it: Item; onDone: (r: 1 | 2 | 3 | 4, wrong: number[]) => void }) {
  const ay = su.ayahs[it.a - 1]; const prev = it.a > 1 ? su.ayahs[it.a - 2] : null; const [hint, setHint] = useState(false); const [shown, setShown] = useState(false); const [wrong, setWrong] = useState<number[]>([]);
  return <div className="grid">
    <div className="card flat"><div className="eyebrow">{prev ? `After ayah ${it.a - 1}` : `Start of ${su.tl}`}</div>{prev ? <AyahWords words={prev.w.map((w) => w.t)} size={1.5} /> : <p className="muted">Recite the first ayah{su.basmala ? ' after the basmala' : ''}.</p>}</div>
    <p className="prompt">Recite ayah {it.a} aloud from memory. Then reveal and check yourself word by word.</p>
    {!shown ? <>{hint && <div className="stim"><Ar q>{ay.w[0].t} …</Ar></div>}
      <div className="row"><button className="btn primary" onClick={() => setShown(true)}>Reveal the ayah</button>{!hint && <button className="btn" onClick={() => setHint(true)}>Give me the first word</button>}<button className="btn danger" onClick={() => { setShown(true); setWrong(ay.w.map((_, i) => i)); }}>I cannot recall it</button></div></>
      : <><div className="card"><AyahWords words={ay.w.map((w) => w.t)} picked={wrong} onTap={(i) => setWrong((x) => (x.includes(i) ? x.filter((k) => k !== i) : [...x, i]))} size={2} /><div className="row" style={{ justifyContent: 'center' }}><AudioBtn url={ayahAudio(it.s, it.a)} fallback={ayahAudioFallback(it.s, it.a)} label="Check against the recitation" /></div><AudioError /></div>
        <p className="muted sm">Tap every word you missed, changed or hesitated on. {wrong.length} marked{hint ? ' · first-word hint used' : ''}.</p>
        <div className="row">
          <button className="btn primary" onClick={() => onDone(wrong.length === 0 ? (hint ? 2 : 3) : wrong.length <= 2 ? 2 : 1, wrong)}>Record: {wrong.length === 0 ? (hint ? 'correct with a hint' : 'correct') : `${wrong.length} mistake${wrong.length > 1 ? 's' : ''}`}</button>
          {wrong.length === 0 && !hint && <button className="btn" onClick={() => onDone(4, [])}>Flawless and fluent</button>}
        </div></>}
  </div>;
}
function Missing({ su, it, onDone }: { su: Surah; it: Item; onDone: (r: 1 | 2 | 3 | 4, wrong: number[]) => void }) {
  const ay = su.ayahs[it.a - 1];
  const q = useMemo(() => { const wi = Math.floor(Math.random() * ay.w.length); const pool = [...new Set(su.ayahs.flatMap((x) => x.w.map((w) => w.t)))].filter((t) => t !== ay.w[wi].t); return { wi, options: shuffle([ay.w[wi].t, ...sample(pool, 3)]) }; }, [it.s, it.a]);
  const [sel, setSel] = useState<string | null>(null);
  return <div className="grid"><p className="prompt">Ayah {it.a}: which word is missing?</p>
    <div className="card"><AyahWords words={ay.w.map((w, i) => (i === q.wi && !sel ? '﹏﹏﹏' : w.t))} hi={[q.wi]} size={2} /></div>
    <div className="opts">{q.options.map((o) => <button key={o} disabled={!!sel} className={`opt ${sel && o === ay.w[q.wi].t ? 'ok' : ''} ${sel === o && o !== ay.w[q.wi].t ? 'bad' : ''}`} onClick={() => setSel(o)}><Ar q size={1.3}>{o}</Ar></button>)}</div>
    {sel && <button className="btn primary" autoFocus onClick={() => onDone(sel === ay.w[q.wi].t ? 3 : 1, sel === ay.w[q.wi].t ? [] : [q.wi])}>Continue</button>}</div>;
}
function Next({ su, it, onDone }: { su: Surah; it: Item; onDone: (r: 1 | 2 | 3 | 4, wrong: number[]) => void }) {
  const ay = su.ayahs[it.a - 1]; const nx = su.ayahs[it.a]; const head = (a: Ayah) => a.w.slice(0, 6).map((w) => w.t).join(' ') + (a.w.length > 6 ? ' …' : '');
  const options = useMemo(() => shuffle([nx, ...sample(su.ayahs.filter((x) => x.a !== nx.a && x.a !== ay.a && head(x) !== head(nx)), 3)]), [it.s, it.a]); const [sel, setSel] = useState<number | null>(null);
  return <div className="grid"><p className="prompt">Which ayah comes straight after this one?</p><div className="card flat"><AyahWords words={ay.w.map((w) => w.t)} size={1.6} /></div>
    <div className="opts" style={{ gridTemplateColumns: '1fr' }}>{options.map((o) => <button key={o.a} disabled={sel !== null} className={`opt ${sel !== null && o.a === nx.a ? 'ok' : ''} ${sel === o.a && o.a !== nx.a ? 'bad' : ''}`} onClick={() => setSel(o.a)} style={{ justifyContent: 'flex-end' }}><Ar q size={1.25}>{head(o)}</Ar></button>)}</div>
    {sel !== null && <button className="btn primary" autoFocus onClick={() => onDone(sel === nx.a ? 3 : 1, [])}>Continue</button>}</div>;
}
function Learn({ su, it, onDone }: { su: Surah; it: Item; onDone: (r: 1 | 2 | 3 | 4, wrong: number[]) => void }) {
  const ay = su.ayahs[it.a - 1]; const [stage, setStage] = useState(0); const [count, setCount] = useState(0); const [turn, setTurn] = useState(false); const run = useRef(0);
  useEffect(() => () => { run.current++; stopAudio(); }, []);
  const loop = async (times: number, gap: boolean) => { const my = ++run.current; for (let i = 0; i < times; i++) { if (my !== run.current) return; const t0 = Date.now(); setTurn(false); const ok = await playAudio(ayahAudio(it.s, it.a, 'everyayah:Husary_Muallim_128kbps'), { fallback: ayahAudio(it.s, it.a) }); if (!ok || my !== run.current) return; setCount((c) => c + 1); if (gap) { setTurn(true); await new Promise((r) => setTimeout(r, Math.max(2500, (Date.now() - t0) * 1.15))); } } setTurn(false); };
  if (stage === 2) return <Recall su={su} it={it} onDone={onDone} />;
  return <div className="grid"><div className="eyebrow">New ayah · {su.tl} {it.s}:{it.a}</div><div className="card"><AyahWords words={ay.w.map((w) => w.t)} size={2.1} /><p className="muted sm" style={{ textAlign: 'center' }}>{ay.en}</p></div><AudioError />
    {stage === 0 ? <><p className="prompt">1. Listen while reading, until the sound is familiar.</p><div className="row"><button className="btn primary" onClick={() => loop(3, false)}>▶ Play 3 times</button><button className="btn" disabled={count < 3} onClick={() => { run.current++; stopAudio(); setCount(0); setStage(1); }}>Next: listen and repeat</button><span className="muted sm">{count} plays</span></div></>
      : <><p className="prompt">2. Listen, then recite in the pause. {turn && <b>Your turn…</b>}</p><div className="row"><button className="btn primary" onClick={() => loop(5, true)}>▶ Five rounds with pauses</button><button className="btn" disabled={count < 3} onClick={() => { run.current++; stopAudio(); setStage(2); }}>Next: hide and recall</button><span className="muted sm">{count} rounds</span></div></>}
  </div>;
}

function Session() {
  const [queue] = useState<Item[]>(() => buildQueue()); const [i, setI] = useState(0); const [su, setSu] = useState<Surah | null>(null); const [stats, setStats] = useState({ n: 0, ok: 0 });
  const it = queue[i];
  useEffect(() => { let live = true; setSu(null); if (it) loadSurah(it.s).then((x) => live && setSu(x)).catch(() => {}); return () => { live = false; }; }, [it?.s, i]);
  if (!it) { if (stats.n) markDone('hifz'); const hh = hifzHealth();
    return <div className="card"><h2>{queue.length ? 'Revision complete' : 'Nothing due'}</h2>{stats.n > 0 && <p className="score"><b>{stats.ok} / {stats.n}</b> recalled correctly or with minor slips</p>}
      {!hh.allowNew && <p className="callout"><b>New memorisation is paused</b>{hh.reason}. Revision comes first; new ayahs resume when it recovers.</p>}<p><Link className="btn" to="hifz">Ḥifẓ overview</Link></p></div>; }
  if (!su) return <Loading />;
  const done = (r: 1 | 2 | 3 | 4, wrong: number[]) => { record(it, r, wrong); setStats((s) => ({ n: s.n + 1, ok: s.ok + (r >= 2 ? 1 : 0) })); setI(i + 1); };
  const C = it.mode === 'learn' ? Learn : it.mode === 'missing' ? Missing : it.mode === 'next' ? Next : Recall;
  return <div style={{ maxWidth: 760 }}><p className="muted sm">{i + 1} of {queue.length} · {su.tl} {it.s}:{it.a} · {it.why === 'due' ? 'scheduled revision' : it.why === 'assess' ? 'assessing existing memorisation' : 'new memorisation'}</p><C key={`${it.s}:${it.a}:${i}`} su={su} it={it} onDone={done} /></div>;
}

function Detail({ s }: { s: number }) {
  const st = strength(s); const t = get(`hifzset/${s}`); const ms = list('mist').filter((m) => m.s === s).sort((a, b) => b.n - a.n).slice(0, 12); const [su, setSu] = useState<Surah | null>(null);
  useEffect(() => { loadSurah(s).then(setSu).catch(() => {}); }, [s]);
  return <><p><Link to="hifz">← Ḥifẓ overview</Link></p>
    <div className="grid g4" style={{ marginBottom: '1rem' }}><Stat n={`${st.tested}/${st.n}`} label="ayahs with recall evidence" /><Stat n={pct(st.tested ? st.avg : null)} label="estimated recall today" /><Stat n={st.due} label="due now" /><Stat n={t?.status || '—'} label="status" /></div>
    <div className="card"><h3>Ayah by ayah</h3><div className="row">{Array.from({ length: st.n }, (_, k) => { const c = cardOf(s, k + 1); return <span key={k} className={`chip ${cardStatus(c)}`} title={c ? `stability ${c.stability.toFixed(1)} d · ${c.lapses} lapses · ${intervalText(c)}` : 'not yet tested'}>{k + 1}</span>; })}</div>
      <p className="muted sm" style={{ marginTop: '.6rem' }}>Grey ayahs have no recall evidence yet. Nothing counts as memorised until you have recited it from memory here.</p></div>
    {ms.length > 0 && <div className="card" style={{ marginTop: '1rem' }}><h3>Recurring mistakes</h3><div className="tablewrap"><table><tbody>{ms.map((m) => <tr key={m.k}><td>{m.s}:{m.a}</td><td><Ar q size={1.3}>{su?.ayahs[m.a - 1]?.w[m.w - 1]?.t}</Ar></td><td>{m.n}×</td><td><Link to={`lab/${m.s}/${m.a}`}>study in Lab</Link></td></tr>)}</tbody></table></div><p className="muted sm">Understanding a word makes it harder to drop. Open the ayah in the Lab.</p></div>}
    <p style={{ marginTop: '1rem' }}><button className="btn danger sm" onClick={() => { del(`hifzset/${s}`); go('hifz'); }}>Stop tracking this surah</button> <span className="muted sm">Review history is kept.</span></p></>;
}

export default function Hifz({ s, mode }: { s?: number; mode?: string }) {
  useDB(); useStudyTimer('hifz'); const [add, setAdd] = useState(78);
  useEffect(() => { if (!list('hifzset').length && !get('set/hifzInit')) { put('hifzset/67', { s: 67, status: 'memorised', addedAt: Date.now() }); put('hifzset/55', { s: 55, status: 'memorised', addedAt: Date.now() + 1 }); put('set/hifzInit', { done: true }); } }, []);
  const hh = hifzHealth(); const ts = tracked(); const q = buildQueue(); const s0 = settings();
  if (mode === 'session' || (s as any) === 0) return <Page title="Ḥifẓ session" ar="المُرَاجَعَة" sub={<Link to="hifz">← Overview</Link>}><Session /></Page>;
  if (s) return <Page title={`${SURAHS[s - 1].tl}`} ar={SURAHS[s - 1].ar}><Detail s={s} /></Page>;
  return <Page title="Ḥifẓ and revision" ar="الحِفْظ وَالمُرَاجَعَة" sub="Memorisation strength is measured by reciting from memory, and tracked apart from reading and from understanding.">
    <div className="card accent" style={{ marginBottom: '1rem' }}><div className="row between"><div><h2 style={{ margin: 0 }}>Today: {q.length} item{q.length === 1 ? '' : 's'}</h2><span className="muted sm">{q.filter((x) => x.why === 'due').length} revisions due · {q.filter((x) => x.why === 'assess').length} to assess · {q.filter((x) => x.why === 'new').length} new</span></div><Link className="btn primary" to="hifz/0/session">Start</Link></div>
      {!hh.allowNew && <p className="warn sm" style={{ margin: '.5rem 0 0' }}>New memorisation is paused: {hh.reason}.</p>}</div>
    <div className="grid g4" style={{ marginBottom: '1rem' }}><Stat n={pct(hh.rate)} label="revision accuracy, 14 days" /><Stat n={hh.dueN} label="ayahs due" /><Stat n={cards('hifz').length} label="ayahs with evidence" /><label>New ayahs per day<select value={s0.hifzNew} onChange={(e) => patch('set/settings', { hifzNew: +e.target.value })}>{[0, 1, 2, 3, 5].map((x) => <option key={x} value={x}>{x}</option>)}</select></label></div>
    <div className="list">{ts.map((t) => { const st = strength(t.s); return <Link key={t.s} to={`hifz/${t.s}`} className="lrow"><span className="num">{t.s}</span><span><b>{SURAHS[t.s - 1].tl}</b> <Ar>{SURAHS[t.s - 1].ar}</Ar><br /><span className="muted sm">{t.status === 'memorised' ? 'Reported as memorised' : 'Memorising'} · {st.tested}/{st.n} ayahs tested · estimated recall {pct(st.tested ? st.avg : null)}</span><Bar value={st.tested} of={st.n} /></span><span className="chip">{st.due} due</span></Link>; })}</div>
    <div className="card flat" style={{ marginTop: '1rem' }}><h3>Add a surah</h3><div className="row"><SurahSelect value={add} onChange={setAdd} /><button className="btn" onClick={() => put(`hifzset/${add}`, { s: add, status: 'learning', addedAt: Date.now() })}>I am memorising it</button><button className="btn" onClick={() => put(`hifzset/${add}`, { s: add, status: 'memorised', addedAt: Date.now() })}>I have memorised it — assess me</button></div>
      <p className="muted sm" style={{ marginTop: '.6rem' }}>A surah you report as memorised is assessed six ayahs a day by real recitation before it counts. New ayahs use the slow teaching recitation of al-Ḥuṣarī.</p></div>
  </Page>;
}
