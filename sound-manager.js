// ═══════════════════════════════════════════════════════════════════════════
// Casino Sound Manager - Standalone Sound System Module
// ═══════════════════════════════════════════════════════════════════════════
// Load via <script src="sound-manager.js"></script> before app.js.
// Exposes global functions: getAudioContext, playSound, toggleSound,
// updateSoundButton, setSoundVolume  and the SoundManager namespace.
// ═══════════════════════════════════════════════════════════════════════════

(function () {
    'use strict';

    // ── State ────────────────────────────────────────────────────────────
    var soundEnabled = localStorage.getItem('soundEnabled') !== 'false';

    var soundVolume = (function () {
        var stored = parseFloat(localStorage.getItem('casinoSoundVolume'));
        return isNaN(stored) ? 0.5 : Math.max(0.0, Math.min(1.0, stored));
    })();

    // Shared AudioContext - reuse a single instance to avoid browser limits
    var sharedAudioContext = null;

    // ── AudioContext Helper ──────────────────────────────────────────────
    function getAudioContext() {
        if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
            sharedAudioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (sharedAudioContext.state === 'suspended') {
            sharedAudioContext.resume();
        }
        return sharedAudioContext;
    }

    // ── Play Sound ──────────────────────────────────────────────────────
    // ── Provider SFX Themes ───────────────────────────────────────────────
    var PROVIDER_SFX_THEMES = {
        novaspin: {
            spin:   { waveType: 'sine',     freqs: [800, 1200, 1600],          dur: 0.10, spacing: 0.035 },
            win:    { waveType: 'sine',     freqs: [880, 1108, 1318],          dur: 0.18, spacing: 0.06  },
            bigwin: { waveType: 'sine',     freqs: [880, 1108, 1318, 1760],    dur: 0.35, spacing: 0.055 },
        },
        celestial: {
            spin:   { waveType: 'sine',     freqs: [523, 659, 784],            dur: 0.18, spacing: 0.07  },
            win:    { waveType: 'sine',     freqs: [523, 659, 784, 1047],      dur: 0.38, spacing: 0.09  },
            bigwin: { waveType: 'sine',     freqs: [523, 659, 784, 988, 1047], dur: 0.55, spacing: 0.09  },
        },
        ironreel: {
            spin:   { waveType: 'triangle', freqs: [220, 277, 330],            dur: 0.18, spacing: 0.06  },
            win:    { waveType: 'triangle', freqs: [220, 330, 440],            dur: 0.35, spacing: 0.09  },
            bigwin: { waveType: 'triangle', freqs: [110, 165, 220, 330],       dur: 0.55, spacing: 0.09  },
        },
        goldenedge: {
            spin:   { waveType: 'sine',     freqs: [1046, 1318, 1568],          dur: 0.08, spacing: 0.04  },
            win:    { waveType: 'sine',     freqs: [1047, 1319, 1568, 2093],    dur: 0.22, spacing: 0.06  },
            bigwin: { waveType: 'sine',     freqs: [1047, 1319, 1568, 2093, 2637], dur: 0.40, spacing: 0.055 },
        },
        vaultx: {
            spin:   { waveType: 'sawtooth', freqs: [110, 165],                 dur: 0.14, spacing: 0.07  },
            win:    { waveType: 'sawtooth', freqs: [165, 220, 277],            dur: 0.28, spacing: 0.07  },
            bigwin: { waveType: 'sawtooth', freqs: [110, 165, 220, 277],       dur: 0.45, spacing: 0.07  },
        },
        solstice: {
            spin:   { waveType: 'sine',     freqs: [293, 329, 392],            dur: 0.22, spacing: 0.09  },
            win:    { waveType: 'sine',     freqs: [293, 349, 440, 587],       dur: 0.45, spacing: 0.11  },
            bigwin: { waveType: 'sine',     freqs: [220, 293, 349, 440, 587],  dur: 0.65, spacing: 0.11  },
        },
        phantomworks: {
            spin:   { waveType: 'square',   freqs: [233, 277],                 dur: 0.16, spacing: 0.08  },
            win:    { waveType: 'square',   freqs: [233, 277, 311],            dur: 0.32, spacing: 0.08  },
            bigwin: { waveType: 'square',   freqs: [185, 233, 277, 311],       dur: 0.50, spacing: 0.08  },
        },
        arcadeforge: {
            spin:   { waveType: 'square',   freqs: [440, 660],                 dur: 0.07, spacing: 0.04  },
            win:    { waveType: 'square',   freqs: [440, 554, 660, 880],       dur: 0.16, spacing: 0.045 },
            bigwin: { waveType: 'square',   freqs: [440, 554, 660, 880, 1108], dur: 0.28, spacing: 0.045 },
        },
    };

    function playProviderSound(soundType, game) {
        var key   = (typeof getGameChromeStyle === 'function' && game) ? getGameChromeStyle(game) : '';
        var theme = PROVIDER_SFX_THEMES[key];
        if (!theme || !theme[soundType]) { playSound(soundType); return; }
        if (!soundEnabled) return;
        try {
            var audioContext = getAudioContext();
            var profile = theme[soundType];
            var now = audioContext.currentTime;
            profile.freqs.forEach(function(freq, i) {
                var osc  = audioContext.createOscillator();
                var gain = audioContext.createGain();
                osc.type = profile.waveType;
                osc.connect(gain);
                gain.connect(audioContext.destination);
                osc.frequency.value = freq;
                var t = now + i * profile.spacing;
                gain.gain.setValueAtTime(0.18 * soundVolume, t);
                gain.gain.exponentialRampToValueAtTime(0.001 * soundVolume, t + profile.dur);
                osc.start(t);
                osc.stop(t + profile.dur + 0.02);
            });
        } catch(e) { /* ignore audio errors in headless environments */ }
    }

    function playSound(type) {
        if (!soundEnabled) return;

        try {
            var audioContext = getAudioContext();
            var gainNode = audioContext.createGain();
            gainNode.connect(audioContext.destination);

            var now = audioContext.currentTime;

            switch (type) {
                case 'spin':
                    // Classic spin start sound - rising pitch
                    {
                        var osc = audioContext.createOscillator();
                        osc.connect(gainNode);
                        gainNode.gain.setValueAtTime(0.3 * soundVolume, now);
                        gainNode.gain.exponentialRampToValueAtTime(0.01 * soundVolume, now + 0.15);
                        osc.frequency.setValueAtTime(300, now);
                        osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);
                        osc.start(now);
                        osc.stop(now + 0.15);
                    }
                    break;

                case 'click':
                    // UI button click - short percussive sound
                    {
                        var osc = audioContext.createOscillator();
                        osc.connect(gainNode);
                        gainNode.gain.setValueAtTime(0.15 * soundVolume, now);
                        gainNode.gain.exponentialRampToValueAtTime(0.01 * soundVolume, now + 0.05);
                        osc.frequency.value = 1200;
                        osc.start(now);
                        osc.stop(now + 0.05);
                    }
                    break;

                case 'win':
                    // Regular win - ascending two notes
                    {
                        [523, 659].forEach(function (freq, i) {
                            var osc = audioContext.createOscillator();
                            var gain = audioContext.createGain();
                            osc.connect(gain);
                            gain.connect(audioContext.destination);
                            osc.frequency.value = freq;
                            gain.gain.setValueAtTime(0.2 * soundVolume, now + i * 0.1);
                            gain.gain.exponentialRampToValueAtTime(0.01 * soundVolume, now + 0.3 + i * 0.1);
                            osc.start(now + i * 0.1);
                            osc.stop(now + 0.3 + i * 0.1);
                        });
                    }
                    break;

                case 'bigwin':
                    // Big win - triumphant chord with flourish
                    {
                        var freqs = [523, 659, 784, 988]; // C-E-G-B chord
                        freqs.forEach(function (freq, i) {
                            var osc = audioContext.createOscillator();
                            var gain = audioContext.createGain();
                            osc.connect(gain);
                            gain.connect(audioContext.destination);
                            osc.frequency.value = freq;
                            gain.gain.setValueAtTime(0.15 * soundVolume, now + i * 0.08);
                            gain.gain.exponentialRampToValueAtTime(0.01 * soundVolume, now + 0.8 + i * 0.08);
                            osc.start(now + i * 0.08);
                            osc.stop(now + 0.8 + i * 0.08);
                        });
                    }
                    break;

                case 'megawin':
                    // Mega win - dramatic ascending sweep with multiple flourishes
                    {
                        var sweepFreqs = [440, 554, 659, 784, 988, 1047]; // A-C#-E-G-B-C
                        sweepFreqs.forEach(function (freq, i) {
                            var osc = audioContext.createOscillator();
                            var gain = audioContext.createGain();
                            osc.connect(gain);
                            gain.connect(audioContext.destination);
                            osc.frequency.value = freq;
                            gain.gain.setValueAtTime(0.1 * soundVolume, now + i * 0.06);
                            gain.gain.exponentialRampToValueAtTime(0.01 * soundVolume, now + 1.2 + i * 0.06);
                            osc.start(now + i * 0.06);
                            osc.stop(now + 1.2 + i * 0.06);
                        });
                    }
                    break;

                case 'freespin':
                    // Free spin activated - magical ascending three-note sequence
                    {
                        var freqs = [587, 659, 784]; // D-E-G
                        freqs.forEach(function (freq, i) {
                            var osc = audioContext.createOscillator();
                            var gain = audioContext.createGain();
                            osc.connect(gain);
                            gain.connect(audioContext.destination);
                            osc.frequency.value = freq;
                            gain.gain.setValueAtTime(0.2 * soundVolume, now + i * 0.15);
                            gain.gain.exponentialRampToValueAtTime(0.01 * soundVolume, now + 0.5 + i * 0.15);
                            osc.start(now + i * 0.15);
                            osc.stop(now + 0.5 + i * 0.15);
                        });
                    }
                    break;

                case 'toggle':
                    // Sound toggle - neutral beep
                    {
                        var osc = audioContext.createOscillator();
                        osc.connect(gainNode);
                        gainNode.gain.setValueAtTime(0.15 * soundVolume, now);
                        gainNode.gain.exponentialRampToValueAtTime(0.01 * soundVolume, now + 0.1);
                        osc.frequency.value = 700;
                        osc.start(now);
                        osc.stop(now + 0.1);
                    }
                    break;

                case 'scatter':
                    // Scatter symbol - magical glimmer sound
                    {
                        var osc = audioContext.createOscillator();
                        osc.connect(gainNode);
                        gainNode.gain.setValueAtTime(0.15 * soundVolume, now);
                        gainNode.gain.exponentialRampToValueAtTime(0.01 * soundVolume, now + 0.25);
                        osc.frequency.setValueAtTime(1200, now);
                        osc.frequency.exponentialRampToValueAtTime(1800, now + 0.25);
                        osc.start(now);
                        osc.stop(now + 0.25);
                    }
                    break;

                case 'bonus':
                    // Bonus feature triggered - celebratory sound
                    {
                        var freqs = [659, 784, 880]; // E-G-A
                        freqs.forEach(function (freq, i) {
                            var osc = audioContext.createOscillator();
                            var gain = audioContext.createGain();
                            osc.connect(gain);
                            gain.connect(audioContext.destination);
                            osc.frequency.value = freq;
                            gain.gain.setValueAtTime(0.15 * soundVolume, now + i * 0.12);
                            gain.gain.exponentialRampToValueAtTime(0.01 * soundVolume, now + 0.6 + i * 0.12);
                            osc.start(now + i * 0.12);
                            osc.stop(now + 0.6 + i * 0.12);
                        });
                    }
                    break;

                case 'lose':
                    // Lose/no win - descending two-note sequence
                    {
                        [440, 330].forEach(function (freq, i) {
                            var osc = audioContext.createOscillator();
                            var gain = audioContext.createGain();
                            osc.connect(gain);
                            gain.connect(audioContext.destination);
                            osc.frequency.value = freq;
                            gain.gain.setValueAtTime(0.1 * soundVolume, now + i * 0.15);
                            gain.gain.exponentialRampToValueAtTime(0.01 * soundVolume, now + 0.25 + i * 0.15);
                            osc.start(now + i * 0.15);
                            osc.stop(now + 0.25 + i * 0.15);
                        });
                    }
                    break;
            }
        } catch (e) {
            // Silently ignore audio errors in headless/automated environments
        }
    }

    // ── Toggle Sound On/Off ─────────────────────────────────────────────
    function toggleSound() {
        soundEnabled = !soundEnabled;
        localStorage.setItem('soundEnabled', soundEnabled);
        var btn = document.getElementById('soundToggle');
        if (btn) {
            btn.textContent = soundEnabled ? '\u{1F50A}' : '\u{1F507}';
            btn.title = soundEnabled ? 'Sound ON' : 'Sound OFF';
        }

        if (soundEnabled) {
            playSound('toggle');
        }
    }

    // ── Update Sound Button State ───────────────────────────────────────
    function updateSoundButton() {
        var btn = document.getElementById('soundToggle');
        if (btn) {
            btn.textContent = soundEnabled ? '\u{1F50A}' : '\u{1F507}';
            btn.title = soundEnabled ? 'Sound ON' : 'Sound OFF';
        }
    }

    // ── Volume Control (new feature) ────────────────────────────────────
    function setSoundVolume(vol) {
        soundVolume = Math.max(0.0, Math.min(1.0, parseFloat(vol) || 0));
        localStorage.setItem('casinoSoundVolume', soundVolume);
    }

    // ── Expose as globals (backward compatible) ─────────────────────────
    window.getAudioContext   = getAudioContext;
    window.playSound         = playSound;
    window.playProviderSound = playProviderSound;
    window.toggleSound       = toggleSound;
    window.updateSoundButton = updateSoundButton;
    window.setSoundVolume    = setSoundVolume;

    // ── Also expose via SoundManager namespace ──────────────────────────
    window.SoundManager = {
        getAudioContext:   getAudioContext,
        playSound:         playSound,
        toggleSound:       toggleSound,
        updateSoundButton: updateSoundButton,
        setSoundVolume:    setSoundVolume,
        playProviderSound:   playProviderSound,

        /** Read-only accessors for current state */
        get soundEnabled() { return soundEnabled; },
        get soundVolume()  { return soundVolume; },

        /** Allow external code to set enabled state directly */
        setSoundEnabled: function (val) {
            soundEnabled = !!val;
            localStorage.setItem('soundEnabled', soundEnabled);
            updateSoundButton();
        }
    };
})();
