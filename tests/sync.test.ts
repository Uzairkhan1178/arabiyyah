import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { initDB, put, get, del, list, patch, logAttempt, attempts, rawGet, settings, setSettings, exportAll } from '../src/lib/db';
import { syncNow, pendingCount, type Remote, type RemoteDoc } from '../src/lib/sync';
import { review, getCard } from '../src/lib/srs';

function fakeRemote() {
  const store = new Map<string, RemoteDoc & { s: number }>(); let clock = Date.now();
  const remote: Remote = {
    async pull(since) { const docs = [...store.values()].filter((d) => d.s > since); return { docs, cursor: Math.max(since, ...docs.map((d) => d.s)) }; },
    async push(docs) { for (const d of docs) store.set(d.k, { ...d, s: ++clock }); },
  };
  return { remote, store };
}
const tick = (ms = 25) => new Promise((r) => setTimeout(r, ms));
let n = 0;
function world() { const id = n++; const { remote, store } = fakeRemote(); const on = async (dev: 'A' | 'B') => { await tick(); await initDB(`w${id}${dev}`); }; const sync = () => syncNow(remote, 'user1'); return { on, sync, store }; }

describe('device sync', () => {
  it('carries records from one device to another', async () => {
    const w = world(); await w.on('A'); put('note/x', { text: 'from A' }); review('vocab', 'k|N', 'rec', 3); put('set/profile', { name: 'Uzair' });
    const r = await w.sync(); expect(r.pushed).toBe(3); expect(pendingCount()).toBe(0);
    await w.on('B'); expect(get('note/x')).toBeUndefined();
    const r2 = await w.sync(); expect(r2.pulled).toBe(3); expect(get('note/x')!.text).toBe('from A'); expect(getCard('vocab', 'k|N', 'rec')!.reps).toBe(1); expect(pendingCount()).toBe(0);
  });
  it('a second sync with nothing new moves nothing', async () => {
    const w = world(); await w.on('A'); put('note/x', { text: 'a' }); await w.sync(); const r = await w.sync(); expect(r).toMatchObject({ pushed: 0, pulled: 0 });
    await w.on('B'); await w.sync(); const r2 = await w.sync(); expect(r2).toMatchObject({ pushed: 0, pulled: 0 });
  });
  it('the newer edit wins on both devices', async () => {
    const w = world(); await w.on('A'); put('note/x', { text: 'v1' }); await w.sync();
    await w.on('B'); await w.sync(); await w.on('A'); put('note/x', { text: 'A edit (older)' });
    await w.on('B'); await tick(10); put('note/x', { text: 'B edit (newer)' });
    await w.on('A'); await w.sync(); await w.on('B'); await w.sync(); expect(get('note/x')!.text).toBe('B edit (newer)');
    await w.on('A'); await w.sync(); expect(get('note/x')!.text).toBe('B edit (newer)');
  });
  it('a deletion travels and does not come back', async () => {
    const w = world(); await w.on('A'); put('bm/1', { label: 'x' }); await w.sync(); await w.on('B'); await w.sync(); expect(get('bm/1')).toBeTruthy();
    del('bm/1'); expect(get('bm/1')).toBeUndefined(); expect(list('bm').length).toBe(0); await w.sync();
    await w.on('A'); await w.sync(); expect(get('bm/1')).toBeUndefined(); await w.sync(); await w.on('B'); await w.sync(); expect(get('bm/1')).toBeUndefined();
  });
  it('a record recreated after deletion is kept', async () => {
    const w = world(); await w.on('A'); put('bm/1', { label: 'x' }); await w.sync(); del('bm/1'); await w.sync(); await tick(5); put('bm/1', { label: 'again' }); await w.sync();
    await w.on('B'); await w.sync(); expect(get('bm/1')!.label).toBe('again');
  });
  it('answers from two devices are combined without duplicates, one cloud document per device per day', async () => {
    const w = world(); await w.on('A'); for (let i = 0; i < 3; i++) logAttempt({ mod: 'vocab', kind: 'review', ok: true }); await w.sync();
    await w.on('B'); for (let i = 0; i < 2; i++) logAttempt({ mod: 'hifz', kind: 'review', ok: false }); await w.sync(); expect(attempts().length).toBe(5);
    await w.on('A'); await w.sync(); await w.sync(); expect(attempts().length).toBe(5);
    expect([...w.store.keys()].filter((k) => k.startsWith('logbundle/')).length).toBe(2); expect([...w.store.keys()].some((k) => k.startsWith('log/'))).toBe(false);
    logAttempt({ mod: 'vocab', kind: 'review', ok: true }); await w.sync(); await w.on('B'); await w.sync(); expect(attempts().length).toBe(6);
  });
  it('study minutes from two devices on one day are both kept', async () => {
    const w = world(); const day = `day/${new Date().toISOString().slice(0, 10)}`;
    await w.on('A'); put(day, { min: { vocab: 10 }, done: { vocab: true } }); await w.sync();
    await w.on('B'); put(day, { min: { hifz: 8, vocab: 2 }, done: { hifz: true } }); await w.sync(); expect(get(day)!.min).toEqual({ hifz: 8, vocab: 10 }); expect(get(day)!.done).toEqual({ hifz: true, vocab: true });
    await w.sync(); await w.on('A'); await w.sync(); expect(get(day)!.min).toEqual({ vocab: 10, hifz: 8 }); expect(get(day)!.done).toEqual({ vocab: true, hifz: true });
  });
  it('the AI key, theme and text size never leave the device', async () => {
    const w = world(); await w.on('A'); setSettings({ aiKey: 'sk-secret-A', theme: 'dark', newWords: 12 }); await w.sync();
    expect(JSON.stringify([...w.store.values()])).not.toContain('sk-secret-A'); expect(JSON.stringify([...w.store.values()])).not.toContain('dark');
    await w.on('B'); setSettings({ aiKey: 'sk-B', scale: 1.3 }); await tick(5); await w.on('A'); await tick(5); setSettings({ newWords: 15 }); await w.sync();
    await w.on('B'); await w.sync(); expect(settings().newWords).toBe(15); expect(settings().aiKey).toBe('sk-B'); expect(settings().scale).toBe(1.3); expect(settings().theme).toBe('auto');
  });
  it('a device that already has progress merges with the cloud on first sign-in', async () => {
    const w = world(); await w.on('A'); put('note/a', { text: 'A' }); await w.sync();
    await w.on('B'); put('note/b', { text: 'B' }); await tick(5); const before = rawGet('note/b')!.u; await w.sync(); expect(get('note/a')!.text).toBe('A'); expect(rawGet('note/b')!.u).toBe(before);
    await w.on('A'); await w.sync(); expect(get('note/b')!.text).toBe('B');
  });
  it('an edit made while an upload is in flight stays pending', async () => {
    const { remote } = fakeRemote(); await tick(); await initDB('flight'); put('note/x', { text: 'one' });
    const slow: Remote = { pull: remote.pull, push: async (d) => { put('note/x', { text: 'two' }); await remote.push(d); } };
    await syncNow(slow, 'u'); expect(pendingCount()).toBe(1); await syncNow(remote, 'u'); expect(pendingCount()).toBe(0);
  });
  it('backups leave out tombstones and sync bookkeeping', async () => {
    await tick(); await initDB('bk'); put('note/x', { text: 'x' }); put('bm/1', {}); del('bm/1'); const dump = JSON.parse(exportAll());
    expect(dump.items.map((i: any) => i.k)).toEqual(['note/x']); expect(dump.items[0]._d).toBeUndefined();
  });
  it('patch keeps working on synced records', async () => { const w = world(); await w.on('A'); put('lesson/n1', { read: true }); await w.sync(); patch('lesson/n1', { passed: true }); expect(pendingCount()).toBe(1); await w.sync(); await w.on('B'); await w.sync(); expect(get('lesson/n1')).toMatchObject({ read: true, passed: true }); });
});
