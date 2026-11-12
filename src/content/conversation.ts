// Conversational track: Modern Standard Arabic. AUTHORED CONTENT. Audio uses the device's own Arabic voice when one is installed.
export type Phrase = { ar: string; tr: string; en: string; ur: string };
export type Turn = { who: 'them' | 'you'; ar: string; en: string; wrong?: string[] };
export type Unit = { id: string; title: string; phrases: Phrase[]; dialogue: Turn[]; note: string };
const P = (ar: string, tr: string, en: string, ur: string): Phrase => ({ ar, tr, en, ur });
export const UNITS: Unit[] = [
  { id: 'c1', title: 'Greetings', note: 'وَعَلَيْكُمُ السَّلَامُ is a nominal sentence with its khabar first: "upon you [be] peace".',
    phrases: [
      P('السَّلَامُ عَلَيْكُمْ', 'as-salāmu ʿalaykum', 'Peace be upon you', 'السلام علیکم'), P('وَعَلَيْكُمُ السَّلَامُ', 'wa ʿalaykumu s-salām', 'And upon you be peace', 'وعلیکم السلام'),
      P('كَيْفَ حَالُكَ؟', 'kayfa ḥāluka?', 'How are you? (to a man)', 'آپ کا کیا حال ہے؟'), P('أَنَا بِخَيْرٍ، وَالحَمْدُ لِلَّهِ', 'anā bi-khayr, wal-ḥamdu lillāh', 'I am well, praise be to Allah', 'میں خیریت سے ہوں، الحمد للہ'),
      P('صَبَاحُ الخَيْرِ', 'ṣabāḥu l-khayr', 'Good morning', 'صبح بخیر'), P('مَسَاءُ الخَيْرِ', 'masāʾu l-khayr', 'Good evening', 'شام بخیر'),
      P('شُكْرًا', 'shukran', 'Thank you', 'شکریہ'), P('مَعَ السَّلَامَةِ', 'maʿa s-salāma', 'Goodbye', 'خدا حافظ'),
    ],
    dialogue: [
      { who: 'them', ar: 'السَّلَامُ عَلَيْكُمْ', en: 'Peace be upon you.' }, { who: 'you', ar: 'وَعَلَيْكُمُ السَّلَامُ', en: 'And upon you be peace.', wrong: ['صَبَاحُ الخَيْرِ', 'مَعَ السَّلَامَةِ'] },
      { who: 'them', ar: 'كَيْفَ حَالُكَ؟', en: 'How are you?' }, { who: 'you', ar: 'أَنَا بِخَيْرٍ، وَالحَمْدُ لِلَّهِ', en: 'I am well, praise be to Allah.', wrong: ['شُكْرًا', 'السَّلَامُ عَلَيْكُمْ'] },
    ] },
  { id: 'c2', title: 'Introducing yourself', note: 'اِسْمِي = اِسْم + ـِي: an iḍāfa with the pronoun "my". مِنْ makes the country majrūr.',
    phrases: [
      P('مَا اسْمُكَ؟', 'mā smuka?', 'What is your name?', 'آپ کا نام کیا ہے؟'), P('اِسْمِي عُزَيْرٌ', 'ismī ʿUzayr', 'My name is Uzair', 'میرا نام عزیر ہے'),
      P('مِنْ أَيْنَ أَنْتَ؟', 'min ayna anta?', 'Where are you from?', 'آپ کہاں سے ہیں؟'), P('أَنَا مِنْ بَاكِسْتَانَ', 'anā min Bākistān', 'I am from Pakistan', 'میں پاکستان سے ہوں'),
      P('أَيْنَ تَسْكُنُ؟', 'ayna taskunu?', 'Where do you live?', 'آپ کہاں رہتے ہیں؟'), P('أَسْكُنُ فِي كَنَدَا', 'askunu fī Kanadā', 'I live in Canada', 'میں کینیڈا میں رہتا ہوں'),
      P('مَاذَا تَعْمَلُ؟', 'mādhā taʿmalu?', 'What do you do?', 'آپ کیا کام کرتے ہیں؟'), P('أَعْمَلُ فِي شَرِكَةِ بِنَاءٍ', 'aʿmalu fī sharikati bināʾ', 'I work at a construction company', 'میں ایک تعمیراتی کمپنی میں کام کرتا ہوں'),
      P('تَشَرَّفْنَا', 'tasharrafnā', 'Pleased to meet you', 'آپ سے مل کر خوشی ہوئی'),
    ],
    dialogue: [
      { who: 'them', ar: 'مَا اسْمُكَ؟', en: 'What is your name?' }, { who: 'you', ar: 'اِسْمِي عُزَيْرٌ', en: 'My name is Uzair.', wrong: ['أَنَا بِخَيْرٍ', 'أَسْكُنُ فِي كَنَدَا'] },
      { who: 'them', ar: 'مِنْ أَيْنَ أَنْتَ؟', en: 'Where are you from?' }, { who: 'you', ar: 'أَنَا مِنْ بَاكِسْتَانَ', en: 'I am from Pakistan.', wrong: ['أَعْمَلُ فِي شَرِكَةِ بِنَاءٍ', 'اِسْمِي عُزَيْرٌ'] },
      { who: 'them', ar: 'مَاذَا تَعْمَلُ؟', en: 'What do you do?' }, { who: 'you', ar: 'أَعْمَلُ فِي شَرِكَةِ بِنَاءٍ', en: 'I work at a construction company.', wrong: ['أَسْكُنُ فِي كَنَدَا', 'تَشَرَّفْنَا'] },
    ] },
  { id: 'c3', title: 'Asking questions', note: 'هَلْ turns a statement into a yes/no question without changing word order. Answer with نَعَمْ or لَا.',
    phrases: [
      P('مَا هَذَا؟', 'mā hādhā?', 'What is this?', 'یہ کیا ہے؟'), P('مَنْ هَذَا؟', 'man hādhā?', 'Who is this?', 'یہ کون ہے؟'),
      P('أَيْنَ المَسْجِدُ؟', 'ayna l-masjid?', 'Where is the mosque?', 'مسجد کہاں ہے؟'), P('مَتَى الصَّلَاةُ؟', 'matā ṣ-ṣalāh?', 'When is the prayer?', 'نماز کب ہے؟'),
      P('هَلْ تَتَكَلَّمُ العَرَبِيَّةَ؟', 'hal tatakallamu l-ʿarabiyya?', 'Do you speak Arabic?', 'کیا آپ عربی بولتے ہیں؟'), P('نَعَمْ، قَلِيلًا', 'naʿam, qalīlan', 'Yes, a little', 'جی ہاں، تھوڑی سی'),
      P('لِمَاذَا؟', 'limādhā?', 'Why?', 'کیوں؟'), P('كَمْ هَذَا؟', 'kam hādhā?', 'How much is this?', 'یہ کتنے کا ہے؟'),
      P('لَا أَفْهَمُ', 'lā afhamu', 'I do not understand', 'میں نہیں سمجھا'),
    ],
    dialogue: [
      { who: 'them', ar: 'هَلْ تَتَكَلَّمُ العَرَبِيَّةَ؟', en: 'Do you speak Arabic?' }, { who: 'you', ar: 'نَعَمْ، قَلِيلًا', en: 'Yes, a little.', wrong: ['لِمَاذَا؟', 'مَا هَذَا؟'] },
      { who: 'them', ar: 'أَيْنَ تَسْكُنُ؟', en: 'Where do you live?' }, { who: 'you', ar: 'أَسْكُنُ فِي كَنَدَا', en: 'I live in Canada.', wrong: ['لَا أَفْهَمُ', 'نَعَمْ، قَلِيلًا'] },
    ] },
  { id: 'c4', title: 'Family', note: 'لِي "I have" is literally "for me": لِـ + ـِي, a fronted khabar. أَبِي، أُمِّي are iḍāfa with "my".',
    phrases: [
      P('هَذَا أَبِي', 'hādhā abī', 'This is my father', 'یہ میرے والد ہیں'), P('هَذِهِ أُمِّي', 'hādhihi ummī', 'This is my mother', 'یہ میری والدہ ہیں'),
      P('لِي أَخٌ وَأُخْتٌ', 'lī akhun wa ukht', 'I have a brother and a sister', 'میرا ایک بھائی اور ایک بہن ہے'), P('كَمْ أَخًا لَكَ؟', 'kam akhan laka?', 'How many brothers do you have?', 'آپ کے کتنے بھائی ہیں؟'),
      P('أُسْرَتِي فِي بَاكِسْتَانَ', 'usratī fī Bākistān', 'My family is in Pakistan', 'میرا خاندان پاکستان میں ہے'), P('هَلْ أَنْتَ مُتَزَوِّجٌ؟', 'hal anta mutazawwij?', 'Are you married?', 'کیا آپ شادی شدہ ہیں؟'),
    ],
    dialogue: [
      { who: 'them', ar: 'كَمْ أَخًا لَكَ؟', en: 'How many brothers do you have?' }, { who: 'you', ar: 'لِي أَخٌ وَأُخْتٌ', en: 'I have a brother and a sister.', wrong: ['هَذَا أَبِي', 'أَنَا مِنْ بَاكِسْتَانَ'] },
      { who: 'them', ar: 'أَيْنَ أُسْرَتُكَ؟', en: 'Where is your family?' }, { who: 'you', ar: 'أُسْرَتِي فِي بَاكِسْتَانَ', en: 'My family is in Pakistan.', wrong: ['هَذِهِ أُمِّي', 'لِي أَخٌ وَأُخْتٌ'] },
    ] },
  { id: 'c5', title: 'Food and drink', note: 'أُرِيدُ "I want" is Form IV of ر و د; its object is manṣūb: أُرِيدُ مَاءً.',
    phrases: [
      P('أَنَا جَائِعٌ', 'anā jāʾiʿ', 'I am hungry', 'مجھے بھوک لگی ہے'), P('أُرِيدُ مَاءً، مِنْ فَضْلِكَ', 'urīdu māʾan, min faḍlika', 'I would like water, please', 'مجھے پانی چاہیے، براہِ کرم'),
      P('مَاذَا تَأْكُلُ؟', 'mādhā taʾkulu?', 'What are you eating?', 'آپ کیا کھا رہے ہیں؟'), P('آكُلُ الأَرُزَّ وَالدَّجَاجَ', 'ākulu l-aruzza wad-dajāj', 'I am eating rice and chicken', 'میں چاول اور مرغی کھا رہا ہوں'),
      P('الطَّعَامُ لَذِيذٌ', 'aṭ-ṭaʿāmu ladhīdh', 'The food is delicious', 'کھانا مزیدار ہے'), P('هَلْ هَذَا حَلَالٌ؟', 'hal hādhā ḥalāl?', 'Is this halal?', 'کیا یہ حلال ہے؟'),
      P('الحِسَابُ، مِنْ فَضْلِكَ', 'al-ḥisābu, min faḍlika', 'The bill, please', 'بل دے دیجیے'),
    ],
    dialogue: [
      { who: 'them', ar: 'مَاذَا تُرِيدُ؟', en: 'What would you like?' }, { who: 'you', ar: 'أُرِيدُ مَاءً، مِنْ فَضْلِكَ', en: 'I would like water, please.', wrong: ['الطَّعَامُ لَذِيذٌ', 'أَنَا جَائِعٌ'] },
      { who: 'them', ar: 'كَيْفَ الطَّعَامُ؟', en: 'How is the food?' }, { who: 'you', ar: 'الطَّعَامُ لَذِيذٌ', en: 'The food is delicious.', wrong: ['الحِسَابُ، مِنْ فَضْلِكَ', 'هَلْ هَذَا حَلَالٌ؟'] },
    ] },
  { id: 'c6', title: 'Directions and travel', note: 'Direction words عَلَى اليَمِينِ / عَلَى اليَسَارِ are jārr-majrūr phrases.',
    phrases: [
      P('أَيْنَ المَطَارُ؟', 'ayna l-maṭār?', 'Where is the airport?', 'ہوائی اڈہ کہاں ہے؟'), P('اِذْهَبْ مُبَاشَرَةً', 'idhhab mubāsharatan', 'Go straight ahead', 'سیدھے جائیے'),
      P('عَلَى اليَمِينِ', 'ʿalā l-yamīn', 'on the right', 'دائیں طرف'), P('عَلَى اليَسَارِ', 'ʿalā l-yasār', 'on the left', 'بائیں طرف'),
      P('هَلْ هُوَ بَعِيدٌ؟', 'hal huwa baʿīd?', 'Is it far?', 'کیا وہ دور ہے؟'), P('لَا، هُوَ قَرِيبٌ', 'lā, huwa qarīb', 'No, it is near', 'نہیں، وہ قریب ہے'),
      P('أُرِيدُ أَنْ أَذْهَبَ إِلَى مَكَّةَ', 'urīdu an adhhaba ilā Makka', 'I want to go to Makkah', 'میں مکہ جانا چاہتا ہوں'),
    ],
    dialogue: [
      { who: 'you', ar: 'أَيْنَ المَطَارُ؟', en: 'Where is the airport?', wrong: ['هَلْ هُوَ بَعِيدٌ؟', 'عَلَى اليَمِينِ'] }, { who: 'them', ar: 'اِذْهَبْ مُبَاشَرَةً، ثُمَّ عَلَى اليَمِينِ', en: 'Go straight, then on the right.' },
      { who: 'you', ar: 'هَلْ هُوَ بَعِيدٌ؟', en: 'Is it far?', wrong: ['أَيْنَ المَطَارُ؟', 'عَلَى اليَسَارِ'] }, { who: 'them', ar: 'لَا، هُوَ قَرِيبٌ', en: 'No, it is near.' },
    ] },
  { id: 'c7', title: 'Numbers and time', note: 'For 3–10 the number takes the opposite gender of the counted noun and the noun is a genitive plural: ثَلَاثَةُ كُتُبٍ.',
    phrases: [
      P('وَاحِدٌ، اِثْنَانِ، ثَلَاثَةٌ', 'wāḥid, ithnān, thalātha', 'one, two, three', 'ایک، دو، تین'), P('أَرْبَعَةٌ، خَمْسَةٌ، سِتَّةٌ', 'arbaʿa, khamsa, sitta', 'four, five, six', 'چار، پانچ، چھ'),
      P('سَبْعَةٌ، ثَمَانِيَةٌ، تِسْعَةٌ، عَشَرَةٌ', 'sabʿa, thamāniya, tisʿa, ʿashara', 'seven, eight, nine, ten', 'سات، آٹھ، نو، دس'), P('كَمِ السَّاعَةُ؟', 'kami s-sāʿa?', 'What time is it?', 'کیا وقت ہوا ہے؟'),
      P('السَّاعَةُ الخَامِسَةُ', 'as-sāʿatu l-khāmisa', 'It is five o\'clock', 'پانچ بجے ہیں'), P('اليَوْمَ / غَدًا / أَمْسِ', 'al-yawma / ghadan / amsi', 'today / tomorrow / yesterday', 'آج / کل (آنے والا) / کل (گزرا ہوا)'),
    ],
    dialogue: [
      { who: 'them', ar: 'كَمِ السَّاعَةُ؟', en: 'What time is it?' }, { who: 'you', ar: 'السَّاعَةُ الخَامِسَةُ', en: 'It is five o\'clock.', wrong: ['اليَوْمَ', 'خَمْسَةٌ، سِتَّةٌ'] },
      { who: 'them', ar: 'مَتَى تُسَافِرُ؟', en: 'When are you travelling?' }, { who: 'you', ar: 'غَدًا، إِنْ شَاءَ اللَّهُ', en: 'Tomorrow, God willing.', wrong: ['أَمْسِ', 'السَّاعَةُ الخَامِسَةُ'] },
    ] },
];
