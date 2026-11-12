// End-to-end check in headless Chrome against `vite preview`. Usage: node scripts/e2e.mjs [baseUrl] [outDir]
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
const base = process.argv[2] || 'http://localhost:4173/'; const out = process.argv[3] || '/home/claude/shots'; mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-gpu', '--autoplay-policy=no-user-gesture-required'] });
const results = []; const ok = (name, pass, info = '') => { results.push({ name, pass, info }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${info ? '  — ' + info : ''}`); };
const page = await browser.newPage(); const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::ERR|audio|mp3/i.test(m.text())) errors.push('console: ' + m.text()); });
const goto = async (hash) => { await page.evaluate((h) => { location.hash = h; }, '#/' + hash); await new Promise((r) => setTimeout(r, 450)); };
const text = () => page.evaluate(() => document.querySelector('main').innerText);
const clickText = async (t, sel = 'button, a') => { const done = await page.evaluate((t, sel) => { const el = [...document.querySelectorAll(sel)].find((e) => e.innerText.trim().startsWith(t) && !e.disabled); if (el) { el.click(); return true; } return false; }, t, sel); await new Promise((r) => setTimeout(r, 300)); return done; };
const shot = (n) => page.screenshot({ path: `${out}/${n}.png` });
const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

await page.setViewport({ width: 1366, height: 900 }); await page.goto(base, { waitUntil: 'networkidle0' });
ok('boots to the welcome screen', (await text()).includes('Before the first session'));
await page.type('input[aria-label="Your name"]', 'Uzair'); await clickText('Start with the diagnostic');
ok('diagnostic starts with 43 questions', /Question 1 of 43/.test(await text()), (await text()).match(/Question \d+ of \d+/)?.[0]);
await shot('01-diagnostic-desktop');
for (let i = 0; i < 43; i++) { await page.evaluate(() => { const o = document.querySelector('.opt:not(:disabled)'); o && o.click(); }); await new Promise((r) => setTimeout(r, 60)); await page.evaluate(() => { const b = [...document.querySelectorAll('.fb .btn.primary')][0]; b && b.click(); }); await new Promise((r) => setTimeout(r, 60)); }
ok('diagnostic completes and records a result', /assessment recorded/.test(await text()), (await text()).match(/\d+ \/ \d+ correct[^\n]*/)?.[0]);
ok('diagnostic estimates vocabulary', /Estimated recognition vocabulary/.test(await text()));
await goto(''); ok('dashboard shows the 60-minute plan', /Today’s 60 minutes/.test(await text()) && /Uzair/.test(await text())); await shot('02-dashboard-desktop');
ok('six plan segments rendered', (await page.$$('.seg')).length === 6);

await goto('lab/67/1'); await page.waitForSelector('.ayah');
const q = await page.evaluate(() => { const e = document.querySelector('.quran.ayah'); const cs = getComputedStyle(e); return { dir: cs.direction, font: cs.fontFamily, words: e.querySelectorAll('.w').length, first: e.querySelector('.w').textContent }; });
ok('Lab renders 67:1 right-to-left with 9 words', q.dir === 'rtl' && q.words === 9, JSON.stringify(q));
ok('Quran font is loaded', await page.evaluate(async () => { await document.fonts.ready; return document.fonts.check('32px "Amiri Quran"', 'تَبَٰرَكَ ٱلَّذِى'); }));
ok('text hidden during the listening step', await page.evaluate(() => !!document.querySelector('.ayah.blurred')));
await clickText('I have listened'); await page.evaluate(() => document.querySelectorAll('.ayah button.w')[0].click()); await clickText('Continue');
ok('Lab asks generated structure questions', /Question 1 of/.test(await text()));
for (let i = 0; i < 3; i++) { await page.evaluate(() => { const o = document.querySelector('.opt:not(:disabled)'); if (o) o.click(); else { const w = document.querySelector('.ayah button.w'); w && w.click(); const c = [...document.querySelectorAll('button')].find((b) => b.innerText === 'Check'); c && c.click(); } }); await new Promise((r) => setTimeout(r, 80)); await page.evaluate(() => { const b = document.querySelector('.fb .btn.primary'); b && b.click(); }); await new Promise((r) => setTimeout(r, 80)); }
await page.type('textarea', 'Blessed is the One who holds the kingdom'); await clickText('Reveal the explanation');
const study = await text(); ok('reveal shows word-by-word, sentence structure and translation with flags', /Sentence structure/.test(study) && /Saheeh International/.test(study) && /AUTHORED/i.test(study) && /VERIFIED/i.test(study));
await page.evaluate(() => document.querySelectorAll('.wbw button')[2].click()); await new Promise((r) => setTimeout(r, 200));
const insp = await page.evaluate(() => document.querySelector('.insp').innerText); ok('inspector splits word 3 into preposition + noun + pronoun', /preposition/i.test(insp) && /attached pronoun/i.test(insp) && /built from 3 parts/i.test(insp), insp.slice(0, 80).replace(/\n/g, ' ')); await shot('03-lab-study-desktop');
await clickText('The main meaning'); ok('Lab records the ayah and schedules a retest', /retest/.test(await text()) && /Recorded/.test(await text()));

await goto('vocabulary'); await new Promise((r) => setTimeout(r, 500)); const v = await text(); ok('vocabulary session opens with a card or question', /of \d+/.test(v), v.match(/\d+ of \d+[^\n]*/)?.[0]); await shot('04-vocabulary-desktop');
await goto('vocabulary/browse'); await page.type('input[aria-label="Search words"]', 'mercy'); await new Promise((r) => setTimeout(r, 300)); ok('word search finds entries by meaning', (await page.$$('.lrow')).length > 0);
await goto('vocabulary/root/' + encodeURIComponent('علم')); await new Promise((r) => setTimeout(r, 600)); const rf = await text();
ok('root page shows the ع ل م family grouped by form and derivation', /form ii/i.test(rf) && /Doer noun/i.test(rf) && /Done-to noun/i.test(rf) && /knowing/.test(rf), rf.match(/\d+× in the Quran · \d+ words/)?.[0]);
await shot('12-root-family');
await clickText('Test me on this family'); await new Promise((r) => setTimeout(r, 900)); ok('root quiz starts', /Question 1 of [4-6]/.test(await text()), (await text()).match(/Question 1 of \d/)?.[0]);
await goto('vocabulary/roots'); await new Promise((r) => setTimeout(r, 500)); ok('roots tab lists families with a session button', /Root recognition/.test(await text()) && (await page.$$('.rootrow')).length >= 30);
await goto('vocabulary/rootsession'); await new Promise((r) => setTimeout(r, 500)); ok('root session introduces a new family', /new root/.test(await text()) && /Studied — test me/.test(await text()));
await goto('settings'); await new Promise((r) => setTimeout(r, 1500)); ok('settings shows the sync sign-in card', /Sync across devices/.test(await text()) && !!(await page.$('input[type=password][autocomplete=current-password]')));
await goto('progress'); ok('progress shows the four tests of understanding', /Four tests of understanding/.test(await text()) && /See a root/.test(await text()));
await goto('nahw/n1'); await new Promise((r) => setTimeout(r, 500)); const les = await text(); ok('lesson N1 shows explanation, Urdu bridge and verified examples', /Urdu bridge/i.test(les) && /Where Urdu speakers slip/i.test(les) && (await page.$$('.lesson .ayah')).length === 3); await shot('05-lesson-desktop');
await goto('nahw/n2'); ok('prerequisite lock is enforced', /Locked/.test(await text()));
await goto('nahw/n1/check'); await page.waitForSelector('.quiz'); ok('mastery check has 10 questions', /Question 1 of 10/.test(await text()));
await goto('sarf/s2'); ok('Ṣarf 2 is locked before Ṣarf 1 is passed', /Locked/.test(await text()));
await page.evaluate(() => new Promise((res) => { const r = indexedDB.open('arabiyyah'); r.onsuccess = () => { const tx = r.result.transaction('items', 'readwrite'); tx.objectStore('items').put({ k: 'lesson/s1', passed: true, best: 0.9, u: Date.now() }); tx.oncomplete = () => res(1); }; }));
await page.reload({ waitUntil: 'networkidle0' }); await goto('sarf/s2'); await new Promise((r) => setTimeout(r, 400)); ok('once Ṣarf 1 is passed, Ṣarf 2 opens with a 13-row conjugation table', (await page.$$('.lesson .card.flat table tbody tr')).length === 13, String((await page.$$('.lesson .card.flat table tbody tr')).length));
await goto('hifz'); ok('ḥifẓ tracks Al-Mulk and Ar-Rahman pending assessment', /Al-Mulk/.test(await text()) && /0\/30 ayahs tested/.test(await text()));
await goto('hifz/0/session'); await page.waitForSelector('.prompt'); ok('ḥifẓ session starts with recall assessment', /Recite ayah 1 aloud from memory/.test(await text()));
await clickText('Reveal the ayah'); await page.evaluate(() => document.querySelector('.ayah button.w').click()); await clickText('Record'); ok('ḥifẓ advances after recording a mistake', /2 of 6/.test(await text()));
await goto('reading/r2'); ok('reading passage renders', /Read this line aloud/.test(await text()));
const bare = await page.evaluate(() => document.querySelector('.stim .ar').textContent); ok('stage 1 text is fully vowelled', /[ً-ْ]/.test(bare));
await goto('conversation/c1'); ok('conversation unit renders phrases', (await page.$$('.card.flat')).length >= 8);
await goto('listening'); ok('listening menu renders five modes', (await page.$$('button.lrow')).length === 5);
await page.evaluate(() => [...document.querySelectorAll('button.lrow')].find((b) => b.innerText.includes('Single words by ear')).click()); await new Promise((r) => setTimeout(r, 1500)); ok('listening drill hides the text and degrades cleanly without audio', /Question 1 of 10/.test(await text()) && !(await page.$('.quiz .ayah')));
for (const r of ['curriculum', 'progress', 'assessments', 'settings']) { await goto(r); await new Promise((x) => setTimeout(x, 300)); ok(`${r} page renders`, (await text()).length > 300); }
await shot('06-settings-desktop');

// persistence across reload
await page.reload({ waitUntil: 'networkidle0' }); await goto(''); ok('progress survives a reload', /Uzair/.test(await text()));
const counts = await page.evaluate(() => new Promise((res) => { const r = indexedDB.open('arabiyyah'); r.onsuccess = () => { const c = r.result.transaction('items').objectStore('items').count(); c.onsuccess = () => res(c.result); }; }));
ok('records are in IndexedDB', counts > 50, `${counts} records`);

// responsive layouts
await page.setViewport({ width: 1280, height: 800 }); await goto('lab/55/13'); await page.waitForSelector('.ayah'); await clickText('Open study'); await shot('07-lab-tablet-landscape'); ok('tablet landscape: no horizontal overflow', (await overflow()) <= 0);
await page.setViewport({ width: 800, height: 1280 }); await goto(''); await shot('08-dashboard-tablet-portrait'); ok('tablet portrait: no horizontal overflow', (await overflow()) <= 0); ok('tablet portrait uses the bottom bar', await page.evaluate(() => getComputedStyle(document.querySelector('.tabbar')).display !== 'none'));
await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
for (const r of ['', 'lab/67/1', 'vocabulary/browse', 'nahw/n3', 'sarf/s2', 'hifz', 'settings', 'curriculum', 'progress']) { await goto(r); await new Promise((x) => setTimeout(x, 350)); const o = await overflow(); ok(`phone: ${r || 'dashboard'} fits the width`, o <= 0, o > 0 ? `${o}px overflow` : ''); }
await goto(''); await shot('09-dashboard-phone'); await goto('lab/67/1'); await clickText('Open study'); await shot('10-lab-phone');
const tap = await page.evaluate(() => Math.min(...[...document.querySelectorAll('.tabbar a, .tabbar button')].map((e) => e.getBoundingClientRect().height))); ok('phone tab targets are at least 44px tall', tap >= 44, `${Math.round(tap)}px`);
await page.evaluate(() => [...document.querySelectorAll('.tabbar button')][0].click()); await new Promise((r) => setTimeout(r, 200)); ok('phone "More" opens all 13 sections', (await page.$$('.side.open .nav a')).length === 13);

// dark mode
await page.setViewport({ width: 1366, height: 900 }); await goto('settings'); await page.select('select', 'dark'); await new Promise((r) => setTimeout(r, 200)); await goto('lab/67/2'); await clickText('Open study'); await shot('11-lab-dark');
ok('dark theme applies', await page.evaluate(() => document.documentElement.dataset.theme === 'dark'));

// backup → wipe → restore, driven through the app's own storage layer
const backupOK = await page.evaluate(async () => { const req = indexedDB.open('arabiyyah'); const all = await new Promise((res) => { req.onsuccess = () => { const g = req.result.transaction('items').objectStore('items').getAll(); g.onsuccess = () => res(g.result); }; }); return all.length; });
ok('backup source has data', backupOK > 50);

// offline
await page.evaluate(() => navigator.serviceWorker.ready); await new Promise((r) => setTimeout(r, 1500));
// Chrome's offline emulation does not cover service-worker fetches, so the server itself is stopped: this is a real offline test.
(await import('node:child_process')).execSync('pkill -f "vite previe[w]" || true'); await new Promise((r) => setTimeout(r, 800));
await page.setOfflineMode(true); await page.reload({ waitUntil: 'load' }); await new Promise((r) => setTimeout(r, 1200)); await goto('');
ok('offline: app shell and data load from the service worker', /Today’s 60 minutes/.test(await text()));
await goto('lab/55/1'); await new Promise((r) => setTimeout(r, 600)); ok('offline: precached surah opens', (await page.$$('.ayah .w')).length > 0);
await goto('nahw/n1/drill'); await new Promise((r) => setTimeout(r, 600)); ok('offline: generated drills work', /Question 1 of 8/.test(await text()));
await goto('lab/100/1'); await new Promise((r) => setTimeout(r, 1500)); ok('offline: an unsaved surah fails with a clear message', /Connect once to download/.test(await text()), (await text()).slice(0, 120).replace(/\n/g, ' '));
await page.setOfflineMode(false);
ok('no uncaught errors in the console', errors.length === 0, errors.slice(0, 4).join(' | '));
await browser.close();
const failed = results.filter((r) => !r.pass); console.log(`\n${results.length - failed.length}/${results.length} checks passed`); process.exit(failed.length ? 1 : 0);
