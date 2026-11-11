import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const appPath = (path) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;
const assetPath = appPath;

const featureLinks = [
  { label: 'Caller ID', path: '/features/caller-id' },
  { label: 'Spam Blocker', path: '/features/spam-blocker' },
  { label: 'Reverse Phone Lookup', path: '/features/reverse-phone-lookup' },
  { label: 'Spam Text Blocker', path: '/features/spam-text-blocker' },
  { label: 'Contact Management', path: '/features/contact-management' },
];

function Logo() {
  return <a className="logo" href={appPath('/')} aria-label="Cyberscan home"><img className="logo-image" src={assetPath('/images/Cyberscan_logo.png')} alt="Cyberscan" /></a>;
}

function Chevron() {
  return <svg viewBox="0 0 12 7" aria-hidden="true"><path d="m1 1 5 5 5-5" /></svg>;
}

function Header({ plain = false }) {
  const [open, setOpen] = useState(false);
  const [featuresOpen, setFeaturesOpen] = useState(false);
  return <header className={`site-header${plain ? ' plain-header' : ''}`}>
    <div className="nav-wrap">
      <Logo />
      <nav className={open ? 'main-nav open' : 'main-nav'}>
        <a href={appPath('/')}>Home</a>
        <a href={appPath('/android-app')}>Android App</a>
        <a href={appPath('/iphone-app')}>iPhone App</a>
        <div className={`nav-dropdown${featuresOpen ? ' open' : ''}`}><button type="button" aria-expanded={featuresOpen} onClick={() => setFeaturesOpen(!featuresOpen)}>Features <Chevron /></button><div className="dropdown-menu">{featureLinks.map((item) => <a href={appPath(item.path)} key={item.path}>{item.label}</a>)}</div></div>
        <a href={appPath('/spam-detector')}>Spam Detector</a>
        <a href={appPath('/report-spam')}>Report Spam/Fraud</a>
        <a href={appPath('/support')}>Support</a>
      </nav>
      <div className="nav-actions"><a className="sign-in" href={appPath('/signin')}>Sign in</a><button className="language" type="button">EN <Chevron /></button><button className="menu-button" type="button" aria-label="Open menu" onClick={() => setOpen(!open)}><span /><span /></button></div>
    </div>
  </header>;
}

function SearchPanel() {
  const scanTypes = [
    { id: 'number', label: 'Phone / WhatsApp', placeholder: 'Phone or WhatsApp number', description: 'Check a suspicious phone or WhatsApp number. Live reputation checks are coming soon.' },
    { id: 'message', label: 'Scan a message', placeholder: 'Paste a suspicious WhatsApp, SMS or email message', description: 'Review suspicious WhatsApp, SMS or email text. Remove passwords, PINs and personal information first.' },
    { id: 'url', label: 'URL / Link', placeholder: 'https://example.co.za', description: 'Check a suspicious website or shortened link. Live phishing and malware intelligence is being integrated.' },
    { id: 'email', label: 'Email address', placeholder: 'name@example.co.za', description: 'Check an email address for potential risk indicators. Live reputation and exposure lookups are coming soon.' },
    { id: 'domain', label: 'Domain', placeholder: 'example.co.za', description: 'Explore domain exposure, DNS, certificate and email security checks as they become available.' },
    { id: 'ip', label: 'IP address', placeholder: '196.1.1.1', description: 'IP reputation and observable exposure checks are planned. No live lookup is currently connected.' },
  ];
  const [mode, setMode] = useState('number');
  const [values, setValues] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const selected = scanTypes.find((type) => type.id === mode);
  const value = values[mode] || '';
  const update = (next) => { setValues((previous) => ({ ...previous, [mode]: next })); setSubmitted(false); };
  const scan = () => setSubmitted(true);
  const result = !value.trim() ? 'Enter a value to check.' : 'This scan is not yet connected to live threat intelligence. CyberScan has not verified this input or established that it is safe or malicious.';
  return <div className="search-panel">
    <div className="tabs" role="tablist" aria-label="CyberScan scan categories">
      {scanTypes.map((type) => <button type="button" key={type.id} role="tab" aria-selected={mode === type.id} className={mode === type.id ? 'active' : ''} onClick={() => { setMode(type.id); setSubmitted(false); }}>{type.label}</button>)}
    </div>
    <div className="panel-content" role="tabpanel">
      <p className="panel-lede">{selected.description}</p>
      {mode === 'message' ? <>
        <textarea value={value} maxLength={5000} onChange={(event) => update(event.target.value)} placeholder={selected.placeholder} aria-label="Message to scan" />
        <div className="scan-actions">
          <button className="outline-button" type="button" onClick={async () => { try { update(await navigator.clipboard.readText()); } catch { setSubmitted(false); } }}>Paste</button>
          <button className="outline-button" type="button" disabled title="Screenshot scanning is coming soon">Screenshot (soon)</button>
          <button className="primary-button" type="button" onClick={scan}>Check for scam <span>→</span></button>
        </div>
      </> : <div className="phone-field">
        {mode === 'number' && <span className="country-code">+27</span>}
        <input value={value} onChange={(event) => update(event.target.value)} placeholder={selected.placeholder} aria-label={selected.label} type={mode === 'email' ? 'email' : 'text'} />
        <button type="button" className="search-button" aria-label={`Check ${selected.label}`} onClick={scan}><svg viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></svg></button>
      </div>}
      <small>WhatsApp bot integration and live security scanning are in development. Do not submit confidential information.</small>
      {submitted && <div className="result-message" role="status">{result}</div>}
    </div>
  </div>;
}

