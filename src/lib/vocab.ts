import { VOCAB_NOTES, type Note } from '../content/vocab';
import { type Lex, KINDS, TAGNAME, FORMS } from './quran';
import { cleanGloss } from './gen';

// Keys are compared in Unicode NFC so the order in which shadda and a vowel were typed never matters.
const NOTES = new Map(Object.entries(VOCAB_NOTES).map(([k, v]) => [k.normalize('NFC'), v]));
export const noteOf = (l: Lex): Note | undefined => NOTES.get(l.id.normalize('NFC'));
export const meaningOf = (l: Lex) => noteOf(l)?.en || cleanGloss(l.gl[0]?.[0] || '') || '—';
export const kindOf = (l: Lex) => (KINDS[l.kind] ? `${KINDS[l.kind][0]}` : TAGNAME[l.tag]?.[0] || l.tag) + (l.vf && +l.vf > 1 ? ` · Form ${FORMS[+l.vf]}` : '');
const MARKS = /[ً-ْٰ]/;
/** Rule-derived pattern: swaps the three root letters for ف ع ل. Returns null when the root letters are not all visible (weak roots). */
export function wazn(lem: string, root: string | null): string | null {
  if (!root || root.length !== 3) return null;
  const model = ['ف', 'ع', 'ل']; let k = 0; let out = '';
  for (const ch of lem.normalize('NFC')) {
    if (k < 3 && !MARKS.test(ch) && ch === root[k]) { out += model[k++]; } else out += ch;
  }
  return k === 3 ? out : null;
}
