// McWut Messages Audio Synthesizer & Audio Player Helper
(() => {
    const SOUND_KEY = "mcwut-msg-sound";
    let audioCtx = null;

    function soundActive() {
        try {
            return localStorage.getItem(SOUND_KEY) !== "0";
        } catch {
            return true;
        }
    }

    function ensureAudioContext() {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) {
            return null;
        }
        if (!audioCtx) {
            try {
                audioCtx = new Ctx();
            } catch {
                return null;
            }
        }
        if (audioCtx.state === "suspended") {
            audioCtx.resume().catch(() => {});
        }
        return audioCtx;
    }

    function playChime(kind) {
        if (!soundActive()) {
            return;
        }
        if (window.mcwut && typeof window.mcwut.playChime === "function") {
            window.mcwut.playChime(kind);
            return;
        }
        const ctx = ensureAudioContext();
        if (!ctx || ctx.state !== "running") {
            return;
        }
        try {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = kind === "send" ? "triangle" : "sine";
            if (kind === "send") {
                osc.frequency.setValueAtTime(523.25, now);
                osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.08);
                gain.gain.setValueAtTime(0.07, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.14);
            } else {
                osc.frequency.setValueAtTime(783.99, now);
                osc.frequency.setValueAtTime(1046.5, now + 0.07);
                gain.gain.setValueAtTime(0.09, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.19);
            }
        } catch {
            /* Ignore audio synthesis issues */
        }
    }

    function paintSoundButton(soundBtn, iconFn) {
        if (!soundBtn) {
            return;
        }
        const on = soundActive();
        soundBtn.setAttribute("aria-pressed", on ? "true" : "false");
        soundBtn.classList.toggle("active", on);
        const iconSvg = typeof iconFn === "function" ? iconFn(on ? "volume" : "mute") : "";
        soundBtn.innerHTML = `${iconSvg}<span>${on ? "Sound on" : "Sound off"}</span>`;
    }

    function toggleSound(soundBtn, iconFn) {
        const next = !soundActive();
        try { localStorage.setItem(SOUND_KEY, next ? "1" : "0"); } catch {}
        paintSoundButton(soundBtn, iconFn);
        if (next) {
            ensureAudioContext();
            playChime("send");
        }
        return next;
    }

    function buildAudioPlayer(attachment, { icon, formatSec }) {
        const wrap = document.createElement("div");
        wrap.className = "message-audio";

        const audio = document.createElement("audio");
        audio.preload = "metadata";
        audio.src = `/api/files/${encodeURIComponent(attachment.fileId)}/content?preview=true`;

        const playBtn = document.createElement("button");
        playBtn.type = "button";
        playBtn.className = "message-audio-play";
        playBtn.title = "Play voice note";
        playBtn.setAttribute("aria-label", "Play voice note");
        playBtn.innerHTML = icon("play");

        const seek = document.createElement("input");
        seek.type = "range";
        seek.className = "message-audio-seek";
        seek.min = "0";
        seek.max = "100";
        seek.value = "0";
        seek.setAttribute("aria-label", "Seek voice note");

        const timeLabel = document.createElement("span");
        timeLabel.className = "message-audio-time";
        timeLabel.textContent = "0:00";

        const ttlBadge = document.createElement("span");
        ttlBadge.className = "message-audio-ttl";
        ttlBadge.title = "Voice notes auto-delete after 7 days";
        ttlBadge.textContent = "7d";

        playBtn.addEventListener("click", () => {
            if (audio.paused) {
                document.querySelectorAll(".message-audio audio").forEach(other => {
                    if (other !== audio && !other.paused) {
                        other.pause();
                    }
                });
                audio.play().catch(() => {});
            } else {
                audio.pause();
            }
        });

        audio.addEventListener("play", () => {
            playBtn.innerHTML = icon("pause");
            playBtn.title = "Pause voice note";
            playBtn.setAttribute("aria-label", "Pause voice note");
        });

        audio.addEventListener("pause", () => {
            playBtn.innerHTML = icon("play");
            playBtn.title = "Play voice note";
            playBtn.setAttribute("aria-label", "Play voice note");
        });

        audio.addEventListener("ended", () => {
            seek.value = "0";
            playBtn.innerHTML = icon("play");
            if (Number.isFinite(audio.duration) && audio.duration > 0) {
                timeLabel.textContent = formatSec(audio.duration);
            }
        });

        audio.addEventListener("loadedmetadata", () => {
            if (Number.isFinite(audio.duration) && audio.duration > 0) {
                timeLabel.textContent = formatSec(audio.duration);
            }
        });

        audio.addEventListener("timeupdate", () => {
            const dur = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
            if (dur > 0) {
                seek.value = String(Math.min(100, Math.round((audio.currentTime / dur) * 100)));
            }
            timeLabel.textContent = formatSec(audio.currentTime || dur);
        });

        seek.addEventListener("input", () => {
            if (Number.isFinite(audio.duration) && audio.duration > 0) {
                audio.currentTime = (Number(seek.value) / 100) * audio.duration;
            }
        });

        wrap.append(audio, playBtn, seek, timeLabel, ttlBadge);
        return wrap;
    }

    document.addEventListener("pointerdown", () => {
        if (soundActive()) {
            ensureAudioContext();
        }
    }, { passive: true, once: true });

    window.McWutMessagesAudio = {
        soundActive,
        ensureAudioContext,
        playChime,
        paintSoundButton,
        toggleSound,
        buildAudioPlayer
    };
})();
