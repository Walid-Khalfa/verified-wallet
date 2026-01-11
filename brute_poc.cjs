const { encryptString, decryptString } = require("@verified-network/verified-custody");

function zpad(n, width) {
  return String(n).padStart(width, "0");
}

function nowMs() {
  return Date.now();
}

async function main() {
  const pinWidth = 4; // 0000–9999
  const realPin = "0420";
  const secret = "VAULT_PK_SIM_" + Date.now();

  const blob = encryptString(secret, realPin);

  console.log("Encrypted blob:", blob);
  console.log("Brute forcing... (local, offline)");

  const start = nowMs();
  let found = null;
  let attempts = 0;

  for (let i = 0; i < 10 ** pinWidth; i++) {
    const guess = zpad(i, pinWidth);
    attempts++;

    let out;
    try {
      out = decryptString(blob, guess);
    } catch (e) {
      continue; // wrong PIN often throws
    }

    if (out === secret) {
      found = guess;
      break;
    }
  }

  const elapsed = nowMs() - start;
  const safeElapsed = Math.max(elapsed, 1);
  const attemptsPerSec = Math.round((attempts / safeElapsed) * 1000);

  console.log({ found, elapsedMs: elapsed, attempts, attemptsPerSec });
}

main().catch((e) => {
  console.error(e?.stack || e);
  process.exitCode = 1;
});


