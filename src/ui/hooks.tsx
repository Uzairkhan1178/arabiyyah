import { useEffect, useState } from 'react';
import { loadSurah, type Surah, SURAHS } from '../lib/quran';
import { askTutor, aiEnabled } from '../lib/ai';
import { Flag, Link } from './core';
import { get, put, del, useDB } from '../lib/db';

export function useSurahs(ns: number[]): { data: Surah[] | null; error: string | null } {
  const [st, set] = useState<{ data: Surah[] | null; error: string | null }>({ data: null, error: null });
  const key = ns.join(',');
  useEffect(() => { let live = true; set({ data: null, error: null }); Promise.all(ns.map(loadSurah)).then((d) => live && set({ data: d, error: null })).catch((e) => live && set({ data: null, error: String(e.message || e) })); return () => { live = false; }; }, [key]);
  return st;
}
export function SurahSelect({ value, onChange, only }: { value: number; onChange: (n: number) => void; only?: number[] }) {
  return <select value={value} onChange={(e) => onChange(+e.target.value)} aria-label="Surah">{SURAHS.filter((s) => !only || only.includes(s.n)).map((s) => <option key={s.n} value={s.n}>{s.n}. {s.tl}</option>)}</select>;
}
export function Loading({ error }: { error?: string | null }) { return error ? <p className="warn">{error}. Connect once to download this surah; it is then kept for offline use.</p> : <p className="muted">Loading…</p>; }

export function Tutor({ context }: { context: string }) {
  const [q, setQ] = useState(''); const [a, setA] = useState<string | null>(null); const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  if (!aiEnabled()) return <p className="muted sm">Optional: add an API key in <Link to="settings">Settings</Link> to ask an AI tutor about this. Everything else works without it.</p>;
  return <div className="card flat">
    <div className="row between"><h3>Ask the tutor</h3><Flag kind="ai" /></div>
    <form className="row" onSubmit={async (e) => { e.preventDefault(); if (!q.trim()) return; setBusy(true); setErr(null); try { setA(await askTutor(context, q)); } catch (x: any) { setErr(navigator.onLine ? x.message : 'The tutor needs a connection. Lessons and drills work offline.'); } setBusy(false); }}>
      <input className="grow" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Why is this word manṣūb?" aria-label="Question for the tutor" /><button className="btn primary" disabled={busy}>{busy ? 'Thinking…' : 'Ask'}</button>
    </form>
    {err && <p className="warn">{err}</p>}
    {a && <div className="callout"><b>AI answer — may contain errors</b>{a.split('\n').map((l, i) => <p key={i}>{l}</p>)}</div>}
  </div>;
}
export function Notes({ id }: { id: string }) {
  useDB(); const rec = get(`note/${id}`); const [v, setV] = useState(rec?.text || '');
  useEffect(() => { setV(get(`note/${id}`)?.text || ''); }, [id]);
  return <label>My notes<textarea rows={3} value={v} onChange={(e) => setV(e.target.value)} onBlur={() => (v.trim() ? put(`note/${id}`, { text: v, id }) : rec && del(`note/${id}`))} placeholder="Saved automatically when you leave the box." /></label>;
}
export function Bookmark({ id, label }: { id: string; label: string }) {
  useDB(); const on = !!get(`bm/${id}`);
  return <button type="button" className={`btn sm ${on ? 'on' : ''}`} onClick={() => (on ? del(`bm/${id}`) : put(`bm/${id}`, { id, label }))} aria-pressed={on}>{on ? '★ Bookmarked' : '☆ Bookmark'}</button>;
}
