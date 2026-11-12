// Local-first persistence. Every record lives in IndexedDB (store "items", key "k") and is mirrored in
// memory so the UI reads synchronously. Keys are "<type>/<id>"; the type prefix is indexed in memory.
import { openDB, type IDBPDatabase } from 'idb';
import { useSyncExternalStore } from 'react';

export type Rec = { k: string; u: number; [x: string]: any };

let idb: IDBPDatabase | null = null;
const byType = new Map<string, Map<string, Rec>>();
const subs = new Set<() => void>();
let version = 0;
export let storageOK = true;

const typeOf = (k: string) => k.slice(0, k.indexOf('/'));
function bucket(t: string) {
  let b = byType.get(t);
  if (!b) byType.set(t, (b = new Map()));
  return b;
}
function bump() {
  version++;
  subs.forEach((f) => f());
}

export async function initDB(name = 'arabiyyah') {
  byType.clear();
  try {
    idb = await openDB(name, 1, { upgrade(d) { d.createObjectStore('items', { keyPath: 'k' }); } });
    for (const r of (await idb.getAll('items')) as Rec[]) bucket(typeOf(r.k)).set(r.k, r);
    // Ask the browser not to evict our data under storage pressure.
    (globalThis as any).navigator?.storage?.persist?.().catch(() => {});
  } catch (e) {
    storageOK = false;
    console.warn('IndexedDB unavailable — progress will not persist', e);
  }
  bump();
}

// Sync bookkeeping lives on the record itself: _d = changed locally since the last upload,
// _x = deleted (a tombstone, kept so the deletion can travel to other devices).
export const LOCAL_ONLY = new Set(['sync', 'offline']);
export function get<T = any>(k: string): (T & Rec) | undefined {
  const r = byType.get(typeOf(k))?.get(k) as any;
  return r && !r._x ? r : undefined;
}
export function put(k: string, v: object): Rec {
  const r = { ...v, k, u: Date.now(), _d: 1 } as Rec;
  delete r._x;
  bucket(typeOf(k)).set(k, r);
  idb?.put('items', r).catch((e) => console.warn('write failed', e));
  bump();
  return r;
}
/** Store a record exactly as given (no timestamp or dirty-flag changes). Used by sync. */
export function putRaw(r: Rec, quiet = false) {
  bucket(typeOf(r.k)).set(r.k, r);
  idb?.put('items', r).catch((e) => console.warn('write failed', e));
  if (!quiet) bump();
}
export const rawGet = (k: string): Rec | undefined => byType.get(typeOf(k))?.get(k);
export function rawAll(): Rec[] { const out: Rec[] = []; byType.forEach((b) => b.forEach((r) => out.push(r))); return out; }
export const notify = () => bump();
export function deviceId(): string {
  let d = rawGet('sync/device');
  if (!d) { d = { k: 'sync/device', u: Date.now(), id: Math.random().toString(36).slice(2, 10) }; putRaw(d, true); }
  return d.id;
}
export function patch(k: string, v: object) {
  return put(k, { ...(get(k) || {}), ...v });
}
export function del(k: string) {
  if (!rawGet(k)) return;
  if (LOCAL_ONLY.has(typeOf(k))) { byType.get(typeOf(k))?.delete(k); idb?.delete('items', k).catch(() => {}); }
  else putRaw({ k, u: Date.now(), _x: 1, _d: 1 }, true);
  bump();
}
export function list<T = any>(type: string): (T & Rec)[] {
  return [...(byType.get(type)?.values() || [])].filter((r) => !r._x) as any;
}
export function subscribe(f: () => void) {
  subs.add(f);
  return () => subs.delete(f);
}
/** Re-render the calling component whenever any record changes. */
export function useDB() {
  return useSyncExternalStore(subscribe, () => version, () => version);
}

