import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ClerkProvider, useAuth, useClerk, UserButton } from '@clerk/react';
import './styles.css';

const appPath = (path) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;
const assetPath = appPath;
const scanModes = ['number', 'message', 'url', 'email', 'domain', 'ip'];
const scanReturn = mode => new URL(`${appPath('/')}?scan=${scanModes.includes(mode) ? mode : 'number'}#top`, window.location.origin).href;
const initialMode = () => { const mode = new URLSearchParams(window.location.search).get('scan'); return scanModes.includes(mode) ? mode : 'number'; };
const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || 'pk_live_Y2xlcmsuY3liZXJzY2FuLmNvLnphJA';

const featureLinks = [
  { label: 'Caller ID', path: '/features/caller-id' },
  { label: 'Spam Blocker', path: '/features/spam-blocker' },
  { label: 'Reverse Phone Lookup', path: '/features/reverse-phone-lookup' },
  { label: 'Spam Text Blocker', path: '/features/spam-text-blocker' },
  { label: 'Contact Management', path: '/features/contact-management' },
];

const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_qc62yz9';
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'template_w0lb62h';
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'QqoI47lF6xh2ECf19';
const openContactModal = (kind = 'contact') => window.dispatchEvent(new CustomEvent('cyberscan:contact', { detail: kind }));

function ContactModal({ kind, onClose }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [reference, setReference] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const isReport = kind === 'report';
  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape' && status !== 'sending') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose, status]);
  async function submit(event) {
    event.preventDefault();
    if (status === 'sending') return;
    if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
      setError('Email service is not configured yet. Please contact the CyberScan team directly.');
      setStatus('error');
      return;
    }
    setStatus('sending'); setError('');
    const composed = isReport ? `Scam / fraud report\\nSuspicious number or link: ${reference || 'Not provided'}\\n\\n${message}` : message;
    try {
      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: EMAILJS_SERVICE_ID,
          template_id: EMAILJS_TEMPLATE_ID,
          user_id: EMAILJS_PUBLIC_KEY,
          template_params: {
            name: name.trim(),
            email: email.trim(),
            reply_to: email.trim(),
            time: new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg', dateStyle: 'medium', timeStyle: 'short' }) + ' SAST',
            message: composed,
            subject: isReport ? 'CyberScan scam / fraud report' : 'CyberScan contact enquiry',
          },
        }),
      });
      if (!response.ok) {
        const details = (await response.text()).slice(0, 350);
        throw new Error(`EmailJS error ${response.status}: ${details || response.statusText || 'Request rejected'}`);
      }
      setStatus('sent');
    } catch (err) {
      setError(err instanceof TypeError
        ? 'Could not reach EmailJS. Check your connection, browser extensions, and the allowed website origins in EmailJS.'
        : (err.message || 'Email delivery failed. Please contact the team directly.'));
      setStatus('error');
    }
  }
  return <div className="contact-modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && status !== 'sending') onClose(); }}>
    <section className="contact-modal" role="dialog" aria-modal="true" aria-labelledby="contact-modal-title">
      <button type="button" className="contact-modal-close" aria-label="Close contact form" onClick={onClose} disabled={status === 'sending'}>×</button>
      <div className="section-label">{isReport ? 'REPORT A SCAM' : 'CONTACT CYBERSCAN'}</div>
      <h2 id="contact-modal-title">{isReport ? 'Report suspicious activity.' : 'Contact our team.'}</h2>
      <p>{isReport ? 'Share details for review. Reports do not automatically label any person or number fraudulent.' : 'Send a message to the CyberScan team and we will respond as soon as possible.'}</p>
      {status === 'sent' ? <div className="contact-modal-success" role="status">Your message has been sent successfully. Thank you for contacting CyberScan.<button type="button" onClick={onClose}>Close</button></div> :
        <form onSubmit={submit} className="contact-modal-form">
          <label>Your name<input autoFocus required maxLength={100} value={name} onChange={e => setName(e.target.value)} placeholder="Full name" /></label>
          <label>Email address<input required type="email" maxLength={180} value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></label>
          {isReport && <label>Suspicious number or link (optional)<input maxLength={300} value={reference} onChange={e => setReference(e.target.value)} placeholder="Number, URL or identifier" /></label>}
          <label>{isReport ? 'What happened?' : 'Your message'}<textarea required maxLength={4000} rows={5} value={message} onChange={e => setMessage(e.target.value)} placeholder={isReport ? 'Describe the suspected scam without including passwords, PINs or sensitive information.' : 'How can we help?'} /></label>
          <p className="contact-modal-privacy">Do not include passwords, PINs or confidential information. Your details will be sent to CyberScan through EmailJS for responding to your enquiry.</p>
          {status === 'error' && <div className="contact-modal-error" role="alert">{error}</div>}
          <button className="blue-button" type="submit" disabled={status === 'sending'}>{status === 'sending' ? 'Sending…' : isReport ? 'Send scam report' : 'Send message'} <span aria-hidden="true">→</span></button>
        </form>}
    </section>
  </div>;
}

