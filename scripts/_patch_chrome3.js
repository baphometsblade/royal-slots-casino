const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'shared', 'chrome-styles.js');
let content = fs.readFileSync(filePath, 'utf8');

const anchor = "aztec_ascent:      'goldenedge',";
const anchorIdx = content.indexOf(anchor);
if (anchorIdx === -1) {
    console.error('ERROR: Could not find aztec_ascent anchor in chrome-styles.js');
    process.exit(1);
}

// Find the end of the anchor line
const lineEnd = content.indexOf('\n', anchorIdx);
if (lineEnd === -1) {
    console.error('ERROR: Could not find newline after anchor');
    process.exit(1);
}

const newEntries = `
    diamond_falls:     'novaspin',
    dragon_tumble:     'phantomworks',
    golden_cascade:    'ironreel',
    thunder_reel:      'novaspin',
    crystal_veil:      'phantomworks',
    primal_vault:      'ironreel',`;

const newContent = content.slice(0, lineEnd) + newEntries + content.slice(lineEnd);

fs.writeFileSync(filePath, newContent, 'utf8');
console.log('SUCCESS: 6 chrome style entries added after aztec_ascent in shared/chrome-styles.js');
