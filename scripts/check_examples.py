"""Print the words that each authored lesson example highlights, so index errors are visible. Usage: python3 -I scripts/check_examples.py"""
import json, re, sys, glob
cache = {}
def surah(n):
    if n not in cache: cache[n] = json.load(open(f'public/data/quran/{n}.json', encoding='utf-8'))
    return cache[n]
bad = 0
for f in sorted(glob.glob('src/content/*.ts')):
    src = open(f, encoding='utf-8').read()
    cur = None
    for m in re.finditer(r"id: '(\w+)'|ref: '(\d+):(\d+)', hi: \[([\d, ]*)\], note: '((?:[^'\\]|\\.)*)'", src):
        if m.group(1): cur = m.group(1); continue
        s, a = int(m.group(2)), int(m.group(3)); hi = [int(x) for x in m.group(4).split(',') if x.strip()]
        ay = surah(s)['ayahs'][a - 1]; ws = ay['w']
        parts = []
        for i in hi:
            if i < 1 or i > len(ws): parts.append(f'#{i} OUT OF RANGE({len(ws)})'); bad += 1; continue
            w = ws[i - 1]; tags = ' + '.join(x[2] for x in w.get('s', []))
            parts.append(f"#{i} {w['t']} [{w.get('g','')}] <{tags[:70]}>")
        print(f"{cur} {s}:{a} | {' || '.join(parts)} | NOTE: {m.group(5)[:70]}")
print('out-of-range:', bad)
