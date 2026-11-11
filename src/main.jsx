import { useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const base = import.meta.env.BASE_URL;
const route = (p) => base + p.replace(/^\//, '');
const modes = [
  { id: 'message', label: 'Message', icon: '▤', placeholder: 'Paste a suspicious WhatsApp message, SMS, or email…' },
  { id: 'number', label: 'Phone / WhatsApp', icon: '◉', placeholder: '+27 82 123 4567' },
  { id: 'url', label: 'Website link', icon: '↗', placeholder: 'https://example.co.za' },
  { id: 'email', label: 'Email', icon: '✉', placeholder: 'name@example.co.za' },
  { id: 'domain', label: 'Domain', icon: '◎', placeholder: 'example.co.za' },
  { id: 'ip', label: 'IP address', icon: '⌘', placeholder: '196.1.1.1' },
];

const features = [
  { icon: '▤', title: 'Message scam signals', copy: 'Look for urgency, impersonation, account-verification demands and payment pressure in forwarded messages.' },
  { icon: '◉', title: 'WhatsApp number reports', copy: 'A structured, review-led reputation system is planned. A report alone never proves a number is fraudulent.' },
  { icon: '↗', title: 'Suspicious links', copy: 'Spot unfamiliar links and common manipulation patterns. Live threat-intelligence lookups are coming later.' },
  { icon: '◎', title: 'External exposure', copy: 'Domain, DNS and IP checks will help organisations identify observable security weaknesses.' },
  { icon: '▦', title: 'POPIA readiness', copy: 'Future SME assessments will map observed risks to possible safeguards—not make legal compliance determinations.' },
  { icon: '↺', title: 'Remediation pathways', copy: 'Practical guidance for individuals, SMMEs and their trusted technical service providers.' },
];

function Brand() {
  return <a className="brand" href={route('/')} aria-label="CyberScan home"><span className="brand-mark"><svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M16 2.8 27 7v8.1c0 7-4.4 12.4-11 14.2C9.4 27.5 5 22.1 5 15.1V7L16 2.8Z" stroke="currentColor" strokeWidth="2.1"/><path d="m10.8 15.7 3.5 3.5 7-7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg></span><span className="brand-word">cyber<span>scan</span><small>.co.za</small></span></a>;
}

function Header() {
  const [open, setOpen] = useState(false);
  return <header className="header"><div className="container nav">
    <Brand />
    <button type="button" className="mobile-menu" aria-expanded={open} onClick={() => setOpen(!open)} aria-label="Toggle menu">☰</button>
    <nav className={open ? 'nav-links nav-open' : 'nav-links'} aria-label="Main navigation">
      <a href={route('/#scanner')}>Scan now</a><a href={route('/#how-it-works')}>How it works</a><a href={route('/#business')}>For business</a><a href={route('/#whatsapp')}>WhatsApp bot</a><a href={route('/support')}>Help</a>
      <a className="nav-cta" href={route('/#scanner')}>Check a threat <span>↗</span></a>
    </nav>
  </div></header>;
}

// Client-side checks are explicitly preliminary. No backend, threat feed, phone directory,
// community reputation lookup, or confidential message storage is connected in this phase.
function analyseMessage(raw) {
  const text = raw.trim();
  const rules = [
    { regex: /urgent|immediately|within (?:\d+|one|two) (?:hour|minute|day)|act now|final warning|last chance/i, title: 'Pressure or urgency', detail: 'Scammers often try to rush decisions before you can verify the sender.' },
    { regex: /(?:otp|one.time pin|verification code|password|pin number|login details|banking details)/i, title: 'Sensitive information request', detail: 'Never share one-time PINs, passwords or banking credentials in a chat.' },
    { regex: /(?:send money|transfer|deposit|payment required|pay now|processing fee|release fee|e-?wallet|cashsend)/i, title: 'Money or payment request', detail: 'Confirm payment instructions through an independently sourced contact channel.' },
    { regex: /(?:account (?:blocked|suspended|locked)|verify your account|confirm your identity|update your details|sars|post office|bank security)/i, title: 'Possible authority or account impersonation', detail: 'Visit the organisation through its official app or a known website, not the message link.' },
    { regex: /(?:prize|lottery|winner|reward|free gift|investment return|guaranteed profit|job offer|work from home)/i, title: 'Unexpected offer', detail: 'Treat unexpected rewards, investment promises and job fees with caution.' },
    { regex: /https?:\/\/[^\s]+|\b(?:bit\.ly|tinyurl\.com|t\.co|wa\.me)\/[^\s]+/i, title: 'Link present', detail: 'An embedded link needs separate verification; its presence alone does not mean the message is malicious.' },
  ];
  const findings = rules.filter((r) => r.regex.test(text)).map(({ title, detail }) => ({ title, detail }));
  const stronger = findings.filter((f) => f.title !== 'Link present').length;
  const level = stronger >= 2 ? 'Elevated caution' : stronger === 1 ? 'Caution advised' : 'No common wording signals identified';
  return { level, findings, notice: 'Preliminary on-device wording check only. This is not a live malware, identity or fraud verification, and a low signal count does not establish that a message is safe.' };
}

function ScanTool({ initial = 'message' }) {
  const [mode, setMode] = useState(initial);
  const [value, setValue] = useState('');
  const [result, setResult] = useState(null);
  const upload = useRef(null);
  const selected = modes.find((x) => x.id === mode);
  function submit(e) {
    e.preventDefault();
    if (!value.trim()) return;
    if (mode === 'message') setResult({ kind: 'message', ...analyseMessage(value) });
    else setResult({ kind: 'pending', label: selected.label, input: value.trim() });
  }
  function switchMode(next) { setMode(next); setValue(''); setResult(null); }
  async function paste() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) { setValue(text.slice(0, 5000)); setResult(null); }
    } catch { setResult({ kind: 'notice', text: 'Clipboard access is unavailable. Please paste with Ctrl+V or your device paste menu.' }); }
  }
  function readScreenshot(e) {
    const file = e.target.files?.[0];
    if (file) setResult({ kind: 'notice', text: 'Screenshot analysis is on the roadmap. Images are not uploaded or analysed in this prototype. Remove names, addresses, banking details and other sensitive information before sharing any future screenshot.' });
    e.target.value = '';
  }
  return <div className="scanner-card" id="scanner">
    <div className="scanner-top"><span className="live-dot" /><span>CyberScan early access</span><small>Message checks available · Other scans coming soon</small></div>
    <div className="scan-tabs" role="tablist" aria-label="Choose scan type">{modes.map((m) => <button type="button" role="tab" aria-selected={mode === m.id} className={mode === m.id ? 'tab active' : 'tab'} key={m.id} onClick={() => switchMode(m.id)}><span aria-hidden="true">{m.icon}</span>{m.label}</button>)}</div>
    <form className="scan-body" onSubmit={submit}>
      <label htmlFor="scan-input">{mode === 'message' ? 'Is this message suspicious?' : 'What would you like to check?'}</label>
      <p className="scan-hint">{mode === 'message' ? 'Paste WhatsApp, SMS or email text. Remove personal data, passwords and one-time PINs first.' : 'This scan category is being integrated with CyberScan’s secure intelligence backend.'}</p>
      {mode === 'message' ? <textarea id="scan-input" maxLength={5000} value={value} onChange={e => {setValue(e.target.value);setResult(null);}} placeholder={selected.placeholder} rows={4} /> : <input id="scan-input" maxLength={500} value={value} onChange={e => {setValue(e.target.value);setResult(null);}} placeholder={selected.placeholder} type="text" />}
      <div className="scan-toolbar">
        <div className="scan-helpers">{mode === 'message' && <><button type="button" className="subtle-button" onClick={paste}>▤ Paste text</button><button type="button" className="subtle-button" onClick={() => upload.current?.click()}>▧ Screenshot (soon)</button><input hidden ref={upload} type="file" accept="image/*" onChange={readScreenshot} /></>}</div>
        <button className="scan-submit" type="submit" disabled={!value.trim()}>{mode === 'message' ? 'Check scam signals' : 'Check availability'} <span>↗</span></button>
      </div>
      {result && <div className={result.kind === 'message' ? 'scan-result' : 'scan-result neutral'} role="status" aria-live="polite">
        {result.kind === 'message' ? <><div className="result-heading"><span className="result-indicator">!</span><div><strong>{result.level}</strong><p>Based on observed wording, not verified sender reputation.</p></div></div>{result.findings.length ? <ul>{result.findings.map((f) => <li key={f.title}><strong>{f.title}:</strong> {f.detail}</li>)}</ul> : <p>No common wording patterns were matched. Scams can still be subtle or use images and voice notes.</p>}<p className="result-disclaimer">{result.notice}</p></> : result.kind === 'pending' ? <><strong>{result.label} scanning is coming soon</strong><p>CyberScan has not scanned or verified this input. Live intelligence, reputation databases and the WhatsApp bot are not connected yet. Do not treat an unknown number or link as safe.</p></> : <p>{result.text}</p>}
      </div>}
      <p className="privacy-note">🔒 Prototype checks run in your browser. Do not enter confidential information. No content is sent to a CyberScan server by this form.</p>
    </form>
  </div>;
}

