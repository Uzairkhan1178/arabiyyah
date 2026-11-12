import { useEffect, useMemo, useState } from 'react';
import { useDB, logAttempt, markDone, settings } from '../lib/db';
import { LEX, LEXMAP, ROOTS, loadSurah, wordAudio, surahName, type Lex, type Surah, stemOf, lexId } from '../lib/quran';
import { due, review, seed, ensureCard, getCard, vocabStatus, cardStatus, intervalText, DIM_LABEL, type Dim, type CardRec } from '../lib/srs';
import { vocabRecQ, vocabCtxQ, vocabListenQ, type Q } from '../lib/gen';
import { nextNewWords, introducedToday, vocabCounts, weakRoots } from '../lib/planner';
import { noteOf, meaningOf, kindOf, wazn } from '../lib/vocab';
import { norm } from '../lib/arabic';
import { Page, Link, Ar, Ur, Flag, Quiz, AudioBtn, AudioError, AyahWords, Stat, useStudyTimer, Report, go } from '../ui/core';

type Item = { kind: 'intro'; l: Lex } | { kind: 'card'; l: Lex; dim: Dim; retry?: boolean; known?: boolean };

function Family({ l }: { l: Lex }) {
  if (!l.root || !ROOTS[l.root]) return null;
  const fam = ROOTS[l.root].l.map((id) => LEXMAP.get(id)!).filter((x) => x && x.id !== l.id).slice(0, 8);
  if (!fam.length) return null;
  return <div><div className="eyebrow">Same root {l.root.split('').join(' ')} · {ROOTS[l.root].n}× in the Quran</div>
    <div className="row">{fam.map((x) => <Link key={x.id} to={`vocabulary/word/${encodeURIComponent(x.id)}`} className="btn sm"><Ar>{x.lem}</Ar> <span className="muted sm">{meaningOf(x)}</span></Link>)}</div></div>;
}
function Examples({ l, max = 2 }: { l: Lex; max?: number }) {
  const [ex, setEx] = useState<{ s: number; a: number; w: number; su: Surah }[]>([]);
  useEffect(() => { let live = true; Promise.all(l.refs.slice(0, max).map(async (r) => { const [s, a, w] = r.split(':').map(Number); return { s, a, w, su: await loadSurah(s) }; })).then((x) => live && setEx(x)).catch(() => {}); return () => { live = false; }; }, [l.id]);
  return <>{ex.map((e) => { const ay = e.su.ayahs[e.a - 1]; return <div key={`${e.s}:${e.a}:${e.w}`} className="card flat" style={{ marginTop: '.5rem' }}>
    <AyahWords words={ay.w.map((x) => x.t)} hi={[e.w - 1]} size={1.5} />
    <div className="row between"><span className="sm">“{ay.w[e.w - 1].g}” · <i className="muted">{ay.w[e.w - 1].tr}</i> — <Link to={`lab/${e.s}/${e.a}`}>{surahName(e.s)} {e.s}:{e.a}</Link></span><span className="row"><AudioBtn small url={wordAudio(e.s, e.a, e.w)} label="Word" /><Flag kind="verified" /></span></div></div>; })}</>;
}
export function WordCard({ l, full }: { l: Lex; full?: boolean }) {
  const n = noteOf(l); const pat = wazn(l.lem, l.root);
  return <div className="card">
    <div className="row between"><div className="stim big" style={{ textAlign: 'start' }}><Ar>{l.lem}</Ar></div><div style={{ textAlign: 'end' }}><span className="chip">#{l.rank} · {l.n}×</span><br /><span className={`chip ${vocabStatus(l.id)}`}>{vocabStatus(l.id)}</span></div></div>
    <h2 style={{ marginBottom: '.2rem' }}>{meaningOf(l)}</h2>
    {n && <p style={{ margin: 0 }}><Ur>{n.ur}</Ur>{n.cognate && <span className="chip" style={{ marginInlineStart: '.5rem' }}>you know this word from Urdu</span>}</p>}
    <dl className="kv" style={{ margin: '.7rem 0' }}>
      <dt>Category</dt><dd>{kindOf(l)}</dd>
      {l.root && <><dt>Root</dt><dd><Ar>{l.root.split('').join(' ')}</Ar></dd></>}
      {pat && <><dt>Pattern</dt><dd><Ar>{pat}</Ar> <Flag kind="rule" /></dd></>}
      <dt>Rendered in the Quran as</dt><dd>{l.gl.slice(0, full ? 5 : 3).map(([g, k]) => `${g} (${k})`).join(' · ')} <Flag kind="verified" /></dd>
    </dl>
    {n?.note && <div className="callout"><b>Note <Flag kind="authored" /></b>{n.note}</div>}
    {n && !n.note && <p className="muted sm">Meaning and Urdu link: <Flag kind="authored" /></p>}
    <Family l={l} />
    <div className="eyebrow" style={{ marginTop: '.8rem' }}>In the Quran</div>
    <Examples l={l} max={full ? 4 : 2} /><AudioError />
    {full && <><div className="eyebrow" style={{ marginTop: '.8rem' }}>Your evidence, by kind of understanding</div>
      <div className="tablewrap"><table><tbody>{(['rec', 'recall', 'ctx', 'listen'] as Dim[]).map((d) => { const c = getCard('vocab', l.id, d); return <tr key={d}><td>{DIM_LABEL[d]}</td><td><span className={`chip ${cardStatus(c)}`}>{cardStatus(c)}</span></td><td className="muted sm">{c ? `${c.reps} reviews · ${c.lapses} lapses · stability ${c.stability.toFixed(1)} d · ${intervalText(c)}` : 'not started'}</td></tr>; })}</tbody></table></div>
      <p className="muted sm">Mastered means strong recall plus strong understanding in context or by ear. Recognising the word on a card is not enough.</p></>}
    <Report where={`word ${l.lem}`} />
  </div>;
}

