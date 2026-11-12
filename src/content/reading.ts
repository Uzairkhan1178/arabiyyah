// Reading ladder passages. AUTHORED Modern Standard Arabic written for this app — deliberately NOT Quranic:
// vowel marks are removed from these passages only. Quranic text is never shown unvowelled anywhere in the app.
export type Passage = {
  id: string; title: string; focus: string;
  lines: { ar: string; en: string }[];
  qs: { q: string; options: string[]; answer: number }[];
  amb: { bare: string; line: number; options: [string, string][]; answer: number; why: string };
};
export const PASSAGES: Passage[] = [
  { id: 'r1', title: 'The house', focus: 'Nominal sentences, iḍāfa',
    lines: [
      { ar: 'هَذَا بَيْتٌ كَبِيرٌ.', en: 'This is a big house.' },
      { ar: 'البَيْتُ قَرِيبٌ مِنَ المَسْجِدِ.', en: 'The house is near the mosque.' },
      { ar: 'فِي البَيْتِ غُرْفَةٌ وَاسِعَةٌ.', en: 'In the house there is a spacious room.' },
      { ar: 'بَابُ البَيْتِ مَفْتُوحٌ.', en: 'The door of the house is open.' },
      { ar: 'أَهْلُ البَيْتِ كِرَامٌ.', en: 'The people of the house are generous.' },
    ],
    qs: [{ q: 'Where is the house?', options: ['Near the mosque', 'Near the market', 'Far from the city', 'Inside the school'], answer: 0 }, { q: 'What is said about the door?', options: ['It is open', 'It is big', 'It is closed', 'It is new'], answer: 0 }],
    amb: { bare: 'اهل', line: 4, options: [['أَهْلُ', 'people of (noun, subject)'], ['أَهَّلَ', 'he qualified (verb)'], ['أَهْلًا', 'welcome']], answer: 0, why: 'It starts a nominal sentence and is followed by a noun it owns, so it is the noun أَهْلُ, marfūʿ as mubtadaʾ.' } },
  { id: 'r2', title: 'The student', focus: 'Past verbs, prepositions',
    lines: [
      { ar: 'ذَهَبَ الطَّالِبُ إِلَى المَدْرَسَةِ.', en: 'The student went to the school.' },
      { ar: 'جَلَسَ أَمَامَ المُعَلِّمِ.', en: 'He sat in front of the teacher.' },
      { ar: 'كَتَبَ الدَّرْسَ فِي الدَّفْتَرِ.', en: 'He wrote the lesson in the notebook.' },
      { ar: 'ثُمَّ رَجَعَ إِلَى بَيْتِهِ.', en: 'Then he returned to his house.' },
    ],
    qs: [{ q: 'What did the student write?', options: ['The lesson', 'A letter', 'His name', 'A book'], answer: 0 }, { q: 'Where did he sit?', options: ['In front of the teacher', 'Behind the door', 'Beside his friend', 'On the floor'], answer: 0 }],
    amb: { bare: 'كتب', line: 2, options: [['كَتَبَ', 'he wrote'], ['كُتُبٌ', 'books'], ['كُتِبَ', 'it was written']], answer: 0, why: 'A doer is already known (the student) and an object follows (the lesson), so the verb is active: كَتَبَ.' } },
  { id: 'r3', title: 'At the market', focus: 'Present verbs, objects',
    lines: [
      { ar: 'يَذْهَبُ أَبِي إِلَى السُّوقِ كُلَّ يَوْمٍ.', en: 'My father goes to the market every day.' },
      { ar: 'يَشْتَرِي الخُبْزَ وَاللَّحْمَ وَالفَاكِهَةَ.', en: 'He buys bread, meat and fruit.' },
      { ar: 'يَرْجِعُ قَبْلَ صَلَاةِ الظُّهْرِ.', en: 'He returns before the noon prayer.' },
      { ar: 'نَأْكُلُ الطَّعَامَ مَعًا.', en: 'We eat the food together.' },
    ],
    qs: [{ q: 'When does he return?', options: ['Before the noon prayer', 'After sunset', 'At night', 'In the afternoon'], answer: 0 }, { q: 'Who eats the food?', options: ['We, together', 'The father alone', 'The guests', 'Nobody'], answer: 0 }],
    amb: { bare: 'قبل', line: 2, options: [['قَبْلَ', 'before'], ['قَبِلَ', 'he accepted'], ['قَبَّلَ', 'he kissed']], answer: 0, why: 'It is followed by a noun in the genitive (صَلَاةِ) and tells when: the adverb قَبْلَ.' } },
  { id: 'r4', title: 'Knowledge', focus: 'إِنَّ, participles',
    lines: [
      { ar: 'إِنَّ العِلْمَ نُورٌ.', en: 'Indeed, knowledge is light.' },
      { ar: 'طَلَبُ العِلْمِ وَاجِبٌ عَلَى كُلِّ مُسْلِمٍ.', en: 'Seeking knowledge is a duty on every Muslim.' },
      { ar: 'العَالِمُ يَعْمَلُ بِعِلْمِهِ.', en: 'The scholar acts on his knowledge.' },
      { ar: 'وَالجَاهِلُ يَتَّبِعُ هَوَاهُ.', en: 'And the ignorant one follows his whim.' },
    ],
    qs: [{ q: 'What does the scholar do?', options: ['Acts on his knowledge', 'Hides his knowledge', 'Sells his books', 'Follows his whim'], answer: 0 }, { q: 'What is knowledge compared to?', options: ['Light', 'Water', 'Wealth', 'A road'], answer: 0 }],
    amb: { bare: 'العلم', line: 1, options: [['العِلْمِ', 'knowledge'], ['العَلَمِ', 'the flag'], ['العَالَمِ', 'the world']], answer: 0, why: 'One "seeks" knowledge, and the passage is about it; العَالَم would also be spelled with an alif.' } },
  { id: 'r5', title: 'Winter', focus: 'كَانَ, adjectives',
    lines: [
      { ar: 'كَانَ الجَوُّ بَارِدًا فِي الشِّتَاءِ.', en: 'The weather was cold in winter.' },
      { ar: 'لَبِسَ النَّاسُ ثِيَابًا ثَقِيلَةً.', en: 'The people wore heavy clothes.' },
      { ar: 'نَزَلَ المَطَرُ مِنَ السَّمَاءِ.', en: 'Rain came down from the sky.' },
      { ar: 'فَرِحَ الفَلَّاحُونَ بِهِ كَثِيرًا.', en: 'The farmers were very glad of it.' },
    ],
    qs: [{ q: 'Who was glad?', options: ['The farmers', 'The children', 'The travellers', 'The traders'], answer: 0 }, { q: 'What did people wear?', options: ['Heavy clothes', 'Light clothes', 'New shoes', 'White garments'], answer: 0 }],
    amb: { bare: 'نزل', line: 2, options: [['نَزَلَ', 'it came down'], ['نَزَّلَ', 'he sent down'], ['نُزُلٌ', 'hospitality, lodging']], answer: 0, why: 'The noun after it (المَطَرُ) is marfūʿ, so it is the doer of an intransitive verb: نَزَلَ. With نَزَّلَ the rain would be an object.' } },
  { id: 'r6', title: 'The factory', focus: 'Passive verbs',
    lines: [
      { ar: 'فُتِحَ البَابُ فِي الصَّبَاحِ.', en: 'The door was opened in the morning.' },
      { ar: 'دَخَلَ العُمَّالُ المَصْنَعَ.', en: 'The workers entered the factory.' },
      { ar: 'صُنِعَتِ السَّيَّارَاتُ هُنَاكَ.', en: 'The cars were made there.' },
      { ar: 'ثُمَّ أُرْسِلَتْ إِلَى المُدُنِ البَعِيدَةِ.', en: 'Then they were sent to the distant cities.' },
    ],
    qs: [{ q: 'What happened to the cars afterwards?', options: ['They were sent to distant cities', 'They were sold nearby', 'They were repaired', 'They were left there'], answer: 0 }, { q: 'Who entered the factory?', options: ['The workers', 'The owners', 'The drivers', 'The guards'], answer: 0 }],
    amb: { bare: 'صنعت', line: 2, options: [['صُنِعَتْ', 'were made (passive)'], ['صَنَعَتْ', 'she made'], ['صَنَعْتُ', 'I made']], answer: 0, why: 'Cars do not make things; they are made. Meaning forces the passive, and السَّيَّارَاتُ is marfūʿ as nāʾib al-fāʿil.' } },
  { id: 'r7', title: 'Good advice', focus: 'Conditions, prohibition, comparison',
    lines: [
      { ar: 'مَنْ يَعْمَلْ خَيْرًا يَجِدْ خَيْرًا.', en: 'Whoever does good finds good.' },
      { ar: 'إِذَا صَبَرْتَ نَجَحْتَ.', en: 'If you are patient, you succeed.' },
      { ar: 'لَا تُؤَخِّرْ عَمَلَ اليَوْمِ إِلَى الغَدِ.', en: 'Do not put off today\'s work until tomorrow.' },
      { ar: 'الوَقْتُ أَثْمَنُ مِنَ المَالِ.', en: 'Time is more precious than wealth.' },
    ],
    qs: [{ q: 'What is more precious than wealth?', options: ['Time', 'Health', 'Knowledge', 'Patience'], answer: 0 }, { q: 'What should you not delay?', options: ['Today\'s work', 'Your sleep', 'The journey', 'The meal'], answer: 0 }],
    amb: { bare: 'عمل', line: 2, options: [['عَمَلَ', 'work (noun, object)'], ['عَمِلَ', 'he did'], ['عُمِلَ', 'it was done']], answer: 0, why: 'It follows a complete verb (لَا تُؤَخِّرْ) as its object and owns the next noun (اليَوْمِ): the noun عَمَلَ in an iḍāfa.' } },
  { id: 'r8', title: 'The traveller', focus: 'Longer narrative, Forms II and V',
    lines: [
      { ar: 'سَافَرَ رَجُلٌ إِلَى مَدِينَةٍ بَعِيدَةٍ لِيَطْلُبَ العِلْمَ.', en: 'A man travelled to a distant city to seek knowledge.' },
      { ar: 'سَكَنَ عِنْدَ شَيْخٍ كَرِيمٍ سَنَتَيْنِ.', en: 'He stayed with a generous shaykh for two years.' },
      { ar: 'تَعَلَّمَ مِنْهُ القِرَاءَةَ وَالكِتَابَةَ وَالحِسَابَ.', en: 'He learned reading, writing and arithmetic from him.' },
      { ar: 'ثُمَّ عَادَ إِلَى قَرْيَتِهِ وَعَلَّمَ أَهْلَهَا.', en: 'Then he went back to his village and taught its people.' },
    ],
    qs: [{ q: 'How long did he stay?', options: ['Two years', 'Two months', 'A year', 'Ten years'], answer: 0 }, { q: 'What did he do when he returned?', options: ['Taught the people of his village', 'Built a house', 'Travelled again', 'Opened a shop'], answer: 0 }],
    amb: { bare: 'وعلم', line: 3, options: [['وَعَلَّمَ', 'and he taught'], ['وَعَلِمَ', 'and he knew'], ['وَعِلْمٌ', 'and knowledge']], answer: 0, why: 'It has a personal object (أَهْلَهَا "its people"): you teach people, you do not "know" them in this sense. Form II, عَلَّمَ.' } },
];
