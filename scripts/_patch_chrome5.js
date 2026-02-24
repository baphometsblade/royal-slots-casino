const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, '..', 'shared', 'chrome-styles.js');
let src = fs.readFileSync(filePath, 'utf8');
const anchor = 'pharaoh_collect:';
const anchorIdx = src.indexOf(anchor);
if (anchorIdx === -1) { console.error('ERROR: pharaoh_collect not found'); process.exit(1); }
const NL = String.fromCharCode(10);
let lineEnd = anchorIdx;
while (lineEnd < src.length && src[lineEnd] !== NL) lineEnd++;
const newEntries = [
  "    midnight_oasis:    'vaultx',",
  "    neptune_storm:     'novaspin',",
  "    twin_dragons:      'celestial',",
  "    mirror_palace:     'phantomworks',",
  "    golden_vault:      'vaultx',",
  "    thunder_jackpot:   'novaspin',",
].join(NL) + NL;
const newSrc = src.slice(0, lineEnd + 1) + newEntries + src.slice(lineEnd + 1);
fs.writeFileSync(filePath, newSrc, 'utf8');
console.log('Done: 6 chrome style entries inserted after pharaoh_collect');