"""Find Quranic quotations typed inside authored content and confirm each exists in the verified text.
A run of 2+ Arabic words containing an Uthmani-only sign (alif wasla or dagger alif) is treated as a quotation.
Usage: python3 -I scripts/check_quotes.py"""
import json, re, glob, unicodedata
MARKS = re.compile('[ً-ٰٟـۖ-ۭ‌‍]')
def norm(t):
    t = MARKS.sub('', unicodedata.normalize('NFC', t))
    return re.sub('[ٱأإآ]', 'ا', t).replace('ى', 'ي').replace('ـ', '')
allw = []
for n in range(1, 115):
    d = json.load(open(f'public/data/quran/{n}.json', encoding='utf-8'))
    for ay in d['ayahs']:
        allw += [norm(w['t']) for w in ay['w']]
    allw.append('|')
corpus = ' ' + ' '.join(allw) + ' '
AR = re.compile('[؀-ۿ][؀-ۿ‌‍ ]*[؀-ۿ]')
total = bad = 0
for f in sorted(glob.glob('src/content/*.ts')):
    for m in AR.finditer(open(f, encoding='utf-8').read()):
        q = m.group(0)
        if ' ' not in q.strip() or not re.search('[ٱٰ]', q): continue
        q = re.sub('[،؟…]', ' ', q); key = ' '.join(norm(w) for w in q.split() if norm(w))
        total += 1
        if (' ' + key + ' ') not in corpus:
            bad += 1; print('NOT FOUND', f.split('/')[-1], '|', q)
print(f'{total} quotations checked, {bad} not found verbatim')
