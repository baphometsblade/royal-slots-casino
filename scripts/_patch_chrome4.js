const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'shared', 'chrome-styles.js');
let src = fs.readFileSync(filePath, 'utf8');

const insertAfter = 'primal_vault:';
const insertIdx = src.indexOf(insertAfter);
if (insertIdx === -1) {
  console.error('ERROR: Could not find "primal_vault:" in chrome-styles.js');
  process.exit(1);
}

// Find end of that line
const lineEnd = src.indexOf('\n', insertIdx);
if (lineEnd === -1) {
  console.error('ERROR: No newline after primal_vault line');
  process.exit(1);
}

const newEntries = `
    fortune_bazaar:    'arcadeforge',
    celestial_bazaar:  'vaultx',
    titan_forge:       'ironreel',
    mammoth_riches:    'ironreel',
    koi_ascension:     'celestial',
    pharaoh_collect:   'vaultx',`;

const updated = src.slice(0, lineEnd) + newEntries + src.slice(lineEnd);
fs.writeFileSync(filePath, updated, 'utf8');
console.log('SUCCESS: 6 chrome style entries inserted after primal_vault in shared/chrome-styles.js');
