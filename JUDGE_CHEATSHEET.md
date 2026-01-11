# Judge Cheat Sheet (1 page)

## Quick Verify
```bash
node test_all_vulnerabilities.cjs
```
Expected: `VULNERABILITIES FOUND: 3/7` (2 critical + 1 medium).

## Vulnerabilities (Scope)
Applies to PIN-based wallet flows; passkey-only users are not impacted by Vulnerability #1.

1) PIN brute-force (CRITICAL, CVSS 9.0, CWE-916)
- Key derived directly from 4-digit PIN without hardening.
- Offline brute-force recovers key in <1 second once ciphertext is obtained.

2) Plaintext private key caching (CRITICAL, CVSS 9.5, CWE-311)
- `lastPk` stored in client-side storage during vault creation.
- Direct private key exposure under storage read access.

3) Unauthenticated encryption (MEDIUM, CVSS 5.9, CWE-353)
- No integrity/MAC; tamper or wrong-key decrypts can fail ambiguously.
- Enables silent data corruption or DoS of encrypted vault data.

## PoCs
- `test_all_vulnerabilities.cjs` (suite)
- `poc_lastPk_and_pin_bruteforce.cjs` (combined attack)
- `brute_poc.cjs` (PIN brute-force)
- `poc.cjs` (tamper behavior)

## References (Source Map Lines)
- `map_all_extract/src__services__contracts.ts.txt:94` (PIN -> key)
- `map_all_extract/src__services__contracts.ts.txt:606` (`lastPk`)
- `map_all_extract/src__utils__helpers.tsx.txt:174` (encrypt/decrypt)
