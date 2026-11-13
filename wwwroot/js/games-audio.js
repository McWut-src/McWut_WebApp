(function () {
    "use strict";

    window.McWutGames = window.McWutGames || {};

    var restartBtn = document.getElementById("game-restart-btn");
    var muteBtn = document.getElementById("game-mute-btn");

    var muted = false;
    try {
        muted = localStorage.getItem("mcwut-game-mute") === "1";
    } catch (e) {}

    function renderControlIcons() {
        if (restartBtn && window.mcwutIcon) {
            restartBtn.innerHTML = window.mcwutIcon("refresh");
        }
        if (muteBtn && window.mcwutIcon) {
            muteBtn.innerHTML = window.mcwutIcon(muted ? "mute" : "volume");
            muteBtn.setAttribute("aria-pressed", muted ? "true" : "false");
            var label = muted ? "Unmute sound" : "Mute sound";
            muteBtn.title = label;
            muteBtn.setAttribute("aria-label", label);
        }
    }
    renderControlIcons();

    if (muteBtn) {
        muteBtn.addEventListener("click", function () {
            muted = !muted;
            try {
                if (muted) {
                    localStorage.setItem("mcwut-game-mute", "1");
                } else {
                    localStorage.removeItem("mcwut-game-mute");
                }
            } catch (e) {}
            renderControlIcons();
            if (muted && typeof wwSilenceAudio === "function") {
                wwSilenceAudio();
            }
            if (cbGame) {
                cbGame.setMuted(muted);
            }
            if (window.mmGame) {
                window.mmGame.setMuted(muted);
            }
            if (window.McWutGames && window.McWutGames.godzilla && typeof window.McWutGames.godzilla.setMuted === "function") {
                window.McWutGames.godzilla.setMuted(muted);
            }
            if (window.McWutGames && window.McWutGames.subwaySurfer && typeof window.McWutGames.subwaySurfer.setMuted === "function") {
                window.McWutGames.subwaySurfer.setMuted(muted);
            }
        });
    }

    // --- Synthesized Arcade Audio ---
    var audioCtx = null;
    function ensureAudio() {
        if (muted) return null;
        var Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return null;
        try {
            if (!audioCtx) {
                audioCtx = new Ctx();
            }
            if (audioCtx.state === "suspended") {
                audioCtx.resume().catch(function () {});
            }
            return audioCtx;
        } catch (e) {
            return null;
        }
    }

    function playPerfectSound(comboCount) {
        var ctx = ensureAudio();
        if (!ctx) return;
        try {
            // Pentatonic ascending scale for combos
            var scale = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51, 1567.98, 1760.0];
            var idx = Math.min(Math.max(comboCount - 1, 0), scale.length - 1);
            var freq = scale[idx];
            var now = ctx.currentTime;

            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.type = "triangle";
            osc.frequency.setValueAtTime(freq, now);
            osc.frequency.exponentialRampToValueAtTime(freq * 1.015, now + 0.18);
            gain.gain.setValueAtTime(0.11, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.28);

            // Harmonic shimmer on 3+ combo
            if (comboCount >= 3) {
                var osc2 = ctx.createOscillator();
                var gain2 = ctx.createGain();
                osc2.type = "sine";
                osc2.frequency.setValueAtTime(freq * 1.5, now + 0.03);
                gain2.gain.setValueAtTime(0.06, now + 0.03);
                gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
                osc2.connect(gain2);
                gain2.connect(ctx.destination);
                osc2.start(now + 0.03);
                osc2.stop(now + 0.34);
            }
        } catch (e) {}
    }

    function playSliceSound(ratio) {
        var ctx = ensureAudio();
        if (!ctx) return;
        try {
            var now = ctx.currentTime;
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.type = "sine";
            var baseFreq = 260 + Math.max(0.1, ratio) * 160;
            osc.frequency.setValueAtTime(baseFreq, now);
            osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.65, now + 0.12);
            gain.gain.setValueAtTime(0.09, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.13);
        } catch (e) {}
    }

    function playGameOverSound() {
        var ctx = ensureAudio();
        if (!ctx) return;
        try {
            var now = ctx.currentTime;
            var notes = [349.23, 311.13, 261.63, 196.0];
            notes.forEach(function (freq, i) {
                var osc = ctx.createOscillator();
                var gain = ctx.createGain();
                osc.type = "sawtooth";
                var t = now + i * 0.09;
                osc.frequency.setValueAtTime(freq, t);
                gain.gain.setValueAtTime(0.05, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(t);
                osc.stop(t + 0.22);
            });
        } catch (e) {}
    }

    function playNewRecordFanfare() {
        var ctx = ensureAudio();
        if (!ctx) return;
        try {
            var now = ctx.currentTime;
            var notes = [523.25, 659.25, 783.99, 1046.5];
            notes.forEach(function (freq, i) {
                var osc = ctx.createOscillator();
                var gain = ctx.createGain();
                osc.type = "triangle";
                var t = now + i * 0.08;
                osc.frequency.setValueAtTime(freq, t);
                gain.gain.setValueAtTime(0.09, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(t);
                osc.stop(t + 0.32);
            });
        } catch (e) {}
    }



    function setMuted(val) {
        muted = !!val;
        try {
            if (muted) {
                localStorage.setItem("mcwut-game-mute", "1");
            } else {
                localStorage.removeItem("mcwut-game-mute");
            }
        } catch (e) {}
        renderControlIcons();
        if (muted && typeof wwSilenceAudio === "function") {
            wwSilenceAudio();
        } else if (muted && window.McWutGames && window.McWutGames.wackyWheels && typeof window.McWutGames.wackyWheels.wwSilenceAudio === "function") {
            window.McWutGames.wackyWheels.wwSilenceAudio();
        }
        if (typeof cbGame !== "undefined" && cbGame && typeof cbGame.setMuted === "function") {
            cbGame.setMuted(muted);
        } else if (window.McWutGames && window.McWutGames.breakout && typeof window.McWutGames.breakout.cbSetMuted === "function") {
            window.McWutGames.breakout.cbSetMuted(muted);
        }
        if (typeof hxGame !== "undefined" && hxGame && typeof hxGame.setMuted === "function") {
            hxGame.setMuted(muted);
        } else if (window.McWutGames && window.McWutGames.hextris && typeof window.McWutGames.hextris.hxSetMuted === "function") {
            window.McWutGames.hextris.hxSetMuted(muted);
        }
        if (window.McWutGames && window.McWutGames.godzilla && typeof window.McWutGames.godzilla.setMuted === "function") {
            window.McWutGames.godzilla.setMuted(muted);
        }
        if (window.McWutGames && window.McWutGames.subwaySurfer && typeof window.McWutGames.subwaySurfer.setMuted === "function") {
            window.McWutGames.subwaySurfer.setMuted(muted);
        }
    }

    window.McWutGames.audio = {
        ensureAudio: ensureAudio,
        getAudioCtx: function () { return audioCtx; },
        isMuted: function () { return muted; },
        setMuted: setMuted,
        toggleMuted: function () { setMuted(!muted); },
        renderControlIcons: renderControlIcons,
        playPerfectSound: playPerfectSound,
        playSliceSound: playSliceSound,
        playGameOverSound: playGameOverSound,
        playNewRecordFanfare: playNewRecordFanfare
    };

    window.ensureAudio = ensureAudio;
    window.playPerfectSound = playPerfectSound;
    window.playSliceSound = playSliceSound;
    window.playGameOverSound = playGameOverSound;
    window.playNewRecordFanfare = playNewRecordFanfare;
    window.renderControlIcons = renderControlIcons;
    try {
        Object.defineProperty(window, "muted", {
            get: function () { return muted; },
            set: function (v) { setMuted(v); },
            configurable: true
        });
    } catch (e) {
        window.muted = muted;
    }
})();
