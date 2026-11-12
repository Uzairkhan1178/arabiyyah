import type { GenName } from '../lib/gen';

export type Block = { h?: string; p?: string; table?: string[][] };
export type Check = { q: string; ar?: string; options: string[]; answer: number; why: string; optAr?: boolean };
export type Lesson = {
  id: string; track: 'nahw' | 'sarf'; n: number; phase: 'A' | 'B1' | 'B2' | 'B3';
  title: string; ar: string; prereq: string[]; goal: string;
  body: Block[]; urdu: string; pitfall: string; alt: string;
  examples: { ref: string; hi: number[]; note: string }[];
  checks: Check[]; gens: GenName[]; status: 'full' | 'outline'; conj?: 'perf' | 'impf' | 'impv';
};
