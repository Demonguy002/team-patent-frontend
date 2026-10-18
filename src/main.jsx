import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, Award, BarChart3, Bolt,
  Check, CheckCircle2, ChevronRight, Clock3, Code2, Crown, Eye, EyeOff, Flame,
  Gauge, Github, Globe2, HeartHandshake, Lightbulb, LockKeyhole, LogOut, Medal,
  Menu, Moon, Orbit, Palette, RefreshCw, Rocket, ShieldCheck, Sparkles, Star,
  Sun, Target, Trophy, Users, Waves, X, Zap
} from 'lucide-react';
import './styles.css';

const scoreFields = [
  ['workCapability', 'Work capability', 'Consistent effort and reliable execution'],
  ['logic', 'Logic', 'Reasoning, analysis, and problem-solving'],
  ['innovation', 'Innovation', 'Original ideas and creative solutions'],
  ['teamwork', 'Teamwork', 'Communication and collaboration'],
  ['delivery', 'Delivery', 'Progress, quality, and follow-through']
];
const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'https://team-patent.onrender.com').replace(/\/$/, '');
const img = m => `/assets/${encodeURIComponent(m.file || 'logo.webp')}`;
const average = m => Math.round(scoreFields.reduce((sum, [k]) => sum + Number(m.scores?.[k] || 0), 0) / scoreFields.length * 10) / 10;
const total = arr => arr.reduce((s, x) => s + x, 0);
const esc = s => String(s ?? '');
const initialTheme = localStorage.getItem('tp_theme') || 'light';

