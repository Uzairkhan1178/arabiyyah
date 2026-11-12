// Small Arabic text helpers. stripHarakat is used ONLY on non-Quranic reading passages and for search keys.
const HARAKAT = /[ً-ْٰـۖ-ۭٓ-ٕ]/g;
const SHORT = /[ً-ِْٰ]/g; // tanwin, fatha, damma, kasra, sukun, dagger alif (keeps shadda)
export const stripHarakat = (s: string) => s.replace(HARAKAT, '');
/** Unvowelling stages for the reading ladder: 1 full, 2 drop sukun + vowels implied by a long vowel, 3 keep shadda & case endings only, 4 keep shadda only, 5 bare. */
export function unvowel(text: string, stage: number): string {
  if (stage <= 1) return text;
  if (stage >= 5) return stripHarakat(text);
  return text.split(' ').map((w) => {
    if (stage === 2) return w.replace(/ْ/g, '').replace(/َ(?=ا)/g, '').replace(/ُ(?=و(?![ً-ْ]))/g, '').replace(/ِ(?=ي(?![ً-ْ]))/g, '');
    if (stage === 3) { // keep shadda everywhere, plus the final short vowel or tanwin (the case ending)
      const m = w.match(/^(.*?)(\u064B[\u0627\u0649]|[\u064B-\u0650])?([.،؟!:]*)$/)!;
      return m[1].replace(SHORT, '') + (m[2] || '') + m[3];
    }
    return w.replace(SHORT, '');
  }).join(' ');
}
export const norm = (s: string) => stripHarakat(s).replace(/[ٱأإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').trim();
export function shuffle<T>(a: T[], rnd = Math.random): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}
export const pick = <T,>(a: T[], rnd = Math.random) => a[Math.floor(rnd() * a.length)];
export function sample<T>(a: T[], n: number, rnd = Math.random): T[] { return shuffle(a, rnd).slice(0, n); }
export function mulberry(seed: number) {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
