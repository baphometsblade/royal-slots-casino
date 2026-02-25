const fs = require('fs');
const path = require('path');

const filePath = path.join('C:/created games/Casino/js/win-logic.js');
const content = fs.readFileSync(filePath, 'utf8');

// The anchor: the closing } of the respin block immediately before the scatterCount else if
const anchor = `                } else if (scatterCount >= fullScatterThreshold) {`;

const insertion = `                } else if (game.bonusType === 'prize_wheel') {
                    if (typeof triggerPrizeWheel === 'function') {
                        playSound('freespin');
                        message = \`PRIZE WHEEL! +\$\${scatterWin.toLocaleString()}!\`;
                        triggerPrizeWheel(game);
                    }
`;

if (!content.includes(anchor)) {
    console.error('ERROR: anchor text not found — file may have changed.');
    process.exit(1);
}

if (content.includes("game.bonusType === 'prize_wheel'")) {
    console.log('prize_wheel dispatch already present — nothing to do.');
    process.exit(0);
}

const patched = content.replace(anchor, insertion + anchor);
fs.writeFileSync(filePath, patched, 'utf8');
console.log('Patch applied successfully.');