// ---- settings & profile -------------------------------------------------------------------------
export const DEFAULT_ALLOC = { vocab: 12, sarf: 10, nahw: 10, lab: 13, hifz: 10, conv: 5 };
export const DEFAULTS = {
  theme: 'auto' as 'auto' | 'light' | 'dark',
  scale: 1,
  reciter: 'ar.husary',
  rate: 1,
  retention: 0.9,
  newWords: 8,
  hifzNew: 1,
  alloc: DEFAULT_ALLOC,
  explainLang: 'both' as 'both' | 'en' | 'ur' | 'min',
  aiKey: '',
  aiModel: 'claude-sonnet-5-5',
  showTranslit: true,
};
export type Settings = typeof DEFAULTS;
export function settings(): Settings {
  return { ...DEFAULTS, ...(get('set/settings') || {}) } as Settings;
}
export function setSettings(p: Partial<Settings>) {
  patch('set/settings', p);
}

// ---- attempt log --------------------------------------------------------------------------------
export type Attempt = { t: number; mod: string; kind: string; tag?: string; ok: boolean; ms?: number; ref?: string; item?: string };
let seq = 0;
export function logAttempt(a: Omit<Attempt, 't'>) {
  const t = Date.now();
  put(`log/${t}-${seq++ % 1000}-${deviceId()}`, { ...a, t, dv: deviceId() });
}
export function attempts(sinceDays = 3650): Attempt[] {
  const since = Date.now() - sinceDays * 864e5;
  return list<Attempt>('log').filter((a) => a.t >= since);
}

// ---- days / study time --------------------------------------------------------------------------
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export function today() {
  return get(`day/${dayKey()}`) || { min: {}, done: {} };
}
export function addStudySeconds(mod: string, sec: number) {
  const d = today();
  const min = { ...(d.min || {}) };
  min[mod] = (min[mod] || 0) + sec / 60;
  put(`day/${dayKey()}`, { ...d, min });
}
export function markDone(seg: string, value: any = true) {
  const d = today();
  put(`day/${dayKey()}`, { ...d, done: { ...(d.done || {}), [seg]: value } });
}

// ---- backup / restore ---------------------------------------------------------------------------
export function exportAll(): string {
  const items: Rec[] = [];
  byType.forEach((b, t) => b.forEach((r) => { if (!r._x && !LOCAL_ONLY.has(t)) items.push(r); }));
  // The AI key is a secret: never write it into a backup file.
  const clean = items.map(({ _d, ...r }) => (r.k === 'set/settings' ? { ...r, aiKey: '' } : r) as Rec);
  return JSON.stringify({ app: 'arabiyyah', format: 1, exportedAt: new Date().toISOString(), items: clean });
}
export async function importAll(json: string, mode: 'merge' | 'replace'): Promise<{ added: number; updated: number; kept: number }> {
  const data = JSON.parse(json);
  if (data?.app !== 'arabiyyah' || !Array.isArray(data.items)) throw new Error('This file is not an Arabiyyah backup.');
  const res = { added: 0, updated: 0, kept: 0 };
  if (mode === 'replace') {
    const key = settings().aiKey;
    byType.clear();
    await idb?.clear('items');
    if (key) put('set/settings', { aiKey: key });
  }
  const tx = idb?.transaction('items', 'readwrite');
  for (const r of data.items as Rec[]) {
    if (!r || typeof r.k !== 'string' || !r.k.includes('/')) continue;
    if (LOCAL_ONLY.has(typeOf(r.k))) continue;
    const cur = rawGet(r.k);
    if (!cur) res.added++;
    else if ((r.u || 0) > (cur.u || 0)) res.updated++;
    else { res.kept++; continue; }
    const rec = { ...(r.k === 'set/settings' ? { ...r, aiKey: cur?.aiKey || '' } : r), _d: 1 } as Rec;
    bucket(typeOf(r.k)).set(r.k, rec);
    tx?.store.put(rec);
  }
  await tx?.done;
  bump();
  return res;
}
/** Erase progress. With propagate=true every record becomes a tombstone so the erasure reaches synced devices too. */
export async function wipeAll(propagate = false) {
  if (propagate) { for (const r of rawAll()) if (!LOCAL_ONLY.has(typeOf(r.k)) && !r._x) putRaw({ k: r.k, u: Date.now(), _x: 1, _d: 1 }, true); bump(); return; }
  byType.clear();
  await idb?.clear('items');
  bump();
}
