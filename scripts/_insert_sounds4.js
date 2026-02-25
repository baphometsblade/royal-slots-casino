const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'sound-manager.js');
const content = fs.readFileSync(filePath, 'utf8');

// Find the respin_lock break line and insert after it
// We look for the break; that closes the respin_lock case, then the switch closing }
const lines = content.split('\n');

let respinBreakIdx = -1;
let inRespinLock = false;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("case 'respin_lock':")) {
        inRespinLock = true;
    }
    if (inRespinLock && lines[i].trim() === 'break;') {
        respinBreakIdx = i;
        break;
    }
}

if (respinBreakIdx === -1) {
    console.error('ERROR: Could not find respin_lock break line');
    process.exit(1);
}

console.log(`Found respin_lock break at line ${respinBreakIdx + 1}`);

const newCases = `
                case 'wheel_spin':
                    // Prize wheel spins — rapid tick accelerating
                    {
                        var tickCount = 8;
                        for (var i = 0; i < tickCount; i++) {
                            (function(idx) {
                                var osc = audioContext.createOscillator();
                                var gain = audioContext.createGain();
                                osc.type = 'triangle';
                                osc.connect(gain);
                                gain.connect(audioContext.destination);
                                var delay = idx * Math.max(0.02, 0.12 - idx * 0.012);
                                osc.frequency.value = 440 + idx * 30;
                                gain.gain.setValueAtTime(0.10 * soundVolume, now + delay);
                                gain.gain.exponentialRampToValueAtTime(0.001 * soundVolume, now + delay + 0.06);
                                osc.start(now + delay);
                                osc.stop(now + delay + 0.07);
                            })(i);
                        }
                    }
                    break;

                case 'colossal_land':
                    // Giant symbol lands — deep thud + shimmer
                    {
                        var osc = audioContext.createOscillator();
                        var gain = audioContext.createGain();
                        osc.type = 'sine';
                        osc.connect(gain);
                        gain.connect(audioContext.destination);
                        osc.frequency.setValueAtTime(80, now);
                        osc.frequency.exponentialRampToValueAtTime(40, now + 0.18);
                        gain.gain.setValueAtTime(0.35 * soundVolume, now);
                        gain.gain.exponentialRampToValueAtTime(0.001 * soundVolume, now + 0.25);
                        osc.start(now);
                        osc.stop(now + 0.26);
                    }
                    break;

                case 'collect_tick':
                    // Symbol collected — ascending pip
                    {
                        var osc = audioContext.createOscillator();
                        var gain = audioContext.createGain();
                        osc.type = 'sine';
                        osc.connect(gain);
                        gain.connect(audioContext.destination);
                        osc.frequency.setValueAtTime(880, now);
                        osc.frequency.exponentialRampToValueAtTime(1320, now + 0.06);
                        gain.gain.setValueAtTime(0.12 * soundVolume, now);
                        gain.gain.exponentialRampToValueAtTime(0.001 * soundVolume, now + 0.09);
                        osc.start(now);
                        osc.stop(now + 0.10);
                    }
                    break;`;

// Insert after the respin_lock break line
lines.splice(respinBreakIdx + 1, 0, newCases);

const newContent = lines.join('\n');
fs.writeFileSync(filePath, newContent, 'utf8');

console.log('Successfully inserted 3 new sound cases after respin_lock break.');
