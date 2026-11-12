// Sync controller and its Settings card. Firebase is imported lazily: a device that never signs in never loads it.
import { useEffect, useState, useSyncExternalStore } from 'react';
import { useDB } from '../lib/db';
import { syncNow, pendingCount, syncState } from '../lib/sync';

type S = { ready: boolean; user: { uid: string; email: string } | null; busy: boolean; error: string | null; note: string | null };
let st: S = { ready: false, user: null, busy: false, error: null, note: null };
const subs = new Set<() => void>(); const set = (p: Partial<S>) => { st = { ...st, ...p }; subs.forEach((f) => f()); };
let fb: typeof import('../lib/firebase') | null = null; let loading: Promise<typeof import('../lib/firebase')> | null = null;
function load() {
  if (!loading) loading = import('../lib/firebase').then((m) => { fb = m; m.onUser((u) => { set({ ready: true, user: u ? { uid: u.uid, email: u.email || '' } : null }); if (u) runSync(); }); return m; });
  return loading;
}
export async function runSync() {
  if (!fb || !st.user || st.busy || !navigator.onLine) return;
  set({ busy: true, error: null });
  try { const r = await syncNow(fb.remoteFor(st.user.uid), st.user.uid); set({ busy: false, note: r.pushed || r.pulled ? `${r.pushed} sent, ${r.pulled} received` : 'Up to date' }); }
  catch (e: any) { set({ busy: false, error: fb.authMessage(e) }); }
}
/** Called once at start: resumes a previous sign-in and keeps the device in step while the app is open. */
export function startSync() {
  if (syncState()) load().catch(() => {});
  setInterval(() => { if (st.user && pendingCount() > 0) runSync(); }, 120000);
  document.addEventListener('visibilitychange', () => { if (st.user && (document.visibilityState === 'hidden' ? pendingCount() > 0 : true)) runSync(); });
  addEventListener('online', () => runSync());
}
export const useSyncStatus = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => st, () => st);
const ago = (t: number) => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : new Date(t).toLocaleDateString(); };

export function SyncCard() {
  useDB(); const s = useSyncStatus(); const [email, setEmail] = useState(''); const [pw, setPw] = useState(''); const [msg, setMsg] = useState<string | null>(null); const [working, setWorking] = useState(false);
  useEffect(() => { load().catch(() => setMsg('Sync could not be loaded. Check the connection and reopen Settings.')); }, []);
  const state = syncState(); const pending = pendingCount();
  const act = async (kind: 'in' | 'up' | 'reset') => {
    setMsg(null); setWorking(true);
    try { const m = await load(); if (kind === 'in') await m.signIn(email.trim(), pw); else if (kind === 'up') await m.signUp(email.trim(), pw); else { await m.resetPassword(email.trim()); setMsg('If that address has an account, a reset email is on its way.'); } setPw(''); }
    catch (e: any) { setMsg((fb || (await load())).authMessage(e)); }
    setWorking(false);
  };
  return <div className="card"><h3>Sync across devices</h3>
    {!s.ready ? <p className="muted sm">Checking sign-in…</p> : s.user ? <>
      <p style={{ margin: 0 }}>Signed in as <b>{s.user.email}</b></p>
      <p className="muted sm">{s.busy ? 'Syncing…' : state?.last ? `Last synced ${ago(state.last)}${s.note ? ` · ${s.note}` : ''}` : 'Not synced yet'} · {pending} change{pending === 1 ? '' : 's'} waiting</p>
      {s.error && <p className="warn sm">{s.error}</p>}
      <div className="row"><button className="btn primary" disabled={s.busy} onClick={runSync}>Sync now</button><button className="btn" onClick={() => fb?.signOutUser()}>Sign out</button></div>
      <p className="muted sm" style={{ marginTop: '.6rem' }}>Sign in with the same email on each device. Changes upload when you leave the app and every two minutes while you study; study itself never waits for the network. If the same item is changed on two devices, the later change wins. Text size, theme and the AI key stay on each device.</p></> : <>
      <p className="muted sm">Create one account, then sign in with it on your phone, tablet and computer. Progress on this device is kept and merged.</p>
      <form className="grid" style={{ gap: '.5rem' }} onSubmit={(e) => { e.preventDefault(); act('in'); }}>
        <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required /></label>
        <label>Password<input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" minLength={6} required /></label>
        <div className="row"><button className="btn primary" disabled={working}>Sign in</button><button type="button" className="btn" disabled={working || !email || pw.length < 6} onClick={() => act('up')}>Create account</button><button type="button" className="link sm" disabled={!email} onClick={() => act('reset')}>Forgot password</button></div>
      </form></>}
    {msg && <p className="sm" role="status">{msg}</p>}
  </div>;
}