function App() {
  const [theme, setTheme] = useState(initialTheme);
  const [view, setView] = useState('home');
  const [members, setMembers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [adminToken, setAdminToken] = useState(localStorage.getItem('tp_admin_token') || '');
  const [loginName, setLoginName] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [activeAdmin, setActiveAdmin] = useState(null);
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [intro, setIntro] = useState(true);
  const [race, setRace] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const notify = msg => { setToast(msg); window.clearTimeout(window.__tpToast); window.__tpToast = window.setTimeout(() => setToast(''), 2800); };
  const api = async (url, options = {}) => {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (adminToken) headers.Authorization = `Bearer ${adminToken}`;
    const res = await fetch(`${API_BASE}${url}`, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || data.error || `Request failed (${res.status})`);
    return data;
  };
  const refresh = async (silent = true) => {
    try {
      const [memberData, boardData] = await Promise.all([
        api('/api/members'),
        api('/api/leaderboard')
      ]);
      const board = new Map((boardData.leaderboard || []).map(row => [String(row.memberId), row]));
      const normalized = (memberData.members || []).map(raw => {
        const score = board.get(String(raw._id)) || {};
        const filename = (raw.image || '').split('/').pop() || 'logo.webp';
        return {
          id: String(raw._id), name: raw.name, role: raw.role, file: filename,
          about: raw.about || 'A valued member of Team Patent, contributing skills and effort toward shared project goals.',
          strengths: Array.isArray(raw.strengths) ? raw.strengths : [],
          quote: raw.quote || 'Different strengths. One shared mission.',
          scores: score.scores || { workCapability: Number(score.workCapability ?? score.workcapability ?? 0), logic: Number(score.logic ?? 0), innovation: Number(score.innovation ?? 0), teamwork: Number(score.teamwork ?? 0), delivery: Number(score.delivery ?? 0) },
          workHours: Number(score.workHours || 0), completedTasks: Number(score.completedTasks || 0),
          updatedAt: score.updatedAt || null, percentage: Number(score.percentage || 0)
        };
      });
      setMembers(normalized);
      setSelected(prev => prev ? (normalized.find(m => m.id === prev.id) || null) : null);
      setActiveAdmin(prev => prev ? (normalized.find(m => m.id === prev.id) || null) : null);
    } catch (e) {
      if (!silent) notify(`Could not load Team Patent data: ${e.message}`);
    }
  };
  useEffect(() => {
    document.body.dataset.theme = theme;
    localStorage.setItem('tp_theme', theme);
  }, [theme]);
  useEffect(() => {
    refresh(false);
    const timer = setInterval(() => refresh(true), 12000);
    const introTimer = setTimeout(() => setIntro(false), 2550);
    return () => { clearInterval(timer); clearTimeout(introTimer); };
  }, []);

  const sorted = useMemo(() => [...members].sort((a, b) => average(b) - average(a)), [members]);
  const go = next => { setView(next); setMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const openMember = m => { setSelected(m); go('profile'); };
  const login = async e => {
    e.preventDefault(); setLoginError(''); setBusy(true);
    try {
      const d = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ username: loginName.trim(), password: loginPass }) });
      setAdminToken(d.token); localStorage.setItem('tp_admin_token', d.token);
      await refresh(false); setActiveAdmin(null); go('admin'); notify('Welcome to the admin control room.');
    } catch (err) { setLoginError(err.message); }
    finally { setBusy(false); }
  };
  const saveMember = async () => {
    if (!activeAdmin || !draft) return;
    for (const [key, label] of scoreFields) {
      const n = Number(draft.scores[key]);
      if (!Number.isFinite(n) || n < 0 || n > 100) { notify(`${label} must be between 0 and 100.`); return; }
    }
    if (Number(draft.workHours) < 0 || Number(draft.completedTasks) < 0) { notify('Hours and tasks cannot be negative.'); return; }
    setBusy(true);
    try {
      // HTML number inputs still store their values as strings. The API validates
      // score fields as JSON numbers, so convert every field before sending.
      const payload = {
        workCapability: Number(draft.scores.workCapability ?? 0),
        logic: Number(draft.scores.logic ?? 0),
        innovation: Number(draft.scores.innovation ?? 0),
        teamwork: Number(draft.scores.teamwork ?? 0),
        delivery: Number(draft.scores.delivery ?? 0),
        workHours: Number(draft.workHours || 0),
        completedTasks: Number(draft.completedTasks || 0),
        notes: String(draft.notes || '')
      };
      const saved = await api(`/api/scores/${activeAdmin.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      // Reflect the saved values immediately, then reconcile with the server's leaderboard response.
      const savedScores = { workCapability: Number(payload.workCapability), logic: Number(payload.logic), innovation: Number(payload.innovation), teamwork: Number(payload.teamwork), delivery: Number(payload.delivery) };
      const savedMember = { ...activeAdmin, scores: savedScores, workHours: payload.workHours, completedTasks: payload.completedTasks, updatedAt: saved.updatedAt || new Date().toISOString() };
      setActiveAdmin(savedMember);
      setDraft({ scores: savedScores, workHours: payload.workHours, completedTasks: payload.completedTasks, notes: payload.notes });
      setMembers(prev => prev.map(m => m.id === activeAdmin.id ? savedMember : m));
      await refresh(false);
      // Keep the editor populated with the values just saved rather than clearing when changing members.
      setDraft({ scores: savedScores, workHours: payload.workHours, completedTasks: payload.completedTasks, notes: payload.notes });
      notify('Saved successfully. Scores are retained and the leaderboard is updated.');
    } catch (e) { notify(`Score save failed: ${e.message}`); if (e.message.includes('session') || e.message.includes('Administrator login')) { setAdminToken(''); localStorage.removeItem('tp_admin_token'); go('login'); } }
    finally { setBusy(false); }
  };
  const logout = async () => {
    setAdminToken(''); localStorage.removeItem('tp_admin_token'); setActiveAdmin(null); setDraft(null); go('home'); notify('Signed out.');
  };
  const zeroPayload = { workCapability: 0, logic: 0, innovation: 0, teamwork: 0, delivery: 0, workHours: 0, completedTasks: 0, notes: '' };
  const resetSelected = async () => {
    if (!activeAdmin) { notify('Select a member first.'); return; }
    if (!window.confirm(`Reset all scores, hours, tasks, and notes for ${activeAdmin.name}? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await api(`/api/scores/${activeAdmin.id}`, { method: 'PUT', body: JSON.stringify(zeroPayload) });
      await refresh(false);
      const updated = members.find(m => m.id === activeAdmin.id) || activeAdmin;
      setDraft({ scores: { workCapability: 0, logic: 0, innovation: 0, teamwork: 0, delivery: 0 }, workHours: 0, completedTasks: 0, notes: '' });
      setActiveAdmin(updated);
      notify(`${activeAdmin.name}'s scores have been reset to zero.`);
    } catch (e) { notify(`Reset failed: ${e.message}`); }
    finally { setBusy(false); }
  };
  const resetAll = async () => {
    if (!members.length) { notify('No members loaded to reset.'); return; }
    if (!window.confirm(`RESET ALL ${members.length} MEMBERS? This will set every score, work hour, and task to 0 and clear all notes. This action cannot be undone.`)) return;
    setBusy(true);
    let done = 0;
    try {
      for (const member of members) {
        await api(`/api/scores/${member.id}`, { method: 'PUT', body: JSON.stringify(zeroPayload) });
        done += 1;
      }
      await refresh(false);
      if (activeAdmin) setDraft({ scores: { workCapability: 0, logic: 0, innovation: 0, teamwork: 0, delivery: 0 }, workHours: 0, completedTasks: 0, notes: '' });
      notify(`Reset complete: all ${done} members now have zero scores.`);
    } catch (e) {
      await refresh(true);
      notify(`Reset stopped after ${done}/${members.length} members: ${e.message}. Refresh data and retry if needed.`);
    } finally { setBusy(false); }
  };
  const chooseAdminMember = async member => {
    setActiveAdmin(member);
    try {
      const result = await api(`/api/admin/scores/${member.id}`);
      const stored = result.score || {};
      const storedScores = stored.scores || {
        workCapability: Number(stored.workCapability ?? member.scores.workCapability ?? 0),
        logic: Number(stored.logic ?? member.scores.logic ?? 0),
        innovation: Number(stored.innovation ?? member.scores.innovation ?? 0),
        teamwork: Number(stored.teamwork ?? member.scores.teamwork ?? 0),
        delivery: Number(stored.delivery ?? member.scores.delivery ?? 0)
      };
      setDraft({
        scores: { ...storedScores },
        workHours: Number(stored.workHours ?? member.workHours ?? 0),
        completedTasks: Number(stored.completedTasks ?? member.completedTasks ?? 0),
        notes: stored.notes || ''
      });
    } catch (e) {
      setDraft({ scores: { ...member.scores }, workHours: member.workHours || 0, completedTasks: member.completedTasks || 0, notes: '' });
      if (e.message.includes('Administrator login') || e.message.includes('session')) notify('Your admin session may have expired. Sign in again.');
    }
  };
  const runRace = async () => {
    await refresh(false); setRace(true);
    await new Promise(r => setTimeout(r, 2300));
    setRace(false); notify('Leaderboard results revealed.');
  };

  const Avatar = ({ member, size = 'md', className = '' }) => <span className={`avatar avatar-${size} ${className}`}><img src={img(member)} alt={member.name} loading="lazy" /></span>;
  const Eyebrow = ({ children, icon: Icon }) => <div className="eyebrow">{Icon && <Icon size={13} />}<span>{children}</span></div>;
  const Button = ({ children, variant = 'primary', onClick, className = '', ...props }) => <button className={`btn btn-${variant} ${className}`} onClick={onClick} {...props}>{children}</button>;
  const MemberTile = ({ member, compact = false }) => <motion.button className={`member-tile ${compact ? 'compact' : ''}`} onClick={() => openMember(member)} whileHover={{ y: -5, scale: 1.015 }} whileTap={{ scale: .98 }} layout>
    <Avatar member={member} size={compact ? 'sm' : 'lg'} />
    <span className="member-tile-copy"><b>{member.name}</b><small>{member.role}</small></span><ArrowUpRight className="tile-arrow" size={17} />
  </motion.button>;
  const ThemePicker = () => <div className="theme-picker" aria-label="Choose theme">
    <button className={theme === 'light' ? 'chosen' : ''} onClick={() => setTheme('light')} title="Bright theme"><Sun size={15}/><span>Bright</span></button>
    <button className={theme === 'dark' ? 'chosen' : ''} onClick={() => setTheme('dark')} title="Dark theme"><Moon size={15}/><span>Dark</span></button>
    <button className={theme === 'ocean' ? 'chosen' : ''} onClick={() => setTheme('ocean')} title="Ocean theme"><Waves size={15}/><span>Ocean</span></button>
  </div>;
  const Header = () => <header className="topbar">
    <button className="brand" onClick={() => go('home')}><img src="/assets/logo.webp" alt="Team Patent logo"/><span><b>TEAM <i>PATENT</i></b><small>INNOVATION PORTAL</small></span></button>
    <div className={`nav-right ${menuOpen ? 'menu-open' : ''}`}><ThemePicker /><span className="team-chip"><i/> TEAM SPACE</span></div>
    <button className="mobile-menu" onClick={() => setMenuOpen(v => !v)} aria-label="Toggle menu">{menuOpen ? <X/> : <Menu/>}</button>
  </header>;
  const Footer = () => <footer className="footer"><div className="footer-brand"><img src="/assets/logo.webp" alt=""/><span><b>TEAM PATENT</b><small>IDEA · INNOVATION · RESEARCH · IMPACT</small></span></div><span className="footer-message">Built for the people behind the idea.</span><button onClick={() => go('login')}>Admin access <ArrowUpRight size={14}/></button></footer>;

  const Home = () => <motion.section className="page home-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
    <div className="hero">
      <div className="hero-copy">
        <Eyebrow icon={Sparkles}>ONE TEAM · MANY STRENGTHS</Eyebrow>
        <motion.h1 className="team-patent-hero" initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: .08, delayChildren: .12 } } }}><span className="word-line">{Array.from('TEAM').map((letter, i) => { const starts = [{x:-180,y:-95,rotate:-35},{x:130,y:-150,rotate:28},{x:-145,y:115,rotate:-25},{x:170,y:100,rotate:38}]; return <motion.span className="hero-letter" key={`team-${i}`} custom={i} variants={{ hidden: (n) => ({ opacity: 0, ...starts[n % starts.length], scale: .25 }), show: { opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 } }} transition={{ type: 'spring', stiffness: 155, damping: 12, mass: .75 }}>{letter}</motion.span>; })}</span><span className="word-line patent-word">{Array.from('PATENT').map((letter, i) => { const starts = [{x:180,y:110,rotate:35},{x:-155,y:-115,rotate:-28},{x:135,y:-155,rotate:22},{x:-190,y:65,rotate:-38},{x:155,y:125,rotate:30},{x:-100,y:-145,rotate:-24}]; return <motion.span className="hero-letter" key={`patent-${i}`} custom={i} variants={{ hidden: (n) => ({ opacity: 0, ...starts[n % starts.length], scale: .25 }), show: { opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 } }} transition={{ type: 'spring', stiffness: 150, damping: 12, mass: .75 }}>{letter}</motion.span>; })}</span><span className="hero-sprinkles" aria-hidden="true">{Array.from({length: 22}, (_, i) => <i key={i} style={{'--i': i, left: `${(i * 37 + 11) % 100}%`, top: `${(i * 23 + 7) % 88}%`, '--spin': `${i * 31}deg`}} />)}</span></motion.h1>
        <motion.p className="hero-desc" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .18, duration: .7 }}>A shared space to celebrate the people, progress, and possibilities behind Team Patent.</motion.p>
        <motion.div className="hero-actions" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .32 }}>
          <Button onClick={() => go('viewer')}>Explore the team <ArrowRight size={17}/></Button>
          <Button variant="secondary" onClick={() => go('login')}><LockKeyhole size={16}/> Admin access</Button>
        </motion.div>
        <div className="hero-metrics"><div><b>08</b><small>TEAM MEMBERS</small></div><div><b>01</b><small>SHARED VISION</small></div><div><b>∞</b><small>IDEAS TO BUILD</small></div></div>
      </div>
      <div className="hero-visual">
        <div className="logo-orbit"><img src="/assets/logo.webp" alt="Team Patent logo" /></div>
        <motion.div className="hero-halo halo-one" animate={{ rotate: 360 }} transition={{ duration: 44, repeat: Infinity, ease: 'linear' }} />
        <motion.div className="hero-halo halo-two" animate={{ rotate: -360 }} transition={{ duration: 34, repeat: Infinity, ease: 'linear' }} />
        <motion.div className="float-card float-one" animate={{ y: [0, -9, 0] }} transition={{ duration: 4.2, repeat: Infinity }}><span className="float-icon"><Lightbulb/></span><span><b>Think boldly</b><small>Ideas start here</small></span></motion.div>
        <motion.div className="float-card float-two" animate={{ y: [0, 8, 0] }} transition={{ duration: 4.8, repeat: Infinity }}><span className="float-icon gold"><Rocket/></span><span><b>Build together</b><small>Progress is shared</small></span></motion.div>
        <Sparkles className="hero-spark spark-a"/><Star className="hero-spark spark-b"/><Bolt className="hero-spark spark-c"/>
      </div>
    </div>
    <div className="section-heading"><div><Eyebrow icon={Users}>MEET YOUR CREW</Eyebrow><h2>Eight people. <em>One mission.</em></h2></div><button className="text-link" onClick={() => go('viewer')}>View member profiles <ArrowRight size={15}/></button></div>
    <div className="member-grid home-member-grid">{members.map(m => <MemberTile key={m.id} member={m} compact/>)}</div>
    <div className="values-grid">{[
      [Orbit,'01','Research','Understand the problem before building the answer.'],
      [Lightbulb,'02','Innovation','Turn curious questions into practical ideas.'],
      [HeartHandshake,'03','Teamwork','Different strengths move one shared goal forward.'],
      [Target,'04','Impact','Measure progress by what we make possible.']
    ].map(([Icon,n,title,desc]) => <motion.div className="value-card" key={n} whileHover={{ y: -4 }}><span className="value-number">{n}</span><Icon className="value-icon"/><b>{title}</b><p>{desc}</p></motion.div>)}</div>
  </motion.section>;

  const Viewer = () => <motion.section className="page subpage" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
    <button className="back-button" onClick={() => go('home')}><ArrowLeft size={15}/> Home</button>
    <div className="page-title"><Eyebrow icon={Users}>MEMBER SPACE</Eyebrow><h1>Find your <em>place.</em></h1><p>Select a name to explore their profile, strengths, and the team leaderboard.</p></div>
    <div className="member-grid viewer-grid">{members.map(m => <MemberTile key={m.id} member={m}/>)}</div>
    <div className="viewer-bottom"><ShieldCheck/><span><b>Viewer mode</b><small>Read-only access. Scores and progress can only be changed by an admin.</small></span></div>
  </motion.section>;

  const Profile = () => {
    const member = members.find(m => m.id === selected?.id) || selected;
    if (!member) return <Viewer/>;
    const score = average(member);
    return <motion.section className="page subpage profile-page" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      <button className="back-button" onClick={() => go('viewer')}><ArrowLeft size={15}/> All members</button>
      <div className="profile-layout">
        <motion.div className="profile-portrait" initial={{ scale: .94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: .5 }}><div className="portrait-glow"/><img src={img(member)} alt={member.name}/><span className="portrait-tag"><Sparkles size={13}/> TEAM PATENT MEMBER</span></motion.div>
        <div className="profile-content"><Eyebrow icon={Star}>MEMBER PROFILE</Eyebrow><h1>{member.name}</h1><span className="role-pill">{member.role}</span><p className="profile-about">{member.about}</p>
          <div className="profile-score-card"><div className="score-donut" style={{ '--score': `${score}%` }}><span>{score}<small>/100</small></span></div><div><b>Current team score</b><small>Latest admin assessment · equal-weight average</small><div className="mini-score-bars">{scoreFields.map(([key,label]) => <div key={key}><span>{label}</span><i><b style={{ width: `${member.scores?.[key] || 0}%` }}/></i></div>)}</div></div></div>
          <h3 className="subsection-title">STRENGTHS & CONTRIBUTIONS</h3><div className="strength-chips">{member.strengths.map(s => <span key={s}><Check size={12}/>{s}</span>)}</div>
          <blockquote>{member.quote}</blockquote>
          <div className="profile-actions"><Button onClick={() => go('leaderboard')}>View team leaderboard <Trophy size={16}/></Button><Button variant="secondary" onClick={() => go('viewer')}>Choose another member</Button></div>
        </div>
      </div>
    </motion.section>;
  };

  const Leaderboard = () => <motion.section className="page subpage leaderboard-page" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
    <button className="back-button" onClick={() => adminToken ? go('admin') : selected ? go('profile') : go('viewer')}><ArrowLeft size={15}/> {adminToken ? 'Back to admin' : selected ? 'My profile' : 'Members'}</button>
    <div className="page-title"><Eyebrow icon={Trophy}>TEAM PERFORMANCE</Eyebrow><h1>The <em>leaderboard.</em></h1><p>Scores update automatically after the admin saves new results.</p></div>
    <div className="leaderboard-intro"><div><span className="tiny-label">CURRENT STANDINGS</span><h2>Every strength <em>counts.</em></h2><p>Five equally weighted categories · live team progress.</p></div><Button onClick={runRace} disabled={race}><Sparkles size={16}/>{race ? 'Calculating results…' : 'Animate & check results'}</Button></div>
    <div className={`arena ${race ? 'arena-running' : ''}`}><div className="arena-top"><span><Orbit size={15}/> TEAM ARENA</span><span className="arena-ready"><i/>{race ? 'IN MOTION' : 'READY'}</span></div><div className="fighters">{sorted.map((m,i) => <motion.div key={m.id} className="fighter" animate={race ? { y: [0,-22,5,-13,0], rotate: [0,-4,4,-2,0], scale: [1,1.1,.98,1.04,1] } : { y: [0,-3,0] }} transition={race ? { duration: 1.2, delay: i*.11, repeat: 1 } : { duration: 4+i*.17, repeat: Infinity, ease: 'easeInOut' }}><span className="fighter-ring"><img src={img(m)} alt={m.name}/>{i===0 && <span className="fighter-crown"><Crown size={13}/></span>}</span><b>{m.name.split(' ')[0]}</b><small>{average(m)} pts</small></motion.div>)}</div><div className="arena-message">{race ? 'Champions, take your positions… revealing latest scores' : 'Eight teammates. One shared mission. Start the animation to reveal the standings.'}</div><div className="arena-light"/></div>
    <div className="leaderboard-list"><div className="leaderboard-list-head"><span>RANK / MEMBER</span><span>OVERALL SCORE</span><span>WORK LOG</span></div>
      {sorted.map((m,i) => <motion.div key={m.id} className={`leader-row ${i===0?'first-place':''}`} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: race ? i*.12 : i*.04 }}><div className="leader-rank">{i===0 ? <Crown size={20}/> : String(i+1).padStart(2,'0')}</div><div className="leader-member"><Avatar member={m}/><span><b>{m.name}</b><small>{m.role}</small></span></div><div className="leader-bar-cell"><div className="leader-bar"><motion.i initial={{ width: 0 }} animate={{ width: `${average(m)}%` }} transition={{ duration: 1.2, delay: .2+i*.08 }}/></div><small>{average(m)} / 100</small></div><div className="leader-work"><b><Clock3 size={14}/>{Number(m.workHours||0).toFixed(1)}h</b><small>{Number(m.completedTasks||0)} tasks</small></div></motion.div>)}
    </div>
    <div className="leaderboard-footnote"><ShieldCheck size={16}/><span>Score formula: average of work capability, logic, innovation, teamwork, and delivery. These scores are team progress indicators, not objective measures of a person’s worth.</span></div>
  </motion.section>;

  const Login = () => <motion.section className="page login-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
    <div className="login-layout"><div className="login-story"><motion.img src="/assets/logo.webp" alt="Team Patent logo" animate={{ y: [0,-7,0] }} transition={{ duration: 5, repeat: Infinity }}/><Eyebrow icon={ShieldCheck}>RESTRICTED AREA</Eyebrow><h1>Lead the work.<br/><em>Track the growth.</em></h1><p>Manage member scores, work hours, completed tasks, and feedback. Saved changes appear on the viewer leaderboard.</p><div className="secure-pill"><LockKeyhole size={15}/> ADMIN ACCESS ONLY</div></div>
      <form className="login-card" onSubmit={login}><button type="button" className="back-button" onClick={() => go('home')}><ArrowLeft size={14}/> Home</button><Eyebrow>WELCOME BACK</Eyebrow><h2>Admin <em>sign in.</em></h2><label htmlFor="loginName">Username</label><input id="loginName" value={loginName} onChange={e=>setLoginName(e.target.value)} autoComplete="username" placeholder="Enter admin username" required/><label htmlFor="loginPass">Password</label><div className="password-input"><input id="loginPass" type={showPassword?'text':'password'} value={loginPass} onChange={e=>setLoginPass(e.target.value)} autoComplete="current-password" placeholder="Enter password" required/><button type="button" onClick={()=>setShowPassword(!showPassword)} aria-label="Toggle password visibility">{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></div>{loginError && <div className="login-error">{loginError}</div>}<Button className="full-width" disabled={busy}>{busy?'Checking…':'Unlock admin portal'} <ArrowRight size={16}/></Button><small className="login-note">Admin credentials are configured in the Node.js server. Change them before public deployment.</small></form>
    </div>
  </motion.section>;

  const Admin = () => {
    const avgTeam = members.length ? (total(members.map(average))/members.length).toFixed(1) : '0.0';
    const hours = total(members.map(m=>Number(m.workHours||0))).toFixed(1);
    const tasks = total(members.map(m=>Number(m.completedTasks||0)));
    return <motion.section className="page admin-page" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      <div className="admin-heading"><div><Eyebrow icon={Gauge}>CONTROL ROOM</Eyebrow><h1>Team <em>dashboard.</em></h1><p>Score fairly, record progress, and keep the team moving.</p></div><div className="admin-heading-actions"><Button variant="secondary" onClick={() => { refresh(true); go('leaderboard'); }}><Trophy size={15}/> View leaderboard</Button><Button variant="secondary" onClick={logout}><LogOut size={15}/> Sign out</Button></div></div>
      <div className="admin-metrics">{[[Users,'TEAM MEMBERS','08','Active profiles'],[BarChart3,'TEAM AVERAGE',avgTeam,'Points out of 100'],[Clock3,'WORK HOURS',hours,'Combined recorded hours'],[CheckCircle2,'TASKS COMPLETED',tasks,'Combined member tasks']].map(([Icon,label,value,desc])=><motion.div className="admin-metric" key={label} whileHover={{ y:-3 }}><span><Icon size={17}/></span><small>{label}</small><b>{value}</b><p>{desc}</p></motion.div>)}</div>
      <div className="admin-workspace"><aside className="admin-member-panel"><div className="admin-list-title">MEMBERS <span>{String(members.length).padStart(2,'0')}</span></div>{members.map(m=><button key={m.id} className={`admin-member-option ${activeAdmin?.id===m.id?'selected':''}`} onClick={()=>chooseAdminMember(m)}><Avatar member={m} size="sm"/><span><b>{m.name}</b><small>{m.role}</small></span><strong>{average(m)}</strong></button>)}</aside>
      <div className="admin-editor">{!activeAdmin || !draft ? <div className="empty-editor"><Sparkles size={36}/><h2>Select a member</h2><p>Choose someone from the list to update points and progress.</p></div> : <><div className="editor-person"><Avatar member={activeAdmin} size="lg"/><div><h2>{activeAdmin.name}</h2><p>{activeAdmin.role}</p></div><span className="editor-average">{Math.round(scoreFields.reduce((s,[k])=>s+Number(draft.scores[k]||0),0)/5*10)/10}<small>AVG SCORE</small></span></div>
        <div className="editor-label"><span>PERFORMANCE SCORES</span><small>0–100 POINTS EACH</small></div><div className="score-input-grid">{scoreFields.map(([key,label,desc])=><label className="score-input" key={key}><span>{label}</span><input type="number" min="0" max="100" step="0.5" value={draft.scores[key] ?? 0} onChange={e=>setDraft(d=>({...d,scores:{...d.scores,[key]:e.target.value}}))}/><small>{desc}</small></label>)}</div>
        <div className="editor-label"><span>WORK PROGRESS</span></div><div className="work-input-grid"><label>Work hours logged<input type="number" min="0" step="0.5" value={draft.workHours} onChange={e=>setDraft(d=>({...d,workHours:e.target.value}))}/></label><label>Tasks completed<input type="number" min="0" step="1" value={draft.completedTasks} onChange={e=>setDraft(d=>({...d,completedTasks:e.target.value}))}/></label></div>
        <div className="editor-label"><span>ADMIN FEEDBACK / NOTES</span></div><textarea className="admin-notes" value={draft.notes} maxLength="2000" onChange={e=>setDraft(d=>({...d,notes:e.target.value}))} placeholder="Record progress, strengths, next steps…"/>
        <div className="editor-save-row"><span>{activeAdmin.updatedAt ? `Last saved · ${new Date(activeAdmin.updatedAt).toLocaleString()}` : 'Not updated yet'}</span><div className="editor-actions"><Button variant="secondary" onClick={resetSelected} disabled={busy}><RefreshCw size={15}/> Reset this member</Button><Button onClick={saveMember} disabled={busy}><CheckCircle2 size={16}/>{busy?'Saving…':'Save member update'}</Button></div></div>
      </>}</div></div>
      <div className="reset-panel"><div><b>Score management & safety</b><p>Select a member to load their profile and saved scores. Reset a single member or reset every member to zero; both actions require confirmation. Saving updates the live leaderboard.</p></div><div className="reset-actions"><Button variant="secondary" onClick={() => refresh(false)} disabled={busy}><RefreshCw size={15}/> Refresh live data</Button><Button variant="danger" onClick={resetAll} disabled={busy}><RefreshCw size={15}/>{busy?'Working…':'Reset ALL member data'}</Button></div></div>
    </motion.section>;
  };

  const pages = { home: Home, viewer: Viewer, profile: Profile, leaderboard: Leaderboard, login: Login, admin: Admin };
  const CurrentPage = pages[view] || Home;
  return <div className="app-shell">
    <div className="background-effects"><span className="bg-orb orb-left"/><span className="bg-orb orb-right"/><span className="bg-grid"/><span className="bg-sweep"/></div>
    <Header/>
    <main><AnimatePresence mode="wait">{view === 'home' ? Home() : view === 'viewer' ? Viewer() : view === 'profile' ? Profile() : view === 'leaderboard' ? Leaderboard() : view === 'login' ? Login() : Admin()}</AnimatePresence></main>
    <Footer/>
    <AnimatePresence>{intro && <motion.div className="intro-screen" initial={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: .65 } }}><div className="intro-emblem"><img src="/assets/logo.webp" alt="Team Patent"/></div><div className="intro-title"><motion.span initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay:.25 }}>TEAM</motion.span><motion.i initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay:.7 }}>✦</motion.i><motion.span className="gold-text" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay:.45 }}>PATENT</motion.span></div><motion.p initial={{ opacity:0 }} animate={{opacity:1}} transition={{delay:.8}}>IDEA · INNOVATION · RESEARCH · IMPACT</motion.p><div className="intro-progress"><motion.i initial={{ width:0 }} animate={{ width:'100%' }} transition={{duration:1.65,delay:.25,ease:'easeInOut'}}/></div><div className="intro-orbit intro-orbit-a"/><div className="intro-orbit intro-orbit-b"/></motion.div>}</AnimatePresence>
    <AnimatePresence>{toast && <motion.div className="toast" initial={{ opacity:0, y:15 }} animate={{opacity:1,y:0}} exit={{opacity:0,y:10}}><CheckCircle2 size={16}/>{toast}</motion.div>}</AnimatePresence>
  </div>;
}
createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);
