const fs = require("fs");

const mapPath = "node_modules/@verified-network/verified-custody/dist/index.js.map";
const outDir = "map_all_extract";

fs.mkdirSync(outDir, { recursive: true });

const map = JSON.parse(fs.readFileSync(mapPath, "utf8"));

function safeName(p) {
  return p.replace(/\.\.\//g, "").replace(/[\/\\]/g, "__");
}

let written = 0;

for (let i = 0; i < (map.sources?.length || 0); i++) {
  const src = map.sources[i];
  const content = map.sourcesContent?.[i];
  if (!content) continue;

  const outPath = `${outDir}/${safeName(src)}.txt`;
  fs.writeFileSync(outPath, content, "utf8");
  written++;
}

console.log(`Extracted ${written} source files to ${outDir}/`);