function Session() {
  const [queue, setQueue] = useState<Item[] | null>(null); const [i, setI] = useState(0); const [q, setQ] = useState<Q | null>(null); const [show, setShow] = useState(false); const [stats, setStats] = useState({ n: 0, ok: 0, intro: 0 });
  useStudyTimer('vocab');
  useEffect(() => {
    const d: Item[] = due('vocab').slice(0, 40).map((c) => ({ kind: 'card' as const, l: LEXMAP.get(c.id)!, dim: c.dim })).filter((x) => x.l);
    const nw = nextNewWords(Math.max(0, settings().newWords - introducedToday()));
    // Too many reviews waiting: hold back new words so the load stays sustainable.
    const fresh: Item[] = d.length > 30 ? [] : nw.map((l) => ({ kind: 'intro' as const, l }));
    setQueue([...d, ...fresh]);
  }, []);
  const it = queue?.[i];
  useEffect(() => {
    let live = true; setQ(null); setShow(false);
    if (!it || it.kind !== 'card') return;
    const meaning = (x: Lex) => meaningOf(x);
    (async () => {
      if (it.dim === 'ctx') { try { const su = await loadSurah(+it.l.refs[0].split(':')[0]); const cq = vocabCtxQ(it.l, su); if (live) setQ(cq || vocabRecQ(it.l, LEX, meaning)); } catch { if (live) setQ(vocabRecQ(it.l, LEX, meaning)); } }
      else if (it.dim === 'listen') setQ(vocabListenQ(it.l, LEX) || vocabRecQ(it.l, LEX, meaning));
      else if (it.dim === 'rec') setQ(vocabRecQ(it.l, LEX, meaning));
    })();
    return () => { live = false; };
  }, [i, queue]);
  if (!queue) return <p className="muted">Preparing…</p>;
  const advance = () => setI((x) => x + 1);
  const grade = (item: Extract<Item, { kind: 'card' }>, rating: 1 | 2 | 3 | 4) => {
    const ok = rating > 1;
    // "I already know this word" + a correct answer is treated as prior knowledge: longer first interval, straight to deeper tests.
    const c = item.known && ok ? seed('vocab', item.l.id, 'rec', true) : review('vocab', item.l.id, item.dim, rating);
    setStats((s) => ({ ...s, n: s.n + 1, ok: s.ok + (ok ? 1 : 0) }));
    // Unlock deeper kinds of understanding only after the shallower one has held twice.
    if (ok && item.dim === 'rec' && c.reps >= 2) { ensureCard('vocab', item.l.id, 'recall'); ensureCard('vocab', item.l.id, 'ctx'); }
    if (ok && item.dim === 'recall' && c.reps >= 2) ensureCard('vocab', item.l.id, 'listen');
    if (!ok && !item.retry) setQueue((qq) => [...qq!, { ...item, retry: true }]);
  };
  if (!it) {
    if (stats.n || stats.intro) markDone('vocab');
    const c = vocabCounts();
    return <div className="card"><h2>{queue.length ? 'Session complete' : 'Nothing due right now'}</h2>
      {stats.n > 0 && <p className="score"><b>{stats.ok} / {stats.n}</b> correct · {stats.intro} new words introduced</p>}
      <div className="grid g4"><Stat n={c.introduced} label="introduced" /><Stat n={c.learning} label="learning" /><Stat n={c.review} label="in review" /><Stat n={c.difficult} label="difficult" /><Stat n={c.mastered} label="mastered" /></div>
      <p className="muted sm" style={{ marginTop: '.8rem' }}>Next reviews are scheduled by how well each word held. <Link to="vocabulary/browse">Browse all words</Link> or return to the <Link to="">dashboard</Link>.</p></div>;
  }
  const head = <div className="row between" style={{ marginBottom: '.8rem' }}><span className="muted sm">{i + 1} of {queue.length}{it.kind === 'card' ? ` · ${DIM_LABEL[it.dim]}` : ' · new word'}</span></div>;
  if (it.kind === 'intro') return <div style={{ maxWidth: 760 }}>{head}<WordCard l={it.l} />
    <p style={{ marginTop: '.8rem' }}><button className="btn primary" autoFocus onClick={() => { ensureCard('vocab', it.l.id, 'rec'); logAttempt({ mod: 'vocab', kind: 'intro', ok: true, item: it.l.id }); setStats((s) => ({ ...s, intro: s.intro + 1 })); setQueue((qq) => [...qq!, { kind: 'card', l: it.l, dim: 'rec' }]); advance(); }}>Studied — test me on it later in this session</button> <button className="btn" onClick={() => { ensureCard('vocab', it.l.id, 'rec'); logAttempt({ mod: 'vocab', kind: 'intro', ok: true, item: it.l.id }); setStats((s) => ({ ...s, intro: s.intro + 1 })); setQueue((qq) => { const next = [...qq!]; next.splice(i + 1, 0, { kind: 'card', l: it.l, dim: 'rec', known: true }); return next; }); advance(); }}>I already know this word — test me now</button></p></div>;
  if (it.dim === 'recall') return <div style={{ maxWidth: 760 }}>{head}
    <p className="prompt">Say the meaning to yourself, then reveal.</p>
    <div className="stim big"><Ar>{it.l.lem}</Ar></div>
    {!show ? <button className="btn primary" autoFocus onClick={() => setShow(true)}>Reveal</button> : <>
      <WordCard l={it.l} />
      <p className="prompt" style={{ marginTop: '.8rem' }}>How did your answer compare?</p>
      <div className="row">{([[1, 'I did not know it'], [2, 'Partly / slowly'], [3, 'Correct'], [4, 'Instant']] as const).map(([r, t]) => <button key={r} className={`btn ${r === 3 ? 'primary' : ''}`} onClick={() => { logAttempt({ mod: 'vocab', kind: 'review', tag: 'vocab.recall', ok: r > 1, item: it.l.id }); grade(it, r); advance(); }}>{t}</button>)}</div></>}
  </div>;
  if (!q) return <p className="muted">Loading…</p>;
  return <div>{head}<Quiz key={i} questions={[q]} mod="vocab" kind="review" onAnswer={(_q, ok, ms) => grade(it, ok ? (ms < 3000 ? 4 : 3) : 1)} onDone={advance} /></div>;
}

