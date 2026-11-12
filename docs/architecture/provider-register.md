# Threat intelligence provider register (proposed, not activated)

| Capability | Candidate | Commercial status | Deployment decision |
|---|---|---|---|
| URL reputation | Google Web Risk | Confirm current commercial pricing, quota, terms | Evaluate |
| URL/domain reputation | VirusTotal | Verify licence and permitted product usage; public API not assumed commercial | Evaluate |
| IP abuse reputation | AbuseIPDB | Verify API plan, quotas and retention | Evaluate |
| DNS | DNS-over-HTTPS resolver | Verify acceptable-use and caching policy | Evaluate |
| Registration | RDAP via registry-authorised endpoints | Respect rate limits and personal data rules | Evaluate |
| TLS | Certificate validation via controlled backend | Network/SSRF and timeout controls required | Evaluate |
| Phone | Commercial validation/reputation provider | No reliable reputation coverage assumed | Research |

Do not assume Google Safe Browsing's non-commercial offering, Shodan InternetDB or free IP-API may be used commercially. No claim of R0 marginal cost; instrument provider requests, errors and cost per scan.

Provider onboarding checklist: licensing; coverage (especially .co.za); data sent; residency/transfer implications; SLA; rate limits; billing; key rotation; fallback; test vectors; incident contacts.
