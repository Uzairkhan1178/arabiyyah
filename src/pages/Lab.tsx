import { useEffect, useMemo, useState } from 'react';
import { useDB, get, put, logAttempt, markDone, settings } from '../lib/db';
import { SURAHS, ayahAudio, ayahAudioFallback, wordAudio, describe, hints, stemOf, lexId, LEXMAP, ROOTS, PROVENANCE, type Surah, type Ayah } from '../lib/quran';
import { generate, type GenName } from '../lib/gen';
import { review, getCard, intervalText } from '../lib/srs';
import { ANALYSES } from '../content/analyses';
import { meaningOf } from '../lib/vocab';
import { Page, Link, Ar, Ur, Mixed, Flag, Quiz, AudioBtn, AudioError, AyahWords, Report, useStudyTimer, go, playAudio, type QuizResult } from '../ui/core';
import { useSurahs, Loading, SurahSelect, Tutor, Notes, Bookmark } from '../ui/hooks';

const STEPS = ['Listen', 'Recognise', 'Analyse', 'Explain', 'Reveal'];
const LAB_GENS: GenName[] = ['pos', 'meaning', 'case', 'tense', 'root', 'doer', 'pron', 'particle', 'derived'];

function Inspector({ ay, wi, s }: { ay: Ayah; wi: number; s: number }) {
  const w = ay.w[wi]; const st = stemOf(w);
  if (!w.s || !st) return <div className="card insp"><p className="muted">Word-level grammar is unavailable for this ayah: the source datasets split its words differently, so nothing is guessed.</p></div>;
  const lex = LEXMAP.get(lexId(st.f) || ''); const hs = hints(ay, wi);
  const fam = st.f.root && ROOTS[st.f.root] ? ROOTS[st.f.root].l.map((id) => LEXMAP.get(id)!).filter((x) => x && x.id !== lex?.id).slice(0, 5) : [];
  return <div className="card insp">
    <div className="row between"><Ar q size={2.1}>{w.t}</Ar><AudioBtn small url={wordAudio(s, ay.a, wi + 1)} label="Hear" /></div>
    <p style={{ margin: 0 }}><b>{w.g}</b>{settings().showTranslit && w.tr ? <span className="muted"> · {w.tr}</span> : null}</p>
    <div className="eyebrow" style={{ marginTop: '.7rem' }}>Built from {w.s.length} part{w.s.length > 1 ? 's' : ''} <Flag kind="verified" /></div>
    {w.s.map((seg, i) => { const d = describe(seg, st.seg[1]); return <div key={i} className="seg-box"><div className="row between"><span className="form quran">{d.form}</span><span className="chip">{d.role}</span></div><b>{d.title}</b> <Ar>{d.ar}</Ar><ul style={{ margin: '.2rem 0 0', paddingInlineStart: '1.1rem' }}>{d.lines.map((x, k) => <li key={k} className="sm"><Mixed text={x} /></li>)}</ul></div>; })}
    {hs.length > 0 && <><div className="eyebrow">Structure hints <Flag kind="rule" /></div><ul style={{ paddingInlineStart: '1.1rem', marginTop: '.2rem' }}>{hs.map((h, i) => <li key={i} className="sm">{h}</li>)}</ul></>}
    {lex && <p className="sm"><Link to={`vocabulary/word/${encodeURIComponent(lex.id)}`}>Dictionary form <Ar>{lex.lem}</Ar></Link> · {lex.n}× in the Quran · rank {lex.rank}</p>}
    {fam.length > 0 && <><div className="eyebrow">Same root</div><div className="row">{fam.map((x) => <Link key={x.id} className="btn sm" to={`vocabulary/word/${encodeURIComponent(x.id)}`}><Ar>{x.lem}</Ar><span className="muted sm">{meaningOf(x)}</span></Link>)}</div></>}
    <p style={{ marginTop: '.6rem' }}><Report where={`${s}:${ay.a}:${wi + 1}`} /></p>
  </div>;
}

