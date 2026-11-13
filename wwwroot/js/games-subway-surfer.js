(function () {
    "use strict";

    window.McWutGames = window.McWutGames || {};

    // =========================================================================
    // --- Subway Surfer: Three.js 3D Endless Metro Runner (+ 2.5D Fallback) ---
    // =========================================================================

    var GAME_KEY = "subway-surfer";
    var MAX_SCORE = 1000000;
    var MAX_COMBO = 100000;

    var LANE_WIDTH = 3.25;
    var TRACK_HALF_W = 5.45;
    var BASE_SPEED = 24.0;
    var MAX_SPEED = 56.0;
    var GRAVITY = -44.0;
    var JUMP_VEL = 16.0;
    var HOVERBOARD_JUMP_VEL = 17.6;
    var SNEAKERS_JUMP_VEL = 22.4;
    var TRAIN_HEIGHT = 3.25;
    var RAMP_LEN = 5.8;
    var STAND_HEIGHT = 1.85;
    var ROLL_HEIGHT = 0.78;
    var ROLL_DURATION = 0.68;
    var BIOME_DIST_STEP = 360;

    var HOVERBOARD_DURATION = 9.0;
    var JETPACK_DURATION = 6.5;
    var JETPACK_HEIGHT = 7.3;
    var MAGNET_DURATION = 9.5;
    var SNEAKERS_DURATION = 10.5;
    var MULTIPLIER_DURATION = 10.5;

    // --- DOM Elements ---
    var stageEl = document.getElementById("subway-stage");
    var viewportEl = document.getElementById("subway-viewport");
    var canvasEl = document.getElementById("subway-canvas");
    var speedLinesEl = document.getElementById("ss-speed-lines");

    var hudScoreEl = document.getElementById("ss-hud-score");
    var hudCoinsEl = document.getElementById("ss-hud-coins");
    var hudMultEl = document.getElementById("ss-hud-mult");
    var hudComboEl = document.getElementById("ss-hud-combo");
    var hudSpeedEl = document.getElementById("ss-hud-speed");
    var hudBoardsEl = document.getElementById("ss-hud-boards");
    var hudBiomeEl = document.getElementById("ss-hud-biome");
    var hudDistEl = document.getElementById("ss-hud-dist");
    var btnBoardTop = document.getElementById("ss-btn-board-top");
    var btnRestart = document.getElementById("ss-btn-restart");
    var chasePillEl = document.getElementById("ss-chase-pill");
    var powerupsStackEl = document.getElementById("ss-powerups-stack");
    var popBannerEl = document.getElementById("ss-pop-banner");
    var popupLayerEl = document.getElementById("ss-popup-layer");

    var touchLeftBtn = document.getElementById("ss-touch-left");
    var touchRightBtn = document.getElementById("ss-touch-right");
    var touchJumpBtn = document.getElementById("ss-touch-jump");
    var touchRollBtn = document.getElementById("ss-touch-roll");
    var touchBoardBtn = document.getElementById("ss-touch-board");
    var touchBoardCountEl = document.getElementById("ss-touch-board-count");

    var startOverlay = document.getElementById("subway-start-overlay");
    var overOverlay = document.getElementById("subway-over-overlay");
    var startBtn = document.getElementById("subway-start-btn");
    var againBtn = document.getElementById("subway-again-btn");
    var overRecordBanner = document.getElementById("subway-record-banner");
    var overBadge = document.getElementById("subway-over-badge");
    var overTitle = document.getElementById("subway-over-title");
    var overBreakdown = document.getElementById("subway-over-breakdown");
    var overScore = document.getElementById("subway-over-score");
    var overCombo = document.getElementById("subway-over-combo");
    var overBest = document.getElementById("subway-over-best");
    var overRank = document.getElementById("subway-over-rank");
    var overSaveStatus = document.getElementById("subway-save-status");

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

    var noiseBuf = null;
    function ensureNoiseBuffer(ctx) {
        if (noiseBuf && noiseBuf.sampleRate === ctx.sampleRate) return noiseBuf;
        var len = Math.floor(ctx.sampleRate * 0.5);
        var buf = ctx.createBuffer(1, len, ctx.sampleRate);
        var data = buf.getChannelData(0);
        for (var i = 0; i < len; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        noiseBuf = buf;
        return buf;
    }

    function playSwipeSfx() {
        var ctx = getAudioCtx();
        if (!ctx) return;
        try {
            var now = ctx.currentTime;
            var osc = ctx.createOscillator();
            var g = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(240, now);
            osc.frequency.exponentialRampToValueAtTime(420, now + 0.065);
            g.gain.setValueAtTime(0.065, now);
            g.gain.exponentialRampToValueAtTime(0.001, now + 0.075);
            osc.connect(g);
            g.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.08);
        } catch (e) {}
    }

    function playJumpSfx(superJump) {
        var ctx = getAudioCtx();
        if (!ctx) return;
        try {
            var now = ctx.currentTime;
            var osc = ctx.createOscillator();
            var g = ctx.createGain();
            osc.type = "triangle";
            osc.frequency.setValueAtTime(superJump ? 260 : 210, now);
            osc.frequency.exponentialRampToValueAtTime(superJump ? 760 : 540, now + 0.14);
            g.gain.setValueAtTime(0.095, now);
            g.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
            osc.connect(g);
            g.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.17);
        } catch (e) {}
    }

    function playRollSfx() {
        var ctx = getAudioCtx();
        if (!ctx) return;
        try {
            var now = ctx.currentTime;
            var osc = ctx.createOscillator();
            var g = ctx.createGain();
            osc.type = "triangle";
            osc.frequency.setValueAtTime(340, now);
            osc.frequency.exponentialRampToValueAtTime(110, now + 0.11);
            g.gain.setValueAtTime(0.07, now);
            g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
            osc.connect(g);
            g.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.13);
        } catch (e) {}
    }

    function playCoinSfx(streak) {
        var ctx = getAudioCtx();
        if (!ctx) return;
        try {
            var scale = [783.99, 880.0, 987.77, 1046.5, 1174.66, 1318.51, 1567.98, 1760.0];
            var freq = scale[Math.min(streak % scale.length, scale.length - 1)];
            var now = ctx.currentTime;
            var osc = ctx.createOscillator();
            var g = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, now);
            osc.frequency.setValueAtTime(freq * 1.25, now + 0.035);
            g.gain.setValueAtTime(0.075, now);
            g.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
            osc.connect(g);
            g.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.14);
        } catch (e) {}
    }

    function playPowerupSfx() {
        var ctx = getAudioCtx();
        if (!ctx) return;
        try {
            var now = ctx.currentTime;
            var notes = [523.25, 659.25, 783.99, 1046.5];
            for (var i = 0; i < notes.length; i++) {
                var osc = ctx.createOscillator();
                var g = ctx.createGain();
                osc.type = "triangle";
                var t = now + i * 0.05;
                osc.frequency.setValueAtTime(notes[i], t);
                g.gain.setValueAtTime(0.09, t);
                g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
                osc.connect(g);
                g.connect(ctx.destination);
                osc.start(t);
                osc.stop(t + 0.23);
            }
        } catch (e) {}
    }

    function playBoardActivateSfx() {
        var ctx = getAudioCtx();
        if (!ctx) return;
        try {
            var now = ctx.currentTime;
            var osc = ctx.createOscillator();
            var g = ctx.createGain();
            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.exponentialRampToValueAtTime(660, now + 0.16);
            g.gain.setValueAtTime(0.065, now);
            g.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
            osc.connect(g);
            g.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.25);
        } catch (e) {}
    }

    function playBoardBlastSfx() {
        var ctx = getAudioCtx();
        if (!ctx) return;
        try {
            var now = ctx.currentTime;
            var src = ctx.createBufferSource();
            src.buffer = ensureNoiseBuffer(ctx);
            var flt = ctx.createBiquadFilter();
            flt.type = "bandpass";
            flt.frequency.setValueAtTime(1100, now);
            flt.frequency.exponentialRampToValueAtTime(180, now + 0.32);
            var g = ctx.createGain();
            g.gain.setValueAtTime(0.18, now);
            g.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
            src.connect(flt);
            flt.connect(g);
            g.connect(ctx.destination);
            src.start(now);
            src.stop(now + 0.35);

            var osc = ctx.createOscillator();
            var og = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(160, now);
            osc.frequency.exponentialRampToValueAtTime(42, now + 0.3);
            og.gain.setValueAtTime(0.16, now);
            og.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
            osc.connect(og);
            og.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.33);
        } catch (e) {}
    }

    function playWhistleSfx() {
        var ctx = getAudioCtx();
        if (!ctx) return;
        try {
            var now = ctx.currentTime;
            var osc1 = ctx.createOscillator();
            var osc2 = ctx.createOscillator();
            var g = ctx.createGain();
            osc1.type = "sine";
            osc2.type = "sine";
            osc1.frequency.setValueAtTime(2650, now);
            osc2.frequency.setValueAtTime(2980, now);
            osc1.frequency.setValueAtTime(2780, now + 0.08);
            osc2.frequency.setValueAtTime(3120, now + 0.08);
            g.gain.setValueAtTime(0.055, now);
            g.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
            osc1.connect(g);
            osc2.connect(g);
            g.connect(ctx.destination);
            osc1.start(now);
            osc2.start(now);
            osc1.stop(now + 0.27);
            osc2.stop(now + 0.27);
        } catch (e) {}
    }

    function playCrashSfx() {
        var ctx = getAudioCtx();
        if (!ctx) return;
        try {
            var now = ctx.currentTime;
            var src = ctx.createBufferSource();
            src.buffer = ensureNoiseBuffer(ctx);
            var flt = ctx.createBiquadFilter();
            flt.type = "lowpass";
            flt.frequency.setValueAtTime(820, now);
            flt.frequency.exponentialRampToValueAtTime(90, now + 0.42);
            var g = ctx.createGain();
            g.gain.setValueAtTime(0.22, now);
            g.gain.exponentialRampToValueAtTime(0.001, now + 0.44);
            src.connect(flt);
            flt.connect(g);
            g.connect(ctx.destination);
            src.start(now);
            src.stop(now + 0.45);

            var osc = ctx.createOscillator();
            var og = ctx.createGain();
            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(140, now);
            osc.frequency.exponentialRampToValueAtTime(34, now + 0.36);
            og.gain.setValueAtTime(0.14, now);
            og.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
            osc.connect(og);
            og.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.39);
        } catch (e) {}
    }

    function playExpressHornSfx() {
        var ctx = getAudioCtx();
        if (!ctx) return;
        try {
            var now = ctx.currentTime;
            var freqs = [185, 233.08];
            for (var i = 0; i < freqs.length; i++) {
                var osc = ctx.createOscillator();
                var flt = ctx.createBiquadFilter();
                var g = ctx.createGain();
                osc.type = "sawtooth";
                osc.frequency.setValueAtTime(freqs[i], now);
                osc.frequency.linearRampToValueAtTime(freqs[i] * 0.88, now + 0.36);
                flt.type = "lowpass";
                flt.frequency.setValueAtTime(680, now);
                g.gain.setValueAtTime(0.001, now);
                g.gain.linearRampToValueAtTime(0.052, now + 0.04);
                g.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
                osc.connect(flt);
                flt.connect(g);
                g.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.38);
            }
        } catch (e) {}
    }

    function playLandSfx(strength) {
        var ctx = getAudioCtx();
        if (!ctx) return;
        try {
            var now = ctx.currentTime;
            var osc = ctx.createOscillator();
            var g = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(110, now);
            osc.frequency.exponentialRampToValueAtTime(48, now + 0.09);
            g.gain.setValueAtTime(Math.min(0.11, 0.04 + strength * 0.05), now);
            g.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            osc.connect(g);
            g.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.11);
        } catch (e) {}
    }

    // --- Game State ---
    var ssState = {
        active: false,
        mode: "idle", // "idle" | "playing" | "crashing" | "gameover"
        score: 0,
        coins: 0,
        runCoinsForBoard: 0,
        boards: 1,
        combo: 0,
        maxCombo: 0,
        comboDecayTimer: 0,
        closeCalls: 0,
        distance: 0,
        speed: BASE_SPEED,
        baseMult: 1,
        elapsed: 0,
        crashTimer: 0,
        crashReason: "Crashed!",
        trauma: 0,
        bannerTimer: 0,
        nextChunkZ: -42,
        chunkCount: 0,
        lastPatternIdx: -1,
        biomeIdx: 0,
        lastHornTime: -10,
        gameId: 0,
        submitted: false,
        leaderboard: null,
        animFrame: null,
        lastTime: 0,
        worldScrollZ: 0,
        player: {
            lane: 0,
            targetLane: 0,
            prevLane: 0,
            x: 0,
            y: 0,
            vy: 0,
            groundY: 0,
            rolling: false,
            rollTimer: 0,
            coyoteTimer: 0,
            invulnTimer: 0,
            stumbleTimer: 0,
            hoverboardTimer: 0,
            jetpackTimer: 0,
            magnetTimer: 0,
            sneakersTimer: 0,
            multTimer: 0,
            runPhase: 0,
            tiltRoll: 0,
            flipAngle: 0,
            squashY: 1,
            squashX: 1,
            queuedAction: null,
            queuedTimer: 0
        },
        obstacles: [],
        coinsList: [],
        powerups: [],
        popups: []
    };

    var BIOMES = [
        {
            name: "NIGHT METRO",
            banner: "NIGHT METRO",
            badgeBg: "rgba(15, 23, 42, 0.76)",
            badgeBorder: "rgba(56, 189, 248, 0.45)",
            badgeColor: "#bae6fd",
            sky: 0x1b254b,
            fog: 0x2d1e4f,
            fogDensity: 0.0080,
            hemiSky: 0xcbe8ff,
            hemiGround: 0x2b243d,
            sun: 0xffe5b8,
            rim: 0x38bdf8,
            lamp: 0xfef08a,
            skyTop: "#1d2b64",
            skyMid: "#4c1d95",
            skyHorizon: "#ea580c",
            ground2d: "#1e293b",
            showTunnel: false,
            showBridge: false,
            showWalls: true
        },
        {
            name: "NEON TUNNEL",
            banner: "ENTERING NEON TUNNEL!",
            badgeBg: "rgba(49, 16, 66, 0.85)",
            badgeBorder: "rgba(232, 121, 249, 0.65)",
            badgeColor: "#f5d0fe",
            sky: 0x070a18,
            fog: 0x170f2e,
            fogDensity: 0.0112,
            hemiSky: 0x67e8f9,
            hemiGround: 0x1e1b4b,
            sun: 0x818cf8,
            rim: 0xf43f5e,
            lamp: 0x22d3ee,
            skyTop: "#090d1f",
            skyMid: "#1e1b4b",
            skyHorizon: "#701a75",
            ground2d: "#111827",
            showTunnel: true,
            showBridge: false,
            showWalls: true
        },
        {
            name: "HARBOR BRIDGE",
            banner: "CROSSING HARBOR BRIDGE!",
            badgeBg: "rgba(8, 51, 68, 0.84)",
            badgeBorder: "rgba(34, 211, 238, 0.65)",
            badgeColor: "#a5f3fc",
            sky: 0x0c4a6e,
            fog: 0x0369a1,
            fogDensity: 0.0062,
            hemiSky: 0xe0f2fe,
            hemiGround: 0x1e3a5f,
            sun: 0xfef08a,
            rim: 0x22d3ee,
            lamp: 0xfde047,
            skyTop: "#082f49",
            skyMid: "#0284c7",
            skyHorizon: "#38bdf8",
            ground2d: "#1e3a5f",
            showTunnel: false,
            showBridge: true,
            showWalls: false
        },
        {
            name: "GOLDEN SUNSET",
            banner: "GOLDEN HOUR DASH!",
            badgeBg: "rgba(67, 20, 7, 0.85)",
            badgeBorder: "rgba(251, 146, 60, 0.68)",
            badgeColor: "#fed7aa",
            sky: 0x581c2c,
            fog: 0xb45309,
            fogDensity: 0.0072,
            hemiSky: 0xfde68a,
            hemiGround: 0x451a03,
            sun: 0xfdba74,
            rim: 0xf43f5e,
            lamp: 0xfdba74,
            skyTop: "#451a03",
            skyMid: "#9a3412",
            skyHorizon: "#facc15",
            ground2d: "#27272a",
            showTunnel: false,
            showBridge: false,
            showWalls: true
        }
    ];

    var ssInput = {
        lastTapTime: 0
    };

    // --- Three.js Scene & Shared Assets ---
    var useThree = false;
    var fallbackCtx = null;
    var threeRenderer = null;
    var threeScene = null;
    var threeCamera = null;
    var sunLight = null;
    var hemiLight = null;
    var rimLight = null;
    var gantryLampMat = null;
    var sharedGeo = {};
    var sharedMat = {};
    var textures = {};

    var surferRig = null;
    var inspectorRig = null;
    var trackMeshes = [];
    var wallMeshes = [];
    var waterMesh = null;
    var gantryPool = [];
    var gantrySignalMeshes = [];
    var tunnelArchPool = [];
    var bridgeTowerPool = [];
    var laneWarnMeshes = {};
    var buildingPool = [];
    var particlePool = [];
    var dustRingPool = [];

    var meshPools = {
        low: [],
        high: [],
        tall: [],
        train: [],
        rampTrain: [],
        movingTrain: [],
        coin: [],
        powerup: []
    };

    // =========================================================================
    // --- Procedural Canvas Textures ---
    // =========================================================================

    function makeCanvas(w, h) {
        var c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        return c;
    }

    function createSubwayTextures() {
        var out = {};

        // 1. Trackbed gravel + wooden ties + steel rails (seamless vertical repeat)
        var trackC = makeCanvas(256, 256);
        var tctx = trackC.getContext("2d");
        tctx.fillStyle = "#2b303c";
        tctx.fillRect(0, 0, 256, 256);
        // Gravel speckles
        for (var i = 0; i < 650; i++) {
            var gx = (i * 73) % 256;
            var gy = (i * 137) % 256;
            tctx.fillStyle = i % 3 === 0 ? "#3c4353" : i % 3 === 1 ? "#20242e" : "#495264";
            tctx.fillRect(gx, gy, 3, 2);
        }
        // Wooden railway ties across each of the 3 lanes
        var laneCenters = [44, 128, 212];
        for (var row = 0; row < 8; row++) {
            var ty = row * 32 + 6;
            for (var l = 0; l < 3; l++) {
                var cx = laneCenters[l];
                tctx.fillStyle = "#5c3d28";
                tctx.fillRect(cx - 32, ty, 64, 10);
                tctx.fillStyle = "#432b1c";
                tctx.fillRect(cx - 32, ty + 8, 64, 2);
                // Rail plates
                tctx.fillStyle = "#94a3b8";
                tctx.fillRect(cx - 22, ty + 1, 6, 8);
                tctx.fillRect(cx + 16, ty + 1, 6, 8);
            }
        }
        // Shiny twin steel rails per lane
        for (var r = 0; r < 3; r++) {
            var lx = laneCenters[r];
            tctx.fillStyle = "#94a3b8";
            tctx.fillRect(lx - 21, 0, 4, 256);
            tctx.fillRect(lx + 17, 0, 4, 256);
            tctx.fillStyle = "#e2e8f0";
            tctx.fillRect(lx - 20, 0, 2, 256);
            tctx.fillRect(lx + 18, 0, 2, 256);
        }
        out.track = new THREE.CanvasTexture(trackC);
        out.track.wrapS = THREE.RepeatWrapping;
        out.track.wrapT = THREE.RepeatWrapping;
        out.track.repeat.set(1, 22);

        // 2. Concrete Station Platform with Yellow Hazard Curb
        var platC = makeCanvas(128, 256);
        var pctx = platC.getContext("2d");
        pctx.fillStyle = "#475569";
        pctx.fillRect(0, 0, 128, 256);
        for (var py = 0; py < 256; py += 64) {
            pctx.fillStyle = "#334155";
            pctx.fillRect(0, py, 128, 3);
            pctx.fillStyle = "#64748b";
            pctx.fillRect(4, py + 6, 120, 52);
        }
        // Yellow tactile edge strip on left (inner edge is UV mapped carefully)
        pctx.fillStyle = "#facc15";
        pctx.fillRect(0, 0, 18, 256);
        pctx.fillStyle = "#1e293b";
        for (var sy = 0; sy < 256; sy += 32) {
            pctx.fillRect(0, sy, 18, 12);
        }
        out.platform = new THREE.CanvasTexture(platC);
        out.platform.wrapS = THREE.RepeatWrapping;
        out.platform.wrapT = THREE.RepeatWrapping;
        out.platform.repeat.set(1, 20);

        out.platformLeft = new THREE.CanvasTexture(platC);
        out.platformLeft.wrapS = THREE.RepeatWrapping;
        out.platformLeft.wrapT = THREE.RepeatWrapping;
        out.platformLeft.repeat.set(-1, 20);

        // 3. Graffiti Brick Retaining Wall
        var wallC = makeCanvas(256, 256);
        var wctx = wallC.getContext("2d");
        wctx.fillStyle = "#3b2f3d";
        wctx.fillRect(0, 0, 256, 256);
        wctx.fillStyle = "#4b3b4e";
        for (var wy = 0; wy < 256; wy += 16) {
            var offset = (wy / 16) % 2 === 0 ? 0 : 16;
            for (var wx = -16; wx < 256; wx += 32) {
                wctx.fillRect(wx + offset + 2, wy + 2, 28, 12);
            }
        }
        // Colorful spray-paint graffiti splashes
        wctx.fillStyle = "rgba(34, 211, 238, 0.78)";
        wctx.beginPath();
        wctx.arc(68, 128, 36, 0, Math.PI * 2);
        wctx.fill();
        wctx.fillStyle = "rgba(249, 115, 22, 0.84)";
        wctx.fillRect(44, 108, 72, 26);
        wctx.fillStyle = "rgba(250, 204, 21, 0.85)";
        wctx.beginPath();
        wctx.arc(185, 110, 32, 0, Math.PI * 2);
        wctx.fill();
        wctx.fillStyle = "rgba(236, 72, 153, 0.8)";
        wctx.fillRect(142, 120, 84, 24);
        out.wall = new THREE.CanvasTexture(wallC);
        out.wall.wrapS = THREE.RepeatWrapping;
        out.wall.wrapT = THREE.RepeatWrapping;
        out.wall.repeat.set(10, 1);

        out.wallRight = new THREE.CanvasTexture(wallC);
        out.wallRight.wrapS = THREE.RepeatWrapping;
        out.wallRight.wrapT = THREE.RepeatWrapping;
        out.wallRight.repeat.set(10, 1);

        // 4. 4 Vibrant Subway Train Liveries
        var trainPalettes = [
            { num: "01", body: "#0284c7", roof: "#e2e8f0", stripe: "#f97316", accent: "#facc15", spray: "#22d3ee", spray2: "#f43f5e" },
            { num: "07", body: "#ea580c", roof: "#fef3c7", stripe: "#facc15", accent: "#fef08a", spray: "#38bdf8", spray2: "#a855f7" },
            { num: "42", body: "#6d28d9", roof: "#ede9fe", stripe: "#ec4899", accent: "#22d3ee", spray: "#a3e635", spray2: "#facc15" },
            { num: "99", body: "#dc2626", roof: "#f1f5f9", stripe: "#f8fafc", accent: "#facc15", spray: "#fb923c", spray2: "#38bdf8" }
        ];
        out.trains = trainPalettes.map(function (pal) {
            var c = makeCanvas(256, 128);
            var ctx = c.getContext("2d");
            ctx.fillStyle = pal.body;
            ctx.fillRect(0, 0, 256, 128);
            // Upper roofline band + rivets
            ctx.fillStyle = pal.roof;
            ctx.fillRect(0, 0, 256, 11);
            ctx.fillStyle = "#334155";
            for (var rv = 8; rv < 256; rv += 16) {
                ctx.fillRect(rv, 6, 3, 3);
            }
            // Lower metallic skirt
            ctx.fillStyle = "#0f172a";
            ctx.fillRect(0, 104, 256, 24);
            ctx.fillStyle = "#334155";
            ctx.fillRect(0, 104, 256, 4);
            // Express racing stripe
            ctx.fillStyle = pal.stripe;
            ctx.fillRect(0, 74, 256, 17);
            ctx.fillStyle = pal.accent;
            ctx.fillRect(0, 91, 256, 5);

            // Sliding Passenger Doors (2 double-leaf bays) + Passenger Windows
            var doors = [36, 168];
            for (var d = 0; d < doors.length; d++) {
                var dx = doors[d];
                ctx.fillStyle = "#1e293b";
                ctx.fillRect(dx - 2, 16, 48, 88);
                ctx.fillStyle = pal.body;
                ctx.fillRect(dx, 18, 44, 86);
                // Yellow caution door frame
                ctx.fillStyle = "#facc15";
                ctx.fillRect(dx, 18, 2, 86);
                ctx.fillRect(dx + 42, 18, 2, 86);
                // Center rubber seam
                ctx.fillStyle = "#090d16";
                ctx.fillRect(dx + 21, 18, 2, 86);
                // Narrow vertical door glass panes
                ctx.fillStyle = "#0f172a";
                ctx.fillRect(dx + 5, 25, 13, 36);
                ctx.fillRect(dx + 26, 25, 13, 36);
                ctx.fillStyle = "#38bdf8";
                ctx.globalAlpha = 0.28;
                ctx.fillRect(dx + 7, 27, 4, 30);
                ctx.fillRect(dx + 28, 27, 4, 30);
                ctx.globalAlpha = 1;
            }
            // Side passenger windows between doors
            var winXs = [10, 96, 128, 224];
            for (var wx = 0; wx < winXs.length; wx++) {
                var x = winXs[wx];
                ctx.fillStyle = "#0f172a";
                ctx.fillRect(x, 22, 24, 36);
                ctx.fillStyle = "#7dd3fc";
                ctx.globalAlpha = 0.28;
                ctx.fillRect(x + 2, 24, 8, 30);
                ctx.globalAlpha = 1;
            }
            // Car Number badge
            ctx.fillStyle = "#0f172a";
            ctx.fillRect(102, 64, 38, 18);
            ctx.fillStyle = "#fef08a";
            ctx.font = "bold 12px monospace";
            ctx.textAlign = "center";
            ctx.fillText("EXP " + pal.num, 121, 77);
            // Stylized two-layer graffiti spray tag
            ctx.fillStyle = pal.spray;
            ctx.globalAlpha = 0.72;
            ctx.beginPath();
            ctx.arc(146, 84, 16, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = pal.spray2;
            ctx.globalAlpha = 0.65;
            ctx.beginPath();
            ctx.arc(158, 76, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
            return new THREE.CanvasTexture(c);
        });

        // 4b. Metro Station Arrival LED Signboard Texture
        var arrC = makeCanvas(256, 64);
        var actx = arrC.getContext("2d");
        actx.fillStyle = "#090d16";
        actx.fillRect(0, 0, 256, 64);
        actx.strokeStyle = "#38bdf8";
        actx.lineWidth = 4;
        actx.strokeRect(4, 4, 248, 56);
        actx.fillStyle = "#22d3ee";
        actx.font = "bold 19px monospace";
        actx.textAlign = "center";
        actx.fillText("METRO EXP  //  CENTRAL", 128, 30);
        actx.fillStyle = "#facc15";
        actx.font = "bold 15px monospace";
        actx.fillText("WATCH EXPRESS TRACKS", 128, 50);
        out.arrivalBoard = new THREE.CanvasTexture(arrC);

        // 5. Yellow-Black Chevron Ramp Texture
        var rampC = makeCanvas(128, 128);
        var rctx = rampC.getContext("2d");
        rctx.fillStyle = "#facc15";
        rctx.fillRect(0, 0, 128, 128);
        rctx.fillStyle = "#1e293b";
        for (var ry = -64; ry < 192; ry += 32) {
            rctx.beginPath();
            rctx.moveTo(0, ry + 20);
            rctx.lineTo(64, ry);
            rctx.lineTo(128, ry + 20);
            rctx.lineTo(128, ry + 32);
            rctx.lineTo(64, ry + 12);
            rctx.lineTo(0, ry + 32);
            rctx.closePath();
            rctx.fill();
        }
        out.ramp = new THREE.CanvasTexture(rampC);

        // 6. Overhead Caution Sign Texture (Roll under!)
        var gateC = makeCanvas(256, 96);
        var gctx = gateC.getContext("2d");
        gctx.fillStyle = "#f59e0b";
        gctx.fillRect(0, 0, 256, 96);
        gctx.fillStyle = "#1e293b";
        gctx.fillRect(8, 8, 240, 80);
        // Hazard stripes top/bottom
        gctx.fillStyle = "#facc15";
        for (var hx = 0; hx < 256; hx += 24) {
            gctx.fillRect(hx, 0, 12, 8);
            gctx.fillRect(hx + 12, 88, 12, 8);
        }
        // Downward chevrons
        gctx.fillStyle = "#ef4444";
        for (var ax = 36; ax <= 220; ax += 46) {
            gctx.beginPath();
            gctx.moveTo(ax - 14, 28);
            gctx.lineTo(ax + 14, 28);
            gctx.lineTo(ax, 66);
            gctx.closePath();
            gctx.fill();
        }
        out.gate = new THREE.CanvasTexture(gateC);

        return out;
    }

    // =========================================================================
    // --- Shared Geometries & Materials + Articulated Rigs ---
    // =========================================================================

    function ensureSharedAssets() {
        if (sharedGeo.coin) return;

        textures = createSubwayTextures();

        sharedGeo.coin = new THREE.CylinderGeometry(0.46, 0.46, 0.14, 14);
        sharedGeo.coin.rotateX(Math.PI / 2);
        sharedGeo.coinRim = new THREE.CylinderGeometry(0.30, 0.30, 0.16, 12);
        sharedGeo.coinRim.rotateX(Math.PI / 2);

        sharedGeo.lowPost = new THREE.BoxGeometry(0.18, 1.05, 0.18);
        sharedGeo.lowPlank = new THREE.BoxGeometry(2.55, 0.42, 0.22);
        sharedGeo.gatePost = new THREE.BoxGeometry(0.18, 2.75, 0.18);
        sharedGeo.gateBoard = new THREE.BoxGeometry(2.65, 1.08, 0.28);
        sharedGeo.tallBlock = new THREE.BoxGeometry(2.35, 2.75, 1.05);
        sharedGeo.tallTopStripe = new THREE.BoxGeometry(2.42, 0.28, 1.1);

        sharedGeo.trainBody = new THREE.BoxGeometry(2.58, TRAIN_HEIGHT - 0.35, 13.5);
        sharedGeo.trainBogie = new THREE.BoxGeometry(2.15, 0.42, 12.6);
        sharedGeo.trainRoof = new THREE.BoxGeometry(2.26, 0.22, 13.1);
        sharedGeo.trainVent = new THREE.BoxGeometry(1.15, 0.24, 1.85);
        sharedGeo.trainWindshield = new THREE.BoxGeometry(2.05, 0.92, 0.14);
        sharedGeo.trainLight = new THREE.SphereGeometry(0.21, 10, 10);
        sharedGeo.trainBeam = new THREE.ConeGeometry(1.1, 6.5, 12, 1, true);
        sharedGeo.trainBeam.rotateX(Math.PI / 2);

        // Ramp wedge from z = +RAMP_LEN/2 (y = 0) up to z = -RAMP_LEN/2 (y = TRAIN_HEIGHT)
        var halfR = RAMP_LEN / 2;
        var rw = 1.25;
        var rh = TRAIN_HEIGHT;
        var rampGeo = new THREE.BufferGeometry();
        var verts = new Float32Array([
            // Slope face (2 tris)
            -rw, 0, halfR,    rw, 0, halfR,    rw, rh, -halfR,
            -rw, 0, halfR,    rw, rh, -halfR, -rw, rh, -halfR,
            // Left triangle side
            -rw, 0, halfR,   -rw, rh, -halfR, -rw, 0, -halfR,
            // Right triangle side
             rw, 0, halfR,    rw, 0, -halfR,  rw, rh, -halfR,
            // Back vertical plate
            -rw, 0, -halfR,   rw, rh, -halfR,  rw, 0, -halfR,
            -rw, 0, -halfR,  -rw, rh, -halfR,  rw, rh, -halfR
        ]);
        var uvs = new Float32Array([
            0, 0,  1, 0,  1, 1,
            0, 0,  1, 1,  0, 1,
            0, 0,  1, 1,  1, 0,
            0, 0,  1, 0,  1, 1,
            0, 0,  1, 1,  1, 0,
            0, 0,  0, 1,  1, 1
        ]);
        rampGeo.setAttribute("position", new THREE.BufferAttribute(verts, 3));
        rampGeo.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
        rampGeo.computeVertexNormals();
        sharedGeo.ramp = rampGeo;

        sharedGeo.puRing = new THREE.TorusGeometry(0.62, 0.08, 8, 20);
        sharedGeo.puCore = new THREE.OctahedronGeometry(0.42, 0);
        sharedGeo.puBeacon = new THREE.CylinderGeometry(0.14, 0.36, 4.0, 10, 1, true);
        sharedGeo.spark = new THREE.BoxGeometry(0.22, 0.22, 0.22);
        sharedGeo.dustRing = new THREE.RingGeometry(0.42, 0.72, 20);
        sharedGeo.dustRing.rotateX(-Math.PI / 2);

        // Materials
        sharedMat.coin = new THREE.MeshStandardMaterial({
            color: 0xfacc15,
            emissive: 0xb45309,
            emissiveIntensity: 0.45,
            metalness: 0.72,
            roughness: 0.24
        });
        sharedMat.coinRim = new THREE.MeshStandardMaterial({
            color: 0xfef08a,
            emissive: 0xca8a04,
            emissiveIntensity: 0.35,
            metalness: 0.65,
            roughness: 0.28
        });
        sharedMat.lowPost = new THREE.MeshLambertMaterial({ color: 0xe2e8f0 });
        sharedMat.lowPlank = new THREE.MeshLambertMaterial({ color: 0xef4444 });
        sharedMat.lowStripe = new THREE.MeshLambertMaterial({ color: 0xf8fafc });
        sharedMat.gateBoard = new THREE.MeshLambertMaterial({ map: textures.gate });
        sharedMat.tallBlock = new THREE.MeshLambertMaterial({ color: 0x334155 });
        sharedMat.tallStripe = new THREE.MeshLambertMaterial({ color: 0xf97316 });

        sharedMat.trains = textures.trains.map(function (t) {
            return new THREE.MeshLambertMaterial({ map: t });
        });
        sharedMat.arrivalBoard = new THREE.MeshBasicMaterial({ map: textures.arrivalBoard });
        sharedMat.trainBogie = new THREE.MeshLambertMaterial({ color: 0x0f172a });
        sharedMat.trainRoof = new THREE.MeshLambertMaterial({ color: 0xcbd5e1 });
        sharedMat.trainVent = new THREE.MeshLambertMaterial({ color: 0x64748b });
        sharedMat.trainWindshield = new THREE.MeshLambertMaterial({ color: 0x0f172a, emissive: 0x0284c7, emissiveIntensity: 0.22 });
        sharedMat.expressMarquee = new THREE.MeshBasicMaterial({ color: 0xf97316 });
        sharedMat.staticMarquee = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
        sharedMat.headlight = new THREE.MeshBasicMaterial({ color: 0xfef08a });
        sharedMat.taillight = new THREE.MeshBasicMaterial({ color: 0xef4444 });
        sharedMat.headlightBeam = new THREE.MeshBasicMaterial({
            color: 0xfef9c3,
            transparent: true,
            opacity: 0.16,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide
        });
        sharedMat.ramp = new THREE.MeshLambertMaterial({ map: textures.ramp });

        sharedMat.powerups = {
            jetpack: new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0xea580c, emissiveIntensity: 0.85, roughness: 0.2 }),
            magnet: new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xdc2626, emissiveIntensity: 0.8, roughness: 0.2 }),
            sneakers: new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x16a34a, emissiveIntensity: 0.8, roughness: 0.2 }),
            multiplier: new THREE.MeshStandardMaterial({ color: 0xa855f7, emissive: 0x9333ea, emissiveIntensity: 0.85, roughness: 0.2 }),
            board: new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x0891b2, emissiveIntensity: 0.9, roughness: 0.15 })
        };
        sharedMat.puRing = new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.78 });
        sharedMat.puBeacon = new THREE.MeshBasicMaterial({
            color: 0x38bdf8,
            transparent: true,
            opacity: 0.18,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide
        });
    }

    function createSurferRig() {
        var root = new THREE.Group();
        var tiltGroup = new THREE.Group();
        root.add(tiltGroup);

        var hoodieMat = new THREE.MeshLambertMaterial({ color: 0x06b6d4 });
        var jeansMat = new THREE.MeshLambertMaterial({ color: 0x1e3a8a });
        var skinMat = new THREE.MeshLambertMaterial({ color: 0xf5c79e });
        var capMat = new THREE.MeshLambertMaterial({ color: 0xef4444 });
        var capVisorMat = new THREE.MeshLambertMaterial({ color: 0xfacc15 });
        var shoeMat = new THREE.MeshLambertMaterial({ color: 0xf97316 });
        var soleMat = new THREE.MeshLambertMaterial({ color: 0xf8fafc });
        var packMat = new THREE.MeshLambertMaterial({ color: 0xf97316 });
        var hairMat = new THREE.MeshLambertMaterial({ color: 0x1f2937 });
        var superShoeMat = new THREE.MeshBasicMaterial({ color: 0x4ade80 });

        // Torso
        var torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.72, 0.38), hoodieMat);
        torso.position.set(0, 1.05, 0);
        torso.castShadow = true;
        tiltGroup.add(torso);

        // Backpack (faces +Z toward camera!)
        var pack = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.54, 0.24), packMat);
        pack.position.set(0, 1.06, 0.28);
        pack.castShadow = true;
        tiltGroup.add(pack);

        // Head & Backwards Cap
        var headGroup = new THREE.Group();
        headGroup.position.set(0, 1.62, 0);
        tiltGroup.add(headGroup);

        var head = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.44, 0.44), skinMat);
        head.castShadow = true;
        headGroup.add(head);

        var capCrown = new THREE.Mesh(new THREE.BoxGeometry(0.47, 0.18, 0.47), capMat);
        capCrown.position.set(0, 0.17, 0);
        headGroup.add(capCrown);

        // Backwards visor sticking toward +Z
        var capVisor = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 0.26), capVisorMat);
        capVisor.position.set(0, 0.10, 0.28);
        headGroup.add(capVisor);

        var hair = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.12, 0.12), hairMat);
        hair.position.set(0, 0.02, -0.2);
        headGroup.add(hair);

        // Headphones
        var hpL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.2), soleMat);
        hpL.position.set(-0.24, 0.02, 0);
        var hpR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.2), soleMat);
        hpR.position.set(0.24, 0.02, 0);
        headGroup.add(hpL);
        headGroup.add(hpR);

        // Hinged Arms
        var armGeo = new THREE.BoxGeometry(0.18, 0.56, 0.2);
        var leftArm = new THREE.Group();
        leftArm.position.set(-0.42, 1.32, 0);
        var leftArmMesh = new THREE.Mesh(armGeo, hoodieMat);
        leftArmMesh.position.set(0, -0.24, 0);
        leftArmMesh.castShadow = true;
        leftArm.add(leftArmMesh);
        var leftHand = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.16), skinMat);
        leftHand.position.set(0, -0.54, 0);
        leftArm.add(leftHand);
        tiltGroup.add(leftArm);

        var rightArm = new THREE.Group();
        rightArm.position.set(0.42, 1.32, 0);
        var rightArmMesh = new THREE.Mesh(armGeo, hoodieMat);
        rightArmMesh.position.set(0, -0.24, 0);
        rightArmMesh.castShadow = true;
        rightArm.add(rightArmMesh);
        var rightHand = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.16), skinMat);
        rightHand.position.set(0, -0.54, 0);
        rightArm.add(rightHand);
        tiltGroup.add(rightArm);

        // Hinged Legs + Chunky Skate Sneakers + Super Sneaker Glow
        var legGeo = new THREE.BoxGeometry(0.24, 0.52, 0.26);
        var shoeGeo = new THREE.BoxGeometry(0.27, 0.18, 0.42);
        var soleGeo = new THREE.BoxGeometry(0.28, 0.07, 0.44);
        var superGeo = new THREE.BoxGeometry(0.35, 0.14, 0.52);

        function buildLeg(xOffset) {
            var leg = new THREE.Group();
            leg.position.set(xOffset, 0.72, 0);
            var limb = new THREE.Mesh(legGeo, jeansMat);
            limb.position.set(0, -0.24, 0);
            limb.castShadow = true;
            leg.add(limb);

            var shoe = new THREE.Mesh(shoeGeo, shoeMat);
            shoe.position.set(0, -0.56, -0.05);
            shoe.castShadow = true;
            leg.add(shoe);

            var sole = new THREE.Mesh(soleGeo, soleMat);
            sole.position.set(0, -0.66, -0.05);
            leg.add(sole);

            var superOverlay = new THREE.Mesh(superGeo, superShoeMat);
            superOverlay.position.set(0, -0.65, -0.05);
            superOverlay.visible = false;
            leg.add(superOverlay);

            return { group: leg, superMesh: superOverlay };
        }

        var leftLegData = buildLeg(-0.17);
        var rightLegData = buildLeg(0.17);
        tiltGroup.add(leftLegData.group);
        tiltGroup.add(rightLegData.group);

        // Hoverboard Rig (under feet!)
        var hoverboard = new THREE.Group();
        hoverboard.position.set(0, 0.06, 0);
        hoverboard.visible = false;
        var boardDeck = new THREE.Mesh(
            new THREE.BoxGeometry(0.68, 0.11, 1.85),
            new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: 0x0891b2, emissiveIntensity: 0.7, roughness: 0.25 })
        );
        var boardStripe = new THREE.Mesh(
            new THREE.BoxGeometry(0.24, 0.125, 1.65),
            new THREE.MeshBasicMaterial({ color: 0xf43f5e })
        );
        var boardGlow = new THREE.Mesh(
            new THREE.BoxGeometry(0.56, 0.06, 1.55),
            new THREE.MeshBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.72 })
        );
        boardGlow.position.y = -0.08;

        // Twin glowing neon wake ribbons extending backward (+Z behind the runner)
        var trailGroup = new THREE.Group();
        var trailMatC = new THREE.MeshBasicMaterial({
            color: 0x22d3ee,
            transparent: true,
            opacity: 0.55,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide
        });
        var trailMatM = new THREE.MeshBasicMaterial({
            color: 0xf43f5e,
            transparent: true,
            opacity: 0.48,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide
        });
        var ribbonGeo = new THREE.PlaneGeometry(0.18, 2.2);
        ribbonGeo.rotateX(-Math.PI / 2);
        var trailL = new THREE.Mesh(ribbonGeo, trailMatC);
        trailL.position.set(-0.22, -0.06, 1.85);
        var trailR = new THREE.Mesh(ribbonGeo, trailMatM);
        trailR.position.set(0.22, -0.06, 1.85);
        trailGroup.add(trailL, trailR);

        hoverboard.add(boardDeck);
        hoverboard.add(boardStripe);
        hoverboard.add(boardGlow);
        hoverboard.add(trailGroup);
        tiltGroup.add(hoverboard);

        // Jetpack Rig (twin rockets + flames)
        var jetpack = new THREE.Group();
        jetpack.position.set(0, 1.06, 0.36);
        jetpack.visible = false;
        var cylGeo = new THREE.CylinderGeometry(0.13, 0.14, 0.62, 10);
        var canisterMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.65, roughness: 0.25 });
        var flameGeo = new THREE.ConeGeometry(0.12, 0.55, 8);
        flameGeo.rotateX(Math.PI);
        var flameMat = new THREE.MeshBasicMaterial({ color: 0xfb923c });

        var jetL = new THREE.Mesh(cylGeo, canisterMat);
        jetL.position.set(-0.16, 0, 0);
        var jetR = new THREE.Mesh(cylGeo, canisterMat);
        jetR.position.set(0.16, 0, 0);
        var flameL = new THREE.Mesh(flameGeo, flameMat);
        flameL.position.set(-0.16, -0.52, 0);
        var flameR = new THREE.Mesh(flameGeo, flameMat);
        flameR.position.set(0.16, -0.52, 0);
        jetpack.add(jetL, jetR, flameL, flameR);
        tiltGroup.add(jetpack);

        // Magnet Halo
        var magnetHalo = new THREE.Mesh(
            new THREE.TorusGeometry(0.45, 0.06, 8, 18, Math.PI * 1.35),
            new THREE.MeshBasicMaterial({ color: 0xef4444 })
        );
        magnetHalo.position.set(0, 2.15, 0);
        magnetHalo.rotation.z = Math.PI * 0.8;
        magnetHalo.visible = false;
        tiltGroup.add(magnetHalo);

        // Blob ground shadow (separate from root Y so it stays on track/roof below runner!)
        var shadowMesh = new THREE.Mesh(
            new THREE.CircleGeometry(0.62, 16),
            new THREE.MeshBasicMaterial({ color: 0x020617, transparent: true, opacity: 0.45, depthWrite: false })
        );
        shadowMesh.rotation.x = -Math.PI / 2;

        return {
            root: root,
            tiltGroup: tiltGroup,
            leftArm: leftArm,
            rightArm: rightArm,
            leftLeg: leftLegData.group,
            rightLeg: rightLegData.group,
            superL: leftLegData.superMesh,
            superR: rightLegData.superMesh,
            hoverboard: hoverboard,
            boardTrail: trailGroup,
            jetpack: jetpack,
            flameL: flameL,
            flameR: flameR,
            magnetHalo: magnetHalo,
            shadowMesh: shadowMesh
        };
    }

    function createInspectorRig() {
        var root = new THREE.Group();

        var uniMat = new THREE.MeshLambertMaterial({ color: 0x1e3a8a });
        var capMat = new THREE.MeshLambertMaterial({ color: 0x0f172a });
        var skinMat = new THREE.MeshLambertMaterial({ color: 0xf1c29b });
        var badgeMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
        var dogMat = new THREE.MeshLambertMaterial({ color: 0xd97706 });
        var dogSpotMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });

        // Inspector group (offset left)
        var guard = new THREE.Group();
        guard.position.set(-0.85, 0, 0);
        root.add(guard);

        var gTorso = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.78, 0.44), uniMat);
        gTorso.position.y = 1.05;
        gTorso.castShadow = true;
        guard.add(gTorso);

        var gBadge = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.05), badgeMat);
        gBadge.position.set(0.16, 1.22, -0.23);
        guard.add(gBadge);

        var gHead = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.44, 0.44), skinMat);
        gHead.position.y = 1.66;
        guard.add(gHead);

        var gCap = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.16, 0.50), capMat);
        gCap.position.set(0, 1.92, 0);
        guard.add(gCap);

        var gArmL = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.56, 0.22), uniMat);
        gArmL.position.set(-0.50, 1.08, 0);
        var gArmR = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.56, 0.22), uniMat);
        gArmR.position.set(0.50, 1.08, 0);
        guard.add(gArmL, gArmR);

        var gLegL = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.62, 0.28), capMat);
        gLegL.position.set(-0.20, 0.34, 0);
        var gLegR = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.62, 0.28), capMat);
        gLegR.position.set(0.20, 0.34, 0);
        guard.add(gLegL, gLegR);

        // Police Hound group (offset right)
        var dog = new THREE.Group();
        dog.position.set(0.95, 0, -0.25);
        root.add(dog);

        var dBody = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.32, 0.72), dogMat);
        dBody.position.y = 0.42;
        dBody.castShadow = true;
        dog.add(dBody);

        var dSpot = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.16, 0.24), dogSpotMat);
        dSpot.position.set(0, 0.48, 0.08);
        dog.add(dSpot);

        var dHead = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.28, 0.32), dogMat);
        dHead.position.set(0, 0.62, -0.36);
        dog.add(dHead);

        var dEarL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.08), dogSpotMat);
        dEarL.position.set(-0.14, 0.76, -0.32);
        var dEarR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.08), dogSpotMat);
        dEarR.position.set(0.14, 0.76, -0.32);
        dog.add(dEarL, dEarR);

        return {
            root: root,
            guard: guard,
            gArmL: gArmL,
            gArmR: gArmR,
            gLegL: gLegL,
            gLegR: gLegR,
            dog: dog
        };
    }

    // =========================================================================
    // --- Track Environment & Object Pools ---
    // =========================================================================

    var laneSignalMats = [];

    function buildStaticWorld() {
        var bedGeo = new THREE.PlaneGeometry(TRACK_HALF_W * 2, 220);
        bedGeo.rotateX(-Math.PI / 2);
        var bedMat = new THREE.MeshLambertMaterial({ map: textures.track });
        var bed = new THREE.Mesh(bedGeo, bedMat);
        bed.position.set(0, 0, -88);
        bed.receiveShadow = true;
        threeScene.add(bed);
        trackMeshes.push(bed);

        // Harbor Water Plane beneath bridge (visible in Harbor Bridge biome)
        var waterGeo = new THREE.PlaneGeometry(180, 230);
        waterGeo.rotateX(-Math.PI / 2);
        var waterMat = new THREE.MeshBasicMaterial({ color: 0x0369a1 });
        waterMesh = new THREE.Mesh(waterGeo, waterMat);
        waterMesh.position.set(0, -1.8, -90);
        waterMesh.visible = false;
        threeScene.add(waterMesh);

        // Per-lane Track Express Warning Strips
        var warnStripGeo = new THREE.PlaneGeometry(2.25, 92);
        warnStripGeo.rotateX(-Math.PI / 2);
        for (var wl = -1; wl <= 1; wl++) {
            var warnMat = new THREE.MeshBasicMaterial({
                color: 0xef4444,
                transparent: true,
                opacity: 0.35,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            var warnMesh = new THREE.Mesh(warnStripGeo, warnMat);
            warnMesh.position.set(laneX(wl), 0.04, -48);
            warnMesh.visible = false;
            threeScene.add(warnMesh);
            laneWarnMeshes[wl] = warnMesh;
        }

        // Left & Right Concrete Platforms (mirror U on left so yellow caution curb faces the tracks)
        var platGeo = new THREE.BoxGeometry(5.6, 1.05, 220);
        var platLeftMat = new THREE.MeshLambertMaterial({ map: textures.platformLeft });
        var platRightMat = new THREE.MeshLambertMaterial({ map: textures.platform });

        var leftPlat = new THREE.Mesh(platGeo, platLeftMat);
        leftPlat.position.set(-(TRACK_HALF_W + 2.8), 0.50, -88);
        leftPlat.receiveShadow = true;
        threeScene.add(leftPlat);

        var rightPlat = new THREE.Mesh(platGeo, platRightMat);
        rightPlat.position.set(TRACK_HALF_W + 2.8, 0.50, -88);
        rightPlat.receiveShadow = true;
        threeScene.add(rightPlat);

        // Brick Graffiti Retaining Walls behind Platforms (separate materials so opposite faces scroll together)
        var wallGeo = new THREE.BoxGeometry(1.0, 5.2, 220);
        var leftWallMat = new THREE.MeshLambertMaterial({ map: textures.wall });
        var rightWallMat = new THREE.MeshLambertMaterial({ map: textures.wallRight });
        var leftWall = new THREE.Mesh(wallGeo, leftWallMat);
        leftWall.position.set(-(TRACK_HALF_W + 5.6), 2.6, -88);
        var rightWall = new THREE.Mesh(wallGeo, rightWallMat);
        rightWall.position.set(TRACK_HALF_W + 5.6, 2.6, -88);
        threeScene.add(leftWall, rightWall);
        wallMeshes.push(leftWall, rightWall);

        // Shared Per-Lane Gantry Express Signal Materials
        laneSignalMats = [
            new THREE.MeshBasicMaterial({ color: 0x38bdf8 }),
            new THREE.MeshBasicMaterial({ color: 0x38bdf8 }),
            new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
        ];

        // Overhead Catenary Gantries + Arrival Boards + Per-Lane Express Signals (Pooled & scrolled!)
        var postGeo = new THREE.BoxGeometry(0.32, 8.8, 0.32);
        var beamGeo = new THREE.BoxGeometry(TRACK_HALF_W * 2 + 1.6, 0.3, 0.36);
        var metalMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
        gantryLampMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
        var lampGeo = new THREE.BoxGeometry(0.65, 0.14, 0.24);
        var sigGeo = new THREE.BoxGeometry(0.56, 0.26, 0.32);
        var arrHousingGeo = new THREE.BoxGeometry(4.6, 1.0, 0.22);
        var arrFaceGeo = new THREE.PlaneGeometry(4.4, 0.88);
        var arrFrameMat = new THREE.MeshLambertMaterial({ color: 0x0f172a });

        for (var g = 0; g < 10; g++) {
            var gantry = new THREE.Group();
            var pL = new THREE.Mesh(postGeo, metalMat);
            pL.position.set(-(TRACK_HALF_W + 0.5), 4.4, 0);
            var pR = new THREE.Mesh(postGeo, metalMat);
            pR.position.set(TRACK_HALF_W + 0.5, 4.4, 0);
            var topBeam = new THREE.Mesh(beamGeo, metalMat);
            topBeam.position.set(0, 8.7, 0);
            gantry.add(pL, pR, topBeam);

            for (var l = -1; l <= 1; l++) {
                var lamp = new THREE.Mesh(lampGeo, gantryLampMat);
                lamp.position.set(l * LANE_WIDTH, 8.5, 0);
                var sig = new THREE.Mesh(sigGeo, laneSignalMats[l + 1]);
                sig.position.set(l * LANE_WIDTH, 8.18, 0.12);
                gantry.add(lamp, sig);
            }

            if (g % 3 === 1) {
                var boardBox = new THREE.Mesh(arrHousingGeo, arrFrameMat);
                boardBox.position.set(0, 7.65, 0);
                var boardFace = new THREE.Mesh(arrFaceGeo, sharedMat.arrivalBoard);
                boardFace.position.set(0, 7.65, 0.12);
                gantry.add(boardBox, boardFace);
            }

            gantry.position.z = -g * 22;
            threeScene.add(gantry);
            gantryPool.push(gantry);
        }

        // Neon Tunnel Ribs & Strips (Pooled, active during NEON TUNNEL biome)
        var tRibMat = new THREE.MeshLambertMaterial({ color: 0x0f172a });
        var tCyanMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee });
        var tPinkMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });
        var tColGeo = new THREE.BoxGeometry(0.9, 10.6, 2.2);
        var tTopGeo = new THREE.BoxGeometry(TRACK_HALF_W * 2 + 12.0, 0.85, 2.2);
        var tStripGeo = new THREE.BoxGeometry(0.24, 5.2, 2.0);
        for (var ta = 0; ta < 10; ta++) {
            var arch = new THREE.Group();
            var colL = new THREE.Mesh(tColGeo, tRibMat);
            colL.position.set(-(TRACK_HALF_W + 5.2), 5.3, 0);
            var colR = new THREE.Mesh(tColGeo, tRibMat);
            colR.position.set(TRACK_HALF_W + 5.2, 5.3, 0);
            var roofRib = new THREE.Mesh(tTopGeo, tRibMat);
            roofRib.position.set(0, 10.6, 0);
            var stripL = new THREE.Mesh(tStripGeo, ta % 2 === 0 ? tCyanMat : tPinkMat);
            stripL.position.set(-(TRACK_HALF_W + 4.7), 4.0, 0);
            var stripR = new THREE.Mesh(tStripGeo, ta % 2 === 0 ? tPinkMat : tCyanMat);
            stripR.position.set(TRACK_HALF_W + 4.7, 4.0, 0);
            arch.add(colL, colR, roofRib, stripL, stripR);
            arch.position.z = -ta * 22;
            arch.visible = false;
            threeScene.add(arch);
            tunnelArchPool.push(arch);
        }

        // Harbor Bridge Suspension Pylons & Cables (Pooled, active during HARBOR BRIDGE biome)
        var pylonMat = new THREE.MeshLambertMaterial({ color: 0xf59e0b });
        var pylonCapMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
        var cableMat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0 });
        var pylonGeo = new THREE.BoxGeometry(1.1, 18.0, 1.4);
        var cableGeo = new THREE.BoxGeometry(0.14, 0.14, 18.0);
        for (var bt = 0; bt < 6; bt++) {
            var bridgeSet = new THREE.Group();
            for (var bSide = -1; bSide <= 1; bSide += 2) {
                var pylon = new THREE.Mesh(pylonGeo, pylonMat);
                pylon.position.set(bSide * (TRACK_HALF_W + 6.3), 7.5, 0);
                var beacon = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 1.5), pylonCapMat);
                beacon.position.set(bSide * (TRACK_HALF_W + 6.3), 16.4, 0);
                var cabF = new THREE.Mesh(cableGeo, cableMat);
                cabF.position.set(bSide * (TRACK_HALF_W + 6.2), 10.2, 7.6);
                cabF.rotation.x = 0.56;
                var cabB = new THREE.Mesh(cableGeo, cableMat);
                cabB.position.set(bSide * (TRACK_HALF_W + 6.2), 10.2, -7.6);
                cabB.rotation.x = -0.56;
                bridgeSet.add(pylon, beacon, cabF, cabB);
            }
            bridgeSet.position.z = -bt * 36;
            bridgeSet.visible = false;
            threeScene.add(bridgeSet);
            bridgeTowerPool.push(bridgeSet);
        }

        // Flanking Urban Skyline Buildings (Pooled & scrolled!)
        var bldgPalette = [0x1e293b, 0x334155, 0x312e81, 0x3f2e3e, 0x1e3a5f];
        var winMat = new THREE.MeshBasicMaterial({ color: 0xfde68a });
        for (var b = 0; b < 16; b++) {
            var side = b % 2 === 0 ? -1 : 1;
            var bh = 9 + (b % 4) * 4.5;
            var bw = 6.5 + (b % 3) * 1.8;
            var bd = 12 + (b % 2) * 4;
            var bldg = new THREE.Group();
            var bMesh = new THREE.Mesh(
                new THREE.BoxGeometry(bw, bh, bd),
                new THREE.MeshLambertMaterial({ color: bldgPalette[b % bldgPalette.length] })
            );
            bMesh.position.y = bh / 2;
            bldg.add(bMesh);

            // Illuminated rooftop trim + window strip
            var trim = new THREE.Mesh(
                new THREE.BoxGeometry(bw + 0.2, 0.35, bd + 0.2),
                new THREE.MeshBasicMaterial({ color: b % 3 === 0 ? 0x38bdf8 : b % 3 === 1 ? 0xf97316 : 0xa855f7 })
            );
            trim.position.y = bh;
            bldg.add(trim);

            for (var wy = 3; wy < bh - 1.5; wy += 2.6) {
                var win = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.9, bd * 0.72), winMat);
                win.position.set(-side * (bw / 2 + 0.04), wy, 0);
                bldg.add(win);
            }

            bldg.position.set(side * (TRACK_HALF_W + 9.2 + (b % 3) * 1.4), 0, -Math.floor(b / 2) * 24);
            threeScene.add(bldg);
            buildingPool.push({ mesh: bldg, side: side });
        }

        // Landing Dust Ring Pool
        for (var dr = 0; dr < 6; dr++) {
            var dMat = new THREE.MeshBasicMaterial({
                color: 0xe2e8f0,
                transparent: true,
                opacity: 0.65,
                depthWrite: false,
                side: THREE.DoubleSide
            });
            var dMesh = new THREE.Mesh(sharedGeo.dustRing, dMat);
            dMesh.visible = false;
            threeScene.add(dMesh);
            dustRingPool.push({ mesh: dMesh, active: false, life: 0, maxLife: 0.32 });
        }

        // Particle Burst Pool
        for (var p = 0; p < 96; p++) {
            var pMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
            var pMesh = new THREE.Mesh(sharedGeo.spark, pMat);
            pMesh.visible = false;
            threeScene.add(pMesh);
            particlePool.push({
                mesh: pMesh,
                active: false,
                x: 0, y: 0, z: 0,
                vx: 0, vy: 0, vz: 0,
                life: 0, maxLife: 0.4
            });
        }
    }

    function createObstacleMesh(kind, variant) {
        var g = new THREE.Group();

        if (kind === "low") {
            var pL = new THREE.Mesh(sharedGeo.lowPost, sharedMat.lowPost);
            pL.position.set(-1.12, 0.52, 0);
            pL.castShadow = true;
            var pR = new THREE.Mesh(sharedGeo.lowPost, sharedMat.lowPost);
            pR.position.set(1.12, 0.52, 0);
            pR.castShadow = true;
            var plank = new THREE.Mesh(sharedGeo.lowPlank, sharedMat.lowPlank);
            plank.position.set(0, 0.85, 0);
            plank.castShadow = true;
            var stripe = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.43, 0.24), sharedMat.lowStripe);
            stripe.position.set(0, 0.85, 0);
            g.add(pL, pR, plank, stripe);
        } else if (kind === "high") {
            var gL = new THREE.Mesh(sharedGeo.gatePost, sharedMat.lowPost);
            gL.position.set(-1.22, 1.37, 0);
            gL.castShadow = true;
            var gR = new THREE.Mesh(sharedGeo.gatePost, sharedMat.lowPost);
            gR.position.set(1.22, 1.37, 0);
            gR.castShadow = true;
            var board = new THREE.Mesh(sharedGeo.gateBoard, sharedMat.gateBoard);
            board.position.set(0, 2.08, 0);
            board.castShadow = true;
            g.add(gL, gR, board);
        } else if (kind === "tall") {
            var blk = new THREE.Mesh(sharedGeo.tallBlock, sharedMat.tallBlock);
            blk.position.set(0, 1.37, 0);
            blk.castShadow = true;
            var tStr = new THREE.Mesh(sharedGeo.tallTopStripe, sharedMat.tallStripe);
            tStr.position.set(0, 2.48, 0);
            g.add(blk, tStr);
        } else if (kind === "train" || kind === "ramp_train" || kind === "moving_train") {
            var matIdx = variant % sharedMat.trains.length;
            var car = new THREE.Group();
            // Centered at z = 0 for length 13.5m
            var bogie = new THREE.Mesh(sharedGeo.trainBogie, sharedMat.trainBogie);
            bogie.position.y = 0.21;
            var body = new THREE.Mesh(sharedGeo.trainBody, sharedMat.trains[matIdx]);
            body.position.y = 0.35 + (TRAIN_HEIGHT - 0.35) / 2;
            body.castShadow = true;
            body.receiveShadow = true;
            var roof = new THREE.Mesh(sharedGeo.trainRoof, sharedMat.trainRoof);
            roof.position.y = TRAIN_HEIGHT - 0.04;
            roof.receiveShadow = true;
            car.add(bogie, body, roof);

            for (var v = -1; v <= 1; v++) {
                var vent = new THREE.Mesh(sharedGeo.trainVent, sharedMat.trainVent);
                vent.position.set(0, TRAIN_HEIGHT + 0.12, v * 4.1);
                car.add(vent);
            }

            // Front Windshield + LED Destination Marquee + Headlights (facing +Z toward player!)
            var ws = new THREE.Mesh(sharedGeo.trainWindshield, sharedMat.trainWindshield);
            ws.position.set(0, 2.22, 6.76);
            car.add(ws);

            var marquee = new THREE.Mesh(
                sharedGeo.trainWindshield,
                kind === "moving_train" ? sharedMat.expressMarquee : sharedMat.staticMarquee
            );
            marquee.scale.set(0.84, 0.24, 1.15);
            marquee.position.set(0, 2.86, 6.76);
            car.add(marquee);

            var lightMat = kind === "moving_train" ? sharedMat.headlight : sharedMat.taillight;
            var hlL = new THREE.Mesh(sharedGeo.trainLight, lightMat);
            hlL.position.set(-0.82, 0.92, 6.76);
            var hlR = new THREE.Mesh(sharedGeo.trainLight, lightMat);
            hlR.position.set(0.82, 0.92, 6.76);
            car.add(hlL, hlR);

            if (kind === "moving_train") {
                var beamL = new THREE.Mesh(sharedGeo.trainBeam, sharedMat.headlightBeam);
                beamL.position.set(-0.82, 0.85, 10.0);
                var beamR = new THREE.Mesh(sharedGeo.trainBeam, sharedMat.headlightBeam);
                beamR.position.set(0.82, 0.85, 10.0);
                car.add(beamL, beamR);
            }

            if (kind === "ramp_train") {
                // Ramp spans [-RAMP_LEN/2, +RAMP_LEN/2]; place its front edge at local z = 0
                // and sit the train car immediately behind it at [-RAMP_LEN, -(RAMP_LEN + 13.5)].
                car.position.z = -(RAMP_LEN + 6.75);
                var rampMesh = new THREE.Mesh(sharedGeo.ramp, sharedMat.ramp);
                rampMesh.position.z = -RAMP_LEN / 2;
                rampMesh.castShadow = true;
                rampMesh.receiveShadow = true;
                g.add(rampMesh);
                g.add(car);
            } else {
                car.position.z = -6.75; // So local z=0 is the FRONT nose facing the runner!
                g.add(car);
            }
        }

        return g;
    }

    function acquireObstacleMesh(kind, variant) {
        var poolKey = kind === "train" ? "train" : kind === "ramp_train" ? "rampTrain" : kind === "moving_train" ? "movingTrain" : kind;
        var list = meshPools[poolKey];
        if (list && list.length > 0) {
            var m = list.pop();
            m.visible = true;
            return { mesh: m, poolKey: poolKey };
        }
        var created = createObstacleMesh(kind, variant);
        threeScene.add(created);
        return { mesh: created, poolKey: poolKey };
    }

    function releaseObstacleMesh(obs) {
        if (!obs || !obs.mesh) return;
        obs.mesh.visible = false;
        if (meshPools[obs.poolKey]) {
            meshPools[obs.poolKey].push(obs.mesh);
        }
    }

    function acquireCoinMesh() {
        if (meshPools.coin.length > 0) {
            var c = meshPools.coin.pop();
            c.visible = true;
            return c;
        }
        var g = new THREE.Group();
        var outer = new THREE.Mesh(sharedGeo.coin, sharedMat.coin);
        var inner = new THREE.Mesh(sharedGeo.coinRim, sharedMat.coinRim);
        g.add(outer, inner);
        threeScene.add(g);
        return g;
    }

    function releaseCoinMesh(c) {
        if (!c || !c.mesh) return;
        c.mesh.visible = false;
        meshPools.coin.push(c.mesh);
    }

    function acquirePowerupMesh(type) {
        var g;
        if (meshPools.powerup.length > 0) {
            g = meshPools.powerup.pop();
            g.visible = true;
        } else {
            g = new THREE.Group();
            var core = new THREE.Mesh(sharedGeo.puCore, sharedMat.powerups[type] || sharedMat.powerups.jetpack);
            var ring = new THREE.Mesh(sharedGeo.puRing, sharedMat.puRing);
            var beacon = new THREE.Mesh(sharedGeo.puBeacon, sharedMat.puBeacon);
            beacon.position.y = 1.9;
            g.add(core, ring, beacon);
            g.userData.core = core;
            g.userData.ring = ring;
            threeScene.add(g);
        }
        g.userData.core.material = sharedMat.powerups[type] || sharedMat.powerups.jetpack;
        return g;
    }

    function releasePowerupMesh(pu) {
        if (!pu || !pu.mesh) return;
        pu.mesh.visible = false;
        meshPools.powerup.push(pu.mesh);
    }

    // =========================================================================
    // --- Particle Bursts & Floating Popups ---
    // =========================================================================

    function spawnParticles(x, y, z, colorHex, count, speedScale) {
        var s = speedScale || 1;
        var spawned = 0;
        for (var i = 0; i < particlePool.length && spawned < count; i++) {
            var p = particlePool[i];
            if (!p.active) {
                p.active = true;
                p.x = x;
                p.y = y;
                p.z = z;
                p.vx = (Math.random() - 0.5) * 9 * s;
                p.vy = (2.5 + Math.random() * 7.5) * s;
                p.vz = (Math.random() - 0.5) * 8 * s;
                p.life = 0;
                p.maxLife = 0.28 + Math.random() * 0.26;
                if (useThree && p.mesh) {
                    p.mesh.material.color.setHex(colorHex);
                    p.mesh.position.set(x, y, z);
                    p.mesh.scale.setScalar(1);
                    p.mesh.visible = true;
                }
                spawned++;
            }
        }
    }

    function spawnDustRing(x, y, z, colorHex) {
        if (!useThree) return;
        for (var i = 0; i < dustRingPool.length; i++) {
            var dr = dustRingPool[i];
            if (!dr.active) {
                dr.active = true;
                dr.life = 0;
                dr.maxLife = 0.30;
                dr.mesh.material.color.setHex(colorHex || 0xe2e8f0);
                dr.mesh.material.opacity = 0.72;
                dr.mesh.position.set(x, y + 0.05, z);
                dr.mesh.scale.setScalar(0.55);
                dr.mesh.visible = true;
                return;
            }
        }
    }

    function showBanner(text) {
        if (!popBannerEl) return;
        popBannerEl.textContent = text;
        popBannerEl.hidden = false;
        ssState.bannerTimer = 1.15;
    }

    function addPopup(text, colorCss, wx, wy, wz) {
        if (!popupLayerEl) return;
        var el = document.createElement("div");
        el.className = "ss-float-pop";
        el.textContent = text;
        el.style.color = colorCss || "#facc15";
        popupLayerEl.appendChild(el);
        ssState.popups.push({
            el: el,
            wx: wx,
            wy: wy,
            wz: wz,
            life: 0,
            maxLife: 0.78
        });
    }

    function clearPopups() {
        for (var i = 0; i < ssState.popups.length; i++) {
            var p = ssState.popups[i];
            if (p.el && p.el.parentNode) p.el.parentNode.removeChild(p.el);
        }
        ssState.popups.length = 0;
    }

    // =========================================================================
    // --- Fair Procedural Chunk Generator ---
    // =========================================================================

    function laneX(lane) {
        return lane * LANE_WIDTH;
    }

    function obstacleMeshZ(obs) {
        return (obs.kind === "low" || obs.kind === "high" || obs.kind === "tall")
            ? (obs.zNear + obs.zFar) * 0.5
            : obs.zNear;
    }

    function spawnObstacle(kind, lane, zFront, variant) {
        var len = kind === "ramp_train" ? (RAMP_LEN + 13.5)
            : (kind === "train" || kind === "moving_train") ? 13.5
            : kind === "tall" ? 1.1
            : 0.65;
        var extraSpeed = kind === "moving_train" ? (15 + Math.min(14, ssState.distance * 0.005)) : 0;

        var obs = {
            kind: kind,
            lane: lane,
            x: laneX(lane),
            zNear: zFront,
            zFar: zFront - len,
            zRampEnd: kind === "ramp_train" ? (zFront - RAMP_LEN) : zFront,
            extraSpeed: extraSpeed,
            cleared: false,
            closeCalled: false,
            roofAwarded: false,
            hornPlayed: false,
            clutchAwarded: false,
            mesh: null,
            poolKey: null
        };

        if (useThree) {
            var acq = acquireObstacleMesh(kind, variant || 0);
            obs.mesh = acq.mesh;
            obs.poolKey = acq.poolKey;
            obs.mesh.position.set(obs.x, 0, obstacleMeshZ(obs));
        }

        ssState.obstacles.push(obs);
        return obs;
    }

    function spawnCoinLine(lane, zStart, count, stepZ, yStart, arcHeight) {
        for (var i = 0; i < count; i++) {
            var t = count > 1 ? i / (count - 1) : 0;
            var cy = yStart + (arcHeight ? Math.sin(t * Math.PI) * arcHeight : 0);
            var cz = zStart - i * stepZ;
            var coin = {
                lane: lane,
                x: laneX(lane),
                y: cy,
                z: cz,
                collected: false,
                magnetized: false,
                spin: i * 0.4,
                mesh: null
            };
            if (useThree) {
                coin.mesh = acquireCoinMesh();
                coin.mesh.position.set(coin.x, coin.y, coin.z);
            }
            ssState.coinsList.push(coin);
        }
    }

    function spawnPowerup(type, lane, z, y) {
        var pu = {
            type: type,
            lane: lane,
            x: laneX(lane),
            y: y || 1.05,
            z: z,
            collected: false,
            mesh: null
        };
        if (useThree) {
            pu.mesh = acquirePowerupMesh(type);
            pu.mesh.position.set(pu.x, pu.y, pu.z);
        }
        ssState.powerups.push(pu);
    }

    function pickPowerupType() {
        var r = Math.random();
        if (r < 0.24) return "jetpack";
        if (r < 0.48) return "magnet";
        if (r < 0.70) return "sneakers";
        if (r < 0.88) return "multiplier";
        return "board";
    }

    function generateChunk(zStart) {
        ssState.chunkCount++;
        var dist = ssState.distance;
        var allowMoving = dist > 95;
        var chunkLen = 36;

        // Pick a fair guaranteed-solvable pattern without immediate repeat
        var maxPatterns = allowMoving ? 7 : 5;
        var idx = Math.floor(Math.random() * maxPatterns);
        if (idx === ssState.lastPatternIdx) {
            idx = (idx + 1) % maxPatterns;
        }
        ssState.lastPatternIdx = idx;

        var lanes = [-1, 0, 1];
        var openLane = lanes[Math.floor(Math.random() * 3)];
        var otherA = openLane === -1 ? 0 : -1;
        var otherB = openLane === 1 ? 0 : 1;
        if (otherA === openLane) otherA = 1;
        if (otherB === openLane) otherB = -1;
        if (otherA === otherB) otherB = openLane === 0 ? 1 : 0;

        var v = ssState.chunkCount;

        if (idx === 0) {
            // Pattern 0: Hurdle Slalom + Jumping Coin Arcs
            spawnObstacle("low", otherA, zStart - 6, v);
            spawnObstacle("high", otherB, zStart - 6, v);
            spawnCoinLine(otherA, zStart - 3.2, 5, 1.5, 0.9, 1.9);
            spawnCoinLine(openLane, zStart - 16, 6, 1.8, 0.85, 0);
            spawnObstacle("low", openLane, zStart - 24, v);
            spawnCoinLine(openLane, zStart - 21.5, 5, 1.4, 0.9, 1.85);
            spawnObstacle("tall", otherA, zStart - 24, v);
        } else if (idx === 1) {
            // Pattern 1: Station Yard — Ramp Train + Stationary Train + Open Lane
            spawnObstacle("ramp_train", openLane, zStart - 4, v);
            spawnObstacle("train", otherA, zStart - 10, v + 1);
            spawnObstacle("low", otherB, zStart - 14, v);
            // Rooftop coin ribbon along ramp_train!
            spawnCoinLine(openLane, zStart - 10.5, 6, 1.8, TRAIN_HEIGHT + 0.9, 0);
            spawnCoinLine(otherB, zStart - 22, 5, 1.8, 0.85, 0);
            if (ssState.chunkCount % 3 === 0) {
                spawnPowerup(pickPowerupType(), openLane, zStart - 22, TRAIN_HEIGHT + 1.15);
            }
        } else if (idx === 2) {
            // Pattern 2: Twin Overhead Gates + Center Jump
            spawnObstacle("high", -1, zStart - 8, v);
            spawnObstacle("high", 1, zStart - 8, v);
            spawnObstacle("low", 0, zStart - 8, v);
            spawnCoinLine(0, zStart - 5.2, 5, 1.5, 0.9, 1.95);
            spawnCoinLine(-1, zStart - 19, 5, 1.8, 0.85, 0);
            spawnObstacle("tall", 0, zStart - 25, v);
            spawnObstacle("high", 1, zStart - 25, v);
        } else if (idx === 3) {
            // Pattern 3: Rooftop Parkour Double-Train Jump
            spawnObstacle("ramp_train", otherA, zStart - 3, v);
            spawnObstacle("train", otherB, zStart - 19, v + 2);
            // Safe ground path in openLane with low barrier
            spawnObstacle("low", openLane, zStart - 16, v);
            spawnCoinLine(otherA, zStart - 9.5, 5, 1.8, TRAIN_HEIGHT + 0.9, 0);
            spawnCoinLine(otherB, zStart - 21, 5, 1.8, TRAIN_HEIGHT + 0.9, 0);
            if (ssState.chunkCount % 2 === 0) {
                spawnPowerup(pickPowerupType(), otherB, zStart - 27, TRAIN_HEIGHT + 1.15);
            }
            chunkLen = 40;
        } else if (idx === 4) {
            // Pattern 4: Zigzag Coin Rush + Powerup Alley
            spawnObstacle("tall", otherA, zStart - 8, v);
            spawnObstacle("low", otherB, zStart - 15, v);
            spawnObstacle("high", openLane, zStart - 24, v);
            spawnCoinLine(openLane, zStart - 4, 5, 1.9, 0.85, 0);
            spawnCoinLine(otherA, zStart - 14, 5, 1.9, 0.85, 0);
            spawnPowerup(pickPowerupType(), otherB, zStart - 26, 1.05);
        } else if (idx === 5) {
            // Pattern 5: Express Oncoming Train + Safe Escape Lane!
            spawnObstacle("moving_train", otherA, zStart - 28, 3);
            spawnObstacle("train", otherB, zStart - 8, v + 1);
            spawnCoinLine(openLane, zStart - 5, 8, 2.0, 0.85, 0);
            spawnObstacle("low", openLane, zStart - 24, v);
            if (Math.random() < 0.45) {
                spawnPowerup(pickPowerupType(), openLane, zStart - 15, 1.05);
            }
            chunkLen = 42;
        } else {
            // Pattern 6: Twin Express Gauntlet (1 lane + ramp option!)
            spawnObstacle("moving_train", otherA, zStart - 26, 3);
            spawnObstacle("ramp_train", otherB, zStart - 4, v + 2);
            spawnObstacle("high", openLane, zStart - 16, v);
            spawnCoinLine(otherB, zStart - 10, 6, 1.8, TRAIN_HEIGHT + 0.9, 0);
            spawnCoinLine(openLane, zStart - 4, 5, 1.8, 0.85, 0);
            chunkLen = 42;
        }

        // Extra Jetpack sky coins if Jetpack is currently running!
        if (ssState.player.jetpackTimer > 0.6) {
            var skyLane = lanes[Math.floor(Math.random() * 3)];
            spawnCoinLine(skyLane, zStart - 4, 12, 2.2, JETPACK_HEIGHT, 0);
        }

        return zStart - chunkLen;
    }

    // =========================================================================
    // --- Player Actions & Input ---
    // =========================================================================

    function triggerAction(action) {
        if (ssState.mode !== "playing") return;
        var p = ssState.player;

        if (action === "left") {
            if (p.targetLane > -1) {
                p.prevLane = p.targetLane;
                p.targetLane--;
                playSwipeSfx();
                return true;
            }
            return false;
        }
        if (action === "right") {
            if (p.targetLane < 1) {
                p.prevLane = p.targetLane;
                p.targetLane++;
                playSwipeSfx();
                return true;
            }
            return false;
        }
        if (action === "jump") {
            if (p.jetpackTimer > 0) return true;
            var canJump = p.y <= p.groundY + 0.08 || p.coyoteTimer > 0;
            if (canJump) {
                var isSuper = p.sneakersTimer > 0;
                var onBoard = p.hoverboardTimer > 0;
                p.vy = isSuper ? SNEAKERS_JUMP_VEL : (onBoard ? HOVERBOARD_JUMP_VEL : JUMP_VEL);
                p.y = Math.max(p.y, p.groundY + 0.04);
                p.coyoteTimer = 0;
                p.rolling = false;
                p.rollTimer = 0;
                p.squashY = 1.18;
                p.squashX = 0.88;
                playJumpSfx(isSuper);
                spawnParticles(p.x, p.y + 0.1, 0, isSuper ? 0x4ade80 : (onBoard ? 0x22d3ee : 0xe2e8f0), 6, 0.65);
                return true;
            }
            return false;
        }
        if (action === "roll") {
            if (p.jetpackTimer > 0) return true;
            if (p.y > p.groundY + 0.14) {
                // Fast-Fall slam straight into roll!
                p.vy = -38.0;
            }
            p.rolling = true;
            p.rollTimer = ROLL_DURATION;
            p.flipAngle = 0;
            playRollSfx();
            return true;
        }
        return false;
    }

    function queueAction(action) {
        if (ssState.mode !== "playing") return;
        if (!triggerAction(action)) {
            ssState.player.queuedAction = action;
            ssState.player.queuedTimer = 0.16;
        }
    }

    function activateHoverboard() {
        if (ssState.mode !== "playing") return;
        var p = ssState.player;
        if (p.hoverboardTimer > 0 || ssState.boards <= 0 || p.jetpackTimer > 0) return;
        ssState.boards--;
        p.hoverboardTimer = HOVERBOARD_DURATION;
        p.squashY = 0.84;
        p.squashX = 1.15;
        playBoardActivateSfx();

        // Check Clutch Save counterplay: activating just before an unavoidable lane hazard!
        var clutchHit = false;
        for (var i = 0; i < ssState.obstacles.length; i++) {
            var o = ssState.obstacles[i];
            if (!o.cleared && !o.clutchAwarded && o.zNear >= -14.5 && o.zFar <= 1.8 && Math.abs(o.x - p.x) < 1.65) {
                o.clutchAwarded = true;
                clutchHit = true;
                break;
            }
        }

        if (clutchHit) {
            var clutchPts = 250 * getActiveMultiplier();
            ssState.score = Math.min(MAX_SCORE, ssState.score + clutchPts);
            ssState.combo += 3;
            ssState.comboDecayTimer = 2.6;
            if (ssState.combo > ssState.maxCombo) ssState.maxCombo = ssState.combo;
            p.invulnTimer = Math.max(p.invulnTimer, 0.45);
            spawnParticles(p.x, p.y + 0.35, 0, 0x22d3ee, 16, 1.25);
            spawnParticles(p.x, p.y + 0.35, 0, 0xfacc15, 10, 1.1);
            showBanner("CLUTCH BOARD! +" + clutchPts);
            addPopup("CLUTCH! +" + clutchPts, "#67e8f9", p.x, p.y + 2.0, 0);
        } else {
            spawnParticles(p.x, p.y + 0.25, 0, 0x22d3ee, 14, 1.1);
            showBanner("HOVERBOARD!");
        }
        updateHudDom();
    }

    function ssHandleKey(ev, isDown) {
        if (!isDown) return false;
        if (ev.repeat) {
            return ev.code === "ArrowUp" || ev.code === "ArrowDown" || ev.code === "ArrowLeft" || ev.code === "ArrowRight" || ev.code === "Space";
        }
        var code = ev.code;
        var k = ev.key;

        if (ssState.mode === "idle" || ssState.mode === "gameover") {
            if (code === "Space" || code === "Enter") {
                if (ev.target && ev.target.tagName === "BUTTON") return false;
                ssStartGame();
                return true;
            }
            return false;
        }

        if (ssState.mode !== "playing") return false;

        if (code === "ArrowLeft" || k === "a" || k === "A") {
            queueAction("left");
            return true;
        }
        if (code === "ArrowRight" || k === "d" || k === "D") {
            queueAction("right");
            return true;
        }
        if (code === "ArrowUp" || k === "w" || k === "W" || code === "Space") {
            queueAction("jump");
            return true;
        }
        if (code === "ArrowDown" || k === "s" || k === "S") {
            queueAction("roll");
            return true;
        }
        if (k === "e" || k === "E" || code === "KeyE" || k === "b" || k === "B" || code === "KeyB" || code === "ShiftLeft" || code === "ShiftRight") {
            activateHoverboard();
            return true;
        }
        return false;
    }

    function ssClearInput() {
        ssState.player.queuedAction = null;
        ssState.player.queuedTimer = 0;
    }

    // =========================================================================
    // --- Game Lifecycle: Start, Hoverboard Save, Crash, Submit ---
    // =========================================================================

    function clearWorldObjects() {
        for (var i = 0; i < ssState.obstacles.length; i++) {
            releaseObstacleMesh(ssState.obstacles[i]);
        }
        ssState.obstacles.length = 0;

        for (var c = 0; c < ssState.coinsList.length; c++) {
            releaseCoinMesh(ssState.coinsList[c]);
        }
        ssState.coinsList.length = 0;

        for (var p = 0; p < ssState.powerups.length; p++) {
            releasePowerupMesh(ssState.powerups[p]);
        }
        ssState.powerups.length = 0;

        for (var k = 0; k < particlePool.length; k++) {
            particlePool[k].active = false;
            if (particlePool[k].mesh) particlePool[k].mesh.visible = false;
        }
        clearPopups();
    }

    function ssStartGame() {
        if (!useThree && !fallbackCtx && canvasEl) {
            ssInitGraphics();
        }
        ssResize();
        clearWorldObjects();

        ssState.gameId++;
        ssState.mode = "playing";
        ssState.score = 0;
        ssState.coins = 0;
        ssState.runCoinsForBoard = 0;
        ssState.boards = 1;
        ssState.combo = 0;
        ssState.maxCombo = 0;
        ssState.comboDecayTimer = 0;
        ssState.closeCalls = 0;
        ssState.distance = 0;
        ssState.speed = BASE_SPEED;
        ssState.baseMult = 1;
        ssState.elapsed = 0;
        ssState.crashTimer = 0;
        ssState.trauma = 0;
        ssState.bannerTimer = 0;
        ssState.chunkCount = 0;
        ssState.lastPatternIdx = -1;
        ssState.biomeIdx = 0;
        ssState.lastHornTime = -10;
        ssState.submitted = false;
        ssState.worldScrollZ = 0;

        for (var dr = 0; dr < dustRingPool.length; dr++) {
            dustRingPool[dr].active = false;
            dustRingPool[dr].mesh.visible = false;
        }
        if (speedLinesEl) speedLinesEl.style.opacity = "0";

        var p = ssState.player;
        p.lane = 0;
        p.targetLane = 0;
        p.prevLane = 0;
        p.x = 0;
        p.y = 0;
        p.vy = 0;
        p.groundY = 0;
        p.rolling = false;
        p.rollTimer = 0;
        p.coyoteTimer = 0;
        p.invulnTimer = 0;
        p.stumbleTimer = 2.6; // Opening chase excitement!
        p.hoverboardTimer = 0;
        p.jetpackTimer = 0;
        p.magnetTimer = 0;
        p.sneakersTimer = 0;
        p.multTimer = 0;
        p.runPhase = 0;
        p.tiltRoll = 0;
        p.flipAngle = 0;
        p.squashY = 1;
        p.squashX = 1;
        p.queuedAction = null;
        p.queuedTimer = 0;

        // Pre-populate opening track with safe warm-up coins then procedural chunks
        spawnCoinLine(0, -18, 6, 2.0, 0.85, 0);
        var zCursor = -38;
        while (zCursor > -150) {
            zCursor = generateChunk(zCursor);
        }
        ssState.nextChunkZ = zCursor;

        if (startOverlay) startOverlay.hidden = true;
        if (overOverlay) overOverlay.hidden = true;
        if (popBannerEl) popBannerEl.hidden = true;
        if (overRecordBanner) overRecordBanner.hidden = true;

        playWhistleSfx();
        updateHudDom();
        ssResume();
    }

    function triggerHoverboardSave() {
        var p = ssState.player;
        p.hoverboardTimer = 0;
        p.invulnTimer = 1.65;
        ssState.trauma = 0.72;
        playBoardBlastSfx();
        spawnParticles(p.x, p.y + 0.8, 0, 0x22d3ee, 24, 1.5);
        spawnParticles(p.x, p.y + 0.8, 0, 0xfacc15, 16, 1.25);

        // Vaporize nearby obstacles ahead & right around the runner
        for (var i = 0; i < ssState.obstacles.length; i++) {
            var o = ssState.obstacles[i];
            if (!o.cleared && o.zNear >= -24 && o.zFar <= 6) {
                o.cleared = true;
                if (o.mesh) o.mesh.visible = false;
                spawnParticles(o.x, 1.2, Math.min(-2, o.zNear), 0xf97316, 8, 1.1);
            }
        }

        var bonus = 150 * getActiveMultiplier();
        ssState.score = Math.min(MAX_SCORE, ssState.score + bonus);
        showBanner("BOARD SAVED! +" + bonus);
        addPopup("+" + bonus + " BOARD BLAST!", "#67e8f9", p.x, p.y + 2.2, 0);
    }

    function triggerStumble(reason) {
        var p = ssState.player;
        if (p.stumbleTimer > 0) {
            // Second stumble while Guard is right behind you -> BUSTED!
            triggerCrash("Caught by the Guard!");
            return;
        }
        p.stumbleTimer = 6.5;
        p.invulnTimer = 0.55;
        ssState.combo = 0;
        ssState.trauma = 0.52;
        ssState.speed = Math.max(BASE_SPEED, ssState.speed * 0.84);
        playWhistleSfx();
        showBanner(reason || "STUMBLE! WATCH OUT!");
        addPopup("STUMBLE!", "#fca5a5", p.x, p.y + 2.1, 0);
    }

    function triggerCrash(reason) {
        if (ssState.mode !== "playing") return;
        ssState.mode = "crashing";
        ssState.crashTimer = 0.58;
        ssState.crashReason = reason || "Crashed!";
        ssState.trauma = 0.95;
        if (speedLinesEl) speedLinesEl.style.opacity = "0";
        playCrashSfx();
        playWhistleSfx();
        spawnParticles(ssState.player.x, ssState.player.y + 0.9, 0, 0xf97316, 22, 1.35);
    }

    function finishGameOver() {
        ssState.mode = "gameover";
        var finalScore = Math.max(0, Math.min(MAX_SCORE, Math.round(ssState.score)));
        var finalCombo = Math.max(0, Math.min(MAX_COMBO, Math.min(finalScore, ssState.maxCombo)));

        if (overBadge) overBadge.textContent = ssState.crashReason === "Caught by the Guard!" ? "BUSTED!" : "WIPEOUT!";
        if (overTitle) overTitle.textContent = ssState.crashReason;
        if (overBreakdown) {
            overBreakdown.textContent =
                Math.round(ssState.distance).toLocaleString() + "m · " +
                ssState.coins.toLocaleString() + " coins · " +
                ssState.closeCalls + " close calls";
        }
        if (overScore) overScore.textContent = finalScore.toLocaleString();
        if (overCombo) overCombo.textContent = "\u00D7" + finalCombo.toLocaleString();
        if (overBest) overBest.textContent = "\u2014";
        if (overRank) overRank.textContent = "\u2014";
        if (overSaveStatus) overSaveStatus.textContent = "Saving score\u2026";
        if (overOverlay) overOverlay.hidden = false;

        submitSubwayScore(finalScore, finalCombo);
    }

    async function submitSubwayScore(finalScore, finalCombo) {
        if (ssState.submitted) return;
        ssState.submitted = true;
        var gid = ssState.gameId;

        try {
            var res = null;
            if (window.McWutGames && window.McWutGames.leaderboard && typeof window.McWutGames.leaderboard.submitScore === "function") {
                res = await window.McWutGames.leaderboard.submitScore(GAME_KEY, finalScore, finalCombo);
            } else if (typeof window.submitScore === "function") {
                res = await window.submitScore(GAME_KEY, finalScore, finalCombo);
            }
            if (!res || gid !== ssState.gameId) return;

            ssState.leaderboard = res.leaderboard;
            if (overBest) overBest.textContent = (res.bestScore || finalScore).toLocaleString();
            if (overRank) overRank.textContent = res.rank ? "#" + res.rank : "\u2014";
            if (overRecordBanner) overRecordBanner.hidden = !res.isNewBest;
            if (overSaveStatus) {
                overSaveStatus.textContent = res.isNewBest
                    ? "New personal record saved to the global leaderboard!"
                    : "Score recorded. Personal best: " + (res.bestScore || 0).toLocaleString() + ".";
            }
        } catch (err) {
            if (overSaveStatus && gid === ssState.gameId) {
                overSaveStatus.textContent = "Could not save score right now.";
            }
        }
    }

    // =========================================================================
    // --- Simulation Loop & Collision Physics ---
    // =========================================================================

    function getActiveMultiplier() {
        var p = ssState.player;
        return ssState.baseMult * (p.multTimer > 0 ? 2 : 1);
    }

    function rampHeightAt(obs, z) {
        if (obs.kind !== "ramp_train") return TRAIN_HEIGHT;
        var t = (obs.zNear - z) / RAMP_LEN;
        if (t < 0) t = 0;
        if (t > 1) t = 1;
        return t * TRAIN_HEIGHT;
    }

    function updateSimulation(dt) {
        if (dt > 0.05) dt = 0.05;
        ssState.elapsed += dt;
        ssState.trauma = Math.max(0, ssState.trauma - dt * 2.2);

        if (ssState.bannerTimer > 0) {
            ssState.bannerTimer -= dt;
            if (ssState.bannerTimer <= 0 && popBannerEl) {
                popBannerEl.hidden = true;
            }
        }

        if (ssState.mode === "crashing") {
            ssState.crashTimer -= dt;
            updateParticles(dt);
            updatePopups(dt);
            if (ssState.crashTimer <= 0) {
                finishGameOver();
            }
            return;
        }

        if (ssState.mode !== "playing") {
            // Subtle idle preview motion
            ssState.player.runPhase += dt * 4.5;
            updatePopups(dt);
            return;
        }

        var p = ssState.player;

        // Progressive speed scaling + distance multiplier milestones
        var targetSpeed = Math.min(MAX_SPEED, BASE_SPEED + ssState.distance * 0.0115);
        if (p.jetpackTimer > 0) targetSpeed = Math.min(MAX_SPEED + 8, targetSpeed * 1.24);
        ssState.speed += (targetSpeed - ssState.speed) * Math.min(1, dt * 2.5);

        var stepDist = ssState.speed * dt;
        ssState.distance += stepDist;
        ssState.worldScrollZ += stepDist;

        var newBaseMult = ssState.distance >= 3500 ? 5
            : ssState.distance >= 2000 ? 4
            : ssState.distance >= 1000 ? 3
            : ssState.distance >= 400 ? 2 : 1;
        if (newBaseMult > ssState.baseMult) {
            ssState.baseMult = newBaseMult;
            showBanner("MULTIPLIER \u00D7" + getActiveMultiplier() + "!");
        }

        var nextBiomeIdx = Math.floor(ssState.distance / BIOME_DIST_STEP) % BIOMES.length;
        if (nextBiomeIdx !== ssState.biomeIdx) {
            ssState.biomeIdx = nextBiomeIdx;
            showBanner(BIOMES[nextBiomeIdx].banner);
        }

        ssState.score = Math.min(MAX_SCORE, ssState.score + stepDist * 1.25 * getActiveMultiplier());

        // Powerup & Status Timers
        if (p.invulnTimer > 0) p.invulnTimer = Math.max(0, p.invulnTimer - dt);
        if (p.stumbleTimer > 0) p.stumbleTimer = Math.max(0, p.stumbleTimer - dt);
        if (p.hoverboardTimer > 0) p.hoverboardTimer = Math.max(0, p.hoverboardTimer - dt);
        if (p.magnetTimer > 0) p.magnetTimer = Math.max(0, p.magnetTimer - dt);
        if (p.sneakersTimer > 0) p.sneakersTimer = Math.max(0, p.sneakersTimer - dt);
        if (p.multTimer > 0) p.multTimer = Math.max(0, p.multTimer - dt);

        if (p.jetpackTimer > 0) {
            p.jetpackTimer = Math.max(0, p.jetpackTimer - dt);
            if (p.jetpackTimer === 0) {
                // Grace window while parachuting down from jetpack height
                p.invulnTimer = Math.max(p.invulnTimer, 1.35);
            }
        }

        if (ssState.combo > 0) {
            ssState.comboDecayTimer -= dt;
            if (ssState.comboDecayTimer <= 0) {
                ssState.combo = 0;
            }
        }

        // Input Buffering
        if (p.queuedAction) {
            p.queuedTimer -= dt;
            if (triggerAction(p.queuedAction) || p.queuedTimer <= 0) {
                p.queuedAction = null;
                p.queuedTimer = 0;
            }
        }

        // Smooth Horizontal Lane Glide
        var targetX = laneX(p.targetLane);
        var dx = targetX - p.x;
        p.x += dx * Math.min(1, dt * 15.5);
        if (Math.abs(dx) < 0.02) {
            p.x = targetX;
            p.lane = p.targetLane;
        }
        p.tiltRoll += (-dx * 0.14 - p.tiltRoll) * Math.min(1, dt * 14);

        // Roll Timer
        if (p.rolling) {
            p.rollTimer -= dt;
            p.flipAngle += dt * (Math.PI * 2 / ROLL_DURATION);
            if (p.rollTimer <= 0) {
                p.rolling = false;
                p.rollTimer = 0;
                p.flipAngle = 0;
            }
        }

        // Scroll Obstacles & Find Ground Support Height
        var supportY = 0;
        var playerHalfW = 0.42;

        for (var i = ssState.obstacles.length - 1; i >= 0; i--) {
            var obs = ssState.obstacles[i];
            var dz = (ssState.speed + obs.extraSpeed) * dt;
            obs.zNear += dz;
            obs.zFar += dz;
            obs.zRampEnd += dz;

            if (obs.mesh && !obs.cleared) {
                obs.mesh.position.z = obstacleMeshZ(obs);
            }

            if (obs.kind === "moving_train" && !obs.cleared) {
                if (!obs.hornPlayed && obs.zNear >= -86 && obs.zNear < -24) {
                    obs.hornPlayed = true;
                    if (ssState.elapsed - ssState.lastHornTime >= 1.1) {
                        ssState.lastHornTime = ssState.elapsed;
                        playExpressHornSfx();
                    }
                }
                if (obs.zNear >= -45 && obs.zNear <= 1.5 && Math.random() < 0.25) {
                    spawnParticles(obs.x + (Math.random() < 0.5 ? -0.72 : 0.72), 0.14, obs.zNear, 0xfbbf24, 1, 0.55);
                }
            }

            // Support check for trains/ramps overlapping z = 0
            if (!obs.cleared && (obs.kind === "train" || obs.kind === "ramp_train" || obs.kind === "moving_train")) {
                if (Math.abs(p.x - obs.x) < 1.32 && obs.zNear >= -0.35 && obs.zFar <= 0.35) {
                    if (obs.kind === "ramp_train" && obs.zRampEnd < 0) {
                        var ry = rampHeightAt(obs, 0);
                        if (p.y >= ry - 0.65) {
                            supportY = Math.max(supportY, ry);
                        }
                    } else if (p.y >= TRAIN_HEIGHT - 0.58) {
                        supportY = Math.max(supportY, TRAIN_HEIGHT);
                        if (!obs.roofAwarded && p.y <= TRAIN_HEIGHT + 0.35) {
                            obs.roofAwarded = true;
                            var hopPts = 40 * getActiveMultiplier();
                            ssState.score = Math.min(MAX_SCORE, ssState.score + hopPts);
                            ssState.combo++;
                            ssState.comboDecayTimer = 2.6;
                            if (ssState.combo > ssState.maxCombo) ssState.maxCombo = ssState.combo;
                            addPopup("ROOF HOP! +" + hopPts, "#fde047", p.x, TRAIN_HEIGHT + 1.8, 0);
                        }
                    }
                }
            }

            // Recycle off-screen behind camera
            if (obs.zFar > 16) {
                releaseObstacleMesh(obs);
                ssState.obstacles.splice(i, 1);
            }
        }

        p.groundY = supportY;

        // Vertical Physics + Landing Squash-and-Stretch & Dust Rings
        if (p.jetpackTimer > 0) {
            p.y += (JETPACK_HEIGHT - p.y) * Math.min(1, dt * 5.2);
            p.vy = 0;
            p.coyoteTimer = 0;
            p.rolling = false;
            if (Math.random() < 0.65) {
                spawnParticles(p.x - 0.16, p.y + 0.55, 0.38, 0xfb923c, 1, 0.45);
                spawnParticles(p.x + 0.16, p.y + 0.55, 0.38, 0xfef08a, 1, 0.45);
            }
        } else {
            var wasGrounded = p.y <= p.groundY + 0.08;
            var preAirVy = p.vy;
            p.vy += GRAVITY * dt;
            // Softer float descent with Super Sneakers
            if (p.sneakersTimer > 0 && p.vy < 0) {
                p.vy = Math.max(p.vy, -17.5);
            }
            p.y += p.vy * dt;

            if (p.y <= p.groundY) {
                if (!wasGrounded && preAirVy < -7.5) {
                    var impact = Math.min(1, (-preAirVy - 7.5) / 26);
                    p.squashY = 1 - impact * 0.28;
                    p.squashX = 1 + impact * 0.22;
                    spawnDustRing(p.x, p.groundY, 0, p.hoverboardTimer > 0 ? 0x22d3ee : (p.sneakersTimer > 0 ? 0x4ade80 : 0xe2e8f0));
                    spawnParticles(p.x, p.groundY + 0.08, 0, p.hoverboardTimer > 0 ? 0x22d3ee : 0xe2e8f0, 7, 0.7);
                    playLandSfx(impact);
                }
                p.y = p.groundY;
                p.vy = 0;
                p.coyoteTimer = 0.11;
            } else if (wasGrounded && p.vy <= 0) {
                p.coyoteTimer = 0.11;
            } else {
                p.coyoteTimer = Math.max(0, p.coyoteTimer - dt);
            }
        }

        p.squashY += (1 - p.squashY) * Math.min(1, dt * 16);
        p.squashX += (1 - p.squashX) * Math.min(1, dt * 16);

        if (p.hoverboardTimer > 0 && Math.random() < 0.45) {
            spawnParticles(p.x + (Math.random() - 0.5) * 0.36, p.y + 0.08, 0.55, Math.random() < 0.5 ? 0x22d3ee : 0xf43f5e, 1, 0.35);
        } else if (p.y <= p.groundY + 0.08 && (ssState.speed > 36 || p.sneakersTimer > 0) && Math.random() < 0.22) {
            spawnParticles(p.x + (Math.random() - 0.5) * 0.32, p.groundY + 0.06, 0.25, p.sneakersTimer > 0 ? 0x4ade80 : 0xfde047, 1, 0.38);
        }

        p.runPhase += dt * (ssState.speed * 0.52);

        // Collision & Near-Miss Detection
        var pBottom = p.y;
        var pTop = p.y + (p.rolling ? ROLL_HEIGHT : STAND_HEIGHT);

        if (p.jetpackTimer <= 0) {
            for (var j = 0; j < ssState.obstacles.length; j++) {
                var o = ssState.obstacles[j];
                if (o.cleared) continue;

                // Near-Miss Bonus when dodging beside a train or barrier at the last split-second!
                if (!o.closeCalled && o.zNear > 0.3 && o.zNear < 2.5 && Math.abs(p.x - o.x) >= 1.45 && Math.abs(p.x - o.x) < 3.6 && p.lane !== o.lane) {
                    if (o.kind === "moving_train" || o.kind === "train" || o.kind === "tall") {
                        o.closeCalled = true;
                        ssState.closeCalls++;
                        var ccPts = 50 * getActiveMultiplier();
                        ssState.score = Math.min(MAX_SCORE, ssState.score + ccPts);
                        ssState.combo += 2;
                        ssState.comboDecayTimer = 2.6;
                        if (ssState.combo > ssState.maxCombo) ssState.maxCombo = ssState.combo;
                        addPopup("CLOSE CALL! +" + ccPts, "#38bdf8", p.x, p.y + 1.9, 0);
                    }
                }

                if (p.invulnTimer > 0) continue;

                // Z Overlap with runner at z = 0
                if (o.zNear < -0.40 || o.zFar > 0.42) continue;

                // X Overlap
                var hitHalfW = (o.kind === "train" || o.kind === "moving_train" || o.kind === "ramp_train") ? 1.18 : 1.05;
                if (Math.abs(p.x - o.x) > hitHalfW + playerHalfW * 0.5) continue;

                // Kind-specific vertical bounds
                if (o.kind === "low") {
                    if (pBottom < 1.02) {
                        if (p.hoverboardTimer > 0) {
                            triggerHoverboardSave();
                        } else {
                            triggerCrash("Tripped on a Barrier!");
                        }
                        break;
                    }
                } else if (o.kind === "high") {
                    // Must roll under overhead sign (clearance ~1.10m)
                    if (pTop > 1.10 && pBottom < 2.85) {
                        if (p.hoverboardTimer > 0) {
                            triggerHoverboardSave();
                        } else {
                            triggerCrash("Clotheslined by Signal Gate!");
                        }
                        break;
                    }
                } else if (o.kind === "tall") {
                    if (pBottom < 2.70) {
                        var isSideHit = Math.abs(p.x - o.x) > 0.72 && Math.abs(laneX(p.targetLane) - p.x) > 0.28;
                        if (isSideHit) {
                            p.targetLane = p.prevLane;
                            triggerStumble("SIDESWIPED! GUARD GAINING!");
                        } else if (p.hoverboardTimer > 0) {
                            triggerHoverboardSave();
                        } else {
                            triggerCrash("Smashed Into Barricade!");
                        }
                        break;
                    }
                } else if (o.kind === "train" || o.kind === "moving_train" || o.kind === "ramp_train") {
                    // If on ramp slope and above ramp height, safe!
                    if (o.kind === "ramp_train" && o.zRampEnd < 0) {
                        var rH = rampHeightAt(o, 0);
                        if (pBottom >= rH - 0.65) continue;
                    }
                    // If on top of train roof, safe!
                    if (pBottom >= TRAIN_HEIGHT - 0.58) continue;

                    // Side scrape forgiveness if swiping laterally past the front nose
                    var isSideTrain = o.zNear > 1.25 && Math.abs(laneX(p.targetLane) - p.x) > 0.30;
                    if (isSideTrain) {
                        p.targetLane = p.prevLane;
                        triggerStumble("SCRAPED TRAIN! WATCH OUT!");
                        break;
                    }

                    if (p.hoverboardTimer > 0) {
                        triggerHoverboardSave();
                    } else {
                        triggerCrash(o.kind === "moving_train" ? "Hit Oncoming Express Train!" : "Slammed Into Train Car!");
                    }
                    break;
                }
            }
        }

        // Scroll & Collect Coins (with Magnet Pull!)
        for (var c = ssState.coinsList.length - 1; c >= 0; c--) {
            var coin = ssState.coinsList[c];
            coin.z += stepDist;
            coin.spin += dt * 4.2;

            if (!coin.collected) {
                if (p.magnetTimer > 0 && coin.z > -14 && coin.z < 3) {
                    var cdx = p.x - coin.x;
                    var cdy = (p.y + 0.95) - coin.y;
                    var cdz = 0 - coin.z;
                    var cdist = Math.sqrt(cdx * cdx + cdy * cdy + cdz * cdz);
                    if (cdist < 13.5) {
                        coin.magnetized = true;
                    }
                }
                if (coin.magnetized) {
                    var pull = Math.min(1, dt * 16.0);
                    coin.x += (p.x - coin.x) * pull;
                    coin.y += ((p.y + 0.95) - coin.y) * pull;
                    coin.z += (0 - coin.z) * pull;
                }

                var dX = Math.abs(p.x - coin.x);
                var dY = Math.abs((p.y + 0.85) - coin.y);
                var dZ = Math.abs(coin.z);
                if (dX < 1.05 && dY < 1.25 && dZ < 1.15) {
                    coin.collected = true;
                    ssState.coins++;
                    ssState.runCoinsForBoard++;
                    ssState.combo++;
                    ssState.comboDecayTimer = 2.6;
                    if (ssState.combo > ssState.maxCombo) ssState.maxCombo = ssState.combo;

                    var coinPts = 10 * getActiveMultiplier();
                    ssState.score = Math.min(MAX_SCORE, ssState.score + coinPts);
                    playCoinSfx(ssState.combo);
                    spawnParticles(coin.x, coin.y, 0, 0xfacc15, 4, 0.6);

                    if (ssState.runCoinsForBoard >= 35) {
                        ssState.runCoinsForBoard -= 35;
                        if (ssState.boards < 3) {
                            ssState.boards++;
                            showBanner("+1 HOVERBOARD READY!");
                        }
                    }

                    releaseCoinMesh(coin);
                    ssState.coinsList.splice(c, 1);
                    continue;
                }
            }

            if (coin.mesh) {
                coin.mesh.position.set(coin.x, coin.y, coin.z);
                coin.mesh.rotation.y = coin.spin;
            }

            if (coin.z > 14) {
                releaseCoinMesh(coin);
                ssState.coinsList.splice(c, 1);
            }
        }

        // Scroll & Collect Powerups
        for (var u = ssState.powerups.length - 1; u >= 0; u--) {
            var pu = ssState.powerups[u];
            pu.z += stepDist;

            if (!pu.collected) {
                var pdx = Math.abs(p.x - pu.x);
                var pdy = Math.abs((p.y + 0.9) - pu.y);
                var pdz = Math.abs(pu.z);
                if (pdx < 1.2 && pdy < 1.45 && pdz < 1.25) {
                    pu.collected = true;
                    var puPts = 75 * getActiveMultiplier();
                    ssState.score = Math.min(MAX_SCORE, ssState.score + puPts);
                    playPowerupSfx();
                    spawnParticles(pu.x, pu.y, 0, 0x38bdf8, 12, 1.0);

                    if (pu.type === "jetpack") {
                        p.jetpackTimer = JETPACK_DURATION;
                        showBanner("JETPACK BOOST!");
                        addPopup("JETPACK! +" + puPts, "#fb923c", pu.x, pu.y + 1.2, 0);
                    } else if (pu.type === "magnet") {
                        p.magnetTimer = MAGNET_DURATION;
                        showBanner("COIN MAGNET!");
                        addPopup("MAGNET! +" + puPts, "#f87171", pu.x, pu.y + 1.2, 0);
                    } else if (pu.type === "sneakers") {
                        p.sneakersTimer = SNEAKERS_DURATION;
                        showBanner("SUPER SNEAKERS!");
                        addPopup("SUPER JUMP! +" + puPts, "#4ade80", pu.x, pu.y + 1.2, 0);
                    } else if (pu.type === "multiplier") {
                        p.multTimer = MULTIPLIER_DURATION;
                        showBanner("2\u00D7 MULTIPLIER!");
                        addPopup("2\u00D7 SCORE! +" + puPts, "#c084fc", pu.x, pu.y + 1.2, 0);
                    } else if (pu.type === "board") {
                        if (ssState.boards < 3) ssState.boards++;
                        showBanner("+1 HOVERBOARD!");
                        addPopup("+1 BOARD! +" + puPts, "#22d3ee", pu.x, pu.y + 1.2, 0);
                    }

                    releasePowerupMesh(pu);
                    ssState.powerups.splice(u, 1);
                    continue;
                }
            }

            if (pu.mesh) {
                pu.mesh.position.set(pu.x, pu.y + Math.sin(ssState.elapsed * 4.5 + u) * 0.18, pu.z);
                pu.mesh.rotation.y = ssState.elapsed * 2.4;
                if (pu.mesh.userData.ring) {
                    pu.mesh.userData.ring.rotation.x = ssState.elapsed * 3.1;
                }
            }

            if (pu.z > 14) {
                releasePowerupMesh(pu);
                ssState.powerups.splice(u, 1);
            }
        }

        // Advance Next Chunk Spawner
        ssState.nextChunkZ += stepDist;
        while (ssState.nextChunkZ > -152) {
            ssState.nextChunkZ = generateChunk(ssState.nextChunkZ);
        }

        updateParticles(dt);
        updatePopups(dt);
        updateHudDom();
    }

    function updateParticles(dt) {
        for (var i = 0; i < particlePool.length; i++) {
            var p = particlePool[i];
            if (!p.active) continue;
            p.life += dt;
            if (p.life >= p.maxLife) {
                p.active = false;
                if (p.mesh) p.mesh.visible = false;
                continue;
            }
            p.vy -= 22 * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.z += p.vz * dt;
            if (useThree && p.mesh) {
                p.mesh.position.set(p.x, p.y, p.z);
                p.mesh.rotation.x += dt * 8;
                p.mesh.rotation.y += dt * 7;
                var s = Math.max(0.05, 1 - p.life / p.maxLife);
                p.mesh.scale.setScalar(s);
            }
        }

        for (var d = 0; d < dustRingPool.length; d++) {
            var dr = dustRingPool[d];
            if (!dr.active) continue;
            dr.life += dt;
            if (dr.life >= dr.maxLife) {
                dr.active = false;
                dr.mesh.visible = false;
                continue;
            }
            var t = dr.life / dr.maxLife;
            dr.mesh.scale.setScalar(0.55 + t * 2.15);
            dr.mesh.material.opacity = 0.72 * (1 - t);
        }
    }

    function updatePopups(dt) {
        if (!viewportEl) return;
        var w = viewportEl.clientWidth || 640;
        var h = viewportEl.clientHeight || 520;
        for (var i = ssState.popups.length - 1; i >= 0; i--) {
            var pop = ssState.popups[i];
            pop.life += dt;
            if (pop.life >= pop.maxLife) {
                if (pop.el && pop.el.parentNode) pop.el.parentNode.removeChild(pop.el);
                ssState.popups.splice(i, 1);
                continue;
            }
            var sx = w * 0.5;
            var sy = h * 0.42;
            if (useThree && threeCamera) {
                var v = new THREE.Vector3(pop.wx, pop.wy + pop.life * 1.6, pop.wz);
                v.project(threeCamera);
                sx = (v.x * 0.5 + 0.5) * w;
                sy = (-v.y * 0.5 + 0.5) * h;
            } else {
                sy -= pop.life * 48;
            }
            pop.el.style.left = sx + "px";
            pop.el.style.top = sy + "px";
            pop.el.style.opacity = String(Math.max(0, 1 - pop.life / pop.maxLife));
        }
    }

    // =========================================================================
    // --- HUD Updates ---
    // =========================================================================

    function updateHudDom() {
        var p = ssState.player;
        if (hudScoreEl) hudScoreEl.textContent = Math.round(ssState.score).toLocaleString();
        if (hudCoinsEl) hudCoinsEl.textContent = ssState.coins.toLocaleString();
        if (hudMultEl) hudMultEl.textContent = "\u00D7" + getActiveMultiplier();
        if (hudComboEl) hudComboEl.textContent = ssState.combo.toLocaleString();
        if (hudSpeedEl) hudSpeedEl.textContent = (ssState.speed / BASE_SPEED).toFixed(1) + "\u00D7";
        if (hudDistEl) hudDistEl.textContent = Math.round(ssState.distance).toLocaleString() + " m";
        if (hudBoardsEl) hudBoardsEl.textContent = String(ssState.boards);
        if (touchBoardCountEl) touchBoardCountEl.textContent = String(ssState.boards);

        var bio = BIOMES[ssState.biomeIdx] || BIOMES[0];
        if (hudBiomeEl) {
            hudBiomeEl.textContent = bio.name;
            hudBiomeEl.style.background = bio.badgeBg;
            hudBiomeEl.style.borderColor = bio.badgeBorder;
            hudBiomeEl.style.color = bio.badgeColor;
        }

        if (speedLinesEl) {
            if (ssState.mode !== "playing") {
                speedLinesEl.style.opacity = "0";
            } else {
                var sr = Math.max(0, (ssState.speed - BASE_SPEED) / (MAX_SPEED - BASE_SPEED));
                var slOp = (sr > 0.22 ? (sr - 0.22) * 0.72 : 0)
                    + (p.jetpackTimer > 0 ? 0.36 : 0)
                    + (p.sneakersTimer > 0 ? 0.20 : 0)
                    + (p.hoverboardTimer > 0 ? 0.14 : 0);
                speedLinesEl.style.opacity = Math.min(0.85, slOp).toFixed(2);
            }
        }

        if (btnBoardTop) {
            btnBoardTop.classList.toggle("is-active", p.hoverboardTimer > 0);
            btnBoardTop.classList.toggle("is-empty", ssState.boards <= 0 && p.hoverboardTimer <= 0);
        }
        if (touchBoardBtn) {
            touchBoardBtn.classList.toggle("is-empty", ssState.boards <= 0 && p.hoverboardTimer <= 0);
        }

        if (chasePillEl) {
            chasePillEl.hidden = !(ssState.mode === "playing" && p.stumbleTimer > 0);
        }

        if (powerupsStackEl) {
            var items = [];
            if (p.hoverboardTimer > 0) items.push({ cls: "is-board", label: "BOARD", pct: (p.hoverboardTimer / HOVERBOARD_DURATION) * 100, sec: p.hoverboardTimer.toFixed(1) + "s" });
            if (p.jetpackTimer > 0) items.push({ cls: "is-jetpack", label: "JETPACK", pct: (p.jetpackTimer / JETPACK_DURATION) * 100, sec: p.jetpackTimer.toFixed(1) + "s" });
            if (p.magnetTimer > 0) items.push({ cls: "is-magnet", label: "MAGNET", pct: (p.magnetTimer / MAGNET_DURATION) * 100, sec: p.magnetTimer.toFixed(1) + "s" });
            if (p.sneakersTimer > 0) items.push({ cls: "is-sneakers", label: "SNEAKERS", pct: (p.sneakersTimer / SNEAKERS_DURATION) * 100, sec: p.sneakersTimer.toFixed(1) + "s" });
            if (p.multTimer > 0) items.push({ cls: "is-mult", label: "2\u00D7 MULT", pct: (p.multTimer / MULTIPLIER_DURATION) * 100, sec: p.multTimer.toFixed(1) + "s" });

            var html = "";
            for (var i = 0; i < items.length; i++) {
                var it = items[i];
                html +=
                    '<div class="ss-pu-chip ' + it.cls + '">' +
                    '  <div class="ss-pu-row"><span>' + it.label + '</span><span>' + it.sec + '</span></div>' +
                    '  <div class="ss-pu-track"><div class="ss-pu-fill" style="width:' + Math.max(0, Math.min(100, it.pct)).toFixed(1) + '%"></div></div>' +
                    '</div>';
            }
            powerupsStackEl.innerHTML = html;
        }
    }

    // =========================================================================
    // --- Three.js Animation & Rendering + 2.5D Canvas Fallback ---
    // =========================================================================

    var curSkyCol = null;
    var tmpTargetCol = null;

    function updateThreeScene() {
        var p = ssState.player;
        var bio = BIOMES[ssState.biomeIdx] || BIOMES[0];

        // Smooth Biome Atmosphere Transitions
        if (threeRenderer && threeScene) {
            if (!curSkyCol) {
                curSkyCol = new THREE.Color(bio.sky);
                tmpTargetCol = new THREE.Color();
            }
            tmpTargetCol.setHex(bio.sky);
            curSkyCol.lerp(tmpTargetCol, 0.035);
            threeRenderer.setClearColor(curSkyCol, 1);

            if (threeScene.fog) {
                tmpTargetCol.setHex(bio.fog);
                threeScene.fog.color.lerp(tmpTargetCol, 0.035);
                threeScene.fog.density += (bio.fogDensity - threeScene.fog.density) * 0.035;
            }
            if (hemiLight) {
                tmpTargetCol.setHex(bio.hemiSky);
                hemiLight.color.lerp(tmpTargetCol, 0.035);
                tmpTargetCol.setHex(bio.hemiGround);
                hemiLight.groundColor.lerp(tmpTargetCol, 0.035);
            }
            if (sunLight) {
                tmpTargetCol.setHex(bio.sun);
                sunLight.color.lerp(tmpTargetCol, 0.035);
            }
            if (rimLight) {
                tmpTargetCol.setHex(bio.rim);
                rimLight.color.lerp(tmpTargetCol, 0.035);
            }
            if (gantryLampMat) {
                tmpTargetCol.setHex(bio.lamp);
                gantryLampMat.color.lerp(tmpTargetCol, 0.05);
            }
        }

        // Scroll seamless ground/platform/wall textures toward +Z (the camera)
        if (textures.track) {
            textures.track.offset.y = (ssState.worldScrollZ / 10.0) % 1;
        }
        if (textures.platform) {
            textures.platform.offset.y = (ssState.worldScrollZ / 11.0) % 1;
        }
        if (textures.platformLeft) {
            textures.platformLeft.offset.y = (ssState.worldScrollZ / 11.0) % 1;
        }
        if (textures.wall) {
            textures.wall.offset.x = (ssState.worldScrollZ / 22.0) % 1;
        }
        if (textures.wallRight) {
            textures.wallRight.offset.x = -((ssState.worldScrollZ / 22.0) % 1);
        }

        for (var w = 0; w < wallMeshes.length; w++) {
            wallMeshes[w].visible = bio.showWalls;
        }
        if (waterMesh) {
            waterMesh.visible = bio.showBridge;
        }

        // Express Train Lane Warnings + Gantry Signals
        var warnLanes = { "-1": false, "0": false, "1": false };
        for (var ow = 0; ow < ssState.obstacles.length; ow++) {
            var mo = ssState.obstacles[ow];
            if (!mo.cleared && mo.kind === "moving_train" && mo.zNear >= -115 && mo.zNear < -1.5) {
                warnLanes[mo.lane] = true;
            }
        }
        var warnFlash = Math.sin(ssState.elapsed * 20) > 0;
        for (var wl = -1; wl <= 1; wl++) {
            var isWarn = !!warnLanes[wl];
            if (laneWarnMeshes[wl]) {
                laneWarnMeshes[wl].visible = isWarn;
                laneWarnMeshes[wl].material.opacity = warnFlash ? 0.42 : 0.14;
            }
            if (laneSignalMats[wl + 1]) {
                laneSignalMats[wl + 1].color.setHex(isWarn ? (warnFlash ? 0xef4444 : 0xfacc15) : 0x38bdf8);
            }
        }

        // Scroll Overhead Gantries
        for (var g = 0; g < gantryPool.length; g++) {
            var gz = ((-g * 22 + ssState.worldScrollZ) % 220);
            if (gz > 15) gz -= 220;
            gantryPool[g].position.z = gz;
        }

        // Scroll Neon Tunnel Arches
        for (var ta = 0; ta < tunnelArchPool.length; ta++) {
            tunnelArchPool[ta].visible = bio.showTunnel;
            if (bio.showTunnel) {
                var tz = ((-ta * 22 + ssState.worldScrollZ) % 220);
                if (tz > 15) tz -= 220;
                tunnelArchPool[ta].position.z = tz;
            }
        }

        // Scroll Harbor Bridge Suspension Pylons
        for (var bt = 0; bt < bridgeTowerPool.length; bt++) {
            bridgeTowerPool[bt].visible = bio.showBridge;
            if (bio.showBridge) {
                var btz = ((-bt * 36 + ssState.worldScrollZ) % 216);
                if (btz > 20) btz -= 216;
                bridgeTowerPool[bt].position.z = btz;
            }
        }

        // Scroll Flanking Skyline Buildings (hidden inside closed tunnel or open water bridge)
        var showBuildings = !bio.showTunnel && !bio.showBridge;
        for (var b = 0; b < buildingPool.length; b++) {
            buildingPool[b].mesh.visible = showBuildings;
            if (showBuildings) {
                var slot = Math.floor(b / 2);
                var bz = ((-slot * 24 + ssState.worldScrollZ) % 192);
                if (bz > 20) bz -= 192;
                buildingPool[b].mesh.position.z = bz;
            }
        }

        // Animate Articulated Surfer Rig
        if (surferRig) {
            surferRig.root.position.set(p.x, p.y, 0);

            // Blink gently while invulnerable after hoverboard save
            surferRig.root.visible = !(p.invulnTimer > 0 && Math.floor(ssState.elapsed * 18) % 2 === 0);

            var tg = surferRig.tiltGroup;
            tg.scale.set(p.squashX, p.squashY, p.squashX);
            if (p.rolling) {
                tg.position.y = 0.45;
                tg.rotation.x = -p.flipAngle;
                tg.rotation.y = 0;
                tg.rotation.z = p.tiltRoll;
            } else if (p.hoverboardTimer > 0) {
                tg.position.y = 0.14 + Math.sin(ssState.elapsed * 9) * 0.05;
                tg.rotation.x = 0;
                tg.rotation.y = 0.55; // Sideways surf stance!
                tg.rotation.z = p.tiltRoll * 1.65;
            } else {
                tg.position.y = p.y <= p.groundY + 0.05 ? Math.abs(Math.sin(p.runPhase)) * 0.09 : 0;
                tg.rotation.x = p.jetpackTimer > 0 ? -0.25 : (p.y > p.groundY + 0.1 ? -0.12 : -0.06);
                tg.rotation.y = 0;
                tg.rotation.z = p.tiltRoll;
            }

            // Limb animation
            if (p.jetpackTimer > 0) {
                surferRig.leftLeg.rotation.x = 0.28 + Math.sin(ssState.elapsed * 10) * 0.15;
                surferRig.rightLeg.rotation.x = -0.22 - Math.sin(ssState.elapsed * 10) * 0.15;
                surferRig.leftArm.rotation.x = -0.7;
                surferRig.rightArm.rotation.x = -0.7;
            } else if (p.hoverboardTimer > 0) {
                surferRig.leftLeg.rotation.x = 0.15;
                surferRig.rightLeg.rotation.x = -0.18;
                surferRig.leftArm.rotation.z = -0.55;
                surferRig.rightArm.rotation.z = 0.55;
                surferRig.leftArm.rotation.x = 0;
                surferRig.rightArm.rotation.x = 0;
            } else if (p.y > p.groundY + 0.15) {
                surferRig.leftLeg.rotation.x = 0.55;
                surferRig.rightLeg.rotation.x = -0.42;
                surferRig.leftArm.rotation.x = -0.9;
                surferRig.rightArm.rotation.x = 0.65;
                surferRig.leftArm.rotation.z = -0.15;
                surferRig.rightArm.rotation.z = 0.15;
            } else {
                var swing = Math.sin(p.runPhase) * 0.88;
                surferRig.leftLeg.rotation.x = swing;
                surferRig.rightLeg.rotation.x = -swing;
                surferRig.leftArm.rotation.x = -swing * 0.9;
                surferRig.rightArm.rotation.x = swing * 0.9;
                surferRig.leftArm.rotation.z = -0.1;
                surferRig.rightArm.rotation.z = 0.1;
            }

            // Powerup visual attachments
            surferRig.hoverboard.visible = p.hoverboardTimer > 0;
            if (p.hoverboardTimer > 0 && surferRig.boardTrail) {
                surferRig.boardTrail.scale.z = 0.85 + Math.sin(ssState.elapsed * 28) * 0.24;
            }
            surferRig.jetpack.visible = p.jetpackTimer > 0;
            if (p.jetpackTimer > 0) {
                var fl = 0.75 + Math.random() * 0.65;
                surferRig.flameL.scale.set(1, fl, 1);
                surferRig.flameR.scale.set(1, fl, 1);
            }
            surferRig.magnetHalo.visible = p.magnetTimer > 0;
            if (p.magnetTimer > 0) {
                surferRig.magnetHalo.rotation.y = ssState.elapsed * 4.5;
            }
            var showSuper = p.sneakersTimer > 0;
            surferRig.superL.visible = showSuper;
            surferRig.superR.visible = showSuper;

            // Shadow follows ground below player
            var heightAbove = Math.max(0, p.y - p.groundY);
            var shScale = Math.max(0.32, 1.0 - heightAbove * 0.085);
            surferRig.shadowMesh.position.set(p.x, p.groundY + 0.04, 0);
            surferRig.shadowMesh.scale.setScalar(shScale);
        }

        // Animate Chasing Inspector & Hound
        if (inspectorRig) {
            var closeFactor = p.stumbleTimer > 0 ? Math.min(1, p.stumbleTimer / 3.0) : 0;
            var chaseZ = 3.15 + (1 - closeFactor) * 6.5;
            if (ssState.mode === "crashing" || ssState.mode === "gameover") {
                chaseZ = 1.65;
            }
            inspectorRig.root.visible = p.jetpackTimer <= 0 && chaseZ < 8.8;
            if (inspectorRig.root.visible) {
                inspectorRig.root.position.set(p.x * 0.75, Math.min(p.y * 0.4, 1.5), chaseZ);
                var gSwing = Math.sin(p.runPhase * 1.15) * 0.85;
                inspectorRig.gLegL.rotation.x = gSwing;
                inspectorRig.gLegR.rotation.x = -gSwing;
                inspectorRig.gArmL.rotation.x = -gSwing;
                inspectorRig.gArmR.rotation.x = gSwing;
                inspectorRig.dog.position.y = Math.abs(Math.sin(p.runPhase * 1.5)) * 0.14;
            }
        }

        // Dynamic Camera Tracking + Speed FOV + Trauma Shake
        if (threeCamera) {
            var speedRatio = (ssState.speed - BASE_SPEED) / (MAX_SPEED - BASE_SPEED);
            var targetFov = 58 + speedRatio * 9 + (p.jetpackTimer > 0 ? 5 : 0);
            threeCamera.fov += (targetFov - threeCamera.fov) * 0.1;
            threeCamera.updateProjectionMatrix();

            var shakeX = (Math.random() - 0.5) * ssState.trauma * 0.55;
            var shakeY = (Math.random() - 0.5) * ssState.trauma * 0.45;

            var desiredCamX = p.x * 0.62 + shakeX;
            var desiredCamY = 4.65 + p.y * 0.78 + shakeY;
            var desiredCamZ = 7.35 + (p.jetpackTimer > 0 ? 1.1 : 0);

            threeCamera.position.x += (desiredCamX - threeCamera.position.x) * 0.16;
            threeCamera.position.y += (desiredCamY - threeCamera.position.y) * 0.14;
            threeCamera.position.z += (desiredCamZ - threeCamera.position.z) * 0.12;

            threeCamera.lookAt(p.x * 0.35, 1.45 + p.y * 0.65, -14.0);
        }
    }

    function renderFallback2D() {
        if (!fallbackCtx || !canvasEl) return;
        var ctx = fallbackCtx;
        var w = viewportEl ? (viewportEl.clientWidth || 640) : 640;
        var h = viewportEl ? (viewportEl.clientHeight || 520) : 520;
        var p = ssState.player;
        var bio = BIOMES[ssState.biomeIdx] || BIOMES[0];

        // Biome-synced sky gradient
        var sky = ctx.createLinearGradient(0, 0, 0, h * 0.54);
        sky.addColorStop(0, bio.skyTop);
        sky.addColorStop(0.65, bio.skyMid);
        sky.addColorStop(1, bio.skyHorizon);
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, w, h);

        // Ground asphalt / harbor water tint
        ctx.fillStyle = bio.ground2d;
        ctx.fillRect(0, h * 0.46, w, h * 0.54);

        var camX = p.x * 0.62;
        var camY = 4.6 + p.y * 0.75;
        var camZ = 7.3;
        var fovScale = h * 0.85;

        function project(wx, wy, wz) {
            var dz = camZ - wz;
            if (dz <= 0.3) return null;
            var scale = fovScale / dz;
            return {
                x: w * 0.5 + (wx - camX) * scale,
                y: h * 0.48 - (wy - camY) * scale,
                scale: scale,
                dz: dz
            };
        }

        // Draw 3 Subway Tracks
        var nearL = project(-TRACK_HALF_W, 0, 4);
        var nearR = project(TRACK_HALF_W, 0, 4);
        var farL = project(-TRACK_HALF_W, 0, -135);
        var farR = project(TRACK_HALF_W, 0, -135);
        if (nearL && nearR && farL && farR) {
            ctx.fillStyle = "#2b303c";
            ctx.beginPath();
            ctx.moveTo(nearL.x, nearL.y);
            ctx.lineTo(nearR.x, nearR.y);
            ctx.lineTo(farR.x, farR.y);
            ctx.lineTo(farL.x, farL.y);
            ctx.closePath();
            ctx.fill();

            // Express lane warning strip highlight in 2.5D fallback
            for (var wo = 0; wo < ssState.obstacles.length; wo++) {
                var mo = ssState.obstacles[wo];
                if (!mo.cleared && mo.kind === "moving_train" && mo.zNear >= -115 && mo.zNear < -1.5) {
                    var wlN = project(mo.x - 1.2, 0.02, 2);
                    var wrN = project(mo.x + 1.2, 0.02, 2);
                    var wlF = project(mo.x - 1.2, 0.02, -110);
                    var wrF = project(mo.x + 1.2, 0.02, -110);
                    if (wlN && wrN && wlF && wrF) {
                        ctx.fillStyle = Math.sin(ssState.elapsed * 20) > 0 ? "rgba(239,68,68,0.34)" : "rgba(250,204,21,0.18)";
                        ctx.beginPath();
                        ctx.moveTo(wlN.x, wlN.y);
                        ctx.lineTo(wrN.x, wrN.y);
                        ctx.lineTo(wrF.x, wrF.y);
                        ctx.lineTo(wlF.x, wlF.y);
                        ctx.closePath();
                        ctx.fill();
                    }
                }
            }

            // Rails
            ctx.strokeStyle = "#cbd5e1";
            ctx.lineWidth = 2;
            for (var ln = -1; ln <= 1; ln++) {
                var lx = laneX(ln);
                for (var side = -1; side <= 1; side += 2) {
                    var rx = lx + side * 0.72;
                    var p0 = project(rx, 0.02, 4);
                    var p1 = project(rx, 0.02, -135);
                    if (p0 && p1) {
                        ctx.beginPath();
                        ctx.moveTo(p0.x, p0.y);
                        ctx.lineTo(p1.x, p1.y);
                        ctx.stroke();
                    }
                }
            }
        }

        // Sort obstacles far-to-near
        var sortedObs = ssState.obstacles.slice().sort(function (a, b) {
            return a.zNear - b.zNear;
        });

        for (var i = 0; i < sortedObs.length; i++) {
            var o = sortedObs[i];
            if (o.cleared || o.zNear < -135 || o.zFar > 5) continue;
            var pr = project(o.x, 0, o.zNear);
            if (!pr) continue;

            if (o.kind === "low") {
                var lw = 2.4 * pr.scale;
                var lh = 1.05 * pr.scale;
                ctx.fillStyle = "#ef4444";
                ctx.fillRect(pr.x - lw / 2, pr.y - lh, lw, lh);
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(pr.x - lw * 0.25, pr.y - lh, lw * 0.5, lh * 0.45);
            } else if (o.kind === "high") {
                var gw = 2.5 * pr.scale;
                var gyTop = pr.y - 2.65 * pr.scale;
                var gyBot = pr.y - 1.15 * pr.scale;
                ctx.fillStyle = "#f59e0b";
                ctx.fillRect(pr.x - gw / 2, gyTop, gw, gyBot - gyTop);
                ctx.fillStyle = "#cbd5e1";
                ctx.fillRect(pr.x - gw / 2, gyTop, 4, pr.y - gyTop);
                ctx.fillRect(pr.x + gw / 2 - 4, gyTop, 4, pr.y - gyTop);
            } else if (o.kind === "tall") {
                var tw = 2.2 * pr.scale;
                var th = 2.7 * pr.scale;
                ctx.fillStyle = "#334155";
                ctx.fillRect(pr.x - tw / 2, pr.y - th, tw, th);
                ctx.fillStyle = "#f97316";
                ctx.fillRect(pr.x - tw / 2, pr.y - th, tw, th * 0.14);
            } else {
                var trw = 2.5 * pr.scale;
                var trh = TRAIN_HEIGHT * pr.scale;
                var trCol = o.kind === "moving_train" ? "#dc2626" : "#0284c7";
                ctx.fillStyle = trCol;
                ctx.fillRect(pr.x - trw / 2, pr.y - trh, trw, trh);
                ctx.fillStyle = "#0f172a";
                ctx.fillRect(pr.x - trw * 0.38, pr.y - trh * 0.78, trw * 0.76, trh * 0.28);
                ctx.fillStyle = o.kind === "moving_train" ? "#fef08a" : "#ef4444";
                ctx.beginPath();
                ctx.arc(pr.x - trw * 0.28, pr.y - trh * 0.22, Math.max(2, trw * 0.08), 0, Math.PI * 2);
                ctx.arc(pr.x + trw * 0.28, pr.y - trh * 0.22, Math.max(2, trw * 0.08), 0, Math.PI * 2);
                ctx.fill();
                if (o.kind === "ramp_train") {
                    ctx.fillStyle = "#facc15";
                    ctx.fillRect(pr.x - trw * 0.46, pr.y - trh * 0.25, trw * 0.92, trh * 0.25);
                }
            }
        }

        // Coins
        for (var c = 0; c < ssState.coinsList.length; c++) {
            var coin = ssState.coinsList[c];
            if (coin.collected || coin.z < -130 || coin.z > 5) continue;
            var cp = project(coin.x, coin.y, coin.z);
            if (!cp) continue;
            var cr = Math.max(3, 0.42 * cp.scale);
            ctx.fillStyle = "#facc15";
            ctx.beginPath();
            ctx.arc(cp.x, cp.y, cr, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#fef08a";
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        // Powerups
        var puColors = { jetpack: "#f97316", magnet: "#ef4444", sneakers: "#22c55e", multiplier: "#a855f7", board: "#22d3ee" };
        for (var u = 0; u < ssState.powerups.length; u++) {
            var pu = ssState.powerups[u];
            if (pu.collected || pu.z < -130 || pu.z > 5) continue;
            var up = project(pu.x, pu.y, pu.z);
            if (!up) continue;
            var ur = Math.max(5, 0.55 * up.scale);
            ctx.fillStyle = puColors[pu.type] || "#38bdf8";
            ctx.beginPath();
            ctx.arc(up.x, up.y, ur, 0, Math.PI * 2);
            ctx.fill();
        }

        // Surfer character
        var sp = project(p.x, p.y, 0);
        if (sp) {
            var ph = (p.rolling ? ROLL_HEIGHT : STAND_HEIGHT) * sp.scale;
            var pw = 0.72 * sp.scale;
            if (p.hoverboardTimer > 0) {
                ctx.fillStyle = "rgba(34, 211, 238, 0.36)";
                ctx.fillRect(sp.x - pw * 0.55, sp.y - 2, pw * 1.1, 14);
                ctx.fillStyle = "#22d3ee";
                ctx.fillRect(sp.x - pw * 0.75, sp.y - 6, pw * 1.5, 8);
            }
            ctx.fillStyle = "#06b6d4";
            ctx.fillRect(sp.x - pw / 2, sp.y - ph, pw, ph * 0.7);
            ctx.fillStyle = "#ef4444";
            ctx.beginPath();
            ctx.arc(sp.x, sp.y - ph * 0.85, pw * 0.38, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function render() {
        if (useThree && threeRenderer && threeScene && threeCamera) {
            updateThreeScene();
            threeRenderer.render(threeScene, threeCamera);
        } else {
            renderFallback2D();
        }
    }

    function ssLoop(now) {
        if (!ssState.active && ssState.mode !== "playing" && ssState.mode !== "crashing") {
            ssState.animFrame = null;
            return;
        }
        var dt = (now - (ssState.lastTime || now)) / 1000;
        ssState.lastTime = now;
        updateSimulation(dt);
        render();
        ssState.animFrame = requestAnimationFrame(ssLoop);
    }

    function ssInitGraphics() {
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
                threeRenderer.setClearColor(0x1b254b, 1);
                threeRenderer.shadowMap.enabled = true;
                threeRenderer.shadowMap.type = THREE.PCFSoftShadowMap;

                threeScene = new THREE.Scene();
                threeScene.fog = new THREE.FogExp2(0x2d1e4f, 0.0082);

                var aspect = (viewportEl.clientWidth || 640) / (viewportEl.clientHeight || 520);
                threeCamera = new THREE.PerspectiveCamera(58, aspect, 0.3, 240);
                threeCamera.position.set(0, 4.65, 7.35);
                threeCamera.lookAt(0, 1.45, -14);

                hemiLight = new THREE.HemisphereLight(0xcbe8ff, 0x2b243d, 0.96);
                threeScene.add(hemiLight);

                sunLight = new THREE.DirectionalLight(0xffe5b8, 1.15);
                sunLight.position.set(18, 34, 20);
                sunLight.castShadow = true;
                sunLight.shadow.mapSize.width = 1024;
                sunLight.shadow.mapSize.height = 1024;
                sunLight.shadow.camera.near = 4;
                sunLight.shadow.camera.far = 110;
                sunLight.shadow.camera.left = -22;
                sunLight.shadow.camera.right = 22;
                sunLight.shadow.camera.top = 24;
                sunLight.shadow.camera.bottom = -48;
                sunLight.shadow.bias = -0.0012;
                threeScene.add(sunLight);

                rimLight = new THREE.DirectionalLight(0x38bdf8, 0.48);
                rimLight.position.set(-20, 14, -22);
                threeScene.add(rimLight);

                ensureSharedAssets();
                buildStaticWorld();

                surferRig = createSurferRig();
                threeScene.add(surferRig.root);
                threeScene.add(surferRig.shadowMesh);

                inspectorRig = createInspectorRig();
                threeScene.add(inspectorRig.root);

                useThree = true;
            } catch (err) {
                useThree = false;
            }
        }

        if (!useThree && canvasEl) {
            fallbackCtx = canvasEl.getContext("2d");
        }

        ssResize();
        render();
    }

    function ssResize() {
        if (!viewportEl || !canvasEl) return;
        var w = viewportEl.clientWidth;
        var h = viewportEl.clientHeight;
        if (w <= 0 || h <= 0) return;

        if (useThree && threeRenderer && threeCamera) {
            threeRenderer.setSize(w, h, false);
            threeCamera.aspect = w / h;
            threeCamera.updateProjectionMatrix();
        } else {
            var dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvasEl.width = Math.round(w * dpr);
            canvasEl.height = Math.round(h * dpr);
            if (fallbackCtx) fallbackCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
        render();
    }

    function ssPause() {
        if (speedLinesEl) speedLinesEl.style.opacity = "0";
        if (ssState.animFrame) {
            cancelAnimationFrame(ssState.animFrame);
            ssState.animFrame = null;
        }
    }

    function ssResume() {
        if (ssState.active && !ssState.animFrame) {
            ssState.lastTime = performance.now();
            ssState.animFrame = requestAnimationFrame(ssLoop);
        }
    }

    // =========================================================================
    // --- DOM Event Bindings & Touch Swipes ---
    // =========================================================================

    if (startBtn) {
        startBtn.addEventListener("click", function (ev) {
            ev.stopPropagation();
            ssStartGame();
        });
    }

    if (againBtn) {
        againBtn.addEventListener("click", function (ev) {
            ev.stopPropagation();
            ssStartGame();
        });
    }

    if (btnRestart) {
        btnRestart.addEventListener("click", function () {
            ssStartGame();
        });
    }

    function bindControlBtn(el, fn) {
        if (!el) return;
        var lastPointerMs = 0;
        el.addEventListener("pointerdown", function (ev) {
            ev.preventDefault();
            ev.stopPropagation();
            lastPointerMs = performance.now();
            el.classList.add("is-pressed");
            fn();
        });
        el.addEventListener("click", function (ev) {
            ev.stopPropagation();
            if (performance.now() - lastPointerMs < 350) return;
            fn();
        });
        var unpress = function () { el.classList.remove("is-pressed"); };
        el.addEventListener("pointerup", unpress);
        el.addEventListener("pointercancel", unpress);
        el.addEventListener("pointerleave", unpress);
    }

    bindControlBtn(touchLeftBtn, function () { queueAction("left"); });
    bindControlBtn(touchRightBtn, function () { queueAction("right"); });
    bindControlBtn(touchJumpBtn, function () { queueAction("jump"); });
    bindControlBtn(touchRollBtn, function () { queueAction("roll"); });
    bindControlBtn(touchBoardBtn, activateHoverboard);
    bindControlBtn(btnBoardTop, activateHoverboard);

    if (viewportEl) {
        var gesture = { active: false, startX: 0, startY: 0, swiped: false };

        viewportEl.addEventListener("pointerdown", function (ev) {
            if (GAME_KEY !== "subway-surfer" && (!window.McWutGames || window.McWutGames.activeGameKey !== "subway-surfer")) return;
            if (ev.target.closest("button") || ev.target.closest(".ss-touch-controls") || ev.target.closest(".game-overlay-card")) return;
            if (ssState.mode === "idle") {
                ssStartGame();
                return;
            }
            if (ssState.mode !== "playing") return;

            gesture.active = true;
            gesture.startX = ev.clientX;
            gesture.startY = ev.clientY;
            gesture.swiped = false;
        });

        viewportEl.addEventListener("pointermove", function (ev) {
            if (!gesture.active || gesture.swiped || ssState.mode !== "playing") return;
            var dx = ev.clientX - gesture.startX;
            var dy = ev.clientY - gesture.startY;
            if (dx * dx + dy * dy >= 22 * 22) {
                gesture.swiped = true;
                if (Math.abs(dx) > Math.abs(dy)) {
                    queueAction(dx < 0 ? "left" : "right");
                } else {
                    queueAction(dy < 0 ? "jump" : "roll");
                }
            }
        });

        var endGesture = function () {
            if (!gesture.active) return;
            if (!gesture.swiped && ssState.mode === "playing") {
                var now = performance.now();
                if (now - ssInput.lastTapTime < 300) {
                    activateHoverboard();
                    ssInput.lastTapTime = 0;
                } else {
                    ssInput.lastTapTime = now;
                }
            }
            gesture.active = false;
            gesture.swiped = false;
        };

        viewportEl.addEventListener("pointerup", endGesture);
        viewportEl.addEventListener("pointercancel", endGesture);
    }

    window.addEventListener("resize", ssResize);
    if (window.ResizeObserver && viewportEl) {
        try {
            new ResizeObserver(ssResize).observe(viewportEl);
        } catch (e) {}
    }

    // =========================================================================
    // --- Public & Hub Registration ---
    // =========================================================================

    window.McWutGames.subwaySurfer = {
        state: ssState,
        ssInitGraphics: ssInitGraphics,
        ssStartGame: ssStartGame,
        ssPause: ssPause,
        ssResume: ssResume,
        ssResize: ssResize,
        ssHandleKey: ssHandleKey,
        ssClearInput: ssClearInput,
        setMuted: function (m) { muted = !!m; }
    };

    window.ssState = ssState;
    window.ssInitGraphics = ssInitGraphics;
    window.ssStartGame = ssStartGame;
    window.ssPause = ssPause;
    window.ssResume = ssResume;
    window.ssResize = ssResize;
    window.ssHandleKey = ssHandleKey;
    window.ssClearInput = ssClearInput;
})();
