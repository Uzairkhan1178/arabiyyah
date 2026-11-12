import { StrictMode, useEffect, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/amiri-quran/arabic-400.css';
import '@fontsource/noto-naskh-arabic/arabic-400.css';
import '@fontsource/noto-naskh-arabic/arabic-600.css';
import '@fontsource/noto-nastaliq-urdu/arabic-400.css';
import '@fontsource-variable/newsreader';
import './styles.css';
import { initDB, settings, useDB, storageOK } from './lib/db';
import { initData } from './lib/quran';
import { due } from './lib/srs';
import { useRoute, Link, Ar } from './ui/core';
import Dashboard from './pages/Dashboard';
import Curriculum from './pages/Curriculum';
import Lab from './pages/Lab';
import Vocabulary from './pages/Vocabulary';
import Grammar from './pages/Grammar';
import Listening from './pages/Listening';
import Hifz from './pages/Hifz';
import Reading from './pages/Reading';
import Conversation from './pages/Conversation';
import Assessments from './pages/Assessments';
import Progress from './pages/Progress';
import Settings from './pages/Settings';

const NAV: [string, string, string][] = [
  ['', 'Dashboard', '◈'], ['curriculum', 'My Curriculum', '☰'], ['lab', 'Quran Laboratory', '۞'], ['vocabulary', 'Vocabulary', 'ع'], ['sarf', 'Ṣarf', 'ص'], ['nahw', 'Naḥw', 'ن'],
  ['listening', 'Listening', '◉'], ['hifz', 'Ḥifẓ', 'ح'], ['reading', 'Reading Practice', '¶'], ['conversation', 'Conversation', '❝'], ['assessments', 'Assessments', '✓'], ['progress', 'Progress', '◔'], ['settings', 'Settings', '⚙'],
];
function App() {
  useDB();
  const r = useRoute(); const top = r[0] || ''; const [menu, setMenu] = useState(false); const s = settings();
  useEffect(() => {
    const dark = s.theme === 'dark' || (s.theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'; document.documentElement.style.setProperty('--scale', String(s.scale));
  }, [s.theme, s.scale]);
  useEffect(() => setMenu(false), [r.join('/')]);
  const badge: Record<string, number> = { vocabulary: due('vocab').length, hifz: due('hifz').length };
  let page: ReactNode;
  switch (top) {
    case 'curriculum': page = <Curriculum />; break;
    case 'lab': page = <Lab s={+r[1] || undefined} a={+r[2] || undefined} />; break;
    case 'vocabulary': page = <Vocabulary sub={r[1]} id={r[2] ? decodeURIComponent(r[2]) : undefined} />; break;
    case 'sarf': case 'nahw': page = <Grammar track={top} id={r[1]} mode={r[2]} />; break;
    case 'listening': page = <Listening />; break;
    case 'hifz': page = <Hifz s={+r[1] || undefined} mode={r[2]} />; break;
    case 'reading': page = <Reading id={r[1]} />; break;
    case 'conversation': page = <Conversation id={r[1]} />; break;
    case 'assessments': page = <Assessments kind={r[1]} />; break;
    case 'progress': page = <Progress />; break;
    case 'settings': page = <Settings />; break;
    default: page = <Dashboard />;
  }
  return <div className="shell">
    <aside className={`side ${menu ? 'open' : ''}`}>
      <div className="brand">Arabiyyah <Ar>عَرَبِيَّة</Ar></div>
      <nav className="nav" aria-label="Main">
        {NAV.map(([to, label, icon], i) => <span key={to}>{(i === 2 || i === 10) && <hr />}<Link to={to} className={top === to ? 'on' : ''}><i aria-hidden>{icon}</i>{label}{badge[to] ? <span className="badge">{badge[to]}</span> : null}</Link></span>)}
      </nav>
      {menu && <button className="btn" style={{ margin: '1rem .6rem' }} onClick={() => setMenu(false)}>Close menu</button>}
    </aside>
    <main>
      {!storageOK && <p className="warn" style={{ padding: '.6rem 1rem', margin: 0 }}>This browser is blocking storage, so progress cannot be saved. Leave private mode or allow site data.</p>}
      {page}
    </main>
    <nav className="tabbar" aria-label="Quick navigation">
      {([['', 'Today', '◈'], ['lab', 'Lab', '۞'], ['vocabulary', 'Words', 'ع'], ['hifz', 'Ḥifẓ', 'ح']] as const).map(([to, label, icon]) => <Link key={to} to={to} className={top === to ? 'on' : ''}><i aria-hidden>{icon}</i>{label}</Link>)}
      <button onClick={() => setMenu(true)} aria-label="All sections"><i aria-hidden>☰</i>More</button>
    </nav>
  </div>;
}
function Boot() {
  const [st, set] = useState<'load' | 'ok' | string>('load');
  useEffect(() => { Promise.all([initDB(), initData()]).then(() => set('ok')).catch((e) => set(String(e?.message || e))); }, []);
  if (st === 'load') return <div className="boot"><div><h1>Arabiyyah</h1><p className="muted">Loading your study environment…</p></div></div>;
  if (st !== 'ok') return <div className="boot"><div><h1>Could not start</h1><p className="warn">{st}</p><p className="muted">The core word list could not be loaded. Open the app once with a connection so it can be stored for offline use.</p><button className="btn primary" onClick={() => location.reload()}>Try again</button></div></div>;
  return <App />;
}
createRoot(document.getElementById('root')!).render(<StrictMode><Boot /></StrictMode>);
