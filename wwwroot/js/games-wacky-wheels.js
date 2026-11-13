(function () {
    "use strict";

    window.McWutGames = window.McWutGames || {};

    // =========================================================================
    // WACKY WHEELS (2D RAGDOLL PHYSICS OBSTACLE COURSE + LEVEL EDITOR)
    // =========================================================================
    var wwStage = document.getElementById("wheels-stage");
    var wwViewport = document.getElementById("ww-viewport");
    var wwCanvas = document.getElementById("ww-canvas");
    var wwCtx = wwCanvas ? wwCanvas.getContext("2d") : null;

    var wwTabOfficial = document.getElementById("ww-tab-official");
    var wwTabLevels = document.getElementById("ww-tab-levels");
    var wwTabEditor = document.getElementById("ww-tab-editor");
    var wwLevelsCountBadge = document.getElementById("ww-levels-count");
    var wwCustomPlayingBar = document.getElementById("ww-custom-playing-bar");
    var wwCustomTitleLabel = document.getElementById("ww-custom-title-label");
    var wwCustomAuthorSlot = document.getElementById("ww-custom-author-slot");
    var wwShareLevelBtn = document.getElementById("ww-share-level-btn");
    var wwRemixActiveBtn = document.getElementById("ww-remix-active-btn");

    var wwEditorToolbar = document.getElementById("ww-editor-toolbar");
    var wwTelemetryBar = document.getElementById("ww-telemetry-bar");
    var wwToolPalette = document.getElementById("ww-tool-palette");
    var wwEdPanLeft = document.getElementById("ww-ed-pan-left");
    var wwEdPanRight = document.getElementById("ww-ed-pan-right");
    var wwEdZoomOutBtn = document.getElementById("ww-ed-zoom-out");
    var wwEdZoomResetBtn = document.getElementById("ww-ed-zoom-reset");
    var wwEdZoomInBtn = document.getElementById("ww-ed-zoom-in");
    var wwEdSnapBtn = document.getElementById("ww-ed-snap-btn");
    var wwEdUndoBtn = document.getElementById("ww-ed-undo-btn");
    var wwEdClearBtn = document.getElementById("ww-ed-clear-btn");
    var wwEdTestBtn = document.getElementById("ww-ed-test-btn");
    var wwEdPublishBtn = document.getElementById("ww-ed-publish-btn");
    var wwEditorProps = document.getElementById("ww-editor-props");
    var wwPropsTitle = document.getElementById("ww-props-title");
    var wwPropsControls = document.getElementById("ww-props-controls");
    var wwPropsDelBtn = document.getElementById("ww-props-del-btn");
    var wwReturnEditBtn = document.getElementById("ww-return-edit-btn");
    var wwCheckpointBtn = document.getElementById("ww-checkpoint-btn");
    var wwEditorHint = document.getElementById("ww-editor-hint");
    var wwCenterHud = document.getElementById("ww-center-hud");
    var wwTouchPad = document.getElementById("ww-touch-pad");

    var wwHudTimer = document.getElementById("ww-hud-timer");
    var wwHudDistance = document.getElementById("ww-hud-distance");
    var wwHudProgress = document.getElementById("ww-hud-progress");
    var wwHudStars = document.getElementById("ww-hud-stars");
    var wwHudCombo = document.getElementById("ww-hud-combo");
    var wwHudSpeed = document.getElementById("ww-hud-speed");
    var wwHudScore = document.getElementById("ww-hud-score");
    var wwBankPill = document.getElementById("ww-bank-pill");
    var wwStreakPill = document.getElementById("ww-streak-pill");
    var wwBabyPill = document.getElementById("ww-baby-pill");
    var wwPopBanner = document.getElementById("ww-pop-banner");

    var wwRestartBtn = document.getElementById("ww-restart-btn");
    var wwBtnLeft = document.getElementById("ww-btn-left");
    var wwBtnRight = document.getElementById("ww-btn-right");
    var wwBtnGas = document.getElementById("ww-btn-gas");
    var wwBtnBrake = document.getElementById("ww-btn-brake");
    var wwBtnEject = document.getElementById("ww-btn-eject");

    var wwStartOverlay = document.getElementById("ww-start-overlay");
    var wwStartBadge = document.getElementById("ww-start-badge");
    var wwStartTitle = document.getElementById("ww-start-title");
    var wwStartDesc = document.getElementById("ww-start-desc");
    var wwStartBtn = document.getElementById("ww-start-btn");
    var wwOpenLevelsBtn = document.getElementById("ww-open-levels-btn");
    var wwOpenEditorBtn = document.getElementById("ww-open-editor-btn");

    var wwOverOverlay = document.getElementById("ww-over-overlay");
    var wwAgainBtn = document.getElementById("ww-again-btn");
    var wwOverEditBtn = document.getElementById("ww-over-edit-btn");
    var wwOverPublishBtn = document.getElementById("ww-over-publish-btn");
    var wwOverLevelsBtn = document.getElementById("ww-over-levels-btn");
    var wwRecordBanner = document.getElementById("ww-record-banner");
    var wwOverBadge = document.getElementById("ww-over-badge");
    var wwOverTitle = document.getElementById("ww-over-title");
    var wwOverBreakdown = document.getElementById("ww-over-breakdown");
    var wwOverScore = document.getElementById("ww-over-score");
    var wwOverCombo = document.getElementById("ww-over-combo");
    var wwOverBestLabel = document.getElementById("ww-over-best-label");
    var wwOverBest = document.getElementById("ww-over-best");
    var wwOverRankLabel = document.getElementById("ww-over-rank-label");
    var wwOverRank = document.getElementById("ww-over-rank");
    var wwSaveStatus = document.getElementById("ww-save-status");

    var wwLevelsOverlay = document.getElementById("ww-levels-overlay");
    var wwLevelsNewBtn = document.getElementById("ww-levels-new-btn");
    var wwLevelsCloseBtn = document.getElementById("ww-levels-close-btn");
    var wwLevelsListEl = document.getElementById("ww-levels-list");

    var wwPublishOverlay = document.getElementById("ww-publish-overlay");
    var wwPubHeading = document.getElementById("ww-publish-heading");
    var wwPubTitleInput = document.getElementById("ww-pub-title");
    var wwPubDescInput = document.getElementById("ww-pub-desc");
    var wwPubError = document.getElementById("ww-pub-error");
    var wwPubSubmitBtn = document.getElementById("ww-pub-submit-btn");
    var wwPubCopyBtn = document.getElementById("ww-pub-copy-btn");
    var wwPubCancelBtn = document.getElementById("ww-pub-cancel-btn");

    var WW_START_X = 110;
    var WW_FINISH_X = 4650;
    var WW_GRAVITY = 900;
    var WW_BUCKET_W = 120;

    var wwInput = {
        gas: false,
        brake: false,
        left: false,
        right: false
    };

    var wwState = {
        active: false,
        mode: "idle", // "idle" | "playing" | "gameover" | "editor"
        playContext: "official", // "official" | "custom" | "editor-test"
        customLevelMeta: null,   // GameCustomLevelSummaryView when playing a member level
        customLevelData: null,   // Parsed JSON payload when playing a member level
        communityLevels: [],
        gameId: 0,
        submitted: false,
        animFrame: null,
        lastTime: 0,
        elapsed: 0,
        score: 0,
        stuntPts: 0,
        starsCollected: 0,
        totalStars: 15,
        babyBonus: 0,
        baby: null,
        skidMarks: [],
        hitstop: 0,
        shake: 0,
        trailTimer: 0,
        skidTimer: 0,
        wasGrounded: true,
        lastFallVy: 0,
        finishX: WW_FINISH_X,
        finishY: 430,
        bullseyeHit: false,
        combo: 0,
        maxCombo: 0,
        maxDistX: WW_START_X,
        riderSeated: true,
        ejectedByPlayer: false,
        airBoostUsed: false,
        dismountTime: 0,
        restTimer: 0,
        airTime: 0,
        airRotAccum: 0,
        lastChassisAngle: 0,
        bigAirAwarded: false,
        pendingStuntPts: 0,
        pendingFlips: 0,
        wheelieTimer: 0,
        wheelieTicks: 0,
        ragdollLastAng: null,
        ragdollRotAccum: 0,
        activeCheckpoint: null,
        respawnsUsed: 0,
        maxRespawns: 3,
        squealCooldown: 0,
        fanSfxCooldown: 0,
        camX: 220,
        camY: 360,
        camZoom: 1.0,
        viewW: 800,
        viewH: 480,
        dpr: 1,
        chassis: null,
        wheels: [],
        rider: null,
        course: null,
        particles: [],
        floatTexts: [],
        scarfPts: [],
        popTimer: null,
        leaderboard: null
    };

    function wwDefaultEditorData(withStarterFun) {
        if (!withStarterFun) {
            return {
                version: 1,
                finishX: 1900,
                strips: [
                    { pts: [[-120, 420], [340, 420], [2050, 420]] }
                ],
                loops: [],
                springs: [],
                wreckingBalls: [],
                crates: [],
                stars: [],
                spikes: [],
                checkpoints: [],
                tntCrates: [],
                fans: [],
                seesaws: []
            };
        }
        return {
            version: 1,
            finishX: 2150,
            strips: [
                { pts: [[-120, 420], [280, 420], [560, 375], [840, 420], [1220, 420]] },
                { pts: [[1220, 420], [1420, 345]], boost: true },
                { pts: [[1620, 385], [1820, 420], [2350, 420]] }
            ],
            loops: [],
            springs: [{ x: 880, y: 420, w: 62 }],
            wreckingBalls: [],
            crates: [{ x: 1860, y: 420 }, { x: 1860, y: 386 }],
            tntCrates: [{ x: 1898, y: 420 }],
            checkpoints: [{ x: 1120, y: 420 }],
            fans: [],
            seesaws: [],
            stars: [
                { x: 560, y: 320 },
                { x: 1020, y: 270 },
                { x: 1520, y: 265 }
            ],
            spikes: []
        };
    }

    var wwEditor = {
        tool: "road",
        editingLevelId: null,
        editingTitle: "",
        editingDesc: "",
        data: wwDefaultEditorData(true),
        undoStack: [],
        drawingPts: null,
        panning: false,
        panStartClientX: 0,
        panStartClientY: 0,
        panStartCamX: 0,
        panStartCamY: 0,
        erasing: false,
        hoverWorld: null,
        snap: false,
        zoom: 0.88,
        selected: null,
        dragging: null,
        savedCamX: 480,
        savedCamY: 350
    };

    // --- Wacky Wheels Procedural Web Audio ---
    var wwEngineNodes = null;

    function wwEnsureEngineAudio() {
        if (muted) return null;
        var ctx = ensureAudio();
        if (!ctx) return null;
        if (wwEngineNodes) return wwEngineNodes;
        try {
            var osc1 = ctx.createOscillator();
            var osc2 = ctx.createOscillator();
            var filter = ctx.createBiquadFilter();
            var gain = ctx.createGain();

            osc1.type = "sawtooth";
            osc2.type = "triangle";
            osc1.frequency.value = 55;
            osc2.frequency.value = 110;

            filter.type = "lowpass";
            filter.frequency.value = 260;

            gain.gain.value = 0.0001;

            osc1.connect(filter);
            osc2.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);

            osc1.start();
            osc2.start();

            wwEngineNodes = { ctx: ctx, osc1: osc1, osc2: osc2, filter: filter, gain: gain };
            return wwEngineNodes;
        } catch (e) {
            return null;
        }
    }

    function wwSilenceAudio() {
        if (wwEngineNodes && wwEngineNodes.ctx) {
            try {
                var now = wwEngineNodes.ctx.currentTime;
                wwEngineNodes.gain.gain.cancelScheduledValues(now);
                wwEngineNodes.gain.gain.setTargetAtTime(0.0001, now, 0.03);
            } catch (e) {}
        }
    }

    function wwUpdateEngineSound(speedNorm, throttle) {
        if (muted || !wwState.active || wwState.mode !== "playing") {
            wwSilenceAudio();
            return;
        }
        var eng = wwEnsureEngineAudio();
        if (!eng) return;
        try {
            var now = eng.ctx.currentTime;
            var rpmFreq = 48 + Math.min(1.4, speedNorm) * 95 + (throttle ? 26 : 0);
            eng.osc1.frequency.setTargetAtTime(rpmFreq, now, 0.05);
            eng.osc2.frequency.setTargetAtTime(rpmFreq * 2.0, now, 0.05);
            eng.filter.frequency.setTargetAtTime(220 + speedNorm * 380 + (throttle ? 140 : 0), now, 0.05);
            var targetGain = wwState.riderSeated ? (throttle ? 0.036 : 0.016) : 0.006;
            eng.gain.gain.setTargetAtTime(targetGain, now, 0.05);
        } catch (e) {}
    }

    function wwPlaySqueal() {
        if (wwState.squealCooldown > 0) return;
        wwState.squealCooldown = 0.38;
        var ctx = ensureAudio();
        if (!ctx) return;
        try {
            var now = ctx.currentTime;
            var osc = ctx.createOscillator();
            var filter = ctx.createBiquadFilter();
            var gain = ctx.createGain();
            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(760, now);
            osc.frequency.linearRampToValueAtTime(520, now + 0.07);
            osc.frequency.linearRampToValueAtTime(650, now + 0.14);
            filter.type = "bandpass";
            filter.frequency.value = 900;
            filter.Q.value = 4.5;
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.15);
        } catch (e) {}
    }

    function wwPlaySpring() {
        var ctx = ensureAudio();
        if (!ctx) return;
        try {
            var now = ctx.currentTime;
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(165, now);
            osc.frequency.exponentialRampToValueAtTime(590, now + 0.28);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.32);
        } catch (e) {}
    }

    function wwPlaySpike() {
        var ctx = ensureAudio();
        if (!ctx) return;
        try {
            var now = ctx.currentTime;
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.type = "square";
            osc.frequency.setValueAtTime(360, now);
            osc.frequency.exponentialRampToValueAtTime(120, now + 0.15);
            gain.gain.setValueAtTime(0.055, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.2);
        } catch (e) {}
    }

    function wwPlayLanding(impact) {
        var ctx = ensureAudio();
        if (!ctx) return;
        try {
            var now = ctx.currentTime;
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(120 + impact * 45, now);
            osc.frequency.exponentialRampToValueAtTime(52, now + 0.13);
            gain.gain.setValueAtTime(0.05 + impact * 0.045, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.18);
        } catch (e) {}
    }

    function wwPlayBabySqueak() {
        var ctx = ensureAudio();
        if (!ctx) return;
        try {
            var now = ctx.currentTime;
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.type = "triangle";
            osc.frequency.setValueAtTime(720, now);
            osc.frequency.exponentialRampToValueAtTime(1180, now + 0.09);
            osc.frequency.exponentialRampToValueAtTime(620, now + 0.22);
            gain.gain.setValueAtTime(0.045, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.24);
        } catch (e) {}
    }

    function wwPlayBabyGiggle() {
        var ctx = ensureAudio();
        if (!ctx) return;
        try {
            var now = ctx.currentTime;
            for (var i = 0; i < 3; i++) {
                var osc = ctx.createOscillator();
                var gain = ctx.createGain();
                osc.type = "sine";
                var t = now + i * 0.095;
                osc.frequency.setValueAtTime(520 + i * 90, t);
                osc.frequency.exponentialRampToValueAtTime(700 + i * 90, t + 0.07);
                gain.gain.setValueAtTime(0.0001, t);
                gain.gain.exponentialRampToValueAtTime(0.035, t + 0.012);
                gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(t);
                osc.stop(t + 0.1);
            }
        } catch (e) {}
    }

    function wwPlayStar(count) {
        var ctx = ensureAudio();
        if (!ctx) return;
        try {
            var now = ctx.currentTime;
            var base = 659.25 + Math.min(12, count) * 24;
            var notes = [base, base * 1.25, base * 1.5];
            for (var i = 0; i < notes.length; i++) {
                var osc = ctx.createOscillator();
                var gain = ctx.createGain();
                osc.type = "triangle";
                var t = now + i * 0.045;
                osc.frequency.setValueAtTime(notes[i], t);
                gain.gain.setValueAtTime(0.085, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(t);
                osc.stop(t + 0.2);
            }
        } catch (e) {}
    }

    function wwPlayPop() {
        var ctx = ensureAudio();
        if (!ctx) return;
        try {
            var now = ctx.currentTime;
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.type = "triangle";
            osc.frequency.setValueAtTime(340, now);
            osc.frequency.exponentialRampToValueAtTime(680, now + 0.05);
            osc.frequency.exponentialRampToValueAtTime(140, now + 0.16);
            gain.gain.setValueAtTime(0.11, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.17);
        } catch (e) {}
    }

    function wwPlayEject() {
        var ctx = ensureAudio();
        if (!ctx) return;
        try {
            var now = ctx.currentTime;
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.26);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.3);
        } catch (e) {}
    }

    function wwPlayFinishHorn() {
        var ctx = ensureAudio();
        if (!ctx) return;
        try {
            var now = ctx.currentTime;
            var fanfare = [
                { f: 523.25, t: 0.0, d: 0.14 },
                { f: 659.25, t: 0.12, d: 0.14 },
                { f: 783.99, t: 0.24, d: 0.16 },
                { f: 1046.5, t: 0.38, d: 0.48 }
            ];
            for (var i = 0; i < fanfare.length; i++) {
                var n = fanfare[i];
                var osc = ctx.createOscillator();
                var osc2 = ctx.createOscillator();
                var gain = ctx.createGain();
                osc.type = "sawtooth";
                osc2.type = "triangle";
                osc.frequency.setValueAtTime(n.f, now + n.t);
                osc2.frequency.setValueAtTime(n.f * 0.5, now + n.t);
                gain.gain.setValueAtTime(0.075, now + n.t);
                gain.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.d);
                osc.connect(gain);
                osc2.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + n.t);
                osc2.start(now + n.t);
                osc.stop(now + n.t + n.d);
                osc2.stop(now + n.t + n.d);
            }
        } catch (e) {}
    }

    function wwPlayExplosion() {
        var ctx = ensureAudio();
        if (!ctx) return;
        try {
            var now = ctx.currentTime;
            var dur = 0.34;
            var bufLen = Math.floor(ctx.sampleRate * dur);
            var buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
            var data = buf.getChannelData(0);
            for (var i = 0; i < bufLen; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufLen, 1.6);
            }
            var src = ctx.createBufferSource();
            src.buffer = buf;
            var lp = ctx.createBiquadFilter();
            lp.type = "lowpass";
            lp.frequency.setValueAtTime(640, now);
            lp.frequency.exponentialRampToValueAtTime(110, now + dur);
            var nGain = ctx.createGain();
            nGain.gain.setValueAtTime(0.18, now);
            nGain.gain.exponentialRampToValueAtTime(0.001, now + dur);
            src.connect(lp);
            lp.connect(nGain);
            nGain.connect(ctx.destination);
            src.start(now);

            var sub = ctx.createOscillator();
            var sGain = ctx.createGain();
            sub.type = "sine";
            sub.frequency.setValueAtTime(145, now);
            sub.frequency.exponentialRampToValueAtTime(36, now + 0.28);
            sGain.gain.setValueAtTime(0.18, now);
            sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
            sub.connect(sGain);
            sGain.connect(ctx.destination);
            sub.start(now);
            sub.stop(now + 0.3);
        } catch (e) {}
    }

    function wwPlayFanWhoosh() {
        var ctx = ensureAudio();
        if (!ctx) return;
        try {
            var now = ctx.currentTime;
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.type = "triangle";
            osc.frequency.setValueAtTime(160, now);
            osc.frequency.exponentialRampToValueAtTime(340, now + 0.14);
            gain.gain.setValueAtTime(0.055, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.17);
        } catch (e) {}
    }

    // --- Course & Obstacle Construction ---
    function wwAddSegment(list, buckets, x1, y1, x2, y2, layer, boost, loopIdx) {
        var dx = x2 - x1;
        var dy = y2 - y1;
        var len = Math.hypot(dx, dy);
        if (len < 0.5) return;
        var tx = dx / len;
        var ty = dy / len;
        // Outward track surface normal (for left-to-right ground dx>0, dy=0 -> nx=0, ny=-1 pointing UP)
        var nx = ty;
        var ny = -tx;
        var seg = {
            x1: x1, y1: y1, x2: x2, y2: y2,
            dx: dx, dy: dy, len: len,
            tx: tx, ty: ty, nx: nx, ny: ny,
            layer: layer || "main",
            boost: !!boost,
            surface: boost ? "boost" : ((layer === "bridge" || (layer && layer.indexOf("loop") === 0)) ? "metal" : "dirt"),
            loopIdx: loopIdx !== undefined ? loopIdx : -1
        };
        list.push(seg);

        var minBx = Math.floor((Math.min(x1, x2) - 40) / WW_BUCKET_W);
        var maxBx = Math.floor((Math.max(x1, x2) + 40) / WW_BUCKET_W);
        for (var b = minBx; b <= maxBx; b++) {
            if (!buckets[b]) buckets[b] = [];
            buckets[b].push(seg);
        }
    }

    function wwAddPolyline(list, buckets, pts, layer, boostFromX, boostToX, loopIdx) {
        for (var i = 0; i < pts.length - 1; i++) {
            var p1 = pts[i];
            var p2 = pts[i + 1];
            var midX = (p1[0] + p2[0]) * 0.5;
            var isBoost = boostFromX !== undefined && midX >= boostFromX && midX <= boostToX;
            wwAddSegment(list, buckets, p1[0], p1[1], p2[0], p2[1], layer, isBoost, loopIdx);
        }
    }

    function wwFindGroundYAtX(segments, targetX, fallbackY) {
        var bestY = fallbackY;
        var bestDist = Infinity;
        for (var i = 0; i < segments.length; i++) {
            var s = segments[i];
            if ((s.layer !== "main" && s.layer !== "bridge") || Math.abs(s.dx) < 0.001) continue;
            var lo = Math.min(s.x1, s.x2);
            var hi = Math.max(s.x1, s.x2);
            if (targetX < lo || targetX > hi) continue;
            var t = (targetX - s.x1) / s.dx;
            var gy = s.y1 + s.dy * t;
            var dist = Math.abs(gy - fallbackY);
            if (dist < bestDist) {
                bestDist = dist;
                bestY = gy;
            }
        }
        return Math.round(bestY);
    }

    function wwAddLoopToCourse(segments, buckets, groundStrips, loopsList, loopCx, loopCy, loopR) {
        var idx = loopsList.length;
        loopsList.push({ cx: loopCx, cy: loopCy, r: loopR, phase: 0, bonusGiven: false });
        var baseY = loopCy + loopR;

        var loopEntry = [[loopCx - 200, baseY], [loopCx - 100, baseY], [loopCx, baseY]];
        wwAddPolyline(segments, buckets, loopEntry, "entry-floor", loopCx - 200, loopCx, idx);

        var loopSteps = 40;
        for (var s = 0; s < loopSteps; s++) {
            var a1 = Math.PI * 0.5 - (s / loopSteps) * Math.PI * 2.0;
            var a2 = Math.PI * 0.5 - ((s + 1) / loopSteps) * Math.PI * 2.0;
            var lx1 = loopCx + Math.cos(a1) * loopR;
            var ly1 = loopCy + Math.sin(a1) * loopR;
            var lx2 = loopCx + Math.cos(a2) * loopR;
            var ly2 = loopCy + Math.sin(a2) * loopR;
            var frac = (s + 0.5) / loopSteps;
            var segLayer = frac < 0.54 ? "loop-up" : "loop-down";
            var segBoost = frac < 0.45;
            wwAddSegment(segments, buckets, lx1, ly1, lx2, ly2, segLayer, segBoost, idx);
        }

        var loopExit = [[loopCx, baseY], [loopCx + 130, baseY], [loopCx + 260, baseY]];
        wwAddPolyline(segments, buckets, loopExit, "exit-floor", loopCx, loopCx + 100, idx);
        groundStrips.push({ pts: [[loopCx - 200, baseY], [loopCx + 260, baseY]], boost: false });
    }

    function wwSampleSmoothSection(xStart, xEnd, steps, heightFn) {
        var pts = [];
        for (var i = 0; i <= steps; i++) {
            var t = i / steps;
            var x = xStart + (xEnd - xStart) * t;
            pts.push([x, heightFn(x, t)]);
        }
        return pts;
    }

    function wwBuildCourse() {
        var segments = [];
        var buckets = {};
        var groundStrips = [];
        var loops = [];

        // Backstop wall at x = -140
        wwAddSegment(segments, buckets, -140, 160, -140, 425, "main", false);

        // Strip 1: Start Pad -> Rolling Hills -> Valley -> Launch Ramp (x = -140 .. 2160)
        var strip1 = [];
        strip1.push([-140, 420], [0, 420], [230, 420]);

        var hills1 = wwSampleSmoothSection(230, 1060, 28, function (x, t) {
            var env = Math.sin(t * Math.PI);
            return 420 - env * (54 * Math.sin(t * Math.PI * 2.5) + 28);
        });
        for (var i = 1; i < hills1.length; i++) strip1.push(hills1[i]);

        var valley1 = wwSampleSmoothSection(1060, 1920, 22, function (x, t) {
            return 420 + 18 * Math.sin(t * Math.PI * 2);
        });
        for (var j = 1; j < valley1.length; j++) strip1.push(valley1[j]);

        var rampPts = wwSampleSmoothSection(1920, 2155, 12, function (x, t) {
            return 420 - 102 * (t * t);
        });
        for (var r = 1; r < rampPts.length; r++) strip1.push(rampPts[r]);

        wwAddPolyline(segments, buckets, strip1, "main", 1960, 2155);
        groundStrips.push({ pts: strip1, isRampEnd: true });

        // Strip 2: Canyon Safety Floor + Climb-out -> Loop Approach
        var strip2 = [
            [2155, 515],
            [2410, 515],
            [2520, 348]
        ];
        var landSlope = wwSampleSmoothSection(2520, 2960, 16, function (x, t) {
            return 348 + (430 - 348) * (0.5 - 0.5 * Math.cos(t * Math.PI));
        });
        for (var ls = 1; ls < landSlope.length; ls++) strip2.push(landSlope[ls]);
        wwAddPolyline(segments, buckets, strip2, "main", -1, -1);
        groundStrips.push({ pts: strip2, isRampEnd: false });

        // 360° Loop-the-Loop centered at (3160, 275), radius = 155
        wwAddLoopToCourse(segments, buckets, groundStrips, loops, 3160, 275, 155);

        // Strip 4: Final Gauntlet Hills (with See-Saw valley dip) -> Crate/TNT Pyramid -> Finish Runway
        var strip4 = [[3420, 430]];
        var dipSection = wwSampleSmoothSection(3420, 3820, 14, function (x, t) {
            if (x < 3540) return 430;
            var dt = (x - 3540) / 280;
            return 430 + 38 * Math.sin(dt * Math.PI);
        });
        for (var dp = 1; dp < dipSection.length; dp++) strip4.push(dipSection[dp]);

        var finalHills = wwSampleSmoothSection(3820, 4480, 22, function (x, t) {
            if (x > 4180) {
                var blend = (x - 4180) / 300;
                return 430 - (1 - blend) * 26 * Math.sin(t * Math.PI * 3.0);
            }
            return 430 - 34 * Math.sin(t * Math.PI * 2.0);
        });
        for (var fh = 1; fh < finalHills.length; fh++) strip4.push(finalHills[fh]);
        strip4.push([4650, 430], [5350, 430]);
        wwAddPolyline(segments, buckets, strip4, "main", -1, -1);
        groundStrips.push({ pts: strip4, isRampEnd: false });

        var springs = [
            { x: 1210, y: 432, w: 62, anim: 0, cooldown: 0 },
            { x: 2350, y: 515, w: 68, anim: 0, cooldown: 0 },
            { x: 3860, y: 423, w: 62, anim: 0, cooldown: 0 }
        ];

        var wreckingBalls = [
            { pivotX: 1520, pivotY: 130, length: 215, radius: 27, amp: 0.68, speed: 2.1, phase: 0.3 },
            { pivotX: 4030, pivotY: 125, length: 218, radius: 29, amp: 0.72, speed: 2.4, phase: 1.9 }
        ];

        var crates = [
            { x: 915, y: 392, w: 34, h: 34, intact: true },
            { x: 951, y: 394, w: 34, h: 34, intact: true },
            { x: 933, y: 358, w: 34, h: 34, intact: true },
            { x: 4310, y: 413, w: 34, h: 34, intact: true },
            { x: 4382, y: 413, w: 34, h: 34, intact: true },
            { x: 4328, y: 379, w: 34, h: 34, intact: true },
            { x: 4364, y: 379, w: 34, h: 34, intact: true }
        ];

        var tntCrates = [
            { x: 4346, y: 413, w: 34, h: 34, intact: true }
        ];

        var checkpoints = [
            { x: 2910, y: 428, reached: false }
        ];

        var fans = [
            { x: 2295, y: 515, w: 96, h: 295, power: 1750 }
        ];

        var seesaws = [
            { x: 3680, y: 416, len: 210, maxAngle: 0.42, angle: 0, omega: 0 }
        ];

        var spikes = [
            { x: 1880, y: 415, w: 64, anim: 0, cooldown: 0 },
            { x: 2205, y: 515, w: 64, anim: 0, cooldown: 0 },
            { x: 4900, y: 430, w: 64, anim: 0, cooldown: 0 }
        ];

        var starCoords = [
            [420, 325], [500, 310], [580, 325],
            [1310, 275], [1420, 245],
            [2220, 235], [2335, 205], [2450, 240],
            [3285, 265], [3160, 155], [3035, 265],
            [3840, 265], [3950, 245],
            [4480, 375], [4570, 375]
        ];
        var stars = [];
        for (var sc = 0; sc < starCoords.length; sc++) {
            stars.push({
                x: starCoords[sc][0],
                y: starCoords[sc][1],
                collected: false,
                bobPhase: sc * 0.65
            });
        }

        return {
            isOfficial: true,
            finishX: WW_FINISH_X,
            finishY: wwFindGroundYAtX(segments, WW_FINISH_X, 430),
            segments: segments,
            buckets: buckets,
            groundStrips: groundStrips,
            loops: loops,
            springs: springs,
            wreckingBalls: wreckingBalls,
            crates: crates,
            tntCrates: tntCrates,
            checkpoints: checkpoints,
            fans: fans,
            seesaws: seesaws,
            stars: stars,
            spikes: spikes
        };
    }

    function wwBuildCustomCourse(raw) {
        var d = raw || wwDefaultEditorData(true);
        var finishX = Math.max(700, Math.min(12000, Number(d.finishX) || 2100));
        var segments = [];
        var buckets = {};
        var groundStrips = [];
        var loops = [];

        wwAddSegment(segments, buckets, -140, 160, -140, 425, "main", false);

        var stripsIn = Array.isArray(d.strips) ? d.strips : [];
        var hasSpawn = false;
        for (var si = 0; si < stripsIn.length; si++) {
            var sp = stripsIn[si];
            if (!sp || !Array.isArray(sp.pts) || sp.pts.length < 2) continue;
            var pts = sp.pts.map(function (p) { return [Number(p[0]) || 0, Number(p[1]) || 420]; });
            for (var pk = 0; pk < pts.length; pk++) {
                if (pts[pk][0] <= 75 && pts[pk][1] >= 350 && pts[pk][1] <= 470) hasSpawn = true;
            }
            var boostMin = sp.boost ? -99999 : undefined;
            var boostMax = sp.boost ? 99999 : undefined;
            var stripLayer = sp.bridge ? "bridge" : "main";
            wwAddPolyline(segments, buckets, pts, stripLayer, boostMin, boostMax);
            groundStrips.push({ pts: pts, boost: !!sp.boost, bridge: !!sp.bridge });
        }

        if (!hasSpawn) {
            var spawnPts = [[-120, 420], [280, 420]];
            wwAddPolyline(segments, buckets, spawnPts, "main");
            groundStrips.unshift({ pts: spawnPts, boost: false, bridge: false });
        }

        // Ensure victory runway past finish gate if no strip reaches finishX
        var hasFinishRunway = false;
        for (var fi = 0; fi < groundStrips.length; fi++) {
            var gPts = groundStrips[fi].pts;
            for (var fp = 0; fp < gPts.length; fp++) {
                if (gPts[fp][0] >= finishX - 60) {
                    hasFinishRunway = true;
                    break;
                }
            }
        }
        if (!hasFinishRunway) {
            var endRunway = [[finishX - 120, 420], [finishX + 380, 420]];
            wwAddPolyline(segments, buckets, endRunway, "main");
            groundStrips.push({ pts: endRunway, boost: false, bridge: false });
        }

        var loopsIn = Array.isArray(d.loops) ? d.loops : [];
        for (var li = 0; li < loopsIn.length; li++) {
            var lp = loopsIn[li];
            if (!lp) continue;
            wwAddLoopToCourse(segments, buckets, groundStrips, loops, Number(lp.x) || 1200, Number(lp.y) || 275, Number(lp.r) || 150);
        }

        var springs = (Array.isArray(d.springs) ? d.springs : []).map(function (s) {
            return { x: Number(s.x) || 600, y: Number(s.y) || 420, w: Math.max(40, Math.min(110, Number(s.w) || 62)), anim: 0, cooldown: 0 };
        });

        var wreckingBalls = (Array.isArray(d.wreckingBalls) ? d.wreckingBalls : []).map(function (w, idx) {
            return {
                pivotX: Number(w.pivotX) || 900,
                pivotY: Number(w.pivotY) || 130,
                length: Math.max(90, Math.min(340, Number(w.length) || 205)),
                radius: Math.max(18, Math.min(46, Number(w.radius) || 28)),
                amp: Math.max(0.2, Math.min(1.25, Number(w.amp) || 0.7)),
                speed: Math.max(0.8, Math.min(4.2, Number(w.speed) || 2.15)),
                phase: w.phase !== undefined ? Number(w.phase) : idx * 1.3
            };
        });

        var crates = (Array.isArray(d.crates) ? d.crates : []).map(function (c) {
            return { x: Number(c.x) || 600, y: Number(c.y) || 420, w: 34, h: 34, intact: true };
        });

        var tntCrates = (Array.isArray(d.tntCrates) ? d.tntCrates : []).map(function (t) {
            return { x: Number(t.x) || 600, y: Number(t.y) || 420, w: 34, h: 34, intact: true };
        });

        var checkpoints = (Array.isArray(d.checkpoints) ? d.checkpoints : []).map(function (cp) {
            return { x: Number(cp.x) || 900, y: Number(cp.y) || 420, reached: false };
        });

        var fans = (Array.isArray(d.fans) ? d.fans : []).map(function (fn) {
            return {
                x: Number(fn.x) || 800,
                y: Number(fn.y) || 420,
                w: Math.max(50, Math.min(160, Number(fn.w) || 92)),
                h: Math.max(100, Math.min(420, Number(fn.h) || 240)),
                power: Math.max(700, Math.min(2400, Number(fn.power) || 1450))
            };
        });

        var seesaws = (Array.isArray(d.seesaws) ? d.seesaws : []).map(function (ss) {
            return {
                x: Number(ss.x) || 800,
                y: Number(ss.y) || 400,
                len: Math.max(120, Math.min(360, Number(ss.len) || 200)),
                maxAngle: Math.max(0.2, Math.min(0.65, Number(ss.maxAngle) || 0.45)),
                angle: 0,
                omega: 0
            };
        });

        var stars = (Array.isArray(d.stars) ? d.stars : []).map(function (st, idx) {
            return { x: Number(st.x) || 500, y: Number(st.y) || 340, collected: false, bobPhase: idx * 0.65 };
        });

        var spikes = (Array.isArray(d.spikes) ? d.spikes : []).map(function (sp) {
            return {
                x: Number(sp.x) || 600,
                y: Number(sp.y) || 420,
                w: Math.max(40, Math.min(120, Number(sp.w) || 64)),
                anim: 0,
                cooldown: 0
            };
        });

        return {
            isOfficial: false,
            finishX: finishX,
            finishY: wwFindGroundYAtX(segments, finishX, 420),
            segments: segments,
            buckets: buckets,
            groundStrips: groundStrips,
            loops: loops,
            springs: springs,
            wreckingBalls: wreckingBalls,
            crates: crates,
            tntCrates: tntCrates,
            checkpoints: checkpoints,
            fans: fans,
            seesaws: seesaws,
            stars: stars,
            spikes: spikes
        };
    }

    // --- Vehicle & 5-Segment Articulated Toy Ragdoll Creation ---
    function wwCreateEntities(spawnX, spawnY) {
        var sx0 = spawnX !== undefined ? spawnX : WW_START_X;
        var sy0 = spawnY !== undefined ? spawnY : 372;
        var ch = {
            x: sx0,
            y: sy0,
            vx: 0,
            vy: 0,
            angle: 0,
            omega: 0,
            mass: 5.5,
            invMass: 1 / 5.5,
            inertia: 3800,
            invInertia: 1 / 3800
        };

        var wheels = [
            { mountX: -40, mountY: 8, x: sx0 - 40, y: sy0 + 24, vx: 0, vy: 0, r: 21, mass: 1.35, spin: 0, grounded: false, surface: "dirt", contactTx: 1, contactTy: 0 },
            { mountX: 40, mountY: 8, x: sx0 + 40, y: sy0 + 24, vx: 0, vy: 0, r: 21, mass: 1.35, spin: 0, grounded: false, surface: "dirt", contactTx: 1, contactTy: 0 }
        ];

        function mkPt(x, y, r) {
            return { x: x, y: y, px: x, py: y, vx: 0, vy: 0, r: r || 6 };
        }

        var sx = ch.x - 10;
        var sy = ch.y - 14;
        // 11 Verlet points forming 5 distinct articulated toy segments
        var pts = [
            mkPt(sx, sy, 8),               // 0: torsoHip
            mkPt(sx - 2, sy - 25, 8),      // 1: torsoNeck
            mkPt(sx - 2, sy - 25, 6),      // 2: headBase
            mkPt(sx - 2, sy - 38, 11),     // 3: headTop (Helmet)
            mkPt(sx - 2, sy - 24, 5),      // 4: armRBase
            mkPt(ch.x + 18, ch.y - 20, 5), // 5: armRHand
            mkPt(sx - 2, sy - 24, 5),      // 6: armLBase
            mkPt(ch.x + 16, ch.y - 18, 5), // 7: armLHand
            mkPt(sx, sy, 6),               // 8: legBase
            mkPt(ch.x + 4, ch.y - 6, 6),   // 9: legKnee
            mkPt(ch.x + 12, ch.y + 6, 5)   // 10: legFoot
        ];

        var sticks = [
            { a: 0, b: 1, len: 25 }, // Torso
            { a: 2, b: 3, len: 13 }, // Head
            { a: 4, b: 5, len: 23 }, // Front Arm
            { a: 6, b: 7, len: 23 }, // Back Arm
            { a: 8, b: 9, len: 15 }, // Thigh
            { a: 9, b: 10, len: 15 } // Shin
        ];

        // Breakable Lego-style snap joints between body segments
        var pins = [
            { a: 2, b: 1, broken: false, name: "HELMET POP!" },
            { a: 4, b: 1, broken: false, name: "ARM SNAP!" },
            { a: 6, b: 1, broken: false, name: "TOY POP!" },
            { a: 8, b: 0, broken: false, name: "LEG BOING!" }
        ];

        var scarf = [];
        for (var i = 0; i < 5; i++) {
            scarf.push({ x: sx - 6 - i * 7, y: sy - 24 });
        }

        wwState.chassis = ch;
        wwState.wheels = wheels;
        wwState.rider = { pts: pts, sticks: sticks, pins: pins, gripBroken: false };
        wwState.scarfPts = scarf;
        wwState.baby = { attached: true, x: ch.x + 34, y: ch.y - 22, vx: 0, vy: 0, angle: 0, spin: 0 };
        wwState.babyBonus = 0;
        wwState.skidMarks = [];
        wwState.hitstop = 0;
        wwState.shake = 0;
        wwState.trailTimer = 0;
        wwState.skidTimer = 0;
        wwState.wasGrounded = true;
        wwState.lastFallVy = 0;
    }

    function wwDetachBaby(isCrash) {
        var b = wwState.baby;
        var ch = wwState.chassis;
        if (!b || !b.attached || !ch) return;
        var cosA = Math.cos(ch.angle);
        var sinA = Math.sin(ch.angle);
        b.attached = false;
        b.x = ch.x + 34 * cosA - 22 * sinA;
        b.y = ch.y + 34 * sinA + 22 * cosA;
        b.vx = ch.vx * 0.85 + 70 + (Math.random() - 0.5) * 90;
        b.vy = ch.vy - 190 - Math.random() * 80;
        b.spin = (Math.random() - 0.5) * 9;
        wwPlayBabySqueak();
        wwSpawnBurst(b.x, b.y, 8, "toy");
        wwAddFloatText(b.x, b.y - 22, isCrash ? "BABY BOUNCED!" : "BABY BAILED! NO +500", "#f472b6");
    }

    function wwDrawBabySeat(ctx) {
        ctx.save();
        // Pink baby seat shell
        ctx.fillStyle = "#f472b6";
        ctx.strokeStyle = "#be185d";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-9, 5);
        ctx.quadraticCurveTo(-12, -7, -2, -11);
        ctx.quadraticCurveTo(8, -13, 11, 5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Cushion
        ctx.fillStyle = "#fbcfe8";
        ctx.beginPath();
        ctx.ellipse(1, 1, 7, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Toy baby head
        ctx.fillStyle = "#fde047";
        ctx.beginPath();
        ctx.arc(0, -7, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#eab308";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Hair curl
        ctx.strokeStyle = "#92400e";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(1, -14, 2, Math.PI * 0.2, Math.PI * 1.2);
        ctx.stroke();

        // Eyes
        ctx.fillStyle = "#0f172a";
        ctx.beginPath();
        ctx.arc(-2.4, -8, 1.1, 0, Math.PI * 2);
        ctx.arc(2.4, -8, 1.1, 0, Math.PI * 2);
        ctx.fill();

        // Blue pacifier
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(0, -3.4, 2.4, 0, Math.PI * 2);
        ctx.stroke();

        // Harness straps
        ctx.strokeStyle = "#7c3aed";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-6, -4);
        ctx.lineTo(-4, 3);
        ctx.moveTo(6, -4);
        ctx.lineTo(4, 3);
        ctx.stroke();
        ctx.restore();
    }

    function wwDrawSpikes(ctx, x, y, w, anim) {
        var wobble = anim > 0 ? Math.sin(anim * Math.PI * 8) * 3 * anim : 0;
        var baseW = Math.max(40, w || 64);
        var count = 5;
        var step = baseW / count;
        ctx.save();
        ctx.translate(x, y);

        // Hazard base plate
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(-baseW * 0.5, -5, baseW, 7);
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 1.4;
        ctx.strokeRect(-baseW * 0.5, -5, baseW, 7);

        for (var i = 0; i < count; i++) {
            var cx = -baseW * 0.5 + step * (i + 0.5);
            var h = 15 + (i % 2) * 5 + wobble;
            ctx.fillStyle = "#e2e8f0";
            ctx.beginPath();
            ctx.moveTo(cx - step * 0.42, -5);
            ctx.lineTo(cx, -5 - h);
            ctx.lineTo(cx + step * 0.42, -5);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = "#94a3b8";
            ctx.lineWidth = 1.1;
            ctx.stroke();

            // Red warning tip
            ctx.fillStyle = "#ef4444";
            ctx.beginPath();
            ctx.moveTo(cx - step * 0.13, -5 - h * 0.58);
            ctx.lineTo(cx, -5 - h);
            ctx.lineTo(cx + step * 0.13, -5 - h * 0.58);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
    }

    function wwAddSkidMark(w) {
        if (!w) return;
        var tx = w.contactTx !== undefined ? w.contactTx : 1;
        var ty = w.contactTy !== undefined ? w.contactTy : 0;
        wwState.skidMarks.push({
            x: w.x,
            y: w.y + w.r * 0.8,
            tx: tx,
            ty: ty,
            life: 3.0,
            maxLife: 3.0,
            width: 4.5
        });
        if (wwState.skidMarks.length > 140) wwState.skidMarks.shift();
    }

    function wwSpawnWheelTrail(w) {
        if (!w) return;
        var surface = w.surface || "dirt";
        var isDirt = surface === "dirt";
        var color = surface === "boost"
            ? "rgba(34, 211, 238, 0.85)"
            : (surface === "metal" ? "rgba(250, 204, 21, 0.8)" : "rgba(148, 163, 184, 0.55)");
        wwState.particles.push({
            x: w.x - w.vx * 0.015,
            y: w.y + w.r * 0.72,
            vx: -w.vx * 0.06 + (Math.random() - 0.5) * 50,
            vy: -20 - Math.random() * (isDirt ? 60 : 30),
            rot: Math.atan2(w.vy, w.vx),
            vrot: (Math.random() - 0.5) * 6,
            size: isDirt ? 3.5 + Math.random() * 4 : 2 + Math.random() * 2,
            color: color,
            shape: isDirt ? "puff" : "spark",
            gravity: isDirt ? 280 : 110,
            life: 0.28 + Math.random() * 0.24,
            maxLife: 0.52
        });
    }

    function wwSpawnBurst(x, y, count, kind) {
        var colors = ["#facc15", "#38bdf8", "#4ade80", "#f472b6", "#fb923c", "#a855f7", "#ffffff"];
        for (var i = 0; i < count; i++) {
            var ang = Math.random() * Math.PI * 2;
            var spd = (kind === "wood" ? 110 : 150) + Math.random() * 260;
            wwState.particles.push({
                x: x + (Math.random() - 0.5) * 14,
                y: y + (Math.random() - 0.5) * 14,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd - 90,
                rot: Math.random() * Math.PI * 2,
                vrot: (Math.random() - 0.5) * 12,
                size: kind === "wood" ? 7 + Math.random() * 6 : 5 + Math.random() * 5,
                color: kind === "wood"
                    ? (i % 2 === 0 ? "#d97706" : "#fbbf24")
                    : colors[i % colors.length],
                shape: kind === "wood" ? "plank" : (i % 3 === 0 ? "star" : "confetti"),
                life: 0.75 + Math.random() * 0.55,
                maxLife: 1.3
            });
        }
    }

    function wwTriggerLanding(airTime, fallVy) {
        var ch = wwState.chassis;
        var wheels = wwState.wheels;
        if (!ch || !wheels) return;
        var impact = Math.max(0, Math.min(1, (fallVy - 190) / 520));

        for (var i = 0; i < 2; i++) {
            var w = wheels[i];
            if (!w || !w.grounded) continue;
            var puffs = 4 + Math.round(impact * 6);
            for (var p = 0; p < puffs; p++) {
                wwState.particles.push({
                    x: w.x + (Math.random() - 0.5) * w.r * 2,
                    y: w.y + w.r * 0.85,
                    vx: (Math.random() - 0.5) * (90 + impact * 170),
                    vy: -18 - Math.random() * (40 + impact * 80),
                    rot: 0,
                    vrot: (Math.random() - 0.5) * 5,
                    size: 3.5 + Math.random() * 4 + impact * 2,
                    color: "rgba(203, 213, 225, 0.72)",
                    shape: "puff",
                    gravity: 240,
                    life: 0.32 + Math.random() * 0.3,
                    maxLife: 0.62
                });
            }
            if (impact > 0.25) wwAddSkidMark(w);
        }

        if (impact > 0.16) {
            wwState.shake = Math.max(wwState.shake, 4 + impact * 9);
            wwState.hitstop = Math.max(wwState.hitstop, 0.02 + impact * 0.045);
            wwPlayLanding(impact);
        }
        if (wwState.baby && wwState.baby.attached && airTime >= 0.75) {
            wwPlayBabyGiggle();
        }
        if (airTime >= 0.9) {
            wwAddFloatText(ch.x, ch.y - 56, "STOMP LANDING!", "#fbbf24");
        }
    }

    function wwBankPendingStunts() {
        if (wwState.pendingStuntPts <= 0) return;
        var ch = wwState.chassis;
        var uprightBonus = wwState.pendingFlips > 0 && ch && Math.cos(ch.angle) > 0.72
            ? wwState.pendingFlips * 50
            : 0;
        var totalBanked = wwState.pendingStuntPts + uprightBonus;
        wwState.stuntPts += totalBanked;
        wwState.pendingStuntPts = 0;
        wwState.pendingFlips = 0;
        playPerfectSound(Math.max(1, wwState.combo));
        if (ch) {
            wwSpawnBurst(ch.x, ch.y - 18, 14, "toy");
            var txt = "BANKED +" + totalBanked + (uprightBonus > 0 ? " (CLEAN +" + uprightBonus + ")" : "!");
            wwAddFloatText(ch.x, ch.y - 68, txt, "#4ade80");
        }
    }

    function wwUpdateBabyDoll(dt) {
        var b = wwState.baby;
        if (!b || b.attached) return;

        b.vy += 900 * dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.angle += b.spin * dt;
        b.spin *= Math.max(0, 1 - 1.8 * dt);

        var course = wwState.course;
        if (course) {
            for (var i = 0; i < course.segments.length; i++) {
                var s = course.segments[i];
                if ((s.layer !== "main" && s.layer !== "bridge") || Math.abs(s.dx) < 0.0001) continue;
                var lo = Math.min(s.x1, s.x2);
                var hi = Math.max(s.x1, s.x2);
                if (b.x < lo || b.x > hi) continue;
                var t = (b.x - s.x1) / s.dx;
                if (t < 0 || t > 1) continue;
                var gy = s.y1 + s.dy * t;
                if (b.y < gy - 7 || b.y > gy + 30) continue;
                b.y = gy - 7;
                if (b.vy > 70) {
                    b.vy = -b.vy * 0.42;
                    b.vx *= 0.72;
                    b.spin *= 0.6;
                } else {
                    b.vy = 0;
                    b.vx *= 0.86;
                    b.spin *= 0.72;
                }
                break;
            }
        }

        if (b.y > 1400) {
            b.y = 1400;
            b.vy = 0;
            b.vx = 0;
            b.spin = 0;
        }
    }

    function wwAddFloatText(x, y, text, color) {
        wwState.floatTexts.push({
            x: x,
            y: y,
            text: text,
            color: color || "#fde047",
            life: 1.15,
            maxLife: 1.15
        });
    }

    function wwShowBanner(text) {
        if (!wwPopBanner) return;
        wwPopBanner.textContent = text;
        wwPopBanner.hidden = false;
        if (wwState.popTimer) clearTimeout(wwState.popTimer);
        wwState.popTimer = setTimeout(function () {
            if (wwPopBanner) wwPopBanner.hidden = true;
        }, 1150);
    }

    function wwPopRandomPin(x, y, forcePopAll) {
        var pins = wwState.rider.pins;
        var popped = 0;
        for (var i = pins.length - 1; i >= 0; i--) {
            if (!pins[i].broken) {
                pins[i].broken = true;
                var pt = wwState.rider.pts[pins[i].a];
                pt.px = pt.x - (Math.random() - 0.5) * 8;
                pt.py = pt.y + 4 + Math.random() * 5;
                wwSpawnBurst(x, y, 14, "toy");
                wwPlayPop();
                popped++;
                if (!forcePopAll && popped >= 1) break;
            }
        }
    }

    function wwDismountRider(reasonText, isCrash) {
        if (!wwState.riderSeated) return;
        wwState.riderSeated = false;
        wwState.dismountTime = 0;
        wwState.restTimer = 0;
        wwState.airRotAccum = 0;
        wwState.wheelieTimer = 0;
        var lostPending = wwState.pendingStuntPts;
        wwState.pendingStuntPts = 0;
        wwState.pendingFlips = 0;

        var ch = wwState.chassis;
        var pts = wwState.rider.pts;
        wwState.ragdollLastAng = Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x);
        wwState.ragdollRotAccum = 0;
        for (var i = 0; i < pts.length; i++) {
            var p = pts[i];
            var vx = ch.vx + (isCrash ? (Math.random() - 0.3) * 140 : 380);
            var vy = ch.vy + (isCrash ? -210 - Math.random() * 110 : -440);
            p.px = p.x - vx * (1 / 120);
            p.py = p.y - vy * (1 / 120);
        }

        if (isCrash) {
            wwState.combo = 0;
            wwPopRandomPin(pts[1].x, pts[1].y, false);
            var crashMsg = lostPending > 0
                ? (reasonText || "WIPEOUT!") + " (-" + lostPending + " PENDING)"
                : (reasonText || "TOY WIPEOUT!");
            wwAddFloatText(pts[3].x, pts[3].y - 24, reasonText || "BONK!", "#fb7185");
            wwShowBanner(crashMsg);
        } else {
            wwState.ejectedByPlayer = true;
            // Turbo push to the buggy as well for slapstick chaos!
            ch.vx += Math.cos(ch.angle) * 260;
            ch.vy -= 120;
            wwSpawnBurst(pts[0].x, pts[0].y, 24, "toy");
            wwPlayEject();
            wwAddFloatText(pts[3].x, pts[3].y - 26, "EJECTED! 🚀", "#38bdf8");
            wwShowBanner("ROCKET EJECT! 🚀");
        }

        wwDetachBaby(isCrash);
    }

    function wwRespawnAtCheckpoint() {
        if (wwState.mode !== "playing" || !wwState.activeCheckpoint) return false;
        if (wwState.respawnsUsed >= wwState.maxRespawns) return false;

        var cp = wwState.activeCheckpoint;
        wwState.respawnsUsed++;
        wwCreateEntities(cp.x, cp.y - 54);
        if (wwState.baby) {
            wwState.baby.attached = false;
            wwState.baby.x = -9999;
            wwState.baby.y = 1400;
        }
        wwState.riderSeated = true;
        wwState.ejectedByPlayer = false;
        wwState.airBoostUsed = false;
        wwState.dismountTime = 0;
        wwState.restTimer = 0;
        wwState.airTime = 0;
        wwState.airRotAccum = 0;
        wwState.lastChassisAngle = 0;
        wwState.bigAirAwarded = false;
        wwState.pendingStuntPts = 0;
        wwState.pendingFlips = 0;
        wwState.wheelieTimer = 0;
        wwState.wheelieTicks = 0;
        wwState.combo = 0;
        wwState.ragdollLastAng = 0;
        wwState.ragdollRotAccum = 0;

        var ch = wwState.chassis;
        wwState.camX = ch.x + 115;
        wwState.camY = Math.max(-360, Math.min(720, ch.y - 34));
        wwInput.gas = false;
        wwInput.brake = false;
        wwInput.left = false;
        wwInput.right = false;

        var leftCount = wwState.maxRespawns - wwState.respawnsUsed;
        playPerfectSound(2);
        wwSpawnBurst(ch.x, ch.y, 18, "toy");
        wwAddFloatText(ch.x, ch.y - 54, "CHECKPOINT! (" + leftCount + " left)", "#22d3ee");
        wwShowBanner("CHECKPOINT RESPAWN!");
        wwUpdateHud(0);
        return true;
    }

    function wwTriggerEjectOrBoost() {
        if (wwState.mode !== "playing") return;
        if (wwState.riderSeated) {
            wwDismountRider("EJECTED! 🚀", false);
        } else if (!wwState.airBoostUsed) {
            wwState.airBoostUsed = true;
            var pts = wwState.rider.pts;
            for (var i = 0; i < pts.length; i++) {
                var vx = (pts[i].x - pts[i].px) * 120 + 340;
                var vy = (pts[i].y - pts[i].py) * 120 - 310;
                pts[i].px = pts[i].x - vx / 120;
                pts[i].py = pts[i].y - vy / 120;
            }
            wwSpawnBurst(pts[0].x, pts[0].y, 20, "toy");
            wwPlayEject();
            wwState.stuntPts += 100;
            wwAddFloatText(pts[3].x, pts[3].y - 24, "SUPER BOOST! +100", "#facc15");
            wwShowBanner("SUPER BOOST! 🚀");
        }
    }

    function wwIsSegmentActive(seg) {
        var layer = seg.layer;
        if (layer === "main" || layer === "bridge") return true;
        var loops = wwState.course ? wwState.course.loops : null;
        var lpObj = loops && seg.loopIdx >= 0 && loops[seg.loopIdx] ? loops[seg.loopIdx] : null;
        var lp = lpObj ? lpObj.phase : 0;
        if (lp === 0) {
            return layer === "entry-floor" || layer === "loop-up";
        }
        if (lp === 1) {
            return layer === "loop-up" || layer === "loop-down" || layer === "exit-floor" || layer === "entry-floor";
        }
        return layer === "exit-floor";
    }

    function wwClosestOnSegment(px, py, seg) {
        var apx = px - seg.x1;
        var apy = py - seg.y1;
        var t = (apx * seg.dx + apy * seg.dy) / (seg.len * seg.len);
        if (t < 0) t = 0;
        else if (t > 1) t = 1;
        return {
            x: seg.x1 + seg.dx * t,
            y: seg.y1 + seg.dy * t,
            t: t
        };
    }

    function wwResolveWheelSegment(wh, ch, seg, subDt, seesaw) {
        var cp = wwClosestOnSegment(wh.x, wh.y, seg);
        var distX = wh.x - cp.x;
        var distY = wh.y - cp.y;
        var dist = Math.hypot(distX, distY);
        if (dist >= wh.r || dist <= 0.0001) return;

        var sideDot = distX * seg.nx + distY * seg.ny;
        if (sideDot < -10) return;

        var cnx = sideDot >= 0 ? seg.nx : distX / dist;
        var cny = sideDot >= 0 ? seg.ny : distY / dist;
        var pen = wh.r - dist;
        wh.x += cnx * pen;
        wh.y += cny * pen;
        wh.grounded = true;

        var vn = wh.vx * cnx + wh.vy * cny;
        if (vn < 0) {
            if (vn < -380) wwPlaySqueal();
            wh.vx -= cnx * vn * 1.12;
            wh.vy -= cny * vn * 1.12;
        }

        if (seesaw) {
            var ssCos = Math.cos(seesaw.angle);
            var ssSin = Math.sin(seesaw.angle);
            var halfLen = Math.max(30, (seesaw.len || 180) * 0.5);
            var lever = (cp.x - seesaw.x) * ssCos + (cp.y - seesaw.y) * ssSin;
            var press = Math.max(45, (vn < 0 ? -vn * 0.45 : 0) + 145);
            seesaw.omega += (lever / halfLen) * (press * 0.042) * subDt;
        }

        var ctxT = -cny;
        var ctyT = cnx;
        var vt = wh.vx * ctxT + wh.vy * ctyT;
        wh.surface = seg.surface || "dirt";
        wh.contactTx = ctxT;
        wh.contactTy = ctyT;

        if (wwState.riderSeated) {
            if (wwInput.gas) {
                var maxSpd = seg.boost ? 920 : 750;
                if (vt < maxSpd) {
                    var driveAcc = (seg.boost ? 2400 : 1520) * subDt;
                    var addVt = Math.min(maxSpd - vt, driveAcc);
                    wh.vx += ctxT * addVt;
                    wh.vy += ctyT * addVt;
                    ch.vx += ctxT * addVt * 0.28;
                    ch.vy += ctyT * addVt * 0.28;
                }
            } else if (wwInput.brake) {
                if (vt > 70) {
                    if (vt > 340) wwPlaySqueal();
                    var brk = Math.min(vt, 1750 * subDt);
                    wh.vx -= ctxT * brk;
                    wh.vy -= ctyT * brk;
                    ch.vx -= ctxT * brk * 0.22;
                    ch.vy -= ctyT * brk * 0.22;
                } else if (vt > -340) {
                    var rev = 980 * subDt;
                    wh.vx -= ctxT * rev;
                    wh.vy -= ctyT * rev;
                }
            } else {
                var drag = vt * 0.85 * subDt;
                wh.vx -= ctxT * drag;
                wh.vy -= ctyT * drag;
            }
        } else {
            wh.vx -= ctxT * (vt * 1.2 * subDt);
            wh.vy -= ctyT * (vt * 1.2 * subDt);
        }

        if (seg.boost && vt < 790) {
            var boostPush = 1900 * subDt;
            wh.vx += ctxT * boostPush;
            wh.vy += ctyT * boostPush;
            ch.vx += ctxT * boostPush * 0.35;
            ch.vy += ctyT * boostPush * 0.35;
        }

        wh.spin += ((wh.vx * ctxT + wh.vy * ctyT) / wh.r) * subDt;
    }

    function wwResolveBumperSegment(ch, cosA, sinA, seg) {
        var bumpers = [-42, 42];
        var bRad = 13;
        for (var bi = 0; bi < 2; bi++) {
            var bWorldX = ch.x + bumpers[bi] * cosA;
            var bWorldY = ch.y + bumpers[bi] * sinA;
            var bcp = wwClosestOnSegment(bWorldX, bWorldY, seg);
            var bdx = bWorldX - bcp.x;
            var bdy = bWorldY - bcp.y;
            var bDist = Math.hypot(bdx, bdy);
            if (bDist < bRad && bDist > 0.001 && (bdx * seg.nx + bdy * seg.ny) >= -10) {
                var bPen = bRad - bDist;
                ch.x += seg.nx * bPen;
                ch.y += seg.ny * bPen;
                var bvn = ch.vx * seg.nx + ch.vy * seg.ny;
                if (bvn < 0) {
                    ch.vx -= seg.nx * bvn * 1.2;
                    ch.vy -= seg.ny * bvn * 1.2;
                }
            }
        }
    }

    function wwResolveRagdollSegment(rPt, rSeg, subDt) {
        var rcp = wwClosestOnSegment(rPt.x, rPt.y, rSeg);
        var rdx2 = rPt.x - rcp.x;
        var rdy2 = rPt.y - rcp.y;
        var rDist = Math.hypot(rdx2, rdy2);
        if (rDist >= rPt.r || rDist <= 0.0001) return;
        var rPen = rPt.r - rDist;
        rPt.x += rSeg.nx * rPen;
        rPt.y += rSeg.ny * rPen;

        var rvx2 = (rPt.x - rPt.px) / subDt;
        var rvy2 = (rPt.y - rPt.py) / subDt;
        var rvn = rvx2 * rSeg.nx + rvy2 * rSeg.ny;
        if (rvn < -480) {
            wwPopRandomPin(rPt.x, rPt.y, false);
        }
        if (rvn < 0) {
            var bounceVx = rvx2 - rSeg.nx * rvn * 1.38;
            var bounceVy = rvy2 - rSeg.ny * rvn * 1.38;
            bounceVx *= 0.9;
            rPt.px = rPt.x - bounceVx * subDt;
            rPt.py = rPt.y - bounceVy * subDt;
        }
    }

    function wwDetonateTnt(tntIndex, depth) {
        var course = wwState.course;
        if (!course || !course.tntCrates || depth > 8) return;
        var tnt = course.tntCrates[tntIndex];
        if (!tnt || !tnt.intact) return;
        tnt.intact = false;

        var bx = tnt.x;
        var by = tnt.y - (tnt.h || 34) * 0.5;
        wwState.stuntPts += 120;
        if (depth === 0) wwPlayExplosion();
        wwState.shake = Math.max(wwState.shake, 16);
        wwState.hitstop = Math.max(wwState.hitstop, 0.04);
        wwSpawnBurst(bx, by, 24, "toy");
        wwAddFloatText(bx, by - 26, "KABOOM! +120 💥", "#f97316");

        // Extra fiery spark burst
        for (var fp = 0; fp < 14; fp++) {
            var ang = (fp / 14) * Math.PI * 2 + Math.random() * 0.3;
            var spd = 190 + Math.random() * 260;
            wwState.particles.push({
                x: bx, y: by,
                vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd - 70,
                rot: 0, vrot: 6, size: 6 + Math.random() * 5,
                color: fp % 2 === 0 ? "#ef4444" : "#facc15",
                shape: "puff", gravity: 210, life: 0.45 + Math.random() * 0.35, maxLife: 0.8
            });
        }

        var radius = 195;
        // Blast vehicle & wheels upward/outward without cheap forced dismount
        var ch = wwState.chassis;
        if (ch) {
            var cdx = ch.x - bx;
            var cdy = ch.y - by;
            var cDist = Math.hypot(cdx, cdy);
            if (cDist < radius) {
                var factor = 1 - cDist / radius;
                var nx = cDist > 1 ? cdx / cDist : 0.4;
                var ny = cDist > 1 ? cdy / cDist : -0.9;
                ch.vx += nx * 460 * factor + 90 * factor;
                ch.vy += Math.min(-210 * factor, ny * 460 * factor - 180 * factor);
                var wheels = wwState.wheels;
                for (var wi = 0; wi < wheels.length; wi++) {
                    wheels[wi].vx += nx * 420 * factor;
                    wheels[wi].vy += Math.min(-190 * factor, ny * 420 * factor - 160 * factor);
                }
            }
        }

        // Blast ragdoll if already dismounted
        if (!wwState.riderSeated && wwState.rider) {
            var rpts = wwState.rider.pts;
            var rdx = rpts[0].x - bx;
            var rdy = rpts[0].y - by;
            var rDist = Math.hypot(rdx, rdy);
            if (rDist < radius) {
                var rFactor = 1 - rDist / radius;
                var rnx = rDist > 1 ? rdx / rDist : 0.3;
                var rny = rDist > 1 ? rdy / rDist : -0.9;
                for (var rp = 0; rp < rpts.length; rp++) {
                    var curVx = (rpts[rp].x - rpts[rp].px) * 120 + rnx * 460 * rFactor;
                    var curVy = (rpts[rp].y - rpts[rp].py) * 120 + rny * 460 * rFactor - 240 * rFactor;
                    rpts[rp].px = rpts[rp].x - curVx / 120;
                    rpts[rp].py = rpts[rp].y - curVy / 120;
                }
            }
        }

        // Shatter nearby regular crates & chain-detonate other TNT crates
        for (var ci = 0; ci < course.crates.length; ci++) {
            var cr = course.crates[ci];
            if (!cr.intact) continue;
            if (Math.hypot(cr.x - bx, (cr.y - cr.h * 0.5) - by) < radius) {
                cr.intact = false;
                wwState.stuntPts += 50;
                wwSpawnBurst(cr.x, cr.y - cr.h * 0.5, 8, "wood");
                wwAddFloatText(cr.x, cr.y - cr.h - 10, "BLAST SMASH! +50", "#fb923c");
            }
        }
        for (var ti = 0; ti < course.tntCrates.length; ti++) {
            if (ti === tntIndex || !course.tntCrates[ti].intact) continue;
            var ot = course.tntCrates[ti];
            if (Math.hypot(ot.x - bx, (ot.y - (ot.h || 34) * 0.5) - by) < radius) {
                wwDetonateTnt(ti, depth + 1);
            }
        }
    }

    function wwComputeLiveScore(completed) {
        var span = Math.max(400, wwState.finishX - WW_START_X);
        var progress = Math.max(0, Math.min(1, (wwState.maxDistX - WW_START_X) / span));
        var basePts = completed ? 2000 : Math.round(progress * 800);
        var timeBonus = completed
            ? Math.max(0, Math.min(3000, Math.round(((45.0 - Math.max(8.0, wwState.elapsed)) / 37.0) * 3000)))
            : 0;
        var starPts = wwState.starsCollected * 100;
        var babyPts = completed && wwState.baby && wwState.baby.attached ? 500 : 0;
        var raw = basePts + timeBonus + starPts + wwState.stuntPts + babyPts;
        return Math.max(0, Math.min(1000000, Math.round(raw)));
    }

    // --- Physics Substep ---
    function wwStepPhysics(subDt) {
        var ch = wwState.chassis;
        var wheels = wwState.wheels;
        var rider = wwState.rider;
        var course = wwState.course;

        // Update Loop-the-Loop phase states based on lead body position
        var refX = wwState.riderSeated ? ch.x : rider.pts[0].x;
        var refY = wwState.riderSeated ? ch.y : rider.pts[0].y;
        var refVx = wwState.riderSeated ? ch.vx : (rider.pts[0].x - rider.pts[0].px) * 120;
        for (var lpi = 0; lpi < course.loops.length; lpi++) {
            var lg = course.loops[lpi];
            if (refX < lg.cx - lg.r - 80) {
                lg.phase = 0;
            } else if (lg.phase === 0 && refX > lg.cx - 40 && refY < lg.cy - 25 && refX < lg.cx + lg.r + 60) {
                lg.phase = 1;
            } else if (lg.phase === 1 && refY > lg.cy + 65 && refVx > 40 && refX > lg.cx - 30) {
                lg.phase = 2;
                if (!lg.bonusGiven) {
                    lg.bonusGiven = true;
                    wwState.combo++;
                    wwState.maxCombo = Math.max(wwState.maxCombo, wwState.combo);
                    wwState.stuntPts += 400;
                    playPerfectSound(wwState.combo + 2);
                    wwSpawnBurst(refX, refY - 20, 20, "toy");
                    wwAddFloatText(refX, refY - 40, "360° LOOP! +400", "#22d3ee");
                    wwShowBanner("360° LOOP-THE-LOOP! +400");
                }
            }
        }

        // Gravity on chassis & wheels
        ch.vy += WW_GRAVITY * subDt;
        for (var wi = 0; wi < 2; wi++) {
            wheels[wi].vy += WW_GRAVITY * subDt;
            wheels[wi].grounded = false;
            wheels[wi].surface = null;
            wheels[wi].contactTx = 1;
            wheels[wi].contactTy = 0;
        }

        // Lean / pitch control torque on chassis
        if (wwState.riderSeated) {
            var leanTorque = 0;
            if (wwInput.left) leanTorque -= 26500;
            if (wwInput.right) leanTorque += 26500;
            ch.omega += leanTorque * ch.invInertia * subDt;
            if (!wwInput.left && !wwInput.right) {
                ch.omega *= Math.pow(0.28, subDt);
            } else {
                ch.omega *= Math.pow(0.65, subDt);
            }
            ch.omega = Math.max(-9.5, Math.min(9.5, ch.omega));
        } else {
            ch.omega *= Math.pow(0.5, subDt);
        }

        // Suspension spring/damper coupling between chassis and 2 wheels
        var cosA = Math.cos(ch.angle);
        var sinA = Math.sin(ch.angle);
        var strutX = -sinA;
        var strutY = cosA;

        for (var wIdx = 0; wIdx < 2; wIdx++) {
            var w = wheels[wIdx];
            var mx = ch.x + w.mountX * cosA - w.mountY * sinA;
            var my = ch.y + w.mountX * sinA + w.mountY * cosA;
            var mvx = ch.vx - ch.omega * (my - ch.y);
            var mvy = ch.vy + ch.omega * (mx - ch.x);

            var dx = w.x - mx;
            var dy = w.y - my;
            var ext = dx * strutX + dy * strutY;
            var lat = dx * cosA + dy * sinA;

            var rvx = w.vx - mvx;
            var rvy = w.vy - mvy;
            var rvExt = rvx * strutX + rvy * strutY;
            var rvLat = rvx * cosA + rvy * sinA;

            var fAxial = -2500 * (ext - 24) - 92 * rvExt;
            var fLat = -5600 * lat - 145 * rvLat;

            var fx = fLat * cosA + fAxial * strutX;
            var fy = fLat * sinA + fAxial * strutY;

            w.vx += (fx / w.mass) * subDt;
            w.vy += (fy / w.mass) * subDt;

            ch.vx -= fx * ch.invMass * subDt;
            ch.vy -= fy * ch.invMass * subDt;
            var torque = (mx - ch.x) * (-fy) - (my - ch.y) * (-fx);
            ch.omega += torque * ch.invInertia * subDt;
        }

        // Integrate chassis & wheels
        ch.vx = Math.max(-1500, Math.min(1500, ch.vx * Math.pow(0.96, subDt)));
        ch.vy = Math.max(-1500, Math.min(1500, ch.vy * Math.pow(0.98, subDt)));
        ch.x += ch.vx * subDt;
        ch.y += ch.vy * subDt;
        ch.angle += ch.omega * subDt;

        cosA = Math.cos(ch.angle);
        sinA = Math.sin(ch.angle);
        strutX = -sinA;
        strutY = cosA;

        for (var k = 0; k < 2; k++) {
            var wk = wheels[k];
            wk.vx = Math.max(-1600, Math.min(1600, wk.vx));
            wk.vy = Math.max(-1600, Math.min(1600, wk.vy));
            wk.x += wk.vx * subDt;
            wk.y += wk.vy * subDt;

            // Clamp wheel travel envelope so wheels never invert through chassis
            var cmx = ch.x + wk.mountX * cosA - wk.mountY * sinA;
            var cmy = ch.y + wk.mountX * sinA + wk.mountY * cosA;
            var cdx = wk.x - cmx;
            var cdy = wk.y - cmy;
            var cExt = Math.max(10, Math.min(38, cdx * strutX + cdy * strutY));
            var cLat = Math.max(-3, Math.min(3, cdx * cosA + cdy * sinA));
            wk.x = cmx + cLat * cosA + cExt * strutX;
            wk.y = cmy + cLat * sinA + cExt * strutY;
        }

        // Wheel vs Terrain Segment Collisions & Motor Traction
        for (var wc = 0; wc < 2; wc++) {
            var wh = wheels[wc];
            var bx = Math.floor(wh.x / WW_BUCKET_W);
            for (var bOff = -1; bOff <= 1; bOff++) {
                var segList = course.buckets[bx + bOff];
                if (!segList) continue;
                for (var si = 0; si < segList.length; si++) {
                    var seg = segList[si];
                    if (!wwIsSegmentActive(seg)) continue;
                    wwResolveWheelSegment(wh, ch, seg, subDt, null);
                }
            }
        }

        // Chassis nose/tail bumper collision against terrain
        var bBucketCenter = Math.floor(ch.x / WW_BUCKET_W);
        for (var bbOff = -1; bbOff <= 1; bbOff++) {
            var bSegs = course.buckets[bBucketCenter + bbOff];
            if (!bSegs) continue;
            for (var bs = 0; bs < bSegs.length; bs++) {
                var bSeg = bSegs[bs];
                if (!wwIsSegmentActive(bSeg)) continue;
                wwResolveBumperSegment(ch, cosA, sinA, bSeg);
            }
        }

        // --- Dynamic Interactive Toys: Tilting See-Saw Planks ---
        var sawSegments = [];
        if (course.seesaws) {
            for (var ssi = 0; ssi < course.seesaws.length; ssi++) {
                var ss = course.seesaws[ssi];
                var maxAng = ss.maxAngle || 0.42;
                ss.omega *= Math.pow(0.24, subDt);
                ss.omega += (-ss.angle * 3.8) * subDt;
                ss.angle += ss.omega * subDt;
                if (ss.angle > maxAng) {
                    ss.angle = maxAng;
                    if (ss.omega > 0) ss.omega = 0;
                } else if (ss.angle < -maxAng) {
                    ss.angle = -maxAng;
                    if (ss.omega < 0) ss.omega = 0;
                }
                var ssCos = Math.cos(ss.angle);
                var ssSin = Math.sin(ss.angle);
                var ssHalf = (ss.len || 180) * 0.5;
                var ssSeg = {
                    x1: ss.x - ssCos * ssHalf, y1: ss.y - ssSin * ssHalf,
                    x2: ss.x + ssCos * ssHalf, y2: ss.y + ssSin * ssHalf,
                    dx: ssCos * ssHalf * 2, dy: ssSin * ssHalf * 2, len: Math.max(1, ssHalf * 2),
                    tx: ssCos, ty: ssSin, nx: ssSin, ny: -ssCos,
                    layer: "main", boost: false, surface: "metal", loopIdx: -1
                };
                sawSegments.push(ssSeg);
                for (var sws = 0; sws < 2; sws++) {
                    wwResolveWheelSegment(wheels[sws], ch, ssSeg, subDt, ss);
                }
                wwResolveBumperSegment(ch, cosA, sinA, ssSeg);
            }
        }

        // --- Dynamic Interactive Toys: Air Updraft Fans ---
        if (course.fans) {
            for (var fni = 0; fni < course.fans.length; fni++) {
                var fn = course.fans[fni];
                var fwHalf = (fn.w || 96) * 0.5;
                var fh = fn.h || 260;
                var fPow = fn.power || 1450;
                var fanDeck = {
                    x1: fn.x - fwHalf, y1: fn.y - 14,
                    x2: fn.x + fwHalf, y2: fn.y - 14,
                    dx: fwHalf * 2, dy: 0, len: Math.max(1, fwHalf * 2),
                    tx: 1, ty: 0, nx: 0, ny: -1,
                    layer: "main", boost: false, surface: "metal", loopIdx: -1
                };
                sawSegments.push(fanDeck);
                for (var fws = 0; fws < 2; fws++) {
                    wwResolveWheelSegment(wheels[fws], ch, fanDeck, subDt, null);
                }
                wwResolveBumperSegment(ch, cosA, sinA, fanDeck);

                if (wwState.riderSeated) {
                    if (Math.abs(ch.x - fn.x) < fwHalf + 18 && ch.y <= fn.y - 4 && ch.y >= fn.y - fh) {
                        var hFrac = 1 - Math.max(0, Math.min(1, (fn.y - ch.y) / fh));
                        var liftAcc = fPow * (0.65 + 0.55 * hFrac);
                        ch.vy -= liftAcc * subDt;
                        wheels[0].vy -= liftAcc * subDt;
                        wheels[1].vy -= liftAcc * subDt;
                        if (wwState.fanSfxCooldown <= 0) {
                            wwState.fanSfxCooldown = 0.28;
                            wwPlayFanWhoosh();
                        }
                    }
                } else {
                    for (var frp = 0; frp < rider.pts.length; frp++) {
                        var rpF = rider.pts[frp];
                        if (Math.abs(rpF.x - fn.x) < fwHalf + 14 && rpF.y <= fn.y - 4 && rpF.y >= fn.y - fh) {
                            var rVyF = (rpF.y - rpF.py) / subDt - fPow * 1.15 * subDt;
                            rpF.py = rpF.y - rVyF * subDt;
                        }
                    }
                }
            }
        }

        // --- Airtime, Pending Flips, Wheelies & Ragdoll Flip Tracking ---
        var anyGrounded = wheels[0].grounded || wheels[1].grounded;
        if (wwState.riderSeated) {
            if (!anyGrounded) {
                wwState.wheelieTimer = 0;
                wwState.airTime += subDt;
                var dAng = ch.angle - wwState.lastChassisAngle;
                while (dAng > Math.PI) dAng -= Math.PI * 2;
                while (dAng < -Math.PI) dAng += Math.PI * 2;
                wwState.airRotAccum += dAng;

                if (Math.abs(wwState.airRotAccum) >= 5.15) {
                    var isBackflip = wwState.airRotAccum < 0;
                    wwState.airRotAccum = 0;
                    wwState.combo++;
                    wwState.maxCombo = Math.max(wwState.maxCombo, wwState.combo);
                    wwState.pendingFlips++;
                    var mult = Math.min(wwState.combo, 6);
                    var ptsGain = 200 * mult;
                    wwState.pendingStuntPts += ptsGain;
                    playPerfectSound(wwState.combo);
                    wwSpawnBurst(ch.x, ch.y, 12, "toy");
                    var label = (isBackflip ? "BACKFLIP" : "FRONTFLIP") + " ×" + wwState.combo + "! (" + ptsGain + " PENDING)";
                    wwAddFloatText(ch.x, ch.y - 48, label, "#4ade80");
                    wwShowBanner(label);
                }

                if (wwState.airTime >= 1.15 && !wwState.bigAirAwarded) {
                    wwState.bigAirAwarded = true;
                    wwState.combo++;
                    wwState.maxCombo = Math.max(wwState.maxCombo, wwState.combo);
                    wwState.pendingStuntPts += 150;
                    wwAddFloatText(ch.x, ch.y - 36, "BIG AIR! (150 PENDING)", "#38bdf8");
                }
            } else {
                wwState.airTime = 0;
                wwState.airRotAccum = 0;
                wwState.bigAirAwarded = false;
                if (wheels[0].grounded !== wheels[1].grounded && Math.hypot(ch.vx, ch.vy) > 135) {
                    wwState.wheelieTimer += subDt;
                    if (wwState.wheelieTimer >= 0.65) {
                        wwState.wheelieTimer -= 0.65;
                        wwState.wheelieTicks++;
                        wwState.stuntPts += 75;
                        wwPlayStar(Math.min(10, wwState.wheelieTicks));
                        var whLabel = wheels[0].grounded ? "WHEELIE! +75" : "NOSE MANUAL! +75";
                        wwAddFloatText(ch.x, ch.y - 50, whLabel, "#c084fc");
                    }
                } else {
                    wwState.wheelieTimer = 0;
                }
            }
        } else {
            // Ragdoll mid-air spin control & ragdoll flip bonus!
            var pHip = rider.pts[0];
            var pNeck = rider.pts[1];
            if (wwInput.left || wwInput.right) {
                var spinDir = wwInput.left ? -1 : 1;
                var rdx = pNeck.x - pHip.x;
                var rdy = pNeck.y - pHip.y;
                var rLen = Math.max(1, Math.hypot(rdx, rdy));
                var perpX = -rdy / rLen;
                var perpY = rdx / rLen;
                pNeck.x += perpX * spinDir * 190 * subDt * subDt;
                pNeck.y += perpY * spinDir * 190 * subDt * subDt;
            }
            var rCurAng = Math.atan2(pNeck.y - pHip.y, pNeck.x - pHip.x);
            var rDelta = rCurAng - wwState.ragdollLastAng;
            while (rDelta > Math.PI) rDelta -= Math.PI * 2;
            while (rDelta < -Math.PI) rDelta += Math.PI * 2;
            wwState.ragdollRotAccum += rDelta;
            wwState.ragdollLastAng = rCurAng;
            if (Math.abs(wwState.ragdollRotAccum) >= 5.2) {
                wwState.ragdollRotAccum = 0;
                wwState.combo++;
                wwState.maxCombo = Math.max(wwState.maxCombo, wwState.combo);
                wwState.stuntPts += 120;
                playPerfectSound(wwState.combo);
                wwSpawnBurst(pHip.x, pHip.y, 12, "toy");
                wwAddFloatText(pHip.x, pHip.y - 34, "RAGDOLL FLIP! +120", "#c084fc");
                wwShowBanner("RAGDOLL FLIP! +120");
            }
        }
        wwState.lastChassisAngle = ch.angle;

        // --- Ragdoll Verlet Integration & Constraint Solver ---
        var pts = rider.pts;
        var gStep = WW_GRAVITY * subDt * subDt;
        for (var pi = 0; pi < pts.length; pi++) {
            var p = pts[pi];
            var pvx = Math.max(-16, Math.min(16, (p.x - p.px) * 0.992));
            var pvy = Math.max(-16, Math.min(16, (p.y - p.py) * 0.992));
            p.px = p.x;
            p.py = p.y;
            p.x += pvx;
            p.y += pvy + gStep;
        }

        if (wwState.riderSeated) {
            var upX = sinA;
            var upY = -cosA;
            var seatX = ch.x - 10 * cosA + 14 * sinA;
            var seatY = ch.y - 10 * sinA - 14 * cosA;
            var barX = ch.x + 18 * cosA + 20 * sinA;
            var barY = ch.y + 18 * sinA - 20 * cosA;
            var pegX = ch.x + 10 * cosA - 4 * sinA;
            var pegY = ch.y + 10 * sinA + 4 * cosA;

            var leanBias = (wwInput.left ? -9 : 0) + (wwInput.right ? 9 : 0);
            var targetNeckX = seatX + upX * 25 + cosA * leanBias;
            var targetNeckY = seatY + upY * 25 + sinA * leanBias;
            var targetHeadX = seatX + upX * 38 + cosA * (leanBias * 1.3);
            var targetHeadY = seatY + upY * 38 + sinA * (leanBias * 1.3);

            // Elastic posture springs
            pts[1].x += (targetNeckX - pts[1].x) * 0.34;
            pts[1].y += (targetNeckY - pts[1].y) * 0.34;
            pts[3].x += (targetHeadX - pts[3].x) * 0.28;
            pts[3].y += (targetHeadY - pts[3].y) * 0.28;
            pts[9].x += (ch.x + 2 * cosA + 6 * sinA - pts[9].x) * 0.25;
            pts[9].y += (ch.y + 2 * sinA - 6 * cosA - pts[9].y) * 0.25;

            for (var iterS = 0; iterS < 4; iterS++) {
                pts[0].x = seatX;
                pts[0].y = seatY;
                pts[10].x = pegX;
                pts[10].y = pegY;
                if (!rider.gripBroken) {
                    pts[5].x += (barX - pts[5].x) * 0.75;
                    pts[5].y += (barY - pts[5].y) * 0.75;
                    pts[7].x += (barX - 3 * cosA - pts[7].x) * 0.75;
                    pts[7].y += (barY - 3 * sinA - pts[7].y) * 0.75;
                }
                wwSolveRiderConstraints(rider);
            }

            // Check if rider's helmet or neck smashes directly into terrain (upside-down wipeout!)
            var headP = pts[3];
            var hBucket = Math.floor(headP.x / WW_BUCKET_W);
            var hSegs = course.buckets[hBucket];
            if (hSegs) {
                for (var hs = 0; hs < hSegs.length; hs++) {
                    var hSeg = hSegs[hs];
                    if (!wwIsSegmentActive(hSeg)) continue;
                    var hcp = wwClosestOnSegment(headP.x, headP.y, hSeg);
                    var hDist = Math.hypot(headP.x - hcp.x, headP.y - hcp.y);
                    if (hDist < headP.r) {
                        // Ignore gentle upright brush unless vehicle is tilted past 85 degrees
                        if (cosA < 0.12 || Math.hypot(ch.vx, ch.vy) > 520 && cosA < 0.35) {
                            wwDismountRider("WIPEOUT! 💥", true);
                            break;
                        } else {
                            headP.x += hSeg.nx * (headP.r - hDist);
                            headP.y += hSeg.ny * (headP.r - hDist);
                        }
                    }
                }
            }
        } else {
            for (var iterF = 0; iterF < 5; iterF++) {
                wwSolveRiderConstraints(rider);
            }
            // Free ragdoll terrain, bridge, & see-saw collision
            for (var rp = 0; rp < pts.length; rp++) {
                var rPt = pts[rp];
                var rBx = Math.floor(rPt.x / WW_BUCKET_W);
                for (var rbOff = -1; rbOff <= 1; rbOff++) {
                    var rSegs = course.buckets[rBx + rbOff];
                    if (!rSegs) continue;
                    for (var rs = 0; rs < rSegs.length; rs++) {
                        var rSeg = rSegs[rs];
                        if (!wwIsSegmentActive(rSeg)) continue;
                        wwResolveRagdollSegment(rPt, rSeg, subDt);
                    }
                }
                for (var ssr = 0; ssr < sawSegments.length; ssr++) {
                    wwResolveRagdollSegment(rPt, sawSegments[ssr], subDt);
                }
            }
        }

        // --- Obstacles: Springboards ---
        for (var spi = 0; spi < course.springs.length; spi++) {
            var sp = course.springs[spi];
            if (sp.cooldown > 0) sp.cooldown -= subDt;
            if (sp.anim > 0) sp.anim = Math.max(0, sp.anim - subDt * 2.2);

            if (sp.cooldown <= 0) {
                var hitSpring = false;
                if (wwState.riderSeated) {
                    for (var sw = 0; sw < 2; sw++) {
                        if (Math.abs(wheels[sw].x - sp.x) < sp.w * 0.56 && Math.abs(wheels[sw].y - (sp.y - 14)) < 26) {
                            hitSpring = true;
                            break;
                        }
                    }
                    if (hitSpring) {
                        ch.vy = Math.min(ch.vy, -630);
                        wheels[0].vy = Math.min(wheels[0].vy, -630);
                        wheels[1].vy = Math.min(wheels[1].vy, -630);
                        ch.vx = Math.max(ch.vx, 430);
                        ch.omega -= 1.8;
                    }
                } else {
                    if (Math.abs(pts[0].x - sp.x) < sp.w * 0.6 && Math.abs(pts[0].y - (sp.y - 12)) < 28) {
                        hitSpring = true;
                        for (var spPt = 0; spPt < pts.length; spPt++) {
                            var curVx = Math.max(360, (pts[spPt].x - pts[spPt].px) / subDt);
                            pts[spPt].px = pts[spPt].x - curVx * subDt;
                            pts[spPt].py = pts[spPt].y - (-640) * subDt;
                        }
                    }
                }

                if (hitSpring) {
                    sp.cooldown = 0.42;
                    sp.anim = 1.0;
                    wwState.stuntPts += 75;
                    wwPlaySpring();
                    if (wwState.riderSeated && wwState.baby && wwState.baby.attached) {
                        wwPlayBabyGiggle();
                    }
                    wwSpawnBurst(sp.x, sp.y - 12, 12, "toy");
                    wwAddFloatText(sp.x, sp.y - 36, "BOING! +75", "#facc15");
                }
            }
        }

        // --- Obstacles: Toy Spike Strips (soft hazard, never an instant wipeout) ---
        for (var spkIdx = 0; spkIdx < course.spikes.length; spkIdx++) {
            var spk = course.spikes[spkIdx];
            if (spk.cooldown > 0) spk.cooldown -= subDt;
            if (spk.anim > 0) spk.anim = Math.max(0, spk.anim - subDt * 3.2);
            if (spk.cooldown > 0) continue;

            var hitSpike = false;
            if (wwState.riderSeated) {
                if (Math.abs(ch.x - spk.x) < spk.w * 0.5 + 30 && ch.y > spk.y - 58 && ch.y < spk.y + 8) {
                    hitSpike = true;
                }
                if (!hitSpike) {
                    for (var sw2 = 0; sw2 < 2; sw2++) {
                        if (Math.abs(wheels[sw2].x - spk.x) < spk.w * 0.5 + wheels[sw2].r &&
                            Math.abs(wheels[sw2].y - (spk.y - 10)) < wheels[sw2].r + 10) {
                            hitSpike = true;
                            break;
                        }
                    }
                }
            }

            if (!hitSpike) continue;

            spk.cooldown = 0.95;
            spk.anim = 1.0;
            wwState.combo = 0;
            ch.vy = Math.min(ch.vy, -430);
            ch.vx *= 0.82;
            ch.omega += (ch.x < spk.x ? -1 : 1) * 2.2;
            wheels[0].vy = Math.min(wheels[0].vy, -430);
            wheels[1].vy = Math.min(wheels[1].vy, -430);
            wwPopRandomPin(ch.x, ch.y - 12, false);
            wwSpawnBurst(ch.x, ch.y - 12, 14, "toy");
            wwAddFloatText(ch.x, ch.y - 52, "SPIKED! COMBO LOST", "#fb7185");
            wwShowBanner("SPIKED! OUCH!");
            wwPlaySpike();
            wwState.shake = Math.max(wwState.shake, 10);
            wwState.hitstop = Math.max(wwState.hitstop, 0.05);
        }

        // --- Obstacles: Swinging Wrecking Balls ---
        for (var wbi = 0; wbi < course.wreckingBalls.length; wbi++) {
            var wb = course.wreckingBalls[wbi];
            var theta = wb.amp * Math.sin(wwState.elapsed * wb.speed + wb.phase);
            var dTheta = wb.amp * wb.speed * Math.cos(wwState.elapsed * wb.speed + wb.phase);
            var bxW = wb.pivotX + Math.sin(theta) * wb.length;
            var byW = wb.pivotY + Math.cos(theta) * wb.length;
            var bvxW = Math.cos(theta) * wb.length * dTheta;
            var bvyW = -Math.sin(theta) * wb.length * dTheta;
            wb.curX = bxW;
            wb.curY = byW;

            // Check vs Rider
            for (var rbi = 0; rbi < 4; rbi++) {
                var checkP = pts[rbi];
                var wbdx = checkP.x - bxW;
                var wbdy = checkP.y - byW;
                var wbDist = Math.hypot(wbdx, wbdy);
                if (wbDist < wb.radius + checkP.r) {
                    var wnx = wbDist > 0.01 ? wbdx / wbDist : 1;
                    var wny = wbDist > 0.01 ? wbdy / wbDist : -0.5;
                    if (wwState.riderSeated) {
                        wwDismountRider("WRECKING BONK!", true);
                    }
                    wwPopRandomPin(checkP.x, checkP.y, false);
                    for (var kp = 0; kp < pts.length; kp++) {
                        var kvx = bvxW * 0.8 + wnx * 360;
                        var kvy = bvyW * 0.8 + wny * 260 - 140;
                        pts[kp].px = pts[kp].x - kvx * subDt;
                        pts[kp].py = pts[kp].y - kvy * subDt;
                    }
                    break;
                }
            }

            // Check vs Chassis
            var cbdx = ch.x - bxW;
            var cbdy = ch.y - byW;
            var cbDist = Math.hypot(cbdx, cbdy);
            if (cbDist < wb.radius + 26 && cbDist > 0.01) {
                var cnxW = cbdx / cbDist;
                var cnyW = cbdy / cbDist;
                var cPen = (wb.radius + 26) - cbDist;
                ch.x += cnxW * cPen;
                ch.y += cnyW * cPen;
                ch.vx = bvxW * 0.65 + cnxW * 280;
                ch.vy = bvyW * 0.65 + cnyW * 220;
                if (wwState.riderSeated && Math.hypot(bvxW, bvyW) > 220) {
                    wwDismountRider("SMASHED! 💥", true);
                }
            }
        }

        // --- Obstacles: Breakable Crates ---
        for (var ci = 0; ci < course.crates.length; ci++) {
            var cr = course.crates[ci];
            if (!cr.intact) continue;
            var hitCrate = false;
            var crateRagdoll = false;
            if (Math.abs(ch.x - cr.x) < cr.w * 0.5 + 36 && Math.abs(ch.y - (cr.y - cr.h * 0.5)) < cr.h * 0.5 + 24) {
                hitCrate = true;
                ch.vx *= 0.94;
            } else if (!wwState.riderSeated && (
                (Math.abs(pts[0].x - cr.x) < cr.w * 0.5 + 18 && Math.abs(pts[0].y - (cr.y - cr.h * 0.5)) < cr.h * 0.5 + 18) ||
                (Math.abs(pts[3].x - cr.x) < cr.w * 0.5 + 18 && Math.abs(pts[3].y - (cr.y - cr.h * 0.5)) < cr.h * 0.5 + 18)
            )) {
                hitCrate = true;
                crateRagdoll = true;
            }
            if (hitCrate) {
                cr.intact = false;
                var crPts = crateRagdoll ? 150 : 50;
                wwState.stuntPts += crPts;
                wwPlayPop();
                wwSpawnBurst(cr.x, cr.y - cr.h * 0.5, 10, "wood");
                wwAddFloatText(
                    cr.x,
                    cr.y - cr.h - 10,
                    crateRagdoll ? "BOWLING! +150" : "SMASH! +50",
                    crateRagdoll ? "#f472b6" : "#fb923c"
                );
            }
        }

        // --- Obstacles: Explosive TNT Crates ---
        if (course.tntCrates) {
            for (var tnti = 0; tnti < course.tntCrates.length; tnti++) {
                var tnt = course.tntCrates[tnti];
                if (!tnt.intact) continue;
                var tw = tnt.w || 34;
                var th = tnt.h || 34;
                var hitTnt = false;
                if (Math.abs(ch.x - tnt.x) < tw * 0.5 + 36 && Math.abs(ch.y - (tnt.y - th * 0.5)) < th * 0.5 + 24) {
                    hitTnt = true;
                } else if (!wwState.riderSeated && (
                    (Math.abs(pts[0].x - tnt.x) < tw * 0.5 + 18 && Math.abs(pts[0].y - (tnt.y - th * 0.5)) < th * 0.5 + 18) ||
                    (Math.abs(pts[3].x - tnt.x) < tw * 0.5 + 18 && Math.abs(pts[3].y - (tnt.y - th * 0.5)) < th * 0.5 + 18)
                )) {
                    hitTnt = true;
                }
                if (hitTnt) {
                    wwDetonateTnt(tnti, 0);
                }
            }
        }

        // --- Collectible Bonus Stars (+100 pts each) ---
        for (var sti = 0; sti < course.stars.length; sti++) {
            var st = course.stars[sti];
            if (st.collected) continue;
            var hitStar = false;
            if (wwState.riderSeated && Math.hypot(ch.x - st.x, ch.y - st.y) < 52) {
                hitStar = true;
            } else if (Math.hypot(pts[0].x - st.x, pts[0].y - st.y) < 42 || Math.hypot(pts[3].x - st.x, pts[3].y - st.y) < 42) {
                hitStar = true;
            }
            if (hitStar) {
                st.collected = true;
                wwState.starsCollected++;
                wwPlayStar(wwState.starsCollected);
                wwSpawnBurst(st.x, st.y, 10, "toy");
                wwAddFloatText(st.x, st.y - 18, "+100 ★", "#fde047");
            }
        }

        // --- Interactive Flags: Course Checkpoints ---
        if (course.checkpoints) {
            for (var cpi = 0; cpi < course.checkpoints.length; cpi++) {
                var cpFlag = course.checkpoints[cpi];
                if (cpFlag.reached) continue;
                if (refX >= cpFlag.x - 24 && Math.abs(refY - (cpFlag.y - 40)) < 210) {
                    cpFlag.reached = true;
                    wwState.activeCheckpoint = { x: cpFlag.x, y: cpFlag.y };
                    playPerfectSound(2);
                    wwSpawnBurst(cpFlag.x, cpFlag.y - 44, 16, "toy");
                    wwAddFloatText(cpFlag.x, cpFlag.y - 64, "CHECKPOINT! 🚩", "#22d3ee");
                    wwShowBanner("CHECKPOINT REACHED! 🚩");
                }
            }
        }
    }

    function wwSolveRiderConstraints(rider) {
        var pts = rider.pts;
        var sticks = rider.sticks;
        for (var i = 0; i < sticks.length; i++) {
            var st = sticks[i];
            var a = pts[st.a];
            var b = pts[st.b];
            var dx = b.x - a.x;
            var dy = b.y - a.y;
            var d = Math.hypot(dx, dy) || 0.001;
            var diff = (d - st.len) / d * 0.5;
            a.x += dx * diff;
            a.y += dy * diff;
            b.x -= dx * diff;
            b.y -= dy * diff;
        }
        var pins = rider.pins;
        for (var p = 0; p < pins.length; p++) {
            if (pins[p].broken) continue;
            var pa = pts[pins[p].a];
            var pb = pts[pins[p].b];
            var mx = (pa.x + pb.x) * 0.5;
            var my = (pa.y + pb.y) * 0.5;
            pa.x = mx;
            pa.y = my;
            pb.x = mx;
            pb.y = my;
        }
    }

    // --- Main Update Loop ---
    function wwUpdate(dt) {
        dt = Math.min(dt, 0.04);
        if (wwState.squealCooldown > 0) wwState.squealCooldown -= dt;
        if (wwState.fanSfxCooldown > 0) wwState.fanSfxCooldown = Math.max(0, wwState.fanSfxCooldown - dt);

        // Animate particles & floating texts even during gameover celebration
        for (var pi = wwState.particles.length - 1; pi >= 0; pi--) {
            var part = wwState.particles[pi];
            part.vy += (part.gravity !== undefined ? part.gravity : 460) * dt;
            part.x += part.vx * dt;
            part.y += part.vy * dt;
            part.rot += part.vrot * dt;
            part.life -= dt;
            if (part.life <= 0) wwState.particles.splice(pi, 1);
        }
        for (var fi = wwState.floatTexts.length - 1; fi >= 0; fi--) {
            var ft = wwState.floatTexts[fi];
            ft.y -= 36 * dt;
            ft.life -= dt;
            if (ft.life <= 0) wwState.floatTexts.splice(fi, 1);
        }
        for (var smi = wwState.skidMarks.length - 1; smi >= 0; smi--) {
            wwState.skidMarks[smi].life -= dt;
            if (wwState.skidMarks[smi].life <= 0) wwState.skidMarks.splice(smi, 1);
        }
        if (wwState.shake > 0) wwState.shake = Math.max(0, wwState.shake - dt * 30);

        if (wwState.mode !== "playing") {
            wwSilenceAudio();
            return;
        }

        var ch = wwState.chassis;
        var rider = wwState.rider;
        if (!ch || !rider) {
            wwSilenceAudio();
            return;
        }

        if (wwState.hitstop > 0) {
            wwState.hitstop = Math.max(0, wwState.hitstop - dt);
            wwUpdateHud(Math.hypot(ch.vx, ch.vy));
            return;
        }

        wwState.elapsed += dt;

        var airBefore = wwState.airTime;
        var wasGrounded = wwState.wasGrounded;

        // 2 physics substeps per frame for rock-solid spring & ragdoll stability
        var subDt = dt * 0.5;
        wwStepPhysics(subDt);
        wwStepPhysics(subDt);

        // --- Landing impact juice & stunt banking: dust ring, skid marks, hitstop, camera shake ---
        var isGrounded = wwState.wheels[0].grounded || wwState.wheels[1].grounded;
        if (!wasGrounded && isGrounded && wwState.riderSeated) {
            if (airBefore > 0.16 && wwState.lastFallVy > 190) {
                wwTriggerLanding(airBefore, wwState.lastFallVy);
            }
            wwBankPendingStunts();
        }
        wwState.wasGrounded = isGrounded;
        if (!isGrounded) {
            wwState.lastFallVy = Math.max(wwState.lastFallVy, ch.vy);
        } else {
            wwState.lastFallVy = 0;
        }

        // --- Surface-aware wheel trails and brake skid marks ---
        var groundSpeed = Math.hypot(ch.vx, ch.vy);
        if (wwState.riderSeated && isGrounded && groundSpeed > 170) {
            wwState.trailTimer -= dt;
            if (wwState.trailTimer <= 0) {
                wwState.trailTimer = 0.035;
                var rearWheel = ch.vx >= 0 ? wwState.wheels[0] : wwState.wheels[1];
                if (rearWheel.grounded) wwSpawnWheelTrail(rearWheel);
            }
        }
        if (wwState.riderSeated && isGrounded && wwInput.brake && groundSpeed > 220) {
            wwState.skidTimer -= dt;
            if (wwState.skidTimer <= 0) {
                wwState.skidTimer = 0.055;
                for (var swm = 0; swm < 2; swm++) {
                    if (wwState.wheels[swm].grounded) wwAddSkidMark(wwState.wheels[swm]);
                }
            }
        } else {
            wwState.skidTimer = 0;
        }

        // --- Free-flying toy baby doll after an eject or crash ---
        wwUpdateBabyDoll(dt);

        // Update trailing stunt scarf
        var neck = rider.pts[1];
        var scarf = wwState.scarfPts;
        if (scarf.length > 0) {
            scarf[0].x = neck.x;
            scarf[0].y = neck.y;
            for (var sc = 1; sc < scarf.length; sc++) {
                var prev = scarf[sc - 1];
                var cur = scarf[sc];
                cur.y += 65 * dt;
                cur.x -= 40 * dt;
                var sdx = cur.x - prev.x;
                var sdy = cur.y - prev.y;
                var sDist = Math.hypot(sdx, sdy) || 1;
                if (sDist > 8) {
                    cur.x = prev.x + (sdx / sDist) * 8;
                    cur.y = prev.y + (sdy / sDist) * 8;
                }
            }
        }

        // Exhaust trail puffs when accelerating
        if (wwState.riderSeated && wwInput.gas && Math.random() < 0.55) {
            var cosA = Math.cos(ch.angle);
            var sinA = Math.sin(ch.angle);
            wwState.particles.push({
                x: ch.x - 48 * cosA - 4 * sinA,
                y: ch.y - 48 * sinA + 4 * cosA,
                vx: ch.vx * 0.2 - cosA * 120 + (Math.random() - 0.5) * 30,
                vy: ch.vy * 0.2 - sinA * 120 - 25,
                rot: 0,
                vrot: 3,
                size: 5 + Math.random() * 4,
                color: "rgba(226, 232, 240, 0.65)",
                shape: "puff",
                life: 0.35,
                maxLife: 0.35
            });
        }

        // Camera smooth follow + velocity zoom
        var focusX = wwState.riderSeated ? ch.x + 115 : rider.pts[0].x + 75;
        var focusY = wwState.riderSeated ? ch.y - 34 : rider.pts[0].y - 22;
        focusY = Math.max(-360, Math.min(720, focusY));

        var spd = wwState.riderSeated
            ? Math.hypot(ch.vx, ch.vy)
            : Math.hypot((rider.pts[0].x - rider.pts[0].px) * 120, (rider.pts[0].y - rider.pts[0].py) * 120);

        var targetZoom = 1.0 - Math.min(0.22, (spd / 950) * 0.22);
        var lerpFactor = 1 - Math.exp(-7.5 * dt);
        wwState.camX += (focusX - wwState.camX) * lerpFactor;
        wwState.camY += (focusY - wwState.camY) * (1 - Math.exp(-5.5 * dt));
        wwState.camZoom += (targetZoom - wwState.camZoom) * (1 - Math.exp(-3.5 * dt));

        var leadX = Math.max(
            wwState.riderSeated ? ch.x : -9999,
            rider.pts[0].x,
            rider.pts[3].x
        );
        if (leadX > wwState.maxDistX) {
            wwState.maxDistX = leadX;
        }

        // Check Aerial Finish Bullseye Ring (+650)!
        var fGroundY = wwState.course && wwState.course.finishY !== undefined ? wwState.course.finishY : 430;
        var ringX = wwState.finishX + 34;
        var ringY = fGroundY - 235;
        if (!wwState.bullseyeHit) {
            var hitBullseye = !wwState.riderSeated
                ? (Math.hypot(rider.pts[0].x - ringX, rider.pts[0].y - ringY) < 56 ||
                   Math.hypot(rider.pts[3].x - ringX, rider.pts[3].y - ringY) < 56)
                : Math.hypot(ch.x - ringX, ch.y - ringY) < 52;
            if (hitBullseye) {
                wwState.bullseyeHit = true;
                wwState.stuntPts += 650;
                wwState.maxDistX = Math.max(wwState.maxDistX, wwState.finishX);
                wwSpawnBurst(ringX, ringY, 34, "toy");
                wwAddFloatText(ringX, ringY - 40, "BULLSEYE! +650 🎯", "#f43f5e");
                wwShowBanner("AERIAL BULLSEYE! +650 🎯");
                wwFinishRun(true);
                return;
            }
        }

        wwState.score = wwComputeLiveScore(false);
        wwUpdateEngineSound(spd / 750, wwInput.gas);
        wwUpdateHud(spd);

        // Check Checkered Finish Gate!
        if (leadX >= wwState.finishX) {
            wwFinishRun(true);
            return;
        }

        // Check Wipeout / Post-Eject Settle
        if (!wwState.riderSeated) {
            wwState.dismountTime += dt;
            if (spd < 65) {
                wwState.restTimer += dt;
            } else {
                wwState.restTimer = 0;
            }
            if (wwState.restTimer >= 0.95 || wwState.dismountTime >= 4.2 || rider.pts[0].y > 980) {
                if (!wwRespawnAtCheckpoint()) {
                    wwFinishRun(false);
                }
                return;
            }
        } else if (ch.y > 980) {
            if (!wwRespawnAtCheckpoint()) {
                wwFinishRun(false);
            }
            return;
        }
    }

    function wwFormatTime(sec) {
        var mins = Math.floor(sec / 60);
        var rem = sec - mins * 60;
        var whole = Math.floor(rem);
        var tenths = Math.floor((rem - whole) * 10);
        return mins + ":" + (whole < 10 ? "0" : "") + whole + "." + tenths;
    }

    function wwUpdateHud(spd) {
        if (wwHudTimer) wwHudTimer.textContent = wwFormatTime(wwState.elapsed);
        var span = Math.max(400, wwState.finishX - WW_START_X);
        var pct = Math.max(0, Math.min(100, Math.round(((wwState.maxDistX - WW_START_X) / span) * 100)));
        if (wwHudDistance) wwHudDistance.textContent = pct + "%";
        if (wwHudProgress) wwHudProgress.style.width = pct + "%";
        if (wwHudStars) wwHudStars.textContent = wwState.starsCollected + "/" + wwState.totalStars;
        if (wwHudCombo) wwHudCombo.textContent = "×" + wwState.combo;
        var kmh = Math.round((spd || 0) * 0.14);
        if (wwHudSpeed) wwHudSpeed.textContent = String(kmh);
        if (wwHudScore) wwHudScore.textContent = Number(wwState.score || 0).toLocaleString();

        if (wwBankPill) {
            if (wwState.mode === "playing" && wwState.riderSeated && wwState.pendingStuntPts > 0) {
                wwBankPill.textContent = "⚡ PENDING +" + wwState.pendingStuntPts.toLocaleString();
                wwBankPill.hidden = false;
            } else {
                wwBankPill.hidden = true;
            }
        }

        if (wwCheckpointBtn) {
            var leftRespawns = Math.max(0, wwState.maxRespawns - wwState.respawnsUsed);
            var canCheckpoint = wwState.mode === "playing" && !!wwState.activeCheckpoint && leftRespawns > 0;
            wwCheckpointBtn.hidden = !canCheckpoint;
            if (canCheckpoint) {
                wwCheckpointBtn.textContent = "↺ Checkpoint (" + leftRespawns + ") [C]";
            }
        }

        if (wwStreakPill) {
            if (wwState.combo >= 1) {
                wwStreakPill.textContent = "STUNT STREAK ×" + wwState.combo;
                wwStreakPill.hidden = false;
            } else {
                wwStreakPill.hidden = true;
            }
        }

        if (wwBabyPill) {
            var babyAboard = !!(wwState.baby && wwState.baby.attached);
            if (babyAboard) {
                wwBabyPill.textContent = "🍼 BABY ON BOARD +500";
                wwBabyPill.hidden = false;
                wwBabyPill.classList.remove("is-lost");
            } else if (wwState.riderSeated || wwState.mode === "gameover") {
                wwBabyPill.textContent = "🍼 BABY BAILED · NO +500";
                wwBabyPill.hidden = false;
                wwBabyPill.classList.add("is-lost");
            } else {
                wwBabyPill.hidden = true;
            }
        }
    }

    function wwFinishRun(completed) {
        if (wwState.mode === "gameover") return;
        wwState.mode = "gameover";
        wwSilenceAudio();

        var finalScore = wwComputeLiveScore(completed);
        wwState.score = finalScore;
        wwUpdateHud(0);

        if (completed) {
            wwPlayFinishHorn();
            var finY = wwState.course && wwState.course.finishY !== undefined ? wwState.course.finishY : 430;
            wwSpawnBurst(wwState.finishX - 20, finY - 85, 32, "toy");
            wwSpawnBurst(wwState.finishX + 35, finY - 105, 32, "toy");
        } else {
            playGameOverSound();
        }

        var timeBonus = completed
            ? Math.max(0, Math.min(3000, Math.round(((45.0 - Math.max(8.0, wwState.elapsed)) / 37.0) * 3000)))
            : 0;
        var starPts = wwState.starsCollected * 100;
        var babyPts = completed && wwState.baby && wwState.baby.attached ? 500 : 0;
        wwState.babyBonus = babyPts;
        if (completed && babyPts > 0) {
            wwPlayBabyGiggle();
        }
        var span = Math.max(400, wwState.finishX - WW_START_X);

        if (wwOverBadge) {
            if (wwState.playContext === "editor-test") {
                wwOverBadge.textContent = completed ? "TEST RUN CLEARED! 🏁" : "TEST RUN WIPEOUT!";
            } else if (completed && wwState.bullseyeHit) {
                wwOverBadge.textContent = "AERIAL BULLSEYE! 🎯";
            } else if (completed && babyPts > 0) {
                wwOverBadge.textContent = "SAFE DELIVERY! 🍼";
            } else {
                wwOverBadge.textContent = completed
                    ? (wwState.riderSeated ? "COURSE COMPLETE! 🏁" : "RAGDOLL FLYING FINISH! 🚀")
                    : (wwState.ejectedByPlayer ? "RAGDOLL DISMOUNT!" : "TOY RIDER WRECKED!");
            }
            wwOverBadge.style.background = completed ? "#16a34a" : "";
            wwOverBadge.style.color = completed ? "#ffffff" : "";
        }
        if (wwOverTitle) {
            wwOverTitle.textContent = completed
                ? (wwState.bullseyeHit ? "Bullseye Finish!" : (babyPts > 0 ? "Baby Delivered!" : "Checkered Flag!"))
                : "Wiped Out!";
        }
        if (wwOverBreakdown) {
            if (completed) {
                wwOverBreakdown.textContent =
                    "Course +2000 · Time +" + timeBonus + " · Stars +" + starPts + " · Stunts +" + wwState.stuntPts +
                    (babyPts > 0 ? " · Baby +" + babyPts : (wwState.bullseyeHit ? " · Bullseye +650" : " · Baby lost")) +
                    " (" + wwFormatTime(wwState.elapsed) + ")";
            } else {
                var pct = Math.max(0, Math.min(99, Math.round(((wwState.maxDistX - WW_START_X) / span) * 100)));
                wwOverBreakdown.textContent =
                    "Reached " + pct + "% of course · Stars +" + starPts + " · Stunts +" + wwState.stuntPts;
            }
        }
        if (wwOverScore) wwOverScore.textContent = Number(finalScore || 0).toLocaleString();
        if (wwOverCombo) wwOverCombo.textContent = "×" + wwState.maxCombo;

        // Contextual buttons & stat labels based on playContext
        if (wwOverEditBtn) wwOverEditBtn.hidden = wwState.playContext !== "editor-test";
        if (wwOverPublishBtn) wwOverPublishBtn.hidden = wwState.playContext !== "editor-test";
        if (wwOverLevelsBtn) wwOverLevelsBtn.hidden = wwState.playContext !== "custom";

        if (wwState.playContext === "editor-test") {
            if (wwOverBestLabel) wwOverBestLabel.textContent = "Run Time";
            if (wwOverBest) wwOverBest.textContent = wwFormatTime(wwState.elapsed);
            if (wwOverRankLabel) wwOverRankLabel.textContent = "Status";
            if (wwOverRank) wwOverRank.textContent = completed ? "Verified ✓" : "Draft";
            if (wwRecordBanner) wwRecordBanner.hidden = true;
            if (wwSaveStatus) {
                wwSaveStatus.textContent = completed
                    ? "Your custom course is beatable! Click Publish Level to share it with members."
                    : "Click Back to Editor to tweak ramps or obstacles, or Play Again!";
            }
            if (wwOverOverlay) wwOverOverlay.hidden = false;
            return;
        }

        if (wwState.playContext === "custom" && wwState.customLevelMeta) {
            var meta = wwState.customLevelMeta;
            var prevLevelBest = meta.bestScore || 0;
            if (wwOverBestLabel) wwOverBestLabel.textContent = "Level Record";
            if (wwOverBest) wwOverBest.textContent = Number(Math.max(prevLevelBest, completed ? finalScore : prevLevelBest)).toLocaleString();
            if (wwOverRankLabel) wwOverRankLabel.textContent = "Champion";
            if (wwOverRank) wwOverRank.textContent = meta.recordHolderName || "—";
            if (wwRecordBanner) {
                wwRecordBanner.textContent = "NEW COURSE RECORD! 🏆";
                wwRecordBanner.hidden = !(completed && finalScore > prevLevelBest);
            }
            if (wwSaveStatus) {
                wwSaveStatus.textContent = "Recording run on member level…";
            }
            if (wwOverOverlay) wwOverOverlay.hidden = false;
            wwSubmitCustomRun(completed, finalScore, Math.round(wwState.elapsed * 1000));
            return;
        }

        if (wwOverBestLabel) wwOverBestLabel.textContent = "Your Best";
        if (wwOverRankLabel) wwOverRankLabel.textContent = "Global Rank";
        var prevBest = wwState.leaderboard && wwState.leaderboard.myRecord ? wwState.leaderboard.myRecord.bestScore : 0;
        var optBest = Math.max(prevBest, finalScore);
        if (wwOverBest) wwOverBest.textContent = Number(optBest || 0).toLocaleString();
        if (wwOverRank) {
            wwOverRank.textContent = wwState.leaderboard && wwState.leaderboard.myRecord
                ? "#" + wwState.leaderboard.myRecord.rank
                : "—";
        }
        if (wwRecordBanner) {
            wwRecordBanner.textContent = "NEW PERSONAL RECORD!";
            wwRecordBanner.hidden = !(finalScore > prevBest && finalScore > 0);
        }
        if (wwSaveStatus) {
            wwSaveStatus.textContent = "Saving score to global leaderboard…";
        }
        if (wwOverOverlay) {
            wwOverOverlay.hidden = false;
        }

        wwSubmitScore();
    }

    async function wwSubmitCustomRun(completed, score, elapsedMs) {
        if (wwState.submitted || !wwState.customLevelMeta) return;
        wwState.submitted = true;
        var gameId = wwState.gameId;
        var levelId = wwState.customLevelMeta.id;
        try {
            var res = await window.mcwut.api("/api/games/wacky-wheels/levels/" + encodeURIComponent(levelId) + "/runs", {
                method: "POST",
                headers: window.mcwut.headers({ "Content-Type": "application/json" }),
                body: JSON.stringify({ completed: completed, score: score, elapsedMs: elapsedMs })
            });
            if (!res || gameId !== wwState.gameId) return;
            wwState.customLevelMeta = res.level;
            if (wwOverBest) wwOverBest.textContent = Number(res.level.bestScore || 0).toLocaleString();
            if (wwOverRank) wwOverRank.textContent = res.level.recordHolderName || "—";
            if (wwRecordBanner) {
                wwRecordBanner.textContent = "NEW COURSE RECORD! 🏆";
                wwRecordBanner.hidden = !res.isNewRecord;
            }
            if (res.isNewRecord) {
                playNewRecordFanfare();
            }
            if (wwSaveStatus) {
                wwSaveStatus.textContent = res.isNewRecord
                    ? "You claimed the #1 Course Record on " + res.level.title + "!"
                    : "Run recorded! (" + res.level.clearsCount + "/" + res.level.playsCount + " clears)";
            }
        } catch (err) {
            if (wwSaveStatus && gameId === wwState.gameId) {
                wwSaveStatus.textContent = "Could not save run: " + (err.message || "Network error");
            }
        }
    }

    async function wwSubmitScore() {
        if (wwState.submitted) return;
        wwState.submitted = true;
        var gameId = wwState.gameId;
        var score = Math.max(0, Math.min(1000000, Math.round(wwState.score)));
        var combo = Math.max(0, Math.min(score, Math.round(wwState.maxCombo)));

        try {
            var res = await window.mcwut.api("/api/games/wacky-wheels/scores", {
                method: "POST",
                headers: window.mcwut.headers({ "Content-Type": "application/json" }),
                body: JSON.stringify({ score: score, maxCombo: combo })
            });
            if (!res) return;
            wwState.leaderboard = res.leaderboard;
            if (GAME_KEY === "wacky-wheels") {
                renderLeaderboard(res.leaderboard);
            }
            if (gameId !== wwState.gameId) return;
            if (wwOverBest) wwOverBest.textContent = Number(res.bestScore || 0).toLocaleString();
            if (wwOverRank) wwOverRank.textContent = res.rank ? "#" + res.rank : "—";
            if (wwRecordBanner) wwRecordBanner.hidden = !res.isNewBest;
            if (res.isNewBest) {
                playNewRecordFanfare();
            }
            if (wwSaveStatus) {
                wwSaveStatus.textContent = res.isNewBest
                    ? "New personal record saved to the global leaderboard!"
                    : "Score recorded on the global leaderboard.";
            }
        } catch (err) {
            if (wwSaveStatus && gameId === wwState.gameId) {
                wwSaveStatus.textContent = "Could not save score: " + (err.message || "Network error");
            }
        }
    }

    // --- Canvas 2D Renderer ---
    function wwDrawStarShape(ctx, cx, cy, spikes, outerR, innerR, rot) {
        ctx.beginPath();
        for (var i = 0; i < spikes * 2; i++) {
            var r = i % 2 === 0 ? outerR : innerR;
            var a = rot + (i * Math.PI) / spikes;
            var sx = cx + Math.cos(a) * r;
            var sy = cy + Math.sin(a) * r;
            if (i === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
        }
        ctx.closePath();
    }

    function wwRender() {
        if (!wwCtx || !wwCanvas || !wwState.course) return;
        var ctx = wwCtx;
        var w = wwState.viewW;
        var h = wwState.viewH;
        var course = wwState.course;

        ctx.save();
        ctx.scale(wwState.dpr, wwState.dpr);

        // 1. Sky Gradient & Parallax Mountains / Clouds
        var sky = ctx.createLinearGradient(0, 0, 0, h);
        sky.addColorStop(0, "#0b192e");
        sky.addColorStop(0.55, "#15365e");
        sky.addColorStop(1, "#255885");
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, w, h);

        // Parallax sun/moon glow
        ctx.fillStyle = "rgba(250, 204, 21, 0.14)";
        ctx.beginPath();
        ctx.arc(w * 0.78 - (wwState.camX * 0.02) % 120, h * 0.22, 54, 0, Math.PI * 2);
        ctx.fill();

        // Parallax mountain silhouettes
        ctx.fillStyle = "rgba(15, 32, 58, 0.75)";
        ctx.beginPath();
        ctx.moveTo(0, h);
        var mShift = -(wwState.camX * 0.12) % 260;
        for (var mx = mShift - 260; mx <= w + 260; mx += 130) {
            ctx.lineTo(mx, h * 0.72);
            ctx.lineTo(mx + 65, h * 0.48);
        }
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fill();

        // World Camera Transform
        var baseScale = Math.max(0.56, Math.min(1.08, Math.min(w / 760, h / 440)));
        var scale = baseScale * wwState.camZoom;
        ctx.translate(w * 0.36, h * 0.54);
        ctx.scale(scale, scale);
        ctx.translate(-wwState.camX, -wwState.camY);

        // Impact camera shake (world-space jitter)
        if (wwState.shake > 0.1) {
            ctx.translate(
                (Math.random() - 0.5) * wwState.shake,
                (Math.random() - 0.5) * wwState.shake
            );
        }

        var visLeft = wwState.camX - (w * 0.6) / scale - 160;
        var visRight = wwState.camX + (w * 0.8) / scale + 160;

        // Optional Blueprint Grid & 20px Snap Dots in Level Editor Mode
        if (wwState.mode === "editor") {
            ctx.strokeStyle = "rgba(56, 189, 248, 0.12)";
            ctx.lineWidth = 1;
            var gxStart = Math.floor(visLeft / 100) * 100;
            ctx.beginPath();
            for (var gx = gxStart; gx <= visRight; gx += 100) {
                ctx.moveTo(gx, -450);
                ctx.lineTo(gx, 860);
            }
            for (var gy = -400; gy <= 800; gy += 100) {
                ctx.moveTo(visLeft, gy);
                ctx.lineTo(visRight, gy);
            }
            ctx.stroke();

            if (wwEditor.snap && visRight - visLeft < 2000) {
                ctx.fillStyle = "rgba(125, 211, 252, 0.28)";
                var sxStart = Math.floor(visLeft / 20) * 20;
                for (var sgx = sxStart; sgx <= visRight; sgx += 20) {
                    for (var sgy = -440; sgy <= 820; sgy += 20) {
                        ctx.fillRect(sgx - 1, sgy - 1, 2, 2);
                    }
                }
            }

            // Protected spawn pad indicator
            ctx.fillStyle = "rgba(34, 197, 94, 0.14)";
            ctx.fillRect(-120, 340, 380, 82);
            ctx.strokeStyle = "rgba(74, 222, 128, 0.45)";
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(-120, 340, 380, 82);
            ctx.setLineDash([]);
        }

        // 2. 360° Loop-the-Loop Structures (drawn behind foreground road)
        for (var lpIdx = 0; lpIdx < course.loops.length; lpIdx++) {
            var lg = course.loops[lpIdx];
            if (lg.cx + lg.r + 80 < visLeft || lg.cx - lg.r - 80 > visRight) continue;
            var lgFloorY = lg.cy + lg.r;

            ctx.strokeStyle = "rgba(56, 189, 248, 0.28)";
            ctx.lineWidth = 10;
            ctx.beginPath();
            ctx.moveTo(lg.cx - lg.r * 0.75, lgFloorY);
            ctx.lineTo(lg.cx - lg.r * 0.95, lg.cy);
            ctx.moveTo(lg.cx + lg.r * 0.75, lgFloorY);
            ctx.lineTo(lg.cx + lg.r * 0.95, lg.cy);
            ctx.stroke();

            ctx.strokeStyle = "#0f172a";
            ctx.lineWidth = 22;
            ctx.beginPath();
            ctx.arc(lg.cx, lg.cy, lg.r + 10, 0, Math.PI * 2);
            ctx.stroke();

            ctx.strokeStyle = "#22d3ee";
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.arc(lg.cx, lg.cy, lg.r + 2, 0, Math.PI * 2);
            ctx.stroke();

            ctx.strokeStyle = "rgba(250, 204, 21, 0.75)";
            ctx.lineWidth = 3;
            for (var la = 0; la < 8; la++) {
                var angL = (la / 8) * Math.PI * 2 + performance.now() * 0.002;
                var cxL = lg.cx + Math.cos(angL) * (lg.r - 12);
                var cyL = lg.cy + Math.sin(angL) * (lg.r - 12);
                ctx.beginPath();
                ctx.arc(cxL, cyL, 3, 0, Math.PI * 2);
                ctx.stroke();
            }

            ctx.fillStyle = "#06b6d4";
            ctx.fillRect(lg.cx - 195, lgFloorY - 6, 185, 7);
        }

        // 3. Terrain Fills, Grassy/Neon Stunt Curbs & Elevated Bridges
        for (var gs = 0; gs < course.groundStrips.length; gs++) {
            var gsObj = course.groundStrips[gs];
            var strip = gsObj.pts;
            if (!strip || strip.length < 2) continue;
            var minSx = Math.min(strip[0][0], strip[strip.length - 1][0]);
            var maxSx = Math.max(strip[0][0], strip[strip.length - 1][0]);
            for (var mm = 0; mm < strip.length; mm++) {
                if (strip[mm][0] < minSx) minSx = strip[mm][0];
                if (strip[mm][0] > maxSx) maxSx = strip[mm][0];
            }
            if (maxSx < visLeft - 100 || minSx > visRight + 100) continue;

            if (gsObj.bridge) {
                // Elevated truss bridge deck (leaves airspace open underneath)
                ctx.lineCap = "round";
                ctx.lineJoin = "round";
                ctx.strokeStyle = "#1e293b";
                ctx.lineWidth = 14;
                ctx.beginPath();
                ctx.moveTo(strip[0][0], strip[0][1] + 9);
                for (var bs1 = 1; bs1 < strip.length; bs1++) {
                    ctx.lineTo(strip[bs1][0], strip[bs1][1] + 9);
                }
                ctx.stroke();

                ctx.strokeStyle = "#475569";
                ctx.lineWidth = 3;
                ctx.beginPath();
                for (var bs2 = 0; bs2 < strip.length - 1; bs2++) {
                    var mxB = (strip[bs2][0] + strip[bs2 + 1][0]) * 0.5;
                    var myB = (strip[bs2][1] + strip[bs2 + 1][1]) * 0.5;
                    ctx.moveTo(strip[bs2][0], strip[bs2][1]);
                    ctx.lineTo(mxB, myB + 12);
                    ctx.lineTo(strip[bs2 + 1][0], strip[bs2 + 1][1]);
                }
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(strip[0][0], strip[0][1]);
                for (var bs3 = 1; bs3 < strip.length; bs3++) {
                    ctx.lineTo(strip[bs3][0], strip[bs3][1]);
                }
                ctx.strokeStyle = gsObj.boost ? "#facc15" : "#38bdf8";
                ctx.lineWidth = 7;
                ctx.stroke();

                ctx.strokeStyle = gsObj.boost ? "#fef08a" : "#e0f2fe";
                ctx.lineWidth = 2;
                ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.moveTo(strip[0][0], strip[0][1]);
                for (var sp = 1; sp < strip.length; sp++) {
                    ctx.lineTo(strip[sp][0], strip[sp][1]);
                }
                ctx.lineTo(strip[strip.length - 1][0], 1150);
                ctx.lineTo(strip[0][0], 1150);
                ctx.closePath();

                var earthGrad = ctx.createLinearGradient(0, 320, 0, 820);
                earthGrad.addColorStop(0, "#1e293b");
                earthGrad.addColorStop(0.35, "#0f172a");
                earthGrad.addColorStop(1, "#070b14");
                ctx.fillStyle = earthGrad;
                ctx.fill();

                ctx.beginPath();
                ctx.moveTo(strip[0][0], strip[0][1]);
                for (var sp2 = 1; sp2 < strip.length; sp2++) {
                    ctx.lineTo(strip[sp2][0], strip[sp2][1]);
                }
                ctx.strokeStyle = gsObj.boost ? "#facc15" : "#22c55e";
                ctx.lineWidth = 8;
                ctx.lineCap = "round";
                ctx.lineJoin = "round";
                ctx.stroke();

                ctx.strokeStyle = gsObj.boost ? "#22d3ee" : "#86efac";
                ctx.lineWidth = 2.4;
                ctx.stroke();
            }
        }

        // 3b. Brake Skid Marks (fade out underneath the wheels)
        for (var smIdx = 0; smIdx < wwState.skidMarks.length; smIdx++) {
            var sm = wwState.skidMarks[smIdx];
            if (sm.x + 40 < visLeft || sm.x - 40 > visRight) continue;
            var smAlpha = Math.max(0, Math.min(0.55, (sm.life / sm.maxLife) * 0.55));
            if (smAlpha <= 0.01) continue;
            ctx.strokeStyle = "rgba(15, 23, 42, " + smAlpha.toFixed(3) + ")";
            ctx.lineWidth = sm.width;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(sm.x - sm.tx * 7, sm.y - sm.ty * 7);
            ctx.lineTo(sm.x + sm.tx * 7, sm.y + sm.ty * 7);
            ctx.stroke();
        }

        // Official Launch Ramp Booster Highlight
        if (course.isOfficial && 2160 >= visLeft && 1950 <= visRight) {
            ctx.strokeStyle = "#facc15";
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(1975, 412);
            ctx.quadraticCurveTo(2070, 392, 2155, 318);
            ctx.stroke();
        }

        // Start Sign & Checkered Finish Gate
        if (WW_START_X + 120 >= visLeft) {
            ctx.fillStyle = "#334155";
            ctx.fillRect(42, 340, 8, 80);
            ctx.fillStyle = "#22c55e";
            ctx.fillRect(24, 324, 68, 22);
            ctx.fillStyle = "#052e16";
            ctx.font = "900 11px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("START →", 58, 339);
        }

        var finX = wwState.finishX;
        var finY = course.finishY !== undefined ? course.finishY : 430;
        if (finX + 160 >= visLeft && finX - 140 <= visRight) {
            ctx.fillStyle = "#e2e8f0";
            ctx.fillRect(finX - 8, finY - 165, 10, 165);
            ctx.fillRect(finX + 76, finY - 165, 10, 165);

            var cols = 12;
            var sq = 8;
            for (var r = 0; r < 4; r++) {
                for (var c = 0; c < cols; c++) {
                    ctx.fillStyle = (r + c) % 2 === 0 ? "#0f172a" : "#ffffff";
                    ctx.fillRect(finX - 8 + c * sq, finY - 170 + r * sq, sq, sq);
                }
            }
            ctx.fillStyle = "#facc15";
            ctx.font = "900 13px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("🏁 FINISH", finX + 40, finY - 178);

            // Aerial Eject Bullseye Ring (+650) mounted high above finish gate
            var ringX = finX + 34;
            var ringY = finY - 235;
            ctx.strokeStyle = "#475569";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(finX - 3, finY - 170);
            ctx.lineTo(ringX - 24, ringY + 26);
            ctx.moveTo(finX + 81, finY - 170);
            ctx.lineTo(ringX + 24, ringY + 26);
            ctx.stroke();

            var pulse = 1 + 0.06 * Math.sin(performance.now() * 0.007);
            ctx.fillStyle = wwState.bullseyeHit ? "rgba(74, 222, 128, 0.25)" : "rgba(244, 63, 94, 0.16)";
            ctx.beginPath();
            ctx.arc(ringX, ringY, 46 * pulse, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = wwState.bullseyeHit ? "#4ade80" : "#f43f5e";
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.ellipse(ringX, ringY, 34, 44, 0, 0, Math.PI * 2);
            ctx.stroke();

            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.ellipse(ringX, ringY, 24, 32, 0, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = wwState.bullseyeHit ? "#86efac" : "#fda4af";
            ctx.font = "900 11px sans-serif";
            ctx.fillText(wwState.bullseyeHit ? "BULLSEYE HIT!" : "🎯 +650 EJECT", ringX, ringY - 52);
        }

        // 3c. Checkpoints
        if (course.checkpoints) {
            for (var cpd = 0; cpd < course.checkpoints.length; cpd++) {
                var cpo = course.checkpoints[cpd];
                if (cpo.x + 80 < visLeft || cpo.x - 80 > visRight) continue;
                ctx.fillStyle = "#e2e8f0";
                ctx.fillRect(cpo.x - 2, cpo.y - 76, 4, 76);

                ctx.fillStyle = cpo.reached ? "#22d3ee" : "#f59e0b";
                ctx.beginPath();
                ctx.moveTo(cpo.x + 2, cpo.y - 74);
                ctx.lineTo(cpo.x + 42, cpo.y - 61);
                ctx.lineTo(cpo.x + 2, cpo.y - 48);
                ctx.closePath();
                ctx.fill();

                ctx.fillStyle = cpo.reached ? "#67e8f9" : "#fde68a";
                ctx.beginPath();
                ctx.arc(cpo.x, cpo.y - 78, 5, 0, Math.PI * 2);
                ctx.fill();

                ctx.font = "900 10px sans-serif";
                ctx.textAlign = "center";
                ctx.fillText(cpo.reached ? "SAVED ✓" : "CP", cpo.x + 18, cpo.y - 84);
            }
        }

        // 3d. Air Updraft Fans
        if (course.fans) {
            var nowFan = performance.now();
            for (var fd = 0; fd < course.fans.length; fd++) {
                var fObj = course.fans[fd];
                var fw = fObj.w || 96;
                var fh = fObj.h || 260;
                if (fObj.x + fw < visLeft || fObj.x - fw > visRight) continue;

                // Wind column glow
                var wGrad = ctx.createLinearGradient(0, fObj.y - 14, 0, fObj.y - fh);
                wGrad.addColorStop(0, "rgba(34, 211, 238, 0.30)");
                wGrad.addColorStop(0.65, "rgba(56, 189, 248, 0.12)");
                wGrad.addColorStop(1, "rgba(56, 189, 248, 0)");
                ctx.fillStyle = wGrad;
                ctx.fillRect(fObj.x - fw * 0.48, fObj.y - fh, fw * 0.96, fh - 14);

                // Rising air streaks
                ctx.strokeStyle = "rgba(186, 230, 253, 0.55)";
                ctx.lineWidth = 2;
                ctx.beginPath();
                for (var ws = 0; ws < 4; ws++) {
                    var sxF = fObj.x - fw * 0.34 + ws * (fw * 0.22);
                    var phaseF = ((nowFan * 0.28 + ws * 55) % Math.max(60, fh - 30));
                    var syF = fObj.y - 20 - phaseF;
                    ctx.moveTo(sxF, syF);
                    ctx.lineTo(sxF, Math.max(fObj.y - fh, syF - 24));
                }
                ctx.stroke();

                // Fan base housing & spinning rotor blades
                ctx.fillStyle = "#1e293b";
                ctx.fillRect(fObj.x - fw * 0.5, fObj.y - 14, fw, 16);
                ctx.strokeStyle = "#38bdf8";
                ctx.lineWidth = 2.5;
                ctx.strokeRect(fObj.x - fw * 0.5, fObj.y - 14, fw, 16);

                // Yellow/cyan safety grate bars
                ctx.fillStyle = "#facc15";
                ctx.fillRect(fObj.x - fw * 0.48, fObj.y - 15, fw * 0.96, 3.5);
                var bladeShift = Math.sin(nowFan * 0.025) * (fw * 0.28);
                ctx.fillStyle = "#22d3ee";
                ctx.fillRect(fObj.x - 10 + bladeShift * 0.5, fObj.y - 9, 20, 5);
            }
        }

        // 3e. Tilting See-Saw Planks
        if (course.seesaws) {
            for (var ssd = 0; ssd < course.seesaws.length; ssd++) {
                var sso = course.seesaws[ssd];
                var sLen = sso.len || 180;
                if (sso.x + sLen < visLeft || sso.x - sLen > visRight) continue;

                // Fulcrum pedestal stand
                ctx.fillStyle = "#334155";
                ctx.beginPath();
                ctx.moveTo(sso.x - 16, sso.y + 18);
                ctx.lineTo(sso.x, sso.y);
                ctx.lineTo(sso.x + 16, sso.y + 18);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = "#94a3b8";
                ctx.lineWidth = 2;
                ctx.stroke();

                // Rotating plank
                ctx.save();
                ctx.translate(sso.x, sso.y);
                ctx.rotate(sso.angle || 0);
                ctx.fillStyle = "#f59e0b";
                ctx.fillRect(-sLen * 0.5, -5, sLen, 11);
                ctx.strokeStyle = "#fef08a";
                ctx.lineWidth = 2;
                ctx.strokeRect(-sLen * 0.5, -5, sLen, 11);

                // Dark center stripe + hazard tips
                ctx.fillStyle = "#0f172a";
                ctx.fillRect(-sLen * 0.5, -5, 16, 11);
                ctx.fillRect(sLen * 0.5 - 16, -5, 16, 11);
                ctx.restore();

                // Center pivot pin
                ctx.fillStyle = "#38bdf8";
                ctx.beginPath();
                ctx.arc(sso.x, sso.y, 5.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // 4. Springboards
        for (var sIdx = 0; sIdx < course.springs.length; sIdx++) {
            var spr = course.springs[sIdx];
            if (spr.x + 60 < visLeft || spr.x - 60 > visRight) continue;
            var bounceLift = spr.anim > 0 ? Math.sin(spr.anim * Math.PI * 3) * 16 * spr.anim : 0;
            var topY = spr.y - 14 - bounceLift;

            // Base plate
            ctx.fillStyle = "#475569";
            ctx.fillRect(spr.x - spr.w * 0.45, spr.y - 5, spr.w * 0.9, 6);

            // Coiled zig-zag spring
            ctx.strokeStyle = "#cbd5e1";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(spr.x - 14, spr.y - 5);
            ctx.lineTo(spr.x + 14, (spr.y + topY) * 0.5);
            ctx.lineTo(spr.x - 14, topY + 4);
            ctx.lineTo(spr.x + 14, topY + 4);
            ctx.stroke();

            // Yellow/Red Bounce Pad
            ctx.fillStyle = "#ef4444";
            ctx.fillRect(spr.x - spr.w * 0.5, topY, spr.w, 8);
            ctx.fillStyle = "#facc15";
            ctx.fillRect(spr.x - spr.w * 0.42, topY, spr.w * 0.84, 4);
        }

        // 4b. Toy Spike Strips
        for (var spkDraw = 0; spkDraw < course.spikes.length; spkDraw++) {
            var spkObj = course.spikes[spkDraw];
            if (spkObj.x + 70 < visLeft || spkObj.x - 70 > visRight) continue;
            wwDrawSpikes(ctx, spkObj.x, spkObj.y, spkObj.w, spkObj.anim);
        }

        // 5. Breakable Crates
        for (var cIdx = 0; cIdx < course.crates.length; cIdx++) {
            var cr = course.crates[cIdx];
            if (!cr.intact || cr.x + 50 < visLeft || cr.x - 50 > visRight) continue;
            var leftX = cr.x - cr.w * 0.5;
            var topCrY = cr.y - cr.h;
            ctx.fillStyle = "#b45309";
            ctx.fillRect(leftX, topCrY, cr.w, cr.h);
            ctx.strokeStyle = "#fbbf24";
            ctx.lineWidth = 2.5;
            ctx.strokeRect(leftX + 1.5, topCrY + 1.5, cr.w - 3, cr.h - 3);
            ctx.beginPath();
            ctx.moveTo(leftX + 3, topCrY + 3);
            ctx.lineTo(leftX + cr.w - 3, topCrY + cr.h - 3);
            ctx.moveTo(leftX + cr.w - 3, topCrY + 3);
            ctx.lineTo(leftX + 3, topCrY + cr.h - 3);
            ctx.stroke();
        }

        // 5b. Explosive TNT Crates
        if (course.tntCrates) {
            for (var tIdx = 0; tIdx < course.tntCrates.length; tIdx++) {
                var tnt = course.tntCrates[tIdx];
                if (!tnt.intact || tnt.x + 50 < visLeft || tnt.x - 50 > visRight) continue;
                var tw = tnt.w || 34;
                var th = tnt.h || 34;
                var tx0 = tnt.x - tw * 0.5;
                var ty0 = tnt.y - th;
                ctx.fillStyle = "#dc2626";
                ctx.fillRect(tx0, ty0, tw, th);
                ctx.strokeStyle = "#fca5a5";
                ctx.lineWidth = 2.5;
                ctx.strokeRect(tx0 + 1.5, ty0 + 1.5, tw - 3, th - 3);
                ctx.fillStyle = "#fef08a";
                ctx.fillRect(tx0 + 2, ty0 + th * 0.34, tw - 4, th * 0.32);
                ctx.fillStyle = "#7f1d1d";
                ctx.font = "900 10px sans-serif";
                ctx.textAlign = "center";
                ctx.fillText("TNT", tnt.x, ty0 + th * 0.59);
            }
        }

        // 6. Swinging Wrecking Balls
        for (var wIdx = 0; wIdx < course.wreckingBalls.length; wIdx++) {
            var wb = course.wreckingBalls[wIdx];
            var thetaW = wb.amp * Math.sin(wwState.elapsed * wb.speed + wb.phase);
            var bx = wb.curX !== undefined ? wb.curX : wb.pivotX + Math.sin(thetaW) * wb.length;
            var by = wb.curY !== undefined ? wb.curY : wb.pivotY + Math.cos(thetaW) * wb.length;
            if (Math.max(wb.pivotX, bx) + 80 < visLeft || Math.min(wb.pivotX, bx) - 80 > visRight) continue;

            // Gantry beam mount
            ctx.fillStyle = "#f59e0b";
            ctx.fillRect(wb.pivotX - 18, wb.pivotY - 8, 36, 12);

            // Chain
            ctx.strokeStyle = "#94a3b8";
            ctx.lineWidth = 4;
            ctx.setLineDash([7, 4]);
            ctx.beginPath();
            ctx.moveTo(wb.pivotX, wb.pivotY);
            ctx.lineTo(bx, by);
            ctx.stroke();
            ctx.setLineDash([]);

            // Wrecking Sphere
            var ballGrad = ctx.createRadialGradient(bx - 8, by - 8, 4, bx, by, wb.radius);
            ballGrad.addColorStop(0, "#64748b");
            ballGrad.addColorStop(0.65, "#1e293b");
            ballGrad.addColorStop(1, "#090d16");
            ctx.fillStyle = ballGrad;
            ctx.beginPath();
            ctx.arc(bx, by, wb.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#facc15";
            ctx.lineWidth = 2.5;
            ctx.stroke();
        }

        // 7. Collectible Bonus Stars
        var starRot = performance.now() * 0.0028;
        for (var stIdx = 0; stIdx < course.stars.length; stIdx++) {
            var st = course.stars[stIdx];
            if (st.collected || st.x + 40 < visLeft || st.x - 40 > visRight) continue;
            var bobY = st.y + Math.sin(performance.now() * 0.004 + st.bobPhase) * 5;

            ctx.fillStyle = "rgba(250, 204, 21, 0.22)";
            ctx.beginPath();
            ctx.arc(st.x, bobY, 19, 0, Math.PI * 2);
            ctx.fill();

            wwDrawStarShape(ctx, st.x, bobY, 5, 13, 6, starRot);
            ctx.fillStyle = "#fde047";
            ctx.fill();
            ctx.strokeStyle = "#f59e0b";
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // 8. Stunt Buggy (Suspension Springs, Spoked Wheels, Roll-Cage Chassis & Booster Flame)
        var ch = wwState.chassis;
        var wheels = wwState.wheels;
        if (ch && wheels.length === 2) {
            var cosA = Math.cos(ch.angle);
            var sinA = Math.sin(ch.angle);

            // Suspension struts & springs
            for (var swi = 0; swi < 2; swi++) {
                var wh = wheels[swi];
                var mx = ch.x + wh.mountX * cosA - wh.mountY * sinA;
                var my = ch.y + wh.mountX * sinA + wh.mountY * cosA;
                ctx.strokeStyle = "#38bdf8";
                ctx.lineWidth = 5;
                ctx.beginPath();
                ctx.moveTo(mx, my);
                ctx.lineTo(wh.x, wh.y);
                ctx.stroke();

                ctx.strokeStyle = "#facc15";
                ctx.lineWidth = 2.2;
                ctx.setLineDash([4, 4]);
                ctx.beginPath();
                ctx.moveTo(mx, my);
                ctx.lineTo(wh.x, wh.y);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            // Chassis Body
            ctx.save();
            ctx.translate(ch.x, ch.y);
            ctx.rotate(ch.angle);

            // Rocket Booster Flame when accelerating
            if ((wwState.riderSeated && wwInput.gas) || wwState.ejectedByPlayer && wwState.dismountTime < 0.4) {
                var flameLen = 22 + Math.random() * 18;
                ctx.fillStyle = "#f97316";
                ctx.beginPath();
                ctx.moveTo(-46, -4);
                ctx.lineTo(-46 - flameLen, 2);
                ctx.lineTo(-46, 8);
                ctx.closePath();
                ctx.fill();

                ctx.fillStyle = "#fef08a";
                ctx.beginPath();
                ctx.moveTo(-46, -1);
                ctx.lineTo(-46 - flameLen * 0.55, 2);
                ctx.lineTo(-46, 5);
                ctx.closePath();
                ctx.fill();
            }

            // Exhaust thruster cone
            ctx.fillStyle = "#475569";
            ctx.fillRect(-50, -5, 9, 12);

            // Stunt buggy lower shell
            ctx.fillStyle = "#ef4444";
            ctx.strokeStyle = "#fca5a5";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-44, -6);
            ctx.lineTo(36, -8);
            ctx.lineTo(48, 3);
            ctx.lineTo(42, 11);
            ctx.lineTo(-42, 11);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Racing stripe & roll bar + handlebars
            ctx.fillStyle = "#facc15";
            ctx.fillRect(-34, -2, 68, 4);

            ctx.strokeStyle = "#e2e8f0";
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.moveTo(-24, -6);
            ctx.lineTo(-18, -22);
            ctx.lineTo(-6, -6);
            ctx.moveTo(14, -7);
            ctx.lineTo(18, -21);
            ctx.stroke();

            // Front-mounted toy baby seat with harnessed doll co-pilot
            if (wwState.baby && wwState.baby.attached) {
                ctx.save();
                ctx.translate(30, -13);
                wwDrawBabySeat(ctx);
                ctx.restore();
            }

            ctx.restore();

            // Wheels (tires, yellow rims, rotating spokes)
            for (var wd = 0; wd < 2; wd++) {
                var wObj = wheels[wd];
                ctx.save();
                ctx.translate(wObj.x, wObj.y);
                ctx.rotate(wObj.spin);

                // Rubber tire
                ctx.fillStyle = "#0f172a";
                ctx.beginPath();
                ctx.arc(0, 0, wObj.r, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = "#334155";
                ctx.lineWidth = 3;
                ctx.stroke();

                // Rim
                ctx.fillStyle = "#facc15";
                ctx.beginPath();
                ctx.arc(0, 0, wObj.r * 0.54, 0, Math.PI * 2);
                ctx.fill();

                // Spokes
                ctx.strokeStyle = "#0f172a";
                ctx.lineWidth = 2.5;
                for (var spk = 0; spk < 4; spk++) {
                    var sAng = (spk * Math.PI) / 2;
                    ctx.beginPath();
                    ctx.moveTo(Math.cos(sAng) * -wObj.r * 0.48, Math.sin(sAng) * -wObj.r * 0.48);
                    ctx.lineTo(Math.cos(sAng) * wObj.r * 0.48, Math.sin(sAng) * wObj.r * 0.48);
                    ctx.stroke();
                }

                ctx.restore();
            }
        }

        // 8b. Free-flying toy baby doll after eject/crash
        if (wwState.baby && !wwState.baby.attached) {
            var bb = wwState.baby;
            ctx.save();
            ctx.translate(bb.x, bb.y);
            ctx.rotate(bb.angle);
            ctx.scale(0.9, 0.9);
            wwDrawBabySeat(ctx);
            ctx.restore();
        }

        // 9. 5-Segment Articulated Toy Ragdoll Rider & Flowing Scarf
        var rider = wwState.rider;
        if (rider) {
            var pts = rider.pts;
            // Flowing stunt scarf
            if (wwState.scarfPts.length > 1) {
                ctx.strokeStyle = "#f43f5e";
                ctx.lineWidth = 5;
                ctx.lineCap = "round";
                ctx.beginPath();
                ctx.moveTo(wwState.scarfPts[0].x, wwState.scarfPts[0].y);
                for (var scf = 1; scf < wwState.scarfPts.length; scf++) {
                    ctx.lineTo(wwState.scarfPts[scf].x, wwState.scarfPts[scf].y);
                }
                ctx.stroke();
            }

            // Back Arm (6 -> 7)
            ctx.strokeStyle = "#0284c7";
            ctx.lineWidth = 6.5;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(pts[6].x, pts[6].y);
            ctx.lineTo(pts[7].x, pts[7].y);
            ctx.stroke();
            ctx.fillStyle = "#fde047";
            ctx.beginPath();
            ctx.arc(pts[7].x, pts[7].y, 4, 0, Math.PI * 2);
            ctx.fill();

            // Legs: Thigh (8 -> 9) & Shin (9 -> 10)
            ctx.strokeStyle = "#1e3a8a";
            ctx.lineWidth = 7.5;
            ctx.beginPath();
            ctx.moveTo(pts[8].x, pts[8].y);
            ctx.lineTo(pts[9].x, pts[9].y);
            ctx.lineTo(pts[10].x, pts[10].y);
            ctx.stroke();
            // Stunt boot
            ctx.fillStyle = "#facc15";
            ctx.beginPath();
            ctx.arc(pts[10].x, pts[10].y, 4.8, 0, Math.PI * 2);
            ctx.fill();

            // Torso (0 -> 1)
            ctx.strokeStyle = "#38bdf8";
            ctx.lineWidth = 11;
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            ctx.lineTo(pts[1].x, pts[1].y);
            ctx.stroke();

            // Front Arm (4 -> 5)
            ctx.strokeStyle = "#7dd3fc";
            ctx.lineWidth = 6.5;
            ctx.beginPath();
            ctx.moveTo(pts[4].x, pts[4].y);
            ctx.lineTo(pts[5].x, pts[5].y);
            ctx.stroke();
            ctx.fillStyle = "#fde047";
            ctx.beginPath();
            ctx.arc(pts[5].x, pts[5].y, 4.2, 0, Math.PI * 2);
            ctx.fill();

            // Helmeted Toy Head (2 -> 3)
            var headAng = Math.atan2(pts[3].y - pts[2].y, pts[3].x - pts[2].x) + Math.PI * 0.5;
            ctx.save();
            ctx.translate(pts[3].x, pts[3].y);
            ctx.rotate(headAng);

            // Lego yellow toy head + white/red stunt helmet
            ctx.fillStyle = "#fde047";
            ctx.beginPath();
            ctx.arc(0, 1, 9.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(0, 0, 11, Math.PI * 0.85, Math.PI * 2.15);
            ctx.fill();
            ctx.strokeStyle = "#ef4444";
            ctx.lineWidth = 2.5;
            ctx.stroke();

            // Cyan stunt visor
            ctx.fillStyle = "#06b6d4";
            ctx.fillRect(2, -4, 9, 6);
            ctx.restore();
        }

        // 10. Confetti, Stars & Wood Shard Particles
        for (var pIdx = 0; pIdx < wwState.particles.length; pIdx++) {
            var ptcl = wwState.particles[pIdx];
            ctx.save();
            ctx.globalAlpha = Math.max(0, Math.min(1, ptcl.life / ptcl.maxLife));
            ctx.translate(ptcl.x, ptcl.y);
            ctx.rotate(ptcl.rot);
            ctx.fillStyle = ptcl.color;
            if (ptcl.shape === "star") {
                wwDrawStarShape(ctx, 0, 0, 5, ptcl.size * 1.3, ptcl.size * 0.6, 0);
                ctx.fill();
            } else if (ptcl.shape === "puff") {
                ctx.beginPath();
                ctx.arc(0, 0, ptcl.size, 0, Math.PI * 2);
                ctx.fill();
            } else if (ptcl.shape === "plank") {
                ctx.fillRect(-ptcl.size, -3, ptcl.size * 2, 6);
            } else if (ptcl.shape === "spark") {
                ctx.beginPath();
                ctx.moveTo(0, -ptcl.size * 1.5);
                ctx.lineTo(ptcl.size * 0.55, 0);
                ctx.lineTo(0, ptcl.size * 1.5);
                ctx.lineTo(-ptcl.size * 0.55, 0);
                ctx.closePath();
                ctx.fill();
            } else {
                ctx.fillRect(-ptcl.size * 0.7, -ptcl.size * 0.45, ptcl.size * 1.4, ptcl.size * 0.9);
            }
            ctx.restore();
        }

        // 11. Floating Comic Texts ("BOING!", "SNAP!", "+100 ★", "BACKFLIP!")
        for (var fIdx = 0; fIdx < wwState.floatTexts.length; fIdx++) {
            var flt = wwState.floatTexts[fIdx];
            ctx.save();
            ctx.globalAlpha = Math.max(0, Math.min(1, flt.life / flt.maxLife));
            ctx.font = "900 15px sans-serif";
            ctx.textAlign = "center";
            ctx.strokeStyle = "rgba(15, 23, 42, 0.9)";
            ctx.lineWidth = 4;
            ctx.strokeText(flt.text, flt.x, flt.y);
            ctx.fillStyle = flt.color;
            ctx.fillText(flt.text, flt.x, flt.y);
            ctx.restore();
        }

        // 12. Editor In-Progress Stroke, Vertex Handles, Selection Highlight & Ghost Cursor Preview
        if (wwState.mode === "editor") {
            // Strip vertex handles in Move mode
            if (wwEditor.tool === "move" && wwEditor.data && Array.isArray(wwEditor.data.strips)) {
                for (var vsi = 0; vsi < wwEditor.data.strips.length; vsi++) {
                    var vPts = wwEditor.data.strips[vsi].pts;
                    if (!vPts) continue;
                    for (var vpi = 0; vpi < vPts.length; vpi++) {
                        var vx = vPts[vpi][0];
                        var vy = vPts[vpi][1];
                        if (vx < visLeft - 40 || vx > visRight + 40) continue;
                        var isSelV = wwEditor.selected && wwEditor.selected.kind === "vertex" &&
                            wwEditor.selected.index === vsi && wwEditor.selected.ptIndex === vpi;
                        ctx.fillStyle = vx <= 260 ? "#64748b" : (isSelV ? "#facc15" : "#38bdf8");
                        ctx.beginPath();
                        ctx.arc(vx, vy, isSelV ? 7 : 5.5, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.strokeStyle = "#0f172a";
                        ctx.lineWidth = 1.5;
                        ctx.stroke();
                    }
                }
            }

            // Selection ring for selected editor object
            if (wwEditor.selected && typeof wwGetSelectedWorldPos === "function") {
                var selPos = wwGetSelectedWorldPos(wwEditor.selected);
                if (selPos) {
                    ctx.save();
                    ctx.strokeStyle = "#22d3ee";
                    ctx.lineWidth = 2.5;
                    ctx.setLineDash([5, 4]);
                    ctx.beginPath();
                    ctx.arc(selPos.x, selPos.y, selPos.r || 26, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.setLineDash([]);
                    ctx.restore();
                }
            }

            if (wwEditor.drawingPts && wwEditor.drawingPts.length > 1) {
                ctx.beginPath();
                ctx.moveTo(wwEditor.drawingPts[0][0], wwEditor.drawingPts[0][1]);
                for (var dp = 1; dp < wwEditor.drawingPts.length; dp++) {
                    ctx.lineTo(wwEditor.drawingPts[dp][0], wwEditor.drawingPts[dp][1]);
                }
                ctx.strokeStyle = wwEditor.tool === "boost"
                    ? "#facc15"
                    : (wwEditor.tool === "bridge" ? "#38bdf8" : "#4ade80");
                ctx.lineWidth = 7;
                ctx.setLineDash([8, 5]);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            if (wwEditor.hoverWorld && !wwEditor.drawingPts && !wwEditor.panning && !wwEditor.dragging) {
                var hx = wwEditor.hoverWorld.x;
                var hy = wwEditor.hoverWorld.y;
                ctx.save();
                ctx.globalAlpha = 0.58;
                if (wwEditor.tool === "loop") {
                    ctx.strokeStyle = "#22d3ee";
                    ctx.lineWidth = 5;
                    ctx.beginPath();
                    ctx.arc(hx, hy - 150, 150, 0, Math.PI * 2);
                    ctx.stroke();
                } else if (wwEditor.tool === "spring") {
                    ctx.fillStyle = "#facc15";
                    ctx.fillRect(hx - 31, hy - 14, 62, 10);
                } else if (wwEditor.tool === "seesaw") {
                    ctx.fillStyle = "#f59e0b";
                    ctx.fillRect(hx - 90, hy - 5, 180, 10);
                } else if (wwEditor.tool === "fan") {
                    ctx.fillStyle = "rgba(34, 211, 238, 0.3)";
                    ctx.fillRect(hx - 48, hy - 260, 96, 246);
                    ctx.fillStyle = "#38bdf8";
                    ctx.fillRect(hx - 48, hy - 14, 96, 14);
                } else if (wwEditor.tool === "ball") {
                    ctx.strokeStyle = "#94a3b8";
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.moveTo(hx, hy - 205);
                    ctx.lineTo(hx, hy);
                    ctx.stroke();
                    ctx.fillStyle = "#f59e0b";
                    ctx.beginPath();
                    ctx.arc(hx, hy, 28, 0, Math.PI * 2);
                    ctx.fill();
                } else if (wwEditor.tool === "crate") {
                    ctx.fillStyle = "#d97706";
                    ctx.fillRect(hx - 17, hy - 34, 34, 34);
                } else if (wwEditor.tool === "tnt") {
                    ctx.fillStyle = "#dc2626";
                    ctx.fillRect(hx - 17, hy - 34, 34, 34);
                } else if (wwEditor.tool === "checkpoint") {
                    ctx.fillStyle = "#22d3ee";
                    ctx.fillRect(hx - 2, hy - 74, 4, 74);
                    ctx.fillRect(hx + 2, hy - 74, 32, 20);
                } else if (wwEditor.tool === "star") {
                    wwDrawStarShape(ctx, hx, hy, 5, 13, 6, 0);
                    ctx.fillStyle = "#fde047";
                    ctx.fill();
                } else if (wwEditor.tool === "spike") {
                    wwDrawSpikes(ctx, Math.max(200, hx), hy, 64, 0);
                } else if (wwEditor.tool === "finish") {
                    ctx.strokeStyle = "#facc15";
                    ctx.lineWidth = 4;
                    ctx.strokeRect(hx - 8, hy - 165, 94, 165);
                } else if (wwEditor.tool === "erase") {
                    ctx.strokeStyle = "#fb7185";
                    ctx.lineWidth = 2.5;
                    ctx.beginPath();
                    ctx.arc(hx, hy, 32, 0, Math.PI * 2);
                    ctx.stroke();
                } else if (wwEditor.tool === "road" || wwEditor.tool === "boost" || wwEditor.tool === "bridge") {
                    ctx.fillStyle = wwEditor.tool === "boost"
                        ? "#facc15"
                        : (wwEditor.tool === "bridge" ? "#38bdf8" : "#4ade80");
                    ctx.beginPath();
                    ctx.arc(hx, hy, 6, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            }
        }

        ctx.restore();
    }

    function wwResize() {
        if (!wwCanvas || !wwViewport) return;
        var rect = wwViewport.getBoundingClientRect();
        var w = Math.max(280, Math.floor(rect.width || wwViewport.clientWidth || 720));
        var h = Math.max(280, Math.floor(rect.height || wwViewport.clientHeight || 460));
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        wwState.viewW = w;
        wwState.viewH = h;
        wwState.dpr = dpr;
        if (wwCanvas.width !== Math.floor(w * dpr) || wwCanvas.height !== Math.floor(h * dpr)) {
            wwCanvas.width = Math.floor(w * dpr);
            wwCanvas.height = Math.floor(h * dpr);
        }
        wwRender();
    }

    function wwSyncModeUi() {
        var isEd = wwState.mode === "editor";
        var isEdTest = wwState.playContext === "editor-test";
        var isCustom = wwState.playContext === "custom";

        if (wwTabOfficial) {
            var offAct = !isEd && wwState.playContext === "official" && (!wwLevelsOverlay || wwLevelsOverlay.hidden);
            wwTabOfficial.classList.toggle("is-active", offAct);
            wwTabOfficial.setAttribute("aria-selected", offAct ? "true" : "false");
        }
        if (wwTabLevels) {
            var lvlAct = (wwLevelsOverlay && !wwLevelsOverlay.hidden) || (!isEd && isCustom);
            wwTabLevels.classList.toggle("is-active", lvlAct);
            wwTabLevels.setAttribute("aria-selected", lvlAct ? "true" : "false");
        }
        if (wwTabEditor) {
            var edAct = isEd || isEdTest;
            wwTabEditor.classList.toggle("is-active", edAct);
            wwTabEditor.setAttribute("aria-selected", edAct ? "true" : "false");
        }

        if (wwEditorToolbar) wwEditorToolbar.hidden = !isEd;
        if (wwTelemetryBar) wwTelemetryBar.hidden = isEd;
        if (wwEditorHint) wwEditorHint.hidden = !isEd;
        if (wwCenterHud) wwCenterHud.hidden = isEd;
        if (wwTouchPad) wwTouchPad.hidden = isEd;
        if (wwReturnEditBtn) wwReturnEditBtn.hidden = !isEdTest;
        if (wwEditorProps && !isEd) wwEditorProps.hidden = true;
        if (wwCheckpointBtn && isEd) wwCheckpointBtn.hidden = true;
        if (wwBankPill && isEd) wwBankPill.hidden = true;

        if (wwCustomPlayingBar) {
            if (isCustom && wwState.customLevelMeta && !isEd) {
                var m = wwState.customLevelMeta;
                wwCustomPlayingBar.hidden = false;
                if (wwCustomTitleLabel) wwCustomTitleLabel.textContent = m.title;
                if (wwCustomAuthorSlot) {
                    var c = window.mcwut.safeColor(m.authorColor);
                    var ink = window.mcwut.pillInk(c);
                    wwCustomAuthorSlot.innerHTML =
                        '<span class="member-pill" style="background:' + c + ";color:" + ink + '">' +
                        window.mcwut.esc(m.authorName) + "</span>";
                }
            } else {
                wwCustomPlayingBar.hidden = true;
            }
        }
    }

    function wwResetWorld() {
        if (wwState.playContext === "editor-test") {
            wwState.course = wwBuildCustomCourse(wwEditor.data);
        } else if (wwState.playContext === "custom" && wwState.customLevelData) {
            wwState.course = wwBuildCustomCourse(wwState.customLevelData);
        } else {
            wwState.course = wwBuildCourse();
        }
        wwState.finishX = wwState.course.finishX || WW_FINISH_X;
        wwState.totalStars = wwState.course.stars.length;

        wwCreateEntities();
        wwState.elapsed = 0;
        wwState.score = 0;
        wwState.stuntPts = 0;
        wwState.starsCollected = 0;
        wwState.combo = 0;
        wwState.maxCombo = 0;
        wwState.maxDistX = WW_START_X;
        wwState.bullseyeHit = false;
        wwState.pendingStuntPts = 0;
        wwState.pendingFlips = 0;
        wwState.wheelieTimer = 0;
        wwState.wheelieTicks = 0;
        wwState.ragdollLastAng = 0;
        wwState.ragdollRotAccum = 0;
        wwState.activeCheckpoint = null;
        wwState.respawnsUsed = 0;
        wwState.fanSfxCooldown = 0;
        wwState.riderSeated = true;
        wwState.ejectedByPlayer = false;
        wwState.airBoostUsed = false;
        wwState.dismountTime = 0;
        wwState.restTimer = 0;
        wwState.airTime = 0;
        wwState.airRotAccum = 0;
        wwState.lastChassisAngle = 0;
        wwState.bigAirAwarded = false;
        wwState.particles = [];
        wwState.floatTexts = [];
        wwState.camX = WW_START_X + 115;
        wwState.camY = 355;
        wwState.camZoom = 1.0;
        wwInput.gas = false;
        wwInput.brake = false;
        wwInput.left = false;
        wwInput.right = false;
        wwUpdateHud(0);
    }

    function wwStartGame() {
        if (wwLevelsOverlay) wwLevelsOverlay.hidden = true;
        if (wwPublishOverlay) wwPublishOverlay.hidden = true;
        wwResetWorld();
        wwState.mode = "playing";
        wwState.gameId++;
        wwState.submitted = false;
        if (wwStartOverlay) wwStartOverlay.hidden = true;
        if (wwOverOverlay) wwOverOverlay.hidden = true;
        if (wwRecordBanner) wwRecordBanner.hidden = true;
        if (wwPopBanner) wwPopBanner.hidden = true;
        wwSyncModeUi();
        wwEnsureEngineAudio();
        wwState.lastTime = performance.now();
        if (!wwState.animFrame) {
            wwState.animFrame = requestAnimationFrame(wwLoop);
        }
    }

    // --- Level Editor Interactive Builder ---
    function wwScreenToWorld(clientX, clientY) {
        var rect = wwCanvas.getBoundingClientRect();
        var sx = clientX - rect.left;
        var sy = clientY - rect.top;
        var baseScale = Math.max(0.56, Math.min(1.08, Math.min(wwState.viewW / 760, wwState.viewH / 440)));
        var scale = baseScale * wwState.camZoom;
        return {
            x: Math.round((sx - wwState.viewW * 0.36) / scale + wwState.camX),
            y: Math.round((sy - wwState.viewH * 0.54) / scale + wwState.camY)
        };
    }

    function wwEnsureEditorArrays(d) {
        if (!d) return;
        if (!Array.isArray(d.strips)) d.strips = [];
        if (!Array.isArray(d.loops)) d.loops = [];
        if (!Array.isArray(d.springs)) d.springs = [];
        if (!Array.isArray(d.wreckingBalls)) d.wreckingBalls = [];
        if (!Array.isArray(d.crates)) d.crates = [];
        if (!Array.isArray(d.stars)) d.stars = [];
        if (!Array.isArray(d.spikes)) d.spikes = [];
        if (!Array.isArray(d.checkpoints)) d.checkpoints = [];
        if (!Array.isArray(d.tntCrates)) d.tntCrates = [];
        if (!Array.isArray(d.fans)) d.fans = [];
        if (!Array.isArray(d.seesaws)) d.seesaws = [];
    }

    function wwSnapVal(v) {
        return wwEditor.snap ? Math.round(v / 20) * 20 : Math.round(v);
    }

    function wwSetEditorZoom(nextZoom) {
        var z = Math.max(0.45, Math.min(1.65, Number(nextZoom) || 0.88));
        wwEditor.zoom = z;
        if (wwState.mode === "editor") {
            wwState.camZoom = z;
        }
        if (wwEdZoomResetBtn) {
            wwEdZoomResetBtn.textContent = Math.round(z * 100) + "%";
        }
        if (wwState.mode === "editor") {
            wwRender();
        }
    }

    function wwPushUndo() {
        wwEditor.undoStack.push(JSON.stringify(wwEditor.data));
        if (wwEditor.undoStack.length > 25) wwEditor.undoStack.shift();
        if (wwEdUndoBtn) wwEdUndoBtn.disabled = false;
    }

    function wwEditorUndo() {
        if (wwEditor.undoStack.length === 0) return;
        try {
            wwEditor.data = JSON.parse(wwEditor.undoStack.pop());
            wwEnsureEditorArrays(wwEditor.data);
            wwEditor.selected = null;
            wwEditor.dragging = null;
            if (wwEdUndoBtn) wwEdUndoBtn.disabled = wwEditor.undoStack.length === 0;
            wwRefreshEditorCourse();
            wwRenderEditorProps();
        } catch (e) {}
    }

    function wwRefreshEditorCourse() {
        wwState.course = wwBuildCustomCourse(wwEditor.data);
        wwState.finishX = wwState.course.finishX;
        wwState.totalStars = wwState.course.stars.length;
        wwCreateEntities();
        wwRender();
    }

    function wwOpenEditor(customData, editingMeta) {
        wwSilenceAudio();
        if (wwStartOverlay) wwStartOverlay.hidden = true;
        if (wwOverOverlay) wwOverOverlay.hidden = true;
        if (wwLevelsOverlay) wwLevelsOverlay.hidden = true;
        if (wwPublishOverlay) wwPublishOverlay.hidden = true;

        if (customData) {
            wwEditor.data = JSON.parse(JSON.stringify(customData));
            wwEditor.undoStack = [];
            if (wwEdUndoBtn) wwEdUndoBtn.disabled = true;
        }
        wwEnsureEditorArrays(wwEditor.data);
        wwEditor.selected = null;
        wwEditor.dragging = null;

        if (editingMeta) {
            wwEditor.editingLevelId = editingMeta.id;
            wwEditor.editingTitle = editingMeta.title || "";
            wwEditor.editingDesc = editingMeta.description || "";
        } else if (customData) {
            wwEditor.editingLevelId = null;
        }

        wwState.mode = "editor";
        wwState.playContext = "editor-test";
        wwState.camX = wwEditor.savedCamX || 480;
        wwState.camY = wwEditor.savedCamY || 350;
        wwSetEditorZoom(wwEditor.zoom || 0.88);
        wwSetEditorTool(wwEditor.tool);
        wwRefreshEditorCourse();
        wwRenderEditorProps();
        wwSyncModeUi();
        wwResume();
    }

    function wwSetEditorTool(toolName) {
        wwEditor.tool = toolName;
        if (toolName !== "move") {
            wwEditor.dragging = null;
        }
        if (wwToolPalette) {
            var btns = wwToolPalette.querySelectorAll("[data-ww-tool]");
            for (var i = 0; i < btns.length; i++) {
                btns[i].classList.toggle("is-active", btns[i].getAttribute("data-ww-tool") === toolName);
            }
        }
        if (wwRender) wwRender();
    }

    function wwSnapToGroundY(wx, wy) {
        if (!wwState.course) return wy;
        var bx = Math.floor(wx / WW_BUCKET_W);
        var bestY = wy;
        var bestDist = 32;
        for (var off = -1; off <= 1; off++) {
            var segs = wwState.course.buckets[bx + off];
            if (!segs) continue;
            for (var i = 0; i < segs.length; i++) {
                var s = segs[i];
                if (s.layer !== "main" && s.layer !== "bridge") continue;
                var cp = wwClosestOnSegment(wx, wy, s);
                var d = Math.hypot(wx - cp.x, wy - cp.y);
                if (d < bestDist) {
                    bestDist = d;
                    bestY = Math.round(cp.y);
                }
            }
        }
        return bestY;
    }

    function wwGetSelectedWorldPos(sel) {
        if (!sel || !wwEditor.data) return null;
        var d = wwEditor.data;
        wwEnsureEditorArrays(d);
        if (sel.kind === "vertex") {
            var st = d.strips[sel.index];
            var p = st && st.pts ? st.pts[sel.ptIndex] : null;
            return p ? { x: p[0], y: p[1], r: 14 } : null;
        }
        if (sel.kind === "finish") {
            var fy = wwSnapToGroundY(d.finishX, 420);
            return { x: d.finishX + 34, y: fy - 82, r: 52 };
        }
        if (sel.kind === "ball") {
            var wb = d.wreckingBalls[sel.index];
            return wb ? { x: wb.pivotX, y: wb.pivotY + wb.length, r: (wb.radius || 28) + 8 } : null;
        }
        if (sel.kind === "loop") {
            var lp = d.loops[sel.index];
            return lp ? { x: lp.x, y: lp.y, r: (lp.r || 150) + 12 } : null;
        }
        var map = {
            spring: [d.springs, 0, 34],
            spike: [d.spikes, 0, 36],
            fan: [d.fans, -7, 46],
            seesaw: [d.seesaws, 0, 52],
            crate: [d.crates, -17, 24],
            tnt: [d.tntCrates, -17, 24],
            checkpoint: [d.checkpoints, -36, 36],
            star: [d.stars, 0, 22]
        };
        var entry = map[sel.kind];
        if (!entry || !entry[0][sel.index]) return null;
        var item = entry[0][sel.index];
        return { x: item.x, y: item.y + entry[1], r: entry[2] };
    }

    function wwFindEditorItemAt(wx, wy) {
        var d = wwEditor.data;
        wwEnsureEditorArrays(d);
        var i;
        for (i = 0; i < d.strips.length; i++) {
            var sPts = d.strips[i].pts;
            if (!sPts) continue;
            for (var pi = 0; pi < sPts.length; pi++) {
                if (sPts[pi][0] <= 260) continue;
                if (Math.hypot(sPts[pi][0] - wx, sPts[pi][1] - wy) < 22) {
                    return { kind: "vertex", index: i, ptIndex: pi };
                }
            }
        }
        for (i = d.stars.length - 1; i >= 0; i--) {
            if (Math.hypot(d.stars[i].x - wx, d.stars[i].y - wy) < 28) return { kind: "star", index: i };
        }
        for (i = d.checkpoints.length - 1; i >= 0; i--) {
            if (Math.hypot(d.checkpoints[i].x - wx, (d.checkpoints[i].y - 38) - wy) < 42) return { kind: "checkpoint", index: i };
        }
        for (i = d.tntCrates.length - 1; i >= 0; i--) {
            if (Math.hypot(d.tntCrates[i].x - wx, (d.tntCrates[i].y - 17) - wy) < 28) return { kind: "tnt", index: i };
        }
        for (i = d.crates.length - 1; i >= 0; i--) {
            if (Math.hypot(d.crates[i].x - wx, (d.crates[i].y - 17) - wy) < 28) return { kind: "crate", index: i };
        }
        for (i = d.springs.length - 1; i >= 0; i--) {
            if (Math.hypot(d.springs[i].x - wx, d.springs[i].y - wy) < 42) return { kind: "spring", index: i };
        }
        for (i = d.spikes.length - 1; i >= 0; i--) {
            if (Math.hypot(d.spikes[i].x - wx, d.spikes[i].y - wy) < 42) return { kind: "spike", index: i };
        }
        for (i = d.seesaws.length - 1; i >= 0; i--) {
            if (Math.hypot(d.seesaws[i].x - wx, d.seesaws[i].y - wy) < 64) return { kind: "seesaw", index: i };
        }
        for (i = d.fans.length - 1; i >= 0; i--) {
            if (Math.hypot(d.fans[i].x - wx, (d.fans[i].y - 12) - wy) < 52) return { kind: "fan", index: i };
        }
        for (i = d.wreckingBalls.length - 1; i >= 0; i--) {
            var wb = d.wreckingBalls[i];
            if (Math.hypot(wb.pivotX - wx, (wb.pivotY + wb.length) - wy) < (wb.radius || 28) + 18 ||
                Math.hypot(wb.pivotX - wx, wb.pivotY - wy) < 28) {
                return { kind: "ball", index: i };
            }
        }
        for (i = d.loops.length - 1; i >= 0; i--) {
            var lp = d.loops[i];
            var dc = Math.hypot(lp.x - wx, lp.y - wy);
            if (Math.abs(dc - lp.r) < 38 || dc < 44) return { kind: "loop", index: i };
        }
        var fy = wwSnapToGroundY(d.finishX, 420);
        if (Math.abs(wx - (d.finishX + 34)) < 60 && wy >= fy - 245 && wy <= fy + 16) {
            return { kind: "finish", index: 0 };
        }
        return null;
    }

    function wwDeleteSelected() {
        var sel = wwEditor.selected;
        if (!sel || wwState.mode !== "editor") return false;
        var d = wwEditor.data;
        wwEnsureEditorArrays(d);
        if (sel.kind === "finish") return false;

        wwPushUndo();
        if (sel.kind === "vertex") {
            var st = d.strips[sel.index];
            if (st && st.pts) {
                st.pts.splice(sel.ptIndex, 1);
                if (st.pts.length < 2) d.strips.splice(sel.index, 1);
            }
        } else {
            var arrays = {
                star: d.stars, checkpoint: d.checkpoints, tnt: d.tntCrates, crate: d.crates,
                spring: d.springs, spike: d.spikes, seesaw: d.seesaws, fan: d.fans,
                ball: d.wreckingBalls, loop: d.loops
            };
            var arr = arrays[sel.kind];
            if (arr && sel.index >= 0 && sel.index < arr.length) {
                arr.splice(sel.index, 1);
            }
        }
        wwEditor.selected = null;
        wwEditor.dragging = null;
        wwRefreshEditorCourse();
        wwRenderEditorProps();
        wwPlayPop();
        return true;
    }

    var WW_PROP_SPECS = {
        ball: {
            title: "Wrecking Ball",
            fields: [
                { key: "speed", label: "Speed", min: 0.8, max: 5.0, step: 0.1 },
                { key: "length", label: "Chain", min: 90, max: 340, step: 5 },
                { key: "radius", label: "Size", min: 16, max: 46, step: 2 },
                { key: "amp", label: "Swing", min: 0.2, max: 1.3, step: 0.05 }
            ]
        },
        loop: {
            title: "360° Loop",
            fields: [{ key: "r", label: "Radius", min: 110, max: 220, step: 5, anchorBottom: true }]
        },
        spring: {
            title: "Springboard",
            fields: [{ key: "w", label: "Width", min: 40, max: 130, step: 4 }]
        },
        spike: {
            title: "Spike Strip",
            fields: [{ key: "w", label: "Width", min: 36, max: 160, step: 4 }]
        },
        fan: {
            title: "Air Updraft Fan",
            fields: [
                { key: "w", label: "Width", min: 60, max: 220, step: 8 },
                { key: "h", label: "Height", min: 120, max: 480, step: 15 },
                { key: "power", label: "Lift", min: 700, max: 2600, step: 50 }
            ]
        },
        seesaw: {
            title: "See-Saw Plank",
            fields: [
                { key: "len", label: "Length", min: 110, max: 340, step: 10 },
                { key: "maxAngle", label: "Tilt", min: 0.18, max: 0.65, step: 0.02 }
            ]
        },
        crate: { title: "Wood Crate", fields: [] },
        tnt: { title: "TNT Crate", fields: [] },
        checkpoint: { title: "Checkpoint Flag", fields: [] },
        star: { title: "Bonus Star", fields: [] },
        vertex: { title: "Track Vertex", fields: [] },
        finish: { title: "Finish Gate & Ring", fields: [] }
    };

    function wwRenderEditorProps() {
        if (!wwEditorProps || !wwPropsTitle || !wwPropsControls) return;
        var sel = wwEditor.selected;
        if (!sel || wwState.mode !== "editor") {
            wwEditorProps.hidden = true;
            return;
        }
        var pos = wwGetSelectedWorldPos(sel);
        if (!pos) {
            wwEditor.selected = null;
            wwEditorProps.hidden = true;
            return;
        }
        var d = wwEditor.data;
        wwEnsureEditorArrays(d);
        var spec = WW_PROP_SPECS[sel.kind] || { title: "Selected Item", fields: [] };
        wwPropsTitle.textContent = spec.title;
        if (wwPropsDelBtn) {
            wwPropsDelBtn.hidden = sel.kind === "finish";
        }

        var arrayMap = {
            ball: d.wreckingBalls, loop: d.loops, spring: d.springs,
            spike: d.spikes, fan: d.fans, seesaw: d.seesaws
        };
        var obj = arrayMap[sel.kind] ? arrayMap[sel.kind][sel.index] : null;
        wwPropsControls.innerHTML = "";

        if (obj && spec.fields.length > 0) {
            for (var fi = 0; fi < spec.fields.length; fi++) {
                (function (fld) {
                    var wrap = document.createElement("label");
                    wrap.className = "ww-prop-field";
                    var spanLbl = document.createElement("span");
                    var curVal = obj[fld.key] !== undefined ? Number(obj[fld.key]) : fld.min;
                    var fmtVal = fld.step < 1 ? curVal.toFixed(2) : String(Math.round(curVal));
                    spanLbl.textContent = fld.label + ": " + fmtVal;

                    var inp = document.createElement("input");
                    inp.type = "range";
                    inp.min = String(fld.min);
                    inp.max = String(fld.max);
                    inp.step = String(fld.step);
                    inp.value = String(curVal);

                    var undoPushed = false;
                    inp.addEventListener("input", function () {
                        if (!undoPushed) {
                            wwPushUndo();
                            undoPushed = true;
                        }
                        var nv = Number(inp.value);
                        if (fld.anchorBottom) {
                            var oldR = Number(obj.r) || 150;
                            var bottom = obj.y + oldR;
                            obj.r = nv;
                            obj.y = bottom - nv;
                        } else {
                            obj[fld.key] = nv;
                        }
                        spanLbl.textContent = fld.label + ": " + (fld.step < 1 ? nv.toFixed(2) : String(Math.round(nv)));
                        wwRefreshEditorCourse();
                    });
                    inp.addEventListener("change", function () {
                        undoPushed = false;
                    });
                    wrap.appendChild(spanLbl);
                    wrap.appendChild(inp);
                    wwPropsControls.appendChild(wrap);
                })(spec.fields[fi]);
            }
        }
        wwEditorProps.hidden = false;
    }

    function wwEraseAt(wx, wy) {
        var d = wwEditor.data;
        wwEnsureEditorArrays(d);
        var r = 38;
        var changed = false;

        function sweepPointList(arr, yOffset, radExtra) {
            for (var idx = arr.length - 1; idx >= 0; idx--) {
                if (Math.hypot(arr[idx].x - wx, (arr[idx].y + yOffset) - wy) < r + radExtra) {
                    arr.splice(idx, 1);
                    changed = true;
                }
            }
        }

        sweepPointList(d.spikes, 0, 12);
        sweepPointList(d.stars, 0, 0);
        sweepPointList(d.crates, -17, 0);
        sweepPointList(d.tntCrates, -17, 0);
        sweepPointList(d.checkpoints, -34, 6);
        sweepPointList(d.springs, 0, 10);
        sweepPointList(d.fans, -8, 12);
        sweepPointList(d.seesaws, 0, 16);

        for (var w = d.wreckingBalls.length - 1; w >= 0; w--) {
            var wb = d.wreckingBalls[w];
            var ballY = wb.pivotY + wb.length;
            if (Math.hypot(wb.pivotX - wx, ballY - wy) < r + 18 || Math.hypot(wb.pivotX - wx, wb.pivotY - wy) < r) {
                d.wreckingBalls.splice(w, 1);
                changed = true;
            }
        }
        for (var l = d.loops.length - 1; l >= 0; l--) {
            var lp = d.loops[l];
            var distCenter = Math.hypot(lp.x - wx, lp.y - wy);
            if (Math.abs(distCenter - lp.r) < 36 || distCenter < 45) {
                d.loops.splice(l, 1);
                changed = true;
            }
        }

        // Segment-level erase & strip splitting (never wipes entire road at once)
        for (var st = d.strips.length - 1; st >= 0; st--) {
            var stripObj = d.strips[st];
            var pts = stripObj.pts;
            if (!pts || pts.length < 2) continue;
            var keepSegs = [];
            var stripModified = false;
            for (var p = 0; p < pts.length - 1; p++) {
                var p1 = pts[p];
                var p2 = pts[p + 1];
                var mx = (p1[0] + p2[0]) * 0.5;
                var my = (p1[1] + p2[1]) * 0.5;
                var isSpawnProtected = mx < 240 && Math.abs(my - 420) < 35;
                var sdx = p2[0] - p1[0];
                var sdy = p2[1] - p1[1];
                var slen = Math.hypot(sdx, sdy) || 1;
                var cp = wwClosestOnSegment(wx, wy, { x1: p1[0], y1: p1[1], x2: p2[0], y2: p2[1], dx: sdx, dy: sdy, len: slen });
                var dSeg = Math.hypot(wx - cp.x, wy - cp.y);
                var dEnd1 = p1[0] > 240 ? Math.hypot(wx - p1[0], wy - p1[1]) : 9999;
                var dEnd2 = p2[0] > 240 ? Math.hypot(wx - p2[0], wy - p2[1]) : 9999;
                var hit = !isSpawnProtected && (dSeg < 26 || dEnd1 < 22 || dEnd2 < 22);
                keepSegs.push(!hit);
                if (hit) stripModified = true;
            }
            if (!stripModified) continue;

            changed = true;
            var newPieces = [];
            var curPiece = null;
            for (var k = 0; k < keepSegs.length; k++) {
                if (keepSegs[k]) {
                    if (!curPiece) curPiece = [pts[k], pts[k + 1]];
                    else curPiece.push(pts[k + 1]);
                } else {
                    if (curPiece && curPiece.length >= 2) newPieces.push(curPiece);
                    curPiece = null;
                }
            }
            if (curPiece && curPiece.length >= 2) newPieces.push(curPiece);

            d.strips.splice(st, 1);
            for (var np = 0; np < newPieces.length; np++) {
                if (d.strips.length < 28) {
                    var pieceObj = { pts: newPieces[np] };
                    if (stripObj.boost) pieceObj.boost = true;
                    if (stripObj.bridge) pieceObj.bridge = true;
                    d.strips.splice(st + np, 0, pieceObj);
                }
            }
        }

        if (changed) {
            if (wwEditor.selected && !wwGetSelectedWorldPos(wwEditor.selected)) {
                wwEditor.selected = null;
            }
            wwRefreshEditorCourse();
            wwRenderEditorProps();
        }
    }

    function wwSmoothPoints(pts) {
        if (pts.length <= 2) return pts;
        var out = [pts[0]];
        for (var i = 1; i < pts.length - 1; i++) {
            var sx = Math.round((pts[i - 1][0] + pts[i][0] * 2 + pts[i + 1][0]) / 4);
            var sy = Math.round((pts[i - 1][1] + pts[i][1] * 2 + pts[i + 1][1]) / 4);
            out.push([sx, sy]);
        }
        out.push(pts[pts.length - 1]);
        return out;
    }

    if (wwCanvas) {
        wwCanvas.addEventListener("contextmenu", function (ev) {
            if (wwState.mode === "editor") ev.preventDefault();
        });

        wwCanvas.addEventListener("pointerdown", function (ev) {
            if (wwState.mode !== "editor") return;
            ev.preventDefault();
            if (wwCanvas.setPointerCapture && ev.pointerId !== undefined) {
                try { wwCanvas.setPointerCapture(ev.pointerId); } catch (e) {}
            }

            var pt = wwScreenToWorld(ev.clientX, ev.clientY);
            wwEditor.hoverWorld = pt;

            if (wwEditor.tool === "pan" || ev.button === 1 || ev.button === 2 || ev.shiftKey) {
                wwEditor.panning = true;
                wwEditor.panStartClientX = ev.clientX;
                wwEditor.panStartClientY = ev.clientY;
                wwEditor.panStartCamX = wwState.camX;
                wwEditor.panStartCamY = wwState.camY;
                return;
            }

            var d = wwEditor.data;
            wwEnsureEditorArrays(d);
            var rawWx = Math.max(-120, Math.min(12000, pt.x));
            var rawWy = Math.max(-440, Math.min(820, pt.y));
            var wx = wwSnapVal(rawWx);
            var wy = wwSnapVal(rawWy);

            if (wwEditor.tool === "move") {
                var hitItem = wwFindEditorItemAt(rawWx, rawWy);
                wwEditor.selected = hitItem;
                wwRenderEditorProps();
                if (hitItem) {
                    var pos0 = wwGetSelectedWorldPos(hitItem);
                    wwEditor.dragging = {
                        item: hitItem,
                        pushedUndo: false,
                        offsetX: rawWx - (pos0 ? pos0.x : rawWx),
                        offsetY: rawWy - (pos0 ? pos0.y : rawWy)
                    };
                }
                wwRender();
                return;
            }

            if (wwEditor.tool === "erase") {
                wwPushUndo();
                wwEditor.erasing = true;
                wwEraseAt(rawWx, rawWy);
                return;
            }

            if (wwEditor.tool === "road" || wwEditor.tool === "boost" || wwEditor.tool === "bridge") {
                if (d.strips.length >= 28) {
                    wwShowBanner("Max 28 road strips reached!");
                    if (window.mcwut && window.mcwut.toast) window.mcwut.toast("Max 28 road strips reached", { kind: "warn" });
                    return;
                }
                wwPushUndo();
                // Snap starting point onto existing road endpoint if nearby for seamless continuation!
                var startX = wx;
                var startY = wy;
                for (var s = 0; s < d.strips.length; s++) {
                    var sPts = d.strips[s].pts;
                    var lastP = sPts[sPts.length - 1];
                    if (Math.hypot(lastP[0] - rawWx, lastP[1] - rawWy) < 34) {
                        startX = lastP[0];
                        startY = lastP[1];
                        break;
                    }
                }
                wwEditor.drawingPts = [[startX, startY]];
                return;
            }

            if (wwEditor.tool === "loop") {
                if (d.loops.length >= 6) {
                    wwShowBanner("Max 6 loops per level!");
                    if (window.mcwut && window.mcwut.toast) window.mcwut.toast("Max 6 loops per level", { kind: "warn" });
                    return;
                }
                wwPushUndo();
                var loopX = Math.max(360, wx);
                var groundY = wwSnapToGroundY(loopX, wy);
                d.loops.push({ x: loopX, y: groundY - 150, r: 150 });
                wwEditor.selected = { kind: "loop", index: d.loops.length - 1 };
                wwPlayPop();
                wwRefreshEditorCourse();
                wwRenderEditorProps();
            } else if (wwEditor.tool === "spring") {
                if (d.springs.length >= 30) return;
                wwPushUndo();
                var sprX = Math.max(200, wx);
                var sy = wwSnapToGroundY(sprX, wy);
                d.springs.push({ x: sprX, y: sy, w: 62 });
                wwEditor.selected = { kind: "spring", index: d.springs.length - 1 };
                wwPlaySpring();
                wwRefreshEditorCourse();
                wwRenderEditorProps();
            } else if (wwEditor.tool === "seesaw") {
                if (d.seesaws.length >= 12) {
                    wwShowBanner("Max 12 see-saws per level!");
                    return;
                }
                wwPushUndo();
                var ssX = Math.max(260, wx);
                var ssY = wwSnapToGroundY(ssX, wy);
                if (ssY !== wy) ssY -= 16;
                d.seesaws.push({ x: ssX, y: ssY, len: 180, maxAngle: 0.42 });
                wwEditor.selected = { kind: "seesaw", index: d.seesaws.length - 1 };
                wwPlayPop();
                wwRefreshEditorCourse();
                wwRenderEditorProps();
            } else if (wwEditor.tool === "fan") {
                if (d.fans.length >= 16) {
                    wwShowBanner("Max 16 fans per level!");
                    return;
                }
                wwPushUndo();
                var fanX = Math.max(240, wx);
                var fanY = wwSnapToGroundY(fanX, wy);
                d.fans.push({ x: fanX, y: fanY, w: 96, h: 260, power: 1450 });
                wwEditor.selected = { kind: "fan", index: d.fans.length - 1 };
                wwPlayFanWhoosh();
                wwRefreshEditorCourse();
                wwRenderEditorProps();
            } else if (wwEditor.tool === "ball") {
                if (d.wreckingBalls.length >= 20) return;
                wwPushUndo();
                d.wreckingBalls.push({
                    pivotX: Math.max(280, wx),
                    pivotY: wy - 205,
                    length: 205,
                    radius: 28,
                    amp: 0.7,
                    speed: 2.15,
                    phase: (d.wreckingBalls.length * 1.2) % 6.2
                });
                wwEditor.selected = { kind: "ball", index: d.wreckingBalls.length - 1 };
                wwPlayPop();
                wwRefreshEditorCourse();
                wwRenderEditorProps();
            } else if (wwEditor.tool === "crate") {
                if (d.crates.length >= 60) return;
                wwPushUndo();
                var crateX = Math.max(220, wx);
                var crateY = wwSnapToGroundY(crateX, wy);
                // Stack neatly onto an existing crate if clicked right above one
                for (var ci = 0; ci < d.crates.length; ci++) {
                    if (Math.abs(d.crates[ci].x - crateX) < 24 && Math.abs((d.crates[ci].y - 34) - wy) < 28) {
                        crateX = d.crates[ci].x;
                        crateY = d.crates[ci].y - 34;
                    }
                }
                d.crates.push({ x: crateX, y: crateY });
                wwEditor.selected = { kind: "crate", index: d.crates.length - 1 };
                wwPlayPop();
                wwRefreshEditorCourse();
                wwRenderEditorProps();
            } else if (wwEditor.tool === "tnt") {
                if (d.tntCrates.length >= 24) {
                    wwShowBanner("Max 24 TNT crates per level!");
                    return;
                }
                wwPushUndo();
                var tntX = Math.max(220, wx);
                var tntY = wwSnapToGroundY(tntX, wy);
                for (var ti = 0; ti < d.crates.length; ti++) {
                    if (Math.abs(d.crates[ti].x - tntX) < 24 && Math.abs((d.crates[ti].y - 34) - wy) < 28) {
                        tntX = d.crates[ti].x;
                        tntY = d.crates[ti].y - 34;
                    }
                }
                for (var tj = 0; tj < d.tntCrates.length; tj++) {
                    if (Math.abs(d.tntCrates[tj].x - tntX) < 24 && Math.abs((d.tntCrates[tj].y - 34) - wy) < 28) {
                        tntX = d.tntCrates[tj].x;
                        tntY = d.tntCrates[tj].y - 34;
                    }
                }
                d.tntCrates.push({ x: tntX, y: tntY });
                wwEditor.selected = { kind: "tnt", index: d.tntCrates.length - 1 };
                wwPlayPop();
                wwRefreshEditorCourse();
                wwRenderEditorProps();
            } else if (wwEditor.tool === "checkpoint") {
                if (d.checkpoints.length >= 12) {
                    wwShowBanner("Max 12 checkpoints per level!");
                    return;
                }
                wwPushUndo();
                var cpX = Math.max(320, wx);
                var cpY = wwSnapToGroundY(cpX, wy);
                d.checkpoints.push({ x: cpX, y: cpY });
                wwEditor.selected = { kind: "checkpoint", index: d.checkpoints.length - 1 };
                playPerfectSound(2);
                wwRefreshEditorCourse();
                wwRenderEditorProps();
            } else if (wwEditor.tool === "star") {
                if (d.stars.length >= 40) return;
                wwPushUndo();
                d.stars.push({ x: Math.max(180, wx), y: wy });
                wwEditor.selected = { kind: "star", index: d.stars.length - 1 };
                wwPlayStar(d.stars.length);
                wwRefreshEditorCourse();
                wwRenderEditorProps();
            } else if (wwEditor.tool === "spike") {
                if (d.spikes.length >= 40) {
                    wwShowBanner("Max 40 spike strips!");
                    return;
                }
                wwPushUndo();
                var spikeX = Math.max(260, wx);
                var spikeY = wwSnapToGroundY(spikeX, wy);
                d.spikes.push({ x: spikeX, y: spikeY, w: 64 });
                wwEditor.selected = { kind: "spike", index: d.spikes.length - 1 };
                wwPlaySpike();
                wwRefreshEditorCourse();
                wwRenderEditorProps();
            } else if (wwEditor.tool === "finish") {
                wwPushUndo();
                d.finishX = Math.max(700, Math.min(12000, wx));
                wwEditor.selected = { kind: "finish", index: 0 };
                wwPlayFinishHorn();
                wwRefreshEditorCourse();
                wwRenderEditorProps();
            }
        });

        wwCanvas.addEventListener("pointermove", function (ev) {
            if (wwState.mode !== "editor") return;
            if (wwEditor.panning) {
                var baseScale = Math.max(0.56, Math.min(1.08, Math.min(wwState.viewW / 760, wwState.viewH / 440))) * wwState.camZoom;
                wwState.camX = Math.max(-80, Math.min(12200, wwEditor.panStartCamX - (ev.clientX - wwEditor.panStartClientX) / baseScale));
                wwState.camY = Math.max(-360, Math.min(720, wwEditor.panStartCamY - (ev.clientY - wwEditor.panStartClientY) / baseScale));
                wwEditor.savedCamX = wwState.camX;
                wwEditor.savedCamY = wwState.camY;
                return;
            }

            var pt = wwScreenToWorld(ev.clientX, ev.clientY);
            wwEditor.hoverWorld = wwEditor.snap ? { x: wwSnapVal(pt.x), y: wwSnapVal(pt.y) } : pt;

            if (wwEditor.dragging && wwEditor.dragging.item) {
                var drag = wwEditor.dragging;
                var it = drag.item;
                var dDrag = wwEditor.data;
                wwEnsureEditorArrays(dDrag);
                var nx = wwSnapVal(Math.max(-120, Math.min(12000, pt.x - drag.offsetX)));
                var ny = wwSnapVal(Math.max(-440, Math.min(820, pt.y - drag.offsetY)));
                if (!drag.pushedUndo) {
                    wwPushUndo();
                    drag.pushedUndo = true;
                }
                if (it.kind === "vertex") {
                    var vStrip = dDrag.strips[it.index];
                    if (vStrip && vStrip.pts && vStrip.pts[it.ptIndex]) {
                        vStrip.pts[it.ptIndex][0] = Math.max(265, nx);
                        vStrip.pts[it.ptIndex][1] = ny;
                    }
                } else if (it.kind === "finish") {
                    dDrag.finishX = Math.max(700, Math.min(12000, nx - 34));
                } else if (it.kind === "ball") {
                    var wbD = dDrag.wreckingBalls[it.index];
                    if (wbD) {
                        wbD.pivotX = Math.max(260, nx);
                        wbD.pivotY = ny - wbD.length;
                    }
                } else if (it.kind === "loop") {
                    var lpD = dDrag.loops[it.index];
                    if (lpD) {
                        lpD.x = Math.max(360, nx);
                        lpD.y = ny;
                    }
                } else {
                    var yOffsetMap = { crate: 17, tnt: 17, checkpoint: 36, fan: 7 };
                    var mapArr = {
                        spring: dDrag.springs, spike: dDrag.spikes, fan: dDrag.fans,
                        seesaw: dDrag.seesaws, crate: dDrag.crates, tnt: dDrag.tntCrates,
                        checkpoint: dDrag.checkpoints, star: dDrag.stars
                    }[it.kind];
                    if (mapArr && mapArr[it.index]) {
                        mapArr[it.index].x = Math.max(200, nx);
                        mapArr[it.index].y = ny + (yOffsetMap[it.kind] || 0);
                    }
                }
                wwRefreshEditorCourse();
                return;
            }

            if (wwEditor.erasing) {
                wwEraseAt(pt.x, pt.y);
                return;
            }

            if (wwEditor.drawingPts) {
                var sxP = wwSnapVal(Math.max(-120, Math.min(12000, pt.x)));
                var syP = wwSnapVal(Math.max(-440, Math.min(820, pt.y)));
                var prev = wwEditor.drawingPts[wwEditor.drawingPts.length - 1];
                if (Math.hypot(sxP - prev[0], syP - prev[1]) >= 20 && wwEditor.drawingPts.length < 48) {
                    wwEditor.drawingPts.push([sxP, syP]);
                }
            }
        });

        var finishPointer = function (ev) {
            if (wwState.mode !== "editor") return;
            wwEditor.panning = false;
            wwEditor.erasing = false;
            if (wwEditor.dragging) {
                wwEditor.dragging = null;
                wwRenderEditorProps();
            }
            if (wwEditor.drawingPts) {
                if (wwEditor.drawingPts.length >= 2) {
                    var finalPts = wwEditor.snap ? wwEditor.drawingPts : wwSmoothPoints(wwEditor.drawingPts);
                    var newStrip = { pts: finalPts };
                    if (wwEditor.tool === "boost") newStrip.boost = true;
                    if (wwEditor.tool === "bridge") newStrip.bridge = true;
                    wwEditor.data.strips.push(newStrip);
                    wwPlayPop();
                    wwRefreshEditorCourse();
                } else {
                    wwEditor.undoStack.pop();
                    if (wwEdUndoBtn) wwEdUndoBtn.disabled = wwEditor.undoStack.length === 0;
                }
                wwEditor.drawingPts = null;
            }
        };

        wwCanvas.addEventListener("pointerup", finishPointer);
        wwCanvas.addEventListener("pointercancel", finishPointer);

        wwCanvas.addEventListener("wheel", function (ev) {
            if (wwState.mode !== "editor") return;
            ev.preventDefault();
            wwState.camX = Math.max(-80, Math.min(12200, wwState.camX + (ev.deltaY || ev.deltaX) * 0.85));
            wwEditor.savedCamX = wwState.camX;
        }, { passive: false });
    }

    // --- Member Community Levels Fetching, Publishing & Sharing ---
    async function wwLoadLevelsList(openOverlay) {
        if (openOverlay) {
            wwSilenceAudio();
            if (wwStartOverlay) wwStartOverlay.hidden = true;
            if (wwOverOverlay) wwOverOverlay.hidden = true;
            if (wwPublishOverlay) wwPublishOverlay.hidden = true;
            if (wwLevelsOverlay) wwLevelsOverlay.hidden = false;
            wwSyncModeUi();
        }
        try {
            var list = await window.mcwut.api("/api/games/wacky-wheels/levels", {
                headers: window.mcwut.headers()
            });
            wwState.communityLevels = Array.isArray(list) ? list : [];
            if (wwLevelsCountBadge) {
                wwLevelsCountBadge.textContent = String(wwState.communityLevels.length);
            }
            wwRenderLevelsList();
        } catch (err) {
            if (wwLevelsListEl) {
                wwLevelsListEl.innerHTML = '<p class="text-danger small mb-0">Could not load member levels: ' + window.mcwut.esc(err.message || "Error") + "</p>";
            }
        }
    }

    function wwRenderLevelsList() {
        if (!wwLevelsListEl) return;
        var list = wwState.communityLevels || [];
        if (list.length === 0) {
            wwLevelsListEl.innerHTML =
                '<div class="text-center py-4">' +
                '<p class="text-white fw-semibold mb-1">No custom member levels yet!</p>' +
                '<p class="text-white-50 small mb-0">Click <strong>+ Create Level</strong> above to build the first obstacle course for other members to try.</p>' +
                "</div>";
            return;
        }

        var esc = window.mcwut.esc;
        var html = "";
        for (var i = 0; i < list.length; i++) {
            var lv = list[i];
            var aColor = window.mcwut.safeColor(lv.authorColor);
            var aInk = window.mcwut.pillInk(aColor);
            var badgeImg = lv.authorBadgeUrl
                ? '<img class="game-board-badge" src="' + esc(lv.authorBadgeUrl) + '" alt="" aria-hidden="true" /> '
                : "";

            var recHtml = "";
            if (lv.bestScore > 0 && lv.recordHolderName) {
                var rColor = window.mcwut.safeColor(lv.recordHolderColor);
                var rInk = window.mcwut.pillInk(rColor);
                var tStr = lv.bestTimeMs ? " (" + wwFormatTime(lv.bestTimeMs / 1000) + ")" : "";
                recHtml =
                    '<span>🏆 Record: <strong class="text-warning">' + Number(lv.bestScore).toLocaleString() + " pts" + esc(tStr) + '</strong> by ' +
                    '<span class="member-pill" style="background:' + rColor + ";color:" + rInk + '">' + esc(lv.recordHolderName) + "</span></span>";
            } else {
                recHtml = '<span>🏆 Unbeaten — be the first to clear!</span>';
            }

            var ownerBtns = lv.isMine
                ? '<button type="button" class="btn btn-sm btn-outline-info py-0 px-2" data-ww-lv-edit="' + esc(lv.id) + '">✎ Edit</button>' +
                  '<button type="button" class="btn btn-sm btn-outline-danger py-0 px-2" data-ww-lv-del="' + esc(lv.id) + '" title="Delete level">🗑</button>'
                : "";

            html +=
                '<div class="ww-level-row">' +
                '  <div class="ww-level-row-top">' +
                '    <div>' +
                '      <div class="ww-level-title">' + esc(lv.title) + "</div>" +
                (lv.description ? '<div class="ww-level-desc">' + esc(lv.description) + "</div>" : "") +
                '      <div class="ww-level-meta">' +
                '        <span>By ' + badgeImg + '<span class="member-pill" style="background:' + aColor + ";color:" + aInk + '">' + esc(lv.authorName) + "</span></span>" +
                '        <span>' + Number(lv.playsCount || 0).toLocaleString() + (lv.playsCount === 1 ? " play" : " plays") + " · " + Number(lv.clearsCount || 0).toLocaleString() + " clears</span>" +
                         recHtml +
                "      </div>" +
                "    </div>" +
                '    <div class="ww-level-actions">' +
                '      <button type="button" class="btn btn-sm btn-success fw-bold py-1 px-3" data-ww-lv-play="' + esc(lv.id) + '">▶ Play</button>' +
                '      <button type="button" class="btn btn-sm btn-outline-light py-0 px-2" data-ww-lv-share="' + esc(lv.id) + '" title="Copy share link">🔗 Link</button>' +
                '      <button type="button" class="btn btn-sm btn-outline-light py-0 px-2" data-ww-lv-remix="' + esc(lv.id) + '" title="Open copy in Level Editor">⎘ Remix</button>' +
                       ownerBtns +
                "    </div>" +
                "  </div>" +
                "</div>";
        }
        wwLevelsListEl.innerHTML = html;
    }

    async function wwLoadAndPlayCustomLevel(levelId, modeAction, pushHistory) {
        try {
            var detail = await window.mcwut.api("/api/games/wacky-wheels/levels/" + encodeURIComponent(levelId), {
                headers: window.mcwut.headers()
            });
            if (!detail) return;
            var parsed = JSON.parse(detail.levelJson);

            if (modeAction === "edit") {
                wwOpenEditor(parsed, detail.summary);
                return;
            }
            if (modeAction === "remix") {
                wwEditor.editingTitle = detail.summary.title + " (Remix)";
                wwEditor.editingDesc = detail.summary.description || "";
                wwOpenEditor(parsed, null);
                return;
            }

            wwState.playContext = "custom";
            wwState.customLevelMeta = detail.summary;
            wwState.customLevelData = parsed;
            if (pushHistory !== false) {
                history.pushState(null, "", "/games?game=wacky-wheels&level=" + encodeURIComponent(levelId));
            }
            wwStartGame();
        } catch (err) {
            wwShowBanner("Level not found!");
            if (window.mcwut && window.mcwut.toast) window.mcwut.toast("Level not found!", { kind: "err" });
        }
    }

    function wwCopyLevelShareLink(levelId, btnEl) {
        var url = window.location.origin + "/games?game=wacky-wheels&level=" + encodeURIComponent(levelId);
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).catch(function () {});
        }
        if (btnEl) {
            var orig = btnEl.textContent;
            btnEl.textContent = "✓ Copied!";
            setTimeout(function () { btnEl.textContent = orig; }, 1400);
        }
        wwShowBanner("Level link copied! Paste in Messages to challenge a member.");
            if (window.mcwut && window.mcwut.toast) window.mcwut.toast("Level link copied to clipboard!", { kind: "ok" });
    }

    function wwOpenPublishDialog() {
        wwSilenceAudio();
        if (wwOverOverlay) wwOverOverlay.hidden = true;
        if (wwPubError) wwPubError.hidden = true;
        if (wwPubTitleInput) wwPubTitleInput.value = wwEditor.editingTitle || "";
        if (wwPubDescInput) wwPubDescInput.value = wwEditor.editingDesc || "";
        if (wwPubHeading) {
            wwPubHeading.textContent = wwEditor.editingLevelId ? "Update Published Level" : "Publish Stunt Level";
        }
        if (wwPubSubmitBtn) {
            wwPubSubmitBtn.textContent = wwEditor.editingLevelId ? "💾 Save Changes" : "🚀 Publish Level";
        }
        if (wwPubCopyBtn) {
            wwPubCopyBtn.hidden = !wwEditor.editingLevelId;
        }
        if (wwPublishOverlay) wwPublishOverlay.hidden = false;
        if (wwPubTitleInput) setTimeout(function () { wwPubTitleInput.focus(); }, 40);
    }

    async function wwSavePublishedLevel(forceNewCopy) {
        var title = wwPubTitleInput ? wwPubTitleInput.value.trim() : "";
        var desc = wwPubDescInput ? wwPubDescInput.value.trim() : "";
        if (!title) {
            if (wwPubError) {
                wwPubError.textContent = "Please enter a level name.";
                wwPubError.hidden = false;
            }
            return;
        }
        if (wwPubError) wwPubError.hidden = true;
        if (wwPubSubmitBtn) wwPubSubmitBtn.disabled = true;

        var isUpdate = !forceNewCopy && !!wwEditor.editingLevelId;
        var url = isUpdate
            ? "/api/games/wacky-wheels/levels/" + encodeURIComponent(wwEditor.editingLevelId)
            : "/api/games/wacky-wheels/levels";

        try {
            var saved = await window.mcwut.api(url, {
                method: isUpdate ? "PUT" : "POST",
                headers: window.mcwut.headers({ "Content-Type": "application/json" }),
                body: JSON.stringify({
                    title: title,
                    description: desc,
                    levelJson: JSON.stringify(wwEditor.data)
                })
            });
            if (wwPubSubmitBtn) wwPubSubmitBtn.disabled = false;
            if (!saved) return;

            wwEditor.editingLevelId = saved.summary.id;
            wwEditor.editingTitle = saved.summary.title;
            wwEditor.editingDesc = saved.summary.description || "";
            if (wwPublishOverlay) wwPublishOverlay.hidden = true;

            wwState.playContext = "custom";
            wwState.customLevelMeta = saved.summary;
            wwState.customLevelData = JSON.parse(saved.levelJson);
            history.pushState(null, "", "/games?game=wacky-wheels&level=" + encodeURIComponent(saved.summary.id));
            wwLoadLevelsList(false);
            wwStartGame();
            wwShowBanner("Published \"" + saved.summary.title + "\"! 🎉");
        } catch (err) {
            if (wwPubSubmitBtn) wwPubSubmitBtn.disabled = false;
            if (wwPubError) {
                wwPubError.textContent = err.message || "Could not publish level.";
                wwPubError.hidden = false;
            }
        }
    }

    function wwSwitchToOfficial() {
        wwState.playContext = "official";
        wwState.customLevelMeta = null;
        wwState.customLevelData = null;
        if (wwLevelsOverlay) wwLevelsOverlay.hidden = true;
        if (wwPublishOverlay) wwPublishOverlay.hidden = true;
        if (wwOverOverlay) wwOverOverlay.hidden = true;
        history.replaceState(null, "", "/games?game=wacky-wheels");
        wwResetWorld();
        wwState.mode = "idle";
        if (wwStartBadge) wwStartBadge.textContent = "CANVAS 2D / PHYSICS";
        if (wwStartTitle) wwStartTitle.textContent = "Wacky Wheels";
        if (wwStartOverlay) wwStartOverlay.hidden = false;
        wwSyncModeUi();
        wwRender();
    }

    function wwLoop(now) {
        if (!wwState.active) {
            wwSilenceAudio();
            wwState.animFrame = null;
            return;
        }
        var dt = (now - (wwState.lastTime || now)) / 1000;
        wwState.lastTime = now;
        wwUpdate(dt);
        wwRender();
        wwState.animFrame = requestAnimationFrame(wwLoop);
    }

    function wwPause() {
        wwSilenceAudio();
        wwInput.gas = false;
        wwInput.brake = false;
        wwInput.left = false;
        wwInput.right = false;
        if (wwState.animFrame) {
            cancelAnimationFrame(wwState.animFrame);
            wwState.animFrame = null;
        }
    }

    function wwResume() {
        if (wwState.active && !wwState.animFrame) {
            wwState.lastTime = performance.now();
            wwState.animFrame = requestAnimationFrame(wwLoop);
        }
    }

    function wwBindHoldButton(btn, prop) {
        if (!btn) return;
        function press(ev) {
            ev.preventDefault();
            if (ev.pointerType === "touch" && wwStage) {
                wwStage.classList.add("is-touch-active");
            }
            if (btn.setPointerCapture && ev.pointerId !== undefined) {
                try { btn.setPointerCapture(ev.pointerId); } catch (e) {}
            }
            if (wwState.mode === "idle") {
                wwStartGame();
            }
            wwInput[prop] = true;
            btn.classList.add("is-pressed");
        }
        function release(ev) {
            if (ev) ev.preventDefault();
            wwInput[prop] = false;
            btn.classList.remove("is-pressed");
        }
        btn.addEventListener("pointerdown", press);
        btn.addEventListener("pointerup", release);
        btn.addEventListener("pointercancel", release);
        btn.addEventListener("lostpointercapture", release);
    }

    wwBindHoldButton(wwBtnLeft, "left");
    wwBindHoldButton(wwBtnRight, "right");
    wwBindHoldButton(wwBtnGas, "gas");
    wwBindHoldButton(wwBtnBrake, "brake");

    if (wwBtnEject) {
        wwBtnEject.addEventListener("pointerdown", function (ev) {
            ev.preventDefault();
            if (ev.pointerType === "touch" && wwStage) {
                wwStage.classList.add("is-touch-active");
            }
            if (wwBtnEject.setPointerCapture && ev.pointerId !== undefined) {
                try { wwBtnEject.setPointerCapture(ev.pointerId); } catch (e) {}
            }
            wwBtnEject.classList.add("is-pressed");
            if (wwState.mode === "idle" || wwState.mode === "gameover") {
                wwStartGame();
            } else {
                wwTriggerEjectOrBoost();
            }
        });
        var releaseEject = function () {
            wwBtnEject.classList.remove("is-pressed");
        };
        wwBtnEject.addEventListener("pointerup", releaseEject);
        wwBtnEject.addEventListener("pointercancel", releaseEject);
        wwBtnEject.addEventListener("lostpointercapture", releaseEject);
    }

    if (wwCheckpointBtn) {
        wwCheckpointBtn.addEventListener("click", function (ev) {
            ev.stopPropagation();
            wwRespawnAtCheckpoint();
        });
    }
    if (wwStage) {
        wwStage.addEventListener("pointerdown", function (ev) {
            if (ev.pointerType === "touch") {
                wwStage.classList.add("is-touch-active");
            }
        });
    }

    if (wwStartBtn) {
        wwStartBtn.addEventListener("click", function (ev) {
            ev.stopPropagation();
            wwStartGame();
        });
    }
    if (wwAgainBtn) {
        wwAgainBtn.addEventListener("click", function (ev) {
            ev.stopPropagation();
            wwStartGame();
        });
    }
    if (wwRestartBtn) {
        wwRestartBtn.addEventListener("click", function (ev) {
            ev.stopPropagation();
            if (wwState.mode === "editor") {
                wwStartGame();
            } else {
                wwStartGame();
            }
        });
    }

    // Mode Bar Tabs & Editor / Community Buttons
    if (wwTabOfficial) {
        wwTabOfficial.addEventListener("click", function () {
            wwSwitchToOfficial();
        });
    }
    if (wwTabLevels) {
        wwTabLevels.addEventListener("click", function () {
            wwLoadLevelsList(true);
        });
    }
    if (wwTabEditor) {
        wwTabEditor.addEventListener("click", function () {
            wwOpenEditor(null, null);
        });
    }
    if (wwOpenLevelsBtn) {
        wwOpenLevelsBtn.addEventListener("click", function (ev) {
            ev.stopPropagation();
            wwLoadLevelsList(true);
        });
    }
    if (wwOpenEditorBtn) {
        wwOpenEditorBtn.addEventListener("click", function (ev) {
            ev.stopPropagation();
            wwOpenEditor(null, null);
        });
    }
    if (wwLevelsNewBtn) {
        wwLevelsNewBtn.addEventListener("click", function () {
            wwEditor.editingLevelId = null;
            wwEditor.editingTitle = "";
            wwEditor.editingDesc = "";
            wwOpenEditor(wwDefaultEditorData(true), null);
        });
    }
    if (wwLevelsCloseBtn) {
        wwLevelsCloseBtn.addEventListener("click", function () {
            if (wwLevelsOverlay) wwLevelsOverlay.hidden = true;
            if (wwState.mode === "idle" && wwStartOverlay) wwStartOverlay.hidden = false;
            wwSyncModeUi();
        });
    }
    if (wwLevelsListEl) {
        wwLevelsListEl.addEventListener("click", async function (ev) {
            var playBtn = ev.target.closest("[data-ww-lv-play]");
            if (playBtn) {
                wwLoadAndPlayCustomLevel(playBtn.getAttribute("data-ww-lv-play"), "play", true);
                return;
            }
            var shareBtn = ev.target.closest("[data-ww-lv-share]");
            if (shareBtn) {
                wwCopyLevelShareLink(shareBtn.getAttribute("data-ww-lv-share"), shareBtn);
                return;
            }
            var remixBtn = ev.target.closest("[data-ww-lv-remix]");
            if (remixBtn) {
                wwLoadAndPlayCustomLevel(remixBtn.getAttribute("data-ww-lv-remix"), "remix", false);
                return;
            }
            var editBtn = ev.target.closest("[data-ww-lv-edit]");
            if (editBtn) {
                wwLoadAndPlayCustomLevel(editBtn.getAttribute("data-ww-lv-edit"), "edit", false);
                return;
            }
            var delBtn = ev.target.closest("[data-ww-lv-del]");
            if (delBtn) {
                var delId = delBtn.getAttribute("data-ww-lv-del");
                if (!delId) return;
                delBtn.disabled = true;
                try {
                    await window.mcwut.api("/api/games/wacky-wheels/levels/" + encodeURIComponent(delId), {
                        method: "DELETE",
                        headers: window.mcwut.headers()
                    });
                    if (wwState.customLevelMeta && wwState.customLevelMeta.id === delId) {
                        wwState.playContext = "official";
                        wwState.customLevelMeta = null;
                    }
                    wwLoadLevelsList(true);
                } catch (e) {
                    delBtn.disabled = false;
                }
            }
        });
    }

    if (wwToolPalette) {
        wwToolPalette.addEventListener("click", function (ev) {
            var btn = ev.target.closest("[data-ww-tool]");
            if (!btn) return;
            wwSetEditorTool(btn.getAttribute("data-ww-tool"));
        });
    }
    if (wwEdPanLeft) {
        wwEdPanLeft.addEventListener("click", function () {
            wwState.camX = Math.max(-80, wwState.camX - 360);
            wwEditor.savedCamX = wwState.camX;
            wwRender();
        });
    }
    if (wwEdPanRight) {
        wwEdPanRight.addEventListener("click", function () {
            wwState.camX = Math.min(12200, wwState.camX + 360);
            wwEditor.savedCamX = wwState.camX;
            wwRender();
        });
    }
    if (wwEdZoomOutBtn) {
        wwEdZoomOutBtn.addEventListener("click", function () {
            wwSetEditorZoom((wwEditor.zoom || 0.88) - 0.14);
        });
    }
    if (wwEdZoomResetBtn) {
        wwEdZoomResetBtn.addEventListener("click", function () {
            wwSetEditorZoom(0.88);
        });
    }
    if (wwEdZoomInBtn) {
        wwEdZoomInBtn.addEventListener("click", function () {
            wwSetEditorZoom((wwEditor.zoom || 0.88) + 0.14);
        });
    }
    if (wwEdSnapBtn) {
        wwEdSnapBtn.addEventListener("click", function () {
            wwEditor.snap = !wwEditor.snap;
            wwEdSnapBtn.classList.toggle("is-active", wwEditor.snap);
            wwEdSnapBtn.setAttribute("aria-pressed", wwEditor.snap ? "true" : "false");
            wwRender();
        });
    }
    if (wwPropsDelBtn) {
        wwPropsDelBtn.addEventListener("click", function () {
            wwDeleteSelected();
        });
    }
    if (wwEdUndoBtn) {
        wwEdUndoBtn.addEventListener("click", function () {
            wwEditorUndo();
        });
    }
    if (wwEdClearBtn) {
        wwEdClearBtn.addEventListener("click", function () {
            wwPushUndo();
            wwEditor.data = wwDefaultEditorData(false);
            wwEditor.selected = null;
            wwEditor.dragging = null;
            wwState.camX = 480;
            wwEditor.savedCamX = 480;
            wwRefreshEditorCourse();
            wwRenderEditorProps();
        });
    }
    if (wwEdTestBtn) {
        wwEdTestBtn.addEventListener("click", function () {
            wwEditor.savedCamX = wwState.camX;
            wwEditor.savedCamY = wwState.camY;
            wwState.playContext = "editor-test";
            wwStartGame();
        });
    }
    if (wwReturnEditBtn) {
        wwReturnEditBtn.addEventListener("click", function () {
            wwOpenEditor(null, null);
        });
    }
    if (wwOverEditBtn) {
        wwOverEditBtn.addEventListener("click", function () {
            wwOpenEditor(null, null);
        });
    }
    if (wwEdPublishBtn) {
        wwEdPublishBtn.addEventListener("click", function () {
            wwOpenPublishDialog();
        });
    }
    if (wwOverPublishBtn) {
        wwOverPublishBtn.addEventListener("click", function () {
            wwOpenPublishDialog();
        });
    }
    if (wwOverLevelsBtn) {
        wwOverLevelsBtn.addEventListener("click", function () {
            wwLoadLevelsList(true);
        });
    }
    if (wwPubSubmitBtn) {
        wwPubSubmitBtn.addEventListener("click", function () {
            wwSavePublishedLevel(false);
        });
    }
    if (wwPubCopyBtn) {
        wwPubCopyBtn.addEventListener("click", function () {
            wwSavePublishedLevel(true);
        });
    }
    if (wwPubCancelBtn) {
        wwPubCancelBtn.addEventListener("click", function () {
            if (wwPublishOverlay) wwPublishOverlay.hidden = true;
            if (wwState.mode === "gameover" && wwOverOverlay) wwOverOverlay.hidden = false;
        });
    }
    if (wwShareLevelBtn) {
        wwShareLevelBtn.addEventListener("click", function () {
            if (wwState.customLevelMeta) {
                wwCopyLevelShareLink(wwState.customLevelMeta.id, wwShareLevelBtn);
            }
        });
    }
    if (wwRemixActiveBtn) {
        wwRemixActiveBtn.addEventListener("click", function () {
            if (wwState.customLevelData && wwState.customLevelMeta) {
                wwEditor.editingTitle = wwState.customLevelMeta.title + " (Remix)";
                wwEditor.editingDesc = wwState.customLevelMeta.description || "";
                wwOpenEditor(wwState.customLevelData, null);
            }
        });
    }
    window.addEventListener("resize", function () {
        if (wwState.active) {
            wwResize();
        }
    });



    window.McWutGames.wackyWheels = {
        state: wwState,
        input: wwInput,
        editor: wwEditor,
        wwResetWorld: wwResetWorld,
        wwStartGame: wwStartGame,
        wwPause: wwPause,
        wwResume: wwResume,
        wwResize: wwResize,
        wwSilenceAudio: wwSilenceAudio,
        wwTriggerEjectOrBoost: wwTriggerEjectOrBoost,
        wwRespawnAtCheckpoint: wwRespawnAtCheckpoint,
        wwEditorUndo: wwEditorUndo,
        wwSetEditorTool: wwSetEditorTool,
        wwSetEditorZoom: wwSetEditorZoom,
        wwDeleteSelected: wwDeleteSelected,
        wwLoadLevelsList: wwLoadLevelsList,
        wwLoadAndPlayCustomLevel: wwLoadAndPlayCustomLevel,
        wwSyncModeUi: wwSyncModeUi
    };
    window.wwState = wwState;
    window.wwInput = wwInput;
    window.wwEditor = wwEditor;
    window.wwPublishOverlay = wwPublishOverlay;
    window.wwLevelsOverlay = wwLevelsOverlay;
    window.wwResetWorld = wwResetWorld;
    window.wwStartGame = wwStartGame;
    window.wwPause = wwPause;
    window.wwResume = wwResume;
    window.wwResize = wwResize;
    window.wwSilenceAudio = wwSilenceAudio;
    window.wwTriggerEjectOrBoost = wwTriggerEjectOrBoost;
    window.wwRespawnAtCheckpoint = wwRespawnAtCheckpoint;
    window.wwEditorUndo = wwEditorUndo;
    window.wwSetEditorTool = wwSetEditorTool;
    window.wwSetEditorZoom = wwSetEditorZoom;
    window.wwDeleteSelected = wwDeleteSelected;
    window.wwLoadLevelsList = wwLoadLevelsList;
    window.wwLoadAndPlayCustomLevel = wwLoadAndPlayCustomLevel;
    window.wwSyncModeUi = wwSyncModeUi;
})();
