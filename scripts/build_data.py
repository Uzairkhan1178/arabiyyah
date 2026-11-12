#!/usr/bin/env python3
"""Build ARABIYYAH's Quran data files from verified sources. No text is generated or altered here:
Arabic text is copied verbatim from the Tanzil Uthmani snapshot; morphology from the Quranic Arabic
Corpus v0.4 (mustafa0x fork); word glosses/transliteration from Quran.com word-by-word data.

Usage: python3 -I scripts/build_data.py --tanzil DIR --morph FILE --wbw FILE --trans DIR --out public/data
"""
import argparse, collections, hashlib, json, os, re, sys

ap = argparse.ArgumentParser()
ap.add_argument('--tanzil'); ap.add_argument('--morph'); ap.add_argument('--wbw'); ap.add_argument('--trans'); ap.add_argument('--out')
A = ap.parse_args()
J = lambda p: json.load(open(p, encoding='utf-8'))

uth = J(os.path.join(A.tanzil, 'uthmani.json'))
chap = J(os.path.join(A.tanzil, 'chapters.json'))['chapters']
en = J(os.path.join(A.trans, 'english_saheeh.json'))
ur = J(os.path.join(A.trans, 'urdu_junagarhi.json'))
sha = hashlib.sha256(open(os.path.join(A.tanzil, 'uthmani.json'), 'rb').read()).hexdigest()

# --- morphology: (s,a,w) -> [ [form, tag, feats], ... ]
morph = collections.defaultdict(list)
for line in open(A.morph, encoding='utf-8'):
    p = line.rstrip('\n').split('\t')
    if len(p) < 4 or ':' not in p[0]: continue
    s, a, w, _ = (int(x) for x in p[0].split(':'))
    morph[(s, a, w)].append([p[1], p[2], p[3]])

# --- word-by-word glosses: (s,a,pos) -> (gloss, translit, audio)
wbw = {}
for page in J(A.wbw):
    for ay in page.get('ayahs') or []:
        for w in ay.get('words') or []:
            if w.get('char_type_name') != 'word': continue
            s, a = (int(x) for x in w['parentAyahVerseKey'].split(':'))
            wbw[(s, a, int(w['position']))] = ((w.get('translation') or {}).get('text') or '', (w.get('transliteration') or {}).get('text') or '')

def feat(feats, key):
    for f in feats.split('|'):
        if f.startswith(key + ':'): return f[len(key) + 1:]
    return None

