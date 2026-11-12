# CyberScan API v1 — proposed contract

Base: `https://api.cyberscan.co.za/v1` (not deployed).

## POST /scans
Request:
```json
{"type":"url","value":"https://example.org/","consent":{"third_party_lookup":false},"client_request_id":"optional-id"}
```
Supported types planned: `url`, `domain`, `ip`, `email`, `message`, `phone`. Type-specific validators and size limits are required before launch.

202 Accepted:
```json
{"scan_id":"opaque-id","status":"queued","submitted_at":"2026-11-12T00:00:00Z","poll_url":"/v1/scans/opaque-id"}
```

## GET /scans/{scan_id}
```json
{
  "scan_id":"opaque-id","type":"url","status":"completed",
  "verdict":"unknown","risk_score":null,"confidence":null,
  "coverage":{"providers_attempted":0,"providers_succeeded":0,"limitations":["No threat intelligence provider connected"]},
  "findings":[],"checked_at":"2026-11-12T00:00:00Z",
  "recommendations":["Do not enter credentials until the destination is independently verified"]
}
```
Status enum: queued, running, completed, partial, failed, expired.
Verdict enum: malicious, suspicious, no_known_indicators, unknown. A verdict of no_known_indicators MUST NOT be labelled safe. Scores and confidence are nullable and require a documented calibration method.

Finding shape:
```json
{"id":"finding-id","category":"phishing","severity":"high","title":"Example finding","description":"Evidence-based explanation","evidence":[{"source":"provider-name","indicator":"redacted-or-minimised","observed_at":"ISO-8601","reference":"optional-provider-reference"}],"control_refs":["C-001"],"regulatory_relevance":[],"remediation":{"action":"Independently verify the sender","pathways":["diy","partner"]}}
```

Error:
```json
{"error":{"code":"INVALID_INPUT","message":"Invalid URL","request_id":"opaque-id"}}
```
Use 400 invalid input, 401 authentication required, 403 not authorised, 429 rate limit, 503 provider unavailable; avoid disclosing provider keys or internal traces.

## Operational requirements
- Scan identifiers must be unguessable; anonymous scan results short-lived and access-controlled.
- Apply per-IP/session/account quotas; never use public unauthenticated IDs as authorisation.
- CORS only permits approved CyberScan origins, but is not authentication.
- No raw sensitive values in telemetry or default analytics.
- Third-party sharing requires disclosed purpose and a consent/legal basis as appropriate.
- Provider timeouts return partial/unknown, never fabricated clean results.
