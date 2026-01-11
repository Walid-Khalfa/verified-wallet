# Verified Wallet Security Hackathon - Vulnerability Report

**Researcher:** Walid Khalfa  
**Submission Date:** January 2026  
**Target:** Verified Wallet Extension (Chrome Web Store ID: abkgckcpmnbipkfhkkchkdfkmccjdmkh)

---

## Executive Summary

This report documents **two critical vulnerabilities** and **one medium-severity weakness** in the Verified Wallet's key management and encryption implementation. These issues allow an attacker with read access to client-side storage artifacts to:

1. **Brute-force 4-digit PINs offline** in under 1 second
2. **Extract plaintext private keys** from unencrypted cache storage
3. **Tamper encrypted data without cryptographic integrity checks** (silent corruption / DoS risk)

These issues affect all PIN-based wallet flows; passkey-only users are not impacted by Vulnerability #1.

---

## Vulnerability #1: Weak PIN-Based Key Derivation

### Severity: CRITICAL (CVSS 9.0)

### Description
The wallet derives an encryption key directly from a 4-digit PIN (0000-9999) without computational hardening. The PIN is converted to a 32-byte key using `ethers.encodeBytes32String()` without any key stretching or salt.

### Location
- File: `map_all_extract/src__services__contracts.ts.txt` (line 94)
- Function: `checkOrResetOrCreateVault()`

```typescript
// VULNERABLE CODE
const secretKey = ethers.encodeBytes32String(vaultPin); // vaultPin is 4-digit string
const encryptedPk = encryptString(userPk, secretKey);
```

### Impact
- **10,000 possible PINs** can be brute-forced offline
- **Attack time: <1 second** on modern hardware (~10,000 attempts/sec)
- **No rate limiting** possible (offline attack)
- **Direct private key exposure** enables full wallet compromise

### Proof of Concept
See `poc_lastPk_and_pin_bruteforce.cjs` - Successfully brute-forces PIN in <1 second.

**Test Results:**
```
Victim PIN: 0420
Encrypted PK: U2FsdGVkX1... (CryptoJS AES output)
Found PIN: 0420
Elapsed: ~50ms
Attempts: 421
Rate: ~9,000 attempts/second
```

### Recommendation
1. Use **PBKDF2 with 300,000+ iterations** (OWASP recommendation)
2. Require **6-8 digit PINs minimum**
3. Add **per-user salt** stored separately
4. Implement **passkey-only mode** for high-security users

---

## Vulnerability #2: Plaintext Private Key Caching

### Severity: CRITICAL (CVSS 9.5)

### Description
The wallet stores the user's **plaintext private key** in client-side storage as `lastPk` before vault creation completes. This cache is never encrypted and persists across sessions.

### Location
- File: `map_all_extract/src__services__contracts.ts.txt` (lines 606-621)
- Storage: `chrome.storage.local`, `localStorage`, `AsyncStorage`

```typescript
// VULNERABLE CODE - stores plaintext PK
chrome.storage.local.set({ lastPk: userPk });
localStorage.setItem('lastPk', userPk);
AsyncStorage.setItem('lastPk', userPk);
```

### Impact
- **Direct private key exposure** to any attacker with read access to client-side storage artifacts
- **Persists after logout** - not cleared on session end
- **Survives crashes** - remains if vault creation fails
- **No encryption** - readable under host compromise, profile extraction, debugging access, or crash artifacts

### Attack Scenarios
1. **Malware** scans localStorage for private keys
2. **Debugging tools** extract localStorage/chrome.storage data
3. **Crash dump or backup extraction** reveals `lastPk`
4. **Forensic analysis** of browser profile after device theft

### Proof of Concept
```javascript
// Any script or tool with storage access can read this:
chrome.storage.local.get(['lastPk'], (result) => {
  console.log('Stolen PK:', result.lastPk); // Full private key!
});
```

### Recommendation
1. **NEVER store plaintext private keys** in any storage
2. **Encrypt `lastPk`** with device-specific key (e.g., passkey-derived)
3. **Clear `lastPk` immediately** after vault creation
4. **Add storage encryption layer** for all sensitive data

---

## Vulnerability #3: Unauthenticated Encryption (No Integrity/MAC)

### Severity: MEDIUM (CVSS 5.9)

### Description
The SDK encrypts sensitive data with CryptoJS AES using a passphrase but does not provide authenticated encryption (no MAC/AEAD). Decrypting tampered ciphertexts or wrong keys returns empty output without error, which can lead to silent corruption or DoS if callers do not validate results.

