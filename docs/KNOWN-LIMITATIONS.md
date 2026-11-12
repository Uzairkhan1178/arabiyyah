# Known limitations

## Not yet verified

Live site: https://uzairkhan1178.github.io/arabiyyah/ (deployed 12 Nov 2026).

| Item | Why | What to check on first use |
|---|---|---|
| Recitation playback on Android | Verified on the live site in desktop Chrome only (ayah 67:1 played in the Lab; one sample from each of the six reciters and the word audio loaded) | Play an ayah in the Lab and a word in the inspector on the tablet and phone |
| Playing saved audio with no connection | Saving works on the live site (Al-Ikhlāṣ, four recordings stored and readable; offline copies come from EveryAyah because the streaming host refuses downloads). Playing them back in flight mode has not been tried | Settings → Offline → save one short surah, then play it in flight mode |
| Sync download on a second device | Upload is confirmed: after the first sign-in the cloud held that device's profile and settings. The merge engine passes 12 tests with two simulated devices, and the database refuses anyone not signed in. Receiving progress on a second real device has not been observed yet | Sign in on a second device and check the name and progress arrive |
| AI tutor | Needs a personal API key; not called during testing | Add a key in Settings, ask one question in a lesson |
| Device Arabic voice (conversation, reading) | Depends on voices installed on each device | The app says so when no Arabic voice exists |
| Installing on Android and Windows | The live site serves its manifest and an active service worker; the install step itself has not been done | Install from the browser menu on each device |

Everything else listed in the README was exercised by the automated tests: 75 logic tests and 61 browser checks at desktop, tablet and phone sizes, including storage across reloads and real offline loading.

## Not built

- **An Android APK.** Decided against for now: the installed web app updates itself, an APK would not.
- **Written explanations for 14 lessons** (N13–N20, Ṣ11–Ṣ16). Their drills and mastery checks work; the explanations are added through the content guide.
- **Full sentence-level iʿrāb for every ayah.** The data has word-level tags only. Eight ayahs have authored analyses; all others show rule-derived hints and link to the Quranic Arabic Corpus treebank.
- **Pronoun-reference data.** The Lab teaches how to trace a pronoun and asks about attached pronouns, but which noun each pronoun refers to is not in the dataset.
- **Recording or automatic checking of recitation.** Ḥifẓ recall is self-marked word by word against the text and the recording.
- **Dialect material** in the conversation track.
- **Tajwīd rules.** Recitation is always from authentic recordings and complete text, but tajwīd is not taught.
- **Pause marks** are absent from the Tanzil export used.

## To tidy in Firebase

- **Sign-ups are closed** (12 Nov 2026), now that the one account exists. Signing in on a new device still works. To add another person, re-tick *Enable create (sign-up)* under Firebase console → Authentication → Settings → User actions.
- **A Google Analytics property was attached** when the project was created. The app does not load Analytics and sends it nothing. It can be removed under Project settings → Integrations.
- Same-item edits on two devices before either syncs: the later edit wins and the earlier one is lost. For flashcard reviews this is rare and harmless.

## By design

- Reading passages and conversation are authored Modern Standard Arabic, labelled as authored. Quranic text is never shown unvowelled.
- Translations are shown unmodified, including the publisher's footnote markers.
- Vocabulary glosses from the corpus are renderings in context ("and they said"), not dictionary definitions. The top 132 words have curated meanings; the rest show their most common renderings with counts.
- The vocabulary estimate from the diagnostic is rough: five words per frequency band, corrected for guessing.
- Four ayahs (2:181, 8:6, 13:37, 37:130) have no word-level grammar because the two sources divide their words differently.

## Licensing to review before a public launch

The app is built for personal study. The Tanzil text allows verbatim redistribution with attribution, and the corpus is GPL. The Quran.com word-by-word glosses and the QuranEnc translations are redistributed here as published data with attribution; if the site were promoted publicly, confirm their current terms first. EveryAyah publishes no licence; it is used only for one optional teaching recitation.