function Study({ su, ay, sel, setSel }: { su: Surah; ay: Ayah; sel: number; setSel: (i: number) => void }) {
  const ref = `${su.n}:${ay.a}`; const an = ANALYSES[ref]; const lang = settings().explainLang;
  return <div className="split">
    <div className="grid">
      <div className="card">
        <div className="wbw">{ay.w.map((w, i) => <button key={i} className={i === sel ? 'on' : ''} onClick={() => setSel(i)}><span className="t quran">{w.t}</span>{settings().showTranslit && <span className="tr">{w.tr}</span>}<span className="g">{w.g}</span></button>)}</div>
        <p className="muted sm" style={{ textAlign: 'center', margin: '.6rem 0 0' }}>Select any word to inspect its root, form and grammatical role. <Flag kind="verified" /></p>
      </div>
      {an && <div className="card"><div className="row between"><h3>Sentence structure</h3><Flag kind="authored" /></div><p><b>{an.type}.</b> {an.note}</p>
        <div className="tablewrap"><table><thead><tr><th>Words</th><th>Role</th><th>Note</th></tr></thead><tbody>{an.parts.map((p, i) => <tr key={i}><td><Ar q>{p.w.map((k) => ay.w[k - 1]?.t).join(' ')}</Ar></td><td>{p.role}<br /><Ar>{p.ar}</Ar></td><td className="sm">{p.note}</td></tr>)}</tbody></table></div>
        <p className="sm muted">This breakdown was written for the app. Compare it with the <a href={`https://corpus.quran.com/treebank.jsp?chapter=${su.n}&verse=${ay.a}`} target="_blank" rel="noreferrer">Quranic Arabic Corpus treebank</a> for the same ayah.</p></div>}
      {lang !== 'min' && <div className="card"><div className="row between"><h3>Translation</h3><Flag kind="translation" /></div>
        {lang !== 'ur' && <p>{ay.en}<br /><span className="muted sm">Saheeh International, via QuranEnc — shown unmodified, including footnote markers.</span></p>}
        {lang !== 'en' && <p><Ur>{ay.ur}</Ur><br /><span className="muted sm">Muhammad Junagarhi, via QuranEnc.</span></p>}
        <p className="sm muted">A translation conveys meaning; it is not the linguistic analysis, and neither is tafsīr. For explanation of what the ayah teaches, read a recognised tafsīr (Quran.com has several under the Tafsirs tab of <a href={`https://quran.com/${su.n}:${ay.a}`} target="_blank" rel="noreferrer">this ayah</a>). This app does not generate interpretation.</p></div>}
      {lang === 'min' && <p className="muted sm">Translations are hidden (Settings → Explanations: Arabic only). Glosses remain on each word.</p>}
      <div className="card flat"><Notes id={`ayah:${ref}`} /></div>
      <Tutor context={`Ayah ${ref}, word by word: ${ay.w.map((w, i) => `${i + 1}. ${w.t} = "${w.g}" [${(w.s || []).map((x) => x[2]).join(' + ')}]`).join('; ')}`} />
    </div>
    <Inspector ay={ay} wi={sel} s={su.n} />
  </div>;
}