### Location
- File: `map_all_extract/src__utils__helpers.tsx.txt`
- Function: `encryptString()`, `decryptString()`

```typescript
export const encryptString = (text: string, secretKey: string) => {
  const encryptedAES = crypt.AES.encrypt(text, secretKey);
  return encryptedAES.toString();
};
```

### Impact
- **No cryptographic integrity** (tampering not authenticated)
- **Silent corruption** if caller treats empty string as valid
- **Potential DoS** or forced logout if encrypted vault data is modified
- **Does not directly leak keys**, but undermines the reliability of encrypted vault data

### Proof of Concept
See `poc.cjs` and `test_all_vulnerabilities.cjs` (Test #5) - Demonstrates tamper behavior:
```javascript
const tampered = c1.slice(0, -1) + (c1.slice(-1) === "A" ? "B" : "A");
const pTampered = decryptString(tampered, secretKey);
console.log({ decryptedTampered: pTampered }); // Empty string, no error
```

### Recommendation
1. **Use `encryptWithPasskey()`** which properly implements PBKDF2 + random IV + AEAD
2. **Adopt AES-GCM** (or XChaCha20-Poly1305) for authenticated encryption
3. **Treat empty decrypts as failures** and surface errors in UI

---

## Combined Attack Scenario

An attacker with read access to client-side storage artifacts can:

1. **Extract `lastPk`** from localStorage (Vuln #2) → **Instant private key recovery**
2. **OR** Extract encrypted PK + brute-force PIN (Vuln #1) → **Private key recovery in <1 second**
3. **Transfer all funds** to attacker-controlled address
4. **No detection** - attack is completely offline

**Total Time to Key Recovery: seconds**

---

## Proof of Concept Files

All PoCs are runnable with:
```bash
npm install
node test_all_vulnerabilities.cjs
node poc_lastPk_and_pin_bruteforce.cjs
node brute_poc.cjs
node poc.cjs
```

### File Descriptions

1. **`test_all_vulnerabilities.cjs`**
   - Comprehensive test suite (7 tests)
   - Summarizes vulnerabilities vs informational findings

2. **`poc_lastPk_and_pin_bruteforce.cjs`**
   - Demonstrates PIN brute-force attack
   - Shows `lastPk` plaintext exposure
   - **Runtime: <1 second for full PIN space**

3. **`brute_poc.cjs`**
   - Simplified brute-force demonstration
   - Tests 10,000 PINs offline
   - **Success rate: 100%**

4. **`poc.cjs`**
   - Tests tamper behavior (no integrity check)
   - Shows wrong-key behavior (empty output)

---

## Remediation Priority

### Immediate (Critical)
1. ✅ **Remove `lastPk` storage** or encrypt with passkey-derived key
2. ✅ **Increase PIN length** to 8+ digits minimum (if PIN-based auth is retained at all)
3. ✅ **Add PBKDF2** with 300k+ iterations

### Short-term (High)
4. ✅ **Implement AES-GCM** for authenticated encryption
5. ✅ **Add rate limiting** on PIN entry (client-side + server-side)
6. ✅ **Clear sensitive data** on logout/error

### Long-term (Medium)
7. ✅ **Migrate to passkey-only** authentication
8. ✅ **Add hardware security module** support
9. ✅ **Implement secure enclave** storage on mobile

---

## Testing Methodology

### Environment
- **SDK Version:** @verified-network/verified-custody@0.5.0
- **Node.js:** v18+
- **Test Duration:** 3 days
- **Tools:** Node.js, ethers.js, crypto-js

### Test Coverage
- ✅ PIN brute-force (10,000 attempts)
- ✅ Storage inspection (chrome.storage, localStorage)
- ✅ Encryption randomness (non-deterministic)
- ✅ Tamper behavior (no integrity/MAC)
- ✅ Wrong-key behavior (empty output)
- ✅ Cryptographic behavior verified against extracted SDK source maps

---

## References

- OWASP Key Management Cheat Sheet
- NIST SP 800-132 (Password-Based Key Derivation)
- CWE-916: Use of Password Hash With Insufficient Computational Effort
- CWE-311: Missing Encryption of Sensitive Data
- CWE-353: Missing Support for Integrity Check

---

## Responsible Disclosure

This report is submitted exclusively to the Verified Network Bug Bounty Hackathon. No public disclosure has been made prior to this submission.

**Contact:** khelfawalid@gmail.com  
**DoraHacks Profile:** https://dorahacks.io/hacker/U_9c7cd1d49cc130
