# Arabiyyah — personal Quranic Arabic learning system

A local-first, installable web app (PWA) built for one student: reads vowelled Arabic, fluent in Urdu, has memorised Al-Mulk and Ar-Raḥmān, studies one hour a day, and wants to understand the Quran directly in Arabic.

## What is in it

| Section | What it does |
|---|---|
| Dashboard | Today's 60-minute plan, phase mastery, due reviews, weak spots, upcoming assessments |
| My Curriculum | Roadmap A (Nov–Dec 2026) and Roadmap B (2027), lesson order, prerequisites, gates |
| Quran Laboratory | Any ayah of the Quran: listen first, commit to an answer, then word-by-word root, form and case |
| Vocabulary | 4,771 dictionary words by Quranic frequency, four kinds of test per word, root families |
| Ṣarf / Naḥw | 36 lessons (22 with full explanations), unlimited drills generated from corpus tags, mastery checks |
| Listening | Words by ear, ayahs by ear, rebuilding an ayah, continuous listening with hidden text |
| Ḥifẓ | Recall assessment, spaced revision, missing-word and next-ayah tests, mistake log, gated new ayahs |
| Reading Practice | Five-stage ladder from vowelled to unvowelled Arabic on non-Quranic passages |
| Conversation | Seven Modern Standard Arabic units with reply-building exercises |
| Assessments | Placement diagnostic, daily summary, weekly and monthly reviews |
| Progress | Competence measures, accuracy by skill, study time, memorised-surah coverage |
| Settings | Reciter, speed, time allocation, memory settings, backup/restore, offline saving, optional AI tutor |

## Run it on your computer

Needs Node.js 20 or newer.

```bash
npm install
npm run dev        # development server
npm test           # 57 logic tests
npm run build      # production build in dist/
npm run preview    # serve the production build on http://localhost:4173
node scripts/e2e.mjs   # 55 browser checks (needs Google Chrome and a running preview)
```

## Put it online (GitHub Pages)

1. Create an empty repository on GitHub and push this folder to its `main` branch.
2. In the repository: Settings → Pages → Build and deployment → Source: **GitHub Actions**.
3. The included workflow (`.github/workflows/deploy.yml`) tests, builds and publishes on every push.
4. The app is then at `https://<user>.github.io/<repository>/`.

Free GitHub Pages needs a public repository. The code contains no personal data: all progress stays in the browser of the device you study on.

## Install it as an app

- **Android phone or tablet (Chrome):** open the site → menu ⋮ → *Add to Home screen* / *Install app*.
- **Windows (Edge or Chrome):** open the site → install icon in the address bar, or menu → *Apps* → *Install this site as an app*.

After the first visit the app opens without a connection. Lessons, the full word list and Al-Fātiḥa, Al-Mulk and Ar-Raḥmān are stored at install; any other surah is stored after you open it once. Recitation streams unless you save a surah's audio in Settings → Offline.

## Moving between devices

Progress is stored per device. Settings → *Download backup* writes one JSON file; on the other device use *Restore (merge)*. Merge keeps the newer copy of every record. Take a backup at least weekly.

## Documentation

- `docs/ARCHITECTURE.md` — curriculum design, daily algorithm, progression rules, data model, technical decisions, risks
- `docs/CONTENT-GUIDE.md` — how to add or correct lessons, vocabulary notes, passages and analyses
- `docs/FIRST-WEEK.md` — the first seven days, session by session
- `docs/KNOWN-LIMITATIONS.md` — what is not built, not verified, or deliberately left out

## Sources and licences

- **Quran text:** Tanzil Project, Uthmani text, © Tanzil Project, CC BY 3.0. Verbatim copies only; the text may not be changed. https://tanzil.net
- **Morphology:** Quranic Arabic Corpus v0.4 (Kais Dukes), GNU GPL, in the Arabic-script fork by mustafa0x. https://corpus.quran.com
- **Word-by-word English and transliteration:** Quran.com, via the npm package `@kmaslesa/holy-quran-word-by-word-full-data`.
- **Translations:** Saheeh International (English) and Muhammad Junagarhi (Urdu), via QuranEnc.com, unmodified.
- **Recitation:** streamed from the Islamic Network CDN (alquran.cloud), EveryAyah.com and Quran.com word audio. Recordings belong to their reciters.
- **Fonts:** Amiri Quran, Noto Naskh Arabic, Noto Nastaliq Urdu, Newsreader (SIL Open Font License).

Lesson explanations, vocabulary notes, reading passages, conversation units and sentence analyses were written for this app and are labelled "Authored — verify" wherever they appear.
