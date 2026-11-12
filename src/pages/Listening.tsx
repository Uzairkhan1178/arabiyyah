import { useEffect, useMemo, useRef, useState } from 'react';
import { useDB, attempts, settings, setSettings } from '../lib/db';
import { ayahAudio, ayahAudioFallback, wordAudio, type Surah } from '../lib/quran';
import { wordsOf, type Q } from '../lib/gen';
import { acc, pct, listeningGap } from '../lib/planner';
import { shuffle, sample, pick } from '../lib/arabic';
import { Page, Ar, Quiz, AyahWords, AudioError, ScoreLine, Stat, useStudyTimer, playAudio, stopAudio, type QuizResult } from '../ui/core';
import { useSurahs, Loading, SurahSelect } from '../ui/hooks';

let n = 0;
function wordQs(su: Surah, k: number): Q[] {
  const H = wordsOf([su], 30).filter((h) => h.w.g && h.f.tag !== 'P');
  const gl = [...new Set(H.map((h) => h.w.g!))];
  return sample(H, k).map((h) => { const options = shuffle([h.w.g!, ...sample(gl.filter((g) => g !== h.w.g), 3)]);
    return { id: `l${n++}`, kind: 'mcq', tag: 'listen.word', prompt: 'Listen to one word. What does it mean?', audio: wordAudio(su.n, h.ay.a, h.wi + 1), hideText: true, ayah: { s: su.n, a: h.ay.a, words: h.ay.w.map((w) => w.t), hi: [h.wi] }, options, answer: options.indexOf(h.w.g!), explain: `${h.w.t} — “${h.w.g}” (${su.n}:${h.ay.a}, word ${h.wi + 1}).`, ref: `${su.n}:${h.ay.a}:${h.wi + 1}`, verified: true } as Q; });
}
const short = (t: string) => (t.length > 170 ? t.slice(0, 168) + '…' : t);
function ayahQs(su: Surah, k: number): Q[] {
  const A = su.ayahs.filter((a) => a.w.length >= 3 && a.w.length <= 22);
  return sample(A, k).map((ay) => { const others = sample(su.ayahs.filter((x) => x.en !== ay.en), 3).map((x) => short(x.en)); const options = shuffle([short(ay.en), ...others]);
    return { id: `l${n++}`, kind: 'mcq', tag: 'listen.ayah', prompt: 'Listen with the text hidden. Which translation matches what you heard?', audio: ayahAudio(su.n, ay.a), hideText: true, ayah: { s: su.n, a: ay.a, words: ay.w.map((w) => w.t) }, options, answer: options.indexOf(short(ay.en)), explain: `This was ${su.tl} ${su.n}:${ay.a}.`, ref: `${su.n}:${ay.a}`, verified: true } as Q; });
}
function orderQs(su: Surah, k: number): Q[] {
  const A = su.ayahs.filter((a) => a.w.length >= 3 && a.w.length <= 8 && new Set(a.w.map((w) => w.t)).size === a.w.length);
  return sample(A, k).map((ay) => ({ id: `l${n++}`, kind: 'order', tag: 'listen.order', prompt: 'Listen, then put the words in the order you heard.', audio: ayahAudio(su.n, ay.a), order: ay.w.map((w) => w.t), explain: `${su.tl} ${su.n}:${ay.a}.`, ref: `${su.n}:${ay.a}`, verified: true } as Q));
}

function Free({ su }: { su: Surah }) {
  const [from, setFrom] = useState(1); const [to, setTo] = useState(Math.min(5, su.ayahs.length)); const [rep, setRep] = useState(1); const [text, setText] = useState(false); const [tr, setTr] = useState(false); const [cur, setCur] = useState<number | null>(null); const run = useRef(0);
  useEffect(() => { setFrom(1); setTo(Math.min(5, su.ayahs.length)); return () => { run.current++; stopAudio(); }; }, [su.n]);
  const start = async () => { const my = ++run.current; for (let a = from; a <= to; a++) for (let r = 0; r < rep; r++) { if (my !== run.current) return; setCur(a); const ok = await playAudio(ayahAudio(su.n, a), { fallback: ayahAudioFallback(su.n, a) }); if (!ok || my !== run.current) { setCur(null); return; } } setCur(null); };
  const ay = cur ? su.ayahs[cur - 1] : null;
  return <div className="card">
    <div className="row"><label>From ayah<input type="number" min={1} max={su.ayahs.length} value={from} onChange={(e) => setFrom(Math.max(1, Math.min(su.ayahs.length, +e.target.value)))} style={{ width: '5rem' }} /></label><label>To<input type="number" min={from} max={su.ayahs.length} value={to} onChange={(e) => setTo(Math.max(from, Math.min(su.ayahs.length, +e.target.value)))} style={{ width: '5rem' }} /></label><label>Repeat each<select value={rep} onChange={(e) => setRep(+e.target.value)}>{[1, 2, 3, 5].map((x) => <option key={x} value={x}>{x}×</option>)}</select></label>
      <label className="row"><input type="checkbox" checked={text} onChange={(e) => setText(e.target.checked)} /> Show Arabic</label><label className="row"><input type="checkbox" checked={tr} onChange={(e) => setTr(e.target.checked)} /> Show translation</label></div>
    <div className="row" style={{ margin: '.8rem 0' }}>{cur ? <button className="btn" onClick={() => { run.current++; stopAudio(); setCur(null); }}>■ Stop</button> : <button className="btn primary" onClick={start}>▶ Play {from}–{to}</button>}{cur && <span className="muted">Ayah {cur}</span>}</div><AudioError />
    {ay && <><AyahWords words={ay.w.map((w) => w.t)} hidden={!text} size={1.9} />{tr && <p>{ay.en}</p>}</>}
    {!cur && <p className="muted sm">Train the ear on its own: keep the Arabic and the translation hidden, and turn them on only to check.</p>}
  </div>;
}