function Logo() {
  return <a className="logo" href={appPath('/')} aria-label="Cyberscan home"><img className="logo-image" src={assetPath('/images/Cyberscan_logo.png')} alt="Cyberscan" /></a>;
}

function Chevron() {
  return <svg viewBox="0 0 12 7" aria-hidden="true"><path d="m1 1 5 5 5-5" /></svg>;
}

function Header({ plain = false }) {
  const [open, setOpen] = useState(false);
  const { isLoaded, isSignedIn } = useAuth();
  const clerk = useClerk();
  return <header className={`site-header${plain ? ' plain-header' : ''}`}>
    <div className="nav-wrap">
      <Logo />
      <nav className={open ? 'main-nav open' : 'main-nav'}>
        <a href={appPath('/')}>Home</a>
        
        
        <a href={`${appPath("/")}#apps`}>Features</a>
        <a href={`${appPath("/")}#top`}>Spam Detector</a>
        <button className="nav-modal-trigger" type="button" onClick={() => openContactModal('report')}>Report Scam/Fraud</button>
        <a href={appPath('/support')}>Support</a>
      </nav>
      <div className="nav-actions">{isLoaded && (isSignedIn ? <UserButton /> : <button className="sign-in" type="button" onClick={() => clerk.redirectToSignIn({ redirectUrl: scanReturn('number') })}>Sign in</button>)}<button className="language" type="button">EN <Chevron /></button><button className="menu-button" type="button" aria-label="Open menu" onClick={() => setOpen(!open)}><span /><span /></button></div>
    </div>
  </header>;
}