function Browse() {
  const [s, setS] = useState(''); const [f, setF] = useState('all'); const [n, setN] = useState(60);
  const rows = useMemo(() => { const k = norm(s); const kl = s.toLowerCase(); return LEX.filter((l) => (!s || norm(l.lem).includes(k) || meaningOf(l).toLowerCase().includes(kl) || (l.root && norm(l.root) === k)) && (f === 'all' || vocabStatus(l.id) === f)); }, [s, f]);
  return <>
    <div className="row" style={{ marginBottom: '.8rem' }}><input className="grow" value={s} onChange={(e) => { setS(e.target.value); setN(60); }} placeholder="Search Arabic, root or meaning" aria-label="Search words" />
      <select value={f} onChange={(e) => setF(e.target.value)} aria-label="Status">{['all', 'new', 'learning', 'review', 'difficult', 'mastered'].map((x) => <option key={x}>{x}</option>)}</select></div>
    <p className="muted sm">{rows.length} of {LEX.length} dictionary words, by Quranic frequency.</p>
    <div className="list">{rows.slice(0, n).map((l) => <Link key={l.id} to={`vocabulary/word/${encodeURIComponent(l.id)}`} className="lrow"><span className="num sm">{l.rank}</span><span><Ar>{l.lem}</Ar> <span>{meaningOf(l)}</span><br /><span className="muted sm">{kindOf(l)}{l.root ? ` · ${l.root.split('').join(' ')}` : ''} · {l.n}×</span></span><span className={`chip ${vocabStatus(l.id)}`}>{vocabStatus(l.id)}</span></Link>)}</div>
    {rows.length > n && <p><button className="btn" onClick={() => setN(n + 100)}>Show more</button></p>}
  </>;
}
function Roots() {
  const weak = weakRoots(); const [n, setN] = useState(40);
  const all = useMemo(() => Object.entries(ROOTS).sort((a, b) => b[1].n - a[1].n), []);
  const fam = (root: string, ids: string[]) => <div className="row">{ids.slice(0, 10).map((id) => { const l = LEXMAP.get(id); return l ? <Link key={id} to={`vocabulary/word/${encodeURIComponent(id)}`} className="btn sm"><Ar>{l.lem}</Ar><span className="muted sm">{meaningOf(l)}</span></Link> : null; })}</div>;
  return <>
    {weak.length > 0 && <div className="card accent" style={{ marginBottom: '1rem' }}><h3>Root families you keep missing</h3><p className="muted sm">Three or more wrong answers in the last 30 days. Study the family together; these words are also scheduled sooner.</p>
      {weak.slice(0, 5).map((w) => <div key={w.root} style={{ marginBottom: '.6rem' }}><b><Ar>{w.root.split('').join(' ')}</Ar></b> <span className="muted sm">{w.fails} misses</span>{fam(w.root, ROOTS[w.root]?.l || [])}</div>)}</div>}
    <p className="muted sm">{all.length} roots, most frequent first. Learning a family together is usually faster than learning its words apart.</p>
    <div className="list">{all.slice(0, n).map(([root, v]) => <div key={root} className="card flat"><div className="row between"><b><Ar size={1.2}>{root.split('').join(' ')}</Ar></b><span className="chip">{v.n}× · {v.l.length} words</span></div>{fam(root, v.l)}</div>)}</div>
    {all.length > n && <p><button className="btn" onClick={() => setN(n + 60)}>Show more</button></p>}
  </>;
}
export default function Vocabulary({ sub, id }: { sub?: string; id?: string }) {
  useDB(); const tab = sub || 'session'; const c = vocabCounts();
  if (tab === 'word' && id && LEXMAP.get(id)) return <Page title="Word" sub={<Link to="vocabulary/browse">← All words</Link>}><div style={{ maxWidth: 760 }}><WordCard l={LEXMAP.get(id)!} full /></div></Page>;
  return <Page title="Vocabulary" ar="المُفْرَدَات" sub={`${due('vocab').length} reviews due · ${c.introduced} introduced · ${c.mastered} mastered. Words are taught in order of Quranic frequency and tested four ways.`}>
    <div className="tabs">{[['session', 'Today’s session'], ['browse', 'All words'], ['roots', 'Root families']].map(([k, t]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => go(`vocabulary/${k}`)}>{t}</button>)}</div>
    {tab === 'session' && <Session />}{tab === 'browse' && <Browse />}{tab === 'roots' && <Roots />}
  </Page>;
}