export default function Listening() {
  useDB(); useStudyTimer('listen');
  const [sn, setSn] = useState(67); const [mode, setMode] = useState<string | null>(null); const [res, setRes] = useState<QuizResult | null>(null); const [run, setRun] = useState(0);
  const { data, error } = useSurahs([sn]); const s = settings(); const as = attempts(30); const g = listeningGap();
  const qs = useMemo(() => { if (!data || !mode || mode === 'free') return []; const su = data[0]; return mode === 'word' ? wordQs(su, 10) : mode === 'ayah' ? ayahQs(su, 6) : mode === 'order' ? orderQs(su, 5) : shuffle([...wordQs(su, 5), ...ayahQs(su, 3), ...orderQs(su, 2)]); }, [data, mode, run]);
  const MODES = [['mixed', 'Daily mix', 'Words, ayahs and rebuilding — about ten questions'], ['word', 'Single words by ear', 'Hear one word from the surah, choose its meaning'], ['ayah', 'Whole ayah by ear', 'Text hidden; pick the matching translation'], ['order', 'Rebuild the ayah', 'Arrange the words in the order you heard'], ['free', 'Continuous listening', 'A range of ayahs, with repeats and hidden text']];
  return <Page title="Listening" ar="الاِسْتِمَاع" sub="Hearing is trained apart from reading. Recitation is streamed from authentic recordings; nothing is synthesised."
    actions={<div className="row"><SurahSelect value={sn} onChange={(x) => { setSn(x); setMode(null); setRes(null); }} /><label className="row sm">Speed<select value={s.rate} onChange={(e) => setSettings({ rate: +e.target.value })}>{[0.6, 0.75, 0.85, 1, 1.15].map((x) => <option key={x} value={x}>{x}×</option>)}</select></label></div>}>
    {!data ? <Loading error={error} /> : !mode ? <>
      <div className="grid g4" style={{ marginBottom: '1rem' }}><Stat n={pct(acc(as, (a) => a.tag === 'listen.word' || a.tag === 'vocab.listen').rate)} label="words by ear, 30 days" /><Stat n={pct(acc(as, (a) => a.tag === 'listen.ayah').rate)} label="ayahs by ear" /><Stat n={pct(acc(as, (a) => a.tag === 'listen.order').rate)} label="rebuilding" /><Stat n={pct(g.eye.rate)} label="reading, for comparison" /></div>
      {g.shift && <p className="callout"><b>Adaptation active</b>Your by-ear accuracy is {Math.round(g.gap * 100)} points below your reading accuracy, so three minutes a day have moved from vocabulary to listening.</p>}
      <div className="list">{MODES.map(([k, t, d]) => <button key={k} className="lrow" style={{ textAlign: 'start', font: 'inherit', cursor: 'pointer' }} onClick={() => { setMode(k); setRes(null); setRun(run + 1); }}><span className="num">▶</span><span><b>{t}</b><br /><span className="muted sm">{d} · {data[0].tl}</span></span><span /></button>)}</div>
      <p className="muted sm" style={{ marginTop: '1rem' }}>Slower playback keeps the reciter’s pitch. Below 0.75× the sound becomes unnatural, so use it only for hard words. Start with Al-Mulk and Ar-Raḥmān: you know their sound, so attention can go to meaning.</p></>
      : mode === 'free' ? <><p><button className="link" onClick={() => setMode(null)}>← Listening menu</button></p><Free su={data[0]} /></>
      : res ? <div className="card"><h2>Listening round complete</h2><ScoreLine r={res} /><p className="muted sm">{Object.entries(res.byTag).map(([t, [o, k]]) => `${t.replace('listen.', '')}: ${o}/${k}`).join(' · ')}</p><div className="row"><button className="btn primary" onClick={() => { setRes(null); setRun(run + 1); }}>Another round</button><button className="btn" onClick={() => setMode(null)}>Listening menu</button></div></div>
      : <><p><button className="link" onClick={() => { stopAudio(); setMode(null); }}>← Listening menu</button></p><Quiz key={run} questions={qs} mod="listen" kind="listen" onDone={setRes} /></>}
  </Page>;
}
export { Ar, pick };
