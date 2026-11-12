// Device sync: local-first, newest-edit-wins. The engine talks to a small Remote interface so the merge
// logic is tested without any network; src/lib/firebase.ts implements Remote on Firestore.
import { rawAll, rawGet, putRaw, notify, deviceId, LOCAL_ONLY, type Rec } from './db';

export type RemoteDoc = { k: string; u: number; d: string | null };          // d = JSON of the record, null = deleted
export interface Remote { pull(since: number): Promise<{ docs: RemoteDoc[]; cursor: number }>; push(docs: RemoteDoc[]): Promise<void> }
export type SyncResult = { pushed: number; pulled: number; at: number };

const OVERLAP = 5 * 60 * 1000;                 // re-read the last five minutes on every pull; applying twice is harmless
const DEVICE_FIELDS = ['aiKey', 'theme', 'scale'];   // settings that stay on each device
const typeOf = (k: string) => k.slice(0, k.indexOf('/'));
const dayOf = (t: number) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const strip = ({ _d, ...r }: Rec) => r;

function applyRemote(doc: RemoteDoc): number {
  if (doc.k.startsWith('logbundle/')) {        // one document per device per day, holding that day's answers
    let n = 0;
    for (const r of JSON.parse(doc.d || '[]') as Rec[]) if (!rawGet(r.k)) { putRaw(r, true); n++; }
    return n;
  }
  const cur = rawGet(doc.k);
  if (doc.d === null) { if (cur && !cur._x && cur.u < doc.u) { putRaw({ k: doc.k, u: doc.u, _x: 1 }, true); return 1; } if (!cur) putRaw({ k: doc.k, u: doc.u, _x: 1 }, true); return 0; }
  const inc = JSON.parse(doc.d) as Rec;
  if (typeOf(doc.k) === 'day' && cur && !cur._x) {      // two devices on one day: keep the larger minute count per module, union of completed parts
    const min: Record<string, number> = { ...(cur.min || {}) }; let changed = false;
    for (const [m, v] of Object.entries(inc.min || {})) if ((v as number) > (min[m] || 0)) { min[m] = v as number; changed = true; }
    const done = { ...(inc.done || {}), ...(cur.done || {}) }; if (Object.keys(done).length !== Object.keys(cur.done || {}).length) changed = true;
    if (!changed) return 0;
    const localHasMore = Object.entries(cur.min || {}).some(([m, v]) => (v as number) > ((inc.min || {})[m] || 0)) || Object.keys(cur.done || {}).some((d) => !(inc.done || {})[d]);
    putRaw({ ...cur, min, done, u: Math.max(cur.u, inc.u), ...(localHasMore ? { _d: 1 } : { _d: undefined }) }, true); return 1;
  }
  if (cur && cur.u >= inc.u) return 0;
  if (doc.k === 'set/settings' && cur) for (const f of DEVICE_FIELDS) { if (cur[f] !== undefined) inc[f] = cur[f]; else delete inc[f]; }
  putRaw(inc, true); return 1;
}
function collectDirty(): { docs: RemoteDoc[]; clear: Rec[] } {
  const docs: RemoteDoc[] = []; const clear: Rec[] = []; const logDays = new Set<string>(); const me = deviceId();
  for (const r of rawAll()) {
    if (!r._d || LOCAL_ONLY.has(typeOf(r.k))) continue;
    clear.push(r);
    if (typeOf(r.k) === 'log') { if (r.dv === me) logDays.add(dayOf(r.t)); continue; }
    if (r._x) { docs.push({ k: r.k, u: r.u, d: null }); continue; }
    const body = strip(r);
    if (r.k === 'set/settings') for (const f of DEVICE_FIELDS) delete (body as any)[f];
    docs.push({ k: r.k, u: r.u, d: JSON.stringify(body) });
  }
  if (logDays.size) {
    const mine = rawAll().filter((r) => typeOf(r.k) === 'log' && r.dv === me && !r._x);
    for (const day of logDays) { const recs = mine.filter((r) => dayOf(r.t) === day).map(strip); docs.push({ k: `logbundle/${day}|${me}`, u: Math.max(...recs.map((r) => r.u)), d: JSON.stringify(recs) }); }
  }
  return { docs, clear };
}
export const pendingCount = () => rawAll().filter((r) => r._d && !LOCAL_ONLY.has(typeOf(r.k))).length;
export const syncState = () => rawGet('sync/state') as (Rec & { cursor: number; last: number; uid: string; error?: string }) | undefined;

let running: Promise<SyncResult> | null = null;
export function syncNow(remote: Remote, uid: string): Promise<SyncResult> {
  if (running) return running;
  running = (async () => {
    let st = syncState();
    if (!st || st.uid !== uid) {               // first sync on this device for this account: read everything, offer everything
      for (const r of rawAll()) if (!LOCAL_ONLY.has(typeOf(r.k)) && !r._d) putRaw({ ...r, _d: 1 }, true);
      st = { k: 'sync/state', u: Date.now(), cursor: 0, last: 0, uid };
    }
    const { docs, cursor } = await remote.pull(Math.max(0, st.cursor - OVERLAP));
    let pulled = 0; for (const d of docs) pulled += applyRemote(d);
    const out = collectDirty();
    if (out.docs.length) await remote.push(out.docs);
    for (const r of out.clear) { const now = rawGet(r.k); if (now === r) { const { _d, ...clean } = now; putRaw(clean as Rec, true); } }   // edited during the upload? stays dirty
    const at = Date.now(); putRaw({ k: 'sync/state', u: at, cursor: Math.max(cursor, st.cursor), last: at, uid }, true);
    notify();
    return { pushed: out.docs.length, pulled, at };
  })().finally(() => { running = null; });
  return running;
}