function SearchPanel({ mode, setMode }) {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const clerk = useClerk();
  const requireAccount = nextMode => {
    if (!isLoaded) return false;
    if (isSignedIn) return true;
    void clerk.redirectToSignUp({ redirectUrl: scanReturn(nextMode) });
    return false;
  };
  const scanTypes = [
    { id: 'number', label: 'Search a number', placeholder: 'Search any phone or WhatsApp number', description: 'Check a suspicious phone or WhatsApp number. Live reputation checks are coming soon.' },
    { id: 'message', label: 'Scan a message', placeholder: 'Paste a suspicious WhatsApp, SMS or email message', description: 'Review suspicious WhatsApp, SMS or email text. Remove passwords, PINs and personal information first.' },
    { id: 'url', label: 'URL / Link', placeholder: 'https://example.co.za', description: 'Check a suspicious website or shortened link. URL checks require the scanner API; threat reputation requires an active intelligence provider.' },
    { id: 'email', label: 'Email address', placeholder: 'name@example.co.za', description: 'Check an email address for potential risk indicators. Live reputation and exposure lookups are coming soon.' },
    { id: 'domain', label: 'Domain', placeholder: 'example.co.za', description: 'Explore domain exposure, DNS, certificate and email security checks as they become available.' },
    { id: 'ip', label: 'IP address', placeholder: '196.1.1.1', description: 'IP reputation and observable exposure checks are planned. No live lookup is currently connected.' },
  ];
  const [values, setValues] = useState({});
  const requestRef = useRef(null);
  const tabsRef = useRef([]);
  useEffect(() => () => {
    requestRef.current?.abort();
    requestRef.current = null;
  }, []);
  const [submitted, setSubmitted] = useState(false);
  const [scanState, setScanState] = useState({ status: 'idle', data: null, error: '' });
  const selected = scanTypes.find((type) => type.id === mode);
  const value = values[mode] || '';
  const resetScan = () => {
    requestRef.current?.abort();
    requestRef.current = null;
    setSubmitted(false);
    setScanState({ status: 'idle', data: null, error: '' });
  };
  const update = (next) => {
    resetScan();
    setValues((previous) => ({ ...previous, [mode]: next }));
  };
  const selectMode = (nextMode) => {
    if (!requireAccount(nextMode)) return;
    if (nextMode !== mode) { resetScan(); setMode(nextMode); }
  };
  const handleTabKey = (event, index) => {
    let next;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % scanTypes.length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + scanTypes.length) % scanTypes.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = scanTypes.length - 1;
    else return;
    event.preventDefault();
    selectMode(scanTypes[next].id);
    tabsRef.current[next]?.focus();
  };
  const scan = async () => {
    if (!requireAccount(mode) || requestRef.current) return;
    setSubmitted(true);
    if (mode !== 'url') return;
    const endpoint = (import.meta.env.VITE_CYBERSCAN_API_URL || '').replace(/\/$/, '');
    if (!value.trim() || !endpoint) { setScanState({ status: 'error', data: null, error: !value.trim() ? 'Enter a URL to check.' : 'The URL scanning service has not been deployed yet.' }); return; }
    setScanState({ status: 'loading', data: null, error: '' });
    const controller = new AbortController();
    requestRef.current = controller;
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const token = await getToken();
      if (!token || controller.signal.aborted) throw new Error('An active session is required.');
      const response = await fetch(endpoint + '/v1/scans', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ type: 'url', value: value.trim() }), signal: controller.signal });
      const data = await response.json();
      if (requestRef.current !== controller) return;
      if (!response.ok) throw new Error(data?.error?.message || 'The scanner could not complete this request.');
      if (!data || typeof data !== 'object' || !['malicious', 'suspicious', 'no_known_indicators', 'unknown'].includes(data.verdict)
        || (data.findings != null && (!Array.isArray(data.findings) || data.findings.some(item => !item || typeof item.title !== 'string' || typeof item.description !== 'string')))
        || (data.coverage?.limitations != null && (!Array.isArray(data.coverage.limitations) || data.coverage.limitations.some(item => typeof item !== 'string')))
        || (data.recommendations != null && (!Array.isArray(data.recommendations) || data.recommendations.some(item => typeof item !== 'string')))) {
        throw new Error('The scanner returned an unsupported result.');
      }
      setScanState({ status: 'done', data, error: '' });
    } catch (error) {
      if (requestRef.current === controller) setScanState({ status: 'error', data: null, error: error.name === 'AbortError' ? 'The scan timed out. Please try again.' : (error.message || 'Scanner unavailable.') });
    } finally {
      clearTimeout(timer);
      if (requestRef.current === controller) requestRef.current = null;
    }
  };
  const result = !value.trim() ? 'Enter a value to check.' : 'This scan is not yet connected to live threat intelligence. CyberScan has not verified this input or established that it is safe or malicious.';
  return <div className="search-panel cyberscan-search" aria-label="CyberScan security scanner">
    <div className="tabs" role="tablist" aria-label="CyberScan scan categories">
      {scanTypes.map((type, index) => <button type="button" key={type.id} id={`scanner-tab-${type.id}`} ref={node => { tabsRef.current[index] = node; }} role="tab" aria-controls="scanner-panel" aria-selected={mode === type.id} tabIndex={mode === type.id ? 0 : -1} className={mode === type.id ? 'active' : ''} onKeyDown={event => handleTabKey(event, index)} onClick={() => selectMode(type.id)}>{type.label}</button>)}
    </div>
    <div className="panel-content" id="scanner-panel" role="tabpanel" aria-labelledby={`scanner-tab-${mode}`}>
      <form className="scanner-form" onSubmit={event => { event.preventDefault(); void scan(); }} noValidate>
      {mode === 'message' ? <>
        <textarea value={value} maxLength={5000} onChange={(event) => update(event.target.value)} placeholder={selected.placeholder} aria-label="Message to scan" aria-describedby="scanner-description scanner-privacy" />
        <div className="scan-actions">
          <button className="outline-button" type="button" onClick={async () => { try { update((await navigator.clipboard.readText()).slice(0, 5000)); } catch { setSubmitted(false); } }}>Paste</button>
          <button className="outline-button" type="button" disabled title="Screenshot scanning is coming soon">Screenshot (soon)</button>
          <button className="primary-button" type="submit">Check for scam <span aria-hidden="true">→</span></button>
        </div>
      </> : <div className="phone-field scanner-input-wrap">
        <span className="country-code scanner-prefix" aria-hidden="true">{mode === 'number' ? '+27' : <svg viewBox="0 0 24 24" className="scanner-prefix-icon">{mode === 'email' ? <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></> : mode === 'ip' ? <><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8m-4-4v4" /></> : <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c5 5 5 13 0 18m0-18c-5 5-5 13 0 18" /></>}</svg>}</span>
        <input value={value} onChange={(event) => update(event.target.value)} placeholder={selected.placeholder} aria-label={mode === 'number' ? 'South African phone or WhatsApp number (+27)' : selected.label} aria-describedby="scanner-description scanner-privacy" type={mode === 'email' ? 'email' : 'text'} inputMode={mode === 'number' ? 'tel' : mode === 'url' || mode === 'domain' ? 'url' : mode === 'email' ? 'email' : 'text'} autoComplete="off" autoCapitalize="none" spellCheck={false} />
        <button type="submit" className="search-button" aria-label={`Check ${selected.label}`} aria-busy={scanState.status === 'loading'} disabled={scanState.status === 'loading'}><svg viewBox="0 0 42 36" aria-hidden="true"><circle cx="15" cy="19" r="10" /><path d="m22.5 26.5 8 8" /><path className="scan-sparkle" d="M31 1c1.3 7 4.5 10.2 11 11-6.5.8-9.7 4-11 11-1.3-7-4.5-10.2-11-11 6.5-.8 9.7-4 11-11Z" /></svg></button>
      </div>}
      </form>
      <p className="panel-lede" id="scanner-description">{selected.description}</p>
      <small className="scanner-privacy-note" id="scanner-privacy">Privacy first · Do not enter confidential information.</small>
      {mode === 'url' ? <div aria-live="polite">
        {scanState.status === 'loading' && <div className="result-message" role="status">Checking URL…</div>}
        {scanState.status === 'error' && <div className="result-message" role="alert">{scanState.error}</div>}
        {scanState.status === 'done' && <div className="url-scan-result" role="status">
          <strong>{({malicious:'Threat match detected',suspicious:'Security concern detected',no_known_indicators:'No known threat indicators from completed checks',unknown:'Insufficient evidence'})[scanState.data.verdict] || 'Result unavailable'}</strong>
          <p>{scanState.data.summary?.hostname} · {scanState.data.coverage?.providers_succeeded || 0} reputation source(s) completed</p>
          {scanState.data.findings?.map(item => <p key={item.id}><b>{item.title}:</b> {item.description}</p>)}
          {scanState.data.coverage?.limitations?.map((item,i) => <p key={i}>Limit: {item}</p>)}
          {scanState.data.recommendations?.map((item,i) => <p key={i}>{item}</p>)}
          <small>Checked {new Date(scanState.data.checked_at).toLocaleString('en-ZA')}. A clean lookup does not guarantee safety.</small>
        </div>}
      </div> : submitted && <div className="result-message" role="status">{result}</div>}
    </div>
  </div>;
}

