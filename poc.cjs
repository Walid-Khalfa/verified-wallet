// poc.cjs (CommonJS) — forces use of dist/index.js via exports.require
const {
  encryptString,
  decryptString,
  hashTheString,
  publicKeyCredentialRequestOptions,
} = require("@verified-network/verified-custody");

function banner(title) {
  console.log("\n=== " + title + " ===");
}

async function main() {
  const secretKey = "1234"; // simulate weak PIN/secret
  const plaintext = "SECRET_" + Date.now();

  banner("Basic round-trip");
  const c1 = encryptString(plaintext, secretKey);
  const p1 = decryptString(c1, secretKey);
  console.log({ plaintext, c1, p1, ok: p1 === plaintext });

  banner("Determinism test (same plaintext + same key)");
  const c2 = encryptString(plaintext, secretKey);
  console.log({ c1_equals_c2: c1 === c2 });

  banner("Wrong-key behavior");
  const wrongKey = "9999";
  let pWrong;
  try {
    pWrong = decryptString(c1, wrongKey);
  } catch (e) {
    pWrong = "THREW: " + (e?.message || String(e));
  }
  console.log({ wrongKey, decryptedWithWrongKey: pWrong });

  banner("Tamper test (ciphertext modified slightly)");
  const tampered =
    c1.length > 10 ? c1.slice(0, -1) + (c1.slice(-1) === "A" ? "B" : "A") : c1 + "A";
  let pTampered;
  try {
    pTampered = decryptString(tampered, secretKey);
  } catch (e) {
    pTampered = "THREW: " + (e?.message || String(e));
  }
  console.log({ tampered, decryptedTampered: pTampered });

  banner("Hash function sanity");
  const h1 = hashTheString(plaintext);
  const h2 = hashTheString(plaintext);
  const h3 = hashTheString(plaintext + "x");
  console.log({ h1, h2, h1_equals_h2: h1 === h2, h1_equals_h3: h1 === h3 });

  banner("WebAuthn request options snapshot");
  const opts = publicKeyCredentialRequestOptions();
  console.log(opts);
}

main().catch((e) => {
  console.error(e?.stack || e);
  process.exitCode = 1;
});