function Hero() {
  return <section className="hero"><div className="container hero-grid">
    <div className="hero-copy"><div className="eyebrow"><span>✧</span> BUILT FOR SOUTH AFRICA · DIGITAL SAFETY FOR EVERYONE</div>
      <h1>Scan before<br />you <em>trust.</em></h1>
      <p className="hero-lead">Suspicious WhatsApp message? Unknown number? Strange link? CyberScan helps you spot warning signs and take safer next steps.</p>
      <div className="hero-points"><span>✓ WhatsApp & SMS scams</span><span>✓ Digital identity signals</span><span>✓ SMME cyber resilience</span></div>
      <a className="hero-link" href="#how-it-works">See how it works <span>↘</span></a>
    </div>
    <ScanTool />
  </div><div className="hero-accent" aria-hidden="true"><span /><span /><span /></div></section>;
}

function Features() {
  return <section className="section" id="how-it-works"><div className="container">
    <div className="section-heading"><div><span className="kicker">ONE PLACE. MORE CLARITY.</span><h2>Your everyday<br /><em>digital safety toolkit.</em></h2></div><p>CyberScan combines clear explanations with purpose-built security checks. We're launching responsibly, starting with message warning signs and expanding to verified intelligence.</p></div>
    <div className="feature-grid">{features.map((f, i) => <article className="feature-card" key={f.title}><div className="feature-index">0{i + 1} <span>{f.icon}</span></div><h3>{f.title}</h3><p>{f.copy}</p><span className="feature-arrow">↗</span></article>)}</div>
  </div></section>;
}