function HeroMedia({ mode }) {
  const previews = {
    number: { eyebrow: 'PHONE & WHATSAPP', icon: '☎', heading: 'Unknown number', detail: '+27 82 ••• ••••', state: 'Reputation lookup preview', lines: ['Number identification', 'Community reports', 'Risk context'] },
    message: { eyebrow: 'MESSAGE SCAN', icon: '▤', heading: 'Suspicious message', detail: 'Please verify your account now…', state: 'Message analysis preview', lines: ['Urgency signals', 'Impersonation patterns', 'Suspicious requests'] },
    url: { eyebrow: 'URL & LINK', icon: '↗', heading: 'Check this link', detail: 'https://example.co.za', state: 'URL security preview', lines: ['Phishing indicators', 'Redirect analysis', 'Threat intelligence'] },
    email: { eyebrow: 'EMAIL ADDRESS', icon: '✉', heading: 'Email reputation', detail: 'contact@example.co.za', state: 'Email security preview', lines: ['Sender reputation', 'Impersonation signals', 'Exposure intelligence'] },
    domain: { eyebrow: 'DOMAIN SCAN', icon: '◎', heading: 'Domain security', detail: 'example.co.za', state: 'Domain assessment preview', lines: ['DNS configuration', 'Certificate checks', 'Email authentication'] },
    ip: { eyebrow: 'IP ADDRESS', icon: '⌘', heading: 'IP intelligence', detail: '196.1.1.1', state: 'IP assessment preview', lines: ['Reputation signals', 'Network context', 'Exposure indicators'] },
  };
  const data = previews[mode] || previews.number;
  return <div className="hero-media" aria-live="polite" aria-label={`${data.eyebrow} illustration placeholder`}>
    <div className="art-glow" />
    <div className="hero-phone" key={mode}>
      <div className="phone-notch" />
      <div className="phone-screen">
        <div className="phone-topline"><span>9:41</span><span>●●● ▰</span></div>
        <div className="phone-brand"><span className="phone-brand-icon">◇</span> CyberScan <span className="phone-brand-label">PREVIEW</span></div>
        <div className="phone-preview-tag">{data.eyebrow}</div>
        <div className="phone-preview-icon">{data.icon}</div>
        <h3>{data.heading}</h3>
        <p className="phone-preview-detail">{data.detail}</p>
        <div className="phone-preview-status"><span>◌</span>{data.state}</div>
        <div className="phone-preview-list">{data.lines.map((line) => <div key={line}><span>✓</span>{line}<b>›</b></div>)}</div>
        <div className="phone-preview-foot">Illustration only · Not a live scan</div>
      </div>
    </div>
  </div>;
}