function Flow({ su, ay, onFinish, retest }: { su: Surah; ay: Ayah; onFinish: () => void; retest: boolean }) {
  const ref = `${su.n}:${ay.a}`; const [step, setStep] = useState(0); const [shown, setShown] = useState(false); const [known, setKnown] = useState<number[]>([]); const [qr, setQr] = useState<QuizResult | null>(null); const [gist, setGist] = useState(''); const [sel, setSel] = useState(0);
  const words = ay.w.map((w) => w.t);
  const qs = useMemo(() => (ay.al === false ? [] : generate([...LAB_GENS].sort(() => Math.random() - 0.5), [{ ...su, ayahs: [ay] }], 3)), [ref]);
  const finish = (self: 1 | 2 | 3 | 4) => {
    const qScore = qr && qr.total ? qr.correct / qr.total : 1;
    const rating = (self >= 3 && qScore < 0.5 ? 2 : self) as 1 | 2 | 3 | 4; // objective answers cap an optimistic self-rating
    review('ayah', ref, 'comp', rating);
    logAttempt({ mod: 'lab', kind: retest ? 'retest' : 'first', tag: 'lab.comp', ok: rating >= 3, ref });
    put(`lab/${ref}`, { ref, known: known.length, of: words.length, gist, rating, t: Date.now() });
    markDone('lab'); onFinish();
  };
  return <div>
    <div className="steps">{STEPS.map((s, i) => <span key={s} className={i === step ? 'on' : i < step ? 'past' : ''}>{i + 1}. {s}</span>)}</div>
    {retest && <p className="chip review">Retest without assistance — the translation stays hidden until you have answered.</p>}
    {step < 4 && <div className="card" style={{ marginBottom: '1rem' }}>
      <AyahWords words={words} hidden={step === 0 && !shown} picked={step === 1 ? known : []} onTap={step === 1 ? (i) => setKnown((k) => (k.includes(i) ? k.filter((x) => x !== i) : [...k, i])) : undefined} size={2.1} />
      <div className="row" style={{ justifyContent: 'center' }}><AudioBtn url={ayahAudio(su.n, ay.a)} fallback={ayahAudioFallback(su.n, ay.a)} label="Recitation" /><AudioBtn url={ayahAudio(su.n, ay.a)} fallback={ayahAudioFallback(su.n, ay.a)} label="Slower" rate={0.75} /></div><AudioError />
    </div>}
    {step === 0 && <div><p className="prompt">Listen first, with the text hidden. What can you catch by ear alone?</p><div className="row"><button className="btn" onClick={() => setShown(!shown)}>{shown ? 'Hide the text' : 'Show the text'}</button><button className="btn primary" onClick={() => { setShown(true); setStep(1); }}>I have listened — continue</button></div></div>}
    {step === 1 && <div><p className="prompt">Tap every word whose meaning you already know.</p><p className="muted sm">{known.length} of {words.length} selected. Be strict: this is recorded as your starting point for this ayah.</p><button className="btn primary" onClick={() => setStep(qs.length ? 2 : 3)}>Continue</button></div>}
    {step === 2 && <Quiz questions={qs} mod="lab" kind="lab" onDone={(r) => { setQr(r); setStep(3); }} />}
    {step === 3 && <div style={{ maxWidth: 760 }}><p className="prompt">In your own words: who is doing what, and what is this ayah saying?</p><textarea rows={3} value={gist} onChange={(e) => setGist(e.target.value)} placeholder="Write a rough answer before you look. English or Urdu." autoFocus /><p><button className="btn primary" style={{ marginTop: '.6rem' }} onClick={() => setStep(4)}>Reveal the explanation</button></p></div>}
    {step === 4 && <>
      <div className="card" style={{ marginBottom: '1rem' }}><AyahWords words={words} hi={[sel]} onTap={setSel} size={2.1} /><div className="row" style={{ justifyContent: 'center' }}><AudioBtn url={ayahAudio(su.n, ay.a)} fallback={ayahAudioFallback(su.n, ay.a)} label="Recitation" /></div><AudioError /></div>
      {gist && <div className="callout"><b>Your answer</b>{gist}</div>}
      <Study su={su} ay={ay} sel={sel} setSel={setSel} />
      <div className="card accent" style={{ marginTop: '1rem' }}><p className="prompt">Compare with your own answer. How well did you understand this ayah before the reveal?</p>
        <div className="row">{([[1, 'Not at all'], [2, 'Parts of it'], [3, 'The main meaning'], [4, 'Fully, with its structure']] as const).map(([r, t]) => <button key={r} className={`btn ${r === 3 ? 'primary' : ''}`} onClick={() => finish(r)}>{t}</button>)}</div>
        <p className="muted sm" style={{ margin: '.6rem 0 0' }}>This schedules the retest. You knew {known.length} of {words.length} words{qr ? ` and answered ${qr.correct} of ${qr.total} structure questions` : ''}.</p></div></>}
  </div>;
}

