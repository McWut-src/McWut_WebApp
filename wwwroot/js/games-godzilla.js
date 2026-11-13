(function () {
    "use strict";

    window.McWutGames = window.McWutGames || {};

    // =========================================================================
    // --- Godzilla Rampage: Kid's Voxel Monster & Baby Bronny Rescue ---
    // =========================================================================

    var GAME_KEY = "godzilla-rampage";
    var CITY_HALF = 62;
    var TOWER_X = 0;
    var TOWER_Z = -48;
    var MAX_SCORE = 1000000;

    // --- DOM Elements ---
    var stageEl = document.getElementById("godzilla-stage");
    var viewportEl = document.getElementById("godzilla-viewport");
    var canvasEl = document.getElementById("godzilla-canvas");
    var cameoCanvas = document.getElementById("gz-cameo-canvas");
    var overCameoCanvas = document.getElementById("gz-over-cameo");

    var hpFillEl = document.getElementById("gz-hp-fill");
    var hpValEl = document.getElementById("gz-hp-val");
    var hpWrapEl = hpFillEl ? hpFillEl.closest(".gz-meter") : null;
    var rageWrapEl = document.getElementById("gz-rage-wrap");
    var rageFillEl = document.getElementById("gz-rage-fill");
    var rageValEl = document.getElementById("gz-rage-val");
    var scoreEl = document.getElementById("gz-hud-score");
    var comboEl = document.getElementById("gz-hud-combo");
    var timeEl = document.getElementById("gz-hud-time");
    var wreckedEl = document.getElementById("gz-hud-wrecked");
    var distEl = document.getElementById("gz-hud-dist");
    var compassEl = document.getElementById("gz-compass-arrow");
    var alertStarsEl = document.getElementById("gz-alert-stars");
    var missionStripEl = document.getElementById("gz-mission-strip");
    var districtTagEl = document.getElementById("gz-district-tag");
    var vaultChipEl = document.getElementById("gz-vault-chip");
    var bountyChip0El = document.getElementById("gz-bounty-0");
    var bountyChip1El = document.getElementById("gz-bounty-1");
    var bossBarEl = document.getElementById("gz-boss-bar");
    var bossTiersEl = document.getElementById("gz-boss-tiers");
    var bossFillEl = document.getElementById("gz-boss-fill");
    var popBannerEl = document.getElementById("gz-pop-banner");
    var popupLayerEl = document.getElementById("gz-popup-layer");

    var startOverlay = document.getElementById("godzilla-start-overlay");
    var overOverlay = document.getElementById("godzilla-over-overlay");
    var startBtn = document.getElementById("godzilla-start-btn");
    var againBtn = document.getElementById("godzilla-again-btn");
    var restartBtn = document.getElementById("gz-btn-restart");
    var overRecordBanner = document.getElementById("godzilla-record-banner");
    var overBadge = document.getElementById("godzilla-over-badge");
    var overTitle = document.getElementById("godzilla-over-title");
    var overBreakdown = document.getElementById("godzilla-over-breakdown");
    var overScore = document.getElementById("godzilla-over-score");
    var overCombo = document.getElementById("godzilla-over-combo");
    var overBest = document.getElementById("godzilla-over-best");
    var overRank = document.getElementById("godzilla-over-rank");
    var overStatsLine = document.getElementById("godzilla-over-stats-line");
    var overSaveStatus = document.getElementById("godzilla-save-status");

    var joyZoneEl = document.getElementById("gz-joy-zone");
    var joyKnobEl = document.getElementById("gz-joy-knob");
    var btnSmashEl = document.getElementById("gz-btn-smash");
    var btnTailEl = document.getElementById("gz-btn-tail");
    var btnRoarEl = document.getElementById("gz-btn-roar");
    var roarSubEl = document.getElementById("gz-roar-sub");
    var tailSubEl = document.getElementById("gz-tail-sub");

    // --- Audio Synthesizer ---
    var muted = false;
    try {
        muted = localStorage.getItem("mcwut-game-mute") === "1";
    } catch (e) {}

    function getAudioCtx() {
        if (muted) return null;
        if (window.McWutGames && window.McWutGames.audio && typeof window.McWutGames.audio.ensureAudio === "function") {
            return window.McWutGames.audio.ensureAudio();
        }
        if (typeof ensureAudio === "function") {
            return ensureAudio();
        }
        return null;
    }

    var noiseBuffer = null;
    function ensureNoiseBuffer(ctx) {
        if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) return noiseBuffer;
        var len = Math.floor(ctx.sampleRate * 0.6);
        var buf = ctx.createBuffer(1, len, ctx.sampleRate);
        var data = buf.getChannelData(0);
        for (var i = 0; i < len; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        noiseBuffer = buf;
        return buf;
    }

    function playStompSfx() {
        var ctx = getAudioCtx();
        if (!ctx) return;
        try {
            var now = ctx.currentTime;
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(72, now);
            osc.frequency.exponentialRampToValueAtTime(28, now + 0.11);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.12);
        } catch (e) {}
    }

    function playChompSfx(isSky) {
        var ctx = getAudioCtx();
        if (!ctx) return;
        try {
            var now = ctx.currentTime;
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(isSky ? 340 : 210, now);
            osc.frequency.exponentialRampToValueAtTime(55, now + 0.14);
            gain.gain.setValueAtTime(0.14, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.15);

            var src = ctx.createBufferSource();
            src.buffer = ensureNoiseBuffer(ctx);
            var flt = ctx.createBiquadFilter();
            flt.type = "bandpass";
            flt.frequency.setValueAtTime(950, now);
            var ng = ctx.createGain();
            ng.gain.setValueAtTime(0.11, now);
            ng.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            src.connect(flt);
            flt.connect(ng);
            ng.connect(ctx.destination);
            src.start(now);
            src.stop(now + 0.1);
        } catch (e) {}
    }

    function playTailWhipSfx() {
        var ctx = getAudioCtx();
        if (!ctx) return;
        try {
            var now = ctx.currentTime;
            var src = ctx.createBufferSource();
            src.buffer = ensureNoiseBuffer(ctx);
            var flt = ctx.createBiquadFilter();
            flt.type = "bandpass";
            flt.Q.value = 3;
            flt.frequency.setValueAtTime(220, now);
            flt.frequency.exponentialRampToValueAtTime(1400, now + 0.14);
            flt.frequency.exponentialRampToValueAtTime(260, now + 0.32);
            var gain = ctx.createGain();
            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
            src.connect(flt);
            flt.connect(gain);
            gain.connect(ctx.destination);
            src.start(now);
            src.stop(now + 0.34);
        } catch (e) {}
    }

    function playRoarSfx() {
        var ctx = getAudioCtx();
        if (!ctx) return;
        try {
            var now = ctx.currentTime;
            var osc = ctx.createOscillator();
            var mod = ctx.createOscillator();
            var modGain = ctx.createGain();
            var gain = ctx.createGain();

            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(510, now);
            osc.frequency.exponentialRampToValueAtTime(235, now + 0.25);
            osc.frequency.exponentialRampToValueAtTime(340, now + 0.55);
            osc.frequency.exponentialRampToValueAtTime(115, now + 1.05);

            mod.type = "square";
            mod.frequency.setValueAtTime(42, now);
            modGain.gain.setValueAtTime(55, now);
            mod.connect(modGain);
            modGain.connect(osc.frequency);

            gain.gain.setValueAtTime(0.16, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 1.08);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            mod.start(now);
            osc.stop(now + 1.08);
            mod.stop(now + 1.08);

            var src = ctx.createBufferSource();
            src.buffer = ensureNoiseBuffer(ctx);
            var flt = ctx.createBiquadFilter();
            flt.type = "lowpass";
            flt.frequency.setValueAtTime(1200, now);
            var ng = ctx.createGain();
            ng.gain.setValueAtTime(0.12, now);
            ng.gain.exponentialRampToValueAtTime(0.001, now + 0.58);
            src.connect(flt);
            flt.connect(ng);
            ng.connect(ctx.destination);
            src.start(now);
            src.stop(now + 0.58);
        } catch (e) {}
    }

    function playCollapseSfx(big) {
        var ctx = getAudioCtx();
        if (!ctx) return;
        try {
            var now = ctx.currentTime;
            var src = ctx.createBufferSource();
            src.buffer = ensureNoiseBuffer(ctx);
            var flt = ctx.createBiquadFilter();
            flt.type = "lowpass";
            flt.frequency.setValueAtTime(big ? 780 : 520, now);
            flt.frequency.exponentialRampToValueAtTime(90, now + (big ? 0.52 : 0.28));
            var ng = ctx.createGain();
            ng.gain.setValueAtTime(big ? 0.22 : 0.13, now);
            ng.gain.exponentialRampToValueAtTime(0.001, now + (big ? 0.54 : 0.3));
            src.connect(flt);
            flt.connect(ng);
            ng.connect(ctx.destination);
            src.start(now);
            src.stop(now + (big ? 0.54 : 0.3));

            var osc = ctx.createOscillator();
            var og = ctx.createGain();
            osc.type = "triangle";
            osc.frequency.setValueAtTime(big ? 130 : 165, now);
            osc.frequency.exponentialRampToValueAtTime(34, now + 0.28);
            og.gain.setValueAtTime(0.16, now);
            og.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            osc.connect(og);
            og.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.3);
        } catch (e) {}
    }

    function playPickupSfx() {
        var ctx = getAudioCtx();
        if (!ctx) return;
        try {
            var now = ctx.currentTime;
            [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) {
                var osc = ctx.createOscillator();
                var g = ctx.createGain();
                osc.type = "triangle";
                var t = now + i * 0.05;
                osc.frequency.setValueAtTime(f, t);
                g.gain.setValueAtTime(0.11, t);
                g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
                osc.connect(g);
                g.connect(ctx.destination);
                osc.start(t);
                osc.stop(t + 0.18);
            });
        } catch (e) {}
    }

    function playHurtSfx() {
        var ctx = getAudioCtx();
        if (!ctx) return;
        try {
            var now = ctx.currentTime;
            var osc = ctx.createOscillator();
            var g = ctx.createGain();
            osc.type = "square";
            osc.frequency.setValueAtTime(160, now);
            osc.frequency.exponentialRampToValueAtTime(68, now + 0.14);
            g.gain.setValueAtTime(0.09, now);
            g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            osc.connect(g);
            g.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.15);
        } catch (e) {}
    }

    function playWaveAlertSfx(isBoss) {
        var ctx = getAudioCtx();
        if (!ctx) return;
        try {
            var now = ctx.currentTime;
            var notes = isBoss ? [220, 185, 293.66, 220] : [330, 440, 523.25];
            notes.forEach(function (f, i) {
                var osc = ctx.createOscillator();
                var g = ctx.createGain();
                osc.type = isBoss ? "sawtooth" : "triangle";
                var t = now + i * (isBoss ? 0.09 : 0.075);
                osc.frequency.setValueAtTime(f, t);
                g.gain.setValueAtTime(isBoss ? 0.11 : 0.085, t);
                g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
                osc.connect(g);
                g.connect(ctx.destination);
                osc.start(t);
                osc.stop(t + 0.14);
            });
        } catch (e) {}
    }

    function playVictoryFanfare() {
        var ctx = getAudioCtx();
        if (!ctx) return;
        try {
            var now = ctx.currentTime;
            var notes = [392.0, 523.25, 659.25, 783.99, 1046.5];
            notes.forEach(function (f, i) {
                var osc = ctx.createOscillator();
                var g = ctx.createGain();
                osc.type = "triangle";
                var t = now + i * 0.09;
                osc.frequency.setValueAtTime(f, t);
                g.gain.setValueAtTime(0.14, t);
                g.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
                osc.connect(g);
                g.connect(ctx.destination);
                osc.start(t);
                osc.stop(t + 0.42);
            });
        } catch (e) {}
    }

    // =========================================================================
    // --- Pixel-Art Sprite Art: Baby Bronny James & City Pixel Textures ---
    // =========================================================================

    var BRONNY_PALETTE = {
        ".": null,
        "k": "#130b08", // deep afro / outline
        "a": "#291810", // dark afro mid
        "h": "#43271a", // afro curly highlight
        "s": "#d68d58", // skin base
        "d": "#b56d3d", // skin shadow
        "l": "#eba979", // skin highlight
        "p": "#ea6d76", // rosy blush
        "e": "#1c0e08", // eye dark
        "b": "#4a2713", // iris brown
        "w": "#ffffff", // white teeth / shine / trim
        "t": "#dd4f5d", // joyful tongue
        "g": "#facc15", // Lakers gold primary
        "y": "#eab308", // gold shadow
        "z": "#fef08a", // gold bright highlight
        "u": "#581c87", // Lakers purple
        "v": "#7e22ce", // purple highlight
        "o": "#f97316"  // basketball orange
    };

    // 24x34 pixel-art Baby Bronny James with locked head/afro, crisp #9 Lakers jersey,
    // shoulder-connected arms, and basketball dribble/wave/victory animations (zero ear-arms!).
    var BRONNY_HEAD_TOP = [
        ".......kkkkkkkkkk.......",
        ".....kkahhaaahaahkk.....",
        "....kahaaahaaaahaaak....",
        "...kaaaahaaaaaaahaaak...",
        "..kahaaahaahhaahaaahak..",
        "..kaaaaaaaaaaaaaaaaaak..",
        "..kahaaahaahhaahaaahak..",
        "..kaahkksssssssskkhaak..",
        "..kahkssllllllllsskhak..",
        "..kakssllllllllllsskak..",
        "..kdkslkkeslllekklskdk..",
        "..kdkslkweesllkweeskdk..",
        "..kdkslbeeesllbeeeskdk..",
        "..kdkssbeeesllbeeeskdk.."
    ];

    var BRONNY_IDLE_ROWS = BRONNY_HEAD_TOP.concat([
        "...kdsspppsssspppssdk...",
        "...ksssssswwwwssssssk...",
        "....ksssskwttwkssssk....",
        ".....ksssskkkkssssk.....",
        "......kksssssssskk......",
        ".......kkwwuuwwkk.......",
        "......kssuggggussk......",
        ".....kdsgguuuuggssk.....",
        ".....kdsggugguuggssk....",
        ".....kdssguuuugkoook....",
        ".....kds.gggggokooook...",
        "......k..gguuugkooook...",
        ".........gggggg.kooky...",
        ".........uugguu.........",
        "........kugggguk........",
        "........gggg.gggg.......",
        "........uuug.guuu.......",
        ".......uuggu.ugguu......",
        ".......wwwww.wwwww......",
        ".......kkkkk.kkkkk......"
    ]);

    var BRONNY_DRIBBLE_ROWS = BRONNY_HEAD_TOP.concat([
        "...kdsspppsssspppssdk...",
        "...ksssssswwwwssssssk...",
        "....ksssskwttwkssssk....",
        ".....ksssskkkkssssk.....",
        "......kksssssssskk......",
        ".......kkwwuuwwkk.......",
        ".....kssugggggusskk.....",
        "....kds.gguuuuggsskk....",
        "....kd..ggugguugggssk...",
        "........gguuuuggg.kssk..",
        "........ggggguggg..kdk..",
        "........gguuuuggg.......",
        "........gggggggg........",
        "........kugggguk..kooky.",
        "........gggg.ggggkoooook",
        "........gggg.ggggkoooook",
        "........uuug.guuu.kooky.",
        ".......uuggu.ugguu......",
        ".......wwwww.wwwww......",
        ".......kkkkk.kkkkk......"
    ]);

    var BRONNY_WAVE_ROWS = BRONNY_HEAD_TOP.concat([
        "...kdsspppsssspppssdk...",
        "...ksssssswwwwssssssk...",
        "....ksssskwttwkssssk.ss.",
        ".....ksssskkkkssssk.kssk",
        "......kksssssssskk..kdk.",
        ".......kkwwuuwwkk..kssk.",
        "......kssuggggusskksk...",
        ".....kdsgguuuuggsssk....",
        "....koookgugguugg.......",
        "...koooookuuuuggg.......",
        "...koooookggggugg.......",
        "....kookygguuuugg.......",
        ".........gggggggg.......",
        ".........uugguu.........",
        "........kugggguk........",
        "........gggg.gggg.......",
        "........uuug.guuu.......",
        ".......uuggu.ugguu......",
        ".......wwwww.wwwww......",
        ".......kkkkk.kkkkk......"
    ]);

    var BRONNY_CHEER_ROWS = BRONNY_HEAD_TOP.concat([
        "...kdsspppsssspppssdk...",
        "...ksssssswwwwssssssk...",
        "....ksssskwttwkssssk.ooo",
        ".ksskksssskkkkssssk..ooo",
        "ksssk.kksssssssskk...koy",
        ".kssk..kkwwuuwwkk...kssk",
        "..ksskkssuggggusskk.ksk.",
        "...kkkk.gguuuuggsskksk..",
        "........ggugguugggssk...",
        "........gguuuuggg.......",
        "........ggggguggg.......",
        "........gguuuuggg.......",
        "........gggggggg........",
        ".........uugguu.........",
        "........kugggguk........",
        "........gggg.gggg.......",
        "........uuug.guuu.......",
        ".......uuggu.ugguu......",
        ".......wwwww.wwwww......",
        ".......kkkkk.kkkkk......"
    ]);

    function buildSpriteCanvas(rows, palette, scale) {
        var h = rows.length;
        var w = rows[0].length;
        var s = scale || 4;
        var c = document.createElement("canvas");
        c.width = w * s;
        c.height = h * s;
        var ctx = c.getContext("2d");
        ctx.imageSmoothingEnabled = false;
        for (var y = 0; y < h; y++) {
            var row = rows[y];
            for (var x = 0; x < w; x++) {
                var col = palette[row.charAt(x)];
                if (col) {
                    ctx.fillStyle = col;
                    ctx.fillRect(x * s, y * s, s, s);
                }
            }
        }
        return c;
    }

    var bronnyIdleCanvas = buildSpriteCanvas(BRONNY_IDLE_ROWS, BRONNY_PALETTE, 4);
    var bronnyDribbleCanvas = buildSpriteCanvas(BRONNY_DRIBBLE_ROWS, BRONNY_PALETTE, 4);
    var bronnyWaveCanvas = buildSpriteCanvas(BRONNY_WAVE_ROWS, BRONNY_PALETTE, 4);
    var bronnyCheerCanvas = buildSpriteCanvas(BRONNY_CHEER_ROWS, BRONNY_PALETTE, 4);

    // Paint the Kid's Voxel Monster directly in crisp 2D pixel art for Cameos & 2D Fallback
    function drawPixelGodzilla2D(ctx, cx, cy, scale, opts) {
        opts = opts || {};
        var u = scale || 3;
        var step = opts.step || 0;
        var chomp = opts.chomp || 0;
        var roar = opts.roar || 0;
        var hurt = opts.hurt || false;
        var rageReady = !!opts.rageReady;
        var tailSwing = opts.tailSwing || 0;
        var t = opts.time || 0;

        // Ground contact shadow beneath monster
        ctx.save();
        ctx.fillStyle = "rgba(3, 7, 18, 0.45)";
        ctx.beginPath();
        ctx.ellipse(cx, cy + 9.4 * u, 7.2 * u, 2.2 * u, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.translate(cx, cy + Math.abs(Math.sin(step)) * -u * 0.9);

        var mossDeep = hurt ? "#7f1d1d" : "#1c3318";
        var mossDark = hurt ? "#991b1b" : "#2c4c24";
        var mossMid = hurt ? "#ef4444" : "#447337";
        var mossBright = hurt ? "#fca5a5" : "#649e4b";
        var mossHigh = hurt ? "#fee2e2" : "#89c466";
        var spineGlow = hurt ? "#fca5a5" : (roar > 0.2 ? "#fef08a" : (rageReady ? "#fb923c" : "#d97706"));

        // Crown / back glowing dorsal fin spikes peeking above orb
        ctx.fillStyle = mossDark;
        ctx.fillRect(-3.6 * u, -8.5 * u, 1.5 * u, 1.6 * u);
        ctx.fillRect(2.1 * u, -8.5 * u, 1.5 * u, 1.6 * u);
        ctx.fillStyle = spineGlow;
        ctx.fillRect(-1.2 * u, -9.8 * u, 2.4 * u, 2.4 * u);
        ctx.fillRect(-3.2 * u, -9.0 * u, 1.0 * u, 1.0 * u);
        ctx.fillRect(2.2 * u, -9.0 * u, 1.0 * u, 1.0 * u);

        // Layered sweeping dragon tail-fin on lower right with spiked ridge
        ctx.save();
        ctx.translate(5 * u, 3 * u);
        ctx.rotate(tailSwing * 0.45 + Math.sin(t * 5) * 0.08);
        var tailBlocks = [
            [0, -1, 5, 3, mossDark],
            [2, 0, 5, 3, mossMid],
            [4, 1, 5, 2.5, mossBright],
            [7, 1.5, 4, 2, mossMid],
            [9, 1, 3, 1.5, mossHigh]
        ];
        for (var tb = 0; tb < tailBlocks.length; tb++) {
            var b = tailBlocks[tb];
            ctx.fillStyle = b[4];
            ctx.fillRect(b[0] * u, b[1] * u, b[2] * u, b[3] * u);
        }
        // Tail spine fins
        ctx.fillStyle = spineGlow;
        ctx.fillRect(2.5 * u, -1.6 * u, 1.4 * u, 1.4 * u);
        ctx.fillRect(5.5 * u, -0.4 * u, 1.3 * u, 1.3 * u);
        ctx.fillRect(8.4 * u, 0.1 * u, 1.2 * u, 1.1 * u);
        ctx.restore();

        // Stubby raised upper arms with 4 splayed fingers & ivory claw tips
        var armSwing = Math.sin(step) * 0.18 - chomp * 0.45;
        [-1, 1].forEach(function (side) {
            ctx.save();
            ctx.translate(side * 6.5 * u, -2.5 * u);
            ctx.rotate(side * (-0.55 + armSwing));
            ctx.fillStyle = mossDark;
            ctx.fillRect(side > 0 ? 0 : -4 * u, -1.3 * u, 4 * u, 2.6 * u);
            ctx.fillStyle = mossMid;
            ctx.fillRect(side > 0 ? 0.3 * u : -3.7 * u, -1.0 * u, 3.4 * u, 2.0 * u);
            ctx.fillStyle = mossBright;
            var fx = side > 0 ? 3.5 * u : -4.8 * u;
            ctx.fillRect(fx, -2.1 * u, 1.2 * u, 1.0 * u);
            ctx.fillRect(fx + side * 0.5 * u, -0.7 * u, 1.2 * u, 0.9 * u);
            ctx.fillRect(fx + side * 0.2 * u, 0.7 * u, 1.2 * u, 0.9 * u);
            ctx.fillStyle = "#f7f2d7";
            var cxTip = side > 0 ? fx + 1.0 * u : fx - 0.8 * u;
            ctx.fillRect(cxTip, -2.2 * u, 0.9 * u, 0.8 * u);
            ctx.fillRect(cxTip + side * 0.4 * u, -0.7 * u, 0.9 * u, 0.8 * u);
            ctx.fillRect(cxTip + side * 0.1 * u, 0.7 * u, 0.9 * u, 0.8 * u);
            ctx.restore();
        });

        // Stubby clawed lower legs with ivory toenails
        var legL = Math.sin(step) * u * 1.1;
        var legR = -legL;
        ctx.fillStyle = mossDark;
        ctx.fillRect(-6 * u, 5 * u + legL, 3.2 * u, 4 * u);
        ctx.fillRect(2.8 * u, 5 * u + legR, 3.2 * u, 4 * u);
        ctx.fillStyle = mossBright;
        ctx.fillRect(-6.8 * u, 8.0 * u + legL, 4 * u, 1.4 * u);
        ctx.fillRect(2.8 * u, 8.0 * u + legR, 4 * u, 1.4 * u);
        ctx.fillStyle = "#f7f2d7";
        ctx.fillRect(-7.1 * u, 8.8 * u + legL, 1.0 * u, 0.9 * u);
        ctx.fillRect(-5.4 * u, 8.8 * u + legL, 1.0 * u, 0.9 * u);
        ctx.fillRect(4.4 * u, 8.8 * u + legR, 1.0 * u, 0.9 * u);
        ctx.fillRect(6.1 * u, 8.8 * u + legR, 1.0 * u, 0.9 * u);

        // Spherical stepped mossy voxel orb body
        var r = 7;
        for (var vy = -r; vy <= r; vy++) {
            for (var vx = -r; vx <= r; vx++) {
                var d = Math.sqrt(vx * vx + vy * vy);
                var bump = ((Math.abs(vx * 7 + vy * 13) % 5) === 0) ? 0.55 : 0;
                if (d <= r - 0.1 + bump) {
                    var shade = mossMid;
                    if (d > r - 1.1) shade = mossDark;
                    else if (vy < -3 && Math.abs(vx) <= 3) shade = mossBright;
                    else if ((vx + vy) % 3 === 0) shade = mossDark;
                    else if (vy < -1 && Math.abs(vx) > 2) shade = mossBright;
                    if (vy === -r + 1 && Math.abs(vx) < 3) shade = mossHigh;
                    if (d > r - 0.5 && (vx + vy) % 2 === 0) shade = mossDeep;
                    ctx.fillStyle = shade;
                    ctx.fillRect((vx - 0.5) * u, (vy - 0.5) * u, u + 0.35, u + 0.35);
                }
            }
        }

        // Angry furrowed green brow ridges
        ctx.fillStyle = mossDeep;
        ctx.fillRect(-5 * u, -4.5 * u, 3.6 * u, 1.3 * u);
        ctx.fillRect(1.4 * u, -4.5 * u, 3.6 * u, 1.3 * u);
        ctx.fillStyle = mossHigh;
        ctx.fillRect(-4.6 * u, -5.2 * u, 3 * u, 0.9 * u);
        ctx.fillRect(1.6 * u, -5.2 * u, 3 * u, 0.9 * u);

        // Glowing fiery molten eyes
        ctx.fillStyle = "#ff4500";
        ctx.fillRect(-4.6 * u, -3.5 * u, 3.1 * u, 1.6 * u);
        ctx.fillRect(1.5 * u, -3.5 * u, 3.1 * u, 1.6 * u);
        ctx.fillStyle = "#fde047";
        ctx.fillRect(-3.6 * u, -3.3 * u, 1.2 * u, 1.2 * u);
        ctx.fillRect(2.4 * u, -3.3 * u, 1.2 * u, 1.2 * u);

        // Nostrils
        ctx.fillStyle = "#111b10";
        ctx.fillRect(-1.3 * u, -1.6 * u, 0.9 * u, 1.1 * u);
        ctx.fillRect(0.4 * u, -1.6 * u, 0.9 * u, 1.1 * u);

        // Giant circular dark roaring mouth + fangs
        var mouthH = Math.max(1.4, (4.3 - chomp * 2.3 + roar * 1.1)) * u;
        var mouthW = 4.6 * u;
        ctx.fillStyle = "#5c1418";
        ctx.fillRect(-mouthW - 0.5 * u, -0.5 * u, (mouthW * 2) + u, mouthH + 0.9 * u);
        ctx.fillStyle = roar > 0.2 ? "#ea580c" : "#120203";
        ctx.fillRect(-mouthW + 0.3 * u, 0, mouthW * 2 - 0.6 * u, mouthH);
        if (roar > 0.2) {
            ctx.fillStyle = "#fef08a";
            ctx.fillRect(-mouthW * 0.45, mouthH * 0.25, mouthW * 0.9, mouthH * 0.5);
        }

        // Upper & lower jagged cream ivory teeth
        ctx.fillStyle = "#f7f2d7";
        var toothXs = [-3.6, -1.8, 0, 1.8, 3.6];
        for (var ti = 0; ti < toothXs.length; ti++) {
            var tx = toothXs[ti] * u;
            var th = (ti === 1 || ti === 3 ? 1.5 : 1.15) * u;
            ctx.fillRect(tx - 0.55 * u, -0.1 * u, 1.1 * u, th);
            ctx.fillRect(tx - 0.5 * u, mouthH - th * 0.95, 1.0 * u, th * 0.95);
        }

        // Floating ember sparks
        ctx.fillStyle = "#fb923c";
        ctx.fillRect(-8.5 * u, (-2 + Math.sin(t * 4) * 2) * u, u, u);
        ctx.fillStyle = "#fde047";
        ctx.fillRect(8.2 * u, (-4 + Math.cos(t * 3.5) * 2) * u, u, u);

        ctx.restore();
    }

    function paintCameoBanner(canvas, isVictory) {
        if (!canvas) return;
        var ctx = canvas.getContext("2d");
        var w = canvas.width;
        var h = canvas.height;
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, w, h);

        // Deep starry night sky gradient + glowing pixel moon
        var skyGrad = ctx.createLinearGradient(0, 0, 0, h);
        skyGrad.addColorStop(0, "#070b18");
        skyGrad.addColorStop(0.65, "#111a36");
        skyGrad.addColorStop(1, "#1e1b4b");
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, h);

        // Twinkling pixel stars
        ctx.fillStyle = "#e2e8f0";
        var stars = [[12, 8], [38, 6], [66, 12], [92, 5], [116, 11], [148, 7], [22, 18], [80, 19], [134, 16]];
        for (var si = 0; si < stars.length; si++) {
            if (stars[si][0] < w - 4) ctx.fillRect(stars[si][0], stars[si][1], 2, 2);
        }

        // Glowing moon disc
        var moonX = isVictory ? w * 0.78 : w * 0.54;
        ctx.fillStyle = "rgba(250, 204, 21, 0.14)";
        ctx.beginPath();
        ctx.arc(moonX, 20, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fef3c7";
        ctx.fillRect(moonX - 6, 14, 12, 12);
        ctx.fillStyle = "#fde68a";
        ctx.fillRect(moonX - 4, 16, 3, 3);
        ctx.fillRect(moonX + 1, 20, 4, 3);

        // Distant skyline silhouettes + lit windows
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, 32, 18, h - 32);
        ctx.fillRect(54, 26, 22, h - 26);
        ctx.fillRect(78, 36, 16, h - 36);
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(6, 22, 22, h - 22);
        ctx.fillRect(30, 14, 22, h - 14);
        ctx.fillRect(w - 54, 16, 24, h - 16);
        ctx.fillRect(w - 24, 28, 20, h - 28);

        for (var wy = 18; wy < h - 10; wy += 6) {
            ctx.fillStyle = (wy % 12 === 0) ? "#38bdf8" : "#facc15";
            ctx.fillRect(34, wy, 3, 3);
            ctx.fillRect(43, wy, 3, 3);
            ctx.fillRect(w - 50, wy + 2, 3, 3);
            ctx.fillRect(w - 40, wy + 2, 3, 3);
        }

        if (isVictory) {
            // Crossing celebratory searchlight beams
            ctx.fillStyle = "rgba(250, 204, 21, 0.14)";
            ctx.beginPath();
            ctx.moveTo(14, h); ctx.lineTo(52, 0); ctx.lineTo(74, 0); ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(w - 14, h); ctx.lineTo(w - 52, 0); ctx.lineTo(w - 74, 0); ctx.closePath();
            ctx.fill();

            // Godzilla happily hoisting Baby Bronny atop his brow with gold sparkles!
            drawPixelGodzilla2D(ctx, w * 0.48, h * 0.62, 2.5, { time: 0.4, roar: 0.35, rageReady: true });
            ctx.drawImage(bronnyCheerCanvas, 0, 0, bronnyCheerCanvas.width, bronnyCheerCanvas.height, w * 0.48 - 18, 2, 34, 48);
            ctx.fillStyle = "#facc15";
            ctx.fillRect(16, 12, 4, 4);
            ctx.fillRect(w - 20, 14, 4, 4);
            ctx.fillStyle = "#a855f7";
            ctx.fillRect(26, 26, 4, 4);
            ctx.fillRect(w - 30, 24, 4, 4);
        } else {
            // Monster roaring on left facing Mega Tower + Baby Bronny on right
            drawPixelGodzilla2D(ctx, 44, h * 0.57, 2.55, { time: 0.2, roar: 0.3, rageReady: true });
            // Fiery ember breath sparks toward tower
            ctx.fillStyle = "#fb923c";
            ctx.fillRect(72, h * 0.48, 5, 4);
            ctx.fillStyle = "#fde047";
            ctx.fillRect(82, h * 0.44, 4, 4);
            ctx.fillRect(92, h * 0.41, 3, 3);

            // Stepped Lakers Mega Tower on right
            ctx.fillStyle = "#4c1d95";
            ctx.fillRect(w - 52, 42, 40, h - 42);
            ctx.fillStyle = "#581c87";
            ctx.fillRect(w - 48, 42, 32, h - 42);
            ctx.fillStyle = "#facc15";
            ctx.fillRect(w - 50, 42, 36, 4);
            ctx.fillRect(w - 42, 52, 6, 4);
            ctx.fillRect(w - 30, 52, 6, 4);
            ctx.fillRect(w - 42, 62, 6, 4);
            ctx.fillRect(w - 30, 62, 6, 4);
            ctx.drawImage(bronnyWaveCanvas, 0, 0, bronnyWaveCanvas.width, bronnyWaveCanvas.height, w - 45, 5, 28, 40);
        }
    }

    // =========================================================================
    // --- Three.js Voxel Mesher & High-Detail Monster Rig ---
    // =========================================================================

    function hash3(x, y, z) {
        var h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0;
        h = ((h ^ (h >> 13)) * 1274126177) | 0;
        return ((h ^ (h >> 16)) >>> 0) / 4294967295;
    }

    function hexToRgbNorm(hex) {
        return [
            ((hex >> 16) & 255) / 255,
            ((hex >> 8) & 255) / 255,
            (hex & 255) / 255
        ];
    }

    /**
     * Builds a single face-culled, vertex-AO-shaded THREE.BufferGeometry from a sparse voxel map.
     * voxels: Object keyed by "x,y,z" -> hex color int
     */
    function buildVoxelGeometry(voxels, voxelSize, originOffset) {
        var keys = Object.keys(voxels);
        var positions = [];
        var normals = [];
        var colors = [];
        var indices = [];

        function has(x, y, z) {
            return voxels[x + "," + y + "," + z] !== undefined;
        }

        // 6 faces with neighbor direction, 4 corner positions, 2 AO sample axes
        var faces = [
            { // +X
                dir: [1, 0, 0],
                shade: 0.88,
                corners: [
                    [1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]
                ],
                aoTangents: [[0, -1, 0], [0, 0, 1]]
            },
            { // -X
                dir: [-1, 0, 0],
                shade: 0.84,
                corners: [
                    [0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]
                ],
                aoTangents: [[0, -1, 0], [0, 0, -1]]
            },
            { // +Y (top)
                dir: [0, 1, 0],
                shade: 1.0,
                corners: [
                    [0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]
                ],
                aoTangents: [[-1, 0, 0], [0, 0, 1]]
            },
            { // -Y (bottom)
                dir: [0, -1, 0],
                shade: 0.62,
                corners: [
                    [0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]
                ],
                aoTangents: [[-1, 0, 0], [0, 0, -1]]
            },
            { // +Z (front)
                dir: [0, 0, 1],
                shade: 0.96,
                corners: [
                    [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]
                ],
                aoTangents: [[-1, 0, 0], [0, -1, 0]]
            },
            { // -Z (back)
                dir: [0, 0, -1],
                shade: 0.78,
                corners: [
                    [1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]
                ],
                aoTangents: [[1, 0, 0], [0, -1, 0]]
            }
        ];

        var ox = originOffset ? originOffset[0] : 0;
        var oy = originOffset ? originOffset[1] : 0;
        var oz = originOffset ? originOffset[2] : 0;

        for (var i = 0; i < keys.length; i++) {
            var k = keys[i];
            var parts = k.split(",");
            var vx = parseInt(parts[0], 10);
            var vy = parseInt(parts[1], 10);
            var vz = parseInt(parts[2], 10);
            var col = hexToRgbNorm(voxels[k]);

            for (var f = 0; f < 6; f++) {
                var face = faces[f];
                var d = face.dir;
                if (has(vx + d[0], vy + d[1], vz + d[2])) continue;

                var vStart = positions.length / 3;
                for (var c = 0; c < 4; c++) {
                    var cr = face.corners[c];
                    positions.push(
                        (vx + cr[0] + ox) * voxelSize,
                        (vy + cr[1] + oy) * voxelSize,
                        (vz + cr[2] + oz) * voxelSize
                    );
                    normals.push(d[0], d[1], d[2]);

                    // Compute smooth voxel corner ambient occlusion
                    var sx = cr[0] === 0 ? -1 : 1;
                    var sy = cr[1] === 0 ? -1 : 1;
                    var sz = cr[2] === 0 ? -1 : 1;
                    var n1x = vx + d[0] + (d[0] === 0 ? sx : 0);
                    var n1y = vy + d[1];
                    var n1z = vz + d[2];
                    var n2x = vx + d[0];
                    var n2y = vy + d[1] + (d[1] === 0 ? sy : 0);
                    var n2z = vz + d[2] + (d[2] === 0 ? sz : 0);
                    if (d[0] === 0 && d[1] === 0) {
                        n1x = vx + sx; n1y = vy; n1z = vz + d[2];
                        n2x = vx; n2y = vy + sy; n2z = vz + d[2];
                    } else if (d[1] === 0 && d[2] === 0) {
                        n1x = vx + d[0]; n1y = vy + sy; n1z = vz;
                        n2x = vx + d[0]; n2y = vy; n2z = vz + sz;
                    } else {
                        n1x = vx + sx; n1y = vy + d[1]; n1z = vz;
                        n2x = vx; n2y = vy + d[1]; n2z = vz + sz;
                    }
                    var occ1 = has(n1x, n1y, n1z) ? 1 : 0;
                    var occ2 = has(n2x, n2y, n2z) ? 1 : 0;
                    var cornerOcc = has(
                        vx + (d[0] === 0 ? sx : d[0]),
                        vy + (d[1] === 0 ? sy : d[1]),
                        vz + (d[2] === 0 ? sz : d[2])
                    ) ? 1 : 0;
                    var ao = (occ1 && occ2) ? 0.56 : 1.0 - (occ1 + occ2 + cornerOcc) * 0.13;
                    var mult = face.shade * ao;

                    colors.push(col[0] * mult, col[1] * mult, col[2] * mult);
                }

                indices.push(vStart, vStart + 1, vStart + 2, vStart, vStart + 2, vStart + 3);
            }
        }

        var geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
        geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
        geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
        geo.setIndex(indices);
        return geo;
    }

    function pickMossColor(x, y, z, ridgeBias) {
        var palette = [0x1a3019, 0x264422, 0x355b2d, 0x47763a, 0x5d9348, 0x7ab45b];
        var n = hash3(x, y, z);
        var idx = Math.floor(n * 4.2 + (y > 4 ? 1.15 : 0) + (ridgeBias || 0));
        idx = Math.max(0, Math.min(palette.length - 1, idx));
        return palette[idx];
    }

    /**
     * Articulated 3D Voxel Baby Bronny James rig (#9 Lakers uniform, curly afro,
     * shoulder-jointed arms, sneakers, and voxel basketball).
     */
    function createBronnyVoxelRig(THREE, trackMatFn) {
        var root = new THREE.Group();
        var bodyGroup = new THREE.Group();
        root.add(bodyGroup);

        var s = 0.13;
        var mat = new THREE.MeshLambertMaterial({ vertexColors: true });
        if (typeof trackMatFn === "function") trackMatFn(mat);

        // 1. Torso (#9 Lakers gold jersey + purple collar & trim)
        var torsoVox = {};
        for (var y = 0; y <= 7; y++) {
            for (var x = -3; x <= 3; x++) {
                for (var z = -2; z <= 2; z++) {
                    var col = 0xfacc15;
                    if (y === 7 && Math.abs(x) <= 2) col = 0x581c87;
                    if (y === 6 && Math.abs(x) <= 1 && z >= 1) col = 0xffffff;
                    if (Math.abs(x) === 3 && y >= 5) col = 0x7e22ce;
                    if (y === 0) col = 0x581c87;
                    torsoVox[x + "," + y + "," + z] = col;
                }
            }
        }
        // Crisp 3D voxel "9" on front (+Z) and back (-Z)
        var nineCoords = [
            [-1, 5], [0, 5], [1, 5],
            [-1, 4], [1, 4],
            [-1, 3], [0, 3], [1, 3],
            [1, 2],
            [-1, 1], [0, 1], [1, 1]
        ];
        for (var nc = 0; nc < nineCoords.length; nc++) {
            var p9 = nineCoords[nc];
            torsoVox[p9[0] + "," + p9[1] + ",2"] = 0x581c87;
            torsoVox[p9[0] + "," + p9[1] + ",-2"] = 0x581c87;
        }
        var torsoMesh = new THREE.Mesh(buildVoxelGeometry(torsoVox, s, [0, 0, 0]), mat);
        torsoMesh.castShadow = true;
        torsoMesh.position.y = 6.5 * s;
        bodyGroup.add(torsoMesh);

        // 2. Articulated Head (warm skin, bright eyes, smile, sculpted curly afro)
        var headPivot = new THREE.Group();
        headPivot.position.set(0, 14.2 * s, 0);
        bodyGroup.add(headPivot);

        var headVox = {};
        for (var hy = 0; hy <= 5; hy++) {
            for (var hx = -3; hx <= 3; hx++) {
                for (var hz = -2; hz <= 3; hz++) {
                    if (Math.abs(hx) === 3 && hz === 3) continue;
                    var fCol = (hy >= 3 && hz >= 2) ? 0xeba979 : 0xd68d58;
                    if (hy === 2 && Math.abs(hx) === 2 && hz === 3) fCol = 0xea6d76; // blush
                    if (hy === 1 && Math.abs(hx) <= 1 && hz === 3) fCol = 0xffffff; // smile teeth
                    headVox[hx + "," + hy + "," + hz] = fCol;
                }
            }
        }
        // Expressive eyes on front face
        headVox["-2,3,3"] = 0x1c0e08;
        headVox["-1,3,3"] = 0xffffff;
        headVox["1,3,3"] = 0xffffff;
        headVox["2,3,3"] = 0x1c0e08;

        // Curly sculpted voxel afro framing top, back & sides
        for (var ay = 1; ay <= 10; ay++) {
            for (var ax = -5; ax <= 5; ax++) {
                for (var az = -5; az <= 3; az++) {
                    if (az >= 1 && ay <= 5 && Math.abs(ax) <= 3) continue; // keep face clear
                    var ad = Math.sqrt((ax / 5.0) * (ax / 5.0) + ((ay - 5.4) / 4.8) * ((ay - 5.4) / 4.8) + ((az + 0.8) / 4.4) * ((az + 0.8) / 4.4));
                    var curlN = hash3(ax + 11, ay + 23, az + 7);
                    if (ad <= 0.96 + (curlN > 0.58 ? 0.14 : 0)) {
                        headVox[ax + "," + ay + "," + az] = curlN > 0.65 ? 0x43271a : (curlN > 0.25 ? 0x291810 : 0x130b08);
                    }
                }
            }
        }
        var headMesh = new THREE.Mesh(buildVoxelGeometry(headVox, s, [0, 0, 0]), mat);
        headMesh.castShadow = true;
        headPivot.add(headMesh);

        // 3. Shoulder-Connected Articulated Arms (extending downward along -Y from shoulder)
        function buildBronnyArm(side) {
            var aVox = {};
            for (var ay = 0; ay >= -5; ay--) {
                var col = ay === 0 ? 0x581c87 : (ay === -1 ? 0xd68d58 : (ay <= -4 ? 0xeba979 : 0xd68d58));
                aVox["0," + ay + ",0"] = col;
                aVox[side + "," + ay + ",0"] = col;
                aVox["0," + ay + ",1"] = col;
                if (ay === 0) aVox[side + ",0,1"] = 0xfacc15;
            }
            var mesh = new THREE.Mesh(buildVoxelGeometry(aVox, s * 0.92, [0, 0, 0]), mat);
            mesh.castShadow = true;
            return mesh;
        }

        var armL = new THREE.Group();
        armL.position.set(-4.0 * s, 12.8 * s, -0.3 * s);
        armL.add(buildBronnyArm(-1));
        bodyGroup.add(armL);

        var armR = new THREE.Group();
        armR.position.set(4.0 * s, 12.8 * s, -0.3 * s);
        armR.add(buildBronnyArm(1));
        bodyGroup.add(armR);

        // 4. Articulated Legs + Shorts + Sneakers (feet touch y = 0)
        function buildBronnyLeg() {
            var lVox = {};
            for (var ly = 0; ly >= -5; ly--) {
                var col = ly >= -1 ? 0xfacc15 : (ly === -2 ? 0x581c87 : (ly <= -4 ? 0xffffff : 0xd68d58));
                lVox["0," + ly + ",0"] = col;
                lVox["1," + ly + ",0"] = col;
                lVox["0," + ly + ",1"] = col;
                lVox["1," + ly + ",1"] = col;
                if (ly <= -4) {
                    lVox["0," + ly + ",2"] = ly === -5 ? 0xf8fafc : 0x581c87;
                    lVox["1," + ly + ",2"] = ly === -5 ? 0xf8fafc : 0xfacc15;
                }
            }
            var mesh = new THREE.Mesh(buildVoxelGeometry(lVox, s, [0, 0, 0]), mat);
            mesh.castShadow = true;
            return mesh;
        }

        var legL = new THREE.Group();
        legL.position.set(-2.2 * s, 5.5 * s, -0.4 * s);
        legL.add(buildBronnyLeg());
        bodyGroup.add(legL);

        var legR = new THREE.Group();
        legR.position.set(1.2 * s, 5.5 * s, -0.4 * s);
        legR.add(buildBronnyLeg());
        bodyGroup.add(legR);

        // 5. 3D Voxel Basketball (dribbled on helipad or spun on fingertip!)
        var ballVox = {};
        for (var by = -2; by <= 2; by++) {
            for (var bx = -2; bx <= 2; bx++) {
                for (var bz = -2; bz <= 2; bz++) {
                    if (bx * bx + by * by + bz * bz <= 5.2) {
                        var seam = (bx === 0 || by === 0);
                        ballVox[bx + "," + by + "," + bz] = seam ? 0x1c0e08 : 0xf97316;
                    }
                }
            }
        }
        var ballMesh = new THREE.Mesh(buildVoxelGeometry(ballVox, s * 0.85, [0, 0, 0]), mat);
        ballMesh.castShadow = true;
        root.add(ballMesh);

        return {
            root: root,
            body: bodyGroup,
            head: headPivot,
            armL: armL,
            armR: armR,
            legL: legL,
            legR: legR,
            ball: ballMesh,
            scaleUnit: s
        };
    }

    function animateBronnyVoxelRig(rig, t, mode, opts) {
        if (!rig) return;
        opts = opts || {};
        var s = rig.scaleUnit || 0.13;

        if (mode === "flinch") {
            rig.body.position.y = -1.3 * s;
            rig.head.rotation.x = 0.35;
            rig.head.rotation.y = Math.sin(t * 28) * 0.22;
            rig.armL.rotation.set(-2.35, 0, -0.45);
            rig.armR.rotation.set(-2.35, 0, 0.45);
            rig.legL.rotation.x = -0.35;
            rig.legR.rotation.x = 0.35;
            rig.ball.position.set(6.0 * s, 2.2 * s, 1.5 * s);
            rig.ball.rotation.y = t * 6;
            return;
        }

        if (mode === "cheer") {
            var bounce = Math.abs(Math.sin(t * 5.6)) * 0.9 * s;
            rig.body.position.y = bounce;
            rig.head.rotation.x = -0.08 + Math.sin(t * 4.2) * 0.08;
            rig.head.rotation.y = Math.sin(t * 2.5) * 0.25;
            // Left arm clean diagonal fist pump, Right arm straight up spinning basketball!
            rig.armL.rotation.set(-0.35, 0, -2.25 - Math.sin(t * 7.2) * 0.28);
            rig.armR.rotation.set(-0.1, 0, 2.85);
            rig.legL.rotation.x = Math.sin(t * 5.6) * 0.22;
            rig.legR.rotation.x = -Math.sin(t * 5.6) * 0.22;
            rig.ball.position.set(5.4 * s, 21.0 * s + bounce, -0.3 * s);
            rig.ball.rotation.y = t * 14;
            rig.ball.rotation.x = 0.25;
            return;
        }

        if (mode === "wave") {
            var wBounce = Math.abs(Math.sin(t * 4.4)) * 0.65 * s;
            rig.body.position.y = wBounce;
            rig.head.rotation.x = 0.1;
            rig.head.rotation.y = Math.sin(t * 2.2) * 0.18;
            // Left arm holds ball tucked at hip; Right arm waves cleanly outward from shoulder!
            rig.armL.rotation.set(-0.35, 0, -0.32);
            rig.armR.rotation.set(-0.2, 0, 2.05 + Math.sin(t * 8.0) * 0.45);
            rig.legL.rotation.x = Math.sin(t * 4.4) * 0.14;
            rig.legR.rotation.x = -Math.sin(t * 4.4) * 0.14;
            rig.ball.position.set(-5.4 * s, 7.6 * s + wBounce, 1.5 * s);
            rig.ball.rotation.y = t * 3;
            return;
        }

        // Default "dribble": athletic knees-bent basketball dribble on the helipad!
        var dribbleCycle = Math.abs(Math.sin(t * 5.4));
        var crouch = (1 - dribbleCycle) * 0.55 * s;
        rig.body.position.y = crouch;
        rig.head.rotation.x = 0.06;
        rig.head.rotation.y = Math.sin(t * 1.8) * 0.22;
        rig.armL.rotation.set(-0.28, 0, -0.36 - Math.sin(t * 3.0) * 0.1);
        rig.armR.rotation.set(-0.45 - (1 - dribbleCycle) * 0.45, 0, 0.35);
        rig.legL.rotation.x = -0.1;
        rig.legR.rotation.x = 0.1;
        rig.ball.position.set(5.4 * s, (1.8 + dribbleCycle * 6.4) * s, 2.2 * s);
        rig.ball.rotation.x = t * 8;
        rig.ball.rotation.y = t * 4;
    }

    function createGodzillaRig(THREE) {
        var root = new THREE.Group();
        var bodyScaleGroup = new THREE.Group();
        root.add(bodyScaleGroup);

        var voxelSize = 0.135; // Orb diameter ~ 21 * 0.135 = 2.84 -> tall ~ 3.5 with legs!
        var skinMat = new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.82,
            metalness: 0.06
        });
        var dorsalMat = new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.44,
            metalness: 0.14,
            emissive: new THREE.Color(0xff5a00),
            emissiveIntensity: 0.22
        });
        var glowMat = new THREE.MeshBasicMaterial({
            vertexColors: true
        });

        // -----------------------------------------------------------------
        // 1. Main Sculpted Orb Torso + Furrowed Brow + Upper Maw + Dorsal Fins
        // -----------------------------------------------------------------
        var torsoVox = {};
        var dorsalVox = {};
        var eyeVox = {};
        var lowerJawVox = {};

        for (var y = -12; y <= 13; y++) {
            for (var x = -12; x <= 12; x++) {
                for (var z = -12; z <= 12; z++) {
                    var clusterN = hash3(Math.floor(x / 2), Math.floor(y / 2), Math.floor(z / 2));
                    var fineN = hash3(x + 31, y + 17, z + 53);
                    var r = Math.sqrt(x * x + (y * 0.96) * (y * 0.96) + (z * 1.03) * (z * 1.03));

                    // Organic rocky voxel protrusion shell
                    var shellR = 9.4 + clusterN * 1.05 + (fineN > 0.65 ? 0.45 : 0);

                    // Furrowed V-shaped angry brow ridges above eyes
                    var browSlopeY = 2.6 + Math.abs(x) * 0.36;
                    var isBrow = (z > 4 && Math.abs(x) >= 1 && Math.abs(x) <= 6 && y >= browSlopeY - 0.5 && y <= browSlopeY + 2.0);
                    if (isBrow) {
                        shellR += 1.55;
                    }

                    // Forehead scale nodules
                    var isForehead = (z > 3 && Math.abs(x) <= 2 && y >= 5 && y <= 9);
                    if (isForehead && fineN > 0.45) {
                        shellR += 0.95;
                    }

                    if (r > shellR) continue;

                    // Carve out eye sockets on front upper hemisphere
                    var inEyeSocket = false;
                    if (z > 4.2 && y >= 0 && y <= 5) {
                        var sideSign = x < 0 ? -1 : 1;
                        var ex = x - sideSign * 3.6;
                        var ey = y - 2.3;
                        var ang = sideSign * 0.30;
                        var rx = ex * Math.cos(ang) - ey * Math.sin(ang);
                        var ry = ex * Math.sin(ang) + ey * Math.cos(ang);
                        var eyeD = (rx * rx) / (2.4 * 2.4) + (ry * ry) / (1.3 * 1.3);
                        if (eyeD <= 1.0) {
                            inEyeSocket = true;
                            if (z >= 6.2 && z <= 8.4) {
                                // Recessed glowing molten voxel eye with sharp glowing slit core
                                if (Math.abs(rx) < 0.72 && Math.abs(ry) < 0.98) {
                                    eyeVox[x + "," + y + "," + z] = 0xfff8b8; // blazing slit pupil core
                                } else if (eyeD < 0.58) {
                                    eyeVox[x + "," + y + "," + z] = 0xff9400; // bright amber iris
                                } else {
                                    eyeVox[x + "," + y + "," + z] = 0xff3b00; // fiery orange-red rim
                                }
                            }
                            if (z > 5.8) continue; // keep socket recessed!
                        }
                    }

                    // Carve two flared dark nostrils between/below eyes
                    if (z >= 8.2 && y >= 0 && y <= 1 && (Math.abs(x) === 1)) {
                        torsoVox[x + "," + y + "," + z] = 0x131f11;
                        continue;
                    }

                    // Carve massive circular roaring maw cavity!
                    var mx = x / 5.7;
                    var my = (y + 2.6) / 4.7;
                    var mDist = Math.sqrt(mx * mx + my * my);
                    if (mDist < 1.0 && z > 1.2) {
                        var cavernDepth = 7.2 * (1.0 - mDist * 0.30);
                        if (z > 9.4 - cavernDepth) {
                            continue; // Hollow open mouth air!
                        }
                        // Inner throat dark burgundy -> abyssal black
                        if (mDist < 0.56) {
                            torsoVox[x + "," + y + "," + z] = 0x090102;
                        } else {
                            torsoVox[x + "," + y + "," + z] = 0x450a0e;
                        }
                        continue;
                    }

                    // Outer mouth lip ring (dark crimson rim)
                    if (mDist >= 1.0 && mDist < 1.2 && z > 6.2 && y > -6.5) {
                        torsoVox[x + "," + y + "," + z] = 0x611519;
                        continue;
                    }

                    // Separate lower jaw rim zone (we replace bottom lip with articulated lowerJawGroup!)
                    if (y <= -5 && Math.abs(x) <= 5 && z >= 6.2 && mDist < 1.3) {
                        continue;
                    }

                    var ridgeBias = (isBrow || isForehead) ? 1.15 : 0;
                    if (inEyeSocket) {
                        torsoVox[x + "," + y + "," + z] = 0x1a2b17;
                    } else {
                        torsoVox[x + "," + y + "," + z] = pickMossColor(x, y, z, ridgeBias);
                    }
                }
            }
        }

        // Iconic Jagged Triple-Row Godzilla Dorsal Spine Fins down the back!
        var dorsalCols = [
            { x: 0, reach: 4, startY: -6, endY: 11, col: 0xf59e0b },
            { x: -2, reach: 2, startY: -4, endY: 9, col: 0xd97706 },
            { x: 2, reach: 2, startY: -4, endY: 9, col: 0xd97706 }
        ];
        for (var dc = 0; dc < dorsalCols.length; dc++) {
            var dCol = dorsalCols[dc];
            for (var dy = dCol.startY; dy <= dCol.endY; dy++) {
                var toothPhase = ((dy + 10) % 4);
                var spikeLen = dCol.reach - (toothPhase === 0 ? 1 : (toothPhase === 3 ? 2 : 0));
                if (spikeLen < 1) continue;
                var surfZ = -Math.round(Math.sqrt(Math.max(4, 88 - dy * dy * 0.72 - dCol.x * dCol.x)));
                for (var sz = 0; sz <= spikeLen; sz++) {
                    var dz = surfZ - sz;
                    var finCol = sz === spikeLen ? 0xfef08a : (sz === spikeLen - 1 ? dCol.col : 0x456b38);
                    dorsalVox[dCol.x + "," + dy + "," + dz] = finCol;
                }
            }
        }

        // Upper + side-cheek jagged ivory fangs lining circular mouth arch
        var upperFangCoords = [
            { x: -5, y: -2, z: 8, h: 2 },
            { x: -5, y: -4, z: 8, h: 1 },
            { x: -4, y: -1, z: 8, h: 2 },
            { x: -3, y: 0, z: 9, h: 3 }, // big canine
            { x: -2, y: 0, z: 9, h: 2 },
            { x: -1, y: 0, z: 9, h: 2 },
            { x: 0, y: 0, z: 9, h: 2 },
            { x: 1, y: 0, z: 9, h: 2 },
            { x: 2, y: 0, z: 9, h: 2 },
            { x: 3, y: 0, z: 9, h: 3 }, // big canine
            { x: 4, y: -1, z: 8, h: 2 },
            { x: 5, y: -2, z: 8, h: 2 },
            { x: 5, y: -4, z: 8, h: 1 }
        ];
        for (var uf = 0; uf < upperFangCoords.length; uf++) {
            var fc = upperFangCoords[uf];
            for (var fh = 0; fh < fc.h; fh++) {
                var toothCol = fh === fc.h - 1 ? 0xfffdf2 : 0xebe3be;
                torsoVox[fc.x + "," + (fc.y - fh) + "," + fc.z] = toothCol;
                if (fh === 0) {
                    torsoVox[fc.x + "," + (fc.y - fh) + "," + (fc.z - 1)] = 0xdad0aa;
                }
            }
        }

        var torsoMesh = new THREE.Mesh(buildVoxelGeometry(torsoVox, voxelSize, [0, 0, 0]), skinMat);
        torsoMesh.castShadow = true;
        torsoMesh.receiveShadow = true;
        bodyScaleGroup.add(torsoMesh);

        var dorsalMesh = new THREE.Mesh(buildVoxelGeometry(dorsalVox, voxelSize, [0, 0, 0]), dorsalMat);
        dorsalMesh.castShadow = true;
        bodyScaleGroup.add(dorsalMesh);

        var eyesMesh = new THREE.Mesh(buildVoxelGeometry(eyeVox, voxelSize, [0, 0, 0]), glowMat);
        bodyScaleGroup.add(eyesMesh);

        // -----------------------------------------------------------------
        // 2. Articulated Lower Jaw + Lower Jagged Fangs
        // -----------------------------------------------------------------
        var lowerJawPivot = new THREE.Group();
        lowerJawPivot.position.set(0, -6.5 * voxelSize, 4.5 * voxelSize);
        bodyScaleGroup.add(lowerJawPivot);

        for (var jx = -4; jx <= 4; jx++) {
            for (var jz = 1; jz <= 5; jz++) {
                var jCurve = (jx * jx) / 22 + ((jz - 1) * (jz - 1)) / 24;
                if (jCurve > 1.0) continue;
                lowerJawVox[jx + ",-1," + jz] = pickMossColor(jx, -6, jz + 5, 0);
                lowerJawVox[jx + ",0," + jz] = (Math.abs(jx) <= 3 && jz <= 3) ? 0x450b0e : pickMossColor(jx, -5, jz + 5, 0.5);
            }
        }
        var lowerFangXs = [-3, -2, -1, 0, 1, 2, 3];
        for (var lf = 0; lf < lowerFangXs.length; lf++) {
            var lx = lowerFangXs[lf];
            var lz = Math.abs(lx) <= 1 ? 5 : (Math.abs(lx) === 2 ? 4 : 3);
            var lh = Math.abs(lx) === 2 ? 2 : 1;
            for (var lfh = 1; lfh <= lh; lfh++) {
                lowerJawVox[lx + "," + lfh + "," + lz] = lfh === lh ? 0xfffbe8 : 0xe9e1be;
            }
        }
        var lowerJawMesh = new THREE.Mesh(buildVoxelGeometry(lowerJawVox, voxelSize, [0, 0, 0]), skinMat);
        lowerJawMesh.castShadow = true;
        lowerJawPivot.add(lowerJawMesh);

        // Inner fiery throat core (glows when roaring!)
        var throatGlowMat = new THREE.MeshBasicMaterial({ color: 0xff6a00, transparent: true, opacity: 0.14 });
        var throatGlowMesh = new THREE.Mesh(new THREE.SphereGeometry(0.46, 10, 10), throatGlowMat);
        throatGlowMesh.position.set(0, -3.0 * voxelSize, 4.5 * voxelSize);
        bodyScaleGroup.add(throatGlowMesh);

        // Flickering fiery orange mouth/eye point light + dorsal ember light!
        var faceLight = new THREE.PointLight(0xff6b1a, 1.85, 13);
        faceLight.position.set(0, 0.25, 1.75);
        bodyScaleGroup.add(faceLight);

        var dorsalLight = new THREE.PointLight(0xff7b00, 0.75, 10);
        dorsalLight.position.set(0, 0.5, -1.75);
        bodyScaleGroup.add(dorsalLight);

        // -----------------------------------------------------------------
        // 3. Stubby Raised Upper Arms with 4 Splayed Ivory-Clawed Fingers
        // -----------------------------------------------------------------
        function buildArmMesh(side) {
            var armVox = {};
            for (var i = 0; i <= 5; i++) {
                for (var ay = -1; ay <= 1; ay++) {
                    for (var az = -1; az <= 1; az++) {
                        if (Math.abs(ay) === 1 && Math.abs(az) === 1 && i > 2) continue;
                        armVox[(i * side) + "," + ay + "," + az] = pickMossColor(i, ay + 4, az, 0.6);
                    }
                }
            }
            // Splayed 4-finger webbed claw hand with bone claw tips!
            var fingers = [
                [6, 2, 0], [7, 2, 0], [8, 3, 0],
                [6, 1, 1], [7, 1, 1], [8, 1, 1],
                [6, 0, -1], [7, 0, -1], [8, 0, -1],
                [6, -1, 0], [7, -2, 0], [8, -2, 0]
            ];
            for (var f = 0; f < fingers.length; f++) {
                var fg = fingers[f];
                var col = (f % 3 === 2) ? 0xf5eed0 : ((f % 3 === 1) ? 0x7ab45b : 0x5d9348);
                armVox[(fg[0] * side) + "," + fg[1] + "," + fg[2]] = col;
            }
            var mesh = new THREE.Mesh(buildVoxelGeometry(armVox, voxelSize * 0.94, [0, 0, 0]), skinMat);
            mesh.castShadow = true;
            return mesh;
        }

        var armLeftPivot = new THREE.Group();
        armLeftPivot.position.set(-8.6 * voxelSize, 4.0 * voxelSize, 1.2 * voxelSize);
        armLeftPivot.rotation.set(0.15, 0.22, -0.44);
        armLeftPivot.add(buildArmMesh(-1));
        bodyScaleGroup.add(armLeftPivot);

        var armRightPivot = new THREE.Group();
        armRightPivot.position.set(8.6 * voxelSize, 4.0 * voxelSize, 1.2 * voxelSize);
        armRightPivot.rotation.set(0.15, -0.22, 0.44);
        armRightPivot.add(buildArmMesh(1));
        bodyScaleGroup.add(armRightPivot);

        // -----------------------------------------------------------------
        // 4. Chunky Clawed Lower Stomp Legs with Ivory Toenails
        // -----------------------------------------------------------------
        function buildLegMesh(side) {
            var legVox = {};
            for (var ly = -5; ly <= 0; ly++) {
                var rad = ly < -3 ? 2 : 1;
                for (var lx = -rad; lx <= rad; lx++) {
                    for (var lz = -1; lz <= (ly < -3 ? 2 : 1); lz++) {
                        if (Math.abs(lx) === 2 && lz === -1 && ly > -5) continue;
                        legVox[lx + "," + ly + "," + lz] = pickMossColor(lx + side * 4, ly, lz, ly < -4 ? 1.0 : 0);
                    }
                }
            }
            // 4 clawed splayed toes facing forward (+Z) with bone claws
            var toes = [[-2, -5, 3], [-1, -5, 3], [1, -5, 3], [2, -5, 3]];
            for (var t = 0; t < toes.length; t++) {
                var tp = toes[t];
                legVox[tp[0] + "," + tp[1] + "," + tp[2]] = 0x7ab45b;
                legVox[tp[0] + "," + tp[1] + "," + (tp[2] + 1)] = 0xf5eed0;
            }
            var mesh = new THREE.Mesh(buildVoxelGeometry(legVox, voxelSize, [0, 0, 0]), skinMat);
            mesh.castShadow = true;
            return mesh;
        }

        var legLeftPivot = new THREE.Group();
        legLeftPivot.position.set(-5.2 * voxelSize, -8.0 * voxelSize, 0.8 * voxelSize);
        legLeftPivot.rotation.z = -0.14;
        legLeftPivot.add(buildLegMesh(-1));
        bodyScaleGroup.add(legLeftPivot);

        var legRightPivot = new THREE.Group();
        legRightPivot.position.set(5.2 * voxelSize, -8.0 * voxelSize, 0.8 * voxelSize);
        legRightPivot.rotation.z = 0.14;
        legRightPivot.add(buildLegMesh(1));
        bodyScaleGroup.add(legRightPivot);

        // -----------------------------------------------------------------
        // 5. Sweeping Layered Voxel Dragon-Fin Tail (3 Articulated Segments + Dorsal Fins!)
        // -----------------------------------------------------------------
        function buildTailSegment(len, w, h, tipBoost) {
            var tv = {};
            var fd = {};
            for (var tz = 0; tz < len; tz++) {
                var taper = 1.0 - (tz / (len + 1)) * 0.45;
                var hw = Math.max(1, Math.round(w * taper));
                var hh = Math.max(1, Math.round(h * taper));
                for (var ty = -hh; ty <= hh; ty++) {
                    for (var tx = -hw; tx <= hw; tx++) {
                        // Layered diagonal feathered/scaly plate pattern matching kid's drawing!
                        var plateOffset = (tz + ty) % 2;
                        if (Math.abs(tx) === hw && Math.abs(ty) === hh && plateOffset === 0) continue;
                        var ridge = (Math.abs(tx) === hw || ty === hh) ? 1.2 + (tipBoost || 0) : 0;
                        tv[tx + "," + ty + "," + (-tz)] = pickMossColor(tx + 9, ty - 2, tz, ridge);
                    }
                }
                if (tz % 2 === 1) {
                    fd["0," + (hh + 1) + "," + (-tz)] = 0xf59e0b;
                    if (tz < len - 1) fd["0," + (hh + 2) + "," + (-tz)] = 0xfef08a;
                }
            }
            var grp = new THREE.Group();
            var segMesh = new THREE.Mesh(buildVoxelGeometry(tv, voxelSize, [0, 0, 0]), skinMat);
            segMesh.castShadow = true;
            var finMesh = new THREE.Mesh(buildVoxelGeometry(fd, voxelSize, [0, 0, 0]), dorsalMat);
            grp.add(segMesh, finMesh);
            return grp;
        }

        var tailSeg1 = new THREE.Group();
        tailSeg1.position.set(4.1 * voxelSize, -4.8 * voxelSize, -5.8 * voxelSize);
        tailSeg1.rotation.set(-0.14, 0.68, 0.16);
        tailSeg1.add(buildTailSegment(6, 4, 2, 0.45));
        bodyScaleGroup.add(tailSeg1);

        var tailSeg2 = new THREE.Group();
        tailSeg2.position.set(0, 0, -5.5 * voxelSize);
        tailSeg2.rotation.set(0.08, 0.36, 0);
        tailSeg2.add(buildTailSegment(6, 3, 2, 0.85));
        tailSeg1.add(tailSeg2);

        var tailSeg3 = new THREE.Group();
        tailSeg3.position.set(0, 0.2 * voxelSize, -5.5 * voxelSize);
        tailSeg3.rotation.set(0.18, 0.28, 0);
        tailSeg3.add(buildTailSegment(6, 2, 1, 1.35));
        tailSeg2.add(tailSeg3);

        // Lift bodyScaleGroup so bottom of feet rests cleanly on y = 0!
        bodyScaleGroup.position.y = 13.5 * voxelSize;

        // Soft Ground Contact Shadow directly under Monster (kept at ground plane in renderThreeScene!)
        var shadowTex = makePixelTexture(function (ctx, s) {
            var grad = ctx.createRadialGradient(s / 2, s / 2, 2, s / 2, s / 2, s / 2);
            grad.addColorStop(0, "rgba(2, 6, 16, 0.72)");
            grad.addColorStop(0.6, "rgba(2, 6, 16, 0.38)");
            grad.addColorStop(1, "rgba(2, 6, 16, 0)");
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, s, s);
        }, 48, false);
        var shadowGeo = new THREE.PlaneGeometry(3.8, 3.8);
        shadowGeo.rotateX(-Math.PI / 2);
        var shadowDisc = new THREE.Mesh(shadowGeo, new THREE.MeshBasicMaterial({
            map: shadowTex,
            transparent: true,
            depthWrite: false
        }));
        shadowDisc.position.y = 0.03;
        root.add(shadowDisc);

        // -----------------------------------------------------------------
        // 6. Floating Ember Sparks & Layered Plasma Fire Breath + Rescued Bronny!
        // -----------------------------------------------------------------
        var emberGroup = new THREE.Group();
        root.add(emberGroup);
        var emberGeo = new THREE.BoxGeometry(0.13, 0.13, 0.13);
        var embers = [];
        for (var e = 0; e < 26; e++) {
            var eMat = new THREE.MeshBasicMaterial({
                color: e % 3 === 0 ? 0xfef08a : (e % 2 === 0 ? 0xff7b00 : 0xff3b00),
                transparent: true,
                opacity: 0.88
            });
            var eMesh = new THREE.Mesh(emberGeo, eMat);
            emberGroup.add(eMesh);
            embers.push({
                mesh: eMesh,
                ang: (e / 26) * Math.PI * 2,
                rad: 1.6 + (e % 5) * 0.3,
                yOff: (e % 6) * 0.48,
                speed: 0.95 + (e % 5) * 0.24
            });
        }

        // Atomic Ember Roar Plasma Beam (attached to mouth forward +Z)
        var beamGroup = new THREE.Group();
        beamGroup.position.set(0, 1.48, 1.45);
        beamGroup.visible = false;
        bodyScaleGroup.parent.add(beamGroup);

        var plasmaTex = makePixelTexture(function (ctx, s) {
            var grad = ctx.createLinearGradient(0, 0, 0, s);
            grad.addColorStop(0, "rgba(255, 251, 200, 0.95)");
            grad.addColorStop(0.28, "rgba(251, 146, 60, 0.85)");
            grad.addColorStop(0.7, "rgba(239, 68, 68, 0.55)");
            grad.addColorStop(1, "rgba(239, 68, 68, 0.0)");
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, s, s);
            for (var st = 0; st < 18; st++) {
                var sx = (st * 7) % s;
                var sy = (st * 11) % (s - 12);
                ctx.fillStyle = st % 2 === 0 ? "rgba(254, 240, 138, 0.9)" : "rgba(255, 255, 255, 0.85)";
                ctx.fillRect(sx, sy, 3, 10 + (st % 8));
            }
        }, 64, true);
        if (plasmaTex.wrapS !== undefined) {
            plasmaTex.wrapS = THREE.RepeatWrapping;
            plasmaTex.wrapT = THREE.RepeatWrapping;
            plasmaTex.repeat.set(3, 2);
        }

        var outerBeamGeo = new THREE.ConeGeometry(2.35, 21.5, 14, 1, true);
        outerBeamGeo.rotateX(-Math.PI / 2);
        outerBeamGeo.translate(0, 0, 10.75);
        var outerBeamMat = new THREE.MeshBasicMaterial({
            map: plasmaTex,
            color: 0xff7b22,
            transparent: true,
            opacity: 0.85,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide
        });
        var outerBeam = new THREE.Mesh(outerBeamGeo, outerBeamMat);
        beamGroup.add(outerBeam);

        var midBeamGeo = new THREE.ConeGeometry(1.35, 21, 10, 1, true);
        midBeamGeo.rotateX(-Math.PI / 2);
        midBeamGeo.translate(0, 0, 10.5);
        var midBeam = new THREE.Mesh(midBeamGeo, new THREE.MeshBasicMaterial({
            color: 0xfacc15,
            transparent: true,
            opacity: 0.65,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide
        }));
        beamGroup.add(midBeam);

        var innerBeamGeo = new THREE.ConeGeometry(0.55, 20.5, 8);
        innerBeamGeo.rotateX(-Math.PI / 2);
        innerBeamGeo.translate(0, 0, 10.25);
        var innerBeamMat = new THREE.MeshBasicMaterial({
            color: 0xfffbeb,
            transparent: true,
            opacity: 0.96,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        var innerBeam = new THREE.Mesh(innerBeamGeo, innerBeamMat);
        beamGroup.add(innerBeam);

        // Muzzle flare core & expanding pulse rings flying along the beam
        var muzzleCore = new THREE.Mesh(new THREE.SphereGeometry(0.85, 10, 10), new THREE.MeshBasicMaterial({
            color: 0xfef9c3,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        }));
        beamGroup.add(muzzleCore);

        var beamRings = [];
        var beamRingGeo = new THREE.RingGeometry(0.65, 1.0, 16);
        for (var br = 0; br < 4; br++) {
            var brMat = new THREE.MeshBasicMaterial({
                color: br % 2 === 0 ? 0xfef08a : 0xf97316,
                transparent: true,
                opacity: 0.8,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                side: THREE.DoubleSide
            });
            var brMesh = new THREE.Mesh(beamRingGeo, brMat);
            beamGroup.add(brMesh);
            beamRings.push({ mesh: brMesh, mat: brMat, offset: br * 0.25 });
        }

        // Rescued 3D Voxel Baby Bronny riding on Godzilla's head on Victory!
        var bronnyRiderRig = createBronnyVoxelRig(THREE, null);
        bronnyRiderRig.root.scale.setScalar(0.78);
        bronnyRiderRig.root.position.set(0, 10.6 * voxelSize, 1.8 * voxelSize);
        bronnyRiderRig.root.visible = false;
        bodyScaleGroup.add(bronnyRiderRig.root);

        return {
            root: root,
            body: bodyScaleGroup,
            lowerJaw: lowerJawPivot,
            armL: armLeftPivot,
            armR: armRightPivot,
            legL: legLeftPivot,
            legR: legRightPivot,
            tail1: tailSeg1,
            tail2: tailSeg2,
            tail3: tailSeg3,
            throatGlowMat: throatGlowMat,
            throatGlowMesh: throatGlowMesh,
            faceLight: faceLight,
            dorsalLight: dorsalLight,
            dorsalMat: dorsalMat,
            shadowDisc: shadowDisc,
            beamGroup: beamGroup,
            outerBeam: outerBeam,
            midBeam: midBeam,
            innerBeam: innerBeam,
            plasmaTex: plasmaTex,
            muzzleCore: muzzleCore,
            beamRings: beamRings,
            embers: embers,
            bronnyRiderRig: bronnyRiderRig,
            skinMat: skinMat
        };
    }

    // =========================================================================
    // --- Procedural Pixel-Art City & Military Textures ---
    // =========================================================================

    function makePixelTexture(drawFn, size, crispPixel, height) {
        var w = size || 64;
        var h = height || w;
        var c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        var ctx = c.getContext("2d");
        ctx.imageSmoothingEnabled = false;
        drawFn(ctx, w, h);
        if (!window.THREE) return c;
        var tex = new THREE.CanvasTexture(c);
        if (crispPixel !== false) {
            tex.magFilter = THREE.NearestFilter;
            tex.minFilter = THREE.NearestFilter;
            tex.generateMipmaps = false;
        }
        return tex;
    }

    function createCityTextures() {
        var glassCanvas = document.createElement("canvas");
        glassCanvas.width = 64;
        glassCanvas.height = 64;
        var gCtx = glassCanvas.getContext("2d");
        gCtx.imageSmoothingEnabled = false;

        var glassEmissiveCanvas = document.createElement("canvas");
        glassEmissiveCanvas.width = 64;
        glassEmissiveCanvas.height = 64;
        var geCtx = glassEmissiveCanvas.getContext("2d");
        geCtx.imageSmoothingEnabled = false;

        // Crisp 64x64 tileable Skyscraper Curtain Wall (3 floors per 64px tile)
        gCtx.fillStyle = "#162238";
        gCtx.fillRect(0, 0, 64, 64);
        geCtx.fillStyle = "#000000";
        geCtx.fillRect(0, 0, 64, 64);
        for (var gy = 0; gy < 64; gy += 16) {
            // Spandrel floor beam
            gCtx.fillStyle = "#0f172a";
            gCtx.fillRect(0, gy, 64, 3);
            gCtx.fillStyle = "#334155";
            gCtx.fillRect(0, gy + 3, 64, 1);
            for (var gx = 2; gx < 62; gx += 8) {
                var hVal = (gx * 13 + gy * 7) % 11;
                var isLit = hVal > 2;
                var winCol = !isLit ? "#0b1322" : (hVal % 4 === 0 ? "#fef08a" : (hVal % 2 === 0 ? "#7dd3fc" : "#38bdf8"));
                gCtx.fillStyle = winCol;
                gCtx.fillRect(gx, gy + 5, 6, 9);
                if (isLit) {
                    // Subtle blinds/reflection diagonal stripe
                    gCtx.fillStyle = "rgba(255,255,255,0.22)";
                    gCtx.fillRect(gx, gy + 5, 2, 4);
                    geCtx.fillStyle = winCol;
                    geCtx.fillRect(gx, gy + 5, 6, 9);
                }
            }
        }

        // Crisp 64x64 tileable Brick Apartment Facade
        var brickCanvas = document.createElement("canvas");
        brickCanvas.width = 64;
        brickCanvas.height = 64;
        var bCtx = brickCanvas.getContext("2d");
        bCtx.imageSmoothingEnabled = false;
        var brickEmissiveCanvas = document.createElement("canvas");
        brickEmissiveCanvas.width = 64;
        brickEmissiveCanvas.height = 64;
        var beCtx = brickEmissiveCanvas.getContext("2d");
        beCtx.imageSmoothingEnabled = false;

        bCtx.fillStyle = "#6e2513";
        bCtx.fillRect(0, 0, 64, 64);
        beCtx.fillStyle = "#000000";
        beCtx.fillRect(0, 0, 64, 64);
        for (var by = 0; by < 64; by += 4) {
            bCtx.fillStyle = "#8a3118";
            bCtx.fillRect(0, by, 64, 2);
            var brickOff = (by % 8 === 0) ? 0 : 4;
            bCtx.fillStyle = "#561c0e";
            for (var bx = brickOff; bx < 64; bx += 8) {
                bCtx.fillRect(bx, by, 1, 3);
            }
        }
        for (var wy = 4; wy < 60; wy += 16) {
            bCtx.fillStyle = "#475569";
            bCtx.fillRect(0, wy + 12, 64, 2); // stone ledge
            for (var wx = 4; wx < 60; wx += 12) {
                var litB = ((wx * 5 + wy * 9) % 7) > 1;
                var bWin = litB ? (((wx + wy) % 12 === 0) ? "#fb923c" : "#fde047") : "#1c1917";
                bCtx.fillStyle = "#334155";
                bCtx.fillRect(wx - 1, wy - 1, 10, 12); // window frame
                bCtx.fillStyle = bWin;
                bCtx.fillRect(wx, wy, 8, 10);
                bCtx.fillStyle = "#334155";
                bCtx.fillRect(wx + 3, wy, 2, 10); // mullion cross
                bCtx.fillRect(wx, wy + 4, 8, 2);
                if (litB) {
                    beCtx.fillStyle = bWin;
                    beCtx.fillRect(wx, wy, 8, 10);
                }
            }
        }

        function texFromCanvas(cnv, wrap) {
            var tex = new THREE.CanvasTexture(cnv);
            tex.magFilter = THREE.NearestFilter;
            tex.minFilter = THREE.NearestFilter;
            tex.generateMipmaps = false;
            if (wrap) {
                tex.wrapS = THREE.RepeatWrapping;
                tex.wrapT = THREE.RepeatWrapping;
            }
            return tex;
        }

        var palettes = {
            glassCanvas: glassCanvas,
            glassEmissiveCanvas: glassEmissiveCanvas,
            brickCanvas: brickCanvas,
            brickEmissiveCanvas: brickEmissiveCanvas,
            glass: texFromCanvas(glassCanvas, true),
            glassEmissive: texFromCanvas(glassEmissiveCanvas, true),
            brick: texFromCanvas(brickCanvas, true),
            brickEmissive: texFromCanvas(brickEmissiveCanvas, true),
            diner: makePixelTexture(function (ctx, s) {
                ctx.fillStyle = "#b91c48";
                ctx.fillRect(0, 0, s, s);
                // Chrome band + pixel checkerboard trim
                ctx.fillStyle = "#e2e8f0";
                ctx.fillRect(0, 14, s, 6);
                for (var cx = 0; cx < s; cx += 4) {
                    ctx.fillStyle = (cx % 8 === 0) ? "#111827" : "#f8fafc";
                    ctx.fillRect(cx, 20, 4, 4);
                    ctx.fillStyle = ((cx + 4) % 8 === 0) ? "#111827" : "#f8fafc";
                    ctx.fillRect(cx, 24, 4, 4);
                }
                // Glowing neon sign strip
                ctx.fillStyle = "#facc15";
                ctx.fillRect(6, 4, s - 12, 8);
                ctx.fillStyle = "#ef4444";
                ctx.fillRect(10, 6, s - 20, 4);
                // Warm plate-glass diner windows
                ctx.fillStyle = "#fde68a";
                ctx.fillRect(5, 34, 22, 22);
                ctx.fillRect(37, 34, 22, 22);
                ctx.fillStyle = "#38bdf8";
                ctx.fillRect(5, 34, 22, 5);
                ctx.fillRect(37, 34, 22, 5);
            }, 64),
            dinerEmissive: makePixelTexture(function (ctx, s) {
                ctx.fillStyle = "#000000";
                ctx.fillRect(0, 0, s, s);
                ctx.fillStyle = "#facc15";
                ctx.fillRect(6, 4, s - 12, 8);
                ctx.fillStyle = "#fde68a";
                ctx.fillRect(5, 34, 22, 22);
                ctx.fillRect(37, 34, 22, 22);
            }, 64),
            dinerSign: makePixelTexture(function (ctx, s) {
                ctx.fillStyle = "#1e1b4b";
                ctx.fillRect(0, 0, s, s);
                ctx.strokeStyle = "#facc15";
                ctx.lineWidth = 4;
                ctx.strokeRect(2, 2, s - 4, s - 4);
                // Pixel burger emblem in center
                ctx.fillStyle = "#f59e0b";
                ctx.fillRect(18, 18, 28, 8);
                ctx.fillStyle = "#22c55e";
                ctx.fillRect(16, 26, 32, 5);
                ctx.fillStyle = "#78350f";
                ctx.fillRect(17, 31, 30, 7);
                ctx.fillStyle = "#f59e0b";
                ctx.fillRect(18, 38, 28, 7);
            }, 64),
            billboards: [
                makePixelTexture(function (ctx, s) {
                    ctx.fillStyle = "#1e1b4b";
                    ctx.fillRect(0, 0, s, s);
                    ctx.strokeStyle = "#facc15";
                    ctx.lineWidth = 4;
                    ctx.strokeRect(2, 2, s - 4, s - 4);
                    ctx.fillStyle = "#f59e0b";
                    ctx.fillRect(18, 18, 28, 8);
                    ctx.fillStyle = "#22c55e";
                    ctx.fillRect(16, 26, 32, 5);
                    ctx.fillStyle = "#78350f";
                    ctx.fillRect(17, 31, 30, 7);
                    ctx.fillStyle = "#f59e0b";
                    ctx.fillRect(18, 38, 28, 7);
                }, 64),
                makePixelTexture(function (ctx, s) {
                    ctx.fillStyle = "#3b0764";
                    ctx.fillRect(0, 0, s, s);
                    ctx.strokeStyle = "#facc15";
                    ctx.lineWidth = 4;
                    ctx.strokeRect(2, 2, s - 4, s - 4);
                    // Crown crest + gold #9 Lakers emblem
                    ctx.fillStyle = "#facc15";
                    ctx.fillRect(16, 10, 6, 8);
                    ctx.fillRect(29, 8, 6, 10);
                    ctx.fillRect(42, 10, 6, 8);
                    ctx.fillRect(16, 18, 32, 4);
                    ctx.fillStyle = "#fde047";
                    ctx.fillRect(22, 26, 20, 26);
                    ctx.fillStyle = "#4c1d95";
                    ctx.fillRect(27, 30, 10, 7);
                    ctx.fillRect(27, 42, 10, 6);
                }, 64),
                makePixelTexture(function (ctx, s) {
                    ctx.fillStyle = "#082f49";
                    ctx.fillRect(0, 0, s, s);
                    ctx.strokeStyle = "#22d3ee";
                    ctx.lineWidth = 4;
                    ctx.strokeRect(2, 2, s - 4, s - 4);
                    // Atomic Cola glowing cyan can + magenta energy stripe
                    ctx.fillStyle = "#e2e8f0";
                    ctx.fillRect(22, 12, 20, 5);
                    ctx.fillRect(22, 47, 20, 5);
                    ctx.fillStyle = "#06b6d4";
                    ctx.fillRect(20, 17, 24, 30);
                    ctx.fillStyle = "#f43f5e";
                    ctx.fillRect(20, 27, 24, 9);
                    ctx.fillStyle = "#ecfeff";
                    ctx.fillRect(13, 19, 4, 4);
                    ctx.fillRect(47, 15, 4, 4);
                    ctx.fillRect(48, 39, 4, 4);
                }, 64),
                makePixelTexture(function (ctx, s) {
                    ctx.fillStyle = "#1f1035";
                    ctx.fillRect(0, 0, s, s);
                    ctx.strokeStyle = "#f43f5e";
                    ctx.lineWidth = 4;
                    ctx.strokeRect(2, 2, s - 4, s - 4);
                    // Neon pixel arcade cabinet + lime star
                    ctx.fillStyle = "#4ade80";
                    ctx.fillRect(14, 14, 14, 14);
                    ctx.fillStyle = "#16a34a";
                    ctx.fillRect(18, 18, 6, 6);
                    ctx.fillStyle = "#facc15";
                    ctx.fillRect(34, 14, 16, 6);
                    ctx.fillStyle = "#38bdf8";
                    ctx.fillRect(34, 24, 16, 6);
                    ctx.fillStyle = "#f43f5e";
                    ctx.fillRect(14, 36, 36, 12);
                    ctx.fillStyle = "#fef08a";
                    ctx.fillRect(20, 40, 24, 4);
                }, 64)
            ],
            reactor: makePixelTexture(function (ctx, s) {
                ctx.fillStyle = "#273549";
                ctx.fillRect(0, 0, s, s);
                ctx.fillStyle = "#1e293b";
                ctx.fillRect(0, 0, s, 4);
                ctx.fillRect(0, 30, s, 4);
                // Riveted steel side plates
                ctx.fillStyle = "#475569";
                ctx.fillRect(4, 6, 8, 22);
                ctx.fillRect(s - 12, 6, 8, 22);
                // Diagonal hazard stripe base
                for (var i = -s; i < s * 2; i += 10) {
                    ctx.fillStyle = "#facc15";
                    ctx.fillRect(i, 48, 5, 16);
                    ctx.fillStyle = "#0f172a";
                    ctx.fillRect(i + 5, 48, 5, 16);
                }
                // Glowing cyan containment core window
                ctx.fillStyle = "#0891b2";
                ctx.fillRect(16, 10, 32, 30);
                ctx.fillStyle = "#22d3ee";
                ctx.fillRect(20, 14, 24, 22);
                ctx.fillStyle = "#ecfeff";
                ctx.fillRect(26, 18, 12, 14);
            }, 64),
            reactorEmissive: makePixelTexture(function (ctx, s) {
                ctx.fillStyle = "#000000";
                ctx.fillRect(0, 0, s, s);
                ctx.fillStyle = "#22d3ee";
                ctx.fillRect(18, 12, 28, 26);
                ctx.fillStyle = "#cffafe";
                ctx.fillRect(26, 18, 12, 14);
            }, 64),
            lakers: makePixelTexture(function (ctx, s) {
                ctx.fillStyle = "#4c1d95";
                ctx.fillRect(0, 0, s, s);
                ctx.fillStyle = "#facc15";
                ctx.fillRect(0, 0, s, 5);
                ctx.fillRect(0, s - 5, s, 5);
                ctx.fillStyle = "#a855f7";
                ctx.fillRect(0, 5, s, 2);
                for (var y = 11; y < s - 9; y += 11) {
                    for (var x = 5; x < s - 6; x += 10) {
                        ctx.fillStyle = ((x + y) % 2 === 0) ? "#fde047" : "#c084fc";
                        ctx.fillRect(x, y, 6, 7);
                    }
                }
                // Bold center gold #9 / crown crest bar
                ctx.fillStyle = "#facc15";
                ctx.fillRect(26, 22, 12, 18);
                ctx.fillStyle = "#581c87";
                ctx.fillRect(29, 25, 6, 5);
                ctx.fillRect(29, 33, 6, 4);
            }, 64),
            lakersEmissive: makePixelTexture(function (ctx, s) {
                ctx.fillStyle = "#000000";
                ctx.fillRect(0, 0, s, s);
                for (var y = 11; y < s - 9; y += 11) {
                    for (var x = 5; x < s - 6; x += 10) {
                        ctx.fillStyle = ((x + y) % 2 === 0) ? "#facc15" : "#9333ea";
                        ctx.fillRect(x, y, 6, 7);
                    }
                }
                ctx.fillStyle = "#fde047";
                ctx.fillRect(26, 22, 12, 18);
            }, 64),
            cracked: makePixelTexture(function (ctx, s) {
                ctx.fillStyle = "#18181b";
                ctx.fillRect(0, 0, s, s);
                ctx.fillStyle = "#27272a";
                ctx.fillRect(4, 4, 24, 16);
                ctx.fillRect(34, 22, 24, 18);
                ctx.fillStyle = "#52525b";
                ctx.fillRect(4, 18, 22, 4);
                ctx.fillRect(28, 42, 26, 4);
                // Jagged glowing ember cracks
                ctx.fillStyle = "#f97316";
                ctx.fillRect(10, 8, 5, 16);
                ctx.fillRect(15, 22, 10, 4);
                ctx.fillRect(40, 26, 6, 16);
                ctx.fillStyle = "#fef08a";
                ctx.fillRect(12, 12, 2, 10);
                ctx.fillRect(42, 30, 2, 10);
            }, 64),
            crackedEmissive: makePixelTexture(function (ctx, s) {
                ctx.fillStyle = "#000000";
                ctx.fillRect(0, 0, s, s);
                ctx.fillStyle = "#ea580c";
                ctx.fillRect(10, 8, 5, 16);
                ctx.fillRect(15, 22, 10, 4);
                ctx.fillRect(40, 26, 6, 16);
                ctx.fillStyle = "#fef08a";
                ctx.fillRect(12, 12, 2, 10);
                ctx.fillRect(42, 30, 2, 10);
            }, 64),
            asphalt: (function () {
                var t = makePixelTexture(function (ctx, s) {
                    ctx.fillStyle = "#131824";
                    ctx.fillRect(0, 0, s, s);
                    for (var i = 0; i < 90; i++) {
                        var px = (i * 19) % s;
                        var py = (i * 31) % s;
                        ctx.fillStyle = i % 2 === 0 ? "#1b2232" : "#0e121c";
                        ctx.fillRect(px, py, 2, 2);
                    }
                    ctx.fillStyle = "#1f293d";
                    ctx.fillRect(0, 0, s, 1);
                    ctx.fillRect(0, 0, 1, s);
                }, 64, true);
                if (t.wrapS !== undefined) {
                    t.wrapS = THREE.RepeatWrapping;
                    t.wrapT = THREE.RepeatWrapping;
                    t.repeat.set(26, 26);
                }
                return t;
            })(),
            sidewalk: (function () {
                var t = makePixelTexture(function (ctx, s) {
                    ctx.fillStyle = "#2b3446";
                    ctx.fillRect(0, 0, s, s);
                    ctx.fillStyle = "#1e2533";
                    for (var y = 0; y < s; y += 16) ctx.fillRect(0, y, s, 2);
                    for (var x = 0; x < s; x += 16) ctx.fillRect(x, 0, 2, s);
                    ctx.fillStyle = "#39445b";
                    for (var sy = 2; sy < s; sy += 16) {
                        for (var sx = 2; sx < s; sx += 16) {
                            ctx.fillRect(sx, sy, 12, 2);
                        }
                    }
                }, 64, true);
                if (t.wrapS !== undefined) {
                    t.wrapS = THREE.RepeatWrapping;
                    t.wrapT = THREE.RepeatWrapping;
                    t.repeat.set(3, 3);
                }
                return t;
            })(),
            skyMoon: makePixelTexture(function (ctx, s) {
                ctx.clearRect(0, 0, s, s);
                var r = s * 0.42;
                var cx = s / 2;
                var cy = s / 2;
                for (var py = 0; py < s; py += 2) {
                    for (var px = 0; px < s; px += 2) {
                        var d = Math.hypot(px - cx, py - cy);
                        if (d < r) {
                            var crater = ((px - 22) * (px - 22) + (py - 20) * (py - 20) < 36) ||
                                ((px - 36) * (px - 36) + (py - 32) * (py - 32) < 25);
                            ctx.fillStyle = crater ? "#fde68a" : "#fef9c3";
                            ctx.fillRect(px, py, 2, 2);
                        }
                    }
                }
            }, 64, true),
            tiledCache: {}
        };

        palettes.getTiledBuildingPair = function (kind, h) {
            var repY = Math.max(1, Math.round(h / (kind === "glass" ? 6 : 5)));
            var key = kind + "_" + repY;
            if (palettes.tiledCache[key]) return palettes.tiledCache[key];

            if (kind === "glass" || kind === "brick") {
                var cTex = texFromCanvas(kind === "glass" ? palettes.glassCanvas : palettes.brickCanvas, true);
                var eTex = texFromCanvas(kind === "glass" ? palettes.glassEmissiveCanvas : palettes.brickEmissiveCanvas, true);
                cTex.repeat.set(1, repY);
                eTex.repeat.set(1, repY);
                palettes.tiledCache[key] = { map: cTex, emissiveMap: eTex };
                return palettes.tiledCache[key];
            }
            if (kind === "diner") {
                palettes.tiledCache[key] = { map: palettes.diner, emissiveMap: palettes.dinerEmissive };
                return palettes.tiledCache[key];
            }
            if (kind === "reactor") {
                palettes.tiledCache[key] = { map: palettes.reactor, emissiveMap: palettes.reactorEmissive };
                return palettes.tiledCache[key];
            }
            palettes.tiledCache[key] = { map: palettes.lakers, emissiveMap: palettes.lakersEmissive };
            return palettes.tiledCache[key];
        };

        return palettes;
    }

    // =========================================================================
    // --- Game State, Replay Districts, Arenas, & Run Bounties ---
    // =========================================================================

    var CITY_DISTRICTS = [
        { id: "downtown", name: "Downtown Glass", skyHex: 0x0c1428, fogHex: 0x131b33, canvasBg: "#0e1526", treeCut: 0.12, dinerCut: 0.24, reactorCut: 0.34, brickCut: 0.56, unitMult: 1.0, chopperBias: 0.55, tankBias: 0.36 },
        { id: "reactor", name: "Reactor Sector", skyHex: 0x081921, fogHex: 0x0f252e, canvasBg: "#0a1c24", treeCut: 0.12, dinerCut: 0.24, reactorCut: 0.54, brickCut: 0.78, unitMult: 1.0, chopperBias: 0.44, tankBias: 0.42 },
        { id: "neon", name: "Neon Strip", skyHex: 0x180e2c, fogHex: 0x22143a, canvasBg: "#150e28", treeCut: 0.14, dinerCut: 0.44, reactorCut: 0.56, brickCut: 0.78, unitMult: 1.0, chopperBias: 0.40, tankBias: 0.38 },
        { id: "fortress", name: "Fortress Plaza", skyHex: 0x1c1018, fogHex: 0x261522, canvasBg: "#1b1018", treeCut: 0.10, dinerCut: 0.20, reactorCut: 0.32, brickCut: 0.76, unitMult: 1.25, chopperBias: 0.42, tankBias: 0.58 }
    ];

    var CITY_ARENAS = [
        { id: "north", name: "North Plaza", towerX: 0, towerZ: -48, spawnX: 0, spawnZ: 36, spawnAngle: Math.PI * 0.92 },
        { id: "nw", name: "NW Midtown", towerX: -24, towerZ: -48, spawnX: 24, spawnZ: 24, spawnAngle: -Math.PI * 0.75 },
        { id: "ne", name: "NE Heights", towerX: 24, towerZ: -48, spawnX: -24, spawnZ: 24, spawnAngle: Math.PI * 0.75 },
        { id: "south", name: "South Harbor", towerX: 0, towerZ: 24, spawnX: 0, spawnZ: -52, spawnAngle: 0.12 }
    ];

    var BOUNTY_POOL = [
        { id: "choppers", title: "Sky Hunter", shortLabel: "Choppers", stat: "choppersDown", target: 3, reward: 400 },
        { id: "reactors", title: "Chain Blast", shortLabel: "Reactors", stat: "reactorsWrecked", target: 2, reward: 400 },
        { id: "glass", title: "Skyline Wreck", shortLabel: "Glass", stat: "glassWrecked", target: 6, reward: 425 },
        { id: "tanks", title: "Tank Buster", shortLabel: "Tanks", stat: "tanksDown", target: 3, reward: 400 },
        { id: "vaults", title: "Vault Raider", shortLabel: "Raider", stat: "vaultsSmashed", target: 2, reward: 425 },
        { id: "combo", title: "Frenzy x10", shortLabel: "x10 Streak", stat: "frenzyReached", target: 1, reward: 400 }
    ];

    var BILLBOARD_ACCENTS = ["#facc15", "#a855f7", "#22d3ee", "#f43f5e"];

    var lastDistrictIdx = -1;
    var lastArenaIdx = -1;
    var districtBag = [];
    var arenaBag = [];

    var gzState = {
        active: false,
        mode: "idle", // "idle" | "playing" | "victory_anim" | "gameover"
        outcome: null, // "win" | "loss"
        citySeed: 0,
        district: CITY_DISTRICTS[0],
        arena: CITY_ARENAS[0],
        score: 0,
        destructionScore: 0,
        bountyScore: 0,
        rescueBonus: 0,
        timeBonus: 0,
        healthBonus: 0,
        styleRank: "C",
        combo: 0,
        maxCombo: 0,
        comboTimer: 0,
        buildingsWrecked: 0,
        totalBuildings: 0,
        vaultsSmashed: 0,
        unitsSmashed: 0,
        hp: 100,
        maxHp: 100,
        rage: 50,
        maxRage: 100,
        threatLevel: 1,
        wave3Triggered: false,
        wave5Triggered: false,
        elapsed: 0,
        trauma: 0,
        hitstop: 0,
        bannerTimer: 0,
        victoryTimer: 0,
        spawnTimer: 1.5,
        chopperTimer: 3.5,
        aceTimer: 12.0,
        aceTowerReinforced: false,
        frenzySurgeHit: false,
        vaultThreatBoost: 0,
        shieldHintCd: 0,
        stepAccum: 0,
        lastStepSign: 1,
        gameId: 0,
        submitted: false,
        leaderboard: null,
        lastTime: 0,
        animFrame: null,

        cam: {
            offX: 6.8,
            offY: 16.5,
            offZ: 13.8,
            lookX: -0.3,
            lookY: 1.5,
            lookZ: -1.2,
            fov: 46,
            zoom2d: 1.0
        },

        stats: {
            choppersDown: 0,
            reactorsWrecked: 0,
            glassWrecked: 0,
            tanksDown: 0,
            vaultsSmashed: 0,
            frenzyReached: 0
        },

        bounties: [],

        monster: {
            x: 0,
            y: 0,
            z: 36,
            vx: 0,
            vz: 0,
            vy: 0,
            angle: 0.26,
            targetAngle: 0.26,
            speed: 14.2,
            radius: 1.75,
            smashCd: 0,
            smashAnim: 0,
            tailCd: 0,
            tailAnim: 0,
            roarTimer: 0,
            hurtTimer: 0,
            chompHitDone: false,
            tailHitDone: false
        },

        buildings: [],
        vaults: [],
        megaTower: null,
        props: [],
        enemies: [],
        projectiles: [],
        debris: [],
        pickups: [],
        particles: [],
        popups: [],
        scorchMarks: [],
        rubble: [],
        shockwaves: []
    };

    var gzInput = {
        up: false,
        down: false,
        left: false,
        right: false,
        joyX: 0,
        joyY: 0,
        joyActive: false
    };

    // --- Graphics State ---
    var useThree = false;
    var threeRenderer = null;
    var threeScene = null;
    var threeCamera = null;
    var worldGroup = null;
    var cityGroup = null;
    var dynamicGroup = null;
    var skyGroup = null;
    var sunLight = null;
    var sunTarget = null;
    var hemiLight = null;
    var rimLight = null;
    var skyMoon = null;
    var skyMoonGlow = null;
    var skyStars = null;
    var skylineWindows = [];
    var reactorRings = [];
    var beaconTips = [];
    var cityMaterialsToDispose = [];
    var monsterRig = null;
    var cityTextures = null;
    var fallbackCtx = null;

    // Shared geometries/materials for dynamic objects (zero GPU leaks!)
    var sharedGeo = {};
    var sharedMat = {};

    function trackCityMat(mat) {
        cityMaterialsToDispose.push(mat);
        return mat;
    }

    function disposeCityMaterials() {
        for (var i = 0; i < cityMaterialsToDispose.length; i++) {
            var m = cityMaterialsToDispose[i];
            if (m && typeof m.dispose === "function") {
                m.dispose();
            }
        }
        cityMaterialsToDispose = [];
    }

    function ensureSharedAssets() {
        if (!window.THREE || sharedGeo.box) return;
        sharedGeo.box = new THREE.BoxGeometry(1, 1, 1);
        sharedGeo.cyl = new THREE.CylinderGeometry(0.5, 0.5, 1, 8);
        sharedGeo.sphere = new THREE.SphereGeometry(0.5, 10, 10);
        sharedGeo.cone = new THREE.ConeGeometry(0.5, 1, 10);
        sharedGeo.octa = new THREE.OctahedronGeometry(0.5, 0);
        sharedGeo.ring = new THREE.RingGeometry(0.7, 1.0, 18);
        sharedGeo.ring.rotateX(-Math.PI / 2);
        sharedGeo.ringThin = new THREE.RingGeometry(0.84, 1.0, 20);
        sharedGeo.ringThin.rotateX(-Math.PI / 2);
        sharedGeo.shadowCircle = new THREE.CircleGeometry(0.5, 16);
        sharedGeo.shadowCircle.rotateX(-Math.PI / 2);

        sharedMat.smoke = new THREE.MeshBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.72 });
        sharedMat.hitFlash = new THREE.MeshBasicMaterial({ color: 0xfffbeb });
        sharedMat.fire = new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.9 });
        sharedMat.spark = new THREE.MeshBasicMaterial({ color: 0xfef08a });
        sharedMat.gold = new THREE.MeshLambertMaterial({ color: 0xfacc15, emissive: 0x854d0e, emissiveIntensity: 0.45 });
        sharedMat.purple = new THREE.MeshLambertMaterial({ color: 0x9333ea, emissive: 0x3b0764, emissiveIntensity: 0.25 });
        sharedMat.bullet = new THREE.MeshBasicMaterial({ color: 0xfde047 });
        sharedMat.missile = new THREE.MeshBasicMaterial({ color: 0xef4444 });
        sharedMat.shell = new THREE.MeshBasicMaterial({ color: 0xf97316 });
        sharedMat.shadow = new THREE.MeshBasicMaterial({ color: 0x050810, transparent: true, opacity: 0.44, side: THREE.DoubleSide, depthWrite: false });
        sharedMat.spot = new THREE.MeshBasicMaterial({ color: 0xfef9c3, transparent: true, opacity: 0.19, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
        sharedMat.laser = new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.68 });
        sharedMat.heal = new THREE.MeshBasicMaterial({ color: 0x22c55e });
        sharedMat.burgerBun = new THREE.MeshLambertMaterial({ color: 0xf59e0b });
        sharedMat.burgerPatty = new THREE.MeshLambertMaterial({ color: 0x78350f });
        sharedMat.cheese = new THREE.MeshLambertMaterial({ color: 0xfde047 });
        sharedMat.lettuce = new THREE.MeshLambertMaterial({ color: 0x4ade80 });
        sharedMat.sesame = new THREE.MeshBasicMaterial({ color: 0xfef3c7 });
        sharedMat.scorch = new THREE.MeshBasicMaterial({ color: 0x090d16, transparent: true, opacity: 0.72, side: THREE.DoubleSide, depthWrite: false });

        sharedMat.tire = new THREE.MeshLambertMaterial({ color: 0x111827 });
        sharedMat.carGlass = new THREE.MeshPhongMaterial({ color: 0x38bdf8, shininess: 90, specular: 0xe0f2fe });
        sharedMat.headlight = new THREE.MeshBasicMaterial({ color: 0xfef9c3 });
        sharedMat.taillight = new THREE.MeshBasicMaterial({ color: 0xef4444 });
        sharedMat.caution = new THREE.MeshLambertMaterial({ color: 0xfacc15, emissive: 0x713f12, emissiveIntensity: 0.2 });
        sharedMat.steel = new THREE.MeshPhongMaterial({ color: 0x64748b, shininess: 40 });
        sharedMat.chrome = new THREE.MeshPhongMaterial({ color: 0xe2e8f0, shininess: 95 });
        sharedMat.bark = new THREE.MeshLambertMaterial({ color: 0x713f12 });
        sharedMat.leaf = new THREE.MeshLambertMaterial({ color: 0x22c55e });
        sharedMat.leafDark = new THREE.MeshLambertMaterial({ color: 0x15803d });
        sharedMat.olive = new THREE.MeshLambertMaterial({ color: 0x4d7c0f });
        sharedMat.oliveDark = new THREE.MeshLambertMaterial({ color: 0x365314 });
        sharedMat.sirenRed = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
        sharedMat.sirenBlue = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
        sharedMat.chopperRotor = new THREE.MeshLambertMaterial({ color: 0x1e293b });
        sharedMat.chopperBlur = new THREE.MeshBasicMaterial({ color: 0xcbd5e1, transparent: true, opacity: 0.24, side: THREE.DoubleSide, depthWrite: false });
        sharedMat.thruster = new THREE.MeshBasicMaterial({ color: 0xfb923c });
        sharedMat.beaconRed = new THREE.MeshBasicMaterial({ color: 0xef4444 });
        sharedMat.cyanGlow = new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
        sharedMat.cyanRing = new THREE.MeshLambertMaterial({ color: 0x06b6d4, emissive: 0x22d3ee, emissiveIntensity: 0.9 });
    }

    function gzInitGraphics(skipWorldBuild) {
        if (!canvasEl || !viewportEl) return;

        if (window.THREE && !threeRenderer) {
            try {
                threeRenderer = new THREE.WebGLRenderer({
                    canvas: canvasEl,
                    antialias: true,
                    alpha: false,
                    powerPreference: "high-performance"
                });
                threeRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
                threeRenderer.setClearColor(0x0c1326, 1);
                threeRenderer.shadowMap.enabled = true;
                threeRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
                if (THREE.ACESFilmicToneMapping !== undefined) {
                    threeRenderer.toneMapping = THREE.ACESFilmicToneMapping;
                    threeRenderer.toneMappingExposure = 1.12;
                }

                threeScene = new THREE.Scene();
                threeScene.fog = new THREE.FogExp2(0x13162b, 0.0056);

                var aspect = (viewportEl.clientWidth || 640) / (viewportEl.clientHeight || 520);
                threeCamera = new THREE.PerspectiveCamera(46, aspect, 0.5, 280);

                hemiLight = new THREE.HemisphereLight(0xb8dcff, 0x2d2438, 0.94);
                threeScene.add(hemiLight);

                sunTarget = new THREE.Object3D();
                threeScene.add(sunTarget);

                sunLight = new THREE.DirectionalLight(0xffd7a8, 1.18);
                sunLight.position.set(28, 52, 32);
                sunLight.target = sunTarget;
                sunLight.castShadow = true;
                sunLight.shadow.mapSize.width = 1024;
                sunLight.shadow.mapSize.height = 1024;
                sunLight.shadow.camera.near = 6;
                sunLight.shadow.camera.far = 140;
                sunLight.shadow.camera.left = -46;
                sunLight.shadow.camera.right = 46;
                sunLight.shadow.camera.top = 46;
                sunLight.shadow.camera.bottom = -46;
                sunLight.shadow.bias = -0.0012;
                threeScene.add(sunLight);

                rimLight = new THREE.DirectionalLight(0x38bdf8, 0.56);
                rimLight.position.set(-34, 22, -32);
                threeScene.add(rimLight);

                ensureSharedAssets();
                cityTextures = createCityTextures();

                skyGroup = new THREE.Group();
                threeScene.add(skyGroup);
                buildSkyBackdrop(skyGroup);

                worldGroup = new THREE.Group();
                cityGroup = new THREE.Group();
                dynamicGroup = new THREE.Group();
                threeScene.add(worldGroup);
                worldGroup.add(cityGroup);
                worldGroup.add(dynamicGroup);

                buildStaticGround(worldGroup);

                monsterRig = createGodzillaRig(THREE);
                threeScene.add(monsterRig.root);

                useThree = true;
            } catch (err) {
                useThree = false;
            }
        }

        if (canvasEl) {
            canvasEl.classList.toggle("is-fallback", !useThree);
        }

        if (!useThree) {
            fallbackCtx = canvasEl.getContext("2d");
        }

        if (!skipWorldBuild) {
            buildCityWorld();
        }
        gzResize();
        paintCameoBanner(cameoCanvas, false);
    }

    function buildSkyBackdrop(parent) {
        skylineWindows = [];
        // Distant starfield dome
        var starCount = 260;
        var positions = new Float32Array(starCount * 3);
        var colors = new Float32Array(starCount * 3);
        var cGold = new THREE.Color(0xfef08a);
        var cCyan = new THREE.Color(0xbae6fd);
        var cWhite = new THREE.Color(0xf8fafc);
        for (var si = 0; si < starCount; si++) {
            var phi = (si * 2.39996) % (Math.PI * 2);
            var elev = 0.14 + ((si * 17) % 100) / 145;
            var rad = 138;
            positions[si * 3] = Math.cos(phi) * Math.cos(elev) * rad;
            positions[si * 3 + 1] = 8 + Math.sin(elev) * rad * 0.65;
            positions[si * 3 + 2] = Math.sin(phi) * Math.cos(elev) * rad - 10;
            var pickCol = si % 5 === 0 ? cGold : (si % 3 === 0 ? cCyan : cWhite);
            colors[si * 3] = pickCol.r;
            colors[si * 3 + 1] = pickCol.g;
            colors[si * 3 + 2] = pickCol.b;
        }
        var starGeo = new THREE.BufferGeometry();
        starGeo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
        starGeo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
        var starMat = new THREE.PointsMaterial({
            size: 1.5,
            vertexColors: true,
            transparent: true,
            opacity: 0.88,
            fog: false
        });
        skyStars = new THREE.Points(starGeo, starMat);
        parent.add(skyStars);

        // Glowing crisp pixel moon + ambient halo billboarded toward camera horizon
        var moonPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(18, 18),
            new THREE.MeshBasicMaterial({
                map: cityTextures.skyMoon,
                transparent: true,
                fog: false
            })
        );
        moonPlane.position.set(-48, 54, -124);
        skyMoon = moonPlane;
        parent.add(moonPlane);

        var haloPlane = new THREE.Mesh(
            new THREE.CircleGeometry(15, 24),
            new THREE.MeshBasicMaterial({
                color: 0xfef08a,
                transparent: true,
                opacity: 0.12,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                fog: false
            })
        );
        haloPlane.position.set(-48, 54, -125);
        skyMoonGlow = haloPlane;
        parent.add(haloPlane);

        // Distant metropolis skyline silhouette ring
        var silMat = new THREE.MeshBasicMaterial({ color: 0x0a1020, fog: true });
        var winMatAmber = new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.72, fog: true });
        var winMatCyan = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.65, fog: true });
        var totalTowers = 44;
        for (var ti = 0; ti < totalTowers; ti++) {
            var ang = (ti / totalTowers) * Math.PI * 2;
            var distR = 98 + (ti % 3) * 8;
            var sx = Math.cos(ang) * distR;
            var sz = Math.sin(ang) * distR - 10;
            var sw = 7 + (ti % 4) * 2.2;
            var sd = 7 + ((ti + 2) % 3) * 2;
            var sh = 14 + ((ti * 7) % 26);

            var tower = new THREE.Mesh(sharedGeo.box, silMat);
            tower.scale.set(sw, sh, sd);
            tower.position.set(sx, sh * 0.5 - 1, sz);
            tower.rotation.y = -ang;
            parent.add(tower);

            if (ti % 2 === 0) {
                var strip = new THREE.Mesh(sharedGeo.box, ti % 4 === 0 ? winMatCyan : winMatAmber);
                strip.scale.set(sw * 0.52, sh * 0.48, sd + 0.18);
                strip.position.set(sx, sh * 0.56, sz);
                strip.rotation.y = -ang;
                parent.add(strip);
                skylineWindows.push(strip);
            }
        }
    }

    function buildStaticGround(parent) {
        // City base textured asphalt
        var groundGeo = new THREE.PlaneGeometry(CITY_HALF * 2 + 64, CITY_HALF * 2 + 64);
        groundGeo.rotateX(-Math.PI / 2);
        var groundMat = new THREE.MeshLambertMaterial({
            color: 0xffffff,
            map: cityTextures.asphalt
        });
        var ground = new THREE.Mesh(groundGeo, groundMat);
        ground.position.y = -0.02;
        ground.receiveShadow = true;
        parent.add(ground);

        // City blocks & road markings
        var roadLines = new THREE.Group();
        var avenues = [-48, -24, 0, 24, 48];
        var sidewalkMat = new THREE.MeshLambertMaterial({
            color: 0xffffff,
            map: cityTextures.sidewalk
        });
        var curbMat = new THREE.MeshLambertMaterial({ color: 0x3b475f });
        var dashMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
        var crossMat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0 });
        var seawallMat = new THREE.MeshLambertMaterial({ color: 0x334155 });

        // Sidewalk pads & stepped curb trim inside each 24x24 block
        for (var bx = -36; bx <= 36; bx += 24) {
            for (var bz = -60; bz <= 36; bz += 24) {
                var pad = new THREE.Mesh(sharedGeo.box, sidewalkMat);
                pad.scale.set(16.6, 0.14, 16.6);
                pad.position.set(bx, 0.05, bz);
                pad.receiveShadow = true;
                roadLines.add(pad);

                var innerCurb = new THREE.Mesh(sharedGeo.box, curbMat);
                innerCurb.scale.set(15.2, 0.06, 15.2);
                innerCurb.position.set(bx, 0.13, bz);
                innerCurb.receiveShadow = true;
                roadLines.add(innerCurb);
            }
        }

        // Yellow center dashes along avenues
        for (var ai = 0; ai < avenues.length; ai++) {
            var pos = avenues[ai];
            for (var d = -56; d <= 44; d += 6) {
                var dashZ = new THREE.Mesh(sharedGeo.box, dashMat);
                dashZ.scale.set(0.24, 0.02, 2.3);
                dashZ.position.set(pos, 0.015, d);
                roadLines.add(dashZ);

                if (d >= -48 && d <= 48) {
                    var dashX = new THREE.Mesh(sharedGeo.box, dashMat);
                    dashX.scale.set(2.3, 0.02, 0.24);
                    dashX.position.set(d, 0.015, pos - 12);
                    roadLines.add(dashX);
                }
            }

            // Crisp zebra crosswalks at major intersections
            for (var cz = -60; cz <= 36; cz += 24) {
                for (var s = -1.8; s <= 1.81; s += 1.2) {
                    var stripeN = new THREE.Mesh(sharedGeo.box, crossMat);
                    stripeN.scale.set(0.48, 0.02, 1.5);
                    stripeN.position.set(pos + s, 0.018, cz + 4.4);
                    roadLines.add(stripeN);

                    var stripeS = new THREE.Mesh(sharedGeo.box, crossMat);
                    stripeS.scale.set(0.48, 0.02, 1.5);
                    stripeS.position.set(pos + s, 0.018, cz - 4.4);
                    roadLines.add(stripeS);
                }
            }
        }

        // 4-sided seawall perimeter with hazard stripes & corner harbor beacons
        var minZ = -CITY_HALF - 10;
        var maxZ = CITY_HALF - 10;
        var wallSpecs = [
            { x: 0, z: minZ, sx: CITY_HALF * 2 + 1.4, sz: 1.1, horiz: true },
            { x: 0, z: maxZ, sx: CITY_HALF * 2 + 1.4, sz: 1.1, horiz: true },
            { x: -CITY_HALF, z: -10, sx: 1.1, sz: CITY_HALF * 2, horiz: false },
            { x: CITY_HALF, z: -10, sx: 1.1, sz: CITY_HALF * 2, horiz: false }
        ];
        for (var wi = 0; wi < wallSpecs.length; wi++) {
            var ws = wallSpecs[wi];
            var baseWall = new THREE.Mesh(sharedGeo.box, seawallMat);
            baseWall.scale.set(ws.sx, 0.72, ws.sz);
            baseWall.position.set(ws.x, 0.36, ws.z);
            baseWall.castShadow = true;
            baseWall.receiveShadow = true;
            roadLines.add(baseWall);

            // Alternating yellow hazard segments along top rail
            var stepLen = 10;
            for (var sp = -CITY_HALF + 5; sp <= CITY_HALF - 5; sp += stepLen) {
                var haz = new THREE.Mesh(sharedGeo.box, sharedMat.caution);
                if (ws.horiz) {
                    haz.scale.set(4.5, 0.14, 1.24);
                    haz.position.set(sp, 0.76, ws.z);
                } else {
                    haz.scale.set(1.24, 0.14, 4.5);
                    haz.position.set(ws.x, 0.76, sp - 10);
                }
                roadLines.add(haz);
            }
        }

        // Corner harbor pylons
        var cornerCoords = [
            [-CITY_HALF, minZ],
            [CITY_HALF, minZ],
            [-CITY_HALF, maxZ],
            [CITY_HALF, maxZ]
        ];
        for (var ci = 0; ci < cornerCoords.length; ci++) {
            var pylon = new THREE.Mesh(sharedGeo.box, seawallMat);
            pylon.scale.set(1.8, 3.2, 1.8);
            pylon.position.set(cornerCoords[ci][0], 1.6, cornerCoords[ci][1]);
            pylon.castShadow = true;
            roadLines.add(pylon);

            var cap = new THREE.Mesh(sharedGeo.box, sharedMat.beaconRed);
            cap.scale.set(0.95, 0.65, 0.95);
            cap.position.set(cornerCoords[ci][0], 3.5, cornerCoords[ci][1]);
            roadLines.add(cap);
        }

        parent.add(roadLines);
    }

    function clearGroup(grp) {
        if (!grp) return;
        while (grp.children.length > 0) {
            grp.remove(grp.children[0]);
        }
    }

    function buildCityWorld() {
        gzState.buildings = [];
        gzState.vaults = [];
        gzState.props = [];
        gzState.enemies = [];
        gzState.projectiles = [];
        gzState.debris = [];
        gzState.pickups = [];
        gzState.particles = [];
        gzState.popups = [];
        gzState.scorchMarks = [];
        gzState.rubble = [];
        gzState.shockwaves = [];
        reactorRings = [];
        beaconTips = [];

        if (popupLayerEl) popupLayerEl.innerHTML = "";
        if (useThree) {
            clearGroup(cityGroup);
            clearGroup(dynamicGroup);
            disposeCityMaterials();
        }

        // Procedural city seed per run for high replayability
        if (!gzState.citySeed) {
            gzState.citySeed = ((Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0) || 4219;
        }
        var seed = gzState.citySeed;
        function rand() {
            seed = (seed * 1664525 + 1013904223) >>> 0;
            return seed / 4294967296;
        }

        var district = gzState.district || CITY_DISTRICTS[0];
        var arena = gzState.arena || CITY_ARENAS[0];
        TOWER_X = arena.towerX;
        TOWER_Z = arena.towerZ;

        if (useThree && threeRenderer && threeScene) {
            threeRenderer.setClearColor(district.skyHex, 1);
            if (threeScene.fog) threeScene.fog.color.setHex(district.fogHex);

            // District atmospheric lighting tint
            if (rimLight) {
                var rimHex = district.id === "neon" ? 0xe879f9
                    : (district.id === "reactor" ? 0x22d3ee
                    : (district.id === "fortress" ? 0xfb923c : 0x38bdf8));
                rimLight.color.setHex(rimHex);
            }
            if (hemiLight) {
                hemiLight.intensity = district.id === "neon" ? 0.98 : 0.92;
            }

            // Grand Lakers Plaza pad under Mega Tower's chosen plaza
            var plazaRing = new THREE.Mesh(
                new THREE.CylinderGeometry(8.2, 8.6, 0.22, 20),
                trackCityMat(new THREE.MeshLambertMaterial({ color: 0x4c1d95 }))
            );
            plazaRing.position.set(TOWER_X, 0.09, TOWER_Z);
            plazaRing.receiveShadow = true;
            cityGroup.add(plazaRing);

            var plazaGold = new THREE.Mesh(
                new THREE.CylinderGeometry(6.2, 6.2, 0.25, 20),
                trackCityMat(new THREE.MeshLambertMaterial({ color: 0xeab308 }))
            );
            plazaGold.position.set(TOWER_X, 0.11, TOWER_Z);
            plazaGold.receiveShadow = true;
            cityGroup.add(plazaGold);

            var plazaCore = new THREE.Mesh(
                new THREE.CylinderGeometry(4.2, 4.2, 0.27, 20),
                trackCityMat(new THREE.MeshLambertMaterial({ color: 0x3b0764 }))
            );
            plazaCore.position.set(TOWER_X, 0.12, TOWER_Z);
            plazaCore.receiveShadow = true;
            cityGroup.add(plazaCore);
        }

        // Roll 2 distinct Run Bounties from pool
        var bountyIndices = [];
        for (var biPool = 0; biPool < BOUNTY_POOL.length; biPool++) bountyIndices.push(biPool);
        for (var sh = bountyIndices.length - 1; sh > 0; sh--) {
            var sw = Math.floor(rand() * (sh + 1));
            var tmpIdx = bountyIndices[sh];
            bountyIndices[sh] = bountyIndices[sw];
            bountyIndices[sw] = tmpIdx;
        }
        gzState.bounties = [
            { id: BOUNTY_POOL[bountyIndices[0]].id, title: BOUNTY_POOL[bountyIndices[0]].title, shortLabel: BOUNTY_POOL[bountyIndices[0]].shortLabel, stat: BOUNTY_POOL[bountyIndices[0]].stat, target: BOUNTY_POOL[bountyIndices[0]].target, reward: BOUNTY_POOL[bountyIndices[0]].reward, done: false },
            { id: BOUNTY_POOL[bountyIndices[1]].id, title: BOUNTY_POOL[bountyIndices[1]].title, shortLabel: BOUNTY_POOL[bountyIndices[1]].shortLabel, stat: BOUNTY_POOL[bountyIndices[1]].stat, target: BOUNTY_POOL[bountyIndices[1]].target, reward: BOUNTY_POOL[bountyIndices[1]].reward, done: false }
        ];

        var idCounter = 1;

        function addBuilding(x, z, w, d, h, kind, hp, pts, opts) {
            opts = opts || {};
            var rotStep = typeof opts.rotStep === "number" ? (opts.rotStep & 3) : 0;
            var swapDims = (rotStep % 2) === 1;
            var billboardIdx = typeof opts.billboardIdx === "number" ? opts.billboardIdx : 0;
            var hasBillboard = !!opts.hasBillboard;
            var b = {
                id: idCounter++,
                x: x,
                z: z,
                w: swapDims ? d : w,
                d: swapDims ? w : d,
                h: h,
                kind: kind,
                hp: hp,
                maxHp: hp,
                pts: pts,
                rotStep: rotStep,
                billboardIdx: billboardIdx,
                hasBillboard: hasBillboard,
                destroyed: false,
                shake: 0,
                flash: 0,
                collapseAnim: 0,
                collapseTiltX: 0,
                collapseTiltZ: 0,
                mesh: null,
                rotGroup: null,
                bodyMesh: null,
                baseBodyMat: null,
                fadeMats: []
            };

            if (useThree) {
                var grp = new THREE.Group();
                grp.position.set(x, 0, z);
                var rotGroup = new THREE.Group();
                rotGroup.rotation.y = rotStep * (Math.PI * 0.5);
                grp.add(rotGroup);
                b.rotGroup = rotGroup;

                var pair = cityTextures.getTiledBuildingPair(kind, h);
                var bodyMat = trackCityMat(new THREE.MeshLambertMaterial({
                    map: pair.map,
                    emissiveMap: pair.emissiveMap,
                    emissive: 0xffffff,
                    emissiveIntensity: 0.88
                }));
                b.fadeMats.push(bodyMat);
                b.baseBodyMat = bodyMat;

                function makePartMat(opts) {
                    var m = trackCityMat(new THREE.MeshLambertMaterial(opts));
                    b.fadeMats.push(m);
                    return m;
                }
                function makeBasicPartMat(opts) {
                    var m = trackCityMat(new THREE.MeshBasicMaterial(opts));
                    b.fadeMats.push(m);
                    return m;
                }

                var body = new THREE.Mesh(sharedGeo.box, bodyMat);
                body.scale.set(w, h, d);
                body.position.y = h * 0.5;
                body.castShadow = true;
                body.receiveShadow = true;
                rotGroup.add(body);

                var bbTextures = cityTextures.billboards || [cityTextures.dinerSign];
                var bbTex = bbTextures[billboardIdx % bbTextures.length];

                if (kind === "glass") {
                    var plinthMat = makePartMat({ color: 0x0f172a });
                    var plinth = new THREE.Mesh(sharedGeo.box, plinthMat);
                    plinth.scale.set(w + 0.34, 1.35, d + 0.34);
                    plinth.position.y = 0.68;
                    plinth.castShadow = true;
                    plinth.receiveShadow = true;

                    var trimMat = makeBasicPartMat({ color: 0x38bdf8, transparent: true, opacity: 0.85 });
                    var canopy = new THREE.Mesh(sharedGeo.box, trimMat);
                    canopy.scale.set(w * 0.56, 0.22, 0.72);
                    canopy.position.set(0, 1.45, d * 0.5 + 0.25);

                    var setback = new THREE.Mesh(sharedGeo.box, bodyMat);
                    setback.scale.set(w * 0.74, h * 0.14, d * 0.74);
                    setback.position.y = h + h * 0.07;
                    setback.castShadow = true;

                    var crownTopY = h + h * 0.14;
                    var crown = new THREE.Mesh(sharedGeo.box, plinthMat);
                    crown.scale.set(w * 0.54, 0.55, d * 0.54);
                    crown.position.y = crownTopY + 0.28;

                    var neonCollar = new THREE.Mesh(sharedGeo.box, trimMat);
                    neonCollar.scale.set(w * 0.76, 0.16, d * 0.76);
                    neonCollar.position.y = h + 0.08;

                    var spire = new THREE.Mesh(sharedGeo.box, makePartMat({ color: 0x94a3b8 }));
                    spire.scale.set(0.2, 2.5, 0.2);
                    spire.position.y = crownTopY + 1.5;

                    var tipMat = makeBasicPartMat({ color: 0xff2a2a });
                    var tip = new THREE.Mesh(sharedGeo.box, tipMat);
                    tip.scale.set(0.38, 0.38, 0.38);
                    tip.position.y = crownTopY + 2.85;
                    beaconTips.push({ mesh: tip, mat: tipMat, phase: (x + z) * 0.37 });

                    var hvac = new THREE.Mesh(sharedGeo.box, makePartMat({ color: 0x475569 }));
                    hvac.scale.set(1.1, 0.5, 0.85);
                    hvac.position.set(-w * 0.18, crownTopY + 0.65, d * 0.14);

                    rotGroup.add(plinth, canopy, setback, crown, neonCollar, spire, tip, hvac);
                } else if (kind === "brick") {
                    var corniceMat = makePartMat({ color: 0x7c2d12 });
                    var stoneMat = makePartMat({ color: 0xd6d3d1 });
                    var cornice = new THREE.Mesh(sharedGeo.box, stoneMat);
                    cornice.scale.set(w + 0.32, 0.42, d + 0.32);
                    cornice.position.y = h - 0.12;
                    cornice.castShadow = true;

                    var storeBase = new THREE.Mesh(sharedGeo.box, makePartMat({ color: 0x1e293b }));
                    storeBase.scale.set(w + 0.18, 1.25, d + 0.18);
                    storeBase.position.y = 0.62;

                    var awning = new THREE.Mesh(sharedGeo.box, makePartMat({ color: 0xdc2626 }));
                    awning.scale.set(w * 0.68, 0.34, 0.85);
                    awning.position.set(0, 1.38, d * 0.5 + 0.32);

                    // 4-legged rooftop wooden water tower
                    var wtX = w * 0.22;
                    var wtZ = -d * 0.2;
                    var stiltMat = makePartMat({ color: 0x475569 });
                    for (var sxOff = -0.45; sxOff <= 0.46; sxOff += 0.9) {
                        for (var szOff = -0.45; szOff <= 0.46; szOff += 0.9) {
                            var leg = new THREE.Mesh(sharedGeo.box, stiltMat);
                            leg.scale.set(0.14, 0.95, 0.14);
                            leg.position.set(wtX + sxOff, h + 0.48, wtZ + szOff);
                            rotGroup.add(leg);
                        }
                    }
                    var barrel = new THREE.Mesh(sharedGeo.cyl, makePartMat({ color: 0x92400e }));
                    barrel.scale.set(1.35, 1.35, 1.35);
                    barrel.position.set(wtX, h + 1.55, wtZ);
                    barrel.castShadow = true;

                    var barrelCone = new THREE.Mesh(sharedGeo.cone, corniceMat);
                    barrelCone.scale.set(1.55, 0.72, 1.55);
                    barrelCone.position.set(wtX, h + 2.55, wtZ);

                    var hatch = new THREE.Mesh(sharedGeo.box, makePartMat({ color: 0x334155 }));
                    hatch.scale.set(1.1, 0.55, 1.1);
                    hatch.position.set(-w * 0.2, h + 0.28, d * 0.16);

                    rotGroup.add(cornice, storeBase, awning, barrel, barrelCone, hatch);
                } else if (kind === "diner") {
                    var chromeMat = makePartMat({ color: 0xe2e8f0 });
                    var coralMat = makePartMat({ color: 0xf43f5e });
                    var roofTrim = new THREE.Mesh(sharedGeo.box, chromeMat);
                    roofTrim.scale.set(w + 0.35, 0.36, d + 0.35);
                    roofTrim.position.y = h + 0.08;

                    var redBand = new THREE.Mesh(sharedGeo.box, coralMat);
                    redBand.scale.set(w + 0.42, 0.22, d + 0.42);
                    redBand.position.y = h * 0.48;

                    var dinerAwning = new THREE.Mesh(sharedGeo.box, coralMat);
                    dinerAwning.scale.set(w * 0.86, 0.28, 1.1);
                    dinerAwning.position.set(0, 1.75, d * 0.5 + 0.46);

                    // Neon marquee billboard using rotated theme texture
                    var marquee = new THREE.Mesh(
                        sharedGeo.box,
                        makePartMat({
                            map: bbTex,
                            emissiveMap: bbTex,
                            emissive: 0xffffff,
                            emissiveIntensity: 1.05
                        })
                    );
                    marquee.scale.set(w * 0.88, 1.45, 0.36);
                    marquee.position.set(0, h + 1.05, d * 0.26);
                    marquee.castShadow = true;

                    var vent = new THREE.Mesh(sharedGeo.cyl, chromeMat);
                    vent.scale.set(0.65, 0.85, 0.65);
                    vent.position.set(-w * 0.25, h + 0.55, -d * 0.22);

                    rotGroup.add(roofTrim, redBand, dinerAwning, marquee, vent);
                } else if (kind === "reactor") {
                    var steelDarkMat = makePartMat({ color: 0x1e293b });
                    var hazardMat = makePartMat({ color: 0xfacc15, emissive: 0x713f12, emissiveIntensity: 0.2 });
                    var rBase = new THREE.Mesh(sharedGeo.box, steelDarkMat);
                    rBase.scale.set(w + 0.6, 0.95, d + 0.6);
                    rBase.position.y = 0.48;
                    rBase.castShadow = true;
                    rBase.receiveShadow = true;

                    var rStripe = new THREE.Mesh(sharedGeo.box, hazardMat);
                    rStripe.scale.set(w + 0.68, 0.24, d + 0.68);
                    rStripe.position.y = 0.98;

                    // 4 external coolant pipe columns + glowing cyan collars
                    var cyanCollarMat = makeBasicPartMat({ color: 0x22d3ee });
                    var offX = w * 0.48;
                    var offZ = d * 0.48;
                    var pipeOffsets = [
                        [-offX, -offZ], [offX, -offZ], [-offX, offZ], [offX, offZ]
                    ];
                    for (var pi = 0; pi < pipeOffsets.length; pi++) {
                        var pipe = new THREE.Mesh(sharedGeo.cyl, steelDarkMat);
                        pipe.scale.set(0.62, h + 0.4, 0.62);
                        pipe.position.set(pipeOffsets[pi][0], h * 0.5, pipeOffsets[pi][1]);
                        pipe.castShadow = true;
                        rotGroup.add(pipe);

                        var band = new THREE.Mesh(sharedGeo.cyl, cyanCollarMat);
                        band.scale.set(0.76, 0.28, 0.76);
                        band.position.set(pipeOffsets[pi][0], h * 0.68, pipeOffsets[pi][1]);
                        rotGroup.add(band);
                    }

                    var domeMat = makeBasicPartMat({ color: 0x22d3ee });
                    var dome = new THREE.Mesh(sharedGeo.sphere, domeMat);
                    dome.scale.set(w * 0.72, w * 0.58, d * 0.72);
                    dome.position.y = h;

                    var ringMat = makeBasicPartMat({ color: 0x67e8f9, side: THREE.DoubleSide });
                    var cRing = new THREE.Mesh(new THREE.TorusGeometry(w * 0.56, 0.14, 6, 18), ringMat);
                    cRing.position.y = h + 0.55;
                    cRing.rotation.x = 1.15;
                    reactorRings.push(cRing);

                    rotGroup.add(rBase, rStripe, dome, cRing);
                }

                // Optional themed neon billboard on rooftops / facades
                if (hasBillboard && (kind === "glass" || kind === "brick")) {
                    var bbFrame = new THREE.Mesh(sharedGeo.box, makePartMat({ color: 0x0f172a }));
                    bbFrame.scale.set(w * 0.72, 1.55, 0.28);
                    var bbPanel = new THREE.Mesh(
                        sharedGeo.box,
                        makePartMat({
                            map: bbTex,
                            emissiveMap: bbTex,
                            emissive: 0xffffff,
                            emissiveIntensity: 1.0
                        })
                    );
                    bbPanel.scale.set(w * 0.66, 1.32, 0.34);
                    var bbY = kind === "glass" ? h * 0.68 : h + 0.92;
                    var bbZ = kind === "glass" ? d * 0.5 + 0.14 : d * 0.22;
                    bbFrame.position.set(0, bbY, bbZ);
                    bbPanel.position.set(0, bbY, bbZ + 0.04);
                    rotGroup.add(bbFrame, bbPanel);
                }

                cityGroup.add(grp);
                b.mesh = grp;
                b.bodyMesh = body;
            }
            gzState.buildings.push(b);
        }

        function addVault(x, z) {
            var v = {
                id: idCounter++,
                x: x,
                z: z,
                w: 3.4,
                d: 3.4,
                h: 3.8,
                hp: 46,
                maxHp: 46,
                pts: 125,
                bonus: 275,
                destroyed: false,
                shake: 0,
                flash: 0,
                mesh: null,
                coreMesh: null,
                baseCoreMat: null,
                ringMesh: null
            };
            if (useThree && cityGroup) {
                var grp = new THREE.Group();
                grp.position.set(x, 0, z);

                var ped = new THREE.Mesh(sharedGeo.box, sharedMat.purple);
                ped.scale.set(3.5, 0.85, 3.5);
                ped.position.y = 0.42;
                ped.castShadow = true;
                ped.receiveShadow = true;

                var trim = new THREE.Mesh(sharedGeo.box, sharedMat.gold);
                trim.scale.set(3.8, 0.26, 3.8);
                trim.position.y = 0.94;
                trim.castShadow = true;

                // 4 corner golden obelisk pillars around shrine
                for (var vx = -1.45; vx <= 1.46; vx += 2.9) {
                    for (var vz = -1.45; vz <= 1.46; vz += 2.9) {
                        var pil = new THREE.Mesh(sharedGeo.box, sharedMat.purple);
                        pil.scale.set(0.42, 2.2, 0.42);
                        pil.position.set(vx, 1.5, vz);
                        pil.castShadow = true;
                        var pCap = new THREE.Mesh(sharedGeo.octa, sharedMat.gold);
                        pCap.scale.set(0.45, 0.45, 0.45);
                        pCap.position.set(vx, 2.75, vz);
                        grp.add(pil, pCap);
                    }
                }

                var coreMat = trackCityMat(new THREE.MeshLambertMaterial({ color: 0xfef08a, emissive: 0xf59e0b, emissiveIntensity: 0.85 }));
                var core = new THREE.Mesh(
                    sharedGeo.octa,
                    coreMat
                );
                core.scale.set(1.9, 2.3, 1.9);
                core.position.y = 2.45;
                v.baseCoreMat = coreMat;

                var orbitRing = new THREE.Mesh(
                    sharedGeo.ringThin,
                    trackCityMat(new THREE.MeshBasicMaterial({ color: 0xfde047, side: THREE.DoubleSide }))
                );
                orbitRing.scale.setScalar(1.65);
                orbitRing.position.y = 2.45;
                orbitRing.rotation.x = 0.55;

                var halo = new THREE.Mesh(
                    sharedGeo.ring,
                    trackCityMat(new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide }))
                );
                halo.scale.setScalar(3.1);
                halo.position.y = 0.14;

                var beam = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.45, 1.15, 16, 10, 1, true),
                    trackCityMat(new THREE.MeshBasicMaterial({
                        color: 0xfacc15,
                        transparent: true,
                        opacity: 0.18,
                        side: THREE.DoubleSide,
                        blending: THREE.AdditiveBlending,
                        depthWrite: false
                    }))
                );
                beam.position.y = 8.4;

                grp.add(ped, trim, core, orbitRing, halo, beam);
                cityGroup.add(grp);
                v.mesh = grp;
                v.coreMesh = core;
                v.ringMesh = orbitRing;
            }
            gzState.vaults.push(v);
        }

        // Populate 4x5 city blocks keeping Spawn, Camera Sightline, and Tower Plazas clear
        var spawnX = arena.spawnX;
        var spawnZ = arena.spawnZ;
        var blockCentersX = [-36, -12, 12, 36];
        var blockCentersZ = [-60, -36, -12, 12, 36];
        var slots = [
            { dx: -4.1, dz: -4.1 },
            { dx: 4.1, dz: -4.1 },
            { dx: -4.1, dz: 4.1 },
            { dx: 4.1, dz: 4.1 }
        ];

        var buildPlans = [];
        var reactorCount = 0;
        var glassCount = 0;

        for (var ix = 0; ix < blockCentersX.length; ix++) {
            for (var iz = 0; iz < blockCentersZ.length; iz++) {
                var cx = blockCentersX[ix];
                var cz = blockCentersZ[iz];
                if (Math.hypot(cx - TOWER_X, cz - TOWER_Z) < 13.5) continue;

                for (var s = 0; s < slots.length; s++) {
                    var sx = cx + slots[s].dx;
                    var sz = cz + slots[s].dz;
                    if (Math.hypot(sx - spawnX, sz - spawnZ) < 11.2) continue;
                    // Keep the spawn camera diagonal corridor completely clear so the monster is never blocked at start
                    if (sx - spawnX > -4 && sx - spawnX < 15 && sz - spawnZ > -2 && sz - spawnZ < 20) continue;
                    if (Math.hypot(sx - TOWER_X, sz - TOWER_Z) < 14.5) continue;

                    var rVal = rand();
                    var kind = "glass";
                    if (rVal < district.treeCut) {
                        kind = "tree";
                    } else if (rVal < district.dinerCut) {
                        kind = "diner";
                    } else if (rVal < district.reactorCut) {
                        kind = "reactor";
                        reactorCount++;
                    } else if (rVal < district.brickCut) {
                        kind = "brick";
                    } else {
                        kind = "glass";
                        glassCount++;
                    }
                    buildPlans.push({
                        sx: sx,
                        sz: sz,
                        kind: kind,
                        hRand: rand(),
                        rotStep: Math.floor(rand() * 4),
                        billboardIdx: Math.floor(rand() * BILLBOARD_ACCENTS.length),
                        vaultCandidate: true
                    });
                }
            }
        }

        // Select 3 well-spaced courtyard slots for Golden Bronny Vaults!
        var vaultCandidates = [];
        for (var vi = 0; vi < buildPlans.length; vi++) {
            var vp = buildPlans[vi];
            if (Math.hypot(vp.sx - spawnX, vp.sz - spawnZ) > 18 && Math.hypot(vp.sx - TOWER_X, vp.sz - TOWER_Z) > 15.5) {
                vaultCandidates.push(vp);
            }
        }
        var chosenVaults = [];
        for (var vs = vaultCandidates.length - 1; vs > 0; vs--) {
            var vr = Math.floor(rand() * (vs + 1));
            var vTmp = vaultCandidates[vs];
            vaultCandidates[vs] = vaultCandidates[vr];
            vaultCandidates[vr] = vTmp;
        }
        for (var vc = 0; vc < vaultCandidates.length && chosenVaults.length < 3; vc++) {
            var cand = vaultCandidates[vc];
            var farEnough = true;
            for (var cv = 0; cv < chosenVaults.length; cv++) {
                if (Math.hypot(cand.sx - chosenVaults[cv].sx, cand.sz - chosenVaults[cv].sz) < 24) {
                    farEnough = false;
                    break;
                }
            }
            if (farEnough) {
                chosenVaults.push(cand);
                if (cand.kind === "reactor") reactorCount--;
                if (cand.kind === "glass") glassCount--;
                cand.kind = "vault";
            }
        }

        // Guarantee every rolled Bounty (reactors/glass) is 100% achievable
        for (var piPlan = 0; piPlan < buildPlans.length && (reactorCount < 4 || glassCount < 8); piPlan++) {
            var bp = buildPlans[piPlan];
            if (bp.kind === "brick" || bp.kind === "diner") {
                if (reactorCount < 4) {
                    bp.kind = "reactor";
                    reactorCount++;
                } else if (glassCount < 8) {
                    bp.kind = "glass";
                    glassCount++;
                }
            }
        }

        var billboardRate = district.id === "neon" ? 0.45 : 0.18;
        for (var bpi = 0; bpi < buildPlans.length; bpi++) {
            var item = buildPlans[bpi];
            var bOpts = { rotStep: item.rotStep, billboardIdx: item.billboardIdx, hasBillboard: false };
            if (item.kind === "vault") {
                addVault(item.sx, item.sz);
            } else if (item.kind === "tree") {
                addProp(item.sx, item.sz, "tree", rand, Math.floor(rand() * 4) * Math.PI * 0.5);
                addProp(item.sx + 1.8, item.sz - 1.5, "tree", rand, Math.floor(rand() * 4) * Math.PI * 0.5);
            } else if (item.kind === "diner") {
                bOpts.hasBillboard = true;
                addBuilding(item.sx, item.sz, 5.4, 5.4, 4.2 + item.hRand * 1.4, "diner", 36, 45, bOpts);
            } else if (item.kind === "reactor") {
                addBuilding(item.sx, item.sz, 5.2, 5.2, 5.5, "reactor", 42, 85, bOpts);
            } else if (item.kind === "brick") {
                bOpts.hasBillboard = rand() < billboardRate;
                addBuilding(item.sx, item.sz, 5.8, 5.8, 7.2 + item.hRand * 3.2, "brick", 62, 75, bOpts);
            } else {
                bOpts.hasBillboard = rand() < billboardRate;
                addBuilding(item.sx, item.sz, 6.2, 6.2, 11.5 + item.hRand * 6.5, "glass", 98, 125, bOpts);
            }
        }

        gzState.totalBuildings = gzState.buildings.length;

        // Add Street Props (cars, buses along N-S avenues & E-W cross-streets, plus streetlamps)
        var roadCoords = [-48, -24, 0, 24, 48];
        var propStep = district.id === "neon" ? 11 : 14;
        for (var rx = 0; rx < roadCoords.length; rx++) {
            for (var k = -54; k <= 42; k += propStep) {
                var px = roadCoords[rx] + (rand() > 0.5 ? 1.8 : -1.8);
                var pz = k + rand() * 5;
                if (Math.hypot(px - spawnX, pz - spawnZ) < 8) continue;
                if (Math.hypot(px - TOWER_X, pz - TOWER_Z) < 12.5) continue;
                addProp(px, pz, rand() < 0.28 ? "bus" : "car", rand, rand() < 0.5 ? 0 : Math.PI);
            }
        }
        var crossRoadsZ = [-48, -24, 0, 24];
        var crossChance = district.id === "neon" ? 0.85 : 0.65;
        for (var crz = 0; crz < crossRoadsZ.length; crz++) {
            for (var bxi = 0; bxi < blockCentersX.length; bxi++) {
                if (rand() > crossChance) continue;
                var cpx = blockCentersX[bxi] + (rand() - 0.5) * 6;
                var cpz = crossRoadsZ[crz] + (rand() > 0.5 ? 1.8 : -1.8);
                if (Math.hypot(cpx - spawnX, cpz - spawnZ) < 8.5) continue;
                if (Math.hypot(cpx - TOWER_X, cpz - TOWER_Z) < 13) continue;
                addProp(cpx, cpz, rand() < 0.26 ? "bus" : "car", rand, rand() < 0.5 ? Math.PI * 0.5 : -Math.PI * 0.5);
            }
        }
        for (var l = -50; l <= 40; l += 18) {
            addProp(-4.2, l, "lamp", rand);
            addProp(4.2, l, "lamp", rand);
        }

        // Build the Iconic 4-Tier Bronny Mega Tower at the active Plaza!
        buildMegaTower();
    }

    function addProp(x, z, kind, rng, rotY) {
        var rFn = rng || Math.random;
        var pRotY = typeof rotY === "number" ? rotY : 0;
        var p = {
            id: rFn(),
            x: x,
            z: z,
            kind: kind,
            rotY: pRotY,
            horiz: Math.abs(Math.sin(pRotY)) > 0.5,
            pts: kind === "bus" ? 25 : (kind === "car" ? 15 : 10),
            destroyed: false,
            mesh: null
        };
        if (useThree) {
            var grp = new THREE.Group();
            grp.position.set(x, 0, z);
            if (kind !== "lamp" && pRotY !== 0) {
                grp.rotation.y = pRotY;
            }
            if (kind === "car" || kind === "bus") {
                var isBus = kind === "bus";
                var len = isBus ? 3.5 : 2.25;
                var col = isBus ? 0xfacc15 : [0xef4444, 0x3b82f6, 0xe2e8f0, 0x10b981, 0xf97316][Math.floor(rFn() * 5)];
                var bodyMat = trackCityMat(new THREE.MeshLambertMaterial({ color: col }));

                var body = new THREE.Mesh(sharedGeo.box, bodyMat);
                body.scale.set(1.36, isBus ? 1.25 : 0.68, len);
                body.position.y = isBus ? 0.85 : 0.56;
                body.castShadow = true;
                grp.add(body);

                if (isBus) {
                    var stripe = new THREE.Mesh(sharedGeo.box, sharedMat.tire);
                    stripe.scale.set(1.4, 0.22, len * 0.96);
                    stripe.position.y = 0.82;
                    var winStrip = new THREE.Mesh(sharedGeo.box, sharedMat.carGlass);
                    winStrip.scale.set(1.4, 0.42, len * 0.84);
                    winStrip.position.y = 1.22;
                    var roofCap = new THREE.Mesh(sharedGeo.box, sharedMat.chrome);
                    roofCap.scale.set(1.22, 0.16, len * 0.88);
                    roofCap.position.y = 1.54;
                    grp.add(stripe, winStrip, roofCap);
                } else {
                    var cabin = new THREE.Mesh(sharedGeo.box, bodyMat);
                    cabin.scale.set(1.16, 0.46, len * 0.54);
                    cabin.position.set(0, 1.08, -0.08);
                    cabin.castShadow = true;
                    var win = new THREE.Mesh(sharedGeo.box, sharedMat.carGlass);
                    win.scale.set(1.2, 0.34, len * 0.48);
                    win.position.set(0, 1.08, -0.05);
                    grp.add(cabin, win);
                }

                // Wheels (4 for car, 6 for bus)
                var wheelZs = isBus ? [-1.15, 0, 1.15] : [-0.72, 0.72];
                for (var wi = 0; wi < wheelZs.length; wi++) {
                    for (var wx = -0.68; wx <= 0.69; wx += 1.36) {
                        var wheel = new THREE.Mesh(sharedGeo.cyl, sharedMat.tire);
                        wheel.rotation.z = Math.PI / 2;
                        wheel.scale.set(0.46, 0.2, 0.46);
                        wheel.position.set(wx, 0.23, wheelZs[wi]);
                        grp.add(wheel);
                    }
                }

                // Front headlights + rear taillights
                var frontZ = len * 0.5 + 0.02;
                for (var lx = -0.44; lx <= 0.45; lx += 0.88) {
                    var hl = new THREE.Mesh(sharedGeo.box, sharedMat.headlight);
                    hl.scale.set(0.24, 0.16, 0.06);
                    hl.position.set(lx, 0.56, frontZ);
                    var tl = new THREE.Mesh(sharedGeo.box, sharedMat.taillight);
                    tl.scale.set(0.24, 0.16, 0.06);
                    tl.position.set(lx, 0.56, -frontZ);
                    grp.add(hl, tl);
                }
            } else if (kind === "tree") {
                var planter = new THREE.Mesh(sharedGeo.box, sharedMat.steel);
                planter.scale.set(1.5, 0.32, 1.5);
                planter.position.y = 0.16;
                var trunk = new THREE.Mesh(sharedGeo.cyl, sharedMat.bark);
                trunk.scale.set(0.55, 1.45, 0.55);
                trunk.position.y = 0.92;
                trunk.castShadow = true;

                var c1 = new THREE.Mesh(sharedGeo.box, sharedMat.leafDark);
                c1.scale.set(2.3, 1.45, 2.3);
                c1.position.y = 2.05;
                c1.castShadow = true;

                var c2 = new THREE.Mesh(sharedGeo.box, sharedMat.leaf);
                c2.scale.set(1.75, 1.15, 1.75);
                c2.position.set(0.22, 2.9, -0.16);
                c2.castShadow = true;

                var c3 = new THREE.Mesh(sharedGeo.box, sharedMat.leaf);
                c3.scale.set(1.1, 0.8, 1.1);
                c3.position.set(-0.1, 3.65, 0.1);
                grp.add(planter, trunk, c1, c2, c3);
            } else {
                var base = new THREE.Mesh(sharedGeo.cyl, sharedMat.steel);
                base.scale.set(0.38, 0.42, 0.38);
                base.position.y = 0.21;
                var pole = new THREE.Mesh(sharedGeo.box, sharedMat.steel);
                pole.scale.set(0.18, 3.25, 0.18);
                pole.position.y = 1.8;
                pole.castShadow = true;
                var dirSign = x < 0 ? 1 : -1;
                var arm = new THREE.Mesh(sharedGeo.box, sharedMat.steel);
                arm.scale.set(0.82, 0.14, 0.16);
                arm.position.set(dirSign * 0.35, 3.38, 0);
                var bulb = new THREE.Mesh(sharedGeo.box, sharedMat.spark);
                bulb.scale.set(0.48, 0.24, 0.42);
                bulb.position.set(dirSign * 0.68, 3.26, 0);
                var lightPool = new THREE.Mesh(sharedGeo.shadowCircle, sharedMat.spot);
                lightPool.scale.setScalar(2.6);
                lightPool.position.set(dirSign * 0.65, 0.04, 0);
                grp.add(base, pole, arm, bulb, lightPool);
            }
            cityGroup.add(grp);
            p.mesh = grp;
        }
        gzState.props.push(p);
    }

    function buildMegaTower() {
        var tierConfigs = [
            { w: 7.4, d: 7.4, h: 4.5, y: 0 },
            { w: 6.4, d: 6.4, h: 4.5, y: 4.5 },
            { w: 5.4, d: 5.4, h: 4.5, y: 9.0 },
            { w: 4.6, d: 4.6, h: 4.2, y: 13.5 }
        ];

        var mt = {
            x: TOWER_X,
            z: TOWER_Z,
            w: 7.6,
            d: 7.6,
            hp: 420,
            maxHp: 420,
            tiersLeft: 4,
            shake: 0,
            flash: 0,
            destroyed: false,
            pulseWindup: 0,
            pulseCooldown: 5.5,
            turretTimer: 2.2,
            turretTelegraph: 0,
            flinchTimer: 0,
            finalSurgeDone: false,
            group: null,
            baseBlockMat: null,
            tierMeshes: [],
            crownGroup: null,
            bronnyRig: null,
            beaconMesh: null,
            shieldMesh: null,
            shieldRing: null,
            warnRingMesh: null,
            turretMeshes: [],
            searchLights: []
        };

        if (useThree) {
            var grp = new THREE.Group();
            grp.position.set(TOWER_X, 0, TOWER_Z);

            var lakersMat = trackCityMat(new THREE.MeshLambertMaterial({
                map: cityTextures.lakers,
                emissiveMap: cityTextures.lakersEmissive,
                emissive: 0xffffff,
                emissiveIntensity: 0.92
            }));
            mt.baseBlockMat = lakersMat;
            var goldTrimMat = sharedMat.gold;
            var purpleMat = sharedMat.purple;

            for (var i = 0; i < tierConfigs.length; i++) {
                var cfg = tierConfigs[i];
                var tGrp = new THREE.Group();
                var block = new THREE.Mesh(sharedGeo.box, lakersMat);
                block.scale.set(cfg.w, cfg.h, cfg.d);
                block.position.y = cfg.h / 2;
                block.castShadow = true;
                block.receiveShadow = true;

                var rim = new THREE.Mesh(sharedGeo.box, goldTrimMat);
                rim.scale.set(cfg.w + 0.4, 0.42, cfg.d + 0.4);
                rim.position.y = cfg.h - 0.14;
                rim.castShadow = true;
                tGrp.add(block, rim);

                // Base lobby colonnade + gold corner buttresses
                if (i === 0) {
                    var lobby = new THREE.Mesh(sharedGeo.box, purpleMat);
                    lobby.scale.set(cfg.w + 1.1, 1.05, cfg.d + 1.1);
                    lobby.position.y = 0.52;
                    lobby.receiveShadow = true;
                    tGrp.add(lobby);
                }
                for (var fx = -1; fx <= 1; fx += 2) {
                    for (var fz = -1; fz <= 1; fz += 2) {
                        var fin = new THREE.Mesh(sharedGeo.box, goldTrimMat);
                        fin.scale.set(0.38, cfg.h, 0.38);
                        fin.position.set(fx * (cfg.w * 0.5 + 0.08), cfg.h * 0.5, fz * (cfg.d * 0.5 + 0.08));
                        tGrp.add(fin);
                    }
                }

                tGrp.position.y = cfg.y;
                grp.add(tGrp);
                mt.tierMeshes.push({ grp: tGrp, block: block, h: cfg.h, baseY: cfg.y });
            }

            // Crown helipad + Baby Bronny Sprite + Sweeping Searchlights + Sky Beacon
            var crown = new THREE.Group();
            crown.position.y = 17.7;

            var pad = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.6, 0.42, 16), purpleMat);
            var padGold = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.46, 16), trackCityMat(new THREE.MeshBasicMaterial({ color: 0xfacc15 })));
            crown.add(pad, padGold);

            // Crisp 'H' Helipad bars
            var hLeft = new THREE.Mesh(sharedGeo.box, purpleMat);
            hLeft.scale.set(0.38, 0.1, 2.0);
            hLeft.position.set(-0.68, 0.25, 0);
            var hRight = new THREE.Mesh(sharedGeo.box, purpleMat);
            hRight.scale.set(0.38, 0.1, 2.0);
            hRight.position.set(0.68, 0.25, 0);
            var hCross = new THREE.Mesh(sharedGeo.box, purpleMat);
            hCross.scale.set(1.5, 0.1, 0.38);
            hCross.position.set(0, 0.25, 0);
            crown.add(hLeft, hRight, hCross);

            // Two skyward sweeping rescue searchlights
            var spotMat = trackCityMat(new THREE.MeshBasicMaterial({
                color: 0xfef08a,
                transparent: true,
                opacity: 0.14,
                side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            }));
            for (var si = -1; si <= 1; si += 2) {
                var piv = new THREE.Group();
                piv.position.set(si * 2.2, 0.3, 0);
                var cone = new THREE.Mesh(new THREE.ConeGeometry(3.0, 26, 12, 1, true), spotMat);
                cone.rotation.x = Math.PI;
                cone.position.y = 13.0;
                piv.add(cone);
                piv.rotation.z = si * 0.22;
                crown.add(piv);
                mt.searchLights.push({ pivot: piv, side: si });
            }

            // Tall glowing Lakers rescue beacon beam reaching into the sky
            var beacon = new THREE.Mesh(
                new THREE.CylinderGeometry(0.65, 1.5, 38, 10, 1, true),
                trackCityMat(new THREE.MeshBasicMaterial({
                    color: 0xfacc15,
                    transparent: true,
                    opacity: 0.18,
                    side: THREE.DoubleSide,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false
                }))
            );
            beacon.position.y = 19;
            crown.add(beacon);
            mt.beaconMesh = beacon;

            // Articulated 3D Voxel Baby Bronny James standing right on top!
            mt.bronnyRig = createBronnyVoxelRig(THREE, trackCityMat);
            mt.bronnyRig.root.scale.setScalar(1.15);
            mt.bronnyRig.root.position.set(0, 0.28, 0.45);
            mt.bronnyRig.root.rotation.y = 0.08;
            crown.add(mt.bronnyRig.root);

            // Twin rooftop defense turrets (online once Tier <= 3)
            for (var ti = -1; ti <= 1; ti += 2) {
                var tGrp = new THREE.Group();
                tGrp.position.set(ti * 2.35, 0.52, 1.9);
                var tBase = new THREE.Mesh(
                    new THREE.BoxGeometry(0.95, 0.65, 1.05),
                    trackCityMat(new THREE.MeshLambertMaterial({ color: 0x581c87, emissive: 0x2e1065, emissiveIntensity: 0.4 }))
                );
                var tBarrelMat = trackCityMat(new THREE.MeshLambertMaterial({
                    color: 0xfacc15,
                    emissive: 0xca8a04,
                    emissiveIntensity: 0.45
                }));
                var tBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 1.15, 8), tBarrelMat);
                tBarrel.rotation.x = Math.PI / 2;
                tBarrel.position.set(0, 0.1, 0.62);
                tGrp.add(tBase, tBarrel);
                tGrp.visible = false;
                crown.add(tGrp);
                mt.turretMeshes.push({ grp: tGrp, barrelMat: tBarrelMat });
            }

            // Golden Vault Energy Shield Dome + Base Ring
            var shieldMesh = new THREE.Mesh(
                new THREE.CylinderGeometry(5.65, 6.45, 22, 16, 1, true),
                trackCityMat(new THREE.MeshBasicMaterial({
                    color: 0xa855f7,
                    transparent: true,
                    opacity: 0.24,
                    side: THREE.DoubleSide,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false
                }))
            );
            shieldMesh.position.y = 10.2;
            grp.add(shieldMesh);
            mt.shieldMesh = shieldMesh;

            var shieldRingGeo = new THREE.RingGeometry(5.8, 6.7, 28);
            shieldRingGeo.rotateX(-Math.PI / 2);
            var shieldRing = new THREE.Mesh(
                shieldRingGeo,
                trackCityMat(new THREE.MeshBasicMaterial({
                    color: 0x22d3ee,
                    transparent: true,
                    opacity: 0.55,
                    side: THREE.DoubleSide,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false
                }))
            );
            shieldRing.position.y = 0.22;
            grp.add(shieldRing);
            mt.shieldRing = shieldRing;

            // Plaza Shockwave Telegraph Ring (19m radius)
            var warnGeo = new THREE.RingGeometry(17.4, 19.2, 36);
            warnGeo.rotateX(-Math.PI / 2);
            var warnRingMesh = new THREE.Mesh(
                warnGeo,
                trackCityMat(new THREE.MeshBasicMaterial({
                    color: 0xf97316,
                    transparent: true,
                    opacity: 0.8,
                    side: THREE.DoubleSide,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false
                }))
            );
            warnRingMesh.position.y = 0.16;
            warnRingMesh.visible = false;
            grp.add(warnRingMesh);
            mt.warnRingMesh = warnRingMesh;

            grp.add(crown);
            mt.crownGroup = crown;
            cityGroup.add(grp);
            mt.group = grp;
        }

        gzState.megaTower = mt;
    }

    // =========================================================================
    // --- Visual FX: Particles, Flying Voxel Debris, & Score Popups ---
    // =========================================================================

    function ensureUnitSharedMats() {
        if (!window.THREE || sharedMat.navy) return;
        sharedMat.navy = new THREE.MeshLambertMaterial({ color: 0x1e3a8a });
        sharedMat.whiteTrim = new THREE.MeshLambertMaterial({ color: 0xf8fafc });
        sharedMat.slateDark = new THREE.MeshLambertMaterial({ color: 0x1e293b });
        sharedMat.indigo = new THREE.MeshLambertMaterial({ color: 0x312e81 });
        sharedMat.cyanSolid = new THREE.MeshBasicMaterial({ color: 0x22d3ee });
        sharedMat.warnRing = new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.72, side: THREE.DoubleSide });
    }

    function pickBurstMat(colorHex) {
        if (colorHex === 0xfacc15 || colorHex === 0xfde047) return sharedMat.gold;
        if (colorHex === 0x9333ea || colorHex === 0x581c87) return sharedMat.purple;
        if (colorHex === 0xf97316 || colorHex === 0xfb923c) return sharedMat.fire;
        if (colorHex === 0x4ade80 || colorHex === 0x22c55e) return sharedMat.heal;
        if (colorHex === 0x22d3ee || colorHex === 0x38bdf8) return sharedMat.cyanSolid || sharedMat.spark;
        if (colorHex === 0xef4444) return sharedMat.missile;
        if (colorHex === 0xfef08a || colorHex === 0xfef9c3) return sharedMat.spark;
        return sharedMat.smoke;
    }

    function spawnBurst(x, y, z, colorHex, count, speed, opts) {
        ensureUnitSharedMats();
        opts = opts || {};
        var isSmoke = !!opts.isSmoke;
        for (var i = 0; i < count; i++) {
            var a = Math.random() * Math.PI * 2;
            var sp = (0.4 + Math.random() * 0.85) * (speed || 10);
            var life = isSmoke
                ? ((opts.lifeMin || 1.45) + Math.random() * ((opts.lifeMax || 2.25) - (opts.lifeMin || 1.45)))
                : (0.38 + Math.random() * 0.45);
            var size = isSmoke
                ? ((opts.sizeMin || 0.45) + Math.random() * ((opts.sizeMax || 0.85) - (opts.sizeMin || 0.45)))
                : (0.28 + Math.random() * 0.36);
            var vy = isSmoke
                ? ((opts.vyMin || 1.8) + Math.random() * ((opts.vyMax || 3.1) - (opts.vyMin || 1.8)))
                : (3 + Math.random() * sp * 0.8);
            var p = {
                x: x,
                y: y,
                z: z,
                vx: isSmoke ? (Math.cos(a) * sp * 0.4 + 0.55) : (Math.cos(a) * sp),
                vy: vy,
                vz: isSmoke ? (Math.sin(a) * sp * 0.4 - 0.35) : (Math.sin(a) * sp),
                life: life,
                maxLife: isSmoke ? life : 0.85,
                size: size,
                isSmoke: isSmoke,
                mesh: null
            };
            if (useThree && dynamicGroup) {
                var mat = isSmoke ? sharedMat.smoke : pickBurstMat(colorHex);
                p.mesh = new THREE.Mesh(sharedGeo.box, mat);
                p.mesh.position.set(x, y, z);
                p.mesh.scale.setScalar(p.size);
                dynamicGroup.add(p.mesh);
            }
            gzState.particles.push(p);
        }
    }

    function spawnShockwave(x, y, z, colorHex, maxRadius, duration) {
        var sw = {
            x: x,
            y: y,
            z: z,
            color: colorHex || 0xf97316,
            maxRadius: maxRadius || 8,
            life: duration || 0.42,
            maxLife: duration || 0.42,
            isHazard: false,
            dmg: 0,
            resolved: false,
            mesh: null,
            mat: null
        };
        if (useThree && dynamicGroup) {
            var mat = new THREE.MeshBasicMaterial({
                color: sw.color,
                transparent: true,
                opacity: 0.9,
                side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            var m = new THREE.Mesh(sharedGeo.ringThin, mat);
            m.position.set(x, Math.max(0.08, y), z);
            m.scale.setScalar(0.5);
            dynamicGroup.add(m);
            sw.mesh = m;
            sw.mat = mat;
        }
        gzState.shockwaves.push(sw);
        return sw;
    }

    function spawnRubble(x, z, w, d, colorHex) {
        var rw = Math.max(2.6, w || 4.8);
        var rd = Math.max(2.6, d || 4.8);
        gzState.rubble.push({
            x: x,
            z: z,
            w: rw,
            d: rd,
            color: colorHex || 0x334155,
            smokeTimer: 0.12 + Math.random() * 0.28,
            smokeLife: 34
        });
        if (!useThree || !cityGroup) return;

        var grp = new THREE.Group();
        grp.position.set(x, 0, z);

        // Ground scorch crater base
        var scorch = new THREE.Mesh(sharedGeo.shadowCircle, sharedMat.scorch);
        scorch.scale.set(rw * 1.4, 1, rd * 1.4);
        scorch.position.y = 0.04;
        grp.add(scorch);

        // Voxel rubble slabs + steel rebar accents
        var chunkMat = pickBurstMat(colorHex) || sharedMat.steel;
        for (var i = 0; i < 6; i++) {
            var ang = (i / 6) * Math.PI * 2 + (x + z) * 0.13;
            var rad = (i % 2 === 0 ? 0.28 : 0.42) * Math.min(rw, rd);
            var slab = new THREE.Mesh(sharedGeo.box, i % 3 === 0 ? sharedMat.steel : chunkMat);
            slab.scale.set(0.85 + (i % 3) * 0.35, 0.36 + (i % 2) * 0.25, 0.75 + ((i + 1) % 3) * 0.3);
            slab.position.set(Math.cos(ang) * rad, 0.22, Math.sin(ang) * rad);
            slab.rotation.set(((i % 3) - 1) * 0.24, ang, ((i % 2) - 0.5) * 0.28);
            slab.receiveShadow = true;
            grp.add(slab);
        }
        cityGroup.add(grp);
    }

    function spawnDebris(x, y, z, colorHex, count, canHitChopper) {
        ensureUnitSharedMats();
        for (var i = 0; i < count; i++) {
            var a = Math.random() * Math.PI * 2;
            var sp = 4 + Math.random() * 9;
            var col = colorHex || 0x64748b;
            var d = {
                x: x + (Math.random() - 0.5) * 2.2,
                y: y + Math.random() * 2.5,
                z: z + (Math.random() - 0.5) * 2.2,
                vx: Math.cos(a) * sp,
                vy: (canHitChopper ? 9 : 4) + Math.random() * 8,
                vz: Math.sin(a) * sp,
                rx: Math.random() * 8,
                ry: Math.random() * 8,
                life: 1.1 + Math.random() * 0.7,
                canHitChopper: !!canHitChopper,
                mesh: null
            };
            if (useThree && dynamicGroup) {
                var mat = pickBurstMat(col);
                d.mesh = new THREE.Mesh(sharedGeo.box, mat);
                d.mesh.position.set(d.x, d.y, d.z);
                d.mesh.scale.setScalar(0.48 + Math.random() * 0.52);
                d.mesh.castShadow = true;
                dynamicGroup.add(d.mesh);
            }
            gzState.debris.push(d);
        }
    }

    function spawnPopup(x, y, z, text, color) {
        if (!popupLayerEl) return;
        var el = document.createElement("div");
        el.className = "gz-float-pop";
        el.textContent = text;
        el.style.color = color || "#facc15";
        popupLayerEl.appendChild(el);
        gzState.popups.push({
            x: x,
            y: y,
            z: z,
            life: 1.05,
            maxLife: 1.05,
            el: el
        });
    }

    function showBanner(text) {
        if (!popBannerEl) return;
        popBannerEl.textContent = text;
        popBannerEl.hidden = false;
        gzState.bannerTimer = 1.4;
    }

    function spawnPickup(x, z, isSuper) {
        var pk = {
            x: x,
            y: 1.0,
            z: z,
            isSuper: !!isSuper,
            healAmt: isSuper ? 20 : 12,
            rageAmt: isSuper ? 25 : 10,
            life: isSuper ? 18 : 14,
            mesh: null
        };
        if (useThree && dynamicGroup) {
            var g = new THREE.Group();
            var bot = new THREE.Mesh(sharedGeo.cyl, sharedMat.burgerBun);
            bot.scale.set(1.06, 0.28, 1.06);
            bot.position.y = -0.26;

            var pat = new THREE.Mesh(sharedGeo.cyl, sharedMat.burgerPatty);
            pat.scale.set(1.14, 0.28, 1.14);
            pat.position.y = -0.02;

            var cheese = new THREE.Mesh(sharedGeo.box, sharedMat.cheese);
            cheese.scale.set(0.95, 0.08, 0.95);
            cheese.position.y = 0.13;
            cheese.rotation.y = Math.PI / 4;

            var lettuce = new THREE.Mesh(sharedGeo.cyl, sharedMat.lettuce);
            lettuce.scale.set(1.18, 0.1, 1.18);
            lettuce.position.y = 0.21;

            var top = new THREE.Mesh(sharedGeo.cyl, sharedMat.burgerBun);
            top.scale.set(1.02, 0.38, 1.02);
            top.position.y = 0.42;

            // Tiny toasted sesame seeds
            var seedCoords = [[-0.22, 0.16], [0.2, -0.14], [0.02, 0.24]];
            for (var si = 0; si < seedCoords.length; si++) {
                var seed = new THREE.Mesh(sharedGeo.box, sharedMat.sesame);
                seed.scale.set(0.11, 0.06, 0.08);
                seed.position.set(seedCoords[si][0], 0.62, seedCoords[si][1]);
                g.add(seed);
            }

            var ring = new THREE.Mesh(sharedGeo.ring, isSuper ? sharedMat.gold : sharedMat.heal);
            ring.scale.setScalar(isSuper ? 1.65 : 1.25);
            ring.position.y = -0.72;

            var aura = new THREE.Mesh(sharedGeo.cyl, sharedMat.spot);
            aura.scale.set(isSuper ? 1.4 : 1.0, 3.6, isSuper ? 1.4 : 1.0);
            aura.position.y = 1.0;

            g.add(bot, pat, cheese, lettuce, top, ring, aura);
            if (isSuper) g.scale.setScalar(1.36);
            g.position.set(x, pk.y, z);
            dynamicGroup.add(g);
            pk.mesh = g;
        }
        gzState.pickups.push(pk);
    }

    // =========================================================================
    // --- Enemy Spawning & AI (Police, Tanks, Attack Helicopters) ---
    // =========================================================================

    function spawnEnemy(kind, isAce, isBoss, customPos) {
        ensureUnitSharedMats();
        var m = gzState.monster;
        var angle = Math.random() * Math.PI * 2;
        var dist = kind === "chopper" ? 28 + Math.random() * 10 : 25 + Math.random() * 12;
        var rawX = customPos ? customPos.x : (m.x + Math.cos(angle) * dist);
        var rawZ = customPos ? customPos.z : (m.z + Math.sin(angle) * dist);
        var ex = Math.max(-CITY_HALF + 4, Math.min(CITY_HALF - 4, rawX));
        var ez = Math.max(-CITY_HALF - 6, Math.min(CITY_HALF - 14, rawZ));
        var unitMult = (gzState.district && gzState.district.unitMult) ? gzState.district.unitMult : 1.0;
        var aceChopper = kind === "chopper" && !!isAce;
        var isBossTank = kind === "tank" && !!isBoss;
        var baseHp = isBossTank ? 180 : (aceChopper ? 95 : (kind === "tank" ? 75 : (kind === "chopper" ? 50 : 22)));
        var basePts = isBossTank ? 320 : (aceChopper ? 270 : (kind === "chopper" ? 130 : (kind === "tank" ? 90 : 35)));

        var e = {
            kind: kind, // "jeep" | "tank" | "chopper"
            isAce: aceChopper,
            isBoss: isBossTank,
            x: ex,
            y: kind === "chopper" ? 4.4 : 0,
            z: ez,
            vx: 0,
            vz: 0,
            angle: 0,
            hp: baseHp,
            maxHp: baseHp,
            speed: isBossTank ? 5.8 : (aceChopper ? 11.8 : (kind === "chopper" ? 10.2 : (kind === "tank" ? 5.1 : 9.2))),
            pts: Math.round(basePts * unitMult),
            fireTimer: isBossTank ? 1.1 : (1.2 + Math.random() * 1.4),
            telegraphTimer: 0,
            orbitDir: Math.random() > 0.5 ? 1 : -1,
            rotorPhase: Math.random() * 6.28,
            mesh: null,
            rotor: null,
            tailRotor: null,
            turret: null,
            laserLine: null,
            warnRing: null,
            sirenR: null,
            sirenB: null,
            shadowMesh: null
        };

        if (useThree && dynamicGroup) {
            var grp = new THREE.Group();
            if (kind === "chopper") {
                var fuseMat = aceChopper ? sharedMat.indigo : sharedMat.oliveDark;
                var tailMat = aceChopper ? sharedMat.gold : sharedMat.olive;
                var bladeMat = aceChopper ? sharedMat.gold : sharedMat.whiteTrim;
                var cockMat = aceChopper ? sharedMat.fire : sharedMat.carGlass;

                var fuse = new THREE.Mesh(sharedGeo.box, fuseMat);
                fuse.scale.set(1.45, 1.05, 3.15);
                fuse.castShadow = true;

                var cock = new THREE.Mesh(sharedGeo.box, cockMat);
                cock.scale.set(1.18, 0.72, 1.15);
                cock.position.set(0, 0.08, 1.32);

                // Wing stub pylons & missile pods
                for (var ws = -1; ws <= 1; ws += 2) {
                    var stub = new THREE.Mesh(sharedGeo.box, tailMat);
                    stub.scale.set(1.0, 0.18, 0.65);
                    stub.position.set(ws * 1.1, -0.05, 0.1);
                    var pod = new THREE.Mesh(sharedGeo.cyl, sharedMat.steel);
                    pod.rotation.x = Math.PI / 2;
                    pod.scale.set(0.36, 1.1, 0.36);
                    pod.position.set(ws * 1.35, -0.18, 0.15);
                    var warhead = new THREE.Mesh(sharedGeo.sphere, sharedMat.missile);
                    warhead.scale.setScalar(0.28);
                    warhead.position.set(ws * 1.35, -0.18, 0.72);
                    grp.add(stub, pod, warhead);
                }

                // Landing skids
                for (var lsk = -0.62; lsk <= 0.63; lsk += 1.24) {
                    var skid = new THREE.Mesh(sharedGeo.box, sharedMat.steel);
                    skid.scale.set(0.12, 0.1, 2.5);
                    skid.position.set(lsk, -0.78, 0.15);
                    grp.add(skid);
                }

                // Exhaust thrusters
                for (var exs = -0.34; exs <= 0.35; exs += 0.68) {
                    var nozzle = new THREE.Mesh(sharedGeo.cyl, sharedMat.thruster);
                    nozzle.rotation.x = Math.PI / 2;
                    nozzle.scale.set(0.26, 0.36, 0.26);
                    nozzle.position.set(exs, 0.28, -1.55);
                    grp.add(nozzle);
                }

                var tailB = new THREE.Mesh(sharedGeo.box, tailMat);
                tailB.scale.set(0.42, 0.42, 2.45);
                tailB.position.set(0, 0.22, -2.35);

                var finV = new THREE.Mesh(sharedGeo.box, tailMat);
                finV.scale.set(0.14, 0.85, 0.55);
                finV.position.set(0, 0.55, -3.45);

                var tailRotor = new THREE.Group();
                tailRotor.position.set(0.22, 0.58, -3.45);
                var trB = new THREE.Mesh(sharedGeo.box, bladeMat);
                trB.scale.set(0.06, 0.95, 0.16);
                tailRotor.add(trB);

                var rotor = new THREE.Group();
                rotor.position.y = 0.76;
                var mast = new THREE.Mesh(sharedGeo.cyl, sharedMat.steel);
                mast.scale.set(0.26, 0.35, 0.26);
                var blade1 = new THREE.Mesh(sharedGeo.box, bladeMat);
                blade1.scale.set(4.6, 0.08, 0.24);
                var blade2 = new THREE.Mesh(sharedGeo.box, bladeMat);
                blade2.scale.set(0.24, 0.08, 4.6);
                var blurDisc = new THREE.Mesh(sharedGeo.shadowCircle, sharedMat.chopperBlur);
                blurDisc.scale.setScalar(4.7);
                blurDisc.position.y = 0.02;
                rotor.add(mast, blade1, blade2, blurDisc);

                // Downward spotlight cone
                var cone = new THREE.Mesh(sharedGeo.cone, sharedMat.spot);
                cone.scale.set(aceChopper ? 3.1 : 2.5, 4.4, aceChopper ? 3.1 : 2.5);
                cone.position.set(0, -2.2, 0.6);

                grp.add(fuse, cock, tailB, finV, tailRotor, rotor, cone);
                if (aceChopper) grp.scale.setScalar(1.28);
                e.rotor = rotor;
                e.tailRotor = tailRotor;

                var spot = new THREE.Mesh(sharedGeo.ring, aceChopper ? sharedMat.gold : sharedMat.spot);
                spot.scale.setScalar(aceChopper ? 3.1 : 2.5);
                spot.position.set(ex, 0.06, ez);
                dynamicGroup.add(spot);
                e.shadowMesh = spot;
            } else if (kind === "tank") {
                var hull = new THREE.Mesh(sharedGeo.box, isBossTank ? sharedMat.slateDark : sharedMat.oliveDark);
                hull.scale.set(2.25, 0.85, 3.25);
                hull.position.y = 0.62;
                hull.castShadow = true;

                var deck = new THREE.Mesh(sharedGeo.box, isBossTank ? sharedMat.gold : sharedMat.steel);
                deck.scale.set(1.7, 0.14, 1.0);
                deck.position.set(0, 1.06, -1.0);

                if (isBossTank) {
                    var frontRam = new THREE.Mesh(sharedGeo.box, sharedMat.missile);
                    frontRam.scale.set(2.45, 0.42, 0.45);
                    frontRam.position.set(0, 0.46, 1.72);
                    var crestPlate = new THREE.Mesh(sharedGeo.box, sharedMat.gold);
                    crestPlate.scale.set(2.38, 0.2, 2.8);
                    crestPlate.position.set(0, 1.04, 0.15);
                    grp.add(frontRam, crestPlate);
                }

                for (var tx = -1.12; tx <= 1.13; tx += 2.24) {
                    var skirt = new THREE.Mesh(sharedGeo.box, isBossTank ? sharedMat.missile : sharedMat.slateDark);
                    skirt.scale.set(0.48, 0.68, 3.45);
                    skirt.position.set(tx, 0.38, 0);
                    skirt.castShadow = true;
                    grp.add(skirt);

                    for (var tz = -1.15; tz <= 1.16; tz += 0.76) {
                        var rw = new THREE.Mesh(sharedGeo.cyl, sharedMat.tire);
                        rw.rotation.z = Math.PI / 2;
                        rw.scale.set(0.48, 0.54, 0.48);
                        rw.position.set(tx, 0.25, tz);
                        grp.add(rw);
                    }
                }

                var turret = new THREE.Group();
                turret.position.y = 1.28;
                var turBox = new THREE.Mesh(sharedGeo.box, isBossTank ? sharedMat.slateDark : sharedMat.olive);
                turBox.scale.set(isBossTank ? 1.85 : 1.55, 0.68, 1.85);
                turBox.castShadow = true;
                var cupola = new THREE.Mesh(sharedGeo.cyl, isBossTank ? sharedMat.gold : sharedMat.oliveDark);
                cupola.scale.set(0.65, 0.26, 0.65);
                cupola.position.set(-0.32, 0.44, -0.2);

                var laser = new THREE.Group();
                laser.visible = false;
                if (isBossTank) {
                    for (var bs = -1; bs <= 1; bs += 2) {
                        var bBar = new THREE.Mesh(sharedGeo.box, sharedMat.steel);
                        bBar.scale.set(0.24, 0.24, 2.65);
                        bBar.position.set(bs * 0.42, 0.05, 1.48);
                        var bMuz = new THREE.Mesh(sharedGeo.box, sharedMat.gold);
                        bMuz.scale.set(0.38, 0.36, 0.36);
                        bMuz.position.set(bs * 0.42, 0.05, 2.78);
                        var bLaz = new THREE.Mesh(sharedGeo.box, sharedMat.laser);
                        bLaz.scale.set(0.13, 0.13, 19);
                        bLaz.position.set(bs * 0.42, 0.05, 11.8);
                        turret.add(bBar, bMuz);
                        laser.add(bLaz);
                    }
                    var bossBeacon = new THREE.Mesh(sharedGeo.box, sharedMat.beaconRed);
                    bossBeacon.scale.set(0.38, 0.38, 0.38);
                    bossBeacon.position.set(0.35, 0.52, -0.25);
                    turret.add(bossBeacon);
                } else {
                    var barrel = new THREE.Mesh(sharedGeo.box, sharedMat.steel);
                    barrel.scale.set(0.24, 0.24, 2.4);
                    barrel.position.set(0, 0.05, 1.38);
                    var muzzle = new THREE.Mesh(sharedGeo.box, sharedMat.slateDark);
                    muzzle.scale.set(0.38, 0.36, 0.34);
                    muzzle.position.set(0, 0.05, 2.55);
                    var singleLaz = new THREE.Mesh(sharedGeo.box, sharedMat.laser);
                    singleLaz.scale.set(0.11, 0.11, 18);
                    singleLaz.position.set(0, 0.05, 11.4);
                    turret.add(barrel, muzzle);
                    laser.add(singleLaz);
                }

                var warnRing = new THREE.Mesh(sharedGeo.ringThin, sharedMat.warnRing);
                warnRing.scale.setScalar(isBossTank ? 3.2 : 2.4);
                warnRing.position.y = 0.08;
                warnRing.visible = false;
                grp.add(warnRing);

                turret.add(turBox, cupola, laser);
                grp.add(hull, deck, turret);
                if (isBossTank) grp.scale.setScalar(1.38);
                e.turret = turret;
                e.laserLine = laser;
                e.warnRing = warnRing;
            } else {
                // Detailed Police / Army Interceptor Jeep
                var apron = new THREE.Mesh(sharedGeo.box, sharedMat.slateDark);
                apron.scale.set(1.66, 0.22, 2.62);
                apron.position.y = 0.24;

                var jBody = new THREE.Mesh(sharedGeo.box, sharedMat.navy);
                jBody.scale.set(1.62, 0.68, 2.55);
                jBody.position.y = 0.62;
                jBody.castShadow = true;

                var jTop = new THREE.Mesh(sharedGeo.box, sharedMat.whiteTrim);
                jTop.scale.set(1.42, 0.52, 1.32);
                jTop.position.set(0, 1.18, -0.14);
                jTop.castShadow = true;

                var jGlass = new THREE.Mesh(sharedGeo.box, sharedMat.carGlass);
                jGlass.scale.set(1.46, 0.38, 1.24);
                jGlass.position.set(0, 1.16, -0.1);

                // 4 wheels + headlights
                for (var jwx = -0.82; jwx <= 0.83; jwx += 1.64) {
                    for (var jwz = -0.78; jwz <= 0.79; jwz += 1.56) {
                        var jw = new THREE.Mesh(sharedGeo.cyl, sharedMat.tire);
                        jw.rotation.z = Math.PI / 2;
                        jw.scale.set(0.52, 0.24, 0.52);
                        jw.position.set(jwx, 0.26, jwz);
                        grp.add(jw);
                    }
                }
                for (var hlx = -0.5; hlx <= 0.51; hlx += 1.0) {
                    var jhl = new THREE.Mesh(sharedGeo.box, sharedMat.headlight);
                    jhl.scale.set(0.28, 0.16, 0.08);
                    jhl.position.set(hlx, 0.64, 1.3);
                    grp.add(jhl);
                }

                // Flashing red/blue police lightbar
                var barBase = new THREE.Mesh(sharedGeo.box, sharedMat.slateDark);
                barBase.scale.set(0.95, 0.1, 0.3);
                barBase.position.set(0, 1.48, -0.1);
                var sirenR = new THREE.Mesh(sharedGeo.box, sharedMat.sirenRed);
                sirenR.scale.set(0.38, 0.22, 0.28);
                sirenR.position.set(-0.26, 1.58, -0.1);
                var sirenB = new THREE.Mesh(sharedGeo.box, sharedMat.sirenBlue);
                sirenB.scale.set(0.38, 0.22, 0.28);
                sirenB.position.set(0.26, 1.58, -0.1);

                grp.add(apron, jBody, jTop, jGlass, barBase, sirenR, sirenB);
                e.sirenR = sirenR;
                e.sirenB = sirenB;
            }
            grp.position.set(ex, e.y, ez);
            dynamicGroup.add(grp);
            e.mesh = grp;
        }
        gzState.enemies.push(e);
    }

    function pickWaveSpawnPos(minRad, maxRad, biasAng) {
        var m = gzState.monster;
        var ang = typeof biasAng === "number" ? biasAng : (-Math.PI * 0.5 + (Math.random() - 0.5) * 1.9);
        var dist = minRad + Math.random() * (maxRad - minRad);
        return {
            x: Math.max(-CITY_HALF + 6, Math.min(CITY_HALF - 6, m.x + Math.cos(ang) * dist)),
            z: Math.max(-CITY_HALF - 4, Math.min(CITY_HALF - 16, m.z + Math.sin(ang) * dist))
        };
    }

    function triggerThreatWave(level) {
        if (gzState.mode !== "playing") return;
        if (level === 3) {
            playWaveAlertSfx(false);
            if (Math.random() < 0.5) {
                spawnEnemy("chopper", false, false, pickWaveSpawnPos(27, 33, -Math.PI * 0.78));
                spawnEnemy("chopper", false, false, pickWaveSpawnPos(27, 33, -Math.PI * 0.22));
                spawnEnemy("tank", false, false, pickWaveSpawnPos(26, 32, -Math.PI * 0.5));
                showBanner("THREAT 3: SKY STRIKE WING!");
            } else {
                spawnEnemy("tank", false, false, pickWaveSpawnPos(26, 32, -Math.PI * 0.7));
                spawnEnemy("tank", false, false, pickWaveSpawnPos(26, 32, -Math.PI * 0.3));
                spawnEnemy("jeep", false, false, pickWaveSpawnPos(25, 30, -Math.PI * 0.92));
                spawnEnemy("jeep", false, false, pickWaveSpawnPos(25, 30, -Math.PI * 0.08));
                showBanner("THREAT 3: HEAVY CONVOY!");
            }
        } else if (level >= 5) {
            playWaveAlertSfx(true);
            var bossPos = pickWaveSpawnPos(26, 31, -Math.PI * 0.5 + (Math.random() - 0.5) * 0.8);
            spawnEnemy("tank", false, true, bossPos);
            spawnShockwave(bossPos.x, 0.25, bossPos.z, 0xef4444, 7.5, 0.5);
            showBanner("WARNING: MEGA-MECH BOSS!");
        }
    }

    function spawnProjectile(x, y, z, vx, vy, vz, kind, dmg) {
        ensureUnitSharedMats();
        var pr = {
            x: x,
            y: y,
            z: z,
            vx: vx,
            vy: vy,
            vz: vz,
            kind: kind, // "bullet" | "shell" | "missile" | "towerBolt"
            dmg: dmg,
            life: 3.4,
            trailTimer: 0,
            mesh: null
        };
        if (useThree && dynamicGroup) {
            if (kind === "towerBolt") {
                var tg = new THREE.Group();
                var tOuter = new THREE.Mesh(sharedGeo.octa, sharedMat.purple);
                tOuter.scale.setScalar(0.92);
                var tCore = new THREE.Mesh(sharedGeo.sphere, sharedMat.gold);
                tCore.scale.setScalar(0.46);
                tg.add(tOuter, tCore);
                tg.position.set(x, y, z);
                tg.lookAt(x + vx, y + vy, z + vz);
                dynamicGroup.add(tg);
                pr.mesh = tg;
            } else if (kind === "missile") {
                var mg = new THREE.Group();
                var mBody = new THREE.Mesh(sharedGeo.cyl, sharedMat.whiteTrim);
                mBody.rotation.x = Math.PI / 2;
                mBody.scale.set(0.28, 0.85, 0.28);
                var mTip = new THREE.Mesh(sharedGeo.cone, sharedMat.missile);
                mTip.rotation.x = Math.PI / 2;
                mTip.scale.set(0.32, 0.42, 0.32);
                mTip.position.z = 0.56;
                var mFlame = new THREE.Mesh(sharedGeo.sphere, sharedMat.thruster);
                mFlame.scale.setScalar(0.32);
                mFlame.position.z = -0.5;
                mg.add(mBody, mTip, mFlame);
                mg.position.set(x, y, z);
                mg.lookAt(x + vx, y + vy, z + vz);
                dynamicGroup.add(mg);
                pr.mesh = mg;
            } else if (kind === "shell") {
                var sh = new THREE.Mesh(sharedGeo.sphere, sharedMat.shell);
                sh.position.set(x, y, z);
                sh.scale.set(0.46, 0.46, 0.72);
                sh.lookAt(x + vx, y + vy, z + vz);
                dynamicGroup.add(sh);
                pr.mesh = sh;
            } else {
                var bl = new THREE.Mesh(sharedGeo.box, sharedMat.bullet);
                bl.position.set(x, y, z);
                bl.scale.set(0.22, 0.22, 0.65);
                bl.lookAt(x + vx, y + vy, z + vz);
                dynamicGroup.add(bl);
                pr.mesh = bl;
            }
        }
        gzState.projectiles.push(pr);
    }

    // =========================================================================
    // --- Combat & Destruction Actions ---
    // =========================================================================

    function checkBounties() {
        if (!gzState.bounties || gzState.mode !== "playing") return;
        for (var i = 0; i < gzState.bounties.length; i++) {
            var bty = gzState.bounties[i];
            if (bty.done) continue;
            var val = bty.stat === "vaultsSmashed" ? gzState.vaultsSmashed : (gzState.stats[bty.stat] || 0);
            if (val >= bty.target) {
                bty.done = true;
                gzState.bountyScore += bty.reward;
                gzState.score = Math.min(MAX_SCORE, gzState.destructionScore + gzState.bountyScore);
                gzState.hp = Math.min(gzState.maxHp, gzState.hp + 6);
                addRage(20);
                showBanner("BOUNTY: " + bty.title.toUpperCase() + " +" + bty.reward + "!");
                spawnPopup(gzState.monster.x, 3.2, gzState.monster.z, "BOUNTY +" + bty.reward + "!", "#4ade80");
                spawnBurst(gzState.monster.x, 2.0, gzState.monster.z, 0x4ade80, 16, 12);
                playPickupSfx();
            }
        }
    }

    function addScore(basePts, x, y, z, label) {
        if (gzState.mode !== "playing") return;
        gzState.combo++;
        if (gzState.combo > gzState.maxCombo) {
            gzState.maxCombo = gzState.combo;
        }
        gzState.comboTimer = 3.2;

        if (gzState.combo >= 10 && !gzState.frenzySurgeHit) {
            gzState.frenzySurgeHit = true;
            gzState.stats.frenzyReached = 1;
            gzState.bountyScore += 150;
            addRage(15);
            showBanner("FRENZY x10 SURGE! +150");
            checkBounties();
        }

        var mult = 1 + Math.min(gzState.combo - 1, 16) * 0.06;
        var pts = Math.round(basePts * mult);
        gzState.destructionScore = Math.min(MAX_SCORE, gzState.destructionScore + pts);
        gzState.score = Math.min(MAX_SCORE, gzState.destructionScore + gzState.bountyScore);

        var txt = (label ? label + " " : "") + "+" + pts;
        spawnPopup(x, y + 1.5, z, txt, gzState.combo >= 6 ? "#fb923c" : "#facc15");
        updateHud();
    }

    function addRage(amt) {
        gzState.rage = Math.min(gzState.maxRage, gzState.rage + amt);
    }

    function getRemainingVaultCount() {
        var count = 0;
        for (var i = 0; i < gzState.vaults.length; i++) {
            if (!gzState.vaults[i].destroyed) count++;
        }
        return count;
    }

    function getTowerShieldMult() {
        var left = getRemainingVaultCount();
        if (left >= 3) return 0.20;
        if (left === 2) return 0.40;
        if (left === 1) return 0.65;
        return 1.0;
    }

    function fireTowerHazardShockwave(mt) {
        if (!mt || mt.destroyed || gzState.mode !== "playing") return;
        var sw = spawnShockwave(mt.x, 0.3, mt.z, 0xf97316, 19.5, 0.65);
        sw.isHazard = true;
        sw.dmg = 14;
        sw.resolved = false;
        playCollapseSfx(true);
        spawnBurst(mt.x, 1.5, mt.z, 0xf97316, 18, 16);
    }

    function damageVault(v, dmg) {
        if (!v || v.destroyed || gzState.mode !== "playing") return;
        v.hp -= dmg;
        v.shake = 0.24;
        v.flash = 0.12;
        addRage(6);
        spawnDebris(v.x, 1.8, v.z, 0xfacc15, 4, false);
        if (v.hp <= 0) {
            v.destroyed = true;
            gzState.vaultsSmashed++;
            gzState.bountyScore += v.bonus;
            gzState.hp = Math.min(gzState.maxHp, gzState.hp + 8);
            gzState.trauma = Math.min(1.0, gzState.trauma + 0.45);
            gzState.hitstop = 0.032;
            if (v.mesh && cityGroup) cityGroup.remove(v.mesh);
            playCollapseSfx(true);
            playPickupSfx();
            spawnBurst(v.x, 2.0, v.z, 0xfacc15, 22, 14);
            spawnShockwave(v.x, 0.2, v.z, 0xfacc15, 8.2, 0.52);
            spawnRubble(v.x, v.z, v.w, v.d, 0x9333ea);
            spawnDebris(v.x, 2.2, v.z, 0x581c87, 10, false);
            addScore(v.pts, v.x, 2.0, v.z, "");
            addRage(25);
            spawnPopup(v.x, 3.3, v.z, "VAULT +" + v.bonus + " & +8 HP!", "#fde047");

            var vaultsLeft = getRemainingVaultCount();
            if (vaultsLeft === 2) {
                showBanner("VAULT 1/3 SMASHED! TOWER SHIELD -> 60%");
            } else if (vaultsLeft === 1) {
                gzState.vaultThreatBoost = 1;
                showBanner("VAULT 2/3 SMASHED! TOWER SHIELD -> 35%");
            } else if (vaultsLeft === 0) {
                gzState.bountyScore += 300;
                gzState.score = Math.min(MAX_SCORE, gzState.destructionScore + gzState.bountyScore);
                if (gzState.megaTower) {
                    gzState.megaTower.flinchTimer = Math.max(gzState.megaTower.flinchTimer || 0, 1.2);
                }
                spawnShockwave(TOWER_X, 1.2, TOWER_Z, 0x22d3ee, 16.0, 0.72);
                spawnBurst(TOWER_X, 6.0, TOWER_Z, 0xfacc15, 22, 16);
                spawnPopup(v.x, 4.4, v.z, "SHIELD BREAKER +300!", "#22d3ee");
                showBanner("ALL VAULTS SMASHED! SHIELD SHATTERED +300!");
            } else {
                showBanner("GOLDEN VAULT SMASHED! +" + v.bonus);
            }
            checkBounties();
        }
    }

    function detonateReactor(b) {
        if (!b || b.meltdownDetonated) return;
        b.meltdownDetonated = true;
        b.meltdownTimer = 0;
        if (b.meltdownRing && dynamicGroup) {
            dynamicGroup.remove(b.meltdownRing);
            b.meltdownRing = null;
        }
        var chainRad = (gzState.district && gzState.district.id === "reactor") ? 13.5 : 11.5;
        showBanner("REACTOR CHAIN BLAST!");
        spawnBurst(b.x, 2.2, b.z, 0xf97316, 26, 18);
        spawnShockwave(b.x, 0.35, b.z, 0xf97316, chainRad + 3.0, 0.62);
        playCollapseSfx(true);
        gzState.trauma = Math.min(1.0, gzState.trauma + 0.62);

        var m = gzState.monster;
        if (gzState.mode === "playing" && m.y < 1.35 && Math.hypot(m.x - b.x, m.z - b.z) < chainRad * 0.78) {
            damagePlayer(14);
            spawnPopup(m.x, 3.2, m.z, "MELTDOWN -14 HP!", "#f87171");
        }

        for (var i = 0; i < gzState.buildings.length; i++) {
            var ob = gzState.buildings[i];
            if (!ob.destroyed && Math.hypot(ob.x - b.x, ob.z - b.z) < chainRad) {
                damageBuilding(ob, 62, true);
            }
        }
        for (var ei = gzState.enemies.length - 1; ei >= 0; ei--) {
            var en = gzState.enemies[ei];
            if (Math.hypot(en.x - b.x, en.z - b.z) < chainRad + 0.5) {
                damageEnemy(en, 95, "REACTOR BLAST!");
            }
        }
    }

    function damageBuilding(b, dmg, isChain) {
        if (!b || b.destroyed) return;
        b.hp -= dmg;
        b.shake = 0.25;
        b.flash = 0.12;
        addRage(3.5);
        spawnDebris(b.x, Math.min(b.h, 3.5), b.z, b.kind === "reactor" ? 0x22d3ee : 0x64748b, 4, false);

        if (!b.crackedApplied && b.hp <= b.maxHp * 0.5 && b.bodyMesh && cityTextures) {
            b.crackedApplied = true;
            var bodyMatTarget = b.baseBodyMat || b.bodyMesh.material;
            if (bodyMatTarget && bodyMatTarget !== sharedMat.hitFlash) {
                bodyMatTarget.map = cityTextures.cracked;
                if ("emissiveMap" in bodyMatTarget && cityTextures.crackedEmissive) {
                    bodyMatTarget.emissiveMap = cityTextures.crackedEmissive;
                }
                bodyMatTarget.needsUpdate = true;
            }
        }

        if (b.hp <= 0) {
            b.destroyed = true;
            b.collapseAnim = 0.58;
            var km = gzState.monster;
            var tdx = b.x - km.x;
            var tdz = b.z - km.z;
            var tDist = Math.hypot(tdx, tdz);
            b.collapseTiltX = tDist > 0.01 ? (tdx / tDist) * 0.34 : 0.24;
            b.collapseTiltZ = tDist > 0.01 ? (tdz / tDist) * 0.34 : 0.18;
            if (b.bodyMesh && b.baseBodyMat) {
                b.bodyMesh.material = b.baseBodyMat;
            }
            if (b.fadeMats) {
                for (var fmi = 0; fmi < b.fadeMats.length; fmi++) {
                    b.fadeMats[fmi].transparent = false;
                    b.fadeMats[fmi].opacity = 1.0;
                    b.fadeMats[fmi].needsUpdate = true;
                }
            }
            gzState.buildingsWrecked++;
            if (b.kind === "reactor") gzState.stats.reactorsWrecked++;
            if (b.kind === "glass") gzState.stats.glassWrecked++;
            gzState.trauma = Math.min(1.0, gzState.trauma + (b.kind === "glass" ? 0.52 : 0.36));
            gzState.hitstop = 0.032;
            playCollapseSfx(b.kind === "glass" || b.kind === "reactor");

            spawnBurst(b.x, 1.5, b.z, b.kind === "reactor" ? 0x22d3ee : 0xfacc15, 16, 12);
            spawnShockwave(b.x, 0.2, b.z, b.kind === "reactor" ? 0x22d3ee : 0xf97316, b.kind === "reactor" ? 13.5 : 8.5, b.kind === "reactor" ? 0.56 : 0.44);
            spawnDebris(b.x, Math.min(b.h * 0.6, 5), b.z, 0x94a3b8, 12, true);
            addScore(b.pts, b.x, 2.0, b.z, b.kind === "glass" ? "TOWER DOWN!" : "");
            addRage(10);
            checkBounties();

            var pickupChance = (gzState.district && gzState.district.id === "neon") ? 0.16 : 0.08;
            if (b.kind === "diner" || Math.random() < pickupChance) {
                spawnPickup(b.x, b.z, false);
            }

            // Fuel Reactor Telegraph -> Chain Reaction Meltdown!
            if (b.kind === "reactor") {
                var delay = isChain ? 0.38 : 0.78;
                b.meltdownTimer = delay;
                b.meltdownMax = delay;
                b.meltdownDetonated = false;
                if (useThree && dynamicGroup && !b.meltdownRing) {
                    var mrMat = trackCityMat(new THREE.MeshBasicMaterial({
                        color: 0xf97316,
                        transparent: true,
                        opacity: 0.78,
                        side: THREE.DoubleSide,
                        blending: THREE.AdditiveBlending,
                        depthWrite: false
                    }));
                    var mr = new THREE.Mesh(sharedGeo.ringThin, mrMat);
                    mr.position.set(b.x, 0.18, b.z);
                    var radVis = ((gzState.district && gzState.district.id === "reactor") ? 13.5 : 11.5) * 0.78;
                    mr.scale.setScalar(radVis);
                    dynamicGroup.add(mr);
                    b.meltdownRing = mr;
                    b.meltdownRingMat = mrMat;
                }
                if (!isChain) {
                    spawnPopup(b.x, 3.8, b.z, "MELTDOWN! BACK!", "#22d3ee");
                    showBanner("REACTOR MELTDOWN! STAND CLEAR!");
                    playWaveAlertSfx(false);
                }
            }
        }
    }

    function damageMegaTower(dmg) {
        var mt = gzState.megaTower;
        if (!mt || mt.destroyed || gzState.mode !== "playing") return;

        var shieldMult = getTowerShieldMult();
        var effDmg = dmg * shieldMult;
        if (shieldMult < 1.0) {
            spawnBurst(mt.x, 3.2, mt.z, 0xa855f7, 3, 7);
            if ((gzState.shieldHintCd || 0) <= 0) {
                gzState.shieldHintCd = 2.6;
                var shieldPct = Math.round((1 - shieldMult) * 100);
                spawnPopup(mt.x, 5.8, mt.z, "SHIELD -" + shieldPct + "%! SMASH VAULTS!", "#c084fc");
                showBanner("TOWER SHIELDED (" + shieldPct + "%) - SMASH VAULTS!");
            }
        }

        mt.hp = Math.max(0, mt.hp - effDmg);
        mt.shake = 0.28;
        mt.flash = 0.14;
        mt.flinchTimer = Math.max(mt.flinchTimer || 0, 0.55);
        addRage(4);
        spawnDebris(mt.x, 3.0, mt.z, Math.random() > 0.5 ? 0xfacc15 : 0x581c87, 5, false);

        var nextTiers = Math.ceil((mt.hp / mt.maxHp) * 4);
        while (mt.tiersLeft > nextTiers && mt.tiersLeft > 0) {
            mt.tiersLeft--;
            mt.flinchTimer = 0.95;
            gzState.trauma = Math.min(1.0, gzState.trauma + 0.6);
            playCollapseSfx(true);
            spawnBurst(mt.x, 2.5, mt.z, 0xfacc15, 18, 13);
            spawnShockwave(mt.x, 0.25, mt.z, 0xfacc15, 11.5, 0.55);
            addScore(125, mt.x, 4.5, mt.z, "TIER SMASHED!");

            if (mt.tiersLeft > 0) {
                mt.pulseWindup = 0.88;
                playWaveAlertSfx(mt.tiersLeft === 1);
                if (mt.tiersLeft === 3) {
                    showBanner("TIER BROKEN! TOWER TURRETS ONLINE!");
                } else if (mt.tiersLeft === 2) {
                    showBanner("PLAZA SHOCKWAVE! LEAP OR BACK!");
                } else if (mt.tiersLeft === 1) {
                    showBanner("FINAL TIER! BRONNY GUARD SURGE!");
                }
            }

            if (mt.tiersLeft <= 2 && !gzState.aceTowerReinforced) {
                gzState.aceTowerReinforced = true;
                var hasAce = false;
                for (var ac = 0; ac < gzState.enemies.length; ac++) {
                    if (gzState.enemies[ac].isAce && !gzState.enemies[ac].dead) hasAce = true;
                }
                if (!hasAce) {
                    spawnEnemy("chopper", true);
                    showBanner("ACE COMMANDER INBOUND!");
                }
            }

            if (mt.tiersLeft <= 1 && !mt.finalSurgeDone) {
                mt.finalSurgeDone = true;
                spawnEnemy("tank", false, false, { x: mt.x - 13, z: mt.z + 9 });
                spawnEnemy("chopper", false, false, { x: mt.x + 13, z: mt.z + 11 });
            }

            if (useThree && mt.tierMeshes.length > 0) {
                var removed = mt.tierMeshes.shift();
                if (removed && removed.grp && mt.group) {
                    mt.group.remove(removed.grp);
                }
                // Drop remaining tiers cleanly down!
                var curY = 0;
                for (var t = 0; t < mt.tierMeshes.length; t++) {
                    mt.tierMeshes[t].grp.position.y = curY;
                    curY += mt.tierMeshes[t].h;
                }
                if (mt.crownGroup) {
                    mt.crownGroup.position.y = curY;
                }
            }
        }

        if (mt.hp <= 0) {
            mt.destroyed = true;
            triggerVictory();
        }
    }

    function damageEnemy(e, dmg, bannerTag) {
        if (!e || e.dead) return;
        e.hp -= dmg;
        if (e.hp <= 0) {
            e.dead = true;
            gzState.unitsSmashed++;
            if (e.kind === "chopper") gzState.stats.choppersDown++;
            if (e.kind === "tank") gzState.stats.tanksDown++;
            gzState.trauma = Math.min(1.0, gzState.trauma + (e.isBoss ? 0.55 : 0.3));
            playCollapseSfx(e.kind === "chopper" || e.kind === "tank");
            spawnBurst(e.x, e.y + 0.8, e.z, (e.isAce || e.isBoss) ? 0xfacc15 : 0xf97316, e.isBoss ? 22 : 15, e.isBoss ? 14 : 11);
            spawnShockwave(e.x, Math.max(0.2, e.y), e.z, (e.isAce || e.isBoss) ? 0xfacc15 : 0xf97316, e.isBoss ? 7.8 : (e.isAce ? 6.5 : 4.2), e.isBoss ? 0.45 : 0.35);
            spawnDebris(e.x, e.y + 0.8, e.z, e.isBoss ? 0xef4444 : 0x64748b, e.isBoss ? 10 : 6, false);
            var tag = bannerTag || (e.isBoss ? "MEGA-MECH DESTROYED!" : (e.isAce ? "ACE CHOPPER DOWN!" : (e.kind === "chopper" ? "CHOPPER DOWN!" : "")));
            addScore(e.pts, e.x, e.y + 1.2, e.z, tag);
            addRage(e.isBoss ? 28 : (e.isAce ? 24 : (e.kind === "chopper" ? 16 : 12)));
            checkBounties();

            if (e.isBoss || e.isAce || (e.kind === "tank" && Math.random() < 0.30) || (e.kind === "chopper" && Math.random() < 0.40)) {
                spawnPickup(e.x, e.z, !!(e.isAce || e.isBoss));
            }
            if (tag) showBanner(tag);
        }
    }

    function autoAimNudge(maxRange) {
        var m = gzState.monster;
        var hasMove = Math.abs(m.vx) > 0.5 || Math.abs(m.vz) > 0.5;
        if (hasMove) return;

        var bestDist = maxRange || 7.2;
        var bestAng = null;

        if (gzState.megaTower && !gzState.megaTower.destroyed) {
            var dt = Math.hypot(gzState.megaTower.x - m.x, gzState.megaTower.z - m.z);
            if (dt < bestDist + 2.5) {
                bestDist = dt;
                bestAng = Math.atan2(gzState.megaTower.x - m.x, gzState.megaTower.z - m.z);
            }
        }
        for (var vi = 0; vi < gzState.vaults.length; vi++) {
            var v = gzState.vaults[vi];
            if (v.destroyed) continue;
            var dv = Math.hypot(v.x - m.x, v.z - m.z);
            if (dv < bestDist + 1.5) {
                bestDist = dv;
                bestAng = Math.atan2(v.x - m.x, v.z - m.z);
            }
        }
        for (var i = 0; i < gzState.enemies.length; i++) {
            var e = gzState.enemies[i];
            var de = Math.hypot(e.x - m.x, e.z - m.z);
            if (de < bestDist) {
                bestDist = de;
                bestAng = Math.atan2(e.x - m.x, e.z - m.z);
            }
        }
        for (var j = 0; j < gzState.buildings.length; j++) {
            var b = gzState.buildings[j];
            if (b.destroyed) continue;
            var db = Math.hypot(b.x - m.x, b.z - m.z);
            if (db < bestDist) {
                bestDist = db;
                bestAng = Math.atan2(b.x - m.x, b.z - m.z);
            }
        }
        if (bestAng !== null) {
            m.angle = bestAng;
            m.targetAngle = bestAng;
        }
    }

    function triggerSmash() {
        if (gzState.mode !== "playing") return;
        var m = gzState.monster;
        if (m.smashCd > 0) return;

        autoAimNudge(7.5);
        m.smashCd = 0.34;
        m.smashAnim = 0.28;
        m.chompHitDone = false;

        // Check if an Attack Helicopter is within Leap-Chomp range!
        var skyTarget = false;
        for (var i = 0; i < gzState.enemies.length; i++) {
            var e = gzState.enemies[i];
            if (e.kind === "chopper" && !e.dead && Math.hypot(e.x - m.x, e.z - m.z) < 7.6) {
                skyTarget = true;
                break;
            }
        }
        if (skyTarget && m.y < 0.8) {
            m.vy = 14.5; // Dramatic Leap-Chomp upward into the chopper!
        }

        // Slight forward lunge
        m.x += Math.sin(m.angle) * 0.75;
        m.z += Math.cos(m.angle) * 0.75;
        playChompSfx(skyTarget);
    }

    function resolveSmashHits() {
        var m = gzState.monster;
        var fx = Math.sin(m.angle);
        var fz = Math.cos(m.angle);
        var hitCenterX = m.x + fx * 2.5;
        var hitCenterZ = m.z + fz * 2.5;

        spawnShockwave(hitCenterX, 0.22, hitCenterZ, 0xfb923c, 5.2, 0.28);
        spawnBurst(hitCenterX, 0.9, hitCenterZ, 0xfef08a, 5, 7);

        // Hit Buildings & Vaults
        for (var i = 0; i < gzState.buildings.length; i++) {
            var b = gzState.buildings[i];
            if (b.destroyed) continue;
            var dx = Math.abs(hitCenterX - b.x);
            var dz = Math.abs(hitCenterZ - b.z);
            if (dx < b.w * 0.5 + 3.0 && dz < b.d * 0.5 + 3.0) {
                damageBuilding(b, 38);
            }
        }
        for (var vi = 0; vi < gzState.vaults.length; vi++) {
            var v = gzState.vaults[vi];
            if (!v.destroyed && Math.abs(hitCenterX - v.x) < v.w * 0.5 + 3.2 && Math.abs(hitCenterZ - v.z) < v.d * 0.5 + 3.2) {
                damageVault(v, 48);
            }
        }

        // Hit Mega Tower
        var mt = gzState.megaTower;
        if (mt && !mt.destroyed) {
            if (Math.abs(hitCenterX - mt.x) < mt.w * 0.5 + 3.2 && Math.abs(hitCenterZ - mt.z) < mt.d * 0.5 + 3.2) {
                damageMegaTower(36);
            }
        }

        // Hit Enemies (including mid-air Leap-Chomp on Choppers!)
        for (var ei = gzState.enemies.length - 1; ei >= 0; ei--) {
            var e = gzState.enemies[ei];
            var dist = Math.hypot(e.x - hitCenterX, e.z - hitCenterZ);
            var bodyDist = Math.hypot(e.x - m.x, e.z - m.z);
            if (e.kind === "chopper") {
                if ((dist < 5.6 || bodyDist < 6.4) && m.y > 0.9) {
                    damageEnemy(e, 100, "SKY CHOMP +8 HP!");
                    gzState.hp = Math.min(gzState.maxHp, gzState.hp + 8);
                }
            } else if (dist < 4.5 || bodyDist < 4.0) {
                damageEnemy(e, 60);
            }
        }
    }

    function triggerTailWhip() {
        if (gzState.mode !== "playing") return;
        var m = gzState.monster;
        if (m.tailCd > 0) return;
        m.tailCd = 1.5;
        m.tailAnim = 0.38;
        m.tailHitDone = false;
        playTailWhipSfx();
    }

    function resolveTailHits() {
        var m = gzState.monster;
        var rad = 7.4;

        spawnBurst(m.x, 1.0, m.z, 0xfacc15, 10, 14);
        spawnShockwave(m.x, 0.28, m.z, 0xfacc15, rad + 0.8, 0.38);

        // Deflect incoming enemy shells & missiles!
        for (var pi = gzState.projectiles.length - 1; pi >= 0; pi--) {
            var pr = gzState.projectiles[pi];
            if (Math.hypot(pr.x - m.x, pr.z - m.z) < rad + 1.5) {
                spawnBurst(pr.x, pr.y, pr.z, 0xfef08a, 4, 6);
                if (pr.mesh && dynamicGroup) dynamicGroup.remove(pr.mesh);
                gzState.projectiles.splice(pi, 1);
            }
        }

        // Parry active hazard shockwaves from the Mega Tower!
        for (var swp = 0; swp < gzState.shockwaves.length; swp++) {
            var sw = gzState.shockwaves[swp];
            if (!sw.isHazard || sw.resolved) continue;
            if (Math.hypot(m.x - sw.x, m.z - sw.z) <= sw.maxRadius + 2.0) {
                sw.resolved = true;
                addRage(8);
                spawnPopup(m.x, 3.0, m.z, "PARRY! +8 RAGE", "#38bdf8");
                spawnBurst(m.x, 1.3, m.z, 0x38bdf8, 8, 10);
            }
        }

        for (var i = 0; i < gzState.buildings.length; i++) {
            var b = gzState.buildings[i];
            if (!b.destroyed && Math.hypot(b.x - m.x, b.z - m.z) < rad + b.w * 0.45) {
                damageBuilding(b, 28);
            }
        }
        for (var vi = 0; vi < gzState.vaults.length; vi++) {
            var v = gzState.vaults[vi];
            if (!v.destroyed && Math.hypot(v.x - m.x, v.z - m.z) < rad + v.w * 0.5) {
                damageVault(v, 30);
            }
        }

        var mt = gzState.megaTower;
        if (mt && !mt.destroyed && Math.hypot(mt.x - m.x, mt.z - m.z) < rad + mt.w * 0.48) {
            damageMegaTower(26);
        }

        for (var ei = gzState.enemies.length - 1; ei >= 0; ei--) {
            var e = gzState.enemies[ei];
            var d = Math.hypot(e.x - m.x, e.z - m.z);
            if (e.kind !== "chopper" && d < rad + 1.0) {
                damageEnemy(e, 52, "TAIL SMASH!");
            } else if (e.kind === "chopper" && d < rad + 1.4 && e.y < 4.7) {
                damageEnemy(e, 32);
            }
        }
    }

    function triggerRoar() {
        if (gzState.mode !== "playing") return;
        var m = gzState.monster;
        if (m.roarTimer > 0 || gzState.rage < 40) return;

        autoAimNudge(18);
        gzState.rage = Math.max(0, gzState.rage - 40);
        m.roarTimer = 1.15;
        gzState.trauma = Math.min(1.0, gzState.trauma + 0.55);
        showBanner("ATOMIC EMBER ROAR!");
        playRoarSfx();
    }

    function damagePlayer(dmg) {
        if (gzState.mode !== "playing") return;
        dmg = Number(dmg);
        if (!Number.isFinite(dmg) || dmg <= 0) return;
        var m = gzState.monster;
        if (m.hurtTimer > 0) return;

        gzState.hp = Math.max(0, gzState.hp - dmg);
        m.hurtTimer = 0.28;
        if (gzState.combo > 1) {
            gzState.combo = Math.max(0, Math.floor(gzState.combo * 0.6));
            if (gzState.combo > 0) gzState.comboTimer = Math.min(gzState.comboTimer, 2.0);
        }
        gzState.trauma = Math.min(1.0, gzState.trauma + 0.25);
        playHurtSfx();
        spawnBurst(m.x, 1.8, m.z, 0xf97316, 6, 8);

        if (gzState.hp <= 0) {
            triggerDefeat();
        }
    }

    // =========================================================================
    // --- End Conditions & Score Submission ---
    // =========================================================================

    function computeStyleRank(win, score) {
        if (win) {
            if (score >= 12000) return "S+";
            if (score >= 9200) return "S";
            if (score >= 6500) return "A";
            if (score >= 4000) return "B";
            return "C";
        }
        if (score >= 7500) return "A";
        return score >= 3500 ? "B" : "C";
    }

    function formatClock(sec) {
        var s = Math.max(0, Math.floor(sec));
        var m = Math.floor(s / 60);
        var r = s % 60;
        return m + ":" + (r < 10 ? "0" : "") + r;
    }

    function triggerVictory() {
        if (gzState.mode !== "playing") return;
        gzState.mode = "victory_anim";
        gzState.outcome = "win";
        gzState.victoryTimer = 1.45;
        gzState.rescueBonus = 900;
        gzState.timeBonus = gzState.elapsed <= 55
            ? 1200
            : Math.max(0, Math.round(((185 - gzState.elapsed) / 130) * 1200));
        gzState.healthBonus = Math.round((gzState.hp / gzState.maxHp) * 900);
        gzState.score = Math.min(
            MAX_SCORE,
            gzState.destructionScore + gzState.bountyScore + gzState.rescueBonus + gzState.timeBonus + gzState.healthBonus
        );
        gzState.styleRank = computeStyleRank(true, gzState.score);

        // Clear active hostile fire and celebrate!
        for (var pi = 0; pi < gzState.projectiles.length; pi++) {
            if (gzState.projectiles[pi].mesh && dynamicGroup) dynamicGroup.remove(gzState.projectiles[pi].mesh);
        }
        gzState.projectiles = [];

        if (monsterRig) {
            monsterRig.beamGroup.visible = false;
            if (monsterRig.bronnyRiderRig) monsterRig.bronnyRiderRig.root.visible = true;
        }
        gzState.monster.angle = 0.28;
        gzState.monster.targetAngle = 0.28;
        if (gzState.megaTower && gzState.megaTower.group && useThree) {
            cityGroup.remove(gzState.megaTower.group);
        }

        playVictoryFanfare();
        showBanner("BABY BRONNY SAVED!");
        spawnBurst(gzState.monster.x, 4.2, gzState.monster.z, 0xfacc15, 28, 15);
        spawnBurst(gzState.monster.x, 4.2, gzState.monster.z, 0x9333ea, 24, 15);
        updateHud();
    }

    function triggerDefeat() {
        if (gzState.mode !== "playing") return;
        gzState.mode = "gameover";
        gzState.outcome = "loss";
        gzState.rescueBonus = 0;
        gzState.timeBonus = 0;
        gzState.healthBonus = 0;
        gzState.score = Math.min(MAX_SCORE, gzState.destructionScore + gzState.bountyScore);
        gzState.styleRank = computeStyleRank(false, gzState.score);
        if (monsterRig) monsterRig.beamGroup.visible = false;
        if (typeof playGameOverSound === "function") playGameOverSound();
        showEndOverlay();
    }

    function showEndOverlay() {
        var win = gzState.outcome === "win";
        var dName = gzState.district ? gzState.district.name : "Downtown";
        var aName = gzState.arena ? gzState.arena.name : "North Plaza";
        if (overRecordBanner) overRecordBanner.hidden = true;
        if (overBadge) overBadge.textContent = (win ? "RANK " + gzState.styleRank + " - BABY BRONNY SAVED!" : "RANK " + gzState.styleRank + " - KAIJU OVERWHELMED");
        if (overTitle) overTitle.textContent = win ? "Baby Bronny Rescued!" : "Taken Down by the Army!";
        if (overBreakdown) {
            overBreakdown.textContent = win
                ? "Destruction: " + gzState.destructionScore.toLocaleString()
                    + " + Bounties: +" + gzState.bountyScore.toLocaleString()
                    + " + Rescue: +" + gzState.rescueBonus.toLocaleString()
                    + " + Speed: +" + gzState.timeBonus.toLocaleString()
                    + " + HP: +" + gzState.healthBonus.toLocaleString()
                : dName + " (" + aName + ") \u00b7 Destruction: " + gzState.destructionScore.toLocaleString()
                    + " + Bounties: +" + gzState.bountyScore.toLocaleString();
        }
        if (overScore) overScore.textContent = gzState.score.toLocaleString();
        if (overCombo) overCombo.textContent = "\u00d7" + gzState.maxCombo;
        if (overStatsLine) {
            overStatsLine.textContent = dName + " (" + formatClock(gzState.elapsed) + ") \u00b7 Buildings: " + gzState.buildingsWrecked + "/" + gzState.totalBuildings + " \u00b7 Vaults: " + gzState.vaultsSmashed + "/3 \u00b7 Units: " + gzState.unitsSmashed;
        }
        if (overBest) overBest.textContent = "\u2014";
        if (overRank) overRank.textContent = "\u2014";
        if (overSaveStatus) overSaveStatus.textContent = "Saving score\u2026";

        paintCameoBanner(overCameoCanvas, win);
        if (overOverlay) overOverlay.hidden = false;

        submitGodzillaScore();
    }

    async function submitGodzillaScore() {
        if (gzState.submitted) return;
        gzState.submitted = true;
        var gid = gzState.gameId;
        var finalScore = Math.max(0, Math.min(MAX_SCORE, Math.round(gzState.score)));
        var finalCombo = Math.max(0, Math.min(100000, Math.round(gzState.maxCombo)));

        try {
            var res = null;
            if (window.McWutGames && window.McWutGames.leaderboard && typeof window.McWutGames.leaderboard.submitScore === "function") {
                res = await window.McWutGames.leaderboard.submitScore(GAME_KEY, finalScore, finalCombo);
            } else if (typeof window.submitScore === "function") {
                res = await window.submitScore(GAME_KEY, finalScore, finalCombo);
            }
            if (!res || gid !== gzState.gameId) return;

            gzState.leaderboard = res.leaderboard;
            if (overBest) overBest.textContent = (res.bestScore || finalScore).toLocaleString();
            if (overRank) overRank.textContent = res.rank ? "#" + res.rank : "\u2014";
            if (overRecordBanner) overRecordBanner.hidden = !res.isNewBest;
            if (overSaveStatus) {
                overSaveStatus.textContent = res.isNewBest
                    ? "New personal record saved to the global leaderboard!"
                    : "Score recorded. Personal best: " + (res.bestScore || 0).toLocaleString() + ".";
            }
        } catch (err) {
            if (overSaveStatus && gid === gzState.gameId) {
                overSaveStatus.textContent = "Could not save score right now.";
            }
        }
    }

    // =========================================================================
    // --- Main Simulation Update ---
    // =========================================================================

    function updateSimulation(dt) {
        if (dt > 0.05) dt = 0.05;
        gzState.elapsed += dt;
        gzState.trauma = Math.max(0, gzState.trauma - dt * 1.9);

        if (gzState.bannerTimer > 0) {
            gzState.bannerTimer -= dt;
            if (gzState.bannerTimer <= 0 && popBannerEl) {
                popBannerEl.hidden = true;
            }
        }

        if (gzState.mode === "victory_anim") {
            gzState.victoryTimer -= dt;
            updateParticlesAndDebris(dt);
            if (gzState.victoryTimer <= 0) {
                gzState.mode = "gameover";
                showEndOverlay();
            }
            return;
        }

        if (gzState.mode !== "playing") return;

        if (gzState.hitstop > 0) {
            gzState.hitstop -= dt;
            return;
        }

        var m = gzState.monster;
        if (gzState.shieldHintCd > 0) gzState.shieldHintCd = Math.max(0, gzState.shieldHintCd - dt);

        // Combo decay
        if (gzState.combo > 0) {
            gzState.comboTimer -= dt;
            if (gzState.comboTimer <= 0) {
                gzState.combo = 0;
            }
        }

        // Cooldowns & timers
        if (m.smashCd > 0) m.smashCd = Math.max(0, m.smashCd - dt);
        if (m.smashAnim > 0) {
            m.smashAnim = Math.max(0, m.smashAnim - dt);
            if (!m.chompHitDone && m.smashAnim < 0.2) {
                m.chompHitDone = true;
                resolveSmashHits();
            }
        }
        if (m.tailCd > 0) m.tailCd = Math.max(0, m.tailCd - dt);
        if (m.tailAnim > 0) {
            m.tailAnim = Math.max(0, m.tailAnim - dt);
            if (!m.tailHitDone && m.tailAnim < 0.26) {
                m.tailHitDone = true;
                resolveTailHits();
            }
        }
        if (m.hurtTimer > 0) m.hurtTimer = Math.max(0, m.hurtTimer - dt);

        // Atomic Ember Roar Beam active
        if (m.roarTimer > 0) {
            m.roarTimer = Math.max(0, m.roarTimer - dt);
            var rfx = Math.sin(m.angle);
            var rfz = Math.cos(m.angle);
            var beamLen = 21;
            var dps = 115 * dt;

            for (var bi = 0; bi < gzState.buildings.length; bi++) {
                var b = gzState.buildings[bi];
                if (b.destroyed) continue;
                var bx = b.x - m.x;
                var bz = b.z - m.z;
                var proj = bx * rfx + bz * rfz;
                var perp = Math.abs(bx * rfz - bz * rfx);
                if (proj > 0 && proj < beamLen && perp < b.w * 0.5 + 2.0) {
                    damageBuilding(b, dps);
                }
            }
            for (var vi = 0; vi < gzState.vaults.length; vi++) {
                var v = gzState.vaults[vi];
                if (v.destroyed) continue;
                var vx = v.x - m.x;
                var vz = v.z - m.z;
                var vproj = vx * rfx + vz * rfz;
                var vperp = Math.abs(vx * rfz - vz * rfx);
                if (vproj > 0 && vproj < beamLen && vperp < v.w * 0.5 + 2.2) {
                    damageVault(v, dps);
                }
            }
            if (gzState.megaTower && !gzState.megaTower.destroyed) {
                var mtx = gzState.megaTower.x - m.x;
                var mtz = gzState.megaTower.z - m.z;
                var mproj = mtx * rfx + mtz * rfz;
                var mperp = Math.abs(mtx * rfz - mtz * rfx);
                if (mproj > 0 && mproj < beamLen && mperp < gzState.megaTower.w * 0.5 + 2.2) {
                    damageMegaTower(dps * 0.85);
                }
            }
            for (var ei = gzState.enemies.length - 1; ei >= 0; ei--) {
                var en = gzState.enemies[ei];
                var ex = en.x - m.x;
                var ez = en.z - m.z;
                var eproj = ex * rfx + ez * rfz;
                var eperp = Math.abs(ex * rfz - ez * rfx);
                if (eproj > 0 && eproj < beamLen + 2 && eperp < 3.2) {
                    damageEnemy(en, dps * 1.4, en.kind === "chopper" ? "ROASTED CHOPPER!" : "");
                }
            }
            // Vaporize enemy projectiles in beam!
            for (var pi = gzState.projectiles.length - 1; pi >= 0; pi--) {
                var pr = gzState.projectiles[pi];
                var px = pr.x - m.x;
                var pz = pr.z - m.z;
                var pproj = px * rfx + pz * rfz;
                var pperp = Math.abs(px * rfz - pz * rfx);
                if (pproj > 0 && pproj < beamLen && pperp < 2.6) {
                    if (pr.mesh && dynamicGroup) dynamicGroup.remove(pr.mesh);
                    gzState.projectiles.splice(pi, 1);
                }
            }
        }

        // Movement input (Keyboard + Virtual Joystick)
        var ix = (gzInput.right ? 1 : 0) - (gzInput.left ? 1 : 0);
        var iz = (gzInput.down ? 1 : 0) - (gzInput.up ? 1 : 0);
        if (gzInput.joyActive) {
            ix += gzInput.joyX;
            iz += gzInput.joyY;
        }
        var mag = Math.hypot(ix, iz);
        if (mag > 0.08) {
            var clampMag = Math.min(1, mag);
            var nx = ix / mag;
            var nz = iz / mag;
            var roarSlow = m.roarTimer > 0 ? 0.55 : 1.0;
            m.vx = nx * m.speed * clampMag * roarSlow;
            m.vz = nz * m.speed * clampMag * roarSlow;
            m.targetAngle = Math.atan2(nx, nz);

            gzState.stepAccum += dt * 7.8 * clampMag;
            var stepSign = Math.sin(gzState.stepAccum) >= 0 ? 1 : -1;
            if (stepSign !== gzState.lastStepSign && m.y <= 0.05) {
                gzState.lastStepSign = stepSign;
                playStompSfx();
                spawnBurst(m.x, 0.15, m.z, 0x94a3b8, 2, 4);
            }
        } else {
            m.vx *= Math.pow(0.01, dt);
            m.vz *= Math.pow(0.01, dt);
        }

        // Smooth shortest-arc yaw turn
        var angDiff = ((m.targetAngle - m.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        m.angle += angDiff * Math.min(1, dt * 13);

        // Leap gravity
        if (m.y > 0 || m.vy !== 0) {
            m.y += m.vy * dt;
            m.vy -= 36 * dt;
            if (m.y <= 0) {
                m.y = 0;
                if (m.vy < -6) {
                    gzState.trauma = Math.min(1.0, gzState.trauma + 0.25);
                    playStompSfx();
                    spawnBurst(m.x, 0.2, m.z, 0xfacc15, 6, 8);
                    spawnShockwave(m.x, 0.16, m.z, 0xfacc15, 5.0, 0.34);
                }
                m.vy = 0;
            }
        }

        m.x += m.vx * dt;
        m.z += m.vz * dt;
        m.x = Math.max(-CITY_HALF + 2, Math.min(CITY_HALF - 2, m.x));
        m.z = Math.max(-CITY_HALF - 7, Math.min(CITY_HALF - 13, m.z));

        // Circle-vs-AABB collision pushout against standing buildings + Mega Tower
        function pushOutBox(bx, bz, bw, bd) {
            var hw = bw * 0.5 + m.radius;
            var hd = bd * 0.5 + m.radius;
            var dx = m.x - bx;
            var dz = m.z - bz;
            if (Math.abs(dx) < hw && Math.abs(dz) < hd) {
                var ox = hw - Math.abs(dx);
                var oz = hd - Math.abs(dz);
                if (ox < oz) {
                    m.x += dx >= 0 ? ox : -ox;
                } else {
                    m.z += dz >= 0 ? oz : -oz;
                }
            }
        }

        for (var bi2 = 0; bi2 < gzState.buildings.length; bi2++) {
            var bld = gzState.buildings[bi2];
            if (!bld.destroyed) {
                pushOutBox(bld.x, bld.z, bld.w, bld.d);
            } else if (bld.collapseAnim > 0) {
                bld.collapseAnim = Math.max(0, bld.collapseAnim - dt);
                var pFall = 1 - bld.collapseAnim / 0.58;
                var fallEase = pFall * pFall;
                if (bld.mesh) {
                    bld.mesh.position.x = bld.x + (Math.random() - 0.5) * 0.22;
                    bld.mesh.position.z = bld.z + (Math.random() - 0.5) * 0.22;
                    bld.mesh.position.y = -fallEase * bld.h;
                    bld.mesh.rotation.x = (bld.collapseTiltZ || 0) * fallEase;
                    bld.mesh.rotation.z = -(bld.collapseTiltX || 0) * fallEase;
                    if (bld.collapseAnim <= 0) bld.mesh.visible = false;
                }
                if (bld.collapseAnim <= 0 && !bld.rubbleSpawned) {
                    bld.rubbleSpawned = true;
                    var rubCol = bld.kind === "reactor" ? 0x22d3ee : (bld.kind === "diner" ? 0xfacc15 : 0x64748b);
                    spawnRubble(bld.x, bld.z, bld.w, bld.d, rubCol);
                }
            }
            if (bld.meltdownTimer > 0 && !bld.meltdownDetonated) {
                bld.meltdownTimer -= dt;
                if (Math.random() < 0.45) {
                    spawnBurst(bld.x + (Math.random() - 0.5) * 2.2, 1.1, bld.z + (Math.random() - 0.5) * 2.2, 0x22d3ee, 1, 8);
                }
                if (bld.meltdownTimer <= 0) {
                    detonateReactor(bld);
                }
            }
            if (bld.shake > 0) bld.shake = Math.max(0, bld.shake - dt);
            if (bld.flash > 0) bld.flash = Math.max(0, bld.flash - dt);
        }

        // Smoldering rising smoke plumes above recent rubble craters (pooled & capped)
        var rubbleCount = gzState.rubble.length;
        var rubbleStart = Math.max(0, rubbleCount - 12);
        for (var rbi = rubbleCount - 1; rbi >= rubbleStart; rbi--) {
            var rbc = gzState.rubble[rbi];
            if (rbc.smokeLife <= 0) continue;
            rbc.smokeLife -= dt;
            rbc.smokeTimer -= dt;
            if (rbc.smokeTimer <= 0) {
                rbc.smokeTimer = 0.38 + Math.random() * 0.34;
                if (gzState.particles.length < 140) {
                    spawnBurst(
                        rbc.x + (Math.random() - 0.5) * rbc.w * 0.55,
                        0.32,
                        rbc.z + (Math.random() - 0.5) * rbc.d * 0.55,
                        0x94a3b8,
                        1,
                        2.0,
                        { isSmoke: true, sizeMin: 0.48, sizeMax: 0.92, lifeMin: 1.5, lifeMax: 2.3, vyMin: 1.8, vyMax: 3.1 }
                    );
                }
            }
        }

        for (var vi2 = 0; vi2 < gzState.vaults.length; vi2++) {
            var vlt = gzState.vaults[vi2];
            if (!vlt.destroyed) {
                pushOutBox(vlt.x, vlt.z, vlt.w, vlt.d);
                if (vlt.shake > 0) vlt.shake = Math.max(0, vlt.shake - dt);
                if (vlt.flash > 0) vlt.flash = Math.max(0, vlt.flash - dt);
            }
        }

        var mt = gzState.megaTower;
        if (mt && !mt.destroyed) {
            pushOutBox(mt.x, mt.z, mt.w, mt.d);
            if (mt.shake > 0) mt.shake = Math.max(0, mt.shake - dt);
            if (mt.flash > 0) mt.flash = Math.max(0, mt.flash - dt);
            if (mt.flinchTimer > 0) mt.flinchTimer = Math.max(0, mt.flinchTimer - dt);

            var distToTower = Math.hypot(m.x - mt.x, m.z - mt.z);

            if (mt.pulseWindup > 0) {
                mt.pulseWindup = Math.max(0, mt.pulseWindup - dt);
                if (mt.pulseWindup <= 0) {
                    fireTowerHazardShockwave(mt);
                }
            } else if (mt.tiersLeft <= 2) {
                mt.pulseCooldown -= dt;
                if (mt.pulseCooldown <= 0 && distToTower < 25) {
                    mt.pulseCooldown = mt.tiersLeft <= 1 ? 5.6 : 7.0;
                    mt.pulseWindup = 0.92;
                    showBanner("TOWER PULSE! LEAP OR STEP BACK!");
                }
            }

            if (mt.tiersLeft <= 3) {
                if (mt.turretTelegraph > 0) {
                    mt.turretTelegraph -= dt;
                    if (mt.turretTelegraph <= 0) {
                        var crownH = (mt.tiersLeft * 3.8) + 1.2;
                        var boltSpd = mt.tiersLeft <= 1 ? 20.5 : 18.0;
                        var bDist = Math.hypot(m.x - mt.x, m.z - mt.z) || 1;
                        var baseAng = Math.atan2(m.z - mt.z, m.x - mt.x);
                        var aimVy = ((m.y + 1.1) - crownH) / (bDist / boltSpd);
                        for (var tSide = -1; tSide <= 1; tSide += 2) {
                            var fireX = mt.x + tSide * 2.1;
                            var fireZ = mt.z + 1.6;
                            var ba = baseAng + (mt.tiersLeft <= 1 ? tSide * 0.09 : tSide * 0.04);
                            spawnProjectile(fireX, crownH, fireZ, Math.cos(ba) * boltSpd, aimVy, Math.sin(ba) * boltSpd, "towerBolt", 9);
                        }
                    }
                } else if (distToTower < 32) {
                    mt.turretTimer -= dt;
                    if (mt.turretTimer <= 0) {
                        mt.turretTimer = mt.tiersLeft <= 1 ? 2.4 : 3.2;
                        mt.turretTelegraph = 0.45;
                    }
                }
            }
        }

        // Auto-crunch street props & ground vehicles underfoot!
        for (var pri = gzState.props.length - 1; pri >= 0; pri--) {
            var prop = gzState.props[pri];
            if (!prop.destroyed && Math.hypot(prop.x - m.x, prop.z - m.z) < m.radius + 1.25) {
                prop.destroyed = true;
                if (prop.mesh && cityGroup) cityGroup.remove(prop.mesh);
                spawnBurst(prop.x, 0.7, prop.z, prop.kind === "tree" ? 0x22c55e : 0xfacc15, 5, 7);
                addScore(prop.pts, prop.x, 0.8, prop.z);
                addRage(3.2);
                playChompSfx(false);
                gzState.props.splice(pri, 1);
            }
        }

        // Collect Heal Burgers (including Ace Super Burgers)
        for (var pki = gzState.pickups.length - 1; pki >= 0; pki--) {
            var pk = gzState.pickups[pki];
            pk.life -= dt;
            var pd = Math.hypot(pk.x - m.x, pk.z - m.z);
            if (pd < 5.5) {
                pk.x += ((m.x - pk.x) / (pd || 1)) * 12 * dt;
                pk.z += ((m.z - pk.z) / (pd || 1)) * 12 * dt;
            }
            if (pd < 2.2) {
                var heal = pk.healAmt || 12;
                var rageGain = pk.rageAmt || 10;
                gzState.hp = Math.min(gzState.maxHp, gzState.hp + heal);
                addRage(rageGain);
                spawnPopup(m.x, 2.5, m.z, (pk.isSuper ? "SUPER +" : "+") + heal + " HP!", pk.isSuper ? "#fde047" : "#4ade80");
                playPickupSfx();
                if (pk.mesh && dynamicGroup) dynamicGroup.remove(pk.mesh);
                gzState.pickups.splice(pki, 1);
            } else if (pk.life <= 0) {
                if (pk.mesh && dynamicGroup) dynamicGroup.remove(pk.mesh);
                gzState.pickups.splice(pki, 1);
            } else if (pk.mesh) {
                pk.mesh.position.set(pk.x, 0.9 + Math.sin(gzState.elapsed * 5) * 0.22, pk.z);
                pk.mesh.rotation.y += dt * 2.4;
            }
        }

        // Update Threat Level & Enemy Spawning (District-weighted + Ace Commander Choppers)
        var wreckPct = gzState.totalBuildings > 0 ? gzState.buildingsWrecked / gzState.totalBuildings : 0;
        var nearTower = Math.hypot(m.x - TOWER_X, m.z - TOWER_Z) < 28;
        gzState.threatLevel = Math.min(5, 1 + Math.floor(wreckPct * 4.5 + gzState.elapsed / 32) + (nearTower ? 1 : 0) + (gzState.vaultThreatBoost || 0));

        if (gzState.threatLevel >= 3 && !gzState.wave3Triggered) {
            gzState.wave3Triggered = true;
            triggerThreatWave(3);
        }
        if (gzState.threatLevel >= 5 && !gzState.wave5Triggered) {
            gzState.wave5Triggered = true;
            triggerThreatWave(5);
        }

        var distCfg = gzState.district || CITY_DISTRICTS[0];
        var maxGround = 3 + gzState.threatLevel;
        var maxChoppers = gzState.threatLevel >= 4 ? 3 : (gzState.threatLevel >= 2 ? 2 : 1);
        var curGround = 0;
        var curChoppers = 0;
        var hasAceAlive = false;
        for (var ci = 0; ci < gzState.enemies.length; ci++) {
            if (gzState.enemies[ci].kind === "chopper") {
                curChoppers++;
                if (gzState.enemies[ci].isAce) hasAceAlive = true;
            } else {
                curGround++;
            }
        }

        gzState.spawnTimer -= dt;
        if (gzState.spawnTimer <= 0 && curGround < maxGround) {
            gzState.spawnTimer = Math.max(1.4, 3.2 - gzState.threatLevel * 0.35);
            spawnEnemy(gzState.threatLevel >= 2 && Math.random() < distCfg.tankBias ? "tank" : "jeep");
        }
        gzState.chopperTimer -= dt;
        if (gzState.chopperTimer <= 0 && curChoppers < maxChoppers) {
            gzState.chopperTimer = Math.max(2.4, 5.2 - gzState.threatLevel * 0.5 - (distCfg.chopperBias - 0.45));
            spawnEnemy("chopper", false);
        }
        if (gzState.threatLevel >= 3 && !hasAceAlive) {
            gzState.aceTimer -= dt;
            if (gzState.aceTimer <= 0 && curChoppers <= maxChoppers) {
                gzState.aceTimer = 24;
                spawnEnemy("chopper", true);
                showBanner("ACE COMMANDER CHOPPER!");
            }
        }

        // Update Enemy AI & Attacks
        for (var ei = gzState.enemies.length - 1; ei >= 0; ei--) {
            var e = gzState.enemies[ei];
            if (e.dead) {
                if (e.mesh && dynamicGroup) dynamicGroup.remove(e.mesh);
                if (e.shadowMesh && dynamicGroup) dynamicGroup.remove(e.shadowMesh);
                gzState.enemies.splice(ei, 1);
                continue;
            }

            var dx = m.x - e.x;
            var dz = m.z - e.z;
            var dist = Math.hypot(dx, dz) || 1;
            var dirX = dx / dist;
            var dirZ = dz / dist;

            // Stomp ground units automatically on contact!
            if (e.kind !== "chopper" && dist < m.radius + (e.isBoss ? 2.1 : 1.4) && m.y < 1.0) {
                damageEnemy(e, e.kind === "jeep" ? 99 : (e.isBoss ? 14 : 22));
                if (e.dead) continue;
            }

            if (e.kind === "chopper") {
                var idealDist = 10.5;
                var radialSpeed = dist > idealDist ? 1 : (dist < idealDist - 2 ? -0.8 : 0);
                var tangX = -dirZ * e.orbitDir;
                var tangZ = dirX * e.orbitDir;
                e.x += (dirX * radialSpeed + tangX * 0.85) * e.speed * dt;
                e.z += (dirZ * radialSpeed + tangZ * 0.85) * e.speed * dt;
                e.y = 4.0 + Math.sin(gzState.elapsed * 2.5 + e.rotorPhase) * 0.65;
                e.angle = Math.atan2(dx, dz);

                e.fireTimer -= dt;
                if (e.fireTimer <= 0 && dist < 26) {
                    e.fireTimer = Math.max(1.25, 2.35 - gzState.threatLevel * 0.18);
                    var mSpd = e.isAce ? 19.0 : 17.5;
                    var aimVy = ((m.y + 1.1) - e.y) / (dist / mSpd);
                    if (e.isAce) {
                        var baseAng = Math.atan2(dirZ, dirX);
                        for (var sp = -1; sp <= 1; sp += 2) {
                            var sa = baseAng + sp * 0.16;
                            spawnProjectile(e.x, e.y - 0.3, e.z, Math.cos(sa) * mSpd, aimVy, Math.sin(sa) * mSpd, "missile", 9);
                        }
                    } else {
                        spawnProjectile(e.x, e.y - 0.3, e.z, dirX * mSpd, aimVy, dirZ * mSpd, "missile", 9);
                    }
                }
            } else if (e.kind === "tank") {
                if (dist > 14) {
                    e.x += dirX * e.speed * dt;
                    e.z += dirZ * e.speed * dt;
                    e.angle = Math.atan2(dx, dz);
                }
                if (e.turret) {
                    e.turret.rotation.y = Math.atan2(dx, dz) - e.angle;
                }
                if (e.telegraphTimer > 0) {
                    e.telegraphTimer -= dt;
                    if (e.laserLine) e.laserLine.visible = true;
                    if (e.warnRing) {
                        e.warnRing.visible = true;
                        e.warnRing.scale.setScalar(2.1 + Math.sin(gzState.elapsed * 22) * 0.35);
                    }
                    if (e.telegraphTimer <= 0) {
                        if (e.laserLine) e.laserLine.visible = false;
                        if (e.warnRing) e.warnRing.visible = false;
                        var leadT = Math.min(0.65, dist / 21) * 0.35;
                        var leadDx = (m.x + m.vx * leadT) - e.x;
                        var leadDz = (m.z + m.vz * leadT) - e.z;
                        var leadDist = Math.hypot(leadDx, leadDz) || 1;
                        var lDirX = leadDx / leadDist;
                        var lDirZ = leadDz / leadDist;
                        if (e.isBoss) {
                            var baseBossAng = Math.atan2(lDirZ, lDirX);
                            for (var bsp = -1; bsp <= 1; bsp += 2) {
                                var bsa = baseBossAng + bsp * 0.14;
                                spawnProjectile(e.x, 1.8, e.z, Math.cos(bsa) * 22, 0, Math.sin(bsa) * 22, "shell", 15);
                            }
                        } else {
                            spawnProjectile(e.x, 1.4, e.z, lDirX * 21, 0, lDirZ * 21, "shell", 13);
                        }
                    }
                } else {
                    e.fireTimer -= dt;
                    if (e.fireTimer <= 0 && dist < 28) {
                        e.fireTimer = Math.max(1.8, 3.0 - gzState.threatLevel * 0.2);
                        e.telegraphTimer = 0.65;
                    }
                }
            } else {
                // Jeep / Police cruiser
                var jDesired = 11;
                if (dist > jDesired) {
                    e.x += dirX * e.speed * dt;
                    e.z += dirZ * e.speed * dt;
                } else {
                    e.x += (-dirZ * e.orbitDir) * e.speed * 0.6 * dt;
                    e.z += (dirX * e.orbitDir) * e.speed * 0.6 * dt;
                }
                e.angle = Math.atan2(dx, dz);
                e.fireTimer -= dt;
                if (e.fireTimer <= 0 && dist < 24) {
                    e.fireTimer = 1.1 + Math.random() * 0.7;
                    spawnProjectile(e.x, 1.0, e.z, dirX * 22, 0, dirZ * 22, "bullet", 4);
                }
            }

            if (e.mesh) {
                e.mesh.position.set(e.x, e.y, e.z);
                e.mesh.rotation.y = e.angle;
                if (e.rotor) e.rotor.rotation.y += dt * 28;
                if (e.tailRotor) e.tailRotor.rotation.x += dt * 34;
                if (e.sirenR && e.sirenB) {
                    var sPhase = Math.floor(gzState.elapsed * 9) % 2 === 0;
                    e.sirenR.material = sPhase ? sharedMat.sirenRed : sharedMat.steel;
                    e.sirenB.material = !sPhase ? sharedMat.sirenBlue : sharedMat.steel;
                }
                if (e.shadowMesh) e.shadowMesh.position.set(e.x, 0.06, e.z);
            }
        }

        // Update Enemy Projectiles
        for (var pji = gzState.projectiles.length - 1; pji >= 0; pji--) {
            var pr = gzState.projectiles[pji];
            pr.life -= dt;
            pr.x += pr.vx * dt;
            pr.y += pr.vy * dt;
            pr.z += pr.vz * dt;
            if (pr.kind === "missile" || pr.kind === "shell") {
                pr.trailTimer = (pr.trailTimer || 0) - dt;
                if (pr.trailTimer <= 0) {
                    pr.trailTimer = pr.kind === "missile" ? 0.045 : 0.075;
                    spawnBurst(pr.x, pr.y, pr.z, pr.kind === "missile" ? 0x94a3b8 : 0xf97316, 1, 1.5);
                }
            }
            if (pr.mesh) {
                pr.mesh.position.set(pr.x, pr.y, pr.z);
                pr.mesh.lookAt(pr.x + pr.vx, pr.y + pr.vy, pr.z + pr.vz);
            }

            var hitDist = Math.hypot(pr.x - m.x, pr.z - m.z);
            if (hitDist < m.radius + 0.4 && Math.abs(pr.y - (m.y + 1.3)) < 1.8) {
                damagePlayer(pr.dmg);
                if (pr.mesh && dynamicGroup) dynamicGroup.remove(pr.mesh);
                gzState.projectiles.splice(pji, 1);
                continue;
            }
            if (pr.life <= 0 || pr.y < -0.2) {
                if (pr.mesh && dynamicGroup) dynamicGroup.remove(pr.mesh);
                gzState.projectiles.splice(pji, 1);
            }
        }

        // Dynamic camera framing targets (Roar / Mega Tower proximity / Frenzy Combo)
        var roarBoost = m.roarTimer > 0 ? 1 : 0;
        var towerProx = (!gzState.megaTower || gzState.megaTower.destroyed)
            ? 0
            : Math.max(0, 1 - Math.hypot(m.x - TOWER_X, m.z - TOWER_Z) / 28);
        var frenzyBoost = gzState.combo >= 6 ? Math.min(1, (gzState.combo - 5) / 8) : 0;
        var tgtOffX = 6.8 + roarBoost * 0.6 + towerProx * 1.4 + frenzyBoost * 0.5;
        var tgtOffY = 16.5 + roarBoost * 1.6 + towerProx * 5.2 + frenzyBoost * 1.2;
        var tgtOffZ = 13.8 + roarBoost * 2.1 + towerProx * 5.4 + frenzyBoost * 1.4;
        var tgtLookX = -0.3 + roarBoost * Math.sin(m.angle) * 1.8 + towerProx * (TOWER_X - m.x) * 0.22;
        var tgtLookY = 1.5 + towerProx * 3.2;
        var tgtLookZ = -1.2 + roarBoost * Math.cos(m.angle) * 1.8 + towerProx * (TOWER_Z - m.z) * 0.22;
        var tgtFov = 46 + roarBoost * 3.5 + towerProx * 4.5 + frenzyBoost * 1.8;
        var tgtZoom2d = 1 + roarBoost * 0.09 + towerProx * 0.22 + frenzyBoost * 0.08;
        var camLerp = Math.min(1, 1 - Math.exp(-6.5 * dt));
        var cState = gzState.cam;
        cState.offX += (tgtOffX - cState.offX) * camLerp;
        cState.offY += (tgtOffY - cState.offY) * camLerp;
        cState.offZ += (tgtOffZ - cState.offZ) * camLerp;
        cState.lookX += (tgtLookX - cState.lookX) * camLerp;
        cState.lookY += (tgtLookY - cState.lookY) * camLerp;
        cState.lookZ += (tgtLookZ - cState.lookZ) * camLerp;
        cState.fov += (tgtFov - cState.fov) * camLerp;
        cState.zoom2d += (tgtZoom2d - cState.zoom2d) * camLerp;

        updateParticlesAndDebris(dt);
        updateHud();
    }

    function updateParticlesAndDebris(dt) {
        for (var i = gzState.particles.length - 1; i >= 0; i--) {
            var p = gzState.particles[i];
            p.life -= dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.z += p.vz * dt;
            if (p.isSmoke) {
                p.vy = Math.min(3.5, p.vy + 1.2 * dt);
            } else {
                p.vy -= 18 * dt;
                if (p.y < 0.1) { p.y = 0.1; p.vy *= -0.35; }
            }
            if (p.mesh) {
                p.mesh.position.set(p.x, p.y, p.z);
                if (p.isSmoke) {
                    var ageFrac = 1 - Math.max(0, p.life / p.maxLife);
                    var sCurve = ageFrac < 0.35 ? (0.65 + ageFrac * 1.8) : Math.max(0.08, (1 - ageFrac) * 1.95);
                    p.mesh.scale.setScalar(p.size * sCurve);
                } else {
                    p.mesh.scale.setScalar(Math.max(0.05, p.size * (p.life / p.maxLife)));
                }
            }
            if (p.life <= 0) {
                if (p.mesh && dynamicGroup) dynamicGroup.remove(p.mesh);
                gzState.particles.splice(i, 1);
            }
        }

        for (var di = gzState.debris.length - 1; di >= 0; di--) {
            var d = gzState.debris[di];
            d.life -= dt;
            d.x += d.vx * dt;
            d.y += d.vy * dt;
            d.z += d.vz * dt;
            d.vy -= 24 * dt;
            if (d.y < 0.25) {
                d.y = 0.25;
                d.vy = Math.abs(d.vy) * 0.35;
                d.vx *= 0.72;
                d.vz *= 0.72;
                d.canHitChopper = false;
            }
            // Flying debris from collapsing towers can swat low choppers!
            if (d.canHitChopper && d.y > 2.5) {
                for (var ei = gzState.enemies.length - 1; ei >= 0; ei--) {
                    var en = gzState.enemies[ei];
                    if (en.kind === "chopper" && !en.dead && Math.hypot(en.x - d.x, en.z - d.z) < 2.4 && Math.abs(en.y - d.y) < 2.2) {
                        damageEnemy(en, 45, "DEBRIS STRIKE!");
                        d.canHitChopper = false;
                    }
                }
            }
            if (d.mesh) {
                d.mesh.position.set(d.x, d.y, d.z);
                d.mesh.rotation.x += d.rx * dt;
                d.mesh.rotation.y += d.ry * dt;
            }
            if (d.life <= 0) {
                if (d.mesh && dynamicGroup) dynamicGroup.remove(d.mesh);
                gzState.debris.splice(di, 1);
            }
        }

        for (var swi = gzState.shockwaves.length - 1; swi >= 0; swi--) {
            var sw = gzState.shockwaves[swi];
            sw.life -= dt;
            var prog = 1 - Math.max(0, sw.life / sw.maxLife);
            if (sw.isHazard && !sw.resolved && gzState.mode === "playing") {
                var hm = gzState.monster;
                var curRad = 0.5 + prog * sw.maxRadius;
                var dM = Math.hypot(hm.x - sw.x, hm.z - sw.z);
                if (Math.abs(dM - curRad) < 1.9 && curRad > 2.2) {
                    sw.resolved = true;
                    if (hm.y > 0.75 || hm.tailAnim > 0) {
                        if (hm.tailAnim > 0) {
                            addRage(8);
                            spawnPopup(hm.x, 3.0, hm.z, "PARRY! +8 RAGE", "#38bdf8");
                            spawnBurst(hm.x, 1.3, hm.z, 0x38bdf8, 8, 10);
                        } else {
                            spawnPopup(hm.x, 3.0, hm.z, "LEAP DODGE!", "#4ade80");
                        }
                    } else {
                        damagePlayer(sw.dmg || 14);
                        spawnPopup(hm.x, 3.0, hm.z, "SHOCKWAVE -" + (sw.dmg || 14) + "!", "#f87171");
                    }
                }
            }
            if (sw.mesh) {
                sw.mesh.scale.setScalar(0.5 + prog * sw.maxRadius);
            }
            if (sw.mat) {
                sw.mat.opacity = Math.max(0, (1 - prog) * 0.9);
            }
            if (sw.life <= 0) {
                if (sw.mesh && dynamicGroup) dynamicGroup.remove(sw.mesh);
                if (sw.mat && typeof sw.mat.dispose === "function") sw.mat.dispose();
                gzState.shockwaves.splice(swi, 1);
            }
        }
    }

    // =========================================================================
    // --- HUD & 3D->Screen Floating Popup Projection ---
    // =========================================================================

    function updateHud() {
        var hpPct = Math.max(0, Math.min(100, Math.round((gzState.hp / gzState.maxHp) * 100)));
        if (hpFillEl) hpFillEl.style.width = hpPct + "%";
        if (hpValEl) hpValEl.textContent = Math.ceil(gzState.hp);
        if (hpWrapEl) hpWrapEl.classList.toggle("is-low", gzState.hp <= 30);

        var ragePct = Math.max(0, Math.min(100, Math.round(gzState.rage)));
        var rageReady = ragePct >= 40;
        if (rageFillEl) rageFillEl.style.width = ragePct + "%";
        if (rageValEl) rageValEl.textContent = rageReady ? "READY!" : (ragePct + "%");
        if (rageWrapEl) rageWrapEl.classList.toggle("is-ready", rageReady);

        if (scoreEl) scoreEl.textContent = gzState.score.toLocaleString();
        if (comboEl) comboEl.textContent = "\u00d7" + Math.max(1, gzState.combo);
        if (timeEl) timeEl.textContent = formatClock(gzState.elapsed);
        if (wreckedEl) {
            var wp = gzState.totalBuildings > 0 ? Math.round((gzState.buildingsWrecked / gzState.totalBuildings) * 100) : 0;
            wreckedEl.textContent = wp + "%";
        }

        if (missionStripEl) {
            missionStripEl.hidden = gzState.mode !== "playing";
            if (!missionStripEl.hidden) {
                if (districtTagEl && gzState.district) {
                    districtTagEl.textContent = gzState.district.name.toUpperCase();
                }
                if (vaultChipEl) {
                    var vDone = gzState.vaultsSmashed >= 3;
                    vaultChipEl.textContent = vDone ? "Shields Down!" : ("Vaults " + gzState.vaultsSmashed + "/3");
                    vaultChipEl.classList.toggle("is-done", vDone);
                }
                var bEls = [bountyChip0El, bountyChip1El];
                for (var bi = 0; bi < bEls.length; bi++) {
                    var bEl = bEls[bi];
                    var bty = gzState.bounties && gzState.bounties[bi];
                    if (bEl && bty) {
                        var curVal = Math.min(bty.target, bty.stat === "vaultsSmashed" ? gzState.vaultsSmashed : (gzState.stats[bty.stat] || 0));
                        bEl.textContent = bty.shortLabel + " " + curVal + "/" + bty.target;
                        bEl.classList.toggle("is-done", !!bty.done);
                    }
                }
            }
        }

        // Compass pointing from Monster to Bronny Mega Tower
        var m = gzState.monster;
        var dx = TOWER_X - m.x;
        var dz = TOWER_Z - m.z;
        var distM = Math.max(0, Math.round(Math.hypot(dx, dz)));
        if (distEl) distEl.textContent = distM + "m";
        if (compassEl) {
            var deg = Math.round((Math.atan2(dx, -dz) * 180) / Math.PI);
            compassEl.style.transform = "rotate(" + deg + "deg)";
        }

        if (alertStarsEl) {
            var stars = "";
            for (var s = 0; s < gzState.threatLevel; s++) stars += "\u2605";
            alertStarsEl.textContent = stars;
        }

        var mt = gzState.megaTower;
        if (bossBarEl && mt) {
            var showBoss = !mt.destroyed && (distM < 32 || mt.hp < mt.maxHp);
            bossBarEl.hidden = !showBoss;
            if (showBoss) {
                var sMult = getTowerShieldMult();
                var isShielded = sMult < 1.0;
                bossBarEl.classList.toggle("is-shielded", isShielded);
                if (bossTiersEl) {
                    if (isShielded) {
                        var sPct = Math.round((1 - sMult) * 100);
                        bossTiersEl.textContent = mt.tiersLeft + "/4 \u00b7 SHIELD " + sPct + "%";
                    } else {
                        bossTiersEl.textContent = mt.tiersLeft + "/4 Tiers";
                    }
                }
                if (bossFillEl) bossFillEl.style.width = Math.round((mt.hp / mt.maxHp) * 100) + "%";
            }
        }

        // Mobile button state cues
        if (btnRoarEl) btnRoarEl.classList.toggle("is-ready", rageReady);
        if (roarSubEl) roarSubEl.textContent = rageReady ? "FIRE!" : (ragePct + "%");
        if (btnTailEl) btnTailEl.classList.toggle("is-cooling", m.tailCd > 0);
        if (tailSubEl) tailSubEl.textContent = m.tailCd > 0 ? m.tailCd.toFixed(1) + "s" : "WHIP";
    }

    function updatePopupPositions(dt) {
        if (!viewportEl || gzState.popups.length === 0) return;
        var w = viewportEl.clientWidth || 640;
        var h = viewportEl.clientHeight || 520;
        var tmpV = useThree ? new THREE.Vector3() : null;

        for (var i = gzState.popups.length - 1; i >= 0; i--) {
            var p = gzState.popups[i];
            p.life -= dt;
            p.y += dt * 2.2;
            if (p.life <= 0) {
                if (p.el && p.el.parentNode) p.el.parentNode.removeChild(p.el);
                gzState.popups.splice(i, 1);
                continue;
            }
            var sx = w / 2;
            var sy = h / 2;
            if (useThree && threeCamera) {
                tmpV.set(p.x, p.y, p.z).project(threeCamera);
                sx = (tmpV.x * 0.5 + 0.5) * w;
                sy = (-tmpV.y * 0.5 + 0.5) * h;
            } else {
                var m = gzState.monster;
                var sc = Math.min(w, h) / 48;
                sx = w * 0.5 + (p.x - m.x) * sc;
                sy = h * 0.55 + (p.z - m.z) * sc * 0.85 - p.y * sc * 0.55;
            }
            p.el.style.left = sx.toFixed(1) + "px";
            p.el.style.top = sy.toFixed(1) + "px";
            p.el.style.opacity = Math.min(1, p.life * 1.8).toFixed(2);
        }
    }

    // =========================================================================
    // --- Dual Renderer (Three.js 3D Voxel + 2.5D Pixel Canvas Fallback) ---
    // =========================================================================

    function renderThreeScene() {
        var m = gzState.monster;
        var rig = monsterRig;
        if (!rig || !threeRenderer) return;

        var t = gzState.elapsed;

        // Move directional sun shadow frustum smoothly with Godzilla
        if (sunLight && sunTarget) {
            sunTarget.position.set(m.x, 0, m.z);
            sunTarget.updateMatrixWorld();
            sunLight.position.set(m.x + 26, 52, m.z + 28);
        }

        // Animate Kid's Voxel Monster Rig!
        var moving = Math.hypot(m.vx, m.vz) > 0.6;
        var walkPhase = moving ? gzState.stepAccum : t * 2.1;
        var stride = moving ? Math.sin(walkPhase) : 0;

        rig.root.position.set(m.x, m.y, m.z);
        rig.root.rotation.y = m.angle + (m.tailAnim > 0 ? (1 - m.tailAnim / 0.38) * Math.PI * 2 : 0);

        // Squash & stretch on stomp, chomp, and victory dance!
        var chompRatio = m.smashAnim > 0 ? Math.sin((m.smashAnim / 0.28) * Math.PI) : 0;
        var roarActive = m.roarTimer > 0;
        var rageFrac = Math.max(0, Math.min(1, gzState.rage / gzState.maxRage));

        rig.body.position.y = 13.5 * 0.135 + Math.abs(stride) * 0.14;
        rig.body.rotation.z = stride * 0.08;
        rig.body.rotation.x = chompRatio * 0.22 - (roarActive ? 0.18 : 0);

        if (rig.shadowDisc) {
            rig.shadowDisc.position.y = 0.03 - m.y;
            var shScale = Math.max(0.55, 1.0 - m.y * 0.08);
            rig.shadowDisc.scale.setScalar(shScale);
        }

        if (rig.dorsalMat) {
            rig.dorsalMat.emissiveIntensity = roarActive
                ? (1.75 + Math.sin(t * 28) * 0.45)
                : (0.55 + rageFrac * 0.95 + Math.sin(t * 4.5) * 0.12);
        }
        if (rig.dorsalLight) {
            rig.dorsalLight.intensity = roarActive ? 2.6 : (0.55 + rageFrac * 1.1);
        }

        // Articulated Lower Jaw Chomp vs Wide Atomic Ember Roar!
        if (roarActive) {
            rig.lowerJaw.rotation.x = 0.45 + Math.sin(t * 28) * 0.06;
            rig.throatGlowMat.opacity = 0.92;
            rig.throatGlowMesh.scale.setScalar(1.38 + Math.sin(t * 24) * 0.16);
            rig.faceLight.intensity = 3.4;
            rig.beamGroup.visible = true;
            rig.beamGroup.rotation.z = t * 10;
            rig.outerBeam.scale.set(1 + Math.sin(t * 32) * 0.11, 1 + Math.cos(t * 32) * 0.11, 1);
            if (rig.midBeam) {
                rig.midBeam.scale.set(1 + Math.cos(t * 30) * 0.14, 1 + Math.sin(t * 30) * 0.14, 1);
            }
            if (rig.plasmaTex) {
                rig.plasmaTex.offset.y -= 0.065;
            }
            if (rig.muzzleCore) {
                rig.muzzleCore.scale.setScalar(1.0 + Math.sin(t * 36) * 0.24);
            }
            if (rig.beamRings) {
                for (var bri = 0; bri < rig.beamRings.length; bri++) {
                    var br = rig.beamRings[bri];
                    var progRing = (t * 2.6 + br.offset) % 1;
                    br.mesh.position.z = 1.6 + progRing * 18.2;
                    br.mesh.scale.setScalar(0.55 + progRing * 1.45);
                    br.mat.opacity = (1 - progRing) * 0.85;
                }
            }
        } else if (chompRatio > 0.05) {
            rig.lowerJaw.rotation.x = -0.34 * chompRatio;
            rig.throatGlowMat.opacity = 0.24;
            rig.faceLight.intensity = 1.9;
            rig.beamGroup.visible = false;
        } else {
            rig.lowerJaw.rotation.x = 0.06 + Math.sin(t * 3.5) * 0.04;
            rig.throatGlowMat.opacity = 0.15 + rageFrac * 0.12;
            rig.faceLight.intensity = 1.3 + Math.sin(t * 7) * 0.25;
            rig.beamGroup.visible = false;
        }

        // Tiny Raised Upper Arms flailing & lunging
        rig.armL.rotation.x = 0.15 + chompRatio * 0.85 + Math.sin(walkPhase) * 0.25;
        rig.armR.rotation.x = 0.15 + chompRatio * 0.85 - Math.sin(walkPhase) * 0.25;
        rig.armL.rotation.z = -0.58 + Math.sin(t * 4) * 0.12;
        rig.armR.rotation.z = 0.58 - Math.sin(t * 4) * 0.12;

        // Chunky Alternating Stomp Legs
        rig.legL.rotation.x = stride * 0.45;
        rig.legR.rotation.x = -stride * 0.45;

        // Layered Voxel Dragon-Fin Tail Chain Wave!
        var tailAmp = m.tailAnim > 0 ? 0.55 : (moving ? 0.24 : 0.14);
        var tailSpd = m.tailAnim > 0 ? 22 : (moving ? 7 : 2.8);
        rig.tail1.rotation.y = 0.68 + Math.sin(t * tailSpd) * tailAmp;
        rig.tail2.rotation.y = 0.36 + Math.sin(t * tailSpd - 0.85) * tailAmp * 1.15;
        rig.tail3.rotation.y = 0.28 + Math.sin(t * tailSpd - 1.7) * tailAmp * 1.35;

        // Damage / overdrive roar tint on Monster (stays rich emerald during roar)
        rig.skinMat.emissive.setHex(m.hurtTimer > 0 ? 0x991b1b : (roarActive ? 0x0b3b1e : 0x000000));

        if (rig.bronnyRiderRig && rig.bronnyRiderRig.root.visible) {
            animateBronnyVoxelRig(rig.bronnyRiderRig, t, "cheer");
        }

        // Swirling Fiery Ember Sparks around Monster
        for (var ei = 0; ei < rig.embers.length; ei++) {
            var em = rig.embers[ei];
            var ang = em.ang + t * em.speed;
            var hMod = (em.yOff + t * 1.1) % 3.4;
            em.mesh.position.set(
                Math.cos(ang) * em.rad,
                0.35 + hMod,
                Math.sin(ang) * em.rad
            );
            em.mesh.rotation.y = t * 4;
        }

        // Animate Vaults, Buildings, Reactors, Sky Beacons, & Mega Tower
        for (var vi = 0; vi < gzState.vaults.length; vi++) {
            var vlt = gzState.vaults[vi];
            if (!vlt.destroyed && vlt.coreMesh) {
                vlt.coreMesh.rotation.y = t * 2.2 + vi;
                vlt.coreMesh.position.y = 2.45 + Math.sin(t * 3.8 + vi) * 0.24;
                if (vlt.baseCoreMat && sharedMat.hitFlash) {
                    var vCoreMat = vlt.flash > 0 ? sharedMat.hitFlash : vlt.baseCoreMat;
                    if (vlt.coreMesh.material !== vCoreMat) {
                        vlt.coreMesh.material = vCoreMat;
                    }
                }
                if (vlt.ringMesh) {
                    vlt.ringMesh.rotation.y = -t * 1.8 + vi;
                    vlt.ringMesh.rotation.z = Math.sin(t * 2 + vi) * 0.25;
                }
                if (vlt.mesh) {
                    vlt.mesh.position.x = vlt.x + (vlt.shake > 0 ? (Math.random() - 0.5) * 0.3 : 0);
                    vlt.mesh.position.z = vlt.z + (vlt.shake > 0 ? (Math.random() - 0.5) * 0.3 : 0);
                }
            }
        }
        for (var bi = 0; bi < gzState.buildings.length; bi++) {
            var b = gzState.buildings[bi];
            if (!b.destroyed && b.mesh) {
                if (b.shake > 0) {
                    b.mesh.position.x = b.x + (Math.random() - 0.5) * 0.38;
                    b.mesh.position.z = b.z + (Math.random() - 0.5) * 0.38;
                } else {
                    b.mesh.position.x = b.x;
                    b.mesh.position.z = b.z;
                }
            }
        }
        for (var ri = 0; ri < reactorRings.length; ri++) {
            reactorRings[ri].rotation.z = t * 1.8 + ri * 0.9;
        }
        for (var bti = 0; bti < beaconTips.length; bti++) {
            var bt = beaconTips[bti];
            var pulse = 0.5 + 0.5 * Math.sin(t * 4.5 + bt.phase);
            bt.mesh.scale.setScalar(0.28 + pulse * 0.26);
        }

        for (var mri = 0; mri < gzState.buildings.length; mri++) {
            var mb = gzState.buildings[mri];
            if (mb.meltdownRing && mb.meltdownTimer > 0 && !mb.meltdownDetonated) {
                var radVis = ((gzState.district && gzState.district.id === "reactor") ? 13.5 : 11.5) * 0.78;
                mb.meltdownRing.scale.setScalar(radVis * (0.9 + Math.sin(t * 28) * 0.1));
                if (mb.meltdownRingMat) {
                    mb.meltdownRingMat.opacity = 0.55 + Math.abs(Math.sin(t * 24)) * 0.38;
                    mb.meltdownRingMat.color.setHex((Math.floor(t * 14) % 2 === 0) ? 0xf97316 : 0x22d3ee);
                }
            }
        }

        var mt = gzState.megaTower;
        if (mt && !mt.destroyed && mt.group) {
            if (mt.shake > 0) {
                mt.group.position.x = mt.x + (Math.random() - 0.5) * 0.42;
                mt.group.position.z = mt.z + (Math.random() - 0.5) * 0.42;
            } else {
                mt.group.position.x = mt.x;
                mt.group.position.z = mt.z;
            }
            if (mt.tierMeshes && mt.baseBlockMat && sharedMat.hitFlash) {
                var mtMat = mt.flash > 0 ? sharedMat.hitFlash : mt.baseBlockMat;
                for (var mti = 0; mti < mt.tierMeshes.length; mti++) {
                    if (mt.tierMeshes[mti].block && mt.tierMeshes[mti].block.material !== mtMat) {
                        mt.tierMeshes[mti].block.material = mtMat;
                    }
                }
            }
            if (mt.bronnyRig) {
                var distPlayerTower = Math.hypot(m.x - mt.x, m.z - mt.z);
                var bronnyMode = mt.flinchTimer > 0 ? "flinch" : (distPlayerTower < 28 ? "wave" : "dribble");
                animateBronnyVoxelRig(mt.bronnyRig, t, bronnyMode, {
                    flinchFrac: Math.min(1, (mt.flinchTimer || 0) / 0.9)
                });
            }
            if (mt.shieldMesh && mt.shieldRing) {
                var tShieldMult = getTowerShieldMult();
                var isTShielded = tShieldMult < 1.0;
                mt.shieldMesh.visible = isTShielded;
                mt.shieldRing.visible = isTShielded;
                if (isTShielded) {
                    var crownY = mt.crownGroup ? mt.crownGroup.position.y : (mt.tiersLeft * 3.8);
                    mt.shieldMesh.position.y = crownY * 0.5 + 1.5;
                    mt.shieldMesh.scale.y = Math.max(0.45, (crownY + 4) / 22);
                    mt.shieldMesh.rotation.y = t * 0.4;
                    mt.shieldMesh.material.opacity = (mt.flash > 0 ? 0.46 : (0.14 + (1 - tShieldMult) * 0.18)) + Math.sin(t * 5) * 0.04;
                    mt.shieldRing.rotation.z = -t * 1.4;
                }
            }
            if (mt.warnRingMesh) {
                mt.warnRingMesh.visible = mt.pulseWindup > 0;
                if (mt.pulseWindup > 0) {
                    var pulseSc = 0.94 + Math.sin(t * 24) * 0.06;
                    mt.warnRingMesh.scale.setScalar(pulseSc);
                    mt.warnRingMesh.material.opacity = 0.45 + 0.4 * (1 - mt.pulseWindup);
                }
            }
            if (mt.turretMeshes) {
                var turretsOnline = mt.tiersLeft <= 3;
                var aimYaw = Math.atan2(m.x - mt.x, m.z - mt.z);
                for (var tmi = 0; tmi < mt.turretMeshes.length; tmi++) {
                    var tm = mt.turretMeshes[tmi];
                    tm.grp.visible = turretsOnline;
                    if (turretsOnline) {
                        tm.grp.rotation.y = aimYaw;
                        var isTele = mt.turretTelegraph > 0;
                        tm.barrelMat.emissive.setHex(isTele ? 0xef4444 : 0xca8a04);
                        tm.barrelMat.emissiveIntensity = isTele ? (1.6 + Math.sin(t * 32) * 0.6) : 0.45;
                    }
                }
            }
            if (mt.beaconMesh) {
                mt.beaconMesh.rotation.y = t * 1.2;
            }
            if (mt.searchLights) {
                for (var sli = 0; sli < mt.searchLights.length; sli++) {
                    var sl = mt.searchLights[sli];
                    sl.pivot.rotation.x = Math.sin(t * 1.35 + sl.side * 1.4) * 0.34;
                    sl.pivot.rotation.z = sl.side * (0.22 + Math.cos(t * 0.95) * 0.16);
                }
            }
        }

        // Camera framing: Idle showcases Monster facing 3/4 toward camera; Playing tracks action!
        var shakeAmt = gzState.trauma * gzState.trauma * 0.95;
        var sx = (Math.random() - 0.5) * shakeAmt;
        var sy = (Math.random() - 0.5) * shakeAmt;

        if (gzState.mode === "idle") {
            if (Math.abs(threeCamera.fov - 46) > 0.05) {
                threeCamera.fov = 46;
                threeCamera.updateProjectionMatrix();
            }
            var orbit = 0.34 + Math.sin(t * 0.45) * 0.48;
            threeCamera.position.set(
                m.x + Math.sin(orbit) * 6.9,
                4.1,
                m.z + Math.cos(orbit) * 6.9
            );
            threeCamera.lookAt(m.x, 1.7, m.z);
        } else if (gzState.mode === "victory_anim") {
            if (Math.abs(threeCamera.fov - 46) > 0.05) {
                threeCamera.fov = 46;
                threeCamera.updateProjectionMatrix();
            }
            threeCamera.position.set(m.x + 3.6 + sx, 5.4 + sy, m.z + 7.6);
            threeCamera.lookAt(m.x, 2.35, m.z);
        } else {
            var cCam = gzState.cam;
            if (cCam && Math.abs(threeCamera.fov - cCam.fov) > 0.05) {
                threeCamera.fov = cCam.fov;
                threeCamera.updateProjectionMatrix();
            }
            threeCamera.position.set(m.x + cCam.offX + sx, cCam.offY + sy, m.z + cCam.offZ);
            threeCamera.lookAt(m.x + cCam.lookX, cCam.lookY, m.z + cCam.lookZ);
        }

        // Keep sky moon gently oriented toward camera
        if (skyMoon) skyMoon.lookAt(threeCamera.position);
        if (skyMoonGlow) skyMoonGlow.lookAt(threeCamera.position);

        // Fade all meshes of buildings sitting between Camera and Godzilla so monster stays visible
        var camRayX = threeCamera.position.x - m.x;
        var camRayZ = threeCamera.position.z - m.z;
        var camRayLen = Math.hypot(camRayX, camRayZ) || 1;
        var camDirX = camRayX / camRayLen;
        var camDirZ = camRayZ / camRayLen;

        for (var oi = 0; oi < gzState.buildings.length; oi++) {
            var ob = gzState.buildings[oi];
            var mats = ob.fadeMats && ob.fadeMats.length > 0
                ? ob.fadeMats
                : (ob.bodyMesh && ob.bodyMesh.material ? [ob.bodyMesh.material] : []);
            if (mats.length === 0) continue;
            var occludes = false;
            if (!ob.destroyed && gzState.mode === "playing" && ob.h > 3.5) {
                var rbx = ob.x - m.x;
                var rbz = ob.z - m.z;
                var proj = rbx * camDirX + rbz * camDirZ;
                if (proj > 0.8 && proj < camRayLen - 0.5) {
                    var perp = Math.abs(rbx * camDirZ - rbz * camDirX);
                    if (perp < ob.w * 0.68 + 2.6) {
                        occludes = true;
                    }
                }
            }
            if (!!mats[0].transparent !== occludes) {
                for (var mi = 0; mi < mats.length; mi++) {
                    mats[mi].transparent = occludes;
                    mats[mi].opacity = occludes ? 0.22 : 1.0;
                    mats[mi].needsUpdate = true;
                }
            }
            if (ob.bodyMesh && ob.baseBodyMat && sharedMat.hitFlash) {
                var useFlash = !occludes && !ob.destroyed && ob.flash > 0;
                var desiredMat = useFlash ? sharedMat.hitFlash : ob.baseBodyMat;
                if (ob.bodyMesh.material !== desiredMat) {
                    ob.bodyMesh.material = desiredMat;
                }
            }
        }

        threeRenderer.render(threeScene, threeCamera);
    }

    function renderFallback2D() {
        if (!fallbackCtx || !canvasEl) return;
        var ctx = fallbackCtx;
        var w = canvasEl.width;
        var h = canvasEl.height;
        var m = gzState.monster;
        var t = gzState.elapsed;

        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = (gzState.district && gzState.district.canvasBg) ? gzState.district.canvasBg : "#0e1526";
        ctx.fillRect(0, 0, w, h);

        var cCam2d = gzState.cam || { lookX: -0.3, lookZ: -1.2, zoom2d: 1.0 };
        var scale = (Math.min(w, h) / 46) / (cCam2d.zoom2d || 1.0);
        var shakeX = (Math.random() - 0.5) * gzState.trauma * 16;
        var shakeY = (Math.random() - 0.5) * gzState.trauma * 16;
        var camFocusX = m.x + (cCam2d.lookX + 0.3);
        var camFocusZ = m.z + (cCam2d.lookZ + 1.2);

        ctx.save();
        ctx.translate(w * 0.5 + shakeX, h * 0.56 + shakeY);

        function wx(x) { return (x - camFocusX) * scale; }
        function wz(z) { return (z - camFocusZ) * scale * 0.85; }

        // Sidewalk pads
        ctx.fillStyle = "#1f2738";
        for (var bpx = -36; bpx <= 36; bpx += 24) {
            for (var bpz = -60; bpz <= 36; bpz += 24) {
                ctx.fillRect(wx(bpx - 8.2), wz(bpz - 8.2), 16.4 * scale, 16.4 * scale * 0.85);
            }
        }

        // Road grid + yellow dashed lines
        ctx.fillStyle = "#111724";
        var avenues = [-48, -24, 0, 24, 48];
        for (var ai = 0; ai < avenues.length; ai++) {
            var a = avenues[ai];
            ctx.fillRect(wx(a - 3.6), wz(-CITY_HALF - 10), 7.2 * scale, CITY_HALF * 2 * scale * 0.85);
            ctx.fillRect(wx(-CITY_HALF), wz(a - 15.6), CITY_HALF * 2 * scale, 7.2 * scale * 0.85);
        }
        ctx.fillStyle = "#eab308";
        for (var ai2 = 0; ai2 < avenues.length; ai2++) {
            var av = avenues[ai2];
            for (var d = -56; d <= 44; d += 6) {
                ctx.fillRect(wx(av) - 1.5, wz(d) - scale * 0.8, 3, scale * 1.4);
                if (d >= -48 && d <= 48) {
                    ctx.fillRect(wx(d) - scale * 0.8, wz(av - 12) - 1.5, scale * 1.6, 3);
                }
            }
        }

        // Seawall caution border
        ctx.strokeStyle = "#facc15";
        ctx.lineWidth = Math.max(2, scale * 0.25);
        ctx.strokeRect(wx(-CITY_HALF), wz(-CITY_HALF - 10), CITY_HALF * 2 * scale, CITY_HALF * 2 * scale * 0.85);

        // Lakers Plaza rings
        ctx.fillStyle = "#4c1d95";
        ctx.beginPath();
        ctx.arc(wx(TOWER_X), wz(TOWER_Z), 8.6 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#eab308";
        ctx.beginPath();
        ctx.arc(wx(TOWER_X), wz(TOWER_Z), 6.2 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#3b0764";
        ctx.beginPath();
        ctx.arc(wx(TOWER_X), wz(TOWER_Z), 4.2 * scale, 0, Math.PI * 2);
        ctx.fill();

        // Ground rubble & scorch craters from demolished buildings
        for (var ri = 0; ri < gzState.rubble.length; ri++) {
            var rb = gzState.rubble[ri];
            ctx.fillStyle = "rgba(5, 8, 16, 0.72)";
            ctx.beginPath();
            ctx.arc(wx(rb.x), wz(rb.z), scale * rb.w * 0.65, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#475569";
            ctx.fillRect(wx(rb.x) - scale * 1.1, wz(rb.z) - scale * 0.6, scale * 1.0, scale * 0.6);
            ctx.fillRect(wx(rb.x) + scale * 0.2, wz(rb.z) - scale * 0.2, scale * 0.9, scale * 0.7);
        }

        // Reactor Meltdown Warning Rings + Shockwaves
        for (var mbi = 0; mbi < gzState.buildings.length; mbi++) {
            var mb = gzState.buildings[mbi];
            if (mb.meltdownTimer > 0 && !mb.meltdownDetonated) {
                var mRad = (((gzState.district && gzState.district.id === "reactor") ? 13.5 : 11.5) * 0.78) * scale;
                var blink = Math.floor(t * 14) % 2 === 0;
                ctx.fillStyle = blink ? "rgba(249, 115, 22, 0.18)" : "rgba(34, 211, 238, 0.18)";
                ctx.beginPath();
                ctx.ellipse(wx(mb.x), wz(mb.z), mRad, mRad * 0.85, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = blink ? "#f97316" : "#22d3ee";
                ctx.lineWidth = Math.max(2, scale * 0.25);
                ctx.stroke();
            }
        }
        var mtWarn = gzState.megaTower;
        if (mtWarn && !mtWarn.destroyed && mtWarn.pulseWindup > 0) {
            var wRad = 18.8 * scale * (0.94 + Math.sin(t * 24) * 0.05);
            ctx.strokeStyle = "rgba(249, 115, 22, 0.85)";
            ctx.lineWidth = Math.max(3, scale * 0.35);
            ctx.beginPath();
            ctx.ellipse(wx(mtWarn.x), wz(mtWarn.z), wRad, wRad * 0.85, 0, 0, Math.PI * 2);
            ctx.stroke();
        }
        for (var swi = 0; swi < gzState.shockwaves.length; swi++) {
            var sw = gzState.shockwaves[swi];
            var prog = 1 - Math.max(0, sw.life / sw.maxLife);
            var rad = (0.5 + prog * sw.maxRadius) * scale;
            ctx.strokeStyle = sw.color === 0x22d3ee ? "rgba(34,211,238," + (1 - prog) + ")"
                : (sw.color === 0xfacc15 ? "rgba(250,204,21," + (1 - prog) + ")" : "rgba(249,115,22," + (1 - prog) + ")");
            ctx.lineWidth = Math.max(2, scale * 0.24);
            ctx.beginPath();
            ctx.ellipse(wx(sw.x), wz(sw.z), rad, rad * 0.85, 0, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Street Props (trees, detailed cars/buses, streetlamps)
        for (var pri = 0; pri < gzState.props.length; pri++) {
            var p = gzState.props[pri];
            if (p.destroyed) continue;
            var px = wx(p.x);
            var pz = wz(p.z);
            if (p.kind === "tree") {
                ctx.fillStyle = "#78350f";
                ctx.fillRect(px - scale * 0.25, pz - scale * 0.2, scale * 0.5, scale * 0.7);
                ctx.fillStyle = "#15803d";
                ctx.beginPath();
                ctx.arc(px, pz - scale * 0.75, scale * 1.05, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = "#22c55e";
                ctx.beginPath();
                ctx.arc(px - scale * 0.2, pz - scale * 1.15, scale * 0.7, 0, Math.PI * 2);
                ctx.fill();
            } else if (p.kind === "lamp") {
                ctx.fillStyle = "rgba(254, 240, 138, 0.16)";
                ctx.beginPath();
                ctx.arc(px, pz, scale * 1.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = "#64748b";
                ctx.fillRect(px - scale * 0.12, pz - scale * 1.5, scale * 0.24, scale * 1.5);
                ctx.fillStyle = "#fef08a";
                ctx.fillRect(px - scale * 0.24, pz - scale * 1.65, scale * 0.48, scale * 0.24);
            } else {
                var isBus = p.kind === "bus";
                var vLen = scale * (isBus ? 2.2 : 1.5);
                var vWid = scale * 1.2;
                ctx.fillStyle = isBus ? "#facc15" : "#3b82f6";
                if (p.horiz) {
                    ctx.fillRect(px - vLen * 0.5, pz - vWid * 0.5, vLen, vWid);
                    ctx.fillStyle = "#7dd3fc";
                    ctx.fillRect(px - vLen * 0.15, pz - vWid * 0.36, vLen * 0.32, vWid * 0.72);
                } else {
                    ctx.fillRect(px - vWid * 0.5, pz - vLen * 0.5, vWid, vLen);
                    ctx.fillStyle = "#7dd3fc";
                    ctx.fillRect(px - vWid * 0.38, pz - vLen * 0.3, vWid * 0.76, vLen * 0.3);
                }
            }
        }

        // Golden Vaults & Layered Heal Burgers
        for (var vi = 0; vi < gzState.vaults.length; vi++) {
            var vlt = gzState.vaults[vi];
            if (vlt.destroyed) continue;
            ctx.fillStyle = "rgba(250, 204, 21, 0.26)";
            ctx.beginPath();
            ctx.arc(wx(vlt.x), wz(vlt.z), scale * 2.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = vlt.flash > 0 ? "#fef9c3" : "#581c87";
            ctx.fillRect(wx(vlt.x) - scale * 1.5, wz(vlt.z) - scale * 1.1, scale * 3.0, scale * 2.2);
            ctx.fillStyle = "#facc15";
            ctx.fillRect(wx(vlt.x) - scale * 1.5, wz(vlt.z) - scale * 1.35, scale * 3.0, scale * 0.3);
            ctx.fillStyle = vlt.flash > 0 ? "#ffffff" : "#fef08a";
            var bobV = Math.abs(Math.sin(t * 4 + vi)) * scale * 0.45;
            ctx.fillRect(wx(vlt.x) - scale * 0.85, wz(vlt.z) - scale * 1.9 - bobV, scale * 1.7, scale * 1.5);
        }
        for (var pki = 0; pki < gzState.pickups.length; pki++) {
            var pk = gzState.pickups[pki];
            var bxP = wx(pk.x);
            var bzP = wz(pk.z);
            ctx.fillStyle = pk.isSuper ? "rgba(250, 204, 21, 0.42)" : "rgba(34, 197, 94, 0.34)";
            ctx.beginPath();
            ctx.arc(bxP, bzP, scale * (pk.isSuper ? 1.5 : 1.1), 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#f59e0b";
            ctx.fillRect(bxP - scale * 0.52, bzP - scale * 0.45, scale * 1.04, scale * 0.32);
            ctx.fillStyle = "#4ade80";
            ctx.fillRect(bxP - scale * 0.56, bzP - scale * 0.14, scale * 1.12, scale * 0.12);
            ctx.fillStyle = "#78350f";
            ctx.fillRect(bxP - scale * 0.54, bzP - scale * 0.02, scale * 1.08, scale * 0.24);
            ctx.fillStyle = "#f59e0b";
            ctx.fillRect(bxP - scale * 0.52, bzP + scale * 0.2, scale * 1.04, scale * 0.24);
        }

        // Depth-sorted Buildings, Mega Tower, & Godzilla
        var drawList = [];
        for (var bi = 0; bi < gzState.buildings.length; bi++) {
            var b = gzState.buildings[bi];
            if (!b.destroyed || b.collapseAnim > 0) drawList.push({ type: "b", z: b.z, obj: b });
        }
        if (gzState.megaTower && !gzState.megaTower.destroyed) {
            drawList.push({ type: "mt", z: gzState.megaTower.z, obj: gzState.megaTower });
        }
        drawList.push({ type: "m", z: m.z, obj: m });
        drawList.sort(function (a, b) { return a.z - b.z; });

        for (var di = 0; di < drawList.length; di++) {
            var item = drawList[di];
            if (item.type === "b") {
                var bld = item.obj;
                var pCollapse = bld.destroyed && bld.collapseAnim > 0 ? (1 - bld.collapseAnim / 0.58) : 0;
                var fallEase2d = pCollapse * pCollapse;
                var bx = wx(bld.x - bld.w * 0.5) + (bld.collapseTiltX || 0) * fallEase2d * scale * 2.2;
                var bz = wz(bld.z - bld.d * 0.5) + fallEase2d * scale * 0.6;
                var bw = bld.w * scale;
                var bd = bld.d * scale * 0.85;
                var bh = bld.h * scale * 0.55 * (1 - fallEase2d * 0.88);
                var isFlashing = bld.flash > 0 && !bld.destroyed;
                var facadeCol = isFlashing ? "#fffbeb" : (bld.kind === "diner" ? "#0d9488" : (bld.kind === "brick" ? "#9a3412" : (bld.kind === "reactor" ? "#0e7490" : "#1e293b")));
                var roofCol = isFlashing ? "#fef08a" : (bld.kind === "reactor" ? "#22d3ee" : (bld.kind === "diner" ? "#f43f5e" : (bld.kind === "brick" ? "#7c2d12" : "#334155")));

                ctx.fillStyle = facadeCol;
                ctx.fillRect(bx, bz - bh, bw, bh + bd);
                ctx.fillStyle = roofCol;
                ctx.fillRect(bx, bz - bh, bw, bd);

                // Pixel window rows
                ctx.fillStyle = isFlashing ? "#ffffff" : (bld.kind === "glass" ? "#7dd3fc" : (bld.kind === "reactor" ? "#67e8f9" : "#fef08a"));
                for (var wy = bz - bh + bd + 4; wy < bz + bd - 6; wy += Math.max(5, Math.floor(scale * 0.65))) {
                    for (var wxP = bx + 4; wxP < bx + bw - 6; wxP += Math.max(5, Math.floor(scale * 0.65))) {
                        if (((wxP + wy) | 0) % 3 !== 0) {
                            ctx.fillRect(wxP, wy, Math.max(3, scale * 0.35), Math.max(3, scale * 0.38));
                        }
                    }
                }
                var bbAccent = BILLBOARD_ACCENTS[(bld.billboardIdx || 0) % BILLBOARD_ACCENTS.length];
                if (bld.kind === "diner") {
                    ctx.fillStyle = bbAccent;
                    ctx.fillRect(bx + bw * 0.12, bz - bh - scale * 0.45, bw * 0.76, scale * 0.5);
                } else if (bld.kind === "glass") {
                    ctx.fillStyle = "#ef4444";
                    ctx.fillRect(bx + bw * 0.47, bz - bh - scale * 0.8, Math.max(2, scale * 0.14), scale * 0.8);
                    if (bld.hasBillboard) {
                        ctx.fillStyle = bbAccent;
                        ctx.fillRect(bx + bw * 0.18, bz - bh + bd * 0.5, bw * 0.64, scale * 0.36);
                    }
                } else if (bld.kind === "brick") {
                    ctx.fillStyle = "#92400e";
                    ctx.fillRect(bx + bw * 0.6, bz - bh - scale * 0.55, scale * 0.7, scale * 0.55);
                    if (bld.hasBillboard) {
                        ctx.fillStyle = bbAccent;
                        ctx.fillRect(bx + bw * 0.14, bz - bh - scale * 0.4, bw * 0.58, scale * 0.34);
                    }
                }
                if (bld.hp <= bld.maxHp * 0.5) {
                    ctx.strokeStyle = "#f97316";
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(bx + bw * 0.2, bz - bh + bd);
                    ctx.lineTo(bx + bw * 0.55, bz);
                    ctx.lineTo(bx + bw * 0.75, bz + bd * 0.8);
                    ctx.stroke();
                }
            } else if (item.type === "mt") {
                var mt = item.obj;
                var mx = wx(mt.x - mt.w * 0.5);
                var mz = wz(mt.z - mt.d * 0.5);
                var mw = mt.w * scale;
                var md = mt.d * scale * 0.85;
                var mh = mt.tiersLeft * 3.8 * scale * 0.55;
                ctx.fillStyle = mt.flash > 0 ? "#fffbeb" : "#581c87";
                ctx.fillRect(mx, mz - mh, mw, mh + md);
                ctx.fillStyle = mt.flash > 0 ? "#fef9c3" : "#facc15";
                ctx.fillRect(mx, mz - mh, mw, md);
                for (var tierY = mz - mh + md; tierY < mz + md - 4; tierY += Math.max(6, scale * 0.75)) {
                    ctx.fillRect(mx, tierY, mw, 2);
                }
                if (mt.tiersLeft <= 3) {
                    ctx.fillStyle = mt.turretTelegraph > 0 ? "#ef4444" : "#facc15";
                    ctx.fillRect(mx - scale * 0.4, mz - mh - scale * 0.6, scale * 1.1, scale * 0.8);
                    ctx.fillRect(mx + mw - scale * 0.7, mz - mh - scale * 0.6, scale * 1.1, scale * 0.8);
                }
                if (getTowerShieldMult() < 1.0) {
                    ctx.strokeStyle = mt.flash > 0 ? "#e879f9" : "rgba(168, 85, 247, 0.85)";
                    ctx.fillStyle = "rgba(168, 85, 247, 0.22)";
                    ctx.lineWidth = Math.max(2, scale * 0.22);
                    ctx.beginPath();
                    ctx.ellipse(wx(mt.x), wz(mt.z) - mh * 0.45, mw * 0.8, mh * 0.75 + scale * 1.6, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                }
                var dist2d = Math.hypot(m.x - mt.x, m.z - mt.z);
                var spImg = mt.flinchTimer > 0
                    ? bronnyWaveCanvas
                    : (dist2d < 28
                        ? (Math.floor(t * 4) % 2 === 0 ? bronnyWaveCanvas : bronnyCheerCanvas)
                        : (Math.floor(t * 4) % 2 === 0 ? bronnyIdleCanvas : bronnyDribbleCanvas));
                var flinchJit = mt.flinchTimer > 0 ? Math.sin(t * 28) * 3 : 0;
                ctx.drawImage(spImg, 0, 0, spImg.width, spImg.height, wx(mt.x) - scale * 1.4 + flinchJit, mz - mh - scale * 3.4, scale * 2.8, scale * 4.0);
            } else {
                // Draw Kid's Voxel Monster in 2D Fallback!
                drawPixelGodzilla2D(ctx, wx(m.x), wz(m.z) - m.y * scale * 0.5, scale * 0.24, {
                    time: t,
                    step: gzState.stepAccum,
                    chomp: m.smashAnim > 0 ? 1 : 0,
                    roar: m.roarTimer > 0 ? 1 : 0,
                    hurt: m.hurtTimer > 0,
                    tailSwing: m.tailAnim > 0 ? Math.sin(t * 20) : 0
                });
                if (gzState.mode === "victory_anim" || (gzState.mode === "gameover" && gzState.outcome === "win")) {
                    var riderHop = Math.abs(Math.sin(t * 7)) * scale * 0.35;
                    ctx.drawImage(bronnyCheerCanvas, 0, 0, bronnyCheerCanvas.width, bronnyCheerCanvas.height, wx(m.x) - scale * 1.0, wz(m.z) - scale * 4.8 - riderHop, scale * 2.0, scale * 2.8);
                }
                if (m.roarTimer > 0) {
                    ctx.save();
                    ctx.translate(wx(m.x), wz(m.z));
                    ctx.rotate(Math.atan2(Math.cos(m.angle) * 0.85, Math.sin(m.angle)));
                    ctx.fillStyle = "rgba(249, 115, 22, 0.52)";
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(18 * scale, -2.8 * scale);
                    ctx.lineTo(18 * scale, 2.8 * scale);
                    ctx.closePath();
                    ctx.fill();
                    ctx.fillStyle = "rgba(254, 240, 138, 0.72)";
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(17 * scale, -1.2 * scale);
                    ctx.lineTo(17 * scale, 1.2 * scale);
                    ctx.closePath();
                    ctx.fill();
                    ctx.restore();
                }
            }
        }

        // Enemies, Debris, Particles, & Projectiles
        for (var ei = 0; ei < gzState.enemies.length; ei++) {
            var e = gzState.enemies[ei];
            var ex = wx(e.x);
            var ez = wz(e.z) - e.y * scale * 0.55;
            if (e.kind === "chopper") {
                ctx.fillStyle = e.isAce ? "rgba(250, 204, 21, 0.28)" : "rgba(254, 249, 195, 0.2)";
                ctx.beginPath();
                ctx.arc(wx(e.x), wz(e.z), scale * (e.isAce ? 2.1 : 1.7), 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = e.isAce ? "#312e81" : "#365314";
                ctx.fillRect(ex - scale * (e.isAce ? 1.3 : 1.05), ez - scale * 0.52, scale * (e.isAce ? 2.6 : 2.1), scale * 1.04);
                ctx.fillStyle = e.isAce ? "#f97316" : "#38bdf8";
                ctx.fillRect(ex + scale * 0.4, ez - scale * 0.35, scale * 0.55, scale * 0.5);
                ctx.fillStyle = e.isAce ? "#facc15" : "#e2e8f0";
                ctx.fillRect(ex - scale * (e.isAce ? 2.1 : 1.8), ez - scale * 0.14, scale * (e.isAce ? 4.2 : 3.6), scale * 0.26);
            } else if (e.kind === "tank") {
                var tSc = e.isBoss ? 1.38 : 1.0;
                ctx.fillStyle = e.isBoss ? "#7f1d1d" : "#1e293b";
                ctx.fillRect(ex - scale * 1.05 * tSc, ez - scale * 0.72 * tSc, scale * 2.1 * tSc, scale * 1.44 * tSc);
                ctx.fillStyle = e.isBoss ? "#dc2626" : "#4d7c0f";
                ctx.fillRect(ex - scale * 0.85 * tSc, ez - scale * 0.55 * tSc, scale * 1.7 * tSc, scale * 1.1 * tSc);
                ctx.fillStyle = e.isBoss ? "#facc15" : "#65a30d";
                ctx.fillRect(ex - scale * 0.45 * tSc, ez - scale * 0.35 * tSc, scale * 0.9 * tSc, scale * 0.7 * tSc);
                if (e.isBoss) {
                    ctx.fillStyle = "#f8fafc";
                    var bDirX = Math.sin(e.angle);
                    var bDirZ = Math.cos(e.angle) * 0.85;
                    ctx.fillRect(ex + bDirX * scale * 1.1 - 3, ez + bDirZ * scale * 1.1 - 3, 6, 6);
                }
            } else {
                ctx.fillStyle = "#1e3a8a";
                ctx.fillRect(ex - scale * 0.85, ez - scale * 0.55, scale * 1.7, scale * 1.1);
                ctx.fillStyle = "#f8fafc";
                ctx.fillRect(ex - scale * 0.55, ez - scale * 0.35, scale * 1.1, scale * 0.6);
                var sp2 = Math.floor(t * 9) % 2 === 0;
                ctx.fillStyle = sp2 ? "#ef4444" : "#38bdf8";
                ctx.fillRect(ex - scale * 0.2, ez - scale * 0.5, scale * 0.4, scale * 0.22);
            }
        }

        for (var dbi = 0; dbi < gzState.debris.length; dbi++) {
            var db = gzState.debris[dbi];
            ctx.fillStyle = "#64748b";
            ctx.fillRect(wx(db.x) - 3, wz(db.z) - db.y * scale * 0.45 - 3, 6, 6);
        }

        for (var pti = 0; pti < gzState.particles.length; pti++) {
            var pt = gzState.particles[pti];
            var ppx = wx(pt.x);
            var ppz = wz(pt.z) - pt.y * scale * 0.4;
            if (pt.isSmoke) {
                var pAlpha = Math.max(0.08, Math.min(0.52, (pt.life / (pt.maxLife || 1)) * 0.52));
                ctx.fillStyle = "rgba(148, 163, 184, " + pAlpha.toFixed(2) + ")";
                var pRad = Math.max(3, pt.size * scale * 0.48);
                ctx.beginPath();
                ctx.arc(ppx, ppz, pRad, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.fillStyle = "#f97316";
                ctx.fillRect(ppx - 2, ppz - 2, 5, 5);
            }
        }

        for (var pi = 0; pi < gzState.projectiles.length; pi++) {
            var pr = gzState.projectiles[pi];
            if (pr.kind === "towerBolt") {
                var px2 = wx(pr.x);
                var pz2 = wz(pr.z) - pr.y * scale * 0.55;
                ctx.fillStyle = "#a855f7";
                ctx.fillRect(px2 - 5, pz2 - 5, 10, 10);
                ctx.fillStyle = "#facc15";
                ctx.fillRect(px2 - 2, pz2 - 2, 5, 5);
            } else {
                ctx.fillStyle = pr.kind === "missile" ? "#ef4444" : (pr.kind === "shell" ? "#f97316" : "#fef08a");
                ctx.fillRect(wx(pr.x) - 3, wz(pr.z) - pr.y * scale * 0.55 - 3, 7, 7);
            }
        }

        ctx.restore();
    }

    function gzLoop(now) {
        if (!gzState.active && gzState.mode !== "playing") {
            gzState.animFrame = null;
            return;
        }
        var dt = (now - (gzState.lastTime || now)) / 1000;
        gzState.lastTime = now;

        updateSimulation(dt);
        if (useThree) {
            renderThreeScene();
        } else {
            renderFallback2D();
        }
        updatePopupPositions(dt);

        gzState.animFrame = requestAnimationFrame(gzLoop);
    }

    // =========================================================================
    // --- Lifecycle, Resize, & Input Wiring ---
    // =========================================================================

    function gzResize() {
        if (!viewportEl || !canvasEl) return;
        var w = Math.max(viewportEl.clientWidth || 640, 280);
        var h = Math.max(viewportEl.clientHeight || 520, 320);

        if (useThree && threeRenderer && threeCamera) {
            threeRenderer.setSize(w, h, false);
            threeCamera.aspect = w / h;
            threeCamera.updateProjectionMatrix();
        } else if (fallbackCtx) {
            var dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvasEl.width = Math.floor(w * dpr);
            canvasEl.height = Math.floor(h * dpr);
        }
    }

    function drawFromShuffleBag(len, bag, lastIdx) {
        if (len <= 1) return 0;
        if (bag.length === 0) {
            for (var i = 0; i < len; i++) bag.push(i);
            for (var j = bag.length - 1; j > 0; j--) {
                var k = Math.floor(Math.random() * (j + 1));
                var tmp = bag[j];
                bag[j] = bag[k];
                bag[k] = tmp;
            }
            if (bag[0] === lastIdx && bag.length > 1) {
                var swapIdx = 1 + Math.floor(Math.random() * (bag.length - 1));
                var t = bag[0];
                bag[0] = bag[swapIdx];
                bag[swapIdx] = t;
            }
        }
        return bag.shift();
    }

    function gzStartGame() {
        var dIdx = drawFromShuffleBag(CITY_DISTRICTS.length, districtBag, lastDistrictIdx);
        var aIdx = drawFromShuffleBag(CITY_ARENAS.length, arenaBag, lastArenaIdx);
        lastDistrictIdx = dIdx;
        lastArenaIdx = aIdx;

        gzState.district = CITY_DISTRICTS[dIdx];
        gzState.arena = CITY_ARENAS[aIdx];
        gzState.citySeed = ((Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0) || 1337;
        TOWER_X = gzState.arena.towerX;
        TOWER_Z = gzState.arena.towerZ;

        gzState.gameId++;
        gzState.submitted = false;
        gzState.mode = "playing";
        gzState.outcome = null;
        gzState.score = 0;
        gzState.destructionScore = 0;
        gzState.bountyScore = 0;
        gzState.rescueBonus = 0;
        gzState.timeBonus = 0;
        gzState.healthBonus = 0;
        gzState.styleRank = "C";
        gzState.combo = 0;
        gzState.maxCombo = 0;
        gzState.comboTimer = 0;
        gzState.buildingsWrecked = 0;
        gzState.vaultsSmashed = 0;
        gzState.unitsSmashed = 0;
        gzState.hp = 100;
        gzState.rage = 50;
        gzState.threatLevel = 1;
        gzState.wave3Triggered = false;
        gzState.wave5Triggered = false;
        gzState.elapsed = 0;
        gzState.trauma = 0;
        gzState.hitstop = 0;
        gzState.spawnTimer = 1.6;
        gzState.chopperTimer = 3.2;
        gzState.aceTimer = 11.0;
        gzState.aceTowerReinforced = false;
        gzState.frenzySurgeHit = false;
        gzState.vaultThreatBoost = 0;
        gzState.shieldHintCd = 0;
        gzState.cam.offX = 6.8;
        gzState.cam.offY = 16.5;
        gzState.cam.offZ = 13.8;
        gzState.cam.lookX = -0.3;
        gzState.cam.lookY = 1.5;
        gzState.cam.lookZ = -1.2;
        gzState.cam.fov = 46;
        gzState.cam.zoom2d = 1.0;
        gzState.stats.choppersDown = 0;
        gzState.stats.reactorsWrecked = 0;
        gzState.stats.glassWrecked = 0;
        gzState.stats.tanksDown = 0;
        gzState.stats.vaultsSmashed = 0;
        gzState.stats.frenzyReached = 0;

        gzState.monster.x = gzState.arena.spawnX;
        gzState.monster.y = 0;
        gzState.monster.z = gzState.arena.spawnZ;
        gzState.monster.vx = 0;
        gzState.monster.vz = 0;
        gzState.monster.vy = 0;
        gzState.monster.angle = gzState.arena.spawnAngle;
        gzState.monster.targetAngle = gzState.arena.spawnAngle;
        gzState.monster.smashCd = 0;
        gzState.monster.smashAnim = 0;
        gzState.monster.tailCd = 0;
        gzState.monster.tailAnim = 0;
        gzState.monster.roarTimer = 0;
        gzState.monster.hurtTimer = 0;

        gzInitGraphics(true);

        if (monsterRig) {
            if (monsterRig.bronnyRiderRig) monsterRig.bronnyRiderRig.root.visible = false;
            monsterRig.beamGroup.visible = false;
        }

        gzClearInput();
        buildCityWorld();

        if (startOverlay) startOverlay.hidden = true;
        if (overOverlay) overOverlay.hidden = true;
        if (popBannerEl) popBannerEl.hidden = true;
        if (bossBarEl) {
            bossBarEl.hidden = true;
            bossBarEl.classList.remove("is-shielded");
        }
        showBanner(gzState.district.name.toUpperCase() + " \u00b7 " + gzState.arena.name.toUpperCase());

        try {
            if (stageEl && stageEl.scrollIntoView) {
                stageEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }
        } catch (e) {}

        updateHud();
        gzResume();
    }

    function gzPause() {
        if (gzState.animFrame) {
            cancelAnimationFrame(gzState.animFrame);
            gzState.animFrame = null;
        }
        gzClearInput();
    }

    function gzResume() {
        if (gzState.active && !gzState.animFrame) {
            gzState.lastTime = performance.now();
            gzState.animFrame = requestAnimationFrame(gzLoop);
        }
    }

    function gzClearInput() {
        gzInput.up = false;
        gzInput.down = false;
        gzInput.left = false;
        gzInput.right = false;
        gzInput.joyX = 0;
        gzInput.joyY = 0;
        gzInput.joyActive = false;
        if (joyKnobEl) joyKnobEl.style.transform = "translate(0px, 0px)";
    }

    function gzHandleKey(ev, isDown) {
        var code = ev.code;
        var k = ev.key ? ev.key.toLowerCase() : "";

        if (code === "ArrowUp" || k === "w") {
            gzInput.up = isDown;
            return true;
        }
        if (code === "ArrowDown" || k === "s") {
            gzInput.down = isDown;
            return true;
        }
        if (code === "ArrowLeft" || k === "a") {
            gzInput.left = isDown;
            return true;
        }
        if (code === "ArrowRight" || k === "d") {
            gzInput.right = isDown;
            return true;
        }
        if (!isDown) return false;

        if (code === "Space") {
            if (gzState.mode === "idle" || gzState.mode === "gameover") {
                gzStartGame();
            } else {
                triggerSmash();
            }
            return true;
        }
        if (k === "e" || code === "ShiftLeft" || code === "ShiftRight") {
            triggerTailWhip();
            return true;
        }
        if (k === "q" || k === "f") {
            triggerRoar();
            return true;
        }
        return false;
    }

    // --- Event Listeners ---
    if (startBtn) {
        startBtn.addEventListener("click", function (ev) {
            ev.stopPropagation();
            gzStartGame();
        });
    }
    if (againBtn) {
        againBtn.addEventListener("click", function (ev) {
            ev.stopPropagation();
            gzStartGame();
        });
    }
    if (restartBtn) {
        restartBtn.addEventListener("click", function (ev) {
            ev.stopPropagation();
            gzStartGame();
        });
    }

    // Desktop click on viewport = Smash; Right click = Tail Whip!
    if (viewportEl) {
        viewportEl.addEventListener("pointerdown", function (ev) {
            if (gzState.mode !== "playing") return;
            if (ev.target.closest("button") || ev.target.closest(".gz-touch-controls")) return;
            if (ev.button === 2) {
                ev.preventDefault();
                triggerTailWhip();
            } else if (ev.pointerType === "mouse") {
                triggerSmash();
            }
        });
        viewportEl.addEventListener("contextmenu", function (ev) {
            if (gzState.mode === "playing") ev.preventDefault();
        });
    }

    // Multi-touch Virtual Joystick (Bottom-Left)
    if (joyZoneEl) {
        var joyPointerId = null;
        var updateJoy = function (clientX, clientY) {
            var rect = joyZoneEl.getBoundingClientRect();
            var cx = rect.left + rect.width * 0.5;
            var cy = rect.top + rect.height * 0.5;
            var maxR = rect.width * 0.36;
            var dx = clientX - cx;
            var dy = clientY - cy;
            var d = Math.hypot(dx, dy);
            if (d > maxR) {
                dx = (dx / d) * maxR;
                dy = (dy / d) * maxR;
            }
            gzInput.joyX = dx / maxR;
            gzInput.joyY = dy / maxR;
            gzInput.joyActive = true;
            if (joyKnobEl) {
                joyKnobEl.style.transform = "translate(" + dx.toFixed(1) + "px, " + dy.toFixed(1) + "px)";
            }
        };
        joyZoneEl.addEventListener("pointerdown", function (ev) {
            ev.preventDefault();
            joyPointerId = ev.pointerId;
            try { joyZoneEl.setPointerCapture(ev.pointerId); } catch (e) {}
            updateJoy(ev.clientX, ev.clientY);
        });
        joyZoneEl.addEventListener("pointermove", function (ev) {
            if (ev.pointerId !== joyPointerId) return;
            ev.preventDefault();
            updateJoy(ev.clientX, ev.clientY);
        });
        var releaseJoy = function (ev) {
            if (ev.pointerId !== joyPointerId) return;
            joyPointerId = null;
            gzInput.joyX = 0;
            gzInput.joyY = 0;
            gzInput.joyActive = false;
            if (joyKnobEl) joyKnobEl.style.transform = "translate(0px, 0px)";
        };
        joyZoneEl.addEventListener("pointerup", releaseJoy);
        joyZoneEl.addEventListener("pointercancel", releaseJoy);
    }

    // Mobile Action Buttons (Bottom-Right)
    function bindActionBtn(el, fn) {
        if (!el) return;
        el.addEventListener("pointerdown", function (ev) {
            ev.preventDefault();
            ev.stopPropagation();
            el.classList.add("is-pressed");
            fn();
        });
        var unpress = function () { el.classList.remove("is-pressed"); };
        el.addEventListener("pointerup", unpress);
        el.addEventListener("pointercancel", unpress);
        el.addEventListener("pointerleave", unpress);
    }
    bindActionBtn(btnSmashEl, triggerSmash);
    bindActionBtn(btnTailEl, triggerTailWhip);
    bindActionBtn(btnRoarEl, triggerRoar);

    window.addEventListener("resize", gzResize);
    if (window.ResizeObserver && viewportEl) {
        try {
            new ResizeObserver(gzResize).observe(viewportEl);
        } catch (e) {}
    }

    // =========================================================================
    // --- Public & Hub Registration ---
    // =========================================================================

    window.McWutGames.godzilla = {
        state: gzState,
        input: gzInput,
        gzInitGraphics: gzInitGraphics,
        gzStartGame: gzStartGame,
        gzPause: gzPause,
        gzResume: gzResume,
        gzResize: gzResize,
        gzHandleKey: gzHandleKey,
        gzClearInput: gzClearInput,
        setMuted: function (m) { muted = !!m; }
    };

    window.gzState = gzState;
    window.gzInitGraphics = gzInitGraphics;
    window.gzStartGame = gzStartGame;
    window.gzPause = gzPause;
    window.gzResume = gzResume;
    window.gzResize = gzResize;
    window.gzHandleKey = gzHandleKey;
    window.gzClearInput = gzClearInput;
})();