function Hero() {
  const [heroMode, setHeroMode] = useState(initialMode);
  const { userId } = useAuth();
  return <main id="home">
    <section className="hero" id="top">
      <div className="hero-inner">
        <div className="hero-copy"><h1>Know the risk.<br /><em>Stay protected.</em></h1><p className="hero-subtitle">Check WhatsApp scams, suspicious messages, phone numbers, URLs, email addresses, domains and IP addresses—all in one place.</p><SearchPanel key={userId || 'guest'} mode={heroMode} setMode={setHeroMode} /></div>
        <div className="hero-art"><HeroMedia mode={heroMode} /></div>
      </div>
      <div className="hero-wave" />
    </section>
    <FeatureStory />
    <section className="feature-list" id="apps"><div className="feature-list-intro"><div className="feature-list-intro-copy"><div className="section-label">CYBERSCAN PROTECTION</div><h2>Everything you need to<br /><span>stay protected.</span></h2><p>From suspicious WhatsApp messages to risky links and digital identities, CyberScan brings essential security checks together in one place. Live threat-intelligence integrations are being developed.</p><a className="feature-explore-link" href="#top">Explore security checks <span aria-hidden="true">→</span></a></div><div className="feature-list-media"><div className="feature-list-media-orbit" /><img src={assetPath('/images/scan-iphone.webp')} alt="Illustrative CyberScan phone screen showing a suspicious message review" loading="lazy" /></div></div><div className="feature-list-grid"><FeatureItem icon="phone" title="WhatsApp scam number checks" /><FeatureItem icon="message" title="Suspicious message analysis" /><FeatureItem icon="shield" title="Spam and scam risk indicators" /><FeatureItem icon="link" title="URL and domain checks" /><FeatureItem icon="mail" title="Email and IP checks" /><FeatureItem icon="lock" title="Privacy-first guidance" /><FeatureItem icon="building" title="SME resilience assessments" /><FeatureItem icon="users" title="Community reports with review" /><FeatureItem icon="bot" title="WhatsApp scanning bot" /></div></section>
  </main>;
}

function MessageCard({ label, number, copy, tone }) {
  return <article className="message-card"><div className="message-heading"><span>{label}</span><small>{number}</small></div><div className={`message-alert ${tone}`}><b>{tone === 'orange' ? '⚠' : '🚨'} Suspicious {label.toLowerCase()} scam</b><p>{copy}</p><small>Likely scam · Review carefully</small></div></article>;
}

function FeatureStory() {
  return <section className="feature-story"><div className="story-art"><div className="story-orbit" /><img src={assetPath('/images/scan-iphone.webp')} alt="Illustration of a suspicious message being reviewed on a smartphone" /></div><div className="story-copy"><div className="section-label">CYBERSCAN DIGITAL THREAT INTELLIGENCE</div><h2>Know what’s suspicious,<br /><span>before you trust it.</span></h2><p>CyberScan is building a unified security-checking platform for individuals and South African businesses. Review suspicious WhatsApp and SMS messages, investigate unknown phone numbers and explore risk indicators for links, email addresses, domains and IP addresses—all from one place. Live intelligence integrations are in development.</p><div className="story-points"><div><span className="point-icon">⌕</span><strong>Check phone numbers and WhatsApp scam indicators</strong></div><div><span className="point-icon">⊘</span><strong>Spot suspicious messages and phishing links</strong></div><div><span className="point-icon">↻</span><strong>Explore email, domain and IP security checks</strong></div></div><button className="blue-button" type="button" onClick={() => document.getElementById('top')?.scrollIntoView({ behavior: 'smooth' })}>Explore CyberScan checks <span>→</span></button></div></section>;
}

