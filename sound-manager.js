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
