// Core idea of the most frequent root families. AUTHORED (written for this app, flagged in the UI).
// A root's core idea is a guide to its family, not a translation of any one word; each derived word's
// actual meaning and Quranic occurrences come from the corpus data shown beside it.
export const ROOT_NOTES: Record<string, { idea: string; note?: string }> = {
  'أله': { idea: 'deity; being worshipped', note: 'The Name of Allah is listed under this root in the corpus.' },
  'قول': { idea: 'saying, speech' }, 'كون': { idea: 'being, existing' }, 'ربب': { idea: 'lordship: owning, nurturing, sustaining' },
  'أمن': { idea: 'safety and trust, and from that: faith', note: 'أَمِنَ is "to be safe"; Form IV آمَنَ is "to believe".' },
  'علم': { idea: 'knowing; a mark by which something is known' }, 'قوم': { idea: 'standing, rising; setting something upright', note: 'From it: a people (قَوْم), the Resurrection (ٱلْقِيَٰمَة), straight (مُسْتَقِيم), to establish prayer (أَقَامَ).' },
  'أتي': { idea: 'coming', note: 'Form I أَتَىٰ "came"; Form IV ءَاتَى "gave" (made to come).' },
  'كفر': { idea: 'covering, and from that: denying, being ungrateful' }, 'بين': { idea: 'being clear and distinct; the space between' }, 'رسل': { idea: 'sending' },
  'سمو': { idea: 'height', note: 'The corpus lists both سَمَآء "sky" and ٱسْم "name" here.' }, 'كلل': { idea: 'totality: all, every' }, 'عذب': { idea: 'punishment, torment' }, 'عمل': { idea: 'doing, deed, work' },
  'رحم': { idea: 'mercy; the womb' }, 'أنس': { idea: 'humankind; familiarity' }, 'رأي': { idea: 'seeing; holding a view' }, 'كتب': { idea: 'writing, and from that: prescribing, decreeing' },
  'هدي': { idea: 'guiding' }, 'ظلم': { idea: 'wrong, injustice; darkness' }, 'نفس': { idea: 'self, soul; breath' }, 'قبل': { idea: 'the front, facing', note: 'From it: before (قَبْل), to accept (قَبِلَ), to approach (أَقْبَلَ), the qibla.' },
  'نزل': { idea: 'coming down', note: 'Forms II and IV both mean "send down".' }, 'ذكر': { idea: 'remembering, mentioning; also male' }, 'حقق': { idea: 'truth; what is right and due' }, 'كذب': { idea: 'lying; Form II: calling something a lie' },
  'عبد': { idea: 'serving, worshipping' }, 'أخذ': { idea: 'taking, seizing' }, 'خلق': { idea: 'creating; also character' }, 'وقي': { idea: 'guarding, protecting', note: 'Form VIII ٱتَّقَىٰ: to guard oneself, to be mindful of Allah. The wāw merges into the tāʾ.' },
  'أخر': { idea: 'being last, later, other' }, 'أمر': { idea: 'command; matter, affair' }, 'غفر': { idea: 'covering, and from that: forgiving' }, 'بعد': { idea: 'distance; after' },
  'ولي': { idea: 'closeness: guardianship, alliance; also turning', note: 'Form V تَوَلَّىٰ can mean "turn away" or "take as ally" depending on its preposition.' },
  'دعو': { idea: 'calling' }, 'حكم': { idea: 'judging; wisdom' }, 'ملك': { idea: 'owning, ruling', note: 'The corpus also lists مَلَك "angel" here; classical dictionaries discuss other origins for it.' },
  'جنن': { idea: 'being hidden from sight', note: 'A garden hidden by its trees, the unseen jinn, a shield, madness: one idea.' }, 'خير': { idea: 'good; choosing' },
  'نور': { idea: 'light', note: 'The corpus lists نَار "fire" under this root as well.' }, 'حسن': { idea: 'goodness, beauty, doing well' }, 'ضلل': { idea: 'straying, being lost' }, 'حيي': { idea: 'life; also modesty' },
  'بني': { idea: 'building', note: 'The corpus lists ٱبْن "son" and بَنُونَ here.' }, 'سمع': { idea: 'hearing' }, 'خرج': { idea: 'going out; Form IV: bringing out' },
};