const featureIconPaths = {
  phone: <><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M11 18h2" /><path d="m18 7 2 2 3-3" /></>,
  message: <><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 21l1.9-5.5a9 9 0 0 1-.9-4A8.5 8.5 0 0 1 12.5 3 8.5 8.5 0 0 1 21 11.5Z" /><path d="M8 11h9M8 14h6" /></>,
  shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="M12 7v6M12 17h.01" /></>,
  link: <><path d="M10 13a5 5 0 0 0 7 .5l3-3a5 5 0 0 0-7-7l-1.7 1.7" /><path d="M14 11a5 5 0 0 0-7-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" /></>,
  mail: <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="m3 7 9 7 9-7" /></>,
  lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></>,
  building: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1M10 21v-3h4v3" /></>,
  users: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5v1" /></>,
  bot: <><rect x="4" y="7" width="16" height="14" rx="3" /><path d="M12 3v4M9 3h6M8 13h.01M16 13h.01M9 17h6" /></>,
};
function FeatureIcon({ name }) {
  return <svg className="feature-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{featureIconPaths[name]}</svg>;
}

function FeatureItem({ icon, title }) {
  return <div className="feature-item"><span className="feature-icon-wrap"><FeatureIcon name={icon} /></span><p>{title}</p></div>;
}

function Footer() {
  return <footer className="footer"><div className="footer-top"><Logo /><p>Identify unknown callers.<br />Stay protected from spam.</p></div><div className="footer-links"><div><h4>Explore</h4><a href={appPath('/')}>Home</a><a href={appPath('/features/caller-id')}>Learn More</a><a href={appPath('/support')}>Support</a><a href={`${appPath("/")}#top`}>Spam Detector</a></div><div><h4>Company</h4><a href={appPath('/support')}>About Us</a><button className="footer-contact-trigger" type="button" onClick={() => openContactModal('contact')}>Contact Us</button></div><div><h4>Follow Us</h4><div className="socials"><a href={appPath('/support')}>in</a><a href={appPath('/support')}>f</a><a href={appPath('/support')}>𝕏</a></div></div></div><div className="footer-bottom"><span>© 2026 CyberScan. All rights reserved.</span><div><a href={appPath('/support')}>Terms of Use</a><a href={appPath('/support')}>Privacy Policy</a><a href={appPath('/support')}>Cookies Policy</a><a href={appPath('/support')}>Accessibility</a></div></div></footer>;
}

const productPages = {
  '/features/caller-id': { label: 'CALLER ID', title: <>Know who’s calling<br /><span>before you answer.</span></>, body: 'Identify unknown callers instantly with names, photos, locations, and social profiles. Cyberscan gives you the context you need to pick up with confidence.', image: '/images/incoming-call.webp', button: 'Explore security checks' },
  '/features/spam-blocker': { label: 'SPAM BLOCKER', title: <>Silence spam.<br /><span>Keep your day.</span></>, body: 'Protect yourself from fraud, robocalls, and telemarketers with intelligent spam detection that works quietly in the background.', image: '/images/blocked.webp', button: 'Get protected' },
  '/features/reverse-phone-lookup': { label: 'REVERSE PHONE LOOKUP', title: <>The name behind<br /><span>any number.</span></>, body: 'Search any phone number worldwide and discover useful caller details in seconds, wherever you are.', image: '/images/search.webp', button: 'Search a number' },
  '/features/spam-text-blocker': { label: 'SPAM TEXT BLOCKER', title: <>Read messages<br /><span>with confidence.</span></>, body: 'Detect suspicious links, urgent requests, and impersonation attempts before a scam text catches you off guard.', image: '/images/scan-iphone.webp', button: 'Scan a message' },
  '/features/contact-management': { label: 'CONTACT MANAGEMENT', title: <>Your contacts,<br /><span>always up to date.</span></>, body: 'Keep your phonebook current with verified names, profile photos, and updates managed directly in your address book.', image: '/images/contact-management.webp', button: 'Manage your contacts' },
};

function SubpageHero({ label, title, body, image, button }) {
  return <section className="subpage-hero"><div className="subpage-copy"><div className="section-label">{label}</div><h1>{title}</h1><p>{body}</p><button className="blue-button" type="button">{button} <span>→</span></button></div><div className="subpage-art"><div className="subpage-art-circle" /><img src={assetPath(image)} alt="Cyberscan product preview" /></div></section>;
}

