// Roadmaps. Dates are a pacing guide only: progression in the app is by demonstrated mastery, never by the calendar.
import { NAHW } from './nahw';
import { SARF } from './sarf';
import type { Lesson } from './types';

export const LESSONS: Lesson[] = [...NAHW, ...SARF];
export const LESSON = new Map(LESSONS.map((l) => [l.id, l]));
export const FAMILIAR = [67, 55]; // surahs the student has memorised: used first in every module
export const STARTER_POOL = [1, 67, 55];

export type Phase = { id: 'A' | 'B1' | 'B2' | 'B3'; title: string; window: string; aim: string; lessons: string[]; vocabTo: number; lab: string; reading: string; listening: string; conv: string[]; gates: string[] };
export const PHASES: Phase[] = [
  { id: 'A', title: 'Foundation', window: 'Nov – Dec 2026', aim: 'Build the grammatical skeleton and the first high-frequency vocabulary on passages you already know by heart.',
    lessons: ['n1', 's1', 'n2', 's2', 'n3', 's3', 'n4', 's4', 'n5', 's5', 'n6', 's6', 'n7', 's7', 'n8'], vocabTo: 300,
    lab: 'Al-Fātiḥa, Al-Mulk 1–30, Ar-Raḥmān 1–30', reading: 'Stages 1–2 (passages r1–r4)', listening: 'Words and single ayahs from Al-Mulk and Ar-Raḥmān', conv: ['c1', 'c2', 'c3'],
    gates: ['Pass the mastery check (80%) of every Phase A lesson', '250 of the top 300 words recognised; 150 recalled without options', 'Explain the structure of 20 Al-Mulk ayahs unaided in the Lab retest', 'Hifz retention of Al-Mulk and Ar-Raḥmān measured at 90% or better on due reviews'] },
  { id: 'B1', title: 'Sentences', window: 'Jan – Mar 2027', aim: 'Read verbal sentences with doer and object, the inna and kāna families, and the derived verb forms.',
    lessons: ['n9', 's8', 'n10', 's9', 'n11', 's10', 'n12', 'n13', 's11', 'n14'], vocabTo: 600,
    lab: 'Rest of Ar-Raḥmān; Juzʾ ʿAmma short surahs; Yā-Sīn 1–40', reading: 'Stages 2–3 (r5–r6)', listening: 'Ayah groups without text; first unseen short surahs', conv: ['c4', 'c5'],
    gates: ['Pass every Phase B1 lesson', '500 words recalled', 'Listening comprehension 70% on familiar surahs without text'] },
  { id: 'B2', title: 'Complex structure', window: 'Apr – Jun 2027', aim: 'Verb moods, conditionals, emphasis and weak verbs; move to narrative passages.',
    lessons: ['n15', 's12', 'n16', 's13', 'n17', 's14'], vocabTo: 1000,
    lab: 'Yūsuf (narrative); Al-Kahf selections', reading: 'Stages 3–4 (r7–r8 and new passages)', listening: 'Unseen passages: gist first, then detail', conv: ['c6', 'c7'],
    gates: ['Pass every Phase B2 lesson', '900 words recalled (≈ 88% of running words)', 'Ayah comprehension 70% on unseen narrative passages'] },
  { id: 'B3', title: 'Independence', window: 'Jul – Dec 2027', aim: 'Advanced sentence relationships, long ayahs, unvowelled reading, and tafsīr-assisted study kept separate from language analysis.',
    lessons: ['n18', 's15', 'n19', 's16', 'n20'], vocabTo: 1500,
    lab: 'Al-Baqara selections; long legal and argumentative passages', reading: 'Stages 4–5', listening: 'Continuous recitation with comprehension checks', conv: [],
    gates: ['Pass every Phase B3 lesson', '1,400 words recalled (≈ 92% of running words)', 'Unvowelled reading accuracy 90% on new passages', 'Listening comprehension 75% on unseen passages'] },
];
/** Pairing for the first seven weeks. Used to explain the plan; the scheduler itself follows mastery. */
export const WEEKS_A: { week: number; nahw: string; sarf: string; lab: string; focus: string }[] = [
  { week: 1, nahw: 'n1', sarf: 's1', lab: 'Al-Fātiḥa; Al-Mulk 1–4', focus: 'Sorting words; pulling out roots; placement diagnostic and hifz assessment' },
  { week: 2, nahw: 'n2', sarf: 's2', lab: 'Al-Mulk 5–9', focus: 'Definiteness; past-verb endings' },
  { week: 3, nahw: 'n3', sarf: 's3', lab: 'Al-Mulk 10–14', focus: 'Case endings; present-verb prefixes' },
  { week: 4, nahw: 'n4', sarf: 's4', lab: 'Al-Mulk 15–19', focus: 'Prepositions; commands' },
  { week: 5, nahw: 'n5', sarf: 's5', lab: 'Al-Mulk 20–24; Ar-Raḥmān 1–9', focus: 'Nominal sentence; unpacking verb + pronouns' },
  { week: 6, nahw: 'n6', sarf: 's6', lab: 'Al-Mulk 25–30; Ar-Raḥmān 10–18', focus: 'Iḍāfa; participles' },
  { week: 7, nahw: 'n7', sarf: 's7', lab: 'Ar-Raḥmān 19–30', focus: 'Adjectives; maṣdar; pronoun reference (n8); end-of-phase assessment' },
];
