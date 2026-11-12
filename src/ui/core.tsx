// Shared UI primitives: routing, audio, study timer, Arabic text, flags, quiz runner.
import { useEffect, useRef, useState, useCallback, useMemo, type ReactNode } from 'react';
import { shuffle } from '../lib/arabic';
import { addStudySeconds, logAttempt, put, settings } from '../lib/db';
import type { Q } from '../lib/gen';

// ---- hash router ---------------------------------------------------------------------------------
export function useRoute(): string[] {
  const [h, setH] = useState(location.hash);
  useEffect(() => { const f = () => setH(location.hash); addEventListener('hashchange', f); return () => removeEventListener('hashchange', f); }, []);
  return h.replace(/^#\/?/, '').split('/').filter(Boolean);
}
export const go = (to: string) => { location.hash = '#/' + to; window.scrollTo(0, 0); };
export function Link({ to, children, className }: { to: string; children: ReactNode; className?: string }) {
  return <a href={'#/' + to} className={className}>{children}</a>;
}

// ---- Arabic text ---------------------------------------------------------------------------------
export function Ar({ children, q, className = '', size }: { children: ReactNode; q?: boolean; className?: string; size?: number }) {
  return <span dir="rtl" lang="ar" className={`${q ? 'quran' : 'ar'} ${className}`} style={size ? { fontSize: `${size}em` } : undefined}>{children}</span>;
}
/** Renders prose that mixes Latin and Arabic: Arabic runs get the Arabic font and direction. */
export function Mixed({ text }: { text: string }) {
  const parts = text.split(/([؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿][؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿\s‌‍،؟ـ]*[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]|[؀-ۿ])/g);
  return <>{parts.map((p, i) => (i % 2 ? <Ar key={i}>{p}</Ar> : p))}</>;
}
export function Ur({ children }: { children: ReactNode }) { return <span dir="rtl" lang="ur" className="ur">{children}</span>; }

// ---- flags ---------------------------------------------------------------------------------------
const FLAGS = {
  verified: ['Verified data', 'Read directly from the Tanzil text or Quranic Arabic Corpus tags.'],
  authored: ['Authored — verify', 'Written for this app, not taken from a published reference. Check against a teacher or a grammar text; use Report if something is wrong.'],
  rule: ['Rule-derived hint', 'Produced by a rule over verified tags. A hint, not a verified analysis.'],
  ai: ['AI-generated', 'Produced live by an AI model. May contain errors; never authoritative.'],
  translation: ['Translation', 'A published human translation, shown unmodified. Not part of the linguistic analysis.'],
} as const;
export function Flag({ kind }: { kind: keyof typeof FLAGS }) { return <span className={`flag flag-${kind}`} title={FLAGS[kind][1]}>{FLAGS[kind][0]}</span>; }

// ---- audio ---------------------------------------------------------------------------------------
let el: HTMLAudioElement | null = null; let token = 0;
const listeners = new Set<(s: AudioState) => void>();
export type AudioState = { url: string | null; playing: boolean; error: string | null };
let state: AudioState = { url: null, playing: false, error: null };
const emit = (s: Partial<AudioState>) => { state = { ...state, ...s }; listeners.forEach((f) => f(state)); };
async function resolve(url: string): Promise<string> {
  try { const hit = await caches.match(url); if (hit) return URL.createObjectURL(await hit.blob()); } catch { /* cache API unavailable */ }
  return url;
}
export function stopAudio() { token++; el?.pause(); emit({ playing: false, url: null }); }
/** Plays a URL (cache first), resolving when it ends. Falls back to an alternate URL once. */
export function playAudio(url: string, opts: { rate?: number; fallback?: string } = {}): Promise<boolean> {
  const my = ++token;
  return new Promise(async (done) => {
    if (!el) { el = new Audio(); el.preload = 'auto'; }
    const a = el; a.pause();
    const start = async (u: string, isFallback: boolean) => {
      const src = await resolve(u); if (my !== token) return done(false);
      a.src = src; a.playbackRate = opts.rate ?? settings().rate; (a as any).preservesPitch = true;
      a.onended = () => { if (my === token) { emit({ playing: false, url: null }); done(true); } };
      a.onerror = () => { if (my !== token) return; if (!isFallback && opts.fallback) start(opts.fallback, true); else { emit({ playing: false, url: null, error: navigator.onLine ? 'This recording could not be loaded.' : 'Audio needs a connection unless it was saved for offline use.' }); done(false); } };
      emit({ url, playing: true, error: null });
      a.play().catch(() => a.onerror?.(new Event('error')));
    };
    start(url, false);
  });
}
export function useAudio() {
  const [s, set] = useState(state);
  useEffect(() => { listeners.add(set); return () => { listeners.delete(set); }; }, []);
  return s;
}
export function AudioBtn({ url, fallback, label = 'Play', rate, small }: { url: string; fallback?: string; label?: string; rate?: number; small?: boolean }) {
  const s = useAudio(); const on = s.playing && s.url === url;
  return <button type="button" className={`btn audio ${small ? 'sm' : ''} ${on ? 'on' : ''}`} onClick={(e) => { e.stopPropagation(); on ? stopAudio() : playAudio(url, { fallback, rate }); }} aria-label={label}>{on ? '■' : '▶'} <span>{label}</span></button>;
}
export function AudioError() { const s = useAudio(); return s.error ? <p className="warn" role="alert">{s.error}</p> : null; }
/** Device text-to-speech for non-Quranic Arabic (conversation and reading passages only). */
export function speak(text: string) {
  try { const u = new SpeechSynthesisUtterance(text); u.lang = 'ar-SA'; u.rate = 0.85; const v = speechSynthesis.getVoices().find((x) => x.lang.startsWith('ar')); if (v) u.voice = v; speechSynthesis.cancel(); speechSynthesis.speak(u); return true; } catch { return false; }
}
export const hasArabicVoice = () => { try { return speechSynthesis.getVoices().some((v) => v.lang.startsWith('ar')); } catch { return false; } };

// ---- study timer ---------------------------------------------------------------------------------
/** Counts active seconds for a module: only while the tab is visible and there was input in the last 90 s. */
export function useStudyTimer(mod: string) {
  useEffect(() => {
    let last = Date.now(), acc = 0;
    const touch = () => { last = Date.now(); };
    const evs = ['pointerdown', 'keydown', 'scroll'] as const; evs.forEach((e) => addEventListener(e, touch, { passive: true }));
    const id = setInterval(() => { if (document.visibilityState === 'visible' && Date.now() - last < 90000) acc += 5; if (acc >= 15) { addStudySeconds(mod, acc); acc = 0; } }, 5000);
    return () => { clearInterval(id); evs.forEach((e) => removeEventListener(e, touch)); if (acc) addStudySeconds(mod, acc); };
  }, [mod]);
}

// ---- small pieces --------------------------------------------------------------------------------
export function Ring({ value, size = 64, label }: { value: number; size?: number; label?: string }) {
  const r = size / 2 - 5, c = 2 * Math.PI * r, v = Math.max(0, Math.min(1, value || 0));
  return <svg width={size} height={size} className="ring" role="img" aria-label={label || `${Math.round(v * 100)}%`}><circle cx={size / 2} cy={size / 2} r={r} className="ring-bg" /><circle cx={size / 2} cy={size / 2} r={r} className="ring-fg" strokeDasharray={`${c * v} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} /><text x="50%" y="50%" dominantBaseline="central" textAnchor="middle">{Math.round(v * 100)}</text></svg>;
}
export function Bar({ value, of = 1 }: { value: number; of?: number }) { return <div className="bar" role="progressbar" aria-valuenow={value} aria-valuemax={of}><i style={{ width: `${Math.min(100, (100 * value) / (of || 1))}%` }} /></div>; }
export function Stat({ n, label, sub }: { n: ReactNode; label: string; sub?: string }) { return <div className="stat"><b>{n}</b><span>{label}</span>{sub && <small>{sub}</small>}</div>; }
export function Page({ title, ar, sub, children, actions }: { title: string; ar?: string; sub?: ReactNode; children: ReactNode; actions?: ReactNode }) {
  return <div className="page"><header className="page-h"><div><h1>{title} {ar && <Ar className="h-ar">{ar}</Ar>}</h1>{sub && <p className="sub">{sub}</p>}</div>{actions && <div className="actions">{actions}</div>}</header>{children}</div>;
}
export function Report({ where }: { where: string }) {
  const [open, setOpen] = useState(false); const [txt, setTxt] = useState(''); const [sent, setSent] = useState(false);
  if (sent) return <span className="muted sm">Saved to your error reports.</span>;
  if (!open) return <button type="button" className="link sm" onClick={() => setOpen(true)}>Report an error</button>;
  return <form className="report" onSubmit={(e) => { e.preventDefault(); if (!txt.trim()) return; put(`report/${Date.now()}`, { where, text: txt.trim(), t: Date.now(), open: true }); setSent(true); }}>
    <label>What is wrong at <b>{where}</b>?<textarea value={txt} onChange={(e) => setTxt(e.target.value)} rows={3} autoFocus /></label>
    <div className="row"><button className="btn primary sm">Save report</button><button type="button" className="btn sm" onClick={() => setOpen(false)}>Cancel</button></div>
  </form>;
}

// ---- ayah display --------------------------------------------------------------------------------
export function AyahWords({ words, hi = [], picked = [], onTap, marks, size = 1.9, hidden }: { words: string[]; hi?: number[]; picked?: number[]; onTap?: (i: number) => void; marks?: Record<number, 'ok' | 'bad' | 'miss'>; size?: number; hidden?: boolean }) {
  return <div dir="rtl" lang="ar" className={`quran ayah ${hidden ? 'blurred' : ''}`} style={{ fontSize: `${size}em` }}>
    {words.map((w, i) => onTap
      ? <button type="button" key={i} className={`w ${hi.includes(i) ? 'hi' : ''} ${picked.includes(i) ? 'picked' : ''} ${marks?.[i] || ''}`} onClick={() => onTap(i)}>{w}</button>
      : <span key={i} className={`w ${hi.includes(i) ? 'hi' : ''} ${marks?.[i] || ''}`}>{w}</span>)}
  </div>;
}

// ---- quiz runner ---------------------------------------------------------------------------------
export type QuizResult = { correct: number; total: number; byTag: Record<string, [number, number]>; wrong: Q[] };
export function Quiz({ questions, mod, onDone, onAnswer, kind = 'drill', showRef = true }: { questions: Q[]; mod: string; onDone: (r: QuizResult) => void; onAnswer?: (q: Q, ok: boolean, ms: number) => void; kind?: string; showRef?: boolean }) {
  const [i, setI] = useState(0); const [sel, setSel] = useState<number | null>(null); const [taps, setTaps] = useState<number[]>([]); const [seq, setSeq] = useState<number[]>([]); const [checked, setChecked] = useState(false);
  const res = useRef<QuizResult>({ correct: 0, total: 0, byTag: {}, wrong: [] }); const t0 = useRef(Date.now());
  const q = questions[i];
  const bank = useMemo(() => (q?.order ? shuffle(q.order.map((_, k) => k)) : []), [q?.id]);
  useEffect(() => { t0.current = Date.now(); setSel(null); setTaps([]); setSeq([]); setChecked(false); if (q?.audio) playAudio(q.audio); }, [i, q?.id]);
  const finish = useCallback((ok: boolean) => {
    const ms = Date.now() - t0.current; const r = res.current; r.total++; if (ok) r.correct++; else r.wrong.push(q);
    const bt = (r.byTag[q.tag] = r.byTag[q.tag] || [0, 0]); bt[1]++; if (ok) bt[0]++;
    logAttempt({ mod, kind, tag: q.tag, ok, ms, ref: q.ref, item: q.item }); onAnswer?.(q, ok, ms); setChecked(true);
  }, [q, mod, kind, onAnswer]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (!q) return;
      if (checked && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); next(); }
      else if (!checked && q.kind === 'mcq' && /^[1-9]$/.test(e.key) && +e.key <= q.options!.length) { setSel(+e.key - 1); finish(+e.key - 1 === q.answer); }
    };
    addEventListener('keydown', key); return () => removeEventListener('keydown', key);
  });
  if (!q) return <p className="muted">No questions could be generated from the selected material.</p>;
  const next = () => { if (i + 1 >= questions.length) onDone(res.current); else setI(i + 1); };
  const tapOK = q.kind === 'tap' && checked && taps.length === q.taps!.length && taps.every((t) => q.taps!.includes(t));
  const orderOK = q.kind === 'order' && seq.map((k) => q.order![k]).join(' ') === q.order!.join(' ');
  const ok = q.kind === 'mcq' ? sel === q.answer : q.kind === 'order' ? orderOK : tapOK;
  const marks: Record<number, 'ok' | 'bad' | 'miss'> = {};
  if (q.kind === 'tap' && checked) { taps.forEach((t) => (marks[t] = q.taps!.includes(t) ? 'ok' : 'bad')); q.taps!.forEach((t) => { if (!taps.includes(t)) marks[t] = 'miss'; }); }
  return <div className="quiz">
    <div className="quiz-top"><span className="muted sm">Question {i + 1} of {questions.length}</span><Bar value={i + (checked ? 1 : 0)} of={questions.length} /></div>
    <p className="prompt">{q.prompt}</p>
    {q.audio && <div className="row"><AudioBtn url={q.audio} label="Play again" /><AudioBtn url={q.audio} label="Slow" rate={0.7} /></div>}
    <AudioError />
    {q.ar && <div className={`stim ${q.big ? 'big' : ''}`}><Ar>{q.ar}</Ar></div>}
    {q.ayah && !(q.hideText && !checked) && <AyahWords words={q.ayah.words} hi={q.kind === 'mcq' ? q.ayah.hi : []} picked={taps} marks={marks} onTap={q.kind === 'tap' && !checked ? (w) => setTaps((t) => (t.includes(w) ? t.filter((x) => x !== w) : [...t, w])) : undefined} />}
    {q.kind === 'mcq' && <div className="opts">{q.options!.map((o, k) => <button type="button" key={k} disabled={checked} className={`opt ${checked && k === q.answer ? 'ok' : ''} ${checked && k === sel && k !== q.answer ? 'bad' : ''}`} onClick={() => { setSel(k); finish(k === q.answer); }}><kbd>{k + 1}</kbd>{q.optAr ? <Ar>{o}</Ar> : <Mixed text={o} />}</button>)}</div>}
    {q.kind === 'order' && <>
      {q.en && <p className="muted">{q.en}</p>}
      <div className="order quran" aria-label="Your answer">{seq.map((k) => <button type="button" key={k} disabled={checked} onClick={() => setSeq((s) => s.filter((x) => x !== k))}>{q.order![k]}</button>)}</div>
      {!checked && <div className="order bank quran">{bank.filter((k) => !seq.includes(k)).map((k) => <button type="button" key={k} onClick={() => setSeq((s) => [...s, k])}>{q.order![k]}</button>)}</div>}
      {!checked && <button type="button" className="btn primary" disabled={seq.length !== q.order!.length} onClick={() => finish(seq.map((k) => q.order![k]).join(' ') === q.order!.join(' '))}>Check</button>}
      {checked && !ok && <div className="order quran">{q.order!.map((w, k) => <button type="button" key={k} disabled>{w}</button>)}</div>}
    </>}
    {q.kind === 'tap' && !checked && <button type="button" className="btn primary" disabled={!taps.length} onClick={() => finish(taps.length === q.taps!.length && taps.every((t) => q.taps!.includes(t)))}>Check</button>}
    {checked && <div className={`fb ${ok ? 'ok' : 'bad'}`} role="status">
      <b>{ok ? 'Correct.' : 'Not quite.'}</b>
      {q.explain.split('\n').map((l, k) => <p key={k}><Mixed text={l} /></p>)}
      <div className="row between">{showRef && <span className="row"><Flag kind={q.verified ? 'verified' : 'authored'} /><Report where={q.ref || q.tag} /></span>}<button type="button" className="btn primary" onClick={next} autoFocus>{i + 1 >= questions.length ? 'Finish' : 'Next'}</button></div>
    </div>}
  </div>;
}
export function ScoreLine({ r }: { r: QuizResult }) { return <p className="score"><b>{r.correct} / {r.total}</b> correct ({Math.round((100 * r.correct) / Math.max(1, r.total))}%)</p>; }
