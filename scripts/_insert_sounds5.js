const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'sound-manager.js');
const src = fs.readFileSync(filePath, 'utf8');

// Find the collect_tick block's break; followed by the closing } of the switch
// We'll search for the exact sequence: the break; that ends collect_tick, then the closing brace
const searchStr = `                    break;\n            }`;

const insertStr = `                    break;\n` +
`\n` +
`                case 'wild_reel':\n` +
`                    // Wild reel sweep — descending shimmer\n` +
`                    {\n` +
`                        var osc = audioContext.createOscillator();\n` +
`                        var gain = audioContext.createGain();\n` +
`                        osc.type = 'sine';\n` +
`                        osc.connect(gain);\n` +
`                        gain.connect(audioContext.destination);\n` +
`                        osc.frequency.setValueAtTime(1200, now);\n` +
`                        osc.frequency.exponentialRampToValueAtTime(300, now + 0.22);\n` +
`                        gain.gain.setValueAtTime(0.18 * soundVolume, now);\n` +
`                        gain.gain.exponentialRampToValueAtTime(0.001 * soundVolume, now + 0.28);\n` +
`                        osc.start(now);\n` +
`                        osc.stop(now + 0.29);\n` +
`                    }\n` +
`                    break;\n` +
`\n` +
`                case 'both_ways_hit':\n` +
`                    // Both-ways reverse win — mirror ping\n` +
`                    {\n` +
`                        [660, 880].forEach(function(freq, i) {\n` +
`                            var osc = audioContext.createOscillator();\n` +
`                            var gain = audioContext.createGain();\n` +
`                            osc.type = 'triangle';\n` +
`                            osc.connect(gain);\n` +
`                            gain.connect(audioContext.destination);\n` +
`                            osc.frequency.value = freq;\n` +
`                            gain.gain.setValueAtTime(0.14 * soundVolume, now + i * 0.05);\n` +
`                            gain.gain.exponentialRampToValueAtTime(0.001 * soundVolume, now + 0.15 + i * 0.05);\n` +
`                            osc.start(now + i * 0.05);\n` +
`                            osc.stop(now + 0.16 + i * 0.05);\n` +
`                        });\n` +
`                    }\n` +
`                    break;\n` +
`\n` +
`                case 'jackpot_hit':\n` +
`                    // Random jackpot — triumphant ascending fanfare\n` +
`                    {\n` +
`                        [261, 329, 392, 523, 659, 784].forEach(function(freq, i) {\n` +
`                            var osc = audioContext.createOscillator();\n` +
`                            var gain = audioContext.createGain();\n` +
`                            osc.type = 'sine';\n` +
`                            osc.connect(gain);\n` +
`                            gain.connect(audioContext.destination);\n` +
`                            osc.frequency.value = freq;\n` +
`                            gain.gain.setValueAtTime(0.22 * soundVolume, now + i * 0.08);\n` +
`                            gain.gain.exponentialRampToValueAtTime(0.001 * soundVolume, now + 0.30 + i * 0.08);\n` +
`                            osc.start(now + i * 0.08);\n` +
`                            osc.stop(now + 0.32 + i * 0.08);\n` +
`                        });\n` +
`                    }\n` +
`                    break;\n` +
`            }`;

// Count occurrences to make sure we have exactly one match
const occurrences = src.split(searchStr).length - 1;
if (occurrences !== 1) {
    console.error(`ERROR: Expected exactly 1 occurrence of search string, found ${occurrences}`);
    process.exit(1);
}

const result = src.replace(searchStr, insertStr);

if (result === src) {
    console.error('ERROR: No replacement was made — search string not found.');
    process.exit(1);
}

fs.writeFileSync(filePath, result, 'utf8');
console.log('SUCCESS: 3 new sound cases inserted after collect_tick break;');