export default function Lab({ s, a }: { s?: number; a?: number }) {
  useDB(); useStudyTimer('lab');
  const ptr = get('set/lab') || { s: 1, a: 1 }; const sn = s && s >= 1 && s <= 114 ? s : ptr.s; const { data, error } = useSurahs([sn]);
  const [mode, setMode] = useState<'flow' | 'study'>('flow'); const [sel, setSel] = useState(0); const [doneMsg, setDoneMsg] = useState('');
  const an = Math.min(Math.max(1, a || (sn === ptr.s ? ptr.a : 1)), SURAHS[sn - 1].count); const ref = `${sn}:${an}`;
  useEffect(() => { setSel(0); setDoneMsg(''); const c = getCard('ayah', ref, 'comp'); setMode(!c || c.due <= Date.now() ? 'flow' : 'study'); }, [ref]);
  if (!data) return <Page title="Quran Laboratory" ar="مُخْتَبَر القُرْآن"><Loading error={error} /></Page>;
  const su = data[0]; const ay = su.ayahs[an - 1]; const card = getCard('ayah', ref, 'comp'); const rec = get(`lab/${ref}`);
  const nextRef = an < su.ayahs.length ? `${sn}/${an + 1}` : sn < 114 ? `${sn + 1}/1` : null;
  const finish = () => { if (ptr.s === sn && ptr.a === an && nextRef) { const [ns, na] = nextRef.split('/').map(Number); put('set/lab', { s: ns, a: na }); } setMode('study'); setDoneMsg('Recorded. The retest is scheduled.'); };
  return <Page title="Quran Laboratory" ar="مُخْتَبَر القُرْآن" sub="Meet each ayah by ear first, commit to an answer, then open the full word-by-word analysis."
    actions={<div className="row"><SurahSelect value={sn} onChange={(n) => go(`lab/${n}/1`)} /><select value={an} onChange={(e) => go(`lab/${sn}/${e.target.value}`)} aria-label="Ayah">{su.ayahs.map((x) => <option key={x.a} value={x.a}>Ayah {x.a}</option>)}</select></div>}>
    <div className="row between" style={{ marginBottom: '.8rem' }}>
      <div><h2 style={{ margin: 0 }}>{su.tl} <Ar>{su.ar}</Ar> · {ref}</h2><span className="muted sm">{su.en} · {su.type}{card ? ` · understanding last rated ${rec?.rating || '—'}/4 · retest ${intervalText(card)}` : ' · not yet studied'}</span></div>
      <div className="row"><Bookmark id={`ayah:${ref}`} label={`${su.tl} ${ref}`} /><button className={`btn sm ${mode === 'flow' ? 'on' : ''}`} onClick={() => setMode('flow')}>Comprehension first</button><button className={`btn sm ${mode === 'study' ? 'on' : ''}`} onClick={() => setMode('study')}>Open study</button></div>
    </div>
    {ay.al === false && <p className="warn">The Tanzil text and the grammar corpus divide the words of this ayah differently, so word-level grammar is switched off here. The text itself is unaffected.</p>}
    {an === 1 && su.basmala && <p style={{ textAlign: 'center' }}><Ar q size={1.5}>{su.basmala}</Ar></p>}
    {doneMsg && <p className="chip review">{doneMsg}</p>}
    {mode === 'flow' ? <Flow key={ref} su={su} ay={ay} onFinish={finish} retest={!!card} /> : <>
      <div className="card" style={{ marginBottom: '1rem' }}><AyahWords words={ay.w.map((w) => w.t)} hi={[sel]} onTap={setSel} size={2.2} />
        <div className="row" style={{ justifyContent: 'center' }}><AudioBtn url={ayahAudio(sn, an)} fallback={ayahAudioFallback(sn, an)} label="Recitation" /><AudioBtn url={ayahAudio(sn, an)} fallback={ayahAudioFallback(sn, an)} label="Slower" rate={0.75} /></div><AudioError /></div>
      <Study su={su} ay={ay} sel={sel} setSel={setSel} /></>}
    <div className="row between" style={{ marginTop: '1.4rem' }}>
      {an > 1 ? <Link className="btn" to={`lab/${sn}/${an - 1}`}>← Previous ayah</Link> : <span />}
      {nextRef && <Link className="btn" to={`lab/${nextRef}`}>Next ayah →</Link>}
    </div>
    <p className="muted sm" style={{ marginTop: '1.2rem' }}>Text: {PROVENANCE.text?.source}, reproduced verbatim (reference {ref}). Grammar tags: {PROVENANCE.morphology?.source}. Word glosses: Quran.com. <Report where={ref} /></p>
  </Page>;
}
export { playAudio };
