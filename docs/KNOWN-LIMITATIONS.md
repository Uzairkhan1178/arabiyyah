# Known limitations

## Not verified in the build environment

| Item | Why | What to check on first use |
|---|---|---|
| Recitation playback inside the app | The build sandbox cannot reach the audio hosts. Separately, all six reciters' ayah recordings and the word audio were loaded successfully in a desktop browser (one sample ayah each), so the addresses and formats are right | Play an ayah in the Lab and a word in the inspector on each device |
| Saving audio for offline use | The streaming host (Islamic Network) refuses cross-origin downloads, so offline copies of the same reciters come from EveryAyah, where downloads were confirmed to work. The save-then-play-offline round trip has not been run on a hosted build | Settings → Offline → save one short surah, then play it in flight mode |
| AI tutor | Needs a personal API key; not called during testing | Add a key in Settings, ask one question in a lesson |
| Device Arabic voice (conversation, reading) | Depends on voices installed on each device | The app says so when no Arabic voice exists |
| Installation prompt on Android and Windows | Needs the hosted HTTPS site | Install from the browser menu after deployment |

Everything else listed in the README was exercised by the automated tests: 57 logic tests and 55 browser checks at desktop, tablet and phone sizes, including storage across reloads and real offline loading.

## Not built

- **Automatic sync between devices.** Device change is by backup file. A sync service is the main candidate for the next stage.
- **Written explanations for 14 lessons** (N13–N20, Ṣ11–Ṣ16). Their drills and mastery checks work; the explanations are added through the content guide.
- **Full sentence-level iʿrāb for every ayah.** The data has word-level tags only. Eight ayahs have authored analyses; all others show rule-derived hints and link to the Quranic Arabic Corpus treebank.
- **Pronoun-reference data.** The Lab teaches how to trace a pronoun and asks about attached pronouns, but which noun each pronoun refers to is not in the dataset.
- **Recording or automatic checking of recitation.** Ḥifẓ recall is self-marked word by word against the text and the recording.
- **Dialect material** in the conversation track.
- **Tajwīd rules.** Recitation is always from authentic recordings and complete text, but tajwīd is not taught.
- **Pause marks** are absent from the Tanzil export used.

## By design

- Reading passages and conversation are authored Modern Standard Arabic, labelled as authored. Quranic text is never shown unvowelled.
- Translations are shown unmodified, including the publisher's footnote markers.
- Vocabulary glosses from the corpus are renderings in context ("and they said"), not dictionary definitions. The top 132 words have curated meanings; the rest show their most common renderings with counts.
- The vocabulary estimate from the diagnostic is rough: five words per frequency band, corrected for guessing.
- Four ayahs (2:181, 8:6, 13:37, 37:130) have no word-level grammar because the two sources divide their words differently.

## Licensing to review before a public launch

The app is built for personal study. The Tanzil text allows verbatim redistribution with attribution, and the corpus is GPL. The Quran.com word-by-word glosses and the QuranEnc translations are redistributed here as published data with attribution; if the site were promoted publicly, confirm their current terms first. EveryAyah publishes no licence; it is used only for one optional teaching recitation.
