// Sentence-level iʿrāb for a starter set of ayahs. AUTHORED (written for this app, not taken from the corpus
// morphology file, which has no sentence roles). Always shown with a "verify" flag and a link to the
// Quranic Arabic Corpus treebank for the same ayah. Word numbers are 1-based positions in the ayah.
export type Part = { w: number[]; role: string; ar: string; note: string };
export type Analysis = { type: string; parts: Part[]; note?: string };
export const ANALYSES: Record<string, Analysis> = {
  '1:2': { type: 'Nominal sentence', parts: [
    { w: [1], role: 'mubtadaʾ', ar: 'مُبْتَدَأ', note: 'marfūʿ with ḍamma' },
    { w: [2], role: 'khabar (prepositional phrase)', ar: 'خَبَر — جَارّ وَمَجْرُور', note: 'the lām + the Name; grammarians attach it to an understood "established"' },
    { w: [3], role: 'description of the Name; muḍāf', ar: 'نَعْت / بَدَل، مُضَاف', note: 'majrūr to match the Name' },
    { w: [4], role: 'muḍāf ilayh', ar: 'مُضَاف إِلَيْهِ', note: 'majrūr with yāʾ because it follows the sound masculine plural pattern' }] },
  '67:1': { type: 'Verbal sentence, then a nominal sentence joined by wāw', parts: [
    { w: [1], role: 'past verb', ar: 'فِعْل مَاضٍ', note: 'Form VI' },
    { w: [2], role: 'fāʿil', ar: 'فَاعِل', note: 'relative pronoun; its ending is fixed, so the rafʿ does not show' },
    { w: [3], role: 'fronted khabar', ar: 'خَبَر مُقَدَّم', note: 'bi + yadi + hi; the pronoun is muḍāf ilayh. Fronting gives restriction: in His hand alone' },
    { w: [4], role: 'delayed mubtadaʾ', ar: 'مُبْتَدَأ مُؤَخَّر', note: 'words 3–4 are the clause that completes the relative pronoun (ṣila)' },
    { w: [5], role: 'conjunction + mubtadaʾ', ar: 'حَرْف عَطْف + مُبْتَدَأ', note: '' },
    { w: [6, 7, 8], role: 'prepositional phrase linked to the khabar', ar: 'جَارّ وَمَجْرُور', note: 'kulli is muḍāf, shayʾin its muḍāf ilayh; placed before the khabar for emphasis' },
    { w: [9], role: 'khabar', ar: 'خَبَر', note: 'marfūʿ, indefinite' }] },
  '67:2': { type: 'Relative clause continuing the previous ayah', note: 'The first word can be read as a second description of the One mentioned in ayah 1, or as the predicate of an omitted "He is". Both analyses are found in iʿrāb works.', parts: [
    { w: [1], role: 'relative pronoun', ar: 'اِسْم مَوْصُول', note: 'see note above' },
    { w: [2], role: 'past verb; hidden doer "He"', ar: 'فِعْل مَاضٍ', note: '' },
    { w: [3], role: 'object', ar: 'مَفْعُول بِهِ', note: 'manṣūb' },
    { w: [4], role: 'joined to the object', ar: 'مَعْطُوف', note: 'manṣūb like the word it is joined to' },
    { w: [5], role: 'lām of purpose + manṣūb verb + object pronoun', ar: 'لَام التَّعْلِيل + فِعْل مُضَارِع مَنْصُوب', note: '"so that He may test you"' },
    { w: [6], role: 'mubtadaʾ (interrogative) + muḍāf ilayh', ar: 'مُبْتَدَأ', note: '"which of you"' },
    { w: [7], role: 'khabar', ar: 'خَبَر', note: 'comparative pattern afʿal' },
    { w: [8], role: 'specification', ar: 'تَمْيِيز', note: 'manṣūb: best "in deed"' },
    { w: [9], role: 'mubtadaʾ', ar: 'مُبْتَدَأ', note: '' },
    { w: [10], role: 'khabar', ar: 'خَبَر', note: '' },
    { w: [11], role: 'second khabar', ar: 'خَبَر ثَانٍ', note: '' }] },
  '55:1': { type: 'Start of a nominal sentence that runs to ayah 4', parts: [{ w: [1], role: 'mubtadaʾ', ar: 'مُبْتَدَأ', note: 'its predicate is the verbal sentence in the next ayah' }] },
  '55:2': { type: 'Verbal sentence serving as khabar', parts: [
    { w: [1], role: 'past verb, Form II; hidden doer "He"', ar: 'فِعْل مَاضٍ', note: 'the whole sentence is the khabar of ar-Raḥmān' },
    { w: [2], role: 'object', ar: 'مَفْعُول بِهِ', note: 'this verb takes two objects; the person taught is left unstated' }] },
  '55:3': { type: 'Verbal sentence (second khabar)', parts: [{ w: [1], role: 'past verb; hidden doer "He"', ar: 'فِعْل مَاضٍ', note: '' }, { w: [2], role: 'object', ar: 'مَفْعُول بِهِ', note: 'manṣūb' }] },
  '55:4': { type: 'Verbal sentence (third khabar)', parts: [{ w: [1], role: 'past verb + first object (pronoun)', ar: 'فِعْل + مَفْعُول بِهِ أَوَّل', note: '"taught him"' }, { w: [2], role: 'second object', ar: 'مَفْعُول بِهِ ثَانٍ', note: 'manṣūb' }] },
  '112:1': { type: 'Command followed by reported speech', note: 'Two analyses are common: (a) huwa is a pronoun of the matter, and "Allāhu aḥad" is a full sentence acting as its khabar; (b) huwa is the mubtadaʾ, Allāh its khabar, and aḥad a second khabar.', parts: [
    { w: [1], role: 'command verb; hidden doer "you"', ar: 'فِعْل أَمْر', note: '' },
    { w: [2], role: 'mubtadaʾ', ar: 'مُبْتَدَأ', note: '' },
    { w: [3], role: 'khabar, or mubtadaʾ of an inner sentence', ar: 'خَبَر / مُبْتَدَأ ثَانٍ', note: 'see note' },
    { w: [4], role: 'khabar', ar: 'خَبَر', note: '' }] },
};
