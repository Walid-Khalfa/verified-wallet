const fs = require("fs");

const mapPath = "node_modules/@verified-network/verified-custody/dist/index.js.map";
const outDir = "map_extract";

fs.mkdirSync(outDir, { recursive: true });

const raw = fs.readFileSync(mapPath, "utf8");
const map = JSON.parse(raw);

function safeName(p) {
  return p.replace(/\.\.\//g, "").replace(/[\/\\]/g, "__");
}

const targets = [
  "../src/utils/helpers.tsx",
  "../src/services/store.tsx",
  "../src/utils/types.ts",
  "../src/pages/enterPin.tsx",
  "../src/pages/createPin.tsx",
];

for (const t of targets) {
  const idx = map.sources.indexOf(t);
  if (idx === -1) {
    console.log("NOT FOUND:", t);
    continue;
  }
  const content = map.sourcesContent?.[idx];
  if (!content) {
    console.log("NO CONTENT:", t);
    continue;
  }
  const outPath = `${outDir}/${safeName(t)}.txt`;
  fs.writeFileSync(outPath, content, "utf8");
  console.log("WROTE:", outPath);
}