function ProductPage({ data }) {
  return <><Header plain /><main className="subpage-main"><SubpageHero {...data} /><section className="detail-strip"><div><span className="detail-number">01</span><h2>Built for real life.</h2><p>Cyberscan works in the moments you need it most, turning unknown calls and suspicious messages into clear next steps.</p></div><div className="detail-points"><FeatureItem icon="✓" title="Fast, accurate results" /><FeatureItem icon="◉" title="South African digital safety" /><FeatureItem icon="⊙" title="Privacy-first protection" /></div></section><section className="quote-section"><div className="section-label">ONE APP. MORE CLARITY.</div><h2>Feel more confident<br /><span>every time your phone rings.</span></h2><button className="blue-button" type="button">{data.button} <span>→</span></button></section></main><Footer /></>;
}

function DownloadPage({ platform }) {
  const isAndroid = platform === 'Android';
  return <><Header plain /><main className="subpage-main"><section className="download-hero"><div className="subpage-copy"><div className="section-label">CYBERSCAN FOR {platform.toUpperCase()}</div><h1>Meet the smarter<br /><span>way to connect.</span></h1><p>Get caller ID, spam blocking, and contact management in one beautiful app made for your phone.</p><button className="blue-button" type="button">Download for {platform} <span>→</span></button><small>Free to download · Premium features available</small></div><div className="download-art"><img src={assetPath(isAndroid ? '/images/home-hero-poster.webp' : '/images/livecaller-screen.webp')} alt={`${platform} Cyberscan app`} /></div></section><section className="download-features"><div className="section-label">WHY CYBERSCAN</div><h2>Everything your<br /><span>phone should know.</span></h2><div className="protection-grid"><div className="protection-card"><span className="card-icon shield">✓</span><h3>Caller ID</h3><p>See who is calling before you answer.</p></div><div className="protection-card"><span className="card-icon spark">✦</span><h3>Smart protection</h3><p>Block spam and spot scam messages fast.</p></div><div className="protection-card"><span className="card-icon block">⊘</span><h3>Contact management</h3><p>Keep your address book fresh and useful.</p></div></div></section></main><Footer /></>;
}

function SpamDetectorPage() {
  const [message, setMessage] = useState('');
  const [checked, setChecked] = useState(false);
  return <><Header plain /><main className="subpage-main"><section className="tool-page"><div className="section-label">SPAM DETECTOR</div><h1>Check a message<br /><span>before you trust it.</span></h1><p>Paste a suspicious text below and our AI-powered scanner will help you spot red flags.</p><div className="detector-box"><textarea value={message} onChange={(event) => { setMessage(event.target.value); setChecked(false); }} placeholder="Paste your message here..." /><div className="detector-footer"><span>{message.length}/2,000 characters</span><button className="blue-button" type="button" onClick={() => setChecked(true)}>Check for scam <span>→</span></button></div>{checked && <div className={`detector-result ${message ? 'visible' : ''}`}>{message ? 'No data is shared. Review links and requests carefully before taking action.' : 'Paste a message first to get a result.'}</div>}</div></section><section className="trust-band"><strong>Early access</strong><span>Live threat intelligence and bot integration are in development</span></section></main><Footer /></>;
}

function ReportPage() {
  useEffect(() => { openContactModal('report'); }, []);
  return <><Header plain /><main className="subpage-main"><section className="form-page"><div className="section-label">REPORT SPAM / FRAUD</div><h1>Help keep the<br /><span>community safe.</span></h1><p>Use the report form to share a suspected scam for review. Reports are not automatically verified.</p><button type="button" className="blue-button" onClick={() => openContactModal('report')}>Open report form <span>→</span></button></section></main><Footer /></>;
}

