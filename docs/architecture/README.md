# CyberScan 2.0 — Architecture Decision Record (ADR-001)

Status: Proposed foundation. This document does not imply any scanner or provider is live.

## Product boundary
CyberScan is an SME-first **cyber-resilience assessment and remediation orchestration layer** for South Africa. Public scam checks are an acquisition and safety service; organisation-level risk and remediation are the primary differentiator. CyberScan is not EDR, XDR, SIEM, a SOC, a penetration test or a guarantee of safety.

## Current deployment and target
- Existing: React/Vite frontend on GitHub Pages at cyberscan.co.za.
- Proposed: api.cyberscan.co.za on Cloudflare Workers, secrets held server-side; PostgreSQL for organisation/finding records; queue-backed asynchronous jobs; object storage for explicitly retained evidence.
- No production provider or database is assumed configured. Implementation and DNS deployment require separate validation.

## Trust boundaries
1. Browser (untrusted) -> API gateway (input size/type validation, CORS allowlist, bot mitigation, rate limiting).
2. API -> scanner adapters (allowlisted provider endpoints, quotas, timeouts, circuit breakers, server-side secrets).
3. API -> persistence (least privilege, tenant isolation, encryption, retention and deletion).
4. API -> partner hand-off (explicit user consent and minimum necessary information).
5. Organisation-scoped operations require verified identity, roles and asset ownership.

## Security invariants
- Never fetch arbitrary user URLs without SSRF controls; block private, loopback, link-local, metadata and internal destinations, including after DNS resolution and redirects.
- Prefer reputation lookup over fetching user-submitted URLs. No execution of submitted content in the browser.
- Passive public-domain checks are distinct from active probing. Active scans require explicit authority.
- Phone/email/message content is personal information where identifiable: minimise, redact, restrict provider sharing and avoid logging raw inputs.
- Findings must include evidence provenance, timestamp, confidence and unknown/not-checked states.
- A clean result means no detected indicators from checks performed, not safe or trustworthy.
- Legal mappings are indicative controls, not legal advice or automatic breach determinations. POPIA s22: notification as soon as reasonably possible when applicable, not a blanket 72-hour rule.

## Pipeline
Validate -> normalise -> classify -> choose permitted providers -> gather evidence -> correlate -> generate finding(s) -> recommend control -> offer DIY/partner/managed pathway -> verify remediation.

## Initial vertical slice
URL intelligence first, followed by domain/IP, message/email/phone, organisation assessments, scoring, compliance readiness, monitoring.
No real threat verdict may be shown until at least one real evidence source is connected and its status is displayed.

## Resilience dimensions (provisional)
Exposure 25%, Identity 25%, Human risk 20%, Data protection 15%, Recovery 15%. Unknown controls are excluded from confident scoring and reduce coverage. Never infer resilience from an absence of findings.

## Acceptance criteria for milestone 1
- Documented versioned API and response/error contract.
- Evidence schema distinguishes malicious, suspicious, no-known-indicators and unknown.
- Threat-to-control matrix covers detection boundaries and escalation.
- Provider register tracks commercial rights and quotas.
- Threat model includes SSRF, enumeration, data leakage, tenant isolation, provider failure and abuse.
