import { useMemo, useState } from 'react';
import { useDB, logAttempt, markDone, attempts } from '../lib/db';
import { UNITS, type Unit } from '../content/conversation';
import { review, due, getCard, cardStatus, ensureCard } from '../lib/srs';
import { acc, pct } from '../lib/planner';
import { shuffle } from '../lib/arabic';
import type { Q } from '../lib/gen';
import { Page, Link, Ar, Ur, Flag, Quiz, ScoreLine, Report, useStudyTimer, speak, hasArabicVoice, type QuizResult } from '../ui/core';

let n = 0;
function dialogueQs(u: Unit): Q[] {
  return u.dialogue.map((t, i) => { if (t.who !== 'you') return null; const prev = u.dialogue[i - 1]; const words = t.ar.split(' ');
    if (words.length >= 3 && i % 4 === 3) return { id: `d${n++}`, kind: 'order', tag: 'conv.build', prompt: prev ? `They say: “${prev.en}” Build your reply.` : 'Start the conversation. Build the sentence.', ar: prev?.ar, en: `Say: ${t.en}`, order: words, explain: `${t.ar} — ${t.en}`, verified: false } as Q;
    const options = shuffle([t.ar, ...(t.wrong || [])]);
    return { id: `d${n++}`, kind: 'mcq', tag: 'conv.reply', prompt: prev ? `They say: “${prev.en}” What do you answer?` : `You want to say: “${t.en}”`, ar: prev?.ar, options, optAr: true, answer: options.indexOf(t.ar), explain: `${t.ar} — ${t.en}`, verified: false } as Q; }).filter(Boolean) as Q[];
}
function UnitView({ u }: { u: Unit }) {
  const [mode, setMode] = useState<'learn' | 'recall' | 'talk'>('learn'); const [res, setRes] = useState<QuizResult | null>(null); const [ri, setRi] = useState(0); const [shown, setShown] = useState(false); const [run, setRun] = useState(0);
  const qs = useMemo(() => dialogueQs(u), [u.id, run]); const voice = hasArabicVoice();
  const order = useMemo(() => shuffle(u.phrases.map((_, i) => i)), [u.id, run]);
  return <div style={{ maxWidth: 780 }}>
    <div className="tabs">{([['learn', 'Phrases'], ['recall', 'Say it from memory'], ['talk', 'Conversation']] as const).map(([k, t]) => <button key={k} className={mode === k ? 'on' : ''} onClick={() => { setMode(k); setRes(null); setRi(0); setShown(false); setRun(run + 1); }}>{t}</button>)}</div>
    {mode === 'learn' && <><div className="callout"><b>Grammar link <Flag kind="authored" /></b>{u.note}</div>
      <div className="list">{u.phrases.map((p, i) => <div key={i} className="card flat"><div className="row between"><Ar size={1.35}>{p.ar}</Ar>{voice && <button className="btn sm" onClick={() => speak(p.ar)}>▶</button>}</div><span className="muted sm"><i>{p.tr}</i></span><br />{p.en} · <Ur>{p.ur}</Ur></div>)}</div>
      {!voice && <p className="muted sm">No Arabic voice is installed on this device, so phrases are text only. On Android, install an Arabic voice in the system text-to-speech settings.</p>}</>}
    {mode === 'recall' && (ri >= order.length ? <div className="card"><h2>Done</h2><p>Phrases you could not produce return sooner.</p><button className="btn" onClick={() => { setRi(0); setRun(run + 1); }}>Again</button></div> : (() => { const p = u.phrases[order[ri]]; const id = `${u.id}:${order[ri]}`; return <div className="grid">
      <p className="muted sm">{ri + 1} of {order.length}</p><p className="prompt">Say this in Arabic, aloud:</p><div className="card"><h2 style={{ margin: 0 }}>{p.en}</h2><Ur>{p.ur}</Ur></div>
      {!shown ? <button className="btn primary" onClick={() => setShown(true)}>Show the Arabic</button> : <><div className="card"><div className="stim"><Ar size={1.5}>{p.ar}</Ar></div><p className="muted" style={{ textAlign: 'center' }}><i>{p.tr}</i></p></div>
        <div className="row">{([[1, 'Could not say it'], [2, 'With mistakes'], [3, 'Correct'], [4, 'Instantly']] as const).map(([r, t]) => <button key={r} className={`btn ${r === 3 ? 'primary' : ''}`} onClick={() => { ensureCard('conv', id, 'say'); review('conv', id, 'say', r); logAttempt({ mod: 'conv', kind: 'recall', tag: 'conv.say', ok: r >= 3, ref: id }); markDone('conv'); setShown(false); setRi(ri + 1); }}>{t}</button>)}</div></>}</div>; })())}
    {mode === 'talk' && (res ? <div className="card"><h2>Exchange complete</h2><ScoreLine r={res} /><button className="btn primary" onClick={() => { setRes(null); setRun(run + 1); }}>Again</button></div> : <Quiz key={run} questions={qs} mod="conv" kind="dialogue" showRef={false} onDone={(r) => { markDone('conv'); setRes(r); }} />)}
    <p style={{ marginTop: '1rem' }}><Report where={`conversation ${u.id}`} /></p>
  </div>;
}
export default function Conversation({ id }: { id?: string }) {
  useDB(); useStudyTimer('conv'); const u = UNITS.find((x) => x.id === id); const as = attempts(30);
  if (u) return <Page title={u.title} sub={<Link to="conversation">← Conversation</Link>}><UnitView u={u} /></Page>;
  return <Page title="Conversational Arabic" ar="المُحَادَثَة" sub="A small daily track in Modern Standard Arabic. It reuses the grammar from the Quranic lessons and never takes time from them.">
    <p className="muted sm">Replies chosen or built correctly: {pct(acc(as, (a) => a.tag === 'conv.reply' || a.tag === 'conv.build').rate)} · produced from memory: {pct(acc(as, (a) => a.tag === 'conv.say').rate)} · {due('conv').length} phrases due</p>
    <div className="list">{UNITS.map((x, i) => { const st = x.phrases.map((_, k) => cardStatus(getCard('conv', `${x.id}:${k}`, 'say'))); const known = st.filter((s) => s === 'review' || s === 'mastered').length; return <Link key={x.id} to={`conversation/${x.id}`} className="lrow"><span className="num">{i + 1}</span><span><b>{x.title}</b><br /><span className="muted sm">{x.phrases.length} phrases · {x.dialogue.filter((t) => t.who === 'you').length} replies to produce</span></span><span className="chip">{known}/{x.phrases.length} retained</span></Link>; })}</div>
    <div className="callout" style={{ marginTop: '1rem' }}><b>About dialects</b>Everyday speech differs by country (for example “how are you?” is كَيْفَ حَالُكَ in standard Arabic, إِزَّيَّك in Egypt, كِيفَك in the Levant). Dialect material is optional enrichment and is not part of this track yet, so that it does not blur the Classical forms you are learning.</div>
  </Page>;
}
