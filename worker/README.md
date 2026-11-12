# CyberScan URL scanner — deployment

This is a real request/response scanner backend with URL validation, HTTP transport findings and **optional** Google Web Risk commercial reputation lookup. Without a Web Risk API key, the verdict is `unknown` (or `suspicious` for an HTTP-only finding); it never claims to have checked threat intelligence.

## Deploy
1. In Cloudflare, enable Workers and authenticate Wrangler: `npx wrangler login`.
2. From `worker/`, run `npx wrangler deploy`.
3. Provision Google Web Risk for commercial use, enable its API and billing, then set `npx wrangler secret put WEB_RISK_API_KEY` from `worker/`.
4. Configure a Worker custom domain `api.cyberscan.co.za` in the same Cloudflare zone, or use the generated workers.dev hostname.
5. In the GitHub Pages build, set `VITE_CYBERSCAN_API_URL=https://api.cyberscan.co.za` (or the workers.dev URL) as a GitHub Actions variable. Deploy the frontend again.
6. Test known safe and provider test URLs. Verify failed provider calls produce unknown/partial results, never safe.

## Security limitations
No user URL is fetched or executed. Only its string is sent to Web Risk if configured. Browser origin restrictions are not authentication or robust rate limiting; configure Cloudflare WAF/Turnstile and per-client limits before public promotion. No scan data is persisted. No scan history, score or threat detection is fabricated. IP literal URLs are rejected, including IPv6, to avoid private-network targeting. No active vulnerability testing.