function Hero() {
  return <main id="home">
    <section className="hero" id="top">
      <div className="hero-inner">
        <div className="hero-copy"><div className="eyebrow"><span className="eyebrow-line" />Your digital safety partner in <strong>South Africa</strong></div><h1>Know the risk.<br /><em>Stay protected.</em></h1><p className="hero-subtitle">Check WhatsApp scams, suspicious messages, phone numbers, URLs, email addresses, domains and IP addresses—all in one place.</p><SearchPanel /></div>
        <div className="hero-art"><div className="art-glow" /><img src={assetPath('/images/home-hero-poster.webp')} alt="CyberScan mobile security experience preview" /></div>
      </div>
      <div className="hero-wave" />
    </section>
    <section className="scam-section" id="detector"><div className="scam-copy"><div className="section-label">AI-POWERED PROTECTION</div><h2>Detect scam<br /><span>messages.</span></h2><p>Check suspicious text messages before you click. Cyberscan's AI-powered scanner spots red flags and helps you stay one step ahead.</p><button className="blue-button" type="button">Check a message <span>→</span></button></div><div className="message-board"><div className="scan-status"><span className="status-dot" />Example scam patterns · Live statistics not available</div><MessageCard label="Billing" number="+1 202 555 0123" copy="We couldn't process your monthly payment. To avoid interruption, update your card: billing-verify.co/pay" tone="red" /><MessageCard label="Rewards" number="+1 202 555 4567" copy="You have a $50 credit waiting from your recent purchase. Confirm your details to receive it." tone="orange" /><MessageCard label="Delivery" number="+1 202 555 8765" copy="Your package couldn't be delivered - address incomplete. Confirm it here to reschedule." tone="red" /></div></section>
    <FeatureStory />
    <section className="feature-list" id="apps"><div className="section-label">CYBERSCAN PROTECTION</div><h2>Everything you need to<br /><span>stay connected.</span></h2><div className="feature-list-grid"><FeatureItem icon="◉" title="WhatsApp scam number checks (planned)" /><FeatureItem icon="✦" title="Suspicious message signals" /><FeatureItem icon="⌁" title="Advanced Spam & Scam Detection" /><FeatureItem icon="⌕" title="URL and domain checks (planned)" /><FeatureItem icon="◌" title="Email and IP checks (planned)" /><FeatureItem icon="✓" title="Privacy-First Protection" /><FeatureItem icon="▣" title="SME resilience assessments (planned)" /><FeatureItem icon="⊘" title="Community reports with review (planned)" /><FeatureItem icon="↻" title="WhatsApp scanning bot (planned)" /></div></section>
    <Livecaller />
  </main>;
}

function MessageCard({ label, number, copy, tone }) {
  return <article className="message-card"><div className="message-heading"><span>{label}</span><small>{number}</small></div><div className={`message-alert ${tone}`}><b>{tone === 'orange' ? '⚠' : '🚨'} Suspicious {label.toLowerCase()} scam</b><p>{copy}</p><small>Likely scam · Review carefully</small></div></article>;
}

function FeatureStory() {
  return <section className="feature-story"><div className="story-art"><div className="story-orbit" /><img src={assetPath('/images/incoming-call.webp')} alt="Incoming call identified by Cyberscan" /></div><div className="story-copy"><div className="section-label">CALLER ID & SPAM BLOCKER</div><h2>Know who’s calling,<br /><span>every time.</span></h2><p>CyberScan is developing evidence-led checks for suspicious numbers, links and digital identities, with practical safety guidance.</p><div className="story-points"><div><span className="point-icon">⌕</span><strong>Identify Unknown Callers Instantly</strong></div><div><span className="point-icon">⊘</span><strong>Block Spam Calls, Robocalls & Telemarketers</strong></div><div><span className="point-icon">↻</span><strong>Contact Management with Profile Photos</strong></div></div><button className="blue-button" type="button">Download for free <span>→</span></button></div></section>;
}

function FeatureItem({ icon, title }) {
  return <div className="feature-item"><span>{icon}</span><p>{title}</p><b>→</b></div>;
}

function Livecaller() {
  return <section className="livecaller" id="support"><div className="livecaller-copy"><div className="live-badge"><span />NEW FROM CYBERSCAN TEAM!</div><h2>Meet <em>Livecaller.</em></h2><p>Stay protected with real-time caller ID and spam blocking for every incoming call.</p><p className="live-detail">Livecaller instantly identifies unknown callers, blocks spam, and shows you who's calling, even if they are not in your contacts.</p><button className="white-button" type="button">Get the app <span>→</span></button></div><img src={assetPath('/images/livecaller-screen.webp')} alt="Livecaller app screen" /></section>;
}