os.makedirs(os.path.join(A.out, 'quran'), exist_ok=True)
stats = dict(ayahs=0, words=0, aligned_ayahs=0, misaligned=[], form_match=0, form_total=0, gloss_missing=0)
lex = {}            # lemma id -> record
roots = collections.defaultdict(lambda: dict(n=0, lemmas=set()))
PRIORITY = {67: 0, 55: 1, 1: 2}
meta = []
gidx = 0
for c in chap:
    s = int(c['id']); verses = uth[str(s)]
    out = dict(n=s, ar=c['name'], tl=c['transliteration'], en=c['translation'], type=c['type'], basmala=None, ayahs=[])
    meta.append(dict(n=s, ar=c['name'], tl=c['transliteration'], en=c['translation'], type=c['type'], count=len(verses), start=gidx))
    for v in verses:
        a = int(v['verse']); text = v['text']; gidx += 1
        toks = text.split(' ')
        if a == 1 and s not in (1, 9):
            # Tanzil prefixes the basmala to ayah 1; it is not part of the numbered ayah. Split, never edit.
            assert 'سْمِ' in toks[0] and len(toks) > 4, (s, toks[:5])
            out['basmala'] = ' '.join(toks[:4]); toks = toks[4:]
        nm = max([w for (ss, aa, w) in morph if ss == s and aa == a] or [0]) if False else 0
        w = 1
        while (s, a, w) in morph: w += 1
        nm = w - 1
        aligned = (nm == len(toks))
        words = []
        for i, t in enumerate(toks, 1):
            rec = dict(t=t)
            g = wbw.get((s, a, i))
            if aligned:
                segs = morph[(s, a, i)]
                rec['s'] = segs
                stats['form_total'] += 1
                if ''.join(x[0] for x in segs) == t: stats['form_match'] += 1
                for form, tag, feats in segs:
                    lem = feat(feats, 'LEM'); root = feat(feats, 'ROOT')
                    if not lem or 'PREF' in feats.split('|') or 'SUFF' in feats.split('|'): continue
                    fs = feats.split('|')
                    kind = 'PN' if 'PN' in fs else ('ADJ' if 'ADJ' in fs else tag)
                    if tag == 'P': kind = fs[0]
                    lid = lem + '|' + tag
                    L = lex.setdefault(lid, dict(id=lid, lem=lem, tag=tag, kind=collections.Counter(), root=root, n=0, gl=collections.Counter(), refs=[], vf=feat(feats, 'VF'), der=collections.Counter()))
                    L['n'] += 1; L['kind'][kind] += 1
                    for dk in ('ACT_PCPL', 'PASS_PCPL', 'VN'):
                        if dk in fs: L['der'][dk] += 1
                    if g and g[0]: L['gl'][g[0]] += 1
                    L['refs'].append((PRIORITY.get(s, 9), s, a, i))
                    if root: roots[root]['n'] += 1; roots[root]['lemmas'].add(lid)
            if g: rec['g'], rec['tr'] = g
            else: stats['gloss_missing'] += 1
            words.append(rec)
        stats['ayahs'] += 1; stats['words'] += len(toks); stats['aligned_ayahs'] += aligned
        if not aligned: stats['misaligned'].append(f'{s}:{a} tanzil={len(toks)} corpus={nm}')
        ay = dict(a=a, w=words, en=en[str(s)][a - 1]['text'], ur=ur[str(s)][a - 1]['text'])
        if not aligned: ay['al'] = False
        out['ayahs'].append(ay)
    json.dump(out, open(os.path.join(A.out, 'quran', f'{s}.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))

lexout = []
for L in lex.values():
    refs = sorted(set(L['refs']))[:8]
    lexout.append(dict(id=L['id'], lem=L['lem'], tag=L['tag'], kind=L['kind'].most_common(1)[0][0], root=L['root'], n=L['n'], vf=L['vf'], der=(L['der'].most_common(1)[0][0] if L['der'] and L['der'].most_common(1)[0][1] * 2 > L['n'] else None),
                       gl=[[g, k] for g, k in L['gl'].most_common(5)], refs=[f'{s}:{a}:{w}' for _, s, a, w in refs]))
lexout.sort(key=lambda x: -x['n'])
for i, L in enumerate(lexout): L['rank'] = i + 1
json.dump(lexout, open(os.path.join(A.out, 'lexicon.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
rootout = {r: dict(n=v['n'], l=sorted(v['lemmas'], key=lambda i: -lex[i]['n'])) for r, v in roots.items()}
json.dump(rootout, open(os.path.join(A.out, 'roots.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
prov = dict(
    text=dict(source='Tanzil Project — Quran Text (Uthmani), tanzil.net', license='CC BY 3.0; verbatim copies only, changing the text is not allowed', snapshot_sha256=sha, url='https://tanzil.net/download'),
    morphology=dict(source='Quranic Arabic Corpus v0.4 (Kais Dukes), Arabic-script fork by mustafa0x', license='GNU GPL', url='https://corpus.quran.com'),
    wordByWord=dict(source='Quran.com word-by-word English and transliteration (via @kmaslesa/holy-quran-word-by-word-full-data 1.0.6)', url='https://quran.com'),
    translations=dict(en='Saheeh International, via QuranEnc.com (unmodified)', ur='Muhammad Junagarhi, via QuranEnc.com (unmodified)', url='https://quranenc.com'),
    stats={k: v for k, v in stats.items() if k != 'misaligned'}, misaligned=stats['misaligned'])
json.dump(dict(surahs=meta, provenance=prov), open(os.path.join(A.out, 'meta.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print(json.dumps(prov['stats'])); print('misaligned', len(stats['misaligned']), stats['misaligned'][:12]); print('lemmas', len(lexout), 'roots', len(rootout))