function SupportPage() {
  return <><Header plain /><main className="about-page">
    <section className="about-hero"><div className="about-hero-inner"><div className="about-hero-copy"><div className="about-eyebrow">ABOUT CYBERSCAN</div><h1>Building trust in a<br /><em>connected world.</em></h1><p>CyberScan is a South African digital safety and cyber-risk intelligence initiative focused on helping individuals, small businesses and communities recognise suspicious activity and make more informed security decisions.</p><a className="about-hero-link" href={`${appPath('/')}#top`}>Explore CyberScan <span aria-hidden="true">→</span></a></div><div className="about-hero-media"><img src={assetPath('/images/scan-iphone.webp')} alt="CyberScan smartphone security illustration" loading="lazy" /></div></div></section>
    <section className="about-story"><div className="about-story-media"><img src={assetPath('/images/home-hero-poster.webp')} alt="CyberScan digital security illustration" loading="lazy" /></div><div className="about-story-copy"><div className="section-label">WHO WE ARE</div><h2>Security awareness.<br /><span>Practical digital protection.</span></h2><p>CyberScan is being developed as a unified place to explore digital risk indicators across WhatsApp and SMS messages, unfamiliar phone numbers, suspicious links, email addresses, domains and IP addresses.</p><p>Our focus is particularly relevant to South African SMMEs and underserved communities, where accessible digital safety guidance can support confidence, resilience and responsible technology adoption.</p><p>CyberScan is an emerging platform. Live reputation lookups and threat-intelligence integrations are still in development; current previews do not constitute verified security assessments.</p></div></section>
    <section className="about-mission"><div className="section-label">OUR PURPOSE</div><h2>Making digital safety<br /><span>more accessible.</span></h2><div className="about-mission-grid"><article><span className="about-mission-number">01</span><h3>Awareness</h3><p>Help people recognise phishing, impersonation, suspicious messages and other common online threats.</p></article><article><span className="about-mission-number">02</span><h3>Intelligence</h3><p>Bring relevant checks for numbers, links, email, domains and IP addresses into one accessible experience as integrations mature.</p></article><article><span className="about-mission-number">03</span><h3>Inclusion</h3><p>Design for South African individuals, SMMEs and communities that benefit from practical, understandable cybersecurity guidance.</p></article></div></section>
    <section className="about-vision"><div><div className="section-label">OUR DIRECTION</div><h2>From uncertainty<br /><span>to informed action.</span></h2><p>Our vision is a more cyber-aware digital ecosystem where people and enterprises can assess potential risks before trusting a message, link or unfamiliar digital contact.</p><a className="blue-button inline-button" href={`${appPath('/')}#apps`}>Explore our focus areas <span>→</span></a></div><div className="about-vision-media"><img src={assetPath('/images/incoming-call.webp')} alt="Phone-based digital safety illustration" loading="lazy" /></div></section>
    <section className="about-contact"><div><div className="section-label">GET IN TOUCH</div><h2>Connect with CyberScan.</h2><p>Interested in digital safety, community awareness or opportunities to collaborate? Contact the CyberScan team.</p></div><button className="about-contact-link" type="button" onClick={() => openContactModal('contact')}>Contact our team <span aria-hidden="true">→</span></button></section>
  </main><Footer /></>;
}

function SigninPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const clerk = useClerk();
  return <><Header plain /><main className="subpage-main signin-page"><section className="signin-card"><Logo /><h1>Welcome to CyberScan.</h1>{isLoaded && (isSignedIn ? <a href={scanReturn('number')}>Continue to scanner</a> : <><button className="blue-button" type="button" onClick={() => clerk.redirectToSignIn({ redirectUrl: scanReturn('number') })}>Sign in</button><button className="blue-button" type="button" onClick={() => clerk.redirectToSignUp({ redirectUrl: scanReturn('number') })}>Create account</button></>)}</section></main></>;
}

function RoutePage() {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
  const path = (window.location.pathname.startsWith(basePath) ? window.location.pathname.slice(basePath.length) : window.location.pathname).replace(/\/$/, '') || '/';
  if (path === '/') return <><Header /><Hero /><Footer /></>;
  if (path === '/android-app') return <DownloadPage platform="Android" />;
  if (path === '/iphone-app') return <DownloadPage platform="iPhone" />;
  if (path === '/spam-detector') return <SpamDetectorPage />;
  if (path === '/report-spam') return <ReportPage />;
  if (path === '/support') return <SupportPage />;
  if (path === '/signin') return <SigninPage />;
  return <ProductPage data={productPages[path] || productPages['/features/caller-id']} />;
}

function App() {
  const [modalKind, setModalKind] = useState(null);
  useEffect(() => {
    const listener = event => setModalKind(event.detail === 'report' ? 'report' : 'contact');
    window.addEventListener('cyberscan:contact', listener);
    return () => window.removeEventListener('cyberscan:contact', listener);
  }, []);
  return <><RoutePage />{modalKind && <ContactModal key={modalKind} kind={modalKind} onClose={() => setModalKind(null)} />}</>;
}

createRoot(document.getElementById('root')).render(<ClerkProvider publishableKey={clerkKey} afterSignOutUrl={appPath('/')}><App /></ClerkProvider>);