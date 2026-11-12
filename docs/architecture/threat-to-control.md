# Threat-to-control matrix (v0.1)

| Threat | Supported evidence (once integrated) | Control / next action | Boundary |
|---|---|---|---|
| Phishing URL | Licensed reputation, URL/domain signals | Verify out-of-band, block/report URL | No guarantee of safety |
| Social engineering | Supplied text, extracted links, explainable heuristics | Awareness and independent confirmation | Cannot prove intent |
| BEC | Optional email headers, authentication, impersonation cues | MFA, callback verification for payment changes | No mailbox/transaction visibility |
| Credential theft | User-reported incident or authorised identity signals | Reset credentials, revoke sessions, MFA, specialist referral | Cannot detect device infostealers |
| External exposure | Passive DNS/TLS/RDAP and authorised checks | Patch, restrict, harden configuration | Passive observation != exploitability |
| Ransomware | Verified/self-attested recovery controls | EDR, immutable backups, restoration testing | Cannot stop ransomware |
| Cloud/identity | Questionnaire, later consented integration | Least privilege, MFA, posture review | No internal visibility by default |
| Personal-data compromise | Incident evidence and safeguards | Contain, document, obtain legal advice | No automatic POPIA breach conclusion |

Finding -> evidence -> security control -> potential regulatory relevance -> DIY/partner/managed remediation -> verification. Legal mapping must be reviewed separately.
