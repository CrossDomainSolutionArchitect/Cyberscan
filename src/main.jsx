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
  return <header className={`site-header${plain ? ' plain-header' : ''}`}>
    <div className="nav-wrap">
      <Logo />
      <nav className={open ? 'main-nav open' : 'main-nav'}>
        <a href={appPath('/')}>Home</a>
        
        
        <a href={`${appPath("/")}#apps`}>Features</a>
        <a href={`${appPath("/")}#top`}>Spam Detector</a>
        <a href={appPath('/report-spam')}>Report Spam/Fraud</a>
        <a href={appPath('/support')}>Support</a>
      </nav>
      <div className="nav-actions"><a className="sign-in" href={appPath('/signin')}>Sign in</a><button className="language" type="button">EN <Chevron /></button><button className="menu-button" type="button" aria-label="Open menu" onClick={() => setOpen(!open)}><span /><span /></button></div>
    </div>
  </header>;
}

function SearchPanel({ mode, setMode }) {
  const scanTypes = [
    { id: 'number', label: 'Phone / WhatsApp', placeholder: 'Phone or WhatsApp number', description: 'Check a suspicious phone or WhatsApp number. Live reputation checks are coming soon.' },
    { id: 'message', label: 'Scan a message', placeholder: 'Paste a suspicious WhatsApp, SMS or email message', description: 'Review suspicious WhatsApp, SMS or email text. Remove passwords, PINs and personal information first.' },
    { id: 'url', label: 'URL / Link', placeholder: 'https://example.co.za', description: 'Check a suspicious website or shortened link. Live phishing and malware intelligence is being integrated.' },
    { id: 'email', label: 'Email address', placeholder: 'name@example.co.za', description: 'Check an email address for potential risk indicators. Live reputation and exposure lookups are coming soon.' },
    { id: 'domain', label: 'Domain', placeholder: 'example.co.za', description: 'Explore domain exposure, DNS, certificate and email security checks as they become available.' },
    { id: 'ip', label: 'IP address', placeholder: '196.1.1.1', description: 'IP reputation and observable exposure checks are planned. No live lookup is currently connected.' },
  ];
  const [values, setValues] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const selected = scanTypes.find((type) => type.id === mode);
  const value = values[mode] || '';
  const update = (next) => { setValues((previous) => ({ ...previous, [mode]: next })); setSubmitted(false); };
  const scan = () => setSubmitted(true);
  const result = !value.trim() ? 'Enter a value to check.' : 'This scan is not yet connected to live threat intelligence. CyberScan has not verified this input or established that it is safe or malicious.';
  return <div className="search-panel cyberscan-search" aria-label="CyberScan security scanner">
    <div className="tabs" role="tablist" aria-label="CyberScan scan categories">
      {scanTypes.map((type) => <button type="button" key={type.id} role="tab" aria-selected={mode === type.id} className={mode === type.id ? 'active' : ''} onClick={() => { setMode(type.id); setSubmitted(false); }}>{type.label}</button>)}
    </div>
    <div className="panel-content" role="tabpanel">
      <div className="scanner-heading"><span className="scanner-status-dot" /><span>CYBERSCAN SECURITY CHECK</span><span className="scanner-preview-badge">PREVIEW</span></div><p className="panel-lede">{selected.description}</p>
      {mode === 'message' ? <>
        <textarea value={value} maxLength={5000} onChange={(event) => update(event.target.value)} placeholder={selected.placeholder} aria-label="Message to scan" />
        <div className="scan-actions">
          <button className="outline-button" type="button" onClick={async () => { try { update(await navigator.clipboard.readText()); } catch { setSubmitted(false); } }}>Paste</button>
          <button className="outline-button" type="button" disabled title="Screenshot scanning is coming soon">Screenshot (soon)</button>
          <button className="primary-button" type="button" onClick={scan}>Check for scam <span>→</span></button>
        </div>
      </> : <div className="phone-field scanner-input-wrap">
        {mode === 'number' && <span className="country-code">+27</span>}
        <input value={value} onChange={(event) => update(event.target.value)} placeholder={selected.placeholder} aria-label={selected.label} type={mode === 'email' ? 'email' : 'text'} />
        <button type="button" className="search-button" aria-label={`Check ${selected.label}`} onClick={scan}><svg viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></svg></button>
      </div>}
      <small className="scanner-privacy-note">♢ Privacy first · Live intelligence coming soon · Do not enter confidential information.</small>
      {submitted && <div className="result-message" role="status">{result}</div>}
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
  const [heroMode, setHeroMode] = useState('number');
  return <main id="home">
    <section className="hero" id="top">
      <div className="hero-inner">
        <div className="hero-copy"><h1>Know the risk.<br /><em>Stay protected.</em></h1><p className="hero-subtitle">Check WhatsApp scams, suspicious messages, phone numbers, URLs, email addresses, domains and IP addresses—all in one place.</p><SearchPanel mode={heroMode} setMode={setHeroMode} /></div>
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
  return <footer className="footer"><div className="footer-top"><Logo /><p>Identify unknown callers.<br />Stay protected from spam.</p></div><div className="footer-links"><div><h4>Explore</h4><a href={appPath('/')}>Home</a><a href={appPath('/features/caller-id')}>Learn More</a><a href={appPath('/support')}>Support</a><a href={appPath('/spam-detector')}>Spam Detector</a></div><div><h4>Company</h4><a href={appPath('/support')}>About Us</a><a href="mailto:vernard@cyberscan.co.za">Contact Us</a></div><div><h4>Follow Us</h4><div className="socials"><a href={appPath('/support')}>in</a><a href={appPath('/support')}>f</a><a href={appPath('/support')}>𝕏</a></div></div></div><div className="footer-bottom"><span>© 2026 CyberScan. All rights reserved.</span><div><a href={appPath('/support')}>Terms of Use</a><a href={appPath('/support')}>Privacy Policy</a><a href={appPath('/support')}>Cookies Policy</a><a href={appPath('/support')}>Accessibility</a></div></div></footer>;
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
  const [sent, setSent] = useState(false);
  return <><Header plain /><main className="subpage-main"><section className="form-page"><div className="section-label">REPORT SPAM / FRAUD</div><h1>Help keep the<br /><span>community safe.</span></h1><p>Tell us about a suspicious number or message. Community scam reporting is planned. Reports will require review and will not automatically label a number fraudulent.</p><form className="report-form" onSubmit={(event) => { event.preventDefault(); setSent(true); }}><label>Phone number<input required placeholder="+1 202 555 0123" /></label><label>What happened?<textarea required placeholder="Share any details that might help..." /></label><button className="blue-button" type="submit">Submit report <span>→</span></button>{sent && <div className="form-success">This is a preview form. Reports are not yet saved or submitted.</div>}</form></section></main><Footer /></>;
}