const examples = [
  { label: 'Delivery impersonation', tag: 'Example · not a live detection', text: 'Your parcel cannot be delivered. Pay the small redelivery fee now using this link.', signals: ['Delivery pressure', 'Payment request'] },
  { label: 'Fake bank alert', tag: 'Example · not a live detection', text: 'Your account is blocked. Verify your login details immediately to regain access.', signals: ['Impersonation', 'Credential request'] },
  { label: 'Job opportunity scam', tag: 'Example · not a live detection', text: 'Congratulations, you have been selected. Send a registration fee to secure the job.', signals: ['Unexpected offer', 'Advance fee'] },
];

function ThreatExamples() {
  return <section className="examples-section"><div className="container examples-layout"><div><span className="kicker">SPOT THE PATTERN</span><h2>A suspicious message<br /><em>often tells a story.</em></h2><p>Fraudulent messages can exploit urgency, authority, money pressure and unfamiliar links. These illustrative examples explain warning signs; they are not reports about real senders.</p><a className="text-action" href="#scanner">Try a message check <span>↗</span></a></div><div className="example-stack">{examples.map((e, i) => <article className="example-card" key={e.label}><div className="example-heading"><span className="example-avatar">{['↗','!','✦'][i]}</span><div><strong>{e.label}</strong><small>{e.tag}</small></div><span className="warning-pill">Review carefully</span></div><p>“{e.text}”</p><div className="signal-chips">{e.signals.map(s => <span key={s}>{s}</span>)}</div></article>)}</div></div></section>;
}

function WhatsApp() {
  return <section className="whatsapp-section" id="whatsapp"><div className="container wa-grid"><div><span className="wa-kicker">COMING SOON · OFFICIAL WHATSAPP INTEGRATION</span><h2>CyberScan in<br />your <em>WhatsApp.</em></h2><p>Forward a suspicious message, send a number or submit a link to the planned CyberScan WhatsApp assistant. The bot will use the same assessment engine as the website—with clear evidence limits and privacy safeguards.</p><div className="wa-steps"><span><b>01</b> Send a suspicious message or indicator</span><span><b>02</b> Receive an evidence-based assessment</span><span><b>03</b> Follow practical safety guidance</span></div><a className="wa-button" href="mailto:vernard@cyberscan.co.za?subject=CyberScan%20WhatsApp%20bot%20updates">Ask about the bot <span>↗</span></a><small>Not live yet. No WhatsApp number or automated bot is currently advertised.</small></div><div className="wa-mock" aria-label="Preview of a planned WhatsApp assistant conversation"><div className="wa-mock-top"><span className="wa-symbol">✦</span><div><strong>CyberScan Assistant</strong><small>Concept preview · bot in development</small></div></div><div className="bubble user">Is this payment message real?</div><div className="bubble bot"><strong>CyberScan · Preliminary review</strong><p>Look for urgent payment pressure, unfamiliar links and requests for credentials. Contact the organisation using an independently verified channel.</p><small>Example only — not an actual analysis</small></div><div className="wa-mock-bottom">Privacy-first checks, clear next steps <span>✓</span></div></div></div></section>;
}

