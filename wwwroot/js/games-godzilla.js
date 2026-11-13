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
    var MAX_SCORE = 10000;

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
    var wreckedEl = document.getElementById("gz-hud-wrecked");
    var distEl = document.getElementById("gz-hud-dist");
    var compassEl = document.getElementById("gz-compass-arrow");
    var alertStarsEl = document.getElementById("gz-alert-stars");
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

    // 24x34 pixel-art Baby Bronny James matching the chibi afro & Lakers uniform
    var BRONNY_IDLE_ROWS = [
        ".......kkkkkkkkkk.......",
        ".....kkahhaaaahhaakk....",
        "....kahaaahaaahaaahak...",
        "...kaaaahaaaaaaaahaaak..",
        "..kahaaahaaahaaahaaahak.",
        "..kaaaaaaaaaaaaaaaaaaak.",
        ".kahaaahaaahaaahaaahaaak",
        ".kaaaahkkssssssskkhaaaak",
        ".kahaksslllllllllsskahak",
        ".kaaksslllllllllllsskaak",
        ".kakslllllllllllllllskak",
        ".kdkslkkeslllllekklsskak",
        ".kdkslkweeslllkweeslskak",
        ".kdkslbeeeslllbeeeslskak",
        ".kdkssbeeeslsllbeeslskak",
        "..kdsspppsssssspppsssdk.",
        "...ksssssswwwwsssssssk..",
        "...kssssskwttwkssssssk..",
        "....kssssskkkkssssssk...",
        ".....kkssssssssssskk....",
        ".......kkwwuuwwkk.......",
        ".....kkssuwggwusskk.....",
        "....kssggggggggggssk....",
        "...kdsggguugggguuggsk...",
        "...kdssgguggggggugssdk..",
        "...kdssggggggggggggssdk.",
        "...kds.gguuuuuugggg.sdk.",
        "....k..gguuuuuugggg..k..",
        ".......gggggggggggg.....",
        ".......uugggggggguu.....",
        ".......ggggg..ggggg.....",
        ".......uuug....guuu.....",
        "......uuggu....ugguu....",
        "......wwwww....wwwww...."
    ];

    var BRONNY_CHEER_ROWS = [
        "..kk................kk..",
        ".kssk..kkkkkkkkkk..kssk.",
        ".ksskkaahhaaaahhaaksskk.",
        "..kskahaaahaaahaaahaksk.",
        "..kdkaaaahaaaaaaahaaadk.",
        "...ksshaaaahaaahaahsssk.",
        "...kssaaaaaaaaaaaassssk.",
        "....kahaaahaaahaaahak...",
        "....kaaaahkkssskkhaak...",
        "....kahakssllllssskak...",
        "....kdkssllllllllsssk...",
        "....kdkslkkeslllekklk...",
        "....kdkslkweesllkweek...",
        "....kdkslbeeesllbeeesk..",
        "....kdksspppssssspppsk..",
        ".....kdssssswwwwssssdk..",
        "......ksssskwttwksssk...",
        "......kssssskkkkssssk...",
        ".......kksssssssssskk...",
        "........kwwuuuuuuwwk....",
        ".......kggggggggggggk...",
        ".......kggguugggguugk...",
        ".......kggugggggguggk...",
        ".......kggggggggggggk...",
        ".......kgguuuuuuggggk...",
        ".......kgguuuuuuggggk...",
        ".......kggggggggggggk...",
        "........uugggggggguu....",
        "........ggggg..ggggg....",
        "........uuug....guuu....",
        ".......uuggu....ugguu...",
        ".......wwwww....wwwww...",
        "........................",
        "........................"
    ];

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
    var bronnyCheerCanvas = buildSpriteCanvas(BRONNY_CHEER_ROWS, BRONNY_PALETTE, 4);

    // Paint the Kid's Voxel Monster directly in crisp 2D pixel art for Cameos & 2D Fallback
    function drawPixelGodzilla2D(ctx, cx, cy, scale, opts) {
        opts = opts || {};
        var u = scale || 3;
        var step = opts.step || 0;
        var chomp = opts.chomp || 0;
        var roar = opts.roar || 0;
        var hurt = opts.hurt || false;
        var tailSwing = opts.tailSwing || 0;
        var t = opts.time || 0;

        ctx.save();
        ctx.translate(cx, cy + Math.abs(Math.sin(step)) * -u * 0.9);

        var mossDark = hurt ? "#991b1b" : "#30482b";
        var mossMid = hurt ? "#ef4444" : "#56794c";
        var mossBright = hurt ? "#fca5a5" : "#7ca068";
        var mossHigh = hurt ? "#fee2e2" : "#97b87e";

        // Layered sweeping dragon tail-fin on lower right
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
        ctx.restore();

        // Stubby raised upper arms with 4 splayed fingers
        var armSwing = Math.sin(step) * 0.18 - chomp * 0.45;
        [-1, 1].forEach(function (side) {
            ctx.save();
            ctx.translate(side * 6.5 * u, -2.5 * u);
            ctx.rotate(side * (-0.55 + armSwing));
            ctx.fillStyle = mossMid;
            ctx.fillRect(side > 0 ? 0 : -4 * u, -1.2 * u, 4 * u, 2.4 * u);
            ctx.fillStyle = mossHigh;
            var fx = side > 0 ? 3.5 * u : -4.8 * u;
            ctx.fillRect(fx, -2.1 * u, 1.4 * u, 1.1 * u);
            ctx.fillRect(fx + side * 0.6 * u, -0.7 * u, 1.4 * u, 1.0 * u);
            ctx.fillRect(fx + side * 0.2 * u, 0.7 * u, 1.4 * u, 1.0 * u);
            ctx.restore();
        });

        // Stubby clawed lower legs
        var legL = Math.sin(step) * u * 1.1;
        var legR = -legL;
        ctx.fillStyle = mossDark;
        ctx.fillRect(-6 * u, 5 * u + legL, 3.2 * u, 4 * u);
        ctx.fillRect(2.8 * u, 5 * u + legR, 3.2 * u, 4 * u);
        ctx.fillStyle = mossHigh;
        ctx.fillRect(-6.8 * u, 8.2 * u + legL, 4 * u, 1.4 * u);
        ctx.fillRect(2.8 * u, 8.2 * u + legR, 4 * u, 1.4 * u);

        // Spherical stepped mossy voxel orb body
        var r = 7;
        for (var vy = -r; vy <= r; vy++) {
            for (var vx = -r; vx <= r; vx++) {
                var d = Math.sqrt(vx * vx + vy * vy);
                var bump = ((Math.abs(vx * 7 + vy * 13) % 5) === 0) ? 0.55 : 0;
                if (d <= r - 0.1 + bump) {
                    var shade = mossMid;
                    if (vy < -3 && Math.abs(vx) <= 3) shade = mossBright;
                    else if ((vx + vy) % 3 === 0) shade = mossDark;
                    else if (vy < -1 && Math.abs(vx) > 2) shade = mossBright;
                    if (vy === -r + 1 && Math.abs(vx) < 3) shade = mossHigh;
                    ctx.fillStyle = shade;
                    ctx.fillRect((vx - 0.5) * u, (vy - 0.5) * u, u + 0.35, u + 0.35);
                }
            }
        }

        // Angry furrowed green brow ridges
        ctx.fillStyle = mossDark;
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
        ctx.fillStyle = "#192616";
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

        // Retro city horizon silhouette
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(4, 24, 20, h - 24);
        ctx.fillRect(28, 14, 24, h - 14);
        ctx.fillRect(w - 50, 12, 24, h - 12);
        ctx.fillRect(w - 22, 28, 18, h - 28);
        // Tiny lit windows
        ctx.fillStyle = "#facc15";
        for (var wy = 18; wy < h - 10; wy += 7) {
            ctx.fillRect(32, wy, 3, 3);
            ctx.fillRect(42, wy, 3, 3);
            ctx.fillRect(w - 46, wy, 3, 3);
            ctx.fillRect(w - 36, wy, 3, 3);
        }

        if (isVictory) {
            // Godzilla happily hoisting Baby Bronny atop his brow with gold sparkles!
            drawPixelGodzilla2D(ctx, w * 0.48, h * 0.62, 2.5, { time: 0.4, roar: 0.35 });
            ctx.drawImage(bronnyCheerCanvas, 0, 0, bronnyCheerCanvas.width, bronnyCheerCanvas.height, w * 0.48 - 18, 2, 34, 48);
            ctx.fillStyle = "#facc15";
            ctx.fillRect(16, 12, 4, 4);
            ctx.fillRect(w - 20, 14, 4, 4);
            ctx.fillStyle = "#a855f7";
            ctx.fillRect(26, 26, 4, 4);
            ctx.fillRect(w - 30, 24, 4, 4);
        } else {
            // Monster roaring on left facing Mega Tower + Baby Bronny on right
            drawPixelGodzilla2D(ctx, 44, h * 0.56, 2.6, { time: 0.2, roar: 0.25 });
            ctx.fillStyle = "#581c87";
            ctx.fillRect(w - 48, 42, 34, h - 42);
            ctx.fillStyle = "#facc15";
            ctx.fillRect(w - 48, 42, 34, 4);
            ctx.drawImage(bronnyIdleCanvas, 0, 0, bronnyIdleCanvas.width, bronnyIdleCanvas.height, w - 45, 5, 28, 40);
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
        var palette = [0x2b4227, 0x3b5935, 0x4e7445, 0x628b54, 0x7aa365, 0x95bc7c];
        var n = hash3(x, y, z);
        var idx = Math.floor(n * 4.2 + (y > 4 ? 1.15 : 0) + (ridgeBias || 0));
        idx = Math.max(0, Math.min(palette.length - 1, idx));
        return palette[idx];
    }

    function createGodzillaRig(THREE) {
        var root = new THREE.Group();
        var bodyScaleGroup = new THREE.Group();
        root.add(bodyScaleGroup);

        var voxelSize = 0.135; // Orb diameter ~ 21 * 0.135 = 2.84 -> tall ~ 3.5 with legs!
        var skinMat = new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.86,
            metalness: 0.06
        });
        var glowMat = new THREE.MeshBasicMaterial({
            vertexColors: true
        });

        // -----------------------------------------------------------------
        // 1. Main Sculpted Orb Torso + Furrowed Brow + Upper Maw + Dorsal Fins
        // -----------------------------------------------------------------
        var torsoVox = {};
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

                    // Dorsal back ridge spines
                    var isDorsal = (z < -2 && Math.abs(x) <= 2 && y >= -4 && y <= 11);
                    if (isDorsal) {
                        var spikeWave = Math.abs(((y + 12) % 3) - 1);
                        shellR += (2.1 - Math.abs(x) * 0.6) - spikeWave * 0.45;
                    }

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
                        torsoVox[x + "," + y + "," + z] = 0x182515;
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

                    var ridgeBias = (isBrow || isDorsal || isForehead) ? 1.1 : 0;
                    if (inEyeSocket) {
                        torsoVox[x + "," + y + "," + z] = 0x20311d;
                    } else if (isDorsal && fineN > 0.74 && Math.abs(x) === 0) {
                        torsoVox[x + "," + y + "," + z] = 0xf59e0b; // glowing warm ember spine highlights!
                    } else {
                        torsoVox[x + "," + y + "," + z] = pickMossColor(x, y, z, ridgeBias);
                    }
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
        bodyScaleGroup.add(torsoMesh);

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
        lowerJawPivot.add(lowerJawMesh);

        // Inner fiery throat core (glows when roaring!)
        var throatGlowMat = new THREE.MeshBasicMaterial({ color: 0xff6a00, transparent: true, opacity: 0.12 });
        var throatGlowMesh = new THREE.Mesh(new THREE.SphereGeometry(0.46, 10, 10), throatGlowMat);
        throatGlowMesh.position.set(0, -3.0 * voxelSize, 4.5 * voxelSize);
        bodyScaleGroup.add(throatGlowMesh);

        // Flickering fiery orange mouth/eye point light!
        var faceLight = new THREE.PointLight(0xff6b1a, 1.85, 13);
        faceLight.position.set(0, 0.25, 1.75);
        bodyScaleGroup.add(faceLight);

        // -----------------------------------------------------------------
        // 3. Stubby Raised Upper Arms with 4 Splayed Clawed Fingers
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
            // Splayed 4-finger webbed claw hand!
            var fingers = [
                [6, 2, 0], [7, 2, 0], [8, 3, 0],
                [6, 1, 1], [7, 1, 1], [8, 1, 1],
                [6, 0, -1], [7, 0, -1], [8, 0, -1],
                [6, -1, 0], [7, -2, 0], [8, -2, 0]
            ];
            for (var f = 0; f < fingers.length; f++) {
                var fg = fingers[f];
                armVox[(fg[0] * side) + "," + fg[1] + "," + fg[2]] = (f % 3 === 2) ? 0x97ba7d : 0x739860;
            }
            return new THREE.Mesh(buildVoxelGeometry(armVox, voxelSize * 0.94, [0, 0, 0]), skinMat);
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
        // 4. Chunky Clawed Lower Stomp Legs
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
            // 4 clawed splayed toes facing forward (+Z)
            var toes = [[-2, -5, 3], [-1, -5, 3], [1, -5, 3], [2, -5, 3]];
            for (var t = 0; t < toes.length; t++) {
                var tp = toes[t];
                legVox[tp[0] + "," + tp[1] + "," + tp[2]] = 0x8aa875;
            }
            return new THREE.Mesh(buildVoxelGeometry(legVox, voxelSize, [0, 0, 0]), skinMat);
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
        // 5. Sweeping Layered Voxel Dragon-Fin Tail (3 Articulated Segments!)
        // -----------------------------------------------------------------
        function buildTailSegment(len, w, h, tipBoost) {
            var tv = {};
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
            }
            return new THREE.Mesh(buildVoxelGeometry(tv, voxelSize, [0, 0, 0]), skinMat);
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

        // -----------------------------------------------------------------
        // 6. Floating Ember Sparks & Atomic Fire Breath Beam + Rescued Bronny!
        // -----------------------------------------------------------------
        var emberGroup = new THREE.Group();
        root.add(emberGroup);
        var emberGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
        var embers = [];
        for (var e = 0; e < 22; e++) {
            var eMat = new THREE.MeshBasicMaterial({
                color: e % 3 === 0 ? 0xfef08a : (e % 2 === 0 ? 0xff7b00 : 0xff3b00),
                transparent: true,
                opacity: 0.85
            });
            var eMesh = new THREE.Mesh(emberGeo, eMat);
            emberGroup.add(eMesh);
            embers.push({
                mesh: eMesh,
                ang: (e / 22) * Math.PI * 2,
                rad: 1.65 + (e % 4) * 0.35,
                yOff: (e % 6) * 0.48,
                speed: 0.9 + (e % 5) * 0.22
            });
        }

        // Atomic Ember Roar Beam (attached to mouth forward +Z)
        var beamGroup = new THREE.Group();
        beamGroup.position.set(0, 1.45, 1.4);
        beamGroup.visible = false;
        bodyScaleGroup.parent.add(beamGroup);

        var outerBeamGeo = new THREE.ConeGeometry(2.3, 21, 8, 1, true);
        outerBeamGeo.rotateX(-Math.PI / 2);
        outerBeamGeo.translate(0, 0, 10.5);
        var outerBeamMat = new THREE.MeshBasicMaterial({
            color: 0xff5a00,
            transparent: true,
            opacity: 0.55,
            side: THREE.DoubleSide
        });
        var outerBeam = new THREE.Mesh(outerBeamGeo, outerBeamMat);
        beamGroup.add(outerBeam);

        var innerBeamGeo = new THREE.ConeGeometry(0.95, 20.5, 6);
        innerBeamGeo.rotateX(-Math.PI / 2);
        innerBeamGeo.translate(0, 0, 10.25);
        var innerBeamMat = new THREE.MeshBasicMaterial({
            color: 0xfef08a,
            transparent: true,
            opacity: 0.88
        });
        var innerBeam = new THREE.Mesh(innerBeamGeo, innerBeamMat);
        beamGroup.add(innerBeam);

        // Rescued Baby Bronny riding on Godzilla's head on Victory!
        var bronnyTex = new THREE.CanvasTexture(bronnyCheerCanvas);
        bronnyTex.magFilter = THREE.NearestFilter;
        bronnyTex.minFilter = THREE.NearestFilter;
        bronnyTex.generateMipmaps = false;
        var riderSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: bronnyTex, transparent: true }));
        riderSprite.scale.set(1.9, 2.7, 1);
        riderSprite.position.set(0, 18.6 * voxelSize, 1.5 * voxelSize);
        riderSprite.visible = false;
        bodyScaleGroup.add(riderSprite);

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
            beamGroup: beamGroup,
            outerBeam: outerBeam,
            innerBeam: innerBeam,
            embers: embers,
            riderSprite: riderSprite,
            skinMat: skinMat
        };
    }

    // =========================================================================
    // --- Procedural Pixel-Art City & Military Textures ---
    // =========================================================================

    function makePixelTexture(drawFn, size) {
        var s = size || 32;
        var c = document.createElement("canvas");
        c.width = s;
        c.height = s;
        var ctx = c.getContext("2d");
        ctx.imageSmoothingEnabled = false;
        drawFn(ctx, s);
        if (!window.THREE) return c;
        var tex = new THREE.CanvasTexture(c);
        tex.magFilter = THREE.NearestFilter;
        tex.minFilter = THREE.NearestFilter;
        tex.generateMipmaps = false;
        return tex;
    }

    function createCityTextures() {
        var palettes = {
            glass: makePixelTexture(function (ctx, s) {
                ctx.fillStyle = "#1e293b";
                ctx.fillRect(0, 0, s, s);
                for (var y = 2; y < s - 1; y += 4) {
                    for (var x = 2; x < s - 1; x += 4) {
                        var lit = ((x * 7 + y * 13) % 5) !== 0;
                        ctx.fillStyle = lit ? (((x + y) % 8 === 0) ? "#bae6fd" : "#38bdf8") : "#0f172a";
                        ctx.fillRect(x, y, 2, 3);
                    }
                }
            }, 32),
            brick: makePixelTexture(function (ctx, s) {
                ctx.fillStyle = "#7c2d12";
                ctx.fillRect(0, 0, s, s);
                ctx.fillStyle = "#9a3412";
                for (var by = 0; by < s; by += 4) {
                    ctx.fillRect(0, by, s, 2);
                }
                for (var y = 3; y < s - 2; y += 6) {
                    for (var x = 3; x < s - 2; x += 6) {
                        var on = ((x * 3 + y * 11) % 3) !== 0;
                        ctx.fillStyle = on ? "#fde047" : "#1c1917";
                        ctx.fillRect(x, y, 3, 4);
                    }
                }
            }, 32),
            diner: makePixelTexture(function (ctx, s) {
                ctx.fillStyle = "#be123c";
                ctx.fillRect(0, 0, s, s);
                ctx.fillStyle = "#fef3c7";
                ctx.fillRect(0, 10, s, 4);
                ctx.fillStyle = "#fb7185";
                ctx.fillRect(0, 14, s, 3);
                ctx.fillStyle = "#38bdf8";
                ctx.fillRect(3, 19, 10, 10);
                ctx.fillRect(19, 19, 10, 10);
                ctx.fillStyle = "#facc15";
                ctx.fillRect(4, 3, 24, 5);
            }, 32),
            reactor: makePixelTexture(function (ctx, s) {
                ctx.fillStyle = "#334155";
                ctx.fillRect(0, 0, s, s);
                for (var i = -s; i < s * 2; i += 8) {
                    ctx.fillStyle = "#facc15";
                    ctx.fillRect(i, 24, 4, 8);
                }
                ctx.fillStyle = "#22d3ee";
                ctx.fillRect(8, 6, 16, 12);
                ctx.fillStyle = "#e0f2fe";
                ctx.fillRect(12, 9, 8, 6);
            }, 32),
            lakers: makePixelTexture(function (ctx, s) {
                ctx.fillStyle = "#581c87";
                ctx.fillRect(0, 0, s, s);
                ctx.fillStyle = "#facc15";
                ctx.fillRect(0, 0, s, 3);
                ctx.fillRect(0, s - 3, s, 3);
                for (var y = 6; y < s - 5; y += 6) {
                    for (var x = 3; x < s - 3; x += 5) {
                        ctx.fillStyle = ((x + y) % 2 === 0) ? "#fde047" : "#a855f7";
                        ctx.fillRect(x, y, 3, 4);
                    }
                }
            }, 32),
            cracked: makePixelTexture(function (ctx, s) {
                ctx.fillStyle = "#18181b";
                ctx.fillRect(0, 0, s, s);
                ctx.fillStyle = "#f97316";
                ctx.fillRect(6, 5, 3, 8);
                ctx.fillRect(20, 14, 4, 6);
                ctx.fillStyle = "#52525b";
                ctx.fillRect(2, 10, 12, 2);
                ctx.fillRect(14, 22, 14, 2);
            }, 32)
        };
        return palettes;
    }

    // =========================================================================
    // --- Game State & City Generation ---
    // =========================================================================

    var gzState = {
        active: false,
        mode: "idle", // "idle" | "playing" | "victory_anim" | "gameover"
        outcome: null, // "win" | "loss"
        score: 0,
        destructionScore: 0,
        rescueBonus: 0,
        healthBonus: 0,
        combo: 0,
        maxCombo: 0,
        comboTimer: 0,
        buildingsWrecked: 0,
        totalBuildings: 0,
        unitsSmashed: 0,
        hp: 100,
        maxHp: 100,
        rage: 50,
        maxRage: 100,
        threatLevel: 1,
        elapsed: 0,
        trauma: 0,
        hitstop: 0,
        bannerTimer: 0,
        victoryTimer: 0,
        spawnTimer: 1.5,
        chopperTimer: 3.5,
        stepAccum: 0,
        lastStepSign: 1,
        gameId: 0,
        submitted: false,
        leaderboard: null,
        lastTime: 0,
        animFrame: null,

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
        megaTower: null,
        props: [],
        enemies: [],
        projectiles: [],
        debris: [],
        pickups: [],
        particles: [],
        popups: [],
        scorchMarks: []
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
    var monsterRig = null;
    var cityTextures = null;
    var bronnySpriteTex = null;
    var bronnyCheerTex = null;
    var fallbackCtx = null;

    // Shared geometries/materials for dynamic objects (zero GPU leaks!)
    var sharedGeo = {};
    var sharedMat = {};

    function ensureSharedAssets() {
        if (!window.THREE || sharedGeo.box) return;
        sharedGeo.box = new THREE.BoxGeometry(1, 1, 1);
        sharedGeo.cyl = new THREE.CylinderGeometry(0.5, 0.5, 1, 8);
        sharedGeo.sphere = new THREE.SphereGeometry(0.5, 8, 8);
        sharedGeo.ring = new THREE.RingGeometry(0.7, 1.0, 16);
        sharedGeo.ring.rotateX(-Math.PI / 2);

        sharedMat.smoke = new THREE.MeshBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.72 });
        sharedMat.fire = new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.9 });
        sharedMat.spark = new THREE.MeshBasicMaterial({ color: 0xfef08a });
        sharedMat.gold = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
        sharedMat.purple = new THREE.MeshBasicMaterial({ color: 0x9333ea });
        sharedMat.bullet = new THREE.MeshBasicMaterial({ color: 0xfde047 });
        sharedMat.missile = new THREE.MeshBasicMaterial({ color: 0xef4444 });
        sharedMat.shell = new THREE.MeshBasicMaterial({ color: 0xf97316 });
        sharedMat.shadow = new THREE.MeshBasicMaterial({ color: 0x050810, transparent: true, opacity: 0.42, side: THREE.DoubleSide });
        sharedMat.spot = new THREE.MeshBasicMaterial({ color: 0xfef9c3, transparent: true, opacity: 0.22, side: THREE.DoubleSide });
        sharedMat.laser = new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.65 });
        sharedMat.heal = new THREE.MeshBasicMaterial({ color: 0x22c55e });
        sharedMat.burgerBun = new THREE.MeshLambertMaterial({ color: 0xf59e0b });
        sharedMat.burgerPatty = new THREE.MeshLambertMaterial({ color: 0x78350f });
        sharedMat.scorch = new THREE.MeshBasicMaterial({ color: 0x0f172a, transparent: true, opacity: 0.65, side: THREE.DoubleSide });
    }

    function gzInitGraphics() {
        if (!canvasEl || !viewportEl) return;

        if (window.THREE && !threeRenderer) {
            try {
                threeRenderer = new THREE.WebGLRenderer({
                    canvas: canvasEl,
                    antialias: false,
                    alpha: false,
                    powerPreference: "high-performance"
                });
                // Chunky crisp pixel-art internal buffer scaling
                threeRenderer.setPixelRatio(Math.max(0.84, Math.min(window.devicePixelRatio || 1, 1.35) * 0.80));
                threeRenderer.setClearColor(0x0c1326, 1);

                threeScene = new THREE.Scene();
                threeScene.fog = new THREE.FogExp2(0x13162b, 0.0074);

                var aspect = (viewportEl.clientWidth || 640) / (viewportEl.clientHeight || 520);
                threeCamera = new THREE.PerspectiveCamera(46, aspect, 0.5, 220);

                var hemi = new THREE.HemisphereLight(0xa5d8ff, 0x4b382e, 0.86);
                threeScene.add(hemi);

                var sun = new THREE.DirectionalLight(0xffd29d, 1.04);
                sun.position.set(28, 48, 32);
                threeScene.add(sun);

                var rim = new THREE.DirectionalLight(0x38bdf8, 0.46);
                rim.position.set(-30, 18, -28);
                threeScene.add(rim);

                ensureSharedAssets();
                cityTextures = createCityTextures();

                bronnySpriteTex = new THREE.CanvasTexture(bronnyIdleCanvas);
                bronnySpriteTex.magFilter = THREE.NearestFilter;
                bronnySpriteTex.minFilter = THREE.NearestFilter;
                bronnySpriteTex.generateMipmaps = false;

                bronnyCheerTex = new THREE.CanvasTexture(bronnyCheerCanvas);
                bronnyCheerTex.magFilter = THREE.NearestFilter;
                bronnyCheerTex.minFilter = THREE.NearestFilter;
                bronnyCheerTex.generateMipmaps = false;

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

        if (!useThree) {
            fallbackCtx = canvasEl.getContext("2d");
        }

        buildCityWorld();
        gzResize();
        paintCameoBanner(cameoCanvas, false);
    }

    function buildStaticGround(parent) {
        // City base asphalt + sidewalks
        var groundGeo = new THREE.PlaneGeometry(CITY_HALF * 2 + 40, CITY_HALF * 2 + 40);
        groundGeo.rotateX(-Math.PI / 2);
        var groundMat = new THREE.MeshLambertMaterial({ color: 0x171c28 });
        var ground = new THREE.Mesh(groundGeo, groundMat);
        ground.position.y = -0.02;
        parent.add(ground);

        // City blocks & road markings
        var roadLines = new THREE.Group();
        var avenues = [-48, -24, 0, 24, 48];
        var blockMat = new THREE.MeshLambertMaterial({ color: 0x2a3242 });
        var plazaMat = new THREE.MeshLambertMaterial({ color: 0x3b1d5e });
        var dashMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
        var whiteMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8 });

        // Sidewalk pads inside each 24x24 block
        for (var bx = -36; bx <= 36; bx += 24) {
            for (var bz = -60; bz <= 36; bz += 24) {
                var isPlaza = (bx === -12 || bx === 12) && (bz === -60 || bz === -36);
                var pad = new THREE.Mesh(
                    new THREE.BoxGeometry(16.2, 0.14, 16.2),
                    isPlaza ? plazaMat : blockMat
                );
                pad.position.set(bx, 0.05, bz);
                roadLines.add(pad);
            }
        }

        // Lakers North Plaza circle pad under Mega Tower
        var plazaRing = new THREE.Mesh(
            new THREE.CylinderGeometry(11.5, 12.2, 0.22, 16),
            new THREE.MeshLambertMaterial({ color: 0x4c1d95 })
        );
        plazaRing.position.set(TOWER_X, 0.09, TOWER_Z);
        roadLines.add(plazaRing);

        var plazaGold = new THREE.Mesh(
            new THREE.CylinderGeometry(7.2, 7.2, 0.24, 16),
            new THREE.MeshLambertMaterial({ color: 0xeab308 })
        );
        plazaGold.position.set(TOWER_X, 0.10, TOWER_Z);
        roadLines.add(plazaGold);

        // Yellow center dashes along avenues
        for (var ai = 0; ai < avenues.length; ai++) {
            var pos = avenues[ai];
            for (var d = -56; d <= 44; d += 6) {
                var dashZ = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.02, 2.4), dashMat);
                dashZ.position.set(pos, 0.01, d);
                roadLines.add(dashZ);

                if (d >= -48 && d <= 48) {
                    var dashX = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.02, 0.26), dashMat);
                    dashX.position.set(d, 0.01, pos - 12);
                    roadLines.add(dashX);
                }
            }
        }

        // Perimeter glowing hazard barrier border
        var borderGeo = new THREE.BoxGeometry(CITY_HALF * 2, 0.5, 0.8);
        var bNorth = new THREE.Mesh(borderGeo, whiteMat);
        bNorth.position.set(0, 0.25, -CITY_HALF - 10);
        var bSouth = new THREE.Mesh(borderGeo, whiteMat);
        bSouth.position.set(0, 0.25, CITY_HALF - 10);
        roadLines.add(bNorth, bSouth);

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
        gzState.props = [];
        gzState.enemies = [];
        gzState.projectiles = [];
        gzState.debris = [];
        gzState.pickups = [];
        gzState.particles = [];
        gzState.popups = [];
        gzState.scorchMarks = [];

        if (popupLayerEl) popupLayerEl.innerHTML = "";
        if (useThree) {
            clearGroup(cityGroup);
            clearGroup(dynamicGroup);
        }

        // Seeded deterministic city generator so layout is consistently rich and readable
        var seed = 4219;
        function rand() {
            seed = (seed * 1664525 + 1013904223) >>> 0;
            return seed / 4294967296;
        }

        var idCounter = 1;

        function addBuilding(x, z, w, d, h, kind, hp, pts) {
            var b = {
                id: idCounter++,
                x: x,
                z: z,
                w: w,
                d: d,
                h: h,
                kind: kind,
                hp: hp,
                maxHp: hp,
                pts: pts,
                destroyed: false,
                shake: 0,
                flash: 0,
                collapseAnim: 0,
                mesh: null,
                bodyMesh: null
            };

            if (useThree) {
                var grp = new THREE.Group();
                grp.position.set(x, 0, z);

                var tex = cityTextures[kind] || cityTextures.glass;
                var mat = new THREE.MeshLambertMaterial({ map: tex });
                var body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
                body.position.y = h / 2;
                grp.add(body);

                // Rooftop details (water towers, AC boxes, glowing neon roof sign)
                if (kind === "glass") {
                    var crown = new THREE.Mesh(new THREE.BoxGeometry(w * 0.65, 0.8, d * 0.65), new THREE.MeshLambertMaterial({ color: 0x0f172a }));
                    crown.position.y = h + 0.4;
                    var ant = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.4, 0.22), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
                    ant.position.y = h + 1.8;
                    grp.add(crown, ant);
                } else if (kind === "brick") {
                    var wt = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 1.8, 8), new THREE.MeshLambertMaterial({ color: 0x78350f }));
                    wt.position.set(w * 0.2, h + 1.1, -d * 0.2);
                    grp.add(wt);
                } else if (kind === "diner") {
                    var sign = new THREE.Mesh(new THREE.BoxGeometry(w * 0.8, 1.1, 0.5), new THREE.MeshBasicMaterial({ color: 0xfacc15 }));
                    sign.position.set(0, h + 0.6, d * 0.35);
                    grp.add(sign);
                } else if (kind === "reactor") {
                    var dome = new THREE.Mesh(new THREE.SphereGeometry(w * 0.38, 8, 8), new THREE.MeshBasicMaterial({ color: 0x22d3ee }));
                    dome.position.y = h;
                    grp.add(dome);
                }

                cityGroup.add(grp);
                b.mesh = grp;
                b.bodyMesh = body;
            }
            gzState.buildings.push(b);
        }

        // Populate 4x4 city blocks (leaving Tower North Plaza at (0, -48) and Monster South Spawn at (0, 36) clear!)
        var blockCentersX = [-36, -12, 12, 36];
        var blockCentersZ = [-60, -36, -12, 12, 36];

        for (var ix = 0; ix < blockCentersX.length; ix++) {
            for (var iz = 0; iz < blockCentersZ.length; iz++) {
                var cx = blockCentersX[ix];
                var cz = blockCentersZ[iz];

                // Skip South spawn avenue area and North Mega Tower plaza overlap
                var distTower = Math.hypot(cx - TOWER_X, cz - TOWER_Z);
                if (distTower < 14) continue;

                // 2 buildings + 1 mini corner shop or park per block
                var slots = [
                    { dx: -4.1, dz: -4.1 },
                    { dx: 4.1, dz: -4.1 },
                    { dx: -4.1, dz: 4.1 },
                    { dx: 4.1, dz: 4.1 }
                ];
                for (var s = 0; s < slots.length; s++) {
                    var sx = cx + slots[s].dx;
                    var sz = cz + slots[s].dz;
                    if (Math.hypot(sx - 0, sz - 36) < 9.5) continue; // Keep spawn clear
                    if (Math.hypot(sx - TOWER_X, sz - TOWER_Z) < 14.5) continue;

                    var rVal = rand();
                    if (rVal < 0.16) {
                        // Mini park tree cluster
                        addProp(sx, sz, "tree");
                        addProp(sx + 1.8, sz - 1.5, "tree");
                    } else if (rVal < 0.34) {
                        addBuilding(sx, sz, 5.4, 5.4, 4.2 + rand() * 1.4, "diner", 38, 130);
                    } else if (rVal < 0.44) {
                        addBuilding(sx, sz, 5.2, 5.2, 5.5, "reactor", 42, 260);
                    } else if (rVal < 0.74) {
                        addBuilding(sx, sz, 5.8, 5.8, 7.2 + rand() * 3.2, "brick", 65, 240);
                    } else {
                        addBuilding(sx, sz, 6.2, 6.2, 11.5 + rand() * 6.5, "glass", 105, 410);
                    }
                }
            }
        }

        gzState.totalBuildings = gzState.buildings.length;

        // Add Street Props (cars, buses, streetlamps, hydrants) along avenues
        var roadCoords = [-48, -24, 0, 24, 48];
        for (var rx = 0; rx < roadCoords.length; rx++) {
            for (var k = -54; k <= 42; k += 14) {
                var px = roadCoords[rx] + (rand() > 0.5 ? 1.8 : -1.8);
                var pz = k + rand() * 5;
                if (Math.hypot(px, pz - 36) < 7) continue;
                if (Math.hypot(px - TOWER_X, pz - TOWER_Z) < 12) continue;
                addProp(px, pz, rand() < 0.25 ? "bus" : "car");
            }
        }
        for (var l = -50; l <= 40; l += 18) {
            addProp(-4.2, l, "lamp");
            addProp(4.2, l, "lamp");
        }

        // Build the Iconic 4-Tier Bronny Mega Tower at North Plaza!
        buildMegaTower();
    }

    function addProp(x, z, kind) {
        var p = {
            id: Math.random(),
            x: x,
            z: z,
            kind: kind,
            pts: kind === "bus" ? 45 : (kind === "car" ? 30 : 18),
            destroyed: false,
            mesh: null
        };
        if (useThree) {
            var grp = new THREE.Group();
            grp.position.set(x, 0, z);
            if (kind === "car" || kind === "bus") {
                var len = kind === "bus" ? 3.2 : 2.1;
                var col = kind === "bus" ? 0xfacc15 : [0xef4444, 0x3b82f6, 0xe2e8f0, 0x10b981][Math.floor(Math.random() * 4)];
                var body = new THREE.Mesh(new THREE.BoxGeometry(1.3, kind === "bus" ? 1.3 : 0.85, len), new THREE.MeshLambertMaterial({ color: col }));
                body.position.y = kind === "bus" ? 0.7 : 0.5;
                var roof = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.5, len * 0.55), new THREE.MeshLambertMaterial({ color: 0xf8fafc }));
                roof.position.y = kind === "bus" ? 1.4 : 1.0;
                grp.add(body, roof);
            } else if (kind === "tree") {
                var trunk = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.4, 0.6), new THREE.MeshLambertMaterial({ color: 0x78350f }));
                trunk.position.y = 0.7;
                var crown = new THREE.Mesh(new THREE.BoxGeometry(2.1, 2.2, 2.1), new THREE.MeshLambertMaterial({ color: 0x22c55e }));
                crown.position.y = 2.4;
                grp.add(trunk, crown);
            } else {
                var pole = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.0, 0.2), new THREE.MeshLambertMaterial({ color: 0x64748b }));
                pole.position.y = 1.5;
                var bulb = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.35, 0.55), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
                bulb.position.y = 3.1;
                grp.add(pole, bulb);
            }
            cityGroup.add(grp);
            p.mesh = grp;
        }
        gzState.props.push(p);
    }

    function buildMegaTower() {
        var tiers = [];
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
            hp: 320,
            maxHp: 320,
            tiersLeft: 4,
            shake: 0,
            flash: 0,
            destroyed: false,
            group: null,
            tierMeshes: [],
            crownGroup: null,
            bronnySprite: null,
            beaconMesh: null
        };

        if (useThree) {
            var grp = new THREE.Group();
            grp.position.set(TOWER_X, 0, TOWER_Z);

            var lakersMat = new THREE.MeshLambertMaterial({ map: cityTextures.lakers });
            var goldTrimMat = new THREE.MeshLambertMaterial({ color: 0xfacc15 });

            for (var i = 0; i < tierConfigs.length; i++) {
                var cfg = tierConfigs[i];
                var tGrp = new THREE.Group();
                var block = new THREE.Mesh(new THREE.BoxGeometry(cfg.w, cfg.h, cfg.d), lakersMat);
                block.position.y = cfg.h / 2;
                var rim = new THREE.Mesh(new THREE.BoxGeometry(cfg.w + 0.35, 0.45, cfg.d + 0.35), goldTrimMat);
                rim.position.y = cfg.h - 0.15;
                tGrp.add(block, rim);
                tGrp.position.y = cfg.y;
                grp.add(tGrp);
                mt.tierMeshes.push({ grp: tGrp, h: cfg.h, baseY: cfg.y });
            }

            // Crown helipad + Baby Bronny Sprite + Sky Beacon
            var crown = new THREE.Group();
            crown.position.y = 17.7;

            var pad = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 0.4, 12), new THREE.MeshLambertMaterial({ color: 0x581c87 }));
            var padGold = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 0.45, 12), new THREE.MeshBasicMaterial({ color: 0xfacc15 }));
            crown.add(pad, padGold);

            // Tall glowing Lakers rescue beacon beam reaching into the sky
            var beacon = new THREE.Mesh(
                new THREE.CylinderGeometry(0.65, 1.5, 36, 8, 1, true),
                new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.16, side: THREE.DoubleSide })
            );
            beacon.position.y = 18;
            crown.add(beacon);
            mt.beaconMesh = beacon;

            // Pixel-Art Baby Bronny James Sprite standing right on top!
            var spMat = new THREE.SpriteMaterial({ map: bronnySpriteTex, transparent: true });
            var sp = new THREE.Sprite(spMat);
            sp.scale.set(2.8, 4.0, 1);
            sp.position.y = 2.3;
            crown.add(sp);
            mt.bronnySprite = sp;

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

    function spawnBurst(x, y, z, colorHex, count, speed) {
        for (var i = 0; i < count; i++) {
            var a = Math.random() * Math.PI * 2;
            var sp = (0.4 + Math.random() * 0.8) * (speed || 10);
            var p = {
                x: x,
                y: y,
                z: z,
                vx: Math.cos(a) * sp,
                vy: 3 + Math.random() * sp * 0.8,
                vz: Math.sin(a) * sp,
                life: 0.4 + Math.random() * 0.45,
                maxLife: 0.85,
                size: 0.32 + Math.random() * 0.35,
                mesh: null
            };
            if (useThree && dynamicGroup) {
                var mat = colorHex === 0xfacc15 ? sharedMat.gold : (colorHex === 0x9333ea ? sharedMat.purple : (colorHex === 0xf97316 ? sharedMat.fire : sharedMat.smoke));
                p.mesh = new THREE.Mesh(sharedGeo.box, mat);
                p.mesh.position.set(x, y, z);
                p.mesh.scale.setScalar(p.size);
                dynamicGroup.add(p.mesh);
            }
            gzState.particles.push(p);
        }
    }

    function spawnDebris(x, y, z, colorHex, count, canHitChopper) {
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
                var mat = col === 0xfacc15 ? sharedMat.gold : (col === 0x581c87 ? sharedMat.purple : sharedMat.smoke);
                d.mesh = new THREE.Mesh(sharedGeo.box, mat);
                d.mesh.position.set(d.x, d.y, d.z);
                d.mesh.scale.setScalar(0.5 + Math.random() * 0.5);
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

    function spawnPickup(x, z) {
        var pk = {
            x: x,
            y: 0.9,
            z: z,
            life: 14,
            mesh: null
        };
        if (useThree && dynamicGroup) {
            var g = new THREE.Group();
            var bot = new THREE.Mesh(sharedGeo.cyl, sharedMat.burgerBun);
            bot.scale.set(1.0, 0.35, 1.0);
            bot.position.y = -0.2;
            var pat = new THREE.Mesh(sharedGeo.cyl, sharedMat.burgerPatty);
            pat.scale.set(1.12, 0.28, 1.12);
            var top = new THREE.Mesh(sharedGeo.cyl, sharedMat.burgerBun);
            top.scale.set(1.0, 0.42, 1.0);
            top.position.y = 0.25;
            var ring = new THREE.Mesh(sharedGeo.ring, sharedMat.heal);
            ring.scale.setScalar(1.2);
            ring.position.y = -0.6;
            g.add(bot, pat, top, ring);
            g.position.set(x, pk.y, z);
            dynamicGroup.add(g);
            pk.mesh = g;
        }
        gzState.pickups.push(pk);
    }

    // =========================================================================
    // --- Enemy Spawning & AI (Police, Tanks, Attack Helicopters) ---
    // =========================================================================

    function spawnEnemy(kind) {
        var m = gzState.monster;
        var angle = Math.random() * Math.PI * 2;
        var dist = kind === "chopper" ? 28 + Math.random() * 10 : 25 + Math.random() * 12;
        var ex = Math.max(-CITY_HALF + 4, Math.min(CITY_HALF - 4, m.x + Math.cos(angle) * dist));
        var ez = Math.max(-CITY_HALF - 6, Math.min(CITY_HALF - 14, m.z + Math.sin(angle) * dist));

        var e = {
            kind: kind, // "jeep" | "tank" | "chopper"
            x: ex,
            y: kind === "chopper" ? 4.4 : 0,
            z: ez,
            vx: 0,
            vz: 0,
            angle: 0,
            hp: kind === "tank" ? 55 : (kind === "chopper" ? 42 : 20),
            maxHp: kind === "tank" ? 55 : (kind === "chopper" ? 42 : 20),
            speed: kind === "chopper" ? 9.8 : (kind === "tank" ? 4.8 : 8.8),
            pts: kind === "chopper" ? 220 : (kind === "tank" ? 150 : 65),
            fireTimer: 1.2 + Math.random() * 1.4,
            telegraphTimer: 0,
            orbitDir: Math.random() > 0.5 ? 1 : -1,
            rotorPhase: Math.random() * 6.28,
            mesh: null,
            rotor: null,
            turret: null,
            laserLine: null,
            shadowMesh: null
        };

        if (useThree && dynamicGroup) {
            var grp = new THREE.Group();
            if (kind === "chopper") {
                var fuse = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.1, 3.2), new THREE.MeshLambertMaterial({ color: 0x365314 }));
                var cock = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.7, 1.1), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
                cock.position.set(0, 0.1, 1.3);
                var tailB = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 2.2), new THREE.MeshLambertMaterial({ color: 0x4d7c0f }));
                tailB.position.set(0, 0.25, -2.2);
                var rotor = new THREE.Group();
                rotor.position.y = 0.8;
                var blade1 = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.08, 0.26), new THREE.MeshBasicMaterial({ color: 0xe2e8f0 }));
                var blade2 = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.08, 4.4), new THREE.MeshBasicMaterial({ color: 0xe2e8f0 }));
                rotor.add(blade1, blade2);
                grp.add(fuse, cock, tailB, rotor);
                e.rotor = rotor;

                var spot = new THREE.Mesh(sharedGeo.ring, sharedMat.spot);
                spot.scale.setScalar(2.4);
                spot.position.set(ex, 0.06, ez);
                dynamicGroup.add(spot);
                e.shadowMesh = spot;
            } else if (kind === "tank") {
                var hull = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.0, 3.1), new THREE.MeshLambertMaterial({ color: 0x3f6212 }));
                hull.position.y = 0.65;
                var treadL = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.7, 3.3), new THREE.MeshLambertMaterial({ color: 0x1e293b }));
                treadL.position.set(-1.1, 0.35, 0);
                var treadR = treadL.clone();
                treadR.position.x = 1.1;
                var turret = new THREE.Group();
                turret.position.y = 1.35;
                var turBox = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.7, 1.6), new THREE.MeshLambertMaterial({ color: 0x65a30d }));
                var barrel = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.26, 2.2), new THREE.MeshLambertMaterial({ color: 0x475569 }));
                barrel.position.set(0, 0.05, 1.25);
                var laser = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 18), sharedMat.laser);
                laser.position.set(0, 0.05, 10);
                laser.visible = false;
                turret.add(turBox, barrel, laser);
                grp.add(hull, treadL, treadR, turret);
                e.turret = turret;
                e.laserLine = laser;
            } else {
                // Police / Army Humvee jeep
                var jBody = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.85, 2.4), new THREE.MeshLambertMaterial({ color: 0x1e3a8a }));
                jBody.position.y = 0.55;
                var jTop = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.55, 1.3), new THREE.MeshLambertMaterial({ color: 0xf8fafc }));
                jTop.position.set(0, 1.15, -0.1);
                var siren = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.22, 0.3), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
                siren.position.set(0, 1.52, 0);
                grp.add(jBody, jTop, siren);
            }
            grp.position.set(ex, e.y, ez);
            dynamicGroup.add(grp);
            e.mesh = grp;
        }
        gzState.enemies.push(e);
    }

    function spawnProjectile(x, y, z, vx, vy, vz, kind, dmg) {
        var pr = {
            x: x,
            y: y,
            z: z,
            vx: vx,
            vy: vy,
            vz: vz,
            kind: kind, // "bullet" | "shell" | "missile"
            dmg: dmg,
            life: 3.4,
            mesh: null
        };
        if (useThree && dynamicGroup) {
            var mat = kind === "missile" ? sharedMat.missile : (kind === "shell" ? sharedMat.shell : sharedMat.bullet);
            var m = new THREE.Mesh(sharedGeo.box, mat);
            m.position.set(x, y, z);
            var sc = kind === "bullet" ? 0.28 : 0.48;
            m.scale.set(sc, sc, sc * (kind === "missile" ? 1.8 : 1.0));
            dynamicGroup.add(m);
            pr.mesh = m;
        }
        gzState.projectiles.push(pr);
    }

    // =========================================================================
    // --- Combat & Destruction Actions ---
    // =========================================================================

    function addScore(basePts, x, y, z, label) {
        if (gzState.mode !== "playing") return;
        gzState.combo++;
        if (gzState.combo > gzState.maxCombo) {
            gzState.maxCombo = gzState.combo;
        }
        gzState.comboTimer = 3.4;

        var mult = 1 + Math.min(gzState.combo - 1, 8) * 0.14;
        var pts = Math.round(basePts * mult);
        gzState.destructionScore = Math.min(MAX_SCORE, gzState.destructionScore + pts);
        gzState.score = Math.min(MAX_SCORE, gzState.destructionScore);

        var txt = (label ? label + " " : "") + "+" + pts;
        spawnPopup(x, y + 1.5, z, txt, gzState.combo >= 4 ? "#fb923c" : "#facc15");
        updateHud();
    }

    function addRage(amt) {
        gzState.rage = Math.min(gzState.maxRage, gzState.rage + amt);
    }

    function damageBuilding(b, dmg) {
        if (!b || b.destroyed) return;
        b.hp -= dmg;
        b.shake = 0.25;
        b.flash = 0.12;
        addRage(3.5);
        spawnDebris(b.x, Math.min(b.h, 3.5), b.z, b.kind === "reactor" ? 0x22d3ee : 0x64748b, 4, false);

        if (b.hp <= b.maxHp * 0.5 && b.bodyMesh && cityTextures) {
            b.bodyMesh.material.map = cityTextures.cracked;
            b.bodyMesh.material.needsUpdate = true;
        }

        if (b.hp <= 0) {
            b.destroyed = true;
            b.collapseAnim = 0.45;
            gzState.buildingsWrecked++;
            gzState.trauma = Math.min(1.0, gzState.trauma + (b.kind === "glass" ? 0.52 : 0.36));
            gzState.hitstop = 0.032;
            playCollapseSfx(b.kind === "glass" || b.kind === "reactor");

            spawnBurst(b.x, 1.5, b.z, b.kind === "reactor" ? 0xf97316 : 0xfacc15, 16, 12);
            spawnDebris(b.x, Math.min(b.h * 0.6, 5), b.z, 0x94a3b8, 12, true);
            addScore(b.pts, b.x, 2.0, b.z, b.kind === "glass" ? "TOWER DOWN!" : "");
            addRage(10);

            if (b.kind === "diner" || (b.kind === "reactor" && Math.random() < 0.8) || Math.random() < 0.24) {
                spawnPickup(b.x, b.z);
            }

            // Fuel Reactor Chain Reaction Explosion!
            if (b.kind === "reactor") {
                showBanner("REACTOR CHAIN BLAST!");
                spawnBurst(b.x, 2.2, b.z, 0xf97316, 22, 17);
                for (var i = 0; i < gzState.buildings.length; i++) {
                    var ob = gzState.buildings[i];
                    if (!ob.destroyed && Math.hypot(ob.x - b.x, ob.z - b.z) < 11.5) {
                        damageBuilding(ob, 55);
                    }
                }
                for (var ei = gzState.enemies.length - 1; ei >= 0; ei--) {
                    var en = gzState.enemies[ei];
                    if (Math.hypot(en.x - b.x, en.z - b.z) < 12) {
                        damageEnemy(en, 80, "REACTOR BLAST!");
                    }
                }
            }
        }
    }

    function damageMegaTower(dmg) {
        var mt = gzState.megaTower;
        if (!mt || mt.destroyed || gzState.mode !== "playing") return;

        mt.hp = Math.max(0, mt.hp - dmg);
        mt.shake = 0.28;
        mt.flash = 0.14;
        addRage(4);
        spawnDebris(mt.x, 3.0, mt.z, Math.random() > 0.5 ? 0xfacc15 : 0x581c87, 5, false);

        var nextTiers = Math.ceil((mt.hp / mt.maxHp) * 4);
        while (mt.tiersLeft > nextTiers && mt.tiersLeft > 0) {
            mt.tiersLeft--;
            gzState.trauma = Math.min(1.0, gzState.trauma + 0.6);
            playCollapseSfx(true);
            spawnBurst(mt.x, 2.5, mt.z, 0xfacc15, 18, 13);
            addScore(250, mt.x, 4.5, mt.z, "TIER SMASHED!");

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
            gzState.trauma = Math.min(1.0, gzState.trauma + 0.3);
            playCollapseSfx(e.kind === "chopper" || e.kind === "tank");
            spawnBurst(e.x, e.y + 0.8, e.z, 0xf97316, 15, 11);
            spawnDebris(e.x, e.y + 0.8, e.z, 0x64748b, 6, false);
            addScore(e.pts, e.x, e.y + 1.2, e.z, bannerTag || (e.kind === "chopper" ? "CHOPPER DOWN!" : ""));
            addRage(e.kind === "chopper" ? 16 : 12);

            if (e.kind === "chopper" || e.kind === "tank" || Math.random() < 0.35) {
                spawnPickup(e.x, e.z);
            }
            if (bannerTag) showBanner(bannerTag);
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

        // Hit Buildings
        for (var i = 0; i < gzState.buildings.length; i++) {
            var b = gzState.buildings[i];
            if (b.destroyed) continue;
            var dx = Math.abs(hitCenterX - b.x);
            var dz = Math.abs(hitCenterZ - b.z);
            if (dx < b.w * 0.5 + 3.0 && dz < b.d * 0.5 + 3.0) {
                damageBuilding(b, 38);
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
                    damageEnemy(e, 100, "SKY CHOMP!");
                    gzState.hp = Math.min(gzState.maxHp, gzState.hp + 12);
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

        // Deflect incoming enemy shells & missiles!
        for (var pi = gzState.projectiles.length - 1; pi >= 0; pi--) {
            var pr = gzState.projectiles[pi];
            if (Math.hypot(pr.x - m.x, pr.z - m.z) < rad + 1.5) {
                spawnBurst(pr.x, pr.y, pr.z, 0xfef08a, 4, 6);
                if (pr.mesh && dynamicGroup) dynamicGroup.remove(pr.mesh);
                gzState.projectiles.splice(pi, 1);
            }
        }

        for (var i = 0; i < gzState.buildings.length; i++) {
            var b = gzState.buildings[i];
            if (!b.destroyed && Math.hypot(b.x - m.x, b.z - m.z) < rad + b.w * 0.45) {
                damageBuilding(b, 28);
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

    function triggerVictory() {
        if (gzState.mode !== "playing") return;
        gzState.mode = "victory_anim";
        gzState.outcome = "win";
        gzState.victoryTimer = 1.45;
        gzState.rescueBonus = 2000;
        gzState.healthBonus = Math.round((gzState.hp / gzState.maxHp) * 1500);
        gzState.score = Math.min(MAX_SCORE, gzState.destructionScore + gzState.rescueBonus + gzState.healthBonus);

        // Clear active hostile fire and celebrate!
        for (var pi = 0; pi < gzState.projectiles.length; pi++) {
            if (gzState.projectiles[pi].mesh && dynamicGroup) dynamicGroup.remove(gzState.projectiles[pi].mesh);
        }
        gzState.projectiles = [];

        if (monsterRig) {
            monsterRig.beamGroup.visible = false;
            monsterRig.riderSprite.visible = true;
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
        gzState.healthBonus = 0;
        gzState.score = Math.min(MAX_SCORE, gzState.destructionScore);
        if (monsterRig) monsterRig.beamGroup.visible = false;
        if (typeof playGameOverSound === "function") playGameOverSound();
        showEndOverlay();
    }

    function showEndOverlay() {
        var win = gzState.outcome === "win";
        if (overRecordBanner) overRecordBanner.hidden = true;
        if (overBadge) overBadge.textContent = win ? "VICTORY - BABY BRONNY SAVED!" : "KAIJU OVERWHELMED";
        if (overTitle) overTitle.textContent = win ? "Baby Bronny Rescued!" : "Taken Down by the Army!";
        if (overBreakdown) {
            overBreakdown.textContent = win
                ? "Destruction: " + gzState.destructionScore.toLocaleString() + " + Rescue: +" + gzState.rescueBonus.toLocaleString() + " + HP Bonus: +" + gzState.healthBonus.toLocaleString()
                : "Destroyed " + gzState.buildingsWrecked + " buildings & " + gzState.unitsSmashed + " military units before falling!";
        }
        if (overScore) overScore.textContent = gzState.score.toLocaleString();
        if (overCombo) overCombo.textContent = "\u00d7" + gzState.maxCombo;
        if (overStatsLine) {
            overStatsLine.textContent = "Buildings Wrecked: " + gzState.buildingsWrecked + "/" + gzState.totalBuildings + " \u00b7 Choppers & Tanks Smashed: " + gzState.unitsSmashed;
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
        var finalCombo = Math.max(0, Math.min(MAX_SCORE, Math.round(gzState.maxCombo)));

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
                if (bld.mesh) {
                    bld.mesh.position.y = -(1 - bld.collapseAnim / 0.45) * bld.h;
                    if (bld.collapseAnim <= 0) bld.mesh.visible = false;
                }
            }
            if (bld.shake > 0) bld.shake = Math.max(0, bld.shake - dt);
            if (bld.flash > 0) bld.flash = Math.max(0, bld.flash - dt);
        }

        if (gzState.megaTower && !gzState.megaTower.destroyed) {
            pushOutBox(gzState.megaTower.x, gzState.megaTower.z, gzState.megaTower.w, gzState.megaTower.d);
            if (gzState.megaTower.shake > 0) gzState.megaTower.shake = Math.max(0, gzState.megaTower.shake - dt);
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

        // Collect Heal Burgers
        for (var pki = gzState.pickups.length - 1; pki >= 0; pki--) {
            var pk = gzState.pickups[pki];
            pk.life -= dt;
            var pd = Math.hypot(pk.x - m.x, pk.z - m.z);
            if (pd < 5.5) {
                pk.x += ((m.x - pk.x) / (pd || 1)) * 12 * dt;
                pk.z += ((m.z - pk.z) / (pd || 1)) * 12 * dt;
            }
            if (pd < 2.2) {
                gzState.hp = Math.min(gzState.maxHp, gzState.hp + 12);
                addRage(10);
                spawnPopup(m.x, 2.5, m.z, "+12 HP!", "#4ade80");
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

        // Update Threat Level & Enemy Spawning
        var wreckPct = gzState.totalBuildings > 0 ? gzState.buildingsWrecked / gzState.totalBuildings : 0;
        var nearTower = Math.hypot(m.x - TOWER_X, m.z - TOWER_Z) < 28;
        gzState.threatLevel = Math.min(5, 1 + Math.floor(wreckPct * 4.5 + gzState.elapsed / 32) + (nearTower ? 1 : 0));

        var maxGround = 3 + gzState.threatLevel;
        var maxChoppers = gzState.threatLevel >= 4 ? 3 : (gzState.threatLevel >= 2 ? 2 : 1);
        var curGround = 0;
        var curChoppers = 0;
        for (var ci = 0; ci < gzState.enemies.length; ci++) {
            if (gzState.enemies[ci].kind === "chopper") curChoppers++;
            else curGround++;
        }

        gzState.spawnTimer -= dt;
        if (gzState.spawnTimer <= 0 && curGround < maxGround) {
            gzState.spawnTimer = Math.max(1.4, 3.2 - gzState.threatLevel * 0.35);
            spawnEnemy(gzState.threatLevel >= 2 && Math.random() < 0.45 ? "tank" : "jeep");
        }
        gzState.chopperTimer -= dt;
        if (gzState.chopperTimer <= 0 && curChoppers < maxChoppers) {
            gzState.chopperTimer = Math.max(2.6, 5.2 - gzState.threatLevel * 0.5);
            spawnEnemy("chopper");
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
            if (e.kind !== "chopper" && dist < m.radius + 1.4 && m.y < 1.0) {
                damageEnemy(e, e.kind === "jeep" ? 99 : 22);
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
                    var mSpd = 17.5;
                    var aimVy = ((m.y + 1.1) - e.y) / (dist / mSpd);
                    spawnProjectile(e.x, e.y - 0.3, e.z, dirX * mSpd, aimVy, dirZ * mSpd, "missile", 5);
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
                    if (e.telegraphTimer <= 0) {
                        if (e.laserLine) e.laserLine.visible = false;
                        spawnProjectile(e.x, 1.4, e.z, dirX * 21, 0, dirZ * 21, "shell", 7);
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
                    spawnProjectile(e.x, 1.0, e.z, dirX * 22, 0, dirZ * 22, "bullet", 2);
                }
            }

            if (e.mesh) {
                e.mesh.position.set(e.x, e.y, e.z);
                e.mesh.rotation.y = e.angle;
                if (e.rotor) e.rotor.rotation.y += dt * 26;
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
            if (pr.mesh) {
                pr.mesh.position.set(pr.x, pr.y, pr.z);
                pr.mesh.rotation.y = Math.atan2(pr.vx, pr.vz);
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
            p.vy -= 18 * dt;
            if (p.y < 0.1) { p.y = 0.1; p.vy *= -0.35; }
            if (p.mesh) {
                p.mesh.position.set(p.x, p.y, p.z);
                p.mesh.scale.setScalar(Math.max(0.05, p.size * (p.life / p.maxLife)));
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
        if (wreckedEl) {
            var wp = gzState.totalBuildings > 0 ? Math.round((gzState.buildingsWrecked / gzState.totalBuildings) * 100) : 0;
            wreckedEl.textContent = wp + "%";
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
                if (bossTiersEl) bossTiersEl.textContent = mt.tiersLeft + "/4 Tiers";
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

        // Animate Kid's Voxel Monster Rig!
        var moving = Math.hypot(m.vx, m.vz) > 0.6;
        var walkPhase = moving ? gzState.stepAccum : t * 2.1;
        var stride = moving ? Math.sin(walkPhase) : 0;

        rig.root.position.set(m.x, m.y, m.z);
        rig.root.rotation.y = m.angle + (m.tailAnim > 0 ? (1 - m.tailAnim / 0.38) * Math.PI * 2 : 0);

        // Squash & stretch on stomp, chomp, and victory dance!
        var chompRatio = m.smashAnim > 0 ? Math.sin((m.smashAnim / 0.28) * Math.PI) : 0;
        var roarActive = m.roarTimer > 0;

        rig.body.position.y = 13.5 * 0.135 + Math.abs(stride) * 0.14;
        rig.body.rotation.z = stride * 0.08;
        rig.body.rotation.x = chompRatio * 0.22 - (roarActive ? 0.18 : 0);

        // Articulated Lower Jaw Chomp vs Wide Roar!
        if (roarActive) {
            rig.lowerJaw.rotation.x = 0.45 + Math.sin(t * 28) * 0.06;
            rig.throatGlowMat.opacity = 0.88;
            rig.throatGlowMesh.scale.setScalar(1.35 + Math.sin(t * 24) * 0.15);
            rig.faceLight.intensity = 3.2;
            rig.beamGroup.visible = true;
            rig.beamGroup.rotation.z = t * 14;
            rig.outerBeam.scale.set(1 + Math.sin(t * 32) * 0.12, 1 + Math.cos(t * 32) * 0.12, 1);
        } else if (chompRatio > 0.05) {
            rig.lowerJaw.rotation.x = -0.34 * chompRatio;
            rig.throatGlowMat.opacity = 0.2;
            rig.faceLight.intensity = 1.9;
            rig.beamGroup.visible = false;
        } else {
            rig.lowerJaw.rotation.x = 0.06 + Math.sin(t * 3.5) * 0.04;
            rig.throatGlowMat.opacity = 0.12;
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

        // Damage flash tint on Monster
        rig.skinMat.emissive.setHex(m.hurtTimer > 0 ? 0x991b1b : (roarActive ? 0x431407 : 0x000000));

        // Swirling Fiery Ember Sparks around Monster (just like the kid's picture!)
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

        // Animate Building Shakes & Baby Bronny waving on Mega Tower
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

        var mt = gzState.megaTower;
        if (mt && !mt.destroyed && mt.group) {
            if (mt.shake > 0) {
                mt.group.position.x = mt.x + (Math.random() - 0.5) * 0.42;
                mt.group.position.z = mt.z + (Math.random() - 0.5) * 0.42;
            } else {
                mt.group.position.x = mt.x;
                mt.group.position.z = mt.z;
            }
            if (mt.bronnySprite) {
                var waveFrame = Math.floor(t * 3.5) % 2 === 0;
                mt.bronnySprite.material.map = waveFrame ? bronnyCheerTex : bronnySpriteTex;
                mt.bronnySprite.position.y = 2.25 + Math.abs(Math.sin(t * 5)) * 0.45;
            }
            if (mt.beaconMesh) {
                mt.beaconMesh.rotation.y = t * 1.2;
            }
        }

        // Camera framing: Idle showcases Monster facing 3/4 toward camera; Playing tracks action!
        var shakeAmt = gzState.trauma * gzState.trauma * 0.95;
        var sx = (Math.random() - 0.5) * shakeAmt;
        var sy = (Math.random() - 0.5) * shakeAmt;

        if (gzState.mode === "idle") {
            var orbit = 0.32 + Math.sin(t * 0.55) * 0.46;
            threeCamera.position.set(
                m.x + Math.sin(orbit) * 7.8,
                5.1,
                m.z + Math.cos(orbit) * 7.8
            );
            threeCamera.lookAt(m.x, 1.85, m.z);
        } else if (gzState.mode === "victory_anim") {
            threeCamera.position.set(m.x + 3.6 + sx, 5.4 + sy, m.z + 7.6);
            threeCamera.lookAt(m.x, 2.35, m.z);
        } else {
            threeCamera.position.set(m.x + 8.6 + sx, 15.4 + sy, m.z + 15.8);
            threeCamera.lookAt(m.x - 0.6, 1.5, m.z - 1.6);
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
        ctx.fillStyle = "#0e1526";
        ctx.fillRect(0, 0, w, h);

        var scale = Math.min(w, h) / 46;
        var shakeX = (Math.random() - 0.5) * gzState.trauma * 16;
        var shakeY = (Math.random() - 0.5) * gzState.trauma * 16;

        ctx.save();
        ctx.translate(w * 0.5 + shakeX, h * 0.56 + shakeY);

        function wx(x) { return (x - m.x) * scale; }
        function wz(z) { return (z - m.z) * scale * 0.85; }

        // Road grid
        ctx.fillStyle = "#1b2436";
        var avenues = [-48, -24, 0, 24, 48];
        for (var ai = 0; ai < avenues.length; ai++) {
            var a = avenues[ai];
            ctx.fillRect(wx(a - 3.5), wz(-CITY_HALF - 10), 7 * scale, CITY_HALF * 2 * scale);
            ctx.fillRect(wx(-CITY_HALF), wz(a - 15.5), CITY_HALF * 2 * scale, 7 * scale * 0.85);
        }

        // Lakers Plaza
        ctx.fillStyle = "#4c1d95";
        ctx.beginPath();
        ctx.arc(wx(TOWER_X), wz(TOWER_Z), 11.5 * scale, 0, Math.PI * 2);
        ctx.fill();

        // Props
        for (var pri = 0; pri < gzState.props.length; pri++) {
            var p = gzState.props[pri];
            if (p.destroyed) continue;
            ctx.fillStyle = p.kind === "tree" ? "#22c55e" : (p.kind === "bus" ? "#facc15" : "#38bdf8");
            ctx.fillRect(wx(p.x) - scale * 0.6, wz(p.z) - scale * 0.6, scale * 1.2, scale * 1.2);
        }

        // Buildings (2.5D extruded pixel blocks)
        var drawList = [];
        for (var bi = 0; bi < gzState.buildings.length; bi++) {
            var b = gzState.buildings[bi];
            if (!b.destroyed) drawList.push({ type: "b", z: b.z, obj: b });
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
                var bx = wx(bld.x - bld.w * 0.5);
                var bz = wz(bld.z - bld.d * 0.5);
                var bw = bld.w * scale;
                var bd = bld.d * scale * 0.85;
                var bh = bld.h * scale * 0.55;
                ctx.fillStyle = bld.kind === "diner" ? "#be123c" : (bld.kind === "brick" ? "#9a3412" : (bld.kind === "reactor" ? "#0284c7" : "#334155"));
                ctx.fillRect(bx, bz - bh, bw, bh + bd);
                ctx.fillStyle = bld.kind === "reactor" ? "#22d3ee" : "#64748b";
                ctx.fillRect(bx, bz - bh, bw, bd);
                ctx.fillStyle = "#facc15";
                ctx.fillRect(bx + bw * 0.2, bz - bh + bd + 3, 4, 4);
            } else if (item.type === "mt") {
                var mt = item.obj;
                var mx = wx(mt.x - mt.w * 0.5);
                var mz = wz(mt.z - mt.d * 0.5);
                var mw = mt.w * scale;
                var md = mt.d * scale * 0.85;
                var mh = mt.tiersLeft * 3.8 * scale * 0.55;
                ctx.fillStyle = "#581c87";
                ctx.fillRect(mx, mz - mh, mw, mh + md);
                ctx.fillStyle = "#facc15";
                ctx.fillRect(mx, mz - mh, mw, md);
                var spImg = Math.floor(t * 3.5) % 2 === 0 ? bronnyCheerCanvas : bronnyIdleCanvas;
                ctx.drawImage(spImg, 0, 0, spImg.width, spImg.height, wx(mt.x) - scale * 1.4, mz - mh - scale * 3.4, scale * 2.8, scale * 4.0);
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
                if (m.roarTimer > 0) {
                    ctx.save();
                    ctx.translate(wx(m.x), wz(m.z));
                    ctx.rotate(Math.atan2(Math.sin(m.angle), Math.cos(m.angle)) - Math.PI / 2);
                    ctx.fillStyle = "rgba(249, 115, 22, 0.55)";
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(18 * scale, -2.6 * scale);
                    ctx.lineTo(18 * scale, 2.6 * scale);
                    ctx.closePath();
                    ctx.fill();
                    ctx.restore();
                }
            }
        }

        // Enemies & Projectiles
        for (var ei = 0; ei < gzState.enemies.length; ei++) {
            var e = gzState.enemies[ei];
            var ex = wx(e.x);
            var ez = wz(e.z) - e.y * scale * 0.55;
            if (e.kind === "chopper") {
                ctx.fillStyle = "rgba(254, 249, 195, 0.2)";
                ctx.beginPath();
                ctx.arc(wx(e.x), wz(e.z), scale * 1.6, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = "#4d7c0f";
                ctx.fillRect(ex - scale, ez - scale * 0.5, scale * 2, scale);
                ctx.fillStyle = "#e2e8f0";
                ctx.fillRect(ex - scale * 1.8, ez - scale * 0.15, scale * 3.6, scale * 0.3);
            } else {
                ctx.fillStyle = e.kind === "tank" ? "#65a30d" : "#2563eb";
                ctx.fillRect(ex - scale * 0.9, ez - scale * 0.6, scale * 1.8, scale * 1.2);
            }
        }

        for (var pi = 0; pi < gzState.projectiles.length; pi++) {
            var pr = gzState.projectiles[pi];
            ctx.fillStyle = pr.kind === "missile" ? "#ef4444" : "#facc15";
            ctx.fillRect(wx(pr.x) - 3, wz(pr.z) - pr.y * scale * 0.55 - 3, 6, 6);
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

    function gzStartGame() {
        gzInitGraphics();
        gzState.gameId++;
        gzState.submitted = false;
        gzState.mode = "playing";
        gzState.outcome = null;
        gzState.score = 0;
        gzState.destructionScore = 0;
        gzState.rescueBonus = 0;
        gzState.healthBonus = 0;
        gzState.combo = 0;
        gzState.maxCombo = 0;
        gzState.comboTimer = 0;
        gzState.buildingsWrecked = 0;
        gzState.unitsSmashed = 0;
        gzState.hp = 100;
        gzState.rage = 50;
        gzState.threatLevel = 1;
        gzState.elapsed = 0;
        gzState.trauma = 0;
        gzState.hitstop = 0;
        gzState.spawnTimer = 1.6;
        gzState.chopperTimer = 3.2;

        gzState.monster.x = 0;
        gzState.monster.y = 0;
        gzState.monster.z = 36;
        gzState.monster.vx = 0;
        gzState.monster.vz = 0;
        gzState.monster.vy = 0;
        gzState.monster.angle = Math.PI * 0.85;
        gzState.monster.targetAngle = Math.PI * 0.85;
        gzState.monster.smashCd = 0;
        gzState.monster.smashAnim = 0;
        gzState.monster.tailCd = 0;
        gzState.monster.tailAnim = 0;
        gzState.monster.roarTimer = 0;
        gzState.monster.hurtTimer = 0;

        if (monsterRig) {
            monsterRig.riderSprite.visible = false;
            monsterRig.beamGroup.visible = false;
        }

        gzClearInput();
        buildCityWorld();

        if (startOverlay) startOverlay.hidden = true;
        if (overOverlay) overOverlay.hidden = true;
        if (popBannerEl) popBannerEl.hidden = true;
        if (bossBarEl) bossBarEl.hidden = true;

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
