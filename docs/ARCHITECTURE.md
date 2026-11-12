# Curriculum and architecture

## 1. Decisions and why

| Decision | Reason |
|---|---|
| Installable PWA (React + TypeScript + Vite), hosted as static files | One codebase for Windows, Android tablet and phone. A Claude artifact was rejected: artifact pages block outside audio and service workers, so recitation, offline use and installation would all be impossible. |
| Local-first storage in IndexedDB, mirrored in memory | Works offline, no account, no server. Backup file for device change. |
| Quran text, grammar tags and glosses are bundled data built by a script | The app never generates or edits Quranic text. Every word keeps its `surah:ayah:word` reference. |
| Exercises are generated from Quranic Arabic Corpus tags | Unlimited practice on authentic words with answer keys that come from a published annotation, not from AI. |
| Scheduling with FSRS (`ts-fsrs`), one card per item **and** per kind of understanding | Recognition, recall, context and listening are separate skills and are scheduled and judged separately. |
| AI is an optional add-on behind one module (`src/lib/ai.ts`) | Lessons, drills, scheduling and assessment work with no AI service and no connection. |
| Hash routing, relative base path | The same build runs at a domain root or under `/repo/` on GitHub Pages. |

## 2. Quranic content strategy

`scripts/build_data.py` reads four sources and writes `public/data/`:

| Output | Content | Source |
|---|---|---|
| `quran/<n>.json` (114 files) | Ayah text as word tokens, per-word segments with tags, gloss, transliteration, two translations | Tanzil Uthmani text; Quranic Arabic Corpus v0.4; Quran.com word-by-word; QuranEnc |
| `lexicon.json` | 4,771 lemmas: root, part of speech, frequency, most common renderings, example references | computed from the above |
| `roots.json` | 1,651 roots with their lemmas and counts | computed |
| `meta.json` | Surah list, provenance, licence notes, integrity statistics | computed |

Integrity checks run in the build and again in the test suite:

- 6,236 ayahs, 77,433 words.
- 6,232 ayahs align word-for-word between Tanzil and the corpus. The four that do not (2:181, 8:6, 13:37, 37:130) are flagged; the app shows their text and translation but attaches no word-level grammar.
- For 77,064 of 77,383 aligned words (99.6%), joining the corpus segments reproduces the Tanzil word letter-for-letter. This is an independent cross-check of the text.
- The basmala that Tanzil prefixes to ayah 1 is stored separately per surah and never counted as part of the ayah.
- The Tanzil export used has no pause marks.

Content is labelled wherever it appears:

| Label | Meaning |
|---|---|
| Verified data | Read from the Tanzil text or a corpus tag |
| Rule-derived hint | Computed by a rule over verified tags (structure hints, word pattern, conjugation tables) |
| Authored — verify | Written for this app: lesson explanations, concept questions, vocabulary notes, reading passages, sentence analyses |
| Translation | A published translation, unmodified; kept apart from linguistic analysis |
| AI-generated | Live tutor output only |

Tafsīr is not generated. The Lab links out to published tafsīr and says so.

## 3. Curriculum structure

Seven strands share one evidence store, so each feeds the others.

| Strand | Unit | Evidence it produces |
|---|---|---|
| Vocabulary | Lemma, in frequency order | Four cards per word: recognition, recall, in context, by ear |
| Ṣarf | 16 lessons | Mastery check score; application card; tagged drill answers |
| Naḥw | 20 lessons | Same |
| Quran Lab | Ayah | Words known before reveal; structure answers; self-rating capped by objective answers; retest card |
| Listening | Word / ayah | Accuracy by ear, compared with accuracy by eye |
| Ḥifẓ | Ayah | Recall rating from marked mistakes; mistake log |
| Reading | Passage line | Clean-line rate per unvowelling stage |
| Conversation | Phrase / reply | Production card; reply accuracy |

### Prerequisites

Naḥw: n1 → n2 → n3 → {n4, n5}; n4 → n6; {n5, n6} → n7; n6 → n8; {n3, s2} → n9 → n10; n5 → n11; {n11, s2} → n12; then n13–n20.
Ṣarf: s1 → s2 → s3 → s4; {s2, n8} → s5; s1 → s6 → s7; s3 → s8; {s3, s7} → s9 → s10; then s11–s16.

A lesson opens only when every prerequisite has been passed. The test suite checks that the graph has no cycles and that every lesson sits in exactly one phase.

### Why this order

Case endings (n3) come before sentence types because they are what let a reader find the doer and the object in free word order. Prepositions (n4) and iḍāfa (n6) come early because together they account for most genitive endings in Al-Mulk and Ar-Raḥmān. Roots (s1) come first in Ṣarf because the student already owns hundreds of Arabic root families through Urdu.

### Using Urdu