function Footer() {
  return <footer className="footer"><div className="footer-top"><Logo /><p>Identify unknown callers.<br />Stay protected from spam.</p><div className="footer-download"><span>Download Cyberscan</span><a href={appPath('/android-app')}><button type="button">Get started <b>→</b></button></a></div></div><div className="footer-links"><div><h4>Explore</h4><a href={appPath('/')}>Home</a><a href={appPath('/android-app')}>Download Cyberscan</a><a href={appPath('/features/caller-id')}>Learn More</a><a href={appPath('/support')}>Support</a><a href={appPath('/spam-detector')}>Spam Detector</a></div><div><h4>Company</h4><a href={appPath('/support')}>About Us</a><a href={appPath('/support')}>Contact Us</a><a href={appPath('/support')}>Media Kit</a><a href={appPath('/support')}>Blog</a></div><div><h4>More Apps</h4><a href={appPath('/android-app')}>Calendar.AI</a><a href={appPath('/support')}>Livecaller</a></div><div><h4>Follow Us</h4><div className="socials"><a href={appPath('/support')}>in</a><a href={appPath('/support')}>f</a><a href={appPath('/support')}>𝕏</a></div></div></div><div className="footer-bottom"><span>© 2026 CyberScan. All rights reserved.</span><div><a href={appPath('/support')}>Terms of Use</a><a href={appPath('/support')}>Privacy Policy</a><a href={appPath('/support')}>Cookies Policy</a><a href={appPath('/support')}>Accessibility</a></div></div></footer>;
}

const productPages = {
  '/features/caller-id': { label: 'CALLER ID', title: <>Know who’s calling<br /><span>before you answer.</span></>, body: 'Identify unknown callers instantly with names, photos, locations, and social profiles. Cyberscan gives you the context you need to pick up with confidence.', image: '/images/incoming-call.webp', button: 'Download Cyberscan' },
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
  const [sent, setSent] = useState(false);
  return <><Header plain /><main className="subpage-main"><section className="form-page"><div className="section-label">REPORT SPAM / FRAUD</div><h1>Help keep the<br /><span>community safe.</span></h1><p>Tell us about a suspicious number or message. Community scam reporting is planned. Reports will require review and will not automatically label a number fraudulent.</p><form className="report-form" onSubmit={(event) => { event.preventDefault(); setSent(true); }}><label>Phone number<input required placeholder="+1 202 555 0123" /></label><label>What happened?<textarea required placeholder="Share any details that might help..." /></label><button className="blue-button" type="submit">Submit report <span>→</span></button>{sent && <div className="form-success">This is a preview form. Reports are not yet saved or submitted.</div>}</form></section></main><Footer /></>;
}

function SupportPage() {
  const questions = ['How do I search for a phone number?', 'How do I block spam calls?', 'How does the Spam Detector work?', 'How do I cancel my subscription?'];
  const [active, setActive] = useState(0);
  return <><Header plain /><main className="subpage-main"><section className="support-hero"><div className="section-label">SUPPORT</div><h1>How can we<br /><span>help?</span></h1><p>Find answers, get product guidance, or reach out to our team.</p><div className="support-search"><span>⌕</span><input placeholder="Search the help center" /></div></section><section className="faq-section"><div><div className="section-label">COMMON QUESTIONS</div><h2>Answers for your<br /><span>everyday questions.</span></h2><p>Can't find what you need? Contact us and we'll help you get sorted.</p><a className="blue-button inline-button" href="mailto:vernard@cyberscan.co.za">Contact support <span>→</span></a></div><div className="faq-list">{questions.map((question, index) => <div className={`faq-item ${active === index ? 'active' : ''}`} key={question}><button type="button" onClick={() => setActive(active === index ? -1 : index)}><span>{question}</span><b>{active === index ? '−' : '+'}</b></button>{active === index && <p>Cyberscan makes this simple. Open the app and follow the steps on screen to manage this feature securely.</p>}</div>)}</div></section></main><Footer /></>;
}

function SigninPage() {
  const [sent, setSent] = useState(false);
  return <><Header plain /><main className="subpage-main signin-page"><section className="signin-card"><Logo /><div className="section-label">WELCOME BACK</div><h1>Sign in to<br /><span>Cyberscan.</span></h1><form onSubmit={(event) => { event.preventDefault(); setSent(true); }}><label>Email address<input required type="email" placeholder="you@example.com" /></label><label>Password<input required type="password" placeholder="••••••••" /></label><button className="blue-button" type="submit">Sign in <span>→</span></button></form>{sent && <div className="form-success">Sign-in request sent.</div>}<p className="signin-help">Don't have an account? <a href={appPath('/android-app')}>Download Cyberscan</a></p></section></main></>;
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

function App() { return <RoutePage />; }

createRoot(document.getElementById('root')).render(<App />);