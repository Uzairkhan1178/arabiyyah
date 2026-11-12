# Adding and correcting content

Two rules hold for everything below.

1. **Quranic text is never typed into the app.** Refer to it by reference (`67:1`, word numbers starting at 1). The Arabic is loaded from the verified data.
2. **Run the checks before you rely on new content:** `npm test`, `python3 -I scripts/check_examples.py`, `python3 -I scripts/check_quotes.py`.

## Lessons (`src/content/nahw.ts`, `src/content/sarf.ts`)

A lesson with `status: 'outline'` already has working drills. To give it a full explanation, replace the outline entry with an object of this shape and set `status: 'full'`:

| Field | Content |
|---|---|
| `goal` | One sentence: what the student can do afterwards |
| `body` | Blocks of `{ h?, p?, table? }`. The first table row is the header |
| `urdu`, `pitfall`, `alt` | Urdu bridge; the common Urdu-speaker error; a second explanation shown after a failed check |
| `examples` | `{ ref: '67:1', hi: [4], note }` — `hi` lists the word numbers to highlight |
| `checks` | Concept questions. Put the correct option **first** (`answer: 0`); options are shuffled on screen |
| `gens` | Corpus drill generators, from `GENS` in `src/lib/gen.ts` |

After adding examples, run `scripts/check_examples.py` and read its output: it prints the highlighted words with their corpus tags, so a wrong word number is obvious. If your explanation quotes a Quranic phrase, `scripts/check_quotes.py` confirms it exists in the text; quote with the Uthmani spelling and include any attached "wa".

Base explanations on a recognised grammar reference and say which one in your commit message. Mark disputed analyses as disputed in the text.

## New drill types (`src/lib/gen.ts`)

A generator receives every word of the selected surahs with its parsed tags and returns a question whose answer is read from a tag. Add an entry to `GENS`, give it a competence tag such as `nahw.case`, and add that tag to `TAG_INFO` in `src/lib/planner.ts` so weak-spot detection can target it. The test suite automatically checks every generator for a consistent answer key.

## Vocabulary notes (`src/content/vocab.ts`)

Key = the lemma id from `public/data/lexicon.json` (for example `'رَحْمَة|N'`). A test fails if a key matches no dictionary entry. Notes add an English meaning, an Urdu gloss, a usage note and the "known from Urdu" mark. Words without a note fall back to their most common Quranic rendering.

## Sentence analyses (`src/content/analyses.ts`)

Keyed by `surah:ayah`. Each part lists word numbers, the role in English and Arabic, and a note. A test requires every word of the ayah to be covered exactly once. These always display as "Authored — verify" with a link to the corpus treebank; check against it or against a printed iʿrāb before adding.

## Reading passages and conversation (`src/content/reading.ts`, `conversation.ts`)

Write fully vowelled Modern Standard Arabic. **Never use Quranic text in reading passages**: the reading ladder strips vowel marks. Each passage needs two comprehension questions and one ambiguity question (a bare word with two or three possible vowellings and the reason the right one fits).

## Rebuilding the Quran data

Only needed if a source is updated.

```bash
python3 -I scripts/build_data.py \
  --tanzil <dir with uthmani.json and chapters.json> \
  --morph  <quran-morphology.txt> \
  --wbw    <data.json from @kmaslesa/holy-quran-word-by-word-full-data> \
  --trans  <dir with english_saheeh.json and urdu_junagarhi.json> \
  --out public/data
```

The Tanzil and translation files are the snapshots in `github.com/risan/quran-json` (`data/tanzil`, `data/quranenc`); the morphology file is in `github.com/mustafa0x/quran-morphology`. The script prints alignment statistics; the tests assert them.

## Handling error reports

Settings → Error reports lists everything flagged with "Report an error", with the reference. Copy them out, correct the content file, and resolve the report. A report against **verified data** means a source issue: note it, do not edit the Quran text files by hand.
