const fs = require('fs');
const path = 'C:/created games/Casino/sound-manager.js';
const src = fs.readFileSync(path, 'utf8');

// File uses CRLF line endings
const NL = '\r\n';

const needle = "                    break;" + NL + "            }" + NL + "        } catch (e) {";

const newCases = [
    "",
    "                case 'wild_mult':",
    "                    // Multiplier wild activates \u2014 quick pop + ascending sine",
    "                    {",
    "                        var osc = audioContext.createOscillator();",
    "                        var gain = audioContext.createGain();",
    "                        osc.type = 'sine';",
    "                        osc.connect(gain);",
    "                        gain.connect(audioContext.destination);",
    "                        osc.frequency.setValueAtTime(440, now);",
    "                        osc.frequency.exponentialRampToValueAtTime(1760, now + 0.10);",
    "                        gain.gain.setValueAtTime(0.20 * soundVolume, now);",
    "                        gain.gain.exponentialRampToValueAtTime(0.001 * soundVolume, now + 0.18);",
    "                        osc.start(now);",
    "                        osc.stop(now + 0.20);",
    "                    }",
    "                    break;",
    "",
    "                case 'mult_rise':",
    "                    // Increasing multiplier ticks up \u2014 short bright ping",
    "                    {",
    "                        var osc = audioContext.createOscillator();",
    "                        var gain = audioContext.createGain();",
    "                        osc.type = 'triangle';",
    "                        osc.connect(gain);",
    "                        gain.connect(audioContext.destination);",
    "                        osc.frequency.setValueAtTime(660, now);",
    "                        osc.frequency.exponentialRampToValueAtTime(990, now + 0.08);",
    "                        gain.gain.setValueAtTime(0.15 * soundVolume, now);",
    "                        gain.gain.exponentialRampToValueAtTime(0.001 * soundVolume, now + 0.12);",
    "                        osc.start(now);",
    "                        osc.stop(now + 0.13);",
    "                    }",
    "                    break;",
    "",
    "                case 'buy_feature':",
    "                    // Buy Feature purchased \u2014 cash register chime",
    "                    {",
    "                        [523, 784, 1047, 1568].forEach(function(freq, i) {",
    "                            var osc = audioContext.createOscillator();",
    "                            var gain = audioContext.createGain();",
    "                            osc.type = 'sine';",
    "                            osc.connect(gain);",
    "                            gain.connect(audioContext.destination);",
    "                            osc.frequency.value = freq;",
    "                            gain.gain.setValueAtTime(0.16 * soundVolume, now + i * 0.06);",
    "                            gain.gain.exponentialRampToValueAtTime(0.001 * soundVolume, now + 0.25 + i * 0.06);",
    "                            osc.start(now + i * 0.06);",
    "                            osc.stop(now + 0.26 + i * 0.06);",
    "                        });",
    "                    }",
    "                    break;"
].join(NL);

const replacement = "                    break;" + newCases + NL + "            }" + NL + "        } catch (e) {";

const occurrences = src.split(needle).length - 1;
console.log('Occurrences of needle found:', occurrences);

if (occurrences !== 1) {
    console.error('ERROR: Expected exactly 1 occurrence, found ' + occurrences);
    process.exit(1);
}

const out = src.replace(needle, replacement);
fs.writeFileSync(path, out, 'utf8');
console.log('File written successfully.');