Every full lesson has an "Urdu bridge" (what transfers) and a "Where Urdu speakers slip" note (what does not): postposition habits, verb-final order, absent dual, absent article, iḍāfa direction, and false friends such as غریب and ذلیل. 88 of the 132 curated vocabulary notes mark words the student already knows from Urdu.

## 4. Daily learning algorithm

Default allocation (adjustable; conversation capped at 10 minutes):

| Part | Minutes | What the planner puts in it |
|---|---:|---|
| Vocabulary | 12 | Due cards (max 40), then new words up to the daily limit; none if more than 30 reviews wait |
| Ṣarf | 10 | Current lesson, then its mastery check; due concept reviews |
| Naḥw | 10 | Same |
| Quran listening and comprehension | 13 | The next Lab ayah (or a due retest), then a listening drill |
| Ḥifẓ | 10 | Due revisions (max 12), six assessment ayahs, then new ayahs if allowed |
| Conversation | 5 | One unit: phrases, recall, exchange |

Each part is marked done by finishing its questions, not by a button. Study time is counted only while the tab is visible and there was input in the last 90 seconds.

### Adaptation rules

| Evidence | Response |
|---|---|
| By-ear accuracy more than 15 points below reading accuracy (12+ answers each, 21 days) | 3 minutes move from vocabulary to listening |
| A grammar tag below 70% over 6+ answers | Listed as a weak spot with a ten-question targeted drill and a link to its lesson |
| Three or more misses in one root family in 30 days | Family shown under "Root families you keep missing" |
| Ḥifẓ revision below 85% over 14 days, or more than 12 revisions overdue | New memorisation paused, with the reason shown |
| Wrong answer in a vocabulary session | Card is rescheduled by FSRS and repeated once at the end of the session |
| Failed mastery check | Alternative explanation shown, missed items listed, retry offered |

## 5. Progression rules

- A lesson is passed at 80% on a ten-question check that mixes authored concept questions with corpus-generated ones. Passing creates an application card that returns at growing intervals.
- Word status: *new* → *learning* → *review* → *mastered*, or *difficult* after three lapses. **Mastered** requires recall stability of 21+ days **and** the same for context or listening. Recognition alone never reaches it.
- A deeper kind of test unlocks only after the shallower one has held twice.
- A surah reported as memorised is assessed six ayahs a day by recitation before any of it counts.
- A phase is left by meeting its gates (see My Curriculum), not by date. There are no points, levels or streak rewards.

## 6. Data model

One IndexedDB store, `items`, keyed by `<type>/<id>`. Every record carries `u` (updated, ms).

| Key | Holds |
|---|---|
| `set/profile`, `set/settings`, `set/lab`, `set/reading`, `set/backup` | Student profile, settings, Lab pointer, reading stage, last backup |
| `card/<type>\|<id>\|<dim>` | FSRS state. Types: `vocab`, `grammar`, `ayah`, `hifz`, `conv` |
| `log/<time>-<n>` | One answer: module, kind, competence tag, correct, milliseconds, reference, item |
| `day/<yyyy-mm-dd>` | Minutes per module; parts completed |
| `lesson/<id>` | Read, attempts, best score, passed |
| `lab/<s:a>` | Words known before reveal, the student's written answer, rating |
| `hifzset/<s>`, `mist/<s:a:w>` | Tracked surahs; mistake counts per word |
| `assess/<time>` | Assessment result by area |
| `note/<id>`, `bm/<id>`, `report/<time>`, `readdone/<id>`, `offline/<id>` | Notes, bookmarks, error reports, finished passages, saved audio |

Backups are a JSON dump of this store. The AI key is never written to a backup.

## 7. Source layout

```
scripts/build_data.py     builds public/data from the sources
scripts/check_examples.py prints the words each lesson example highlights
scripts/check_quotes.py   checks Quranic quotations typed in lessons against the text
scripts/e2e.mjs           browser checks
src/lib/                  db, srs, quran (data + tag decoding), gen (exercise generators), conj, planner, vocab, ai
src/content/              lessons, vocabulary notes, passages, conversation, analyses, roadmap
src/pages/                one file per section
src/ui/                   router, audio, timer, quiz runner, shared pieces
tests/logic.test.ts       57 tests
```

## 8. Risks

| Risk | Status |
|---|---|
| Audio hosts are third parties and could change or block | Reciter fallback is built in; sample recordings from every reciter and the word audio loaded in a desktop browser; in-app playback could not run in the build sandbox |
| Authored explanations may contain errors | Labelled; error reports are stored and exportable; drills do not depend on them |
| Word-by-word glosses are per occurrence, not dictionary definitions | Shown with counts as "rendered in the Quran as"; curated notes for the top words |
| Browser storage can be cleared | Persistent-storage request at start; backup file; warning banner if storage is blocked |
| Sentence roles (mubtadaʾ, fāʿil…) are not in the morphology data | Rule-derived hints, eight authored analyses, and a link to the corpus treebank; full treebank import is future work |
