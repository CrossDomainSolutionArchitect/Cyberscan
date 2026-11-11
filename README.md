# CyberScan — Digital resilience for South Africa

CyberScan is a South African cyber-safety and SME resilience product in development. Its first public-facing release includes a simple, browser-only message wording check and explains the planned URL, phone/WhatsApp, email, domain and IP intelligence workflows.

## Technology

- Vite + React frontend
- Existing GitHub Actions workflow: `.github/workflows/deploy-pages.yml`
- Deploys on push to `main`, builds with `npm ci` and `npm run build`, copies `dist/index.html` to `dist/404.html`, then publishes `dist` to `gh-pages` with `cyberscan.co.za` as the custom domain.
- **Do not edit the deployment workflow, domain, or DNS for frontend updates.**

## Development

```bash
npm ci
npm run dev
npm run build
```

## Product status and safety

Only the **message wording checker** is presently interactive. It runs simple deterministic patterns locally in the browser, and its output is explicitly **preliminary**. It does not verify a message's sender, evaluate live threat feeds, establish that any number is fraudulent, or guarantee a message is safe. No message text is sent to a CyberScan backend.

Phone/WhatsApp number reputation, screenshot OCR, live URL/domain/IP intelligence, community reports, WhatsApp Business Platform bot and five-dimensional SME resilience assessments are **planned**, not live. A future backend should implement input validation, rate limits, licensed intelligence connectors, evidence provenance, secure storage, data minimisation and moderation before going live.

## Architecture direction

`GitHub Pages React UI → Cloudflare Worker API → vetted intelligence sources → evidence-based reporting`

Future WhatsApp Business Platform integration should use the same Worker endpoints as the web UI. Never put API secrets in Vite environment variables exposed to the browser.

Contact: vernard@cyberscan.co.za