function SupportPage() {
  return <><Header plain /><main className="about-page">
    <section className="about-hero"><div className="about-hero-inner"><div className="about-hero-copy"><div className="about-eyebrow">ABOUT CYBERSCAN</div><h1>Building trust in a<br /><em>connected world.</em></h1><p>CyberScan is a South African digital safety and cyber-risk intelligence initiative focused on helping individuals, small businesses and communities recognise suspicious activity and make more informed security decisions.</p><a className="about-hero-link" href={`${appPath('/')}#top`}>Explore CyberScan <span aria-hidden="true">→</span></a></div><div className="about-hero-media"><img src={assetPath('/images/scan-iphone.webp')} alt="CyberScan smartphone security illustration" loading="lazy" /></div></div></section>
    <section className="about-story"><div className="about-story-media"><img src={assetPath('/images/home-hero-poster.webp')} alt="CyberScan digital security illustration" loading="lazy" /></div><div className="about-story-copy"><div className="section-label">WHO WE ARE</div><h2>Security awareness.<br /><span>Practical digital protection.</span></h2><p>CyberScan is being developed as a unified place to explore digital risk indicators across WhatsApp and SMS messages, unfamiliar phone numbers, suspicious links, email addresses, domains and IP addresses.</p><p>Our focus is particularly relevant to South African SMMEs and underserved communities, where accessible digital safety guidance can support confidence, resilience and responsible technology adoption.</p><p>CyberScan is an emerging platform. Live reputation lookups and threat-intelligence integrations are still in development; current previews do not constitute verified security assessments.</p></div></section>
    <section className="about-mission"><div className="section-label">OUR PURPOSE</div><h2>Making digital safety<br /><span>more accessible.</span></h2><div className="about-mission-grid"><article><span className="about-mission-number">01</span><h3>Awareness</h3><p>Help people recognise phishing, impersonation, suspicious messages and other common online threats.</p></article><article><span className="about-mission-number">02</span><h3>Intelligence</h3><p>Bring relevant checks for numbers, links, email, domains and IP addresses into one accessible experience as integrations mature.</p></article><article><span className="about-mission-number">03</span><h3>Inclusion</h3><p>Design for South African individuals, SMMEs and communities that benefit from practical, understandable cybersecurity guidance.</p></article></div></section>
    <section className="about-vision"><div><div className="section-label">OUR DIRECTION</div><h2>From uncertainty<br /><span>to informed action.</span></h2><p>Our vision is a more cyber-aware digital ecosystem where people and enterprises can assess potential risks before trusting a message, link or unfamiliar digital contact.</p><a className="blue-button inline-button" href={`${appPath('/')}#apps`}>Explore our focus areas <span>→</span></a></div><div className="about-vision-media"><img src={assetPath('/images/incoming-call.webp')} alt="Phone-based digital safety illustration" loading="lazy" /></div></section>
    <section className="about-contact"><div><div className="section-label">GET IN TOUCH</div><h2>Connect with CyberScan.</h2><p>Interested in digital safety, community awareness or opportunities to collaborate? Contact the CyberScan team.</p></div><a className="about-contact-link" href="mailto:vernard@cyberscan.co.za">Contact our team <span aria-hidden="true">→</span></a></section>
  </main><Footer /></>;
}

function SigninPage() {
  const [sent, setSent] = useState(false);
  return <><Header plain /><main className="subpage-main signin-page"><section className="signin-card"><Logo /><div className="section-label">WELCOME BACK</div><h1>Sign in to<br /><span>Cyberscan.</span></h1><form onSubmit={(event) => { event.preventDefault(); setSent(true); }}><label>Email address<input required type="email" placeholder="you@example.com" /></label><label>Password<input required type="password" placeholder="••••••••" /></label><button className="blue-button" type="submit">Sign in <span>→</span></button></form>{sent && <div className="form-success">Sign-in request sent.</div>}</section></main></>;
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