const pillars = [
  ['External exposure','Domains, DNS, certificates and observable services'],
  ['Identity security','MFA, email authentication and access controls'],
  ['Human risk','Phishing, BEC and social-engineering readiness'],
  ['Data protection','POPIA-related security safeguards and incident readiness'],
  ['Recovery','Backups, restoration and response preparedness'],
];
function Business() {
  return <section className="section business-section" id="business"><div className="container business-grid"><div><span className="kicker">BEYOND INDIVIDUAL CHECKS</span><h2>Built for people.<br /><em>Designed for business.</em></h2><p>CyberScan's planned SME Resilience Assessment will organise findings into five practical dimensions, turning exposure into prioritised remediation guidance.</p><a className="dark-button" href="mailto:vernard@cyberscan.co.za?subject=CyberScan%20SME%20assessment%20enquiry">Enquire about SME assessments <span>↗</span></a></div><div className="pillar-list">{pillars.map(([name, copy], i) => <div className="pillar" key={name}><span>0{i + 1}</span><div><strong>{name}</strong><p>{copy}</p></div><span>↗</span></div>)}</div></div></section>;
}

function SafetyNotice() {
  return <section className="closing"><div className="container closing-inner"><span className="kicker">A SAFER DIGITAL SOUTH AFRICA</span><h2>Pause. Check.<br /><em>Protect what matters.</em></h2><p>CyberScan is an evolving product. A scan is one signal—not proof of trustworthiness, a legal verdict, or a substitute for professional incident response.</p><a href="#scanner" className="scan-submit">Start with a message <span>↗</span></a></div></section>;
}

function Footer() {
  return <footer className="footer"><div className="container"><div className="footer-top"><div><Brand /><p>Digital resilience for people and businesses across South Africa.</p></div><div className="footer-columns"><div><strong>Explore</strong><a href={route('/#scanner')}>Scan a message</a><a href={route('/#how-it-works')}>Capabilities</a><a href={route('/#business')}>SME resilience</a></div><div><strong>Connect</strong><a href={route('/#whatsapp')}>WhatsApp bot roadmap</a><a href={route('/support')}>Help & safety</a><a href="mailto:vernard@cyberscan.co.za">Email us</a></div></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} CyberScan. All rights reserved.</span><span>South Africa · Launch-phase platform · <a href={route('/privacy')}>Privacy information</a></span></div></div></footer>;
}

function SupportPage() {
  return <><Header /><main className="simple-page"><div className="container simple-inner"><span className="kicker">HELP & SAFETY</span><h1>Stay alert.<br /><em>Stay in control.</em></h1><p>CyberScan is in early development. The browser-based message checker can highlight some common scam wording patterns, but it cannot verify identities or access live scam reports.</p><div className="help-grid"><article><h3>Suspicious WhatsApp message?</h3><p>Do not send OTPs, click unfamiliar links or transfer funds. Contact the supposed organisation through a number you already trust.</p></article><article><h3>Already paid or shared credentials?</h3><p>Contact your bank or service provider immediately, change affected credentials and preserve evidence. Report relevant incidents through the appropriate South African channels.</p></article><article><h3>Need assistance?</h3><p>Contact <a href="mailto:vernard@cyberscan.co.za">vernard@cyberscan.co.za</a>. Do not email passwords, PINs or full banking details.</p></article></div><a className="dark-button" href={route('/#scanner')}>Back to scan tool ↗</a></div></main><Footer /></>;
}

function PrivacyPage() {
  return <><Header /><main className="simple-page"><div className="container simple-inner"><span className="kicker">PRIVACY & TRANSPARENCY</span><h1>Your messages.<br /><em>Your choice.</em></h1><p>The current prototype checks pasted message text locally in your browser using simple text patterns. It does not submit that text to CyberScan servers. Website infrastructure and third-party hosting providers may process normal connection and access information.</p><div className="help-grid"><article><h3>What works today</h3><p>Local message-wording checks and informational pages. Other scan types do not yet perform live lookups.</p></article><article><h3>What is not live</h3><p>WhatsApp bot integration, screenshot OCR, reputation databases, community report submission and SME resilience assessments.</p></article><article><h3>Share carefully</h3><p>Remove names, passwords, account numbers, IDs and other sensitive information before pasting messages into any online service.</p></article></div><p>For privacy questions, email <a href="mailto:vernard@cyberscan.co.za">vernard@cyberscan.co.za</a>. This page is a product privacy summary; formal legal notices should be completed before full launch.</p></div></main><Footer /></>;
}

function App() {
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  if (path === '/support') return <SupportPage />;
  if (path === '/privacy') return <PrivacyPage />;
  return <><Header /><main><Hero /><Features /><ThreatExamples /><WhatsApp /><Business /><SafetyNotice /></main><Footer /></>;
}
createRoot(document.getElementById('root')).render(<App />);
