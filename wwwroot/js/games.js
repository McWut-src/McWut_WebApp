(function () {
    "use strict";

    var GAME_KEY = "stack-3d";
    var BASE_SIZE = 5.0;
    var BOX_HEIGHT = 0.85;
    var MOVE_BOUNDS = 6.8;
    var PERFECT_TOLERANCE = 0.17;
    var GRAVITY = 30.0;

    var canvas = document.getElementById("stack-canvas");
    var viewport = document.getElementById("stack-viewport");
    var cwStage = document.getElementById("crossword-stage");
    var hubStrip = document.getElementById("game-hub-strip");
    var activeTitleEl = document.getElementById("game-active-title");
    var stageHintEl = document.getElementById("game-stage-hint");
    var hubView = document.getElementById("game-hub-view");
    var stageView = document.getElementById("game-stage-view");
    var backToHubBtn = document.getElementById("btn-back-to-hub");
    var stageBackBtn = document.getElementById("btn-stage-back");
    var hubActions = document.getElementById("games-hub-actions");
    var pageTitleEl = document.getElementById("games-page-title");
    var pageKickerEl = document.getElementById("games-page-kicker");
    var hubHallSummary = document.getElementById("hub-hall-summary");
    var hubHallPlayBtn = document.getElementById("hub-hall-play-btn");
    var hubHallList = document.getElementById("hub-hall-list");
    var hubHallKey = "stack-3d";
    if (!canvas || !viewport) {
        return;
    }

    var startOverlay = document.getElementById("stack-start-overlay");
    var overOverlay = document.getElementById("stack-over-overlay");
    var startBtn = document.getElementById("stack-start-btn");
    var againBtn = document.getElementById("stack-again-btn");
    var restartBtn = document.getElementById("game-restart-btn");
    var muteBtn = document.getElementById("game-mute-btn");
    var refreshBtn = document.getElementById("board-refresh-btn");

    var hudScore = document.getElementById("hud-score");
    var hudCombo = document.getElementById("hud-combo");
    var hudPop = document.getElementById("hud-pop");
    var hudSpeed = document.getElementById("hud-speed-pill");
    var hudTarget = document.getElementById("hud-target");
    var hudTargetLabel = document.getElementById("hud-target-label");
    var hudTargetPill = document.getElementById("hud-target-pill");

    var myBestEl = document.getElementById("game-my-best");
    var myRankEl = document.getElementById("game-my-rank");

    var overRecordBanner = document.getElementById("over-record-banner");
    var overScore = document.getElementById("over-score");
    var overCombo = document.getElementById("over-combo");
    var overBest = document.getElementById("over-best");
    var overRank = document.getElementById("over-rank");
    var overSaveStatus = document.getElementById("over-save-status");

    var boardSummary = document.getElementById("board-summary");
    var boardAlert = document.getElementById("board-alert");
    var boardList = document.getElementById("board-list");

    // --- Icons ---
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

    // --- Color Palette Helper ---
    function levelColor(level, baseHue) {
        var hue = (baseHue + level * 11) % 360;
        var sat = 82;
        var light = 56;
        return {
            hue: hue,
            css: "hsl(" + hue + ", " + sat + "%, " + light + "%)",
            topCss: "hsl(" + hue + ", " + sat + "%, 66%)",
            leftCss: "hsl(" + hue + ", " + sat + "%, 52%)",
            rightCss: "hsl(" + hue + ", " + sat + "%, 38%)"
        };
    }

    // --- Game State ---
    var state = {
        mode: "idle", // "idle" | "playing" | "gameover"
        score: 0,
        combo: 0,
        maxCombo: 0,
        baseHue: 195,
        tower: [],
        active: null,
        falling: [],
        rings: [],
        particles: [],
        cameraY: 4.0,
        targetCameraY: 4.0,
        cameraZoom: 1.0,
        targetZoom: 1.0,
        idleAngle: 0,
        shakeTimer: 0,
        lastTime: performance.now(),
        leaderboard: null
    };

    // --- Three.js Setup (with automatic 2D Isometric Fallback) ---
    var useThree = false;
    var threeScene = null;
    var threeCamera = null;
    var threeRenderer = null;
    var towerGroup = null;
    var effectsGroup = null;
    var activeMesh = null;
    var starsGroup = null;
    var fallbackCtx = null;

    function initGraphics() {
        if (window.THREE) {
            try {
                threeRenderer = new THREE.WebGLRenderer({
                    canvas: canvas,
                    antialias: true,
                    alpha: true,
                    powerPreference: "high-performance"
                });
                threeRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
                threeScene = new THREE.Scene();

                var aspect = (viewport.clientWidth || 640) / (viewport.clientHeight || 520);
                var frustum = 15;
                threeCamera = new THREE.OrthographicCamera(
                    (-frustum * aspect) / 2,
                    (frustum * aspect) / 2,
                    frustum / 2,
                    -frustum / 2,
                    -100,
                    200
                );
                threeCamera.position.set(20, 20, 20);
                threeCamera.lookAt(0, state.cameraY, 0);

                var ambient = new THREE.AmbientLight(0xffffff, 0.62);
                threeScene.add(ambient);

                var dirKey = new THREE.DirectionalLight(0xffffff, 0.78);
                dirKey.position.set(16, 32, 20);
                threeScene.add(dirKey);

                var dirRim = new THREE.DirectionalLight(0x818cf8, 0.32);
                dirRim.position.set(-18, 12, -16);
                threeScene.add(dirRim);

                towerGroup = new THREE.Group();
                effectsGroup = new THREE.Group();
                starsGroup = new THREE.Group();
                threeScene.add(starsGroup);
                threeScene.add(towerGroup);
                threeScene.add(effectsGroup);

                // Ambient floating star particles in 3D space
                var starGeo = new THREE.BoxGeometry(0.14, 0.14, 0.14);
                for (var i = 0; i < 36; i++) {
                    var starMat = new THREE.MeshBasicMaterial({
                        color: i % 2 === 0 ? 0x38bdf8 : 0xa855f7,
                        transparent: true,
                        opacity: 0.25 + (i % 5) * 0.08
                    });
                    var star = new THREE.Mesh(starGeo, starMat);
                    star.position.set(
                        (Math.random() - 0.5) * 24,
                        Math.random() * 40 - 6,
                        (Math.random() - 0.5) * 24
                    );
                    starsGroup.add(star);
                }

                useThree = true;
            } catch (err) {
                useThree = false;
            }
        }

        if (!useThree) {
            fallbackCtx = canvas.getContext("2d");
        }

        resizeViewport();
    }

    function resizeViewport() {
        var w = Math.max(viewport.clientWidth || 640, 280);
        var h = Math.max(viewport.clientHeight || 520, 320);

        if (useThree && threeRenderer && threeCamera) {
            threeRenderer.setSize(w, h, false);
            var aspect = w / h;
            var frustum = 15 / Math.max(0.25, state.cameraZoom);
            threeCamera.left = (-frustum * aspect) / 2;
            threeCamera.right = (frustum * aspect) / 2;
            threeCamera.top = frustum / 2;
            threeCamera.bottom = -frustum / 2;
            threeCamera.updateProjectionMatrix();
        } else if (fallbackCtx) {
            var dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = Math.floor(w * dpr);
            canvas.height = Math.floor(h * dpr);
        }
    }

    window.addEventListener("resize", resizeViewport);

    function clearThreeGroup(group) {
        if (!group) return;
        while (group.children.length > 0) {
            var child = group.children[0];
            group.remove(child);
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(function (m) { m.dispose(); });
                } else {
                    child.material.dispose();
                }
            }
        }
    }

    function createSlabMesh(slab) {
        if (!useThree) return null;
        var geo = new THREE.BoxGeometry(slab.w, slab.h, slab.d);
        var colorObj = new THREE.Color(slab.color.css);
        var mat = new THREE.MeshPhongMaterial({
            color: colorObj,
            specular: new THREE.Color(0x475569),
            shininess: 48,
            flatShading: true
        });
        var mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(slab.x, slab.y, slab.z);
        return mesh;
    }

    function buildPedestalMesh(baseHue) {
        if (!useThree || !towerGroup) return;
        var pedGeo = new THREE.BoxGeometry(BASE_SIZE, 10, BASE_SIZE);
        var pedColor = new THREE.Color("hsl(" + baseHue + ", 42%, 22%)");
        var pedMat = new THREE.MeshPhongMaterial({
            color: pedColor,
            specular: new THREE.Color(0x1e293b),
            shininess: 30,
            flatShading: true
        });
        var pedMesh = new THREE.Mesh(pedGeo, pedMat);
        pedMesh.position.set(0, -5 - BOX_HEIGHT / 2, 0);
        towerGroup.add(pedMesh);
    }

    // --- Initialize Demo Idle Tower ---
    function setupIdleDemo() {
        state.mode = "idle";
        state.baseHue = 195;
        state.tower = [];
        state.falling = [];
        state.rings = [];
        state.particles = [];
        state.active = null;
        state.cameraY = 4.2;
        state.targetCameraY = 4.2;
        state.cameraZoom = 1.05;
        state.targetZoom = 1.05;

        clearThreeGroup(towerGroup);
        clearThreeGroup(effectsGroup);
        activeMesh = null;

        buildPedestalMesh(state.baseHue);

        for (var i = 0; i < 10; i++) {
            var s = BASE_SIZE - i * 0.18;
            var slab = {
                x: Math.sin(i * 0.6) * 0.15,
                y: i * BOX_HEIGHT,
                z: Math.cos(i * 0.6) * 0.15,
                w: s,
                h: BOX_HEIGHT,
                d: s,
                level: i,
                color: levelColor(i, state.baseHue)
            };
            if (useThree) {
                slab.mesh = createSlabMesh(slab);
                towerGroup.add(slab.mesh);
            }
            state.tower.push(slab);
        }
    }

    // --- Start a Live Run ---
    function startGame() {
        ensureAudio();

        state.mode = "playing";
        state.score = 0;
        state.combo = 0;
        state.maxCombo = 0;
        state.baseHue = Math.floor(Math.random() * 360);
        state.tower = [];
        state.falling = [];
        state.rings = [];
        state.particles = [];
        state.cameraY = 2.5;
        state.targetCameraY = 2.5;
        state.cameraZoom = 1.0;
        state.targetZoom = 1.0;
        state.shakeTimer = 0;

        if (towerGroup) {
            towerGroup.rotation.y = 0;
        }
        clearThreeGroup(towerGroup);
        clearThreeGroup(effectsGroup);
        activeMesh = null;

        buildPedestalMesh(state.baseHue);

        // Base block (level 0)
        var firstSlab = {
            x: 0,
            y: 0,
            z: 0,
            w: BASE_SIZE,
            h: BOX_HEIGHT,
            d: BASE_SIZE,
            level: 0,
            color: levelColor(0, state.baseHue)
        };
        if (useThree) {
            firstSlab.mesh = createSlabMesh(firstSlab);
            towerGroup.add(firstSlab.mesh);
        }
        state.tower.push(firstSlab);

        if (startOverlay) startOverlay.hidden = true;
        if (overOverlay) overOverlay.hidden = true;

        updateHud();
        spawnNextActiveSlab();
    }

    function spawnNextActiveSlab() {
        var top = state.tower[state.tower.length - 1];
        var nextLevel = state.tower.length;
        var axis = nextLevel % 2 === 1 ? "x" : "z";
        var speed = 5.4 + Math.min(nextLevel * 0.15, 6.8);
        var startPos = -MOVE_BOUNDS;

        var slab = {
            x: axis === "x" ? startPos : top.x,
            y: nextLevel * BOX_HEIGHT,
            z: axis === "z" ? startPos : top.z,
            w: top.w,
            h: BOX_HEIGHT,
            d: top.d,
            level: nextLevel,
            axis: axis,
            dir: 1,
            speed: speed,
            color: levelColor(nextLevel, state.baseHue)
        };

        if (useThree) {
            if (activeMesh) {
                towerGroup.remove(activeMesh);
                if (activeMesh.geometry) activeMesh.geometry.dispose();
                if (activeMesh.material) activeMesh.material.dispose();
            }
            activeMesh = createSlabMesh(slab);
            towerGroup.add(activeMesh);
        }

        state.active = slab;
        state.targetCameraY = Math.max(2.5, (nextLevel - 2) * BOX_HEIGHT + 2.2);
        updateViewportBackground(slab.color.hue);
        updateHud();
    }

    function updateViewportBackground(hue) {
        var h1 = (hue + 220) % 360;
        var h2 = (hue + 260) % 360;
        viewport.style.background =
            "radial-gradient(circle at 50% 28%, hsl(" + hue + ", 55%, 20%) 0%, hsl(" + h1 + ", 48%, 11%) 58%, hsl(" + h2 + ", 52%, 7%) 100%)";
    }

    function showPopText(text, isGold) {
        if (!hudPop) return;
        hudPop.textContent = text;
        hudPop.className = "game-hud-pop" + (isGold ? " is-gold" : "");
        hudPop.hidden = false;
        // Re-trigger animation
        hudPop.style.animation = "none";
        void hudPop.offsetWidth;
        hudPop.style.animation = "";
        clearTimeout(hudPop._hideTimer);
        hudPop._hideTimer = setTimeout(function () {
            hudPop.hidden = true;
        }, 950);
    }

    function spawnShockwave(slab, isBigCombo) {
        var ring = {
            x: slab.x,
            y: slab.y + BOX_HEIGHT * 0.52,
            z: slab.z,
            w: slab.w,
            d: slab.d,
            scale: 1.0,
            alpha: 0.95,
            color: isBigCombo ? "#facc15" : "#ffffff",
            mesh: null
        };

        if (useThree && effectsGroup) {
            var geo = new THREE.BoxGeometry(slab.w + 0.15, 0.08, slab.d + 0.15);
            var mat = new THREE.MeshBasicMaterial({
                color: isBigCombo ? 0xfacc15 : 0xffffff,
                transparent: true,
                opacity: 0.9
            });
            var mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(ring.x, ring.y, ring.z);
            effectsGroup.add(mesh);
            ring.mesh = mesh;
        }

        state.rings.push(ring);

        // Burst particles on combo
        var count = isBigCombo ? 14 : 6;
        for (var i = 0; i < count; i++) {
            var angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
            var spd = 2.5 + Math.random() * 3.5;
            var p = {
                x: slab.x + Math.cos(angle) * (slab.w * 0.5),
                y: slab.y + BOX_HEIGHT * 0.5,
                z: slab.z + Math.sin(angle) * (slab.d * 0.5),
                vx: Math.cos(angle) * spd,
                vy: 3.5 + Math.random() * 3.0,
                vz: Math.sin(angle) * spd,
                alpha: 1.0,
                color: isBigCombo ? "#facc15" : slab.color.topCss,
                mesh: null
            };
            if (useThree && effectsGroup) {
                var pGeo = new THREE.BoxGeometry(0.22, 0.22, 0.22);
                var pMat = new THREE.MeshBasicMaterial({
                    color: isBigCombo ? 0xfacc15 : new THREE.Color(slab.color.topCss),
                    transparent: true,
                    opacity: 1.0
                });
                var pMesh = new THREE.Mesh(pGeo, pMat);
                pMesh.position.set(p.x, p.y, p.z);
                effectsGroup.add(pMesh);
                p.mesh = pMesh;
            }
            state.particles.push(p);
        }
    }

    function addFallingPiece(x, y, z, w, h, d, color, axis, sign) {
        var piece = {
            x: x,
            y: y,
            z: z,
            w: w,
            h: h,
            d: d,
            vx: axis === "x" ? sign * 1.4 : 0,
            vy: -0.5,
            vz: axis === "z" ? sign * 1.4 : 0,
            rx: 0,
            rz: 0,
            vrx: axis === "z" ? sign * 3.2 : 0,
            vrz: axis === "x" ? -sign * 3.2 : 0,
            color: color,
            mesh: null
        };

        if (useThree && effectsGroup) {
            var mesh = createSlabMesh(piece);
            effectsGroup.root = effectsGroup.add(mesh);
            piece.mesh = mesh;
        }

        state.falling.push(piece);
    }

    // --- Drop & Slice Action ---
    function placeActiveSlab() {
        if (state.mode !== "playing" || !state.active) {
            return;
        }

        var act = state.active;
        var prev = state.tower[state.tower.length - 1];
        var axis = act.axis;
        var sizeProp = axis === "x" ? "w" : "d";

        var delta = act[axis] - prev[axis];
        var absDelta = Math.abs(delta);
        var currentSpan = act[sizeProp];
        var overlap = currentSpan - absDelta;

        // Remove activeMesh from temporary slot; we will re-create the trimmed placed slab
        if (useThree && activeMesh) {
            towerGroup.remove(activeMesh);
            if (activeMesh.geometry) activeMesh.geometry.dispose();
            if (activeMesh.material) activeMesh.material.dispose();
            activeMesh = null;
        }
        state.active = null;

        // 1. Complete Miss -> Game Over!
        if (overlap <= 0.05) {
            var missSign = delta >= 0 ? 1 : -1;
            addFallingPiece(act.x, act.y, act.z, act.w, act.h, act.d, act.color, axis, missSign);
            state.combo = 0;
            state.shakeTimer = 0.32;
            playGameOverSound();
            triggerGameOver();
            return;
        }

        var placed = {
            x: act.x,
            y: act.y,
            z: act.z,
            w: act.w,
            h: act.h,
            d: act.d,
            level: act.level,
            color: act.color,
            mesh: null
        };

        // 2. Perfect Alignment!
        if (absDelta <= PERFECT_TOLERANCE) {
            placed[axis] = prev[axis];
            state.combo += 1;
            if (state.combo > state.maxCombo) {
                state.maxCombo = state.combo;
            }
            state.score += 1;

            // Expand bonus on 3+ consecutive Perfect Drops
            var expanded = false;
            if (state.combo >= 3 && (placed.w < BASE_SIZE || placed.d < BASE_SIZE)) {
                placed.w = Math.min(BASE_SIZE, placed.w + 0.35);
                placed.d = Math.min(BASE_SIZE, placed.d + 0.35);
                expanded = true;
            }

            if (useThree) {
                placed.mesh = createSlabMesh(placed);
                towerGroup.add(placed.mesh);
            }
            state.tower.push(placed);

            playPerfectSound(state.combo);
            spawnShockwave(placed, state.combo >= 3);
            if (expanded) {
                showPopText("⚡ EXPANDED! ×" + state.combo, true);
            } else if (state.combo > 1) {
                showPopText("PERFECT ×" + state.combo + "!", state.combo >= 3);
            } else {
                showPopText("PERFECT!", false);
            }
        } else {
            // 3. Sliced Overhang
            state.combo = 0;
            state.score += 1;

            placed[sizeProp] = overlap;
            placed[axis] = prev[axis] + delta * 0.5;

            if (useThree) {
                placed.mesh = createSlabMesh(placed);
                towerGroup.add(placed.mesh);
            }
            state.tower.push(placed);

            // Spawn falling overhang piece
            var cutSpan = absDelta;
            var sign = delta >= 0 ? 1 : -1;
            var overhangCoord = placed[axis] + sign * (overlap * 0.5 + cutSpan * 0.5);
            var fallX = axis === "x" ? overhangCoord : placed.x;
            var fallZ = axis === "z" ? overhangCoord : placed.z;
            var fallW = axis === "x" ? cutSpan : placed.w;
            var fallD = axis === "z" ? cutSpan : placed.d;

            addFallingPiece(fallX, placed.y, fallZ, fallW, placed.h, fallD, placed.color, axis, sign);
            playSliceSound(overlap / BASE_SIZE);
        }

        spawnNextActiveSlab();
    }

    function updateHud() {
        if (hudScore) {
            hudScore.textContent = String(state.score);
        }
        if (hudCombo) {
            if (state.combo >= 1) {
                hudCombo.hidden = false;
                hudCombo.textContent = (state.combo >= 3 ? "🔥 " : "⚡ ") + "PERFECT ×" + state.combo;
                hudCombo.className = "game-hud-combo" + (state.combo >= 3 ? " is-hot" : "");
            } else {
                hudCombo.hidden = true;
            }
        }
        if (hudSpeed && state.active) {
            var mult = (state.active.speed / 5.4).toFixed(1);
            hudSpeed.textContent = mult + "× Speed";
        }
        updateTargetHud();
    }

    function updateTargetHud() {
        if (!hudTarget || !hudTargetPill || !hudTargetLabel) return;
        var board = state.leaderboard;
        if (!board || !board.entries || board.entries.length === 0) {
            hudTarget.hidden = true;
            return;
        }

        // Find the next player ahead of current score, or #1 leader
        var target = board.entries[0];
        var label = "#1 Leader";
        for (var i = board.entries.length - 1; i >= 0; i--) {
            if (board.entries[i].bestScore > state.score) {
                target = board.entries[i];
                label = target.rank === 1 ? "#1 Leader" : "Beat #" + target.rank;
                break;
            }
        }

        hudTarget.hidden = false;
        hudTargetLabel.textContent = label;
        var color = window.mcwut ? window.mcwut.safeColor(target.accentColor) : "#0b1f3a";
        var ink = window.mcwut ? window.mcwut.pillInk(color) : "#ffffff";
        var esc = window.mcwut ? window.mcwut.esc : function (s) { return String(s); };
        hudTargetPill.innerHTML =
            '<span class="member-pill" style="background:' + color + ";color:" + ink + '">' +
            esc(target.displayName) +
            "</span> <strong>" +
            target.bestScore +
            "</strong>";
    }

    // --- Game Over & Leaderboard Submission ---
    function triggerGameOver() {
        state.mode = "gameover";
        updateHud();

        // Zoom out camera to showcase the full tower
        var heightLevels = Math.max(state.tower.length, 6);
        state.targetCameraY = (heightLevels * BOX_HEIGHT) * 0.45;
        state.targetZoom = Math.max(0.38, Math.min(1.0, 13.5 / (heightLevels * BOX_HEIGHT + 5)));

        if (overScore) overScore.textContent = String(state.score);
        if (overCombo) overCombo.textContent = "×" + state.maxCombo;

        var prevBest = state.leaderboard && state.leaderboard.myRecord ? state.leaderboard.myRecord.bestScore : 0;
        var optimisticBest = Math.max(prevBest, state.score);
        if (overBest) overBest.textContent = String(optimisticBest);
        if (overRank) {
            var curRank = state.leaderboard && state.leaderboard.myRecord ? "#" + state.leaderboard.myRecord.rank : "—";
            overRank.textContent = curRank;
        }
        if (overRecordBanner) {
            overRecordBanner.hidden = !(state.score > prevBest && state.score > 0);
        }
        if (overSaveStatus) {
            overSaveStatus.textContent = state.score > 0 ? "Saving score to global leaderboard…" : "Play again to post a score!";
        }
        if (overOverlay) {
            overOverlay.hidden = false;
        }

        submitScore(state.score, state.maxCombo);
    }

    async function submitScore(score, maxCombo) {
        try {
            var res = await window.mcwut.api("/api/games/" + encodeURIComponent(GAME_KEY) + "/scores", {
                method: "POST",
                headers: window.mcwut.headers({ "Content-Type": "application/json" }),
                body: JSON.stringify({ score: score, maxCombo: maxCombo })
            });

            if (!res) return;
            state.leaderboard = res.leaderboard;
            renderLeaderboard(res.leaderboard);

            if (overBest) overBest.textContent = String(res.bestScore);
            if (overRank) overRank.textContent = res.rank ? "#" + res.rank : "—";
            if (overRecordBanner) {
                overRecordBanner.hidden = !res.isNewBest;
            }
            if (res.isNewBest) {
                playNewRecordFanfare();
                if (window.mcwut && window.mcwut.toast) {
                    window.mcwut.toast("New personal record: " + res.bestScore.toLocaleString() + " pts! 🏆", { kind: "ok" });
                }
            }
            var bestValEl = document.querySelector('[data-best-for="' + GAME_KEY + '"] .best-val');
            if (bestValEl && res.bestScore > 0) {
                bestValEl.textContent = res.bestScore.toLocaleString();
            }
            if (overSaveStatus) {
                overSaveStatus.textContent = res.isNewBest
                    ? "New personal record saved to the global leaderboard!"
                    : "Score recorded on the global leaderboard.";
            }
            return res;
        } catch (err) {
            if (overSaveStatus) {
                overSaveStatus.textContent = "Could not save score: " + (err.message || "Network error");
            }
        }
    }

    // --- Leaderboard Fetching & Rendering ---
    async function loadLeaderboard() {
        if (boardAlert) boardAlert.hidden = true;
        try {
            var board = await window.mcwut.api("/api/games/" + encodeURIComponent(GAME_KEY) + "/leaderboard", {
                headers: window.mcwut.headers()
            });
            state.leaderboard = board;
            if (GAME_KEY === "minesweeper") {
                msState.leaderboard = board;
            } else if (GAME_KEY === "neon-slope") {
                slopeState.leaderboard = board;
            } else if (GAME_KEY === "merge-2048") {
                n2048State.leaderboard = board;
            } else if (GAME_KEY === "brick-breaker") {
                cbState.leaderboard = board;
            } else if (GAME_KEY === "hextris") {
                hxState.leaderboard = board;
            } else if (GAME_KEY === "wacky-wheels") {
                wwState.leaderboard = board;
            }
            renderLeaderboard(board);
            updateTargetHud();
        } catch (err) {
            if (boardAlert) {
                boardAlert.textContent = err.message || "Could not load leaderboard.";
                boardAlert.hidden = false;
            }
        }
    }

    function formatShortDate(iso) {
        if (!iso) return "";
        try {
            var d = new Date(iso);
            var now = new Date();
            if (d.toDateString() === now.toDateString()) {
                return "Today";
            }
            return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
        } catch (e) {
            return "";
        }
    }

    var GAME_DEFS = {
        "stack-3d": { name: "Stack 3D", comboLabel: "streak", available: true },
        "mini-crossword": { name: "Mini Crossword", comboLabel: "clean words", available: true },
        "minesweeper": { name: "Minesweeper", comboLabel: "cascade", available: true },
        "neon-slope": { name: "Neon Slope", comboLabel: "streak", available: true },
        "merge-2048": { name: "2048 Neon", comboLabel: "tile", available: true },
        "wacky-wheels": { name: "Wacky Wheels", comboLabel: "flips", available: true },
        "brick-breaker": { name: "Cyber Breakout", comboLabel: "combo", available: true },
        "hextris": { name: "Hextris Neon", comboLabel: "cascade", available: true }
    };

    function getGameDisplayName(key) {
        return (GAME_DEFS[key] && GAME_DEFS[key].name) || "Stack 3D";
    }

    function buildLeaderboardHtml(board, gameKey) {
        if (!board) return "";
        var entries = board.entries || [];
        if (entries.length === 0) {
            var emptyGameTitle = getGameDisplayName(gameKey);
            return (
                '<div class="game-board-empty">' +
                '<p class="mb-1 fw-semibold">No scores yet!</p>' +
                '<p class="small text-muted mb-0">Play a round of ' + emptyGameTitle + ' to claim the #1 global spot.</p>' +
                '</div>'
            );
        }

        var esc = window.mcwut.esc;
        var html = "";
        for (var i = 0; i < entries.length; i++) {
            var e = entries[i];
            var rankCls = e.rank === 1 ? "is-gold" : e.rank === 2 ? "is-silver" : e.rank === 3 ? "is-bronze" : "";
            var rowCls = "game-board-row" + (e.isMe ? " is-me" : "");
            var color = window.mcwut.safeColor(e.accentColor);
            var ink = window.mcwut.pillInk(color);

            var badgeHtml = e.badgeUrl
                ? '<img class="game-board-badge" src="' + esc(e.badgeUrl) + '" alt="" aria-hidden="true" />'
                : "";

            var statusHtml = e.statusTag
                ? '<span class="game-board-tag">' + esc(e.statusTag) + '</span>'
                : "";

            var youHtml = e.isMe
                ? '<span class="game-board-you">You</span>'
                : "";

            var def = GAME_DEFS[gameKey] || {};
            var comboLabel = def.comboLabel || "streak";
            var comboHtml = e.bestCombo > 0
                ? '<span class="game-board-combo" title="Best streak">×' + e.bestCombo + " " + comboLabel + "</span>"
                : "";

            var metaParts = [];
            if (e.gamesPlayed > 0) {
                metaParts.push(e.gamesPlayed + (e.gamesPlayed === 1 ? " run" : " runs"));
            }
            var dateStr = formatShortDate(e.achievedAt);
            if (dateStr) {
                metaParts.push(dateStr);
            }

            html +=
                '<div class="' + rowCls + '">' +
                '  <div class="game-rank-badge ' + rankCls + '" aria-label="Rank ' + e.rank + '">#' + e.rank + "</div>" +
                '  <div class="game-board-player">' +
                '    <div class="game-board-identity">' +
                       badgeHtml +
                '      <span class="member-pill" style="background:' + color + ";color:" + ink + '">' + esc(e.displayName) + "</span>" +
                       youHtml +
                       statusHtml +
                "    </div>" +
                '    <div class="game-board-meta">' +
                       comboHtml +
                '      <span>' + esc(metaParts.join(" · ")) + "</span>" +
                "    </div>" +
                "  </div>" +
                '  <div class="game-board-score">' +
                '    <strong>' + e.bestScore + "</strong>" +
                '    <span>pts</span>' +
                "  </div>" +
                "</div>";
        }
        return html;
    }

    function renderLeaderboard(board) {
        if (!board) return;

        var myRec = board.myRecord;
        if (myBestEl) {
            myBestEl.innerHTML = "Best: <strong>" + (myRec ? myRec.bestScore : 0) + "</strong>";
        }
        if (myRankEl) {
            myRankEl.innerHTML = "Rank: <strong>" + (myRec ? "#" + myRec.rank : "—") + "</strong>";
        }

        if (boardSummary) {
            var pCount = board.totalPlayers || 0;
            var gCount = board.totalGamesPlayed || 0;
            boardSummary.textContent =
                pCount + (pCount === 1 ? " player" : " players") + " · " +
                gCount + (gCount === 1 ? " run" : " runs");
        }

        if (boardList) {
            boardList.innerHTML = buildLeaderboardHtml(board, GAME_KEY);
        }
    }

    async function loadHubLeaderboard(gameKey) {
        if (!hubHallList) return;
        hubHallKey = gameKey || "stack-3d";
        var name = getGameDisplayName(hubHallKey);
        if (hubHallPlayBtn) {
            hubHallPlayBtn.setAttribute("data-launch-game", hubHallKey);
            var span = hubHallPlayBtn.querySelector("span");
            if (span) {
                span.textContent = "Play";
            }
            hubHallPlayBtn.title = "Play " + name;
            hubHallPlayBtn.setAttribute("aria-label", "Play " + name);
        }
        if (hubHallSummary) {
            hubHallSummary.textContent = "Loading " + name + " high scores…";
        }
        var chips = document.querySelectorAll("[data-hall-game]");
        for (var c = 0; c < chips.length; c++) {
            var isSel = chips[c].getAttribute("data-hall-game") === hubHallKey;
            chips[c].classList.toggle("is-active", isSel);
            chips[c].setAttribute("aria-selected", isSel ? "true" : "false");
        }
        try {
            var board = await window.mcwut.api("/api/games/" + encodeURIComponent(hubHallKey) + "/leaderboard", {
                headers: window.mcwut.headers()
            });
            if (hubHallSummary) {
                var pCount = board.totalPlayers || 0;
                var gCount = board.totalGamesPlayed || 0;
                hubHallSummary.textContent =
                    name + " · " + pCount + (pCount === 1 ? " player" : " players") + " · " +
                    gCount + (gCount === 1 ? " run" : " runs");
            }
            hubHallList.innerHTML = buildLeaderboardHtml(board, hubHallKey);
        } catch (err) {
            if (hubHallList) {
                hubHallList.innerHTML = '<p class="text-danger small mb-0 py-2">Could not load leaderboard for ' + window.mcwut.esc(name) + '.</p>';
            }
            if (window.mcwut && window.mcwut.toast) {
                window.mcwut.toast("Could not load leaderboard for " + name, { kind: "err" });
            }
        }
    }

    async function loadMyBestScores() {
        try {
            var bests = await window.mcwut.api("/api/games/me/bests", {
                headers: window.mcwut.headers()
            });
            if (bests) {
                var bestEls = document.querySelectorAll("[data-best-for]");
                for (var i = 0; i < bestEls.length; i++) {
                    var el = bestEls[i];
                    var gk = el.getAttribute("data-best-for");
                    var valEl = el.querySelector(".best-val") || el;
                    if (gk && typeof bests[gk] === "number" && bests[gk] > 0) {
                        valEl.textContent = bests[gk].toLocaleString();
                    } else {
                        valEl.textContent = "—";
                    }
                }
            }
        } catch (e) {
            // Silently ignore if personal bests cannot be loaded
        }
    }

    // --- Main Animation Loop (60 FPS) ---
    function updatePhysics(dt) {
        if (GAME_KEY !== "stack-3d") return;
        // Smooth camera vertical tracking & zoom
        var oldZoom = state.cameraZoom;
        state.cameraY += (state.targetCameraY - state.cameraY) * Math.min(1, dt * 6.5);
        state.cameraZoom += (state.targetZoom - state.cameraZoom) * Math.min(1, dt * 4.5);

        if (Math.abs(state.cameraZoom - oldZoom) > 0.0005 && useThree) {
            resizeViewport();
        }

        if (state.shakeTimer > 0) {
            state.shakeTimer = Math.max(0, state.shakeTimer - dt);
        }

        if (state.mode === "idle") {
            state.idleAngle += dt * 0.45;
            if (useThree && towerGroup) {
                towerGroup.rotation.y = state.idleAngle;
            }
        } else if (state.mode === "playing" && state.active) {
            var act = state.active;
            var axis = act.axis;
            act[axis] += act.dir * act.speed * dt;
            if (act[axis] >= MOVE_BOUNDS) {
                act[axis] = MOVE_BOUNDS;
                act.dir = -1;
            } else if (act[axis] <= -MOVE_BOUNDS) {
                act[axis] = -MOVE_BOUNDS;
                act.dir = 1;
            }

            if (useThree && activeMesh) {
                activeMesh.position.set(act.x, act.y, act.z);
            }
        } else if (state.mode === "gameover") {
            state.idleAngle += dt * 0.25;
            if (useThree && towerGroup) {
                towerGroup.rotation.y = Math.sin(state.idleAngle) * 0.35;
            }
        }

        // Update falling overhang pieces
        for (var i = state.falling.length - 1; i >= 0; i--) {
            var f = state.falling[i];
            f.vy -= GRAVITY * dt;
            f.x += f.vx * dt;
            f.y += f.vy * dt;
            f.z += f.vz * dt;
            f.rx += f.vrx * dt;
            f.rz += f.vrz * dt;

            if (useThree && f.mesh) {
                f.mesh.position.set(f.x, f.y, f.z);
                f.mesh.rotation.set(f.rx, 0, f.rz);
            }

            if (f.y < state.cameraY - 24) {
                if (useThree && f.mesh && effectsGroup) {
                    effectsGroup.remove(f.mesh);
                    if (f.mesh.geometry) f.mesh.geometry.dispose();
                    if (f.mesh.material) f.mesh.material.dispose();
                }
                state.falling.splice(i, 1);
            }
        }

        // Update combo shockwave rings
        for (var r = state.rings.length - 1; r >= 0; r--) {
            var ring = state.rings[r];
            ring.scale += dt * 1.45;
            ring.alpha -= dt * 1.85;
            if (ring.alpha <= 0) {
                if (useThree && ring.mesh && effectsGroup) {
                    effectsGroup.remove(ring.mesh);
                    if (ring.mesh.geometry) ring.mesh.geometry.dispose();
                    if (ring.mesh.material) ring.mesh.material.dispose();
                }
                state.rings.splice(r, 1);
            } else if (useThree && ring.mesh) {
                ring.mesh.scale.set(ring.scale, 1, ring.scale);
                ring.mesh.material.opacity = ring.alpha;
            }
        }

        // Update burst particles
        for (var pIdx = state.particles.length - 1; pIdx >= 0; pIdx--) {
            var p = state.particles[pIdx];
            p.vy -= GRAVITY * 0.65 * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.z += p.vz * dt;
            p.alpha -= dt * 1.6;
            if (p.alpha <= 0) {
                if (useThree && p.mesh && effectsGroup) {
                    effectsGroup.remove(p.mesh);
                    if (p.mesh.geometry) p.mesh.geometry.dispose();
                    if (p.mesh.material) p.mesh.material.dispose();
                }
                state.particles.splice(pIdx, 1);
            } else if (useThree && p.mesh) {
                p.mesh.position.set(p.x, p.y, p.z);
                p.mesh.rotation.x += dt * 4;
                p.mesh.rotation.y += dt * 4;
                p.mesh.material.opacity = p.alpha;
            }
        }
    }

    // --- 2D Isometric Canvas Fallback Renderer (when WebGL is disabled in headless environments) ---
    function renderFallbackIsometric() {
        if (!fallbackCtx) return;
        var ctx = fallbackCtx;
        var w = canvas.width;
        var h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        var scale = Math.min(w, h) * 0.048 * state.cameraZoom;
        var originX = w * 0.5;
        var originY = h * 0.62 + state.cameraY * scale * 0.85;

        if (state.shakeTimer > 0) {
            originX += (Math.random() - 0.5) * 10;
            originY += (Math.random() - 0.5) * 10;
        }

        function isoProject(x, y, z) {
            var cosA = 0.8660254;
            var sinA = 0.5;
            var sx = originX + (x - z) * cosA * scale;
            var sy = originY - y * scale + (x + z) * sinA * scale * 0.58;
            return { x: sx, y: sy };
        }

        function drawIsoBox(box) {
            var hw = box.w * 0.5;
            var hh = box.h * 0.5;
            var hd = box.d * 0.5;
            var x = box.x;
            var y = box.y;
            var z = box.z;

            var p001 = isoProject(x - hw, y + hh, z + hd);
            var p101 = isoProject(x + hw, y + hh, z + hd);
            var p100 = isoProject(x + hw, y + hh, z - hd);
            var p000 = isoProject(x - hw, y + hh, z - hd);

            var p011 = isoProject(x - hw, y - hh, z + hd);
            var p111 = isoProject(x + hw, y - hh, z + hd);
            var p110 = isoProject(x + hw, y - hh, z - hd);

            // Top face
            ctx.beginPath();
            ctx.moveTo(p000.x, p000.y);
            ctx.lineTo(p100.x, p100.y);
            ctx.lineTo(p101.x, p101.y);
            ctx.lineTo(p001.x, p001.y);
            ctx.closePath();
            ctx.fillStyle = box.color.topCss;
            ctx.fill();

            // Left front face (+Z)
            ctx.beginPath();
            ctx.moveTo(p001.x, p001.y);
            ctx.lineTo(p101.x, p101.y);
            ctx.lineTo(p111.x, p111.y);
            ctx.lineTo(p011.x, p011.y);
            ctx.closePath();
            ctx.fillStyle = box.color.leftCss;
            ctx.fill();

            // Right front face (+X)
            ctx.beginPath();
            ctx.moveTo(p101.x, p101.y);
            ctx.lineTo(p100.x, p100.y);
            ctx.lineTo(p110.x, p110.y);
            ctx.lineTo(p111.x, p111.y);
            ctx.closePath();
            ctx.fillStyle = box.color.rightCss;
            ctx.fill();
        }

        // Draw base pedestal
        drawIsoBox({
            x: 0,
            y: -5 - BOX_HEIGHT * 0.5,
            z: 0,
            w: BASE_SIZE,
            h: 10,
            d: BASE_SIZE,
            color: {
                topCss: "hsl(" + state.baseHue + ", 42%, 28%)",
                leftCss: "hsl(" + state.baseHue + ", 42%, 20%)",
                rightCss: "hsl(" + state.baseHue + ", 42%, 14%)"
            }
        });

        for (var i = 0; i < state.tower.length; i++) {
            drawIsoBox(state.tower[i]);
        }

        for (var f = 0; f < state.falling.length; f++) {
            drawIsoBox(state.falling[f]);
        }

        if (state.active) {
            drawIsoBox(state.active);
        }
    }

    function renderScene() {
        if (GAME_KEY !== "stack-3d") return;
        if (useThree && threeRenderer && threeScene && threeCamera) {
            var shakeX = state.shakeTimer > 0 ? (Math.random() - 0.5) * 0.45 : 0;
            var shakeZ = state.shakeTimer > 0 ? (Math.random() - 0.5) * 0.45 : 0;
            threeCamera.position.set(20 + shakeX, 20 + state.cameraY, 20 + shakeZ);
            threeCamera.lookAt(0, state.cameraY, 0);

            if (starsGroup) {
                starsGroup.position.y = state.cameraY * 0.65;
                starsGroup.rotation.y += 0.0008;
            }

            threeRenderer.render(threeScene, threeCamera);
        } else {
            renderFallbackIsometric();
        }
    }

    function loop(now) {
        var dt = Math.min((now - state.lastTime) / 1000, 0.1);
        state.lastTime = now;

        if (!viewport.hidden && (!stageView || !stageView.hidden) && GAME_KEY === "stack-3d") {
            updatePhysics(dt);
            renderScene();
        }
        requestAnimationFrame(loop);
    }

    // =========================================================================
    // MINI CROSSWORD (5×5 PACK)
    // =========================================================================
    var CW_PUZZLES = [
        {
            id: "woodland-cabin",
            title: "1. Woodland Cabin",
            rows: ["#CARE", "EATEN", "ABOUT", "RINSE", "SNEER"],
            across: [
                "Tender loving attention",
                "All gone from the dinner plate",
                "Roughly or concerning",
                "Wash away the soap suds",
                "Villain's curling lip"
            ],
            down: [
                "Listening organs or corn cobs",
                "Cozy log getaway in the woods",
                "Make amends for a slip-up",
                "Give an empty jar a second life",
                "Key that submits a form"
            ]
        },
        {
            id: "cozy-kitchen",
            title: "2. Cozy Kitchen",
            rows: ["FLAME", "EATER", "ABODE", "SONIC", "TREAT"],
            across: [
                "Candlelight or gas stove flicker",
                "Enthusiastic brunch guest",
                "Humble home sweet home",
                "Faster than the speed of sound",
                "Sweet bakery reward"
            ],
            down: [
                "Holiday banquet table spread",
                "Hard work or effort",
                "Make things right again",
                "News, podcasts, and cinema",
                "Stand upright, like a tent"
            ]
        },
        {
            id: "sunday-brunch",
            title: "3. Sunday Brunch",
            rows: ["TOAST", "RULER", "ATONE", "MENDS", "PRESS"],
            across: [
                "Crisp sourdough slice or clinked glasses",
                "Straightedge in a desk drawer",
                "Apologize and make amends",
                "Patches up a torn sweater",
                "French ___ coffee maker"
            ],
            down: [
                "Hike heavy-footed through snow",
                "Kind of space beyond Earth's sky",
                "Solo, without a crowd",
                "Drops a postcard in the mail",
                "Long braided lock of hair"
            ]
        },
        {
            id: "winter-scarf",
            title: "4. Winter Scarf",
            rows: ["SPARE", "COLON", "ALOUD", "RANGE", "FREED"],
            across: [
                "Extra tire in the trunk or bowling pickup",
                "Punctuation mark in 12:30 (:)",
                "How a bedtime story is read",
                "Kitchen stove or mountain chain",
                "Let out of the cage"
            ],
            down: [
                "Cozy knit wrap for chilly walks",
                "Like Arctic bears and fleeces",
                "All by oneself",
                "Rosy cheek makeup tint",
                "Wrapped up as the credits rolled"
            ]
        },
        {
            id: "bright-palette",
            title: "5. Bright Palette",
            rows: ["SMART", "COLOR", "ALIVE", "LAKES", "PRESS"],
            across: [
                "Clever and quick-witted",
                "Watercolor hue on a palette",
                "Thriving and full of energy",
                "Calm inland waters for kayaking",
                "Iron flat or push a button"
            ],
            down: [
                "Top of the head under your hair",
                "Back tooth for chewing crunchy apples",
                "Matching like two peas in a pod",
                "Wanders freely across the map",
                "Flowing curl or lock of hair"
            ]
        },
        {
            id: "fresh-start",
            title: "6. Fresh Start",
            rows: ["START", "THREE", "ROOFS", "ASSET", "PEER#"],
            across: [
                "Begin a brand-new chapter",
                "Trio count or a crowd's company",
                "Shingled house tops",
                "Valuable strength or nest-egg item",
                "Look closely or an equal colleague"
            ],
            down: [
                "Purse handle or watchband",
                "The ones over there",
                "Got up with the morning sun",
                "Direct someone to a good book",
                "Pop quiz or recipe trial run"
            ]
        },
        {
            id: "sweet-share",
            title: "7. Sweet Share",
            rows: ["SHARE", "EATEN", "ABOUT", "RINSE", "STEER"],
            across: [
                "Split the last slice of cake",
                "Polished off at dinner",
                "Approximately or regarding",
                "Quick splash under the faucet",
                "Guide the car's wheel"
            ],
            down: [
                "Browns a steak in a hot skillet",
                "Daily morning routine",
                "Make up for a mistake",
                "Bring your own tote bag again",
                "Step inside or press Return"
            ]
        },
        {
            id: "evening-dress",
            title: "8. Evening Dress",
            rows: ["BOAST", "ERROR", "ADORE", "RESTS", "DRESS"],
            across: [
                "Brag about a high score",
                "Typo that needs an eraser",
                "Love to pieces",
                "Takes a quiet afternoon nap",
                "Party gown or salad topping"
            ],
            down: [
                "Santa's snowy chin whiskers",
                "Request at a café counter",
                "Came up in conversation",
                "Organizes laundry by color",
                "Silky strand of hair"
            ]
        }
    ];

    var cwSelectEl = document.getElementById("cw-puzzle-select");
    var cwSolvedPill = document.getElementById("cw-solved-pill");
    var cwTimerEl = document.getElementById("cw-timer");
    var cwLiveScoreEl = document.getElementById("cw-live-score");
    var cwPencilBtn = document.getElementById("cw-pencil-btn");
    var cwCheckBtn = document.getElementById("cw-check-btn");
    var cwHintBtn = document.getElementById("cw-hint-btn");
    var cwGridEl = document.getElementById("cw-grid");
    var cwPrevClueBtn = document.getElementById("cw-prev-clue");
    var cwNextClueBtn = document.getElementById("cw-next-clue");
    var cwActiveClueBtn = document.getElementById("cw-active-clue");
    var cwActiveClueTag = document.getElementById("cw-active-clue-tag");
    var cwActiveClueText = document.getElementById("cw-active-clue-text");
    var cwKeyboardEl = document.getElementById("cw-keyboard");
    var cwAcrossListEl = document.getElementById("cw-clues-across");
    var cwDownListEl = document.getElementById("cw-clues-down");
    var cwWinOverlay = document.getElementById("cw-win-overlay");
    var cwRecordBanner = document.getElementById("cw-record-banner");
    var cwWinTitle = document.getElementById("cw-win-title");
    var cwWinScore = document.getElementById("cw-win-score");
    var cwWinTime = document.getElementById("cw-win-time");
    var cwWinBest = document.getElementById("cw-win-best");
    var cwWinRank = document.getElementById("cw-win-rank");
    var cwSaveStatus = document.getElementById("cw-save-status");
    var cwNextPuzzleBtn = document.getElementById("cw-next-puzzle-btn");
    var cwReplayBtn = document.getElementById("cw-replay-btn");

    var cwState = {
        puzzleIdx: 0,
        cells: [], // 5x5 of { r, c, isBlock, answer, entry, pencil, status, num, el }
        acrossWords: [], // { index, num, clue, cells: [{r,c}], tainted }
        downWords: [],   // { index, num, clue, cells: [{r,c}], tainted }
        row: 0,
        col: 0,
        dir: "across", // "across" | "down"
        pencil: false,
        hintsUsed: 0,
        checksUsed: 0,
        elapsedSec: 0,
        solved: false,
        solvedMap: {},
        timerHandle: null
    };

    try {
        var rawSolved = localStorage.getItem("mcwut-cw-solved");
        if (rawSolved) {
            cwState.solvedMap = JSON.parse(rawSolved) || {};
        }
    } catch (e) {}

    function playKeyTick(isPencil) {
        var ctx = ensureAudio();
        if (!ctx) return;
        try {
            var now = ctx.currentTime;
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(isPencil ? 540 : 660, now);
            gain.gain.setValueAtTime(0.035, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.06);
        } catch (e) {}
    }

    function formatTimer(sec) {
        var m = Math.floor(sec / 60);
        var s = sec % 60;
        return m + ":" + (s < 10 ? "0" + s : s);
    }

    function computeCrosswordScore() {
        var speedBonus = Math.max(0, 450 - cwState.elapsedSec * 3);
        var cleanWords = 0;
        cwState.acrossWords.forEach(function (w) {
            if (!w.tainted) cleanWords++;
        });
        cwState.downWords.forEach(function (w) {
            if (!w.tainted) cleanWords++;
        });
        var raw = 500 + speedBonus + cleanWords * 10 - cwState.hintsUsed * 40 - cwState.checksUsed * 15;
        return {
            score: Math.max(100, raw),
            cleanWords: cleanWords
        };
    }

    function updateCwStatsUi() {
        if (cwTimerEl) {
            cwTimerEl.textContent = formatTimer(cwState.elapsedSec);
        }
        if (cwLiveScoreEl) {
            var calc = computeCrosswordScore();
            cwLiveScoreEl.textContent = calc.score + " pts";
        }
    }

    function renderCwSelectOptions() {
        if (!cwSelectEl) return;
        var html = "";
        for (var i = 0; i < CW_PUZZLES.length; i++) {
            var p = CW_PUZZLES[i];
            var done = cwState.solvedMap[p.id] ? " ✓" : "";
            var sel = i === cwState.puzzleIdx ? " selected" : "";
            html += '<option value="' + i + '"' + sel + ">" + window.mcwut.esc(p.title + done) + "</option>";
        }
        cwSelectEl.innerHTML = html;
        if (cwSolvedPill) {
            var cur = CW_PUZZLES[cwState.puzzleIdx];
            cwSolvedPill.hidden = !(cur && cwState.solvedMap[cur.id]);
        }
    }

    function loadCrosswordPuzzle(idx) {
        cwState.puzzleIdx = ((idx % CW_PUZZLES.length) + CW_PUZZLES.length) % CW_PUZZLES.length;
        var p = CW_PUZZLES[cwState.puzzleIdx];

        cwState.cells = [];
        cwState.acrossWords = [];
        cwState.downWords = [];
        cwState.hintsUsed = 0;
        cwState.checksUsed = 0;
        cwState.elapsedSec = 0;
        cwState.solved = false;
        cwState.dir = "across";
        if (cwWinOverlay) cwWinOverlay.hidden = true;

        var numCounter = 0;
        var r, c;
        for (r = 0; r < 5; r++) {
            var rowArr = [];
            for (c = 0; c < 5; c++) {
                var ch = p.rows[r].charAt(c);
                var isBlock = ch === "#";
                var num = 0;
                if (!isBlock) {
                    var startsA = (c === 0 || p.rows[r].charAt(c - 1) === "#") && (c + 1 < 5 && p.rows[r].charAt(c + 1) !== "#");
                    var startsD = (r === 0 || p.rows[r - 1].charAt(c) === "#") && (r + 1 < 5 && p.rows[r + 1].charAt(c) !== "#");
                    if (startsA || startsD) {
                        numCounter++;
                        num = numCounter;
                    }
                }
                rowArr.push({
                    r: r,
                    c: c,
                    isBlock: isBlock,
                    answer: isBlock ? "" : ch,
                    entry: "",
                    pencil: false,
                    status: "", // "" | "correct" | "error"
                    num: num,
                    el: null
                });
            }
            cwState.cells.push(rowArr);
        }

        // Build Across words (1 per row)
        for (r = 0; r < 5; r++) {
            var aCells = [];
            var aNum = 0;
            for (c = 0; c < 5; c++) {
                if (!cwState.cells[r][c].isBlock) {
                    if (aCells.length === 0) aNum = cwState.cells[r][c].num;
                    aCells.push({ r: r, c: c });
                }
            }
            cwState.acrossWords.push({
                index: r,
                num: aNum,
                clue: p.across[r],
                cells: aCells,
                tainted: false
            });
        }

        // Build Down words (1 per col)
        for (c = 0; c < 5; c++) {
            var dCells = [];
            var dNum = 0;
            for (r = 0; r < 5; r++) {
                if (!cwState.cells[r][c].isBlock) {
                    if (dCells.length === 0) dNum = cwState.cells[r][c].num;
                    dCells.push({ r: r, c: c });
                }
            }
            cwState.downWords.push({
                index: c,
                num: dNum,
                clue: p.down[c],
                cells: dCells,
                tainted: false
            });
        }

        // Pick first non-block cell
        var firstCell = cwState.acrossWords[0].cells[0];
        cwState.row = firstCell.r;
        cwState.col = firstCell.c;

        renderCwSelectOptions();
        buildCwGridDom();
        renderCwClueLists();
        updateCwBoardUi();
        updateCwStatsUi();
    }

    function buildCwGridDom() {
        if (!cwGridEl) return;
        cwGridEl.innerHTML = "";
        for (var r = 0; r < 5; r++) {
            for (var c = 0; c < 5; c++) {
                var cell = cwState.cells[r][c];
                var btn = document.createElement("button");
                btn.type = "button";
                btn.className = "cw-cell" + (cell.isBlock ? " is-block" : "");
                btn.setAttribute("data-r", String(r));
                btn.setAttribute("data-c", String(c));
                if (cell.isBlock) {
                    btn.disabled = true;
                    btn.setAttribute("aria-hidden", "true");
                } else {
                    btn.setAttribute("aria-label", "Row " + (r + 1) + " Column " + (c + 1));
                    var numSpan = document.createElement("span");
                    numSpan.className = "cw-cell-num";
                    numSpan.textContent = cell.num > 0 ? String(cell.num) : "";
                    var letSpan = document.createElement("span");
                    letSpan.className = "cw-cell-letter";
                    letSpan.textContent = "";
                    btn.appendChild(numSpan);
                    btn.appendChild(letSpan);
                }
                cell.el = btn;
                cwGridEl.appendChild(btn);
            }
        }
    }

    function isWordFilled(word) {
        for (var i = 0; i < word.cells.length; i++) {
            var pos = word.cells[i];
            if (!cwState.cells[pos.r][pos.c].entry) return false;
        }
        return true;
    }

    function renderCwClueLists() {
        var esc = window.mcwut.esc;
        if (cwAcrossListEl) {
            var aHtml = "";
            for (var i = 0; i < cwState.acrossWords.length; i++) {
                var w = cwState.acrossWords[i];
                var isAct = cwState.dir === "across" && cwState.row === i;
                var isDone = isWordFilled(w);
                var cls = "cw-clue-item" + (isAct ? " is-active" : "") + (isDone ? " is-done" : "");
                aHtml +=
                    '<button type="button" class="' + cls + '" data-dir="across" data-idx="' + i + '">' +
                    '<span class="cw-clue-item-num">' + w.num + "A</span>" +
                    '<span class="cw-clue-item-text">' + esc(w.clue) + "</span>" +
                    "</button>";
            }
            cwAcrossListEl.innerHTML = aHtml;
        }
        if (cwDownListEl) {
            var dHtml = "";
            for (var j = 0; j < cwState.downWords.length; j++) {
                var dw = cwState.downWords[j];
                var isActD = cwState.dir === "down" && cwState.col === j;
                var isDoneD = isWordFilled(dw);
                var clsD = "cw-clue-item" + (isActD ? " is-active" : "") + (isDoneD ? " is-done" : "");
                dHtml +=
                    '<button type="button" class="' + clsD + '" data-dir="down" data-idx="' + j + '">' +
                    '<span class="cw-clue-item-num">' + dw.num + "D</span>" +
                    '<span class="cw-clue-item-text">' + esc(dw.clue) + "</span>" +
                    "</button>";
            }
            cwDownListEl.innerHTML = dHtml;
        }
    }

    function updateCwBoardUi() {
        for (var r = 0; r < 5; r++) {
            for (var c = 0; c < 5; c++) {
                var cell = cwState.cells[r][c];
                if (cell.isBlock || !cell.el) continue;

                var isAct = r === cwState.row && c === cwState.col;
                var inWord = (cwState.dir === "across" && r === cwState.row) || (cwState.dir === "down" && c === cwState.col);

                var cls = "cw-cell";
                if (isAct) cls += " is-active";
                else if (inWord) cls += " is-word";
                if (cell.pencil && cell.entry) cls += " is-pencil";
                if (cell.status === "correct") cls += " is-correct";
                if (cell.status === "error") cls += " is-error";
                cell.el.className = cls;

                var letEl = cell.el.querySelector(".cw-cell-letter");
                if (letEl) {
                    letEl.textContent = cell.entry;
                }
            }
        }

        // Update active clue banner
        var activeWord = cwState.dir === "across"
            ? cwState.acrossWords[cwState.row]
            : cwState.downWords[cwState.col];
        if (activeWord && cwActiveClueTag && cwActiveClueText) {
            cwActiveClueTag.textContent = activeWord.num + (cwState.dir === "across" ? "A" : "D");
            cwActiveClueText.textContent = activeWord.clue;
        }

        renderCwClueLists();
    }

    function markCellTainted(r, c) {
        if (cwState.acrossWords[r]) cwState.acrossWords[r].tainted = true;
        if (cwState.downWords[c]) cwState.downWords[c].tainted = true;
    }

    function stepCwCursor(delta) {
        var word = cwState.dir === "across"
            ? cwState.acrossWords[cwState.row]
            : cwState.downWords[cwState.col];
        if (!word) return;

        var posIdx = 0;
        for (var i = 0; i < word.cells.length; i++) {
            if (word.cells[i].r === cwState.row && word.cells[i].c === cwState.col) {
                posIdx = i;
                break;
            }
        }

        var nextIdx = posIdx + delta;
        if (nextIdx >= 0 && nextIdx < word.cells.length) {
            cwState.row = word.cells[nextIdx].r;
            cwState.col = word.cells[nextIdx].c;
        } else if (delta > 0) {
            cycleCwWord(1);
        } else if (delta < 0) {
            cycleCwWord(-1);
        }
    }

    function cycleCwWord(delta) {
        var list = cwState.dir === "across" ? cwState.acrossWords : cwState.downWords;
        var curIdx = cwState.dir === "across" ? cwState.row : cwState.col;
        var nextIdx = curIdx + delta;
        if (nextIdx >= list.length) {
            cwState.dir = cwState.dir === "across" ? "down" : "across";
            list = cwState.dir === "across" ? cwState.acrossWords : cwState.downWords;
            nextIdx = 0;
        } else if (nextIdx < 0) {
            cwState.dir = cwState.dir === "across" ? "down" : "across";
            list = cwState.dir === "across" ? cwState.acrossWords : cwState.downWords;
            nextIdx = list.length - 1;
        }
        var targetWord = list[nextIdx];
        if (targetWord && targetWord.cells.length > 0) {
            // Prefer first empty cell in target word, else first cell
            var dest = targetWord.cells[0];
            for (var i = 0; i < targetWord.cells.length; i++) {
                var p = targetWord.cells[i];
                if (!cwState.cells[p.r][p.c].entry) {
                    dest = p;
                    break;
                }
            }
            cwState.row = dest.r;
            cwState.col = dest.c;
        }
        updateCwBoardUi();
    }

    function inputCwLetter(ch) {
        if (cwState.solved) return;
        var cell = cwState.cells[cwState.row][cwState.col];
        if (!cell || cell.isBlock) return;

        cell.entry = ch.toUpperCase();
        cell.pencil = cwState.pencil;
        cell.status = "";
        playKeyTick(cwState.pencil);

        checkCrosswordSolved();
        if (!cwState.solved) {
            stepCwCursor(1);
            updateCwBoardUi();
        }
    }

    function handleCwBackspace() {
        if (cwState.solved) return;
        var cell = cwState.cells[cwState.row][cwState.col];
        if (!cell || cell.isBlock) return;

        if (cell.entry) {
            cell.entry = "";
            cell.pencil = false;
            cell.status = "";
        } else {
            stepCwCursor(-1);
            var prev = cwState.cells[cwState.row][cwState.col];
            if (prev && !prev.isBlock) {
                prev.entry = "";
                prev.pencil = false;
                prev.status = "";
            }
        }
        updateCwBoardUi();
    }

    function checkCrosswordBoard() {
        if (cwState.solved) return;
        cwState.checksUsed++;
        var anyChecked = false;
        for (var r = 0; r < 5; r++) {
            for (var c = 0; c < 5; c++) {
                var cell = cwState.cells[r][c];
                if (cell.isBlock || !cell.entry) continue;
                anyChecked = true;
                if (cell.entry === cell.answer) {
                    cell.status = "correct";
                    cell.pencil = false;
                } else {
                    cell.status = "error";
                    markCellTainted(r, c);
                }
            }
        }
        if (anyChecked) {
            updateCwBoardUi();
            updateCwStatsUi();
        }
    }

    function revealCwHint() {
        if (cwState.solved) return;
        var cell = cwState.cells[cwState.row][cwState.col];
        if (!cell || cell.isBlock) return;

        cwState.hintsUsed++;
        markCellTainted(cwState.row, cwState.col);
        cell.entry = cell.answer;
        cell.pencil = false;
        cell.status = "correct";
        playKeyTick(false);
        updateCwStatsUi();
        checkCrosswordSolved();
        if (!cwState.solved) {
            stepCwCursor(1);
            updateCwBoardUi();
        }
    }

    function checkCrosswordSolved() {
        for (var r = 0; r < 5; r++) {
            for (var c = 0; c < 5; c++) {
                var cell = cwState.cells[r][c];
                if (!cell.isBlock && cell.entry !== cell.answer) {
                    return false;
                }
            }
        }

        // Solved!
        cwState.solved = true;
        updateCwBoardUi();

        var p = CW_PUZZLES[cwState.puzzleIdx];
        if (p) {
            cwState.solvedMap[p.id] = true;
            try {
                localStorage.setItem("mcwut-cw-solved", JSON.stringify(cwState.solvedMap));
            } catch (e) {}
            renderCwSelectOptions();
        }

        // Celebratory wave across all non-block cells
        for (var wr = 0; wr < 5; wr++) {
            for (var wc = 0; wc < 5; wc++) {
                (function (cellObj, delay) {
                    if (cellObj.isBlock || !cellObj.el) return;
                    setTimeout(function () {
                        cellObj.status = "correct";
                        cellObj.el.classList.add("is-wave", "is-correct");
                    }, delay);
                })(cwState.cells[wr][wc], (wr + wc) * 55);
            }
        }

        playNewRecordFanfare();

        var result = computeCrosswordScore();
        setTimeout(function () {
            showCwWinModal(result.score, result.cleanWords);
        }, 480);
        return true;
    }

    async function showCwWinModal(finalScore, cleanWords) {
        var p = CW_PUZZLES[cwState.puzzleIdx];
        if (cwWinTitle && p) {
            cwWinTitle.textContent = p.title.replace(/^\d+\.\s*/, "") + " Solved!";
        }
        if (cwWinScore) cwWinScore.textContent = String(finalScore);
        if (cwWinTime) cwWinTime.textContent = formatTimer(cwState.elapsedSec);

        var prevBest = state.leaderboard && state.leaderboard.myRecord ? state.leaderboard.myRecord.bestScore : 0;
        if (cwWinBest) cwWinBest.textContent = String(Math.max(prevBest, finalScore));
        if (cwWinRank) {
            cwWinRank.textContent = state.leaderboard && state.leaderboard.myRecord ? "#" + state.leaderboard.myRecord.rank : "—";
        }
        if (cwRecordBanner) {
            cwRecordBanner.hidden = !(finalScore > prevBest);
        }
        if (cwSaveStatus) {
            cwSaveStatus.textContent = "Saving score to global leaderboard…";
        }
        if (cwWinOverlay) {
            cwWinOverlay.hidden = false;
        }

        try {
            var res = await window.mcwut.api("/api/games/mini-crossword/scores", {
                method: "POST",
                headers: window.mcwut.headers({ "Content-Type": "application/json" }),
                body: JSON.stringify({ score: finalScore, maxCombo: cleanWords })
            });
            if (!res) return;
            if (GAME_KEY === "mini-crossword") {
                state.leaderboard = res.leaderboard;
                renderLeaderboard(res.leaderboard);
            }
            if (cwWinBest) cwWinBest.textContent = String(res.bestScore);
            if (cwWinRank) cwWinRank.textContent = res.rank ? "#" + res.rank : "—";
            if (cwRecordBanner) cwRecordBanner.hidden = !res.isNewBest;
            if (cwSaveStatus) {
                cwSaveStatus.textContent = res.isNewBest
                    ? "New personal record saved to the global leaderboard!"
                    : "Score recorded on the global leaderboard.";
            }
        } catch (err) {
            if (cwSaveStatus) {
                cwSaveStatus.textContent = "Could not save score: " + (err.message || "Network error");
            }
        }
    }

    function initCrosswordEvents() {
        if (!cwStage) return;

        if (cwSelectEl) {
            cwSelectEl.addEventListener("change", function () {
                var idx = parseInt(cwSelectEl.value, 10) || 0;
                loadCrosswordPuzzle(idx);
            });
        }

        if (cwGridEl) {
            cwGridEl.addEventListener("click", function (ev) {
                var btn = ev.target.closest(".cw-cell");
                if (!btn || btn.classList.contains("is-block")) return;
                var r = parseInt(btn.getAttribute("data-r"), 10);
                var c = parseInt(btn.getAttribute("data-c"), 10);
                if (r === cwState.row && c === cwState.col) {
                    cwState.dir = cwState.dir === "across" ? "down" : "across";
                } else {
                    cwState.row = r;
                    cwState.col = c;
                }
                updateCwBoardUi();
            });
        }

        if (cwActiveClueBtn) {
            cwActiveClueBtn.addEventListener("click", function () {
                cwState.dir = cwState.dir === "across" ? "down" : "across";
                updateCwBoardUi();
            });
        }

        if (cwPrevClueBtn) {
            cwPrevClueBtn.addEventListener("click", function () {
                cycleCwWord(-1);
            });
        }

        if (cwNextClueBtn) {
            cwNextClueBtn.addEventListener("click", function () {
                cycleCwWord(1);
            });
        }

        function handleClueListClick(ev) {
            var btn = ev.target.closest(".cw-clue-item");
            if (!btn) return;
            var dir = btn.getAttribute("data-dir");
            var idx = parseInt(btn.getAttribute("data-idx"), 10);
            cwState.dir = dir;
            var word = dir === "across" ? cwState.acrossWords[idx] : cwState.downWords[idx];
            if (word && word.cells.length > 0) {
                cwState.row = word.cells[0].r;
                cwState.col = word.cells[0].c;
            }
            updateCwBoardUi();
        }

        if (cwAcrossListEl) cwAcrossListEl.addEventListener("click", handleClueListClick);
        if (cwDownListEl) cwDownListEl.addEventListener("click", handleClueListClick);

        if (cwPencilBtn) {
            cwPencilBtn.addEventListener("click", function () {
                cwState.pencil = !cwState.pencil;
                cwPencilBtn.setAttribute("aria-pressed", cwState.pencil ? "true" : "false");
            });
        }

        if (cwCheckBtn) {
            cwCheckBtn.addEventListener("click", function () {
                checkCrosswordBoard();
            });
        }

        if (cwHintBtn) {
            cwHintBtn.addEventListener("click", function () {
                revealCwHint();
            });
        }

        if (cwKeyboardEl) {
            cwKeyboardEl.addEventListener("click", function (ev) {
                var keyBtn = ev.target.closest(".cw-key");
                if (!keyBtn) return;
                var k = keyBtn.getAttribute("data-key");
                if (k === "BACKSPACE") {
                    handleCwBackspace();
                } else if (k === "DIR") {
                    cwState.dir = cwState.dir === "across" ? "down" : "across";
                    updateCwBoardUi();
                } else if (k && k.length === 1) {
                    inputCwLetter(k);
                }
            });
        }

        if (cwNextPuzzleBtn) {
            cwNextPuzzleBtn.addEventListener("click", function () {
                loadCrosswordPuzzle(cwState.puzzleIdx + 1);
            });
        }

        if (cwReplayBtn) {
            cwReplayBtn.addEventListener("click", function () {
                loadCrosswordPuzzle(cwState.puzzleIdx);
            });
        }

        cwState.timerHandle = setInterval(function () {
            if (GAME_KEY === "mini-crossword" && !cwState.solved) {
                cwState.elapsedSec++;
                updateCwStatsUi();
            }
        }, 1000);

        loadCrosswordPuzzle(0);
    }

    // =========================================================================
    // MINESWEEPER (CANVAS 2D)
    // =========================================================================
    var MS_DIFFS = {
        easy: { key: "easy", label: "Easy", cols: 9, rows: 9, mines: 10, base: 10, winBonus: 400, timeCap: 120, speed: 5, cellMax: 46 },
        medium: { key: "medium", label: "Medium", cols: 14, rows: 18, mines: 40, base: 12, winBonus: 900, timeCap: 300, speed: 4, cellMax: 40 },
        hard: { key: "hard", label: "Hard", cols: 16, rows: 24, mines: 76, base: 15, winBonus: 1500, timeCap: 480, speed: 4, cellMax: 36 }
    };
    var MS_NUMBER_COLORS = {
        1: "#38bdf8",
        2: "#34d399",
        3: "#fb7185",
        4: "#a78bfa",
        5: "#fbbf24",
        6: "#22d3ee",
        7: "#f472b6",
        8: "#e2e8f0"
    };
    var MS_SPARK_COLORS = ["#fff7ed", "#fbbf24", "#fb923c", "#f43f5e", "#38bdf8"];
    var MS_CONFETTI_COLORS = ["#38bdf8", "#a78bfa", "#f472b6", "#fbbf24", "#34d399", "#f97316"];
    var MS_REDUCED_MOTION = false;
    try {
        MS_REDUCED_MOTION = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    } catch (e) {}

    var msStage = document.getElementById("minesweeper-stage");
    var msArena = document.getElementById("ms-arena");
    var msCanvas = document.getElementById("ms-canvas");
    var msCtx = msCanvas ? msCanvas.getContext("2d") : null;
    var msDiffGroup = document.getElementById("ms-diff-group");
    var msMinesEl = document.getElementById("ms-mines-left");
    var msTimerEl = document.getElementById("ms-timer");
    var msScoreEl = document.getElementById("ms-score");
    var msFlagBtn = document.getElementById("ms-flag-btn");
    var msLiveStatus = document.getElementById("ms-live-status");
    var msStartOverlay = document.getElementById("ms-start-overlay");
    var msStartBtn = document.getElementById("ms-start-btn");
    var msOverOverlay = document.getElementById("ms-over-overlay");
    var msAgainBtn = document.getElementById("ms-again-btn");
    var msOverBadge = document.getElementById("ms-over-badge");
    var msOverTitle = document.getElementById("ms-over-title");
    var msOverScore = document.getElementById("ms-over-score");
    var msOverTime = document.getElementById("ms-over-time");
    var msOverCombo = document.getElementById("ms-over-combo");
    var msOverRank = document.getElementById("ms-over-rank");
    var msRecordBanner = document.getElementById("ms-record-banner");
    var msSaveStatus = document.getElementById("ms-save-status");

    var msState = {
        diff: "easy",
        cols: 9,
        rows: 9,
        mines: 10,
        cells: [],
        mode: "ready", // ready | playing | over
        won: false,
        minesPlaced: false,
        flags: 0,
        revealedSafe: 0,
        totalSafe: 71,
        score: 0,
        bestCascade: 0,
        elapsedMs: 0,
        resumeAt: 0,
        gameId: 0,
        submitted: false,
        flagMode: false,
        active: false,
        hover: -1,
        particles: [],
        rings: [],
        floaters: [],
        flash: 0,
        shake: 0,
        winPulse: 0,
        cell: 20,
        originX: 0,
        originY: 0,
        cssW: 0,
        cssH: 0,
        dpr: 1,
        time: 0,
        lastTime: 0,
        lastTimerSec: -1,
        leaderboard: null,
        prevBest: 0,
        hitIndex: -1
    };

    function msDiff() {
        return MS_DIFFS[msState.diff] || MS_DIFFS.easy;
    }

    function msRoundRect(context, x, y, w, h, r) {
        var radius = Math.max(0, Math.min(r, w / 2, h / 2));
        context.beginPath();
        context.moveTo(x + radius, y);
        context.lineTo(x + w - radius, y);
        context.arcTo(x + w, y, x + w, y + radius, radius);
        context.lineTo(x + w, y + h - radius);
        context.arcTo(x + w, y + h, x + w - radius, y + h, radius);
        context.lineTo(x + radius, y + h);
        context.arcTo(x, y + h, x, y + h - radius, radius);
        context.lineTo(x, y + radius);
        context.arcTo(x, y, x + radius, y, radius);
        context.closePath();
    }

    function msEaseOut(t) {
        var v = Math.max(0, Math.min(1, t));
        return 1 - Math.pow(1 - v, 3);
    }

    function msFormatTime(totalSeconds) {
        var sec = Math.max(0, Math.floor(totalSeconds));
        var minutes = Math.floor(sec / 60);
        var seconds = sec % 60;
        return minutes + ":" + (seconds < 10 ? "0" : "") + seconds;
    }

    function msMakeCell(r, c) {
        return {
            r: r,
            c: c,
            mine: false,
            adj: 0,
            revealed: false,
            flagged: false,
            revealT: 0,
            revealDelay: 0,
            flagT: 0,
            flagDelay: 0,
            mineVisible: false,
            wrongFlag: false,
            hit: false,
            chordWobble: 0
        };
    }

    function msRebuild(diffKey) {
        var d = MS_DIFFS[diffKey] || MS_DIFFS.easy;
        msState.diff = d.key;
        msState.cols = d.cols;
        msState.rows = d.rows;
        msState.mines = d.mines;
        msState.totalSafe = d.cols * d.rows - d.mines;
        msState.cells = [];
        msState.gameId += 1;
        msState.mode = "ready";
        msState.won = false;
        msState.minesPlaced = false;
        msState.flags = 0;
        msState.revealedSafe = 0;
        msState.score = 0;
        msState.bestCascade = 0;
        msState.elapsedMs = 0;
        msState.resumeAt = 0;
        msState.submitted = false;
        msState.hover = -1;
        msState.particles.length = 0;
        msState.rings.length = 0;
        msState.floaters.length = 0;
        msState.flash = 0;
        msState.shake = 0;
        msState.winPulse = 0;
        msState.lastTimerSec = -1;
        msState.hitIndex = -1;

        for (var r = 0; r < msState.rows; r++) {
            for (var c = 0; c < msState.cols; c++) {
                msState.cells.push(msMakeCell(r, c));
            }
        }

        if (msDiffGroup) {
            var btns = msDiffGroup.querySelectorAll("[data-ms-diff]");
            for (var i = 0; i < btns.length; i++) {
                var isMatch = btns[i].getAttribute("data-ms-diff") === d.key;
                btns[i].classList.toggle("is-active", isMatch);
                btns[i].setAttribute("aria-pressed", isMatch ? "true" : "false");
            }
        }

        msUpdateHud();
    }

    function msNewGame() {
        msRebuild(msState.diff);
        if (msStartOverlay) {
            msStartOverlay.hidden = true;
        }
        if (msOverOverlay) {
            msOverOverlay.hidden = true;
        }
        msResize();
        msAnnounce("New " + msDiff().label + " minefield ready. Tap any tile to begin.");
    }

    function msSetDifficulty(diffKey) {
        msRebuild(diffKey);
        if (msStartOverlay) {
            msStartOverlay.hidden = true;
        }
        if (msOverOverlay) {
            msOverOverlay.hidden = true;
        }
        msResize();
        msAnnounce(msDiff().label + " minefield ready. Tap any tile to begin.");
    }

    function msElapsedMs() {
        return msState.elapsedMs + (msState.resumeAt ? performance.now() - msState.resumeAt : 0);
    }

    function msPauseClock() {
        if (msState.mode === "playing" && msState.resumeAt) {
            msState.elapsedMs += performance.now() - msState.resumeAt;
            msState.resumeAt = 0;
        }
    }

    function msResumeClock() {
        if (msState.mode === "playing" && !msState.resumeAt) {
            msState.resumeAt = performance.now();
        }
    }

    function msAnnounce(text) {
        if (msLiveStatus) {
            msLiveStatus.textContent = text;
        }
    }

    function msUpdateHud() {
        if (msMinesEl) {
            msMinesEl.textContent = String(msState.mines - msState.flags);
        }
        if (msScoreEl) {
            msScoreEl.textContent = String(Math.round(msState.score));
        }
        if (msTimerEl) {
            msTimerEl.textContent = msFormatTime(msElapsedMs() / 1000);
        }
        if (msFlagBtn) {
            msFlagBtn.classList.toggle("is-active", msState.flagMode);
            msFlagBtn.setAttribute("aria-pressed", msState.flagMode ? "true" : "false");
        }
    }

    function msResize() {
        if (!msCanvas || !msCtx) {
            return;
        }
        var rect = msCanvas.getBoundingClientRect();
        if (rect.width < 10 || rect.height < 10) {
            return;
        }
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        msState.dpr = dpr;
        msCanvas.width = Math.round(rect.width * dpr);
        msCanvas.height = Math.round(rect.height * dpr);
        msCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        msState.cssW = rect.width;
        msState.cssH = rect.height;

        var pad = Math.max(10, Math.min(24, rect.width * 0.035));
        var cell = Math.min(
            (rect.width - pad * 2) / msState.cols,
            (rect.height - pad * 2) / msState.rows,
            msDiff().cellMax
        );
        cell = Math.max(12, cell);
        msState.cell = cell;
        msState.originX = (rect.width - cell * msState.cols) / 2;
        msState.originY = (rect.height - cell * msState.rows) / 2;
    }

    function msPlantMines(safeIdx) {
        if (msState.minesPlaced) {
            return;
        }
        var cols = msState.cols;
        var rows = msState.rows;
        var safeR = Math.floor(safeIdx / cols);
        var safeC = safeIdx % cols;
        var forbidden = {};
        for (var dr = -1; dr <= 1; dr++) {
            for (var dc = -1; dc <= 1; dc++) {
                var rr = safeR + dr;
                var cc = safeC + dc;
                if (rr >= 0 && rr < rows && cc >= 0 && cc < cols) {
                    forbidden[rr * cols + cc] = true;
                }
            }
        }

        var candidates = [];
        for (var i = 0; i < msState.cells.length; i++) {
            if (!forbidden[i] && !msState.cells[i].flagged) {
                candidates.push(i);
            }
        }
        if (candidates.length < msState.mines) {
            candidates = [];
            for (var j = 0; j < msState.cells.length; j++) {
                if (j !== safeIdx) {
                    candidates.push(j);
                }
            }
        }

        for (var k = candidates.length - 1; k > 0; k--) {
            var swap = Math.floor(Math.random() * (k + 1));
            var tmp = candidates[k];
            candidates[k] = candidates[swap];
            candidates[swap] = tmp;
        }

        var placed = 0;
        for (var m = 0; m < candidates.length && placed < msState.mines; m++) {
            msState.cells[candidates[m]].mine = true;
            placed++;
        }

        for (var idx = 0; idx < msState.cells.length; idx++) {
            var cell = msState.cells[idx];
            if (cell.mine) {
                continue;
            }
            var r = Math.floor(idx / cols);
            var c = idx % cols;
            var count = 0;
            for (var nr = r - 1; nr <= r + 1; nr++) {
                for (var nc = c - 1; nc <= c + 1; nc++) {
                    if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || (nr === r && nc === c)) {
                        continue;
                    }
                    if (msState.cells[nr * cols + nc].mine) {
                        count++;
                    }
                }
            }
            cell.adj = count;
        }

        msState.minesPlaced = true;
    }

    function msStartClock() {
        if (msState.mode !== "ready") {
            return;
        }
        msState.mode = "playing";
        msState.resumeAt = performance.now();
    }

    function msFlood(startIdx) {
        var cols = msState.cols;
        var rows = msState.rows;
        var queue = [{ idx: startIdx, dist: 0 }];
        var seen = {};
        seen[startIdx] = true;
        var head = 0;
        var count = 0;

        while (head < queue.length) {
            var item = queue[head++];
            var idx = item.idx;
            var cell = msState.cells[idx];
            if (!cell || cell.revealed || cell.flagged || cell.mine) {
                continue;
            }
            cell.revealed = true;
            cell.revealT = 0;
            cell.revealDelay = Math.min(440, item.dist * 17);
            count++;
            msState.revealedSafe++;

            if (cell.adj === 0) {
                var r = Math.floor(idx / cols);
                var c = idx % cols;
                for (var dr = -1; dr <= 1; dr++) {
                    for (var dc = -1; dc <= 1; dc++) {
                        if (dr === 0 && dc === 0) {
                            continue;
                        }
                        var rr = r + dr;
                        var cc = c + dc;
                        if (rr < 0 || rr >= rows || cc < 0 || cc >= cols) {
                            continue;
                        }
                        var ni = rr * cols + cc;
                        if (!seen[ni]) {
                            seen[ni] = true;
                            queue.push({ idx: ni, dist: item.dist + 1 });
                        }
                    }
                }
            }
        }

        return count;
    }

    function msAwardCascade(count, atIdx) {
        if (count <= 0) {
            return;
        }
        var d = msDiff();
        var gained = count * d.base;
        if (count >= 4) {
            gained += (count - 3) * 5;
        }
        if (count > msState.bestCascade) {
            msState.bestCascade = count;
        }
        msState.score = Math.min(10000, msState.score + gained);

        var pos = msCellCenter(atIdx);
        if (count >= 4) {
            msState.floaters.push({
                x: pos.x,
                y: pos.y,
                text: "×" + count + " CASCADE",
                color: "#7dd3fc",
                life: 0.95,
                maxLife: 0.95
            });
            msPlayCascade(count);
        } else {
            msPlayReveal(count);
        }
        msUpdateHud();
    }

    function msReveal(idx) {
        if (msState.mode === "over") {
            return;
        }
        var cell = msState.cells[idx];
        if (!cell || cell.revealed || cell.flagged) {
            return;
        }
        if (!msState.minesPlaced) {
            msPlantMines(idx);
            msStartClock();
        }
        if (cell.mine) {
            msLose(idx);
            return;
        }
        var count = msFlood(idx);
        if (count > 0) {
            msAwardCascade(count, idx);
            msCheckWin();
        }
    }

    function msChord(idx) {
        if (msState.mode !== "playing") {
            return;
        }
        var cell = msState.cells[idx];
        if (!cell || !cell.revealed || cell.adj <= 0) {
            return;
        }
        var r = Math.floor(idx / msState.cols);
        var c = idx % msState.cols;
        var neighbors = [];
        var flagCount = 0;
        for (var dr = -1; dr <= 1; dr++) {
            for (var dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) {
                    continue;
                }
                var rr = r + dr;
                var cc = c + dc;
                if (rr < 0 || rr >= msState.rows || cc < 0 || cc >= msState.cols) {
                    continue;
                }
                var ni = rr * msState.cols + cc;
                var neighbor = msState.cells[ni];
                if (neighbor.flagged) {
                    flagCount++;
                } else if (!neighbor.revealed) {
                    neighbors.push(ni);
                }
            }
        }
        if (flagCount !== cell.adj) {
            cell.chordWobble = 1;
            msPlayBlocked();
            return;
        }
        for (var i = 0; i < neighbors.length; i++) {
            if (msState.cells[neighbors[i]].mine) {
                msLose(neighbors[i]);
                return;
            }
        }
        var total = 0;
        for (var j = 0; j < neighbors.length; j++) {
            total += msFlood(neighbors[j]);
        }
        if (total > 0) {
            msAwardCascade(total, idx);
            msCheckWin();
        }
    }

    function msPrimaryAction(idx) {
        var cell = msState.cells[idx];
        if (!cell) {
            return;
        }
        if (cell.revealed) {
            msChord(idx);
            return;
        }
        if (cell.flagged) {
            msPlayBlocked();
            return;
        }
        msReveal(idx);
    }

    function msToggleFlag(idx) {
        if (msState.mode === "over") {
            return;
        }
        var cell = msState.cells[idx];
        if (!cell || cell.revealed) {
            return;
        }
        cell.flagged = !cell.flagged;
        cell.flagT = 0;
        cell.flagDelay = 0;
        cell.wrongFlag = false;
        msState.flags += cell.flagged ? 1 : -1;
        if (msState.flags < 0) {
            msState.flags = 0;
        }
        msPlayFlag();
        if (navigator.vibrate) {
            try {
                navigator.vibrate(12);
            } catch (e) {}
        }
        msUpdateHud();
    }

    function msToggleFlagMode() {
        msState.flagMode = !msState.flagMode;
        msUpdateHud();
        msPlayFlag();
        msAnnounce(msState.flagMode
            ? "Flag mode on. Tap tiles to mark mines."
            : "Reveal mode on. Tap tiles to clear them.");
    }

    function msCheckWin() {
        if (msState.mode !== "playing") {
            return;
        }
        if (msState.revealedSafe >= msState.totalSafe) {
            msWin();
        }
    }

    function msWin() {
        if (msState.mode === "over") {
            return;
        }
        msState.mode = "over";
        msState.won = true;
        msPauseClock();

        var d = msDiff();
        var seconds = msState.elapsedMs / 1000;
        var timeBonus = Math.max(0, Math.round((d.timeCap - seconds) * d.speed));
        msState.score = Math.min(10000, msState.score + d.winBonus + timeBonus);

        var flagDelay = 0;
        for (var i = 0; i < msState.cells.length; i++) {
            var cell = msState.cells[i];
            if (cell.mine && !cell.flagged) {
                cell.flagged = true;
                cell.flagT = 0;
                cell.flagDelay = flagDelay;
                flagDelay += 34;
                msState.flags++;
            }
        }

        msState.winPulse = 1;
        msSpawnConfetti(MS_REDUCED_MOTION ? 36 : 170);
        msSpawnRing(msState.cssW / 2, msState.cssH / 2, Math.max(msState.cssW, msState.cssH) * 0.7, "#38bdf8", 0.9);
        msPlayWin();
        msUpdateHud();
        msAnnounce("Minefield cleared in " + msFormatTime(seconds) + ". Score " + Math.round(msState.score) + ".");

        var gameId = msState.gameId;
        setTimeout(function () {
            if (gameId === msState.gameId) {
                msShowResult(true);
            }
        }, MS_REDUCED_MOTION ? 280 : 1150);
    }

    function msLose(hitIdx) {
        if (msState.mode === "over") {
            return;
        }
        msState.mode = "over";
        msState.won = false;
        msState.hitIndex = hitIdx;
        msPauseClock();

        var hit = msState.cells[hitIdx];
        hit.revealed = true;
        hit.revealT = 1;
        hit.revealDelay = 0;
        hit.mineVisible = true;
        hit.hit = true;

        var pos = msCellCenter(hitIdx);
        if (!MS_REDUCED_MOTION) {
            msState.shake = 1;
        }
        msState.flash = 0.95;
        msSpawnExplosion(pos.x, pos.y, true);
        msPlayExplosion(true);

        var wrongFlags = 0;
        for (var w = 0; w < msState.cells.length; w++) {
            var wc = msState.cells[w];
            if (wc.flagged && !wc.mine) {
                wc.wrongFlag = true;
                wrongFlags++;
            }
        }

        var otherMines = [];
        for (var i = 0; i < msState.cells.length; i++) {
            if (msState.cells[i].mine && i !== hitIdx) {
                otherMines.push(i);
            }
        }

        var gameId = msState.gameId;
        var span = Math.min(1100, 300 + otherMines.length * 34);
        for (var m = 0; m < otherMines.length; m++) {
            (function (mineIdx, order) {
                var delay = 220 + (otherMines.length ? (order / otherMines.length) * span : 0);
                setTimeout(function () {
                    if (gameId !== msState.gameId || msState.won) {
                        return;
                    }
                    var mc = msState.cells[mineIdx];
                    if (!mc || mc.revealed) {
                        return;
                    }
                    mc.revealed = true;
                    mc.revealT = 1;
                    mc.revealDelay = 0;
                    mc.mineVisible = true;
                    var mp = msCellCenter(mineIdx);
                    msSpawnExplosion(mp.x, mp.y, false);
                    if (order % 5 === 0) {
                        msPlayExplosion(false);
                    }
                }, delay);
            })(otherMines[m], m);
        }

        msUpdateHud();
        msAnnounce("Mine detonated. " + wrongFlags + " flag" + (wrongFlags === 1 ? "" : "s") + " misplaced. Score " + Math.round(msState.score) + ".");

        setTimeout(function () {
            if (gameId === msState.gameId) {
                msShowResult(false);
            }
        }, 300 + span + (MS_REDUCED_MOTION ? 250 : 480));
    }

    function msShowResult(won) {
        msState.prevBest = msState.leaderboard && msState.leaderboard.myRecord
            ? msState.leaderboard.myRecord.bestScore
            : 0;

        if (msOverBadge) {
            msOverBadge.textContent = won ? "MINEFIELD CLEARED" : "BOOM";
        }
        if (msOverTitle) {
            msOverTitle.textContent = won ? "Swept Clean!" : "Minefield Lost";
        }
        if (msOverScore) {
            msOverScore.textContent = String(Math.round(msState.score));
        }
        if (msOverTime) {
            msOverTime.textContent = msFormatTime(msState.elapsedMs / 1000);
        }
        if (msOverCombo) {
            msOverCombo.textContent = msState.bestCascade > 0 ? "×" + msState.bestCascade : "—";
        }
        if (msOverRank) {
            var rec = msState.leaderboard && msState.leaderboard.myRecord;
            msOverRank.textContent = rec ? "#" + rec.rank : "—";
        }
        if (msRecordBanner) {
            msRecordBanner.hidden = !(msState.score > msState.prevBest && msState.score > 0);
        }
        if (msSaveStatus) {
            msSaveStatus.textContent = "Saving score to global leaderboard…";
        }
        if (msStartOverlay) {
            msStartOverlay.hidden = true;
        }
        if (msOverOverlay) {
            msOverOverlay.hidden = false;
        }
        msSubmitScore();
    }

    async function msSubmitScore() {
        if (msState.submitted) {
            return;
        }
        msState.submitted = true;
        var gameId = msState.gameId;
        var score = Math.max(0, Math.min(10000, Math.round(msState.score)));
        var combo = Math.max(0, Math.min(10000, Math.round(msState.bestCascade)));

        try {
            var res = await window.mcwut.api("/api/games/minesweeper/scores", {
                method: "POST",
                headers: window.mcwut.headers({ "Content-Type": "application/json" }),
                body: JSON.stringify({ score: score, maxCombo: combo })
            });
            if (!res) {
                return;
            }
            msState.leaderboard = res.leaderboard;
            if (GAME_KEY === "minesweeper") {
                renderLeaderboard(res.leaderboard);
            }
            if (gameId !== msState.gameId) {
                return;
            }
            if (msOverRank) {
                msOverRank.textContent = res.rank ? "#" + res.rank : "—";
            }
            if (msRecordBanner) {
                msRecordBanner.hidden = !res.isNewBest;
            }
            if (res.isNewBest) {
                playNewRecordFanfare();
            }
            if (msSaveStatus) {
                msSaveStatus.textContent = res.isNewBest
                    ? "New personal record saved to the global leaderboard!"
                    : "Score recorded. Personal best: " + res.bestScore + ".";
            }
        } catch (err) {
            if (msSaveStatus && gameId === msState.gameId) {
                msSaveStatus.textContent = "Could not save score: " + (err.message || "Network error");
            }
        }
    }

    function msCellCenter(idx) {
        var r = Math.floor(idx / msState.cols);
        var c = idx % msState.cols;
        return {
            x: msState.originX + (c + 0.5) * msState.cell,
            y: msState.originY + (r + 0.5) * msState.cell
        };
    }

    function msHitTest(ev) {
        if (!msCanvas) {
            return -1;
        }
        var rect = msCanvas.getBoundingClientRect();
        var x = ev.clientX - rect.left;
        var y = ev.clientY - rect.top;
        var c = Math.floor((x - msState.originX) / msState.cell);
        var r = Math.floor((y - msState.originY) / msState.cell);
        if (r < 0 || r >= msState.rows || c < 0 || c >= msState.cols) {
            return -1;
        }
        return r * msState.cols + c;
    }

    // --- Minesweeper Audio ---
    function msTone(freq, endFreq, duration, type, volume, delay) {
        var ctx = ensureAudio();
        if (!ctx) {
            return;
        }
        try {
            var t = ctx.currentTime + (delay || 0);
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.type = type || "sine";
            osc.frequency.setValueAtTime(Math.max(20, freq), t);
            if (endFreq) {
                osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t + duration);
            }
            gain.gain.setValueAtTime(volume || 0.04, t);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t);
            osc.stop(t + duration + 0.02);
        } catch (e) {}
    }

    function msPlayReveal(count) {
        var lift = Math.min(count || 1, 8);
        msTone(500 + lift * 26, 760 + lift * 34, 0.07, "triangle", 0.03);
    }

    function msPlayCascade(count) {
        var lift = Math.min(count, 20);
        msTone(480 + lift * 18, 820 + lift * 22, 0.1, "triangle", 0.045);
        msTone(720 + lift * 15, 1180 + lift * 18, 0.12, "sine", 0.025, 0.05);
    }

    function msPlayFlag() {
        msTone(290, 210, 0.05, "square", 0.025);
    }

    function msPlayBlocked() {
        msTone(170, 130, 0.09, "sawtooth", 0.02);
    }

    var msNoiseBuffer = null;
    function msPlayExplosion(big) {
        var ctx = ensureAudio();
        if (!ctx) {
            return;
        }
        try {
            if (!msNoiseBuffer) {
                var len = Math.floor(ctx.sampleRate * 0.9);
                msNoiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
                var data = msNoiseBuffer.getChannelData(0);
                for (var i = 0; i < len; i++) {
                    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.8);
                }
            }
            var now = ctx.currentTime;
            var src = ctx.createBufferSource();
            src.buffer = msNoiseBuffer;
            var filter = ctx.createBiquadFilter();
            filter.type = "lowpass";
            filter.frequency.setValueAtTime(big ? 1500 : 2600, now);
            filter.frequency.exponentialRampToValueAtTime(150, now + (big ? 0.7 : 0.2));
            var gain = ctx.createGain();
            gain.gain.setValueAtTime(big ? 0.38 : 0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + (big ? 0.75 : 0.22));
            src.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);
            src.start(now);
            src.stop(now + (big ? 0.8 : 0.24));
            if (big) {
                msTone(95, 30, 0.5, "sine", 0.26);
            }
        } catch (e) {}
    }

    function msPlayWin() {
        var notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
        for (var i = 0; i < notes.length; i++) {
            msTone(notes[i], notes[i] * 1.01, 0.24, "triangle", 0.045, i * 0.08);
        }
    }

    // --- Minesweeper Particles ---
    function msSpawnExplosion(x, y, big) {
        var sparks = big ? (MS_REDUCED_MOTION ? 24 : 76) : (MS_REDUCED_MOTION ? 4 : 9);
        for (var i = 0; i < sparks; i++) {
            var angle = Math.random() * Math.PI * 2;
            var speed = (big ? 90 : 40) + Math.random() * (big ? 340 : 150);
            var life = 0.32 + Math.random() * 0.6;
            msState.particles.push({
                type: "spark",
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 30,
                g: 430,
                drag: 1.1,
                life: life,
                maxLife: life,
                size: 1 + Math.random() * 2.6,
                color: MS_SPARK_COLORS[Math.floor(Math.random() * MS_SPARK_COLORS.length)]
            });
        }

        var smokeCount = big ? (MS_REDUCED_MOTION ? 4 : 12) : (MS_REDUCED_MOTION ? 1 : 3);
        for (var s = 0; s < smokeCount; s++) {
            var smokeLife = 0.8 + Math.random() * 0.8;
            msState.particles.push({
                type: "smoke",
                x: x + (Math.random() - 0.5) * 20,
                y: y + (Math.random() - 0.5) * 16,
                vx: (Math.random() - 0.5) * 50,
                vy: -18 - Math.random() * 46,
                g: -18,
                drag: 1.4,
                life: smokeLife,
                maxLife: smokeLife,
                size: 8 + Math.random() * 16,
                color: "#94a3b8"
            });
        }

        if (big) {
            msSpawnRing(x, y, Math.max(msState.cssW, msState.cssH) * 0.5, "#fb7185", 0.75);
            msSpawnRing(x, y, Math.max(msState.cssW, msState.cssH) * 0.32, "#fbbf24", 0.55);
        }

        if (msState.particles.length > 900) {
            msState.particles.splice(0, msState.particles.length - 900);
        }
    }

    function msSpawnRing(x, y, maxRadius, color, strength) {
        msState.rings.push({
            x: x,
            y: y,
            radius: 4,
            maxRadius: maxRadius,
            life: 1,
            maxLife: 1,
            color: color,
            strength: strength || 0.6
        });
    }

    function msSpawnConfetti(count) {
        var width = msState.cssW || 400;
        for (var i = 0; i < count; i++) {
            var life = 1.9 + Math.random() * 1.7;
            msState.particles.push({
                type: "confetti",
                x: Math.random() * width,
                y: -12 - Math.random() * 70,
                vx: (Math.random() - 0.5) * 120,
                vy: 50 + Math.random() * 150,
                g: 250,
                drag: 0.45,
                life: life,
                maxLife: life,
                size: 3 + Math.random() * 4,
                rot: Math.random() * Math.PI * 2,
                vr: (Math.random() - 0.5) * 12,
                color: MS_CONFETTI_COLORS[Math.floor(Math.random() * MS_CONFETTI_COLORS.length)]
            });
        }
        if (msState.particles.length > 900) {
            msState.particles.splice(0, msState.particles.length - 900);
        }
    }

    // --- Minesweeper Render ---
    function msDrawMine(context, cx, cy, size, time) {
        var radius = size * 0.26;
        var pulse = 0.86 + Math.sin(time * 6) * 0.14;
        context.save();
        context.translate(cx, cy);
        context.shadowColor = "rgba(244, 63, 94, " + (0.7 * pulse) + ")";
        context.shadowBlur = size * 0.4;
        context.strokeStyle = "#fb7185";
        context.lineWidth = Math.max(1.4, size * 0.05);
        for (var i = 0; i < 8; i++) {
            var angle = (i * Math.PI) / 4;
            context.beginPath();
            context.moveTo(Math.cos(angle) * radius * 0.62, Math.sin(angle) * radius * 0.62);
            context.lineTo(Math.cos(angle) * radius * 1.48, Math.sin(angle) * radius * 1.48);
            context.stroke();
        }
        context.beginPath();
        context.arc(0, 0, radius, 0, Math.PI * 2);
        context.fillStyle = "#111827";
        context.fill();
        context.stroke();
        context.shadowBlur = 0;
        context.beginPath();
        context.arc(-radius * 0.32, -radius * 0.32, radius * 0.28, 0, Math.PI * 2);
        context.fillStyle = "rgba(255, 255, 255, 0.34)";
        context.fill();
        context.beginPath();
        context.arc(0, 0, radius * 0.34, 0, Math.PI * 2);
        context.fillStyle = "#f43f5e";
        context.fill();
        context.restore();
    }

    function msDrawFlag(context, cx, cy, size, progress) {
        var pop = 1 + Math.sin(Math.min(1, progress) * Math.PI) * 0.18;
        var wave = Math.sin(msState.time * 4.5 + cx * 0.05) * size * 0.035;
        context.save();
        context.translate(cx, cy);
        context.scale(pop, pop);
        context.strokeStyle = "#e2e8f0";
        context.lineWidth = Math.max(1.5, size * 0.055);
        context.lineCap = "round";
        context.beginPath();
        context.moveTo(-size * 0.1, size * 0.3);
        context.lineTo(-size * 0.1, -size * 0.32);
        context.stroke();
        context.shadowColor = "rgba(249, 115, 22, 0.7)";
        context.shadowBlur = size * 0.22;
        context.fillStyle = "#f97316";
        context.beginPath();
        context.moveTo(-size * 0.08, -size * 0.3);
        context.lineTo(size * 0.34, -size * 0.2 + wave);
        context.lineTo(-size * 0.08, -size * 0.04);
        context.closePath();
        context.fill();
        context.shadowBlur = 0;
        context.fillStyle = "#fbbf24";
        context.beginPath();
        context.arc(-size * 0.1, size * 0.3, Math.max(1.2, size * 0.055), 0, Math.PI * 2);
        context.fill();
        context.restore();
    }

    function msDrawCover(context, cell, x, y, size, hovered) {
        var gap = Math.max(1.5, size * 0.065);
        var s = size - gap * 2;
        var radius = Math.max(3, s * 0.2);
        var px = x + gap;
        var py = y + gap;

        msRoundRect(context, px, py, s, s, radius);
        context.fillStyle = hovered ? "#2b4a6c" : "#1d2d47";
        context.fill();

        context.fillStyle = hovered ? "rgba(148, 199, 255, 0.22)" : "rgba(148, 199, 255, 0.13)";
        msRoundRect(context, px + 1, py + 1, s - 2, Math.max(2, s * 0.2), radius * 0.7);
        context.fill();

        context.strokeStyle = hovered ? "rgba(125, 211, 252, 0.75)" : "rgba(96, 165, 250, 0.16)";
        context.lineWidth = hovered ? 1.5 : 1;
        msRoundRect(context, px, py, s, s, radius);
        context.stroke();

        if (cell.flagged) {
            msDrawFlag(context, px + s / 2, py + s / 2, s, cell.flagT);
            if (cell.wrongFlag) {
                context.strokeStyle = "rgba(248, 113, 113, 0.95)";
                context.lineWidth = Math.max(1.8, s * 0.07);
                context.lineCap = "round";
                context.beginPath();
                context.moveTo(px + s * 0.28, py + s * 0.28);
                context.lineTo(px + s * 0.72, py + s * 0.72);
                context.moveTo(px + s * 0.72, py + s * 0.28);
                context.lineTo(px + s * 0.28, py + s * 0.72);
                context.stroke();
            }
        }
    }

    function msDrawRevealed(context, cell, x, y, size, hovered) {
        var gap = Math.max(1.5, size * 0.065);
        var s = size - gap * 2;
        var radius = Math.max(3, s * 0.16);
        var px = x + gap;
        var py = y + gap;
        var cx = px + s / 2;
        var cy = py + s / 2;
        var progress = msEaseOut(cell.revealT);
        var scale = 1 + (1 - progress) * 0.16;

        context.save();
        context.translate(cx, cy);
        context.scale(scale, scale);
        context.translate(-cx, -cy);

        msRoundRect(context, px, py, s, s, radius);
        context.fillStyle = "#0a1524";
        context.fill();
        context.strokeStyle = hovered ? "rgba(56, 189, 248, 0.38)" : "rgba(56, 189, 248, 0.075)";
        context.lineWidth = 1;
        context.stroke();

        context.fillStyle = "rgba(0, 0, 0, 0.22)";
        msRoundRect(context, px + 1, py + 1, s - 2, Math.max(2, s * 0.12), radius * 0.7);
        context.fill();

        if (cell.mineVisible) {
            msDrawMine(context, cx, cy, s, msState.time);
        } else if (cell.adj > 0) {
            var color = MS_NUMBER_COLORS[cell.adj] || "#e2e8f0";
            context.font = "800 " + Math.max(9, Math.round(s * 0.52)) + "px system-ui, -apple-system, 'Segoe UI', sans-serif";
            context.textAlign = "center";
            context.textBaseline = "middle";
            context.fillStyle = color;
            context.shadowColor = color;
            context.shadowBlur = s * 0.2;
            context.fillText(String(cell.adj), cx, cy + s * 0.02);
            context.shadowBlur = 0;
        }

        if (cell.revealT < 0.4) {
            context.fillStyle = "rgba(159, 222, 255, " + (1 - cell.revealT / 0.4) * 0.28 + ")";
            msRoundRect(context, px, py, s, s, radius);
            context.fill();
        }
        context.restore();

        if (cell.chordWobble > 0) {
            context.strokeStyle = "rgba(248, 113, 113, " + cell.chordWobble * 0.8 + ")";
            context.lineWidth = 2;
            msRoundRect(context, px, py, s, s, radius);
            context.stroke();
        }
    }

    function msDrawParticles(context) {
        var i;
        for (i = 0; i < msState.particles.length; i++) {
            var particle = msState.particles[i];
            var alpha = Math.max(0, particle.life / particle.maxLife);
            if (particle.type === "smoke") {
                context.globalAlpha = alpha * 0.28;
                context.fillStyle = particle.color;
                context.beginPath();
                context.arc(particle.x, particle.y, particle.size * (1.5 - alpha * 0.5), 0, Math.PI * 2);
                context.fill();
            } else if (particle.type === "confetti") {
                context.globalAlpha = Math.min(1, alpha * 2);
                context.save();
                context.translate(particle.x, particle.y);
                context.rotate(particle.rot);
                context.fillStyle = particle.color;
                context.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size * 0.6);
                context.restore();
            }
        }
        context.globalCompositeOperation = "lighter";
        for (i = 0; i < msState.particles.length; i++) {
            var spark = msState.particles[i];
            if (spark.type !== "spark") {
                continue;
            }
            var sparkAlpha = Math.max(0, spark.life / spark.maxLife);
            context.globalAlpha = sparkAlpha;
            context.strokeStyle = spark.color;
            context.lineWidth = spark.size;
            context.lineCap = "round";
            context.beginPath();
            context.moveTo(spark.x, spark.y);
            context.lineTo(spark.x - spark.vx * 0.018, spark.y - spark.vy * 0.018);
            context.stroke();
        }
        context.globalCompositeOperation = "source-over";
        context.globalAlpha = 1;
    }

    function msDrawRings(context) {
        for (var i = 0; i < msState.rings.length; i++) {
            var ring = msState.rings[i];
            var alpha = Math.max(0, ring.life / ring.maxLife);
            context.globalAlpha = alpha * ring.strength;
            context.strokeStyle = ring.color;
            context.lineWidth = Math.max(1, 6 * alpha);
            context.beginPath();
            context.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
            context.stroke();
        }
        context.globalAlpha = 1;
    }

    function msDrawFloaters(context) {
        for (var i = 0; i < msState.floaters.length; i++) {
            var floater = msState.floaters[i];
            var alpha = Math.max(0, floater.life / floater.maxLife);
            context.globalAlpha = alpha;
            context.fillStyle = floater.color;
            context.font = "800 " + Math.max(11, Math.round(msState.cell * 0.34)) + "px system-ui, -apple-system, 'Segoe UI', sans-serif";
            context.textAlign = "center";
            context.textBaseline = "middle";
            context.shadowColor = floater.color;
            context.shadowBlur = 10;
            context.fillText(floater.text, floater.x, floater.y);
            context.shadowBlur = 0;
        }
        context.globalAlpha = 1;
    }

    function msRender() {
        if (!msCtx || !msState.cssW || !msState.cssH) {
            return;
        }
        var ctx = msCtx;
        var width = msState.cssW;
        var height = msState.cssH;
        ctx.clearRect(0, 0, width, height);

        // Ambient drifting glow.
        var t = msState.time;
        ctx.globalAlpha = 0.055;
        ctx.fillStyle = "#38bdf8";
        ctx.beginPath();
        ctx.arc(width * 0.22 + Math.sin(t * 0.28) * 26, height * 0.18 + Math.cos(t * 0.22) * 20, Math.min(width, height) * 0.34, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#f43f5e";
        ctx.beginPath();
        ctx.arc(width * 0.84 + Math.cos(t * 0.24) * 24, height * 0.86 + Math.sin(t * 0.31) * 22, Math.min(width, height) * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.save();
        if (msState.shake > 0) {
            var shakeAmount = msState.shake * msState.shake * 9;
            ctx.translate((Math.random() - 0.5) * shakeAmount, (Math.random() - 0.5) * shakeAmount);
        }

        var cell = msState.cell;
        var ox = msState.originX;
        var oy = msState.originY;
        var boardW = cell * msState.cols;
        var boardH = cell * msState.rows;
        var panelPad = Math.max(6, cell * 0.22);

        ctx.save();
        ctx.shadowColor = "rgba(2, 132, 199, 0.3)";
        ctx.shadowBlur = msState.winPulse > 0 ? 28 + msState.winPulse * 24 : 18;
        msRoundRect(ctx, ox - panelPad, oy - panelPad, boardW + panelPad * 2, boardH + panelPad * 2, Math.min(22, cell));
        ctx.fillStyle = "rgba(6, 13, 24, 0.72)";
        ctx.fill();
        ctx.restore();

        msRoundRect(ctx, ox - panelPad, oy - panelPad, boardW + panelPad * 2, boardH + panelPad * 2, Math.min(22, cell));
        ctx.strokeStyle = msState.winPulse > 0
            ? "rgba(56, 189, 248, " + (0.25 + msState.winPulse * 0.5) + ")"
            : "rgba(56, 189, 248, 0.17)";
        ctx.lineWidth = msState.winPulse > 0 ? 2 : 1;
        ctx.stroke();

        for (var idx = 0; idx < msState.cells.length; idx++) {
            var c = idx % msState.cols;
            var r = Math.floor(idx / msState.cols);
            var x = ox + c * cell;
            var y = oy + r * cell;
            var tile = msState.cells[idx];
            var hovered = msState.hover === idx;

            if (!tile.revealed || tile.revealT <= 0) {
                msDrawCover(ctx, tile, x, y, cell, hovered);
            } else {
                msDrawRevealed(ctx, tile, x, y, cell, hovered);
            }
        }

        msDrawParticles(ctx);
        msDrawRings(ctx);
        msDrawFloaters(ctx);
        ctx.restore();

        if (msState.flash > 0) {
            ctx.fillStyle = "rgba(244, 63, 94, " + msState.flash * 0.34 + ")";
            ctx.fillRect(0, 0, width, height);
        }
    }

    function msUpdate(dt) {
        msState.time += dt;
        var i;

        for (i = 0; i < msState.cells.length; i++) {
            var cell = msState.cells[i];
            if (cell.revealed && cell.revealT < 1) {
                if (cell.revealDelay > 0) {
                    cell.revealDelay -= dt * 1000;
                } else {
                    cell.revealT = Math.min(1, cell.revealT + dt / 0.22);
                }
            }
            if (cell.flagged && cell.flagT < 1) {
                if (cell.flagDelay > 0) {
                    cell.flagDelay -= dt * 1000;
                } else {
                    cell.flagT = Math.min(1, cell.flagT + dt / 0.24);
                }
            }
            if (cell.chordWobble > 0) {
                cell.chordWobble = Math.max(0, cell.chordWobble - dt * 3);
            }
        }

        for (i = msState.particles.length - 1; i >= 0; i--) {
            var particle = msState.particles[i];
            particle.life -= dt;
            if (particle.life <= 0) {
                msState.particles.splice(i, 1);
                continue;
            }
            particle.vy += particle.g * dt;
            particle.vx *= Math.max(0, 1 - particle.drag * dt);
            particle.vy *= Math.max(0, 1 - particle.drag * dt * 0.35);
            particle.x += particle.vx * dt;
            particle.y += particle.vy * dt;
            if (particle.vr) {
                particle.rot += particle.vr * dt;
            }
        }

        for (i = msState.rings.length - 1; i >= 0; i--) {
            var ring = msState.rings[i];
            ring.life -= dt * 1.5;
            if (ring.life <= 0) {
                msState.rings.splice(i, 1);
                continue;
            }
            ring.radius += (ring.maxRadius - ring.radius) * Math.min(1, dt * 3.2);
        }

        for (i = msState.floaters.length - 1; i >= 0; i--) {
            var floater = msState.floaters[i];
            floater.life -= dt;
            if (floater.life <= 0) {
                msState.floaters.splice(i, 1);
                continue;
            }
            floater.y -= 28 * dt;
        }

        if (msState.shake > 0) {
            msState.shake = Math.max(0, msState.shake - dt * 2.1);
        }
        if (msState.flash > 0) {
            msState.flash = Math.max(0, msState.flash - dt * 1.7);
        }
        if (msState.winPulse > 0) {
            msState.winPulse = Math.max(0, msState.winPulse - dt * 0.5);
        }

        if (msState.mode === "playing") {
            var seconds = Math.floor(msElapsedMs() / 1000);
            if (seconds !== msState.lastTimerSec) {
                msState.lastTimerSec = seconds;
                if (msTimerEl) {
                    msTimerEl.textContent = msFormatTime(seconds);
                }
            }
        }
    }

    function msLoop(now) {
        var dt = Math.min((now - (msState.lastTime || now)) / 1000, 0.05);
        msState.lastTime = now;
        if (msState.active) {
            msUpdate(dt);
            msRender();
        }
        requestAnimationFrame(msLoop);
    }

    function msBindEvents() {
        if (!msCanvas) {
            return;
        }

        var press = { id: null, idx: -1, x: 0, y: 0, moved: false, longFired: false, timer: null };

        function clearLongPress() {
            if (press.timer) {
                clearTimeout(press.timer);
                press.timer = null;
            }
        }

        if (msStartBtn) {
            msStartBtn.addEventListener("click", function (ev) {
                ev.stopPropagation();
                msNewGame();
            });
        }
        if (msAgainBtn) {
            msAgainBtn.addEventListener("click", function (ev) {
                ev.stopPropagation();
                msNewGame();
            });
        }
        if (msFlagBtn) {
            msFlagBtn.addEventListener("click", function (ev) {
                ev.stopPropagation();
                msToggleFlagMode();
            });
        }
        if (msDiffGroup) {
            msDiffGroup.addEventListener("click", function (ev) {
                var btn = ev.target.closest("[data-ms-diff]");
                if (!btn) {
                    return;
                }
                var key = btn.getAttribute("data-ms-diff");
                if (key && key !== msState.diff) {
                    msSetDifficulty(key);
                }
            });
        }

        msCanvas.addEventListener("pointerdown", function (ev) {
            if (msState.mode === "over") {
                return;
            }
            var idx = msHitTest(ev);
            if (idx < 0) {
                return;
            }
            if (ev.button === 2) {
                ev.preventDefault();
                msToggleFlag(idx);
                press.longFired = true;
                return;
            }
            press.id = ev.pointerId;
            press.idx = idx;
            press.x = ev.clientX;
            press.y = ev.clientY;
            press.moved = false;
            press.longFired = false;
            msState.hover = idx;
            clearLongPress();
            press.timer = setTimeout(function () {
                if (press.moved || press.id == null) {
                    return;
                }
                press.longFired = true;
                var target = press.idx;
                var cell = msState.cells[target];
                if (msState.flagMode) {
                    if (cell && cell.revealed) {
                        msChord(target);
                    } else {
                        msReveal(target);
                    }
                } else {
                    msToggleFlag(target);
                }
                if (navigator.vibrate) {
                    try {
                        navigator.vibrate(18);
                    } catch (e) {}
                }
            }, 380);
            try {
                msCanvas.setPointerCapture(ev.pointerId);
            } catch (e) {}
            if (ev.pointerType !== "touch") {
                ev.preventDefault();
            }
        });

        msCanvas.addEventListener("pointermove", function (ev) {
            if (press.id != null) {
                var dx = ev.clientX - press.x;
                var dy = ev.clientY - press.y;
                if (Math.abs(dx) + Math.abs(dy) > 12) {
                    press.moved = true;
                }
            }
            if (ev.pointerType === "mouse") {
                msState.hover = msHitTest(ev);
            }
        });

        msCanvas.addEventListener("pointerup", function (ev) {
            clearLongPress();
            if (press.id == null) {
                return;
            }
            var wasLong = press.longFired;
            var moved = press.moved;
            press.id = null;
            if (wasLong || moved || msState.mode === "over" || ev.button === 2) {
                return;
            }
            var idx = msHitTest(ev);
            if (idx < 0) {
                return;
            }
            if (msState.flagMode) {
                msToggleFlag(idx);
            } else {
                msPrimaryAction(idx);
            }
        });

        msCanvas.addEventListener("pointercancel", function () {
            clearLongPress();
            press.id = null;
            press.longFired = false;
        });

        msCanvas.addEventListener("pointerleave", function (ev) {
            if (press.id != null) {
                press.moved = true;
            }
            clearLongPress();
            if (ev.pointerType === "mouse") {
                msState.hover = -1;
            }
        });

        msCanvas.addEventListener("contextmenu", function (ev) {
            ev.preventDefault();
        });
    }

    msBindEvents();
    msRebuild("easy");
    msUpdateHud();

    if (window.ResizeObserver && msArena) {
        try {
            new ResizeObserver(function () {
                if (msState.active) {
                    msResize();
                }
            }).observe(msArena);
        } catch (e) {}
    }
    window.addEventListener("resize", function () {
        if (msState.active) {
            msResize();
        }
    });
    document.addEventListener("visibilitychange", function () {
        if (document.hidden) {
            msPauseClock();
            slopePause();
        } else {
            if (msState.active) {
                msResumeClock();
            }
            if (slopeState.active && slopeState.mode === "playing") {
                slopeResume();
            }
        }
    });
    requestAnimationFrame(msLoop);

    // =========================================================================
    // --- Neon Slope (Three.js 3D Endless Runner with 2D Fallback) ---
    // =========================================================================
    var slopeStage = document.getElementById("slope-stage");
    var slopeViewport = document.getElementById("slope-viewport");
    var slopeCanvas = document.getElementById("slope-canvas");
    var slopeScoreEl = document.getElementById("slope-score");
    var slopeComboEl = document.getElementById("slope-combo");
    var slopePopEl = document.getElementById("slope-pop");
    var slopeSpeedPill = document.getElementById("slope-speed-pill");
    var slopeGemsEl = document.getElementById("slope-gems-count");
    var slopeStartOverlay = document.getElementById("slope-start-overlay");
    var slopeOverOverlay = document.getElementById("slope-over-overlay");
    var slopeStartBtn = document.getElementById("slope-start-btn");
    var slopeAgainBtn = document.getElementById("slope-again-btn");
    var slopeOverScore = document.getElementById("slope-over-score");
    var slopeOverCombo = document.getElementById("slope-over-combo");
    var slopeOverBest = document.getElementById("slope-over-best");
    var slopeOverRank = document.getElementById("slope-over-rank");
    var slopeRecordBanner = document.getElementById("slope-record-banner");
    var slopeSaveStatus = document.getElementById("slope-save-status");
    var slopeTouchLeft = document.getElementById("slope-touch-left");
    var slopeTouchRight = document.getElementById("slope-touch-right");
    var slopeTouchJump = document.getElementById("slope-touch-jump");

    var SLOPE_TRACK_WIDTH = 9.0;
    var SLOPE_HALF_TRACK = SLOPE_TRACK_WIDTH / 2;
    var SLOPE_SEGMENT_LEN = 30.0;
    var SLOPE_ANGLE = 0.16;
    var SLOPE_TAN = Math.tan(SLOPE_ANGLE);

    var slopeState = {
        active: false,
        mode: "idle",
        distance: 0,
        score: 0,
        gems: 0,
        combo: 0,
        maxCombo: 0,
        speed: 34.0,
        ball: {
            x: 0,
            y: 0,
            z: 0,
            vx: 0,
            vy: 0,
            isJumping: false,
            isFalling: false,
            fallTime: 0,
            radius: 0.45,
            roll: 0
        },
        segments: [],
        nextSegmentZ: 0,
        lastTime: 0,
        submitted: false,
        gameId: 0,
        leaderboard: null,
        popTimer: null,
        animFrame: null
    };

    var slopeInput = {
        left: false,
        right: false
    };

    var slopeThreeRenderer = null;
    var slopeThreeScene = null;
    var slopeThreeCamera = null;
    var slopeBallMesh = null;
    var slopeBallLight = null;
    var slopeTrackGroup = null;
    var slopeEffectsGroup = null;
    var slopeUseThree = false;
    var slopeFallbackCtx = null;

    function playSlopeJump() {
        var ctx = ensureAudio();
        if (!ctx) return;
        try {
            var now = ctx.currentTime;
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.type = "triangle";
            osc.frequency.setValueAtTime(180, now);
            osc.frequency.exponentialRampToValueAtTime(560, now + 0.16);
            gain.gain.setValueAtTime(0.09, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.20);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.20);
        } catch (e) {}
    }

    function playSlopeGem() {
        var ctx = ensureAudio();
        if (!ctx) return;
        try {
            var now = ctx.currentTime;
            [1046.5, 1567.98].forEach(function (freq, i) {
                var osc = ctx.createOscillator();
                var gain = ctx.createGain();
                osc.type = "sine";
                var t = now + i * 0.055;
                osc.frequency.setValueAtTime(freq, t);
                gain.gain.setValueAtTime(0.12, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(t);
                osc.stop(t + 0.24);
            });
        } catch (e) {}
    }

    function playSlopeCrash() {
        var ctx = ensureAudio();
        if (!ctx) return;
        try {
            var now = ctx.currentTime;
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.exponentialRampToValueAtTime(32, now + 0.35);
            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.38);
        } catch (e) {}
    }

    function slopeInitGraphics() {
        if (!slopeCanvas || !slopeViewport) return;
        if (window.THREE) {
            try {
                slopeThreeRenderer = new THREE.WebGLRenderer({
                    canvas: slopeCanvas,
                    antialias: true,
                    alpha: true,
                    powerPreference: "high-performance"
                });
                slopeThreeRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
                slopeThreeScene = new THREE.Scene();

                var aspect = (slopeViewport.clientWidth || 640) / (slopeViewport.clientHeight || 520);
                slopeThreeCamera = new THREE.PerspectiveCamera(65, aspect, 0.1, 350);

                var ambient = new THREE.AmbientLight(0xffffff, 0.55);
                slopeThreeScene.add(ambient);

                var dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
                dirLight.position.set(12, 28, 16);
                slopeThreeScene.add(dirLight);

                slopeTrackGroup = new THREE.Group();
                slopeEffectsGroup = new THREE.Group();
                slopeThreeScene.add(slopeTrackGroup);
                slopeThreeScene.add(slopeEffectsGroup);

                var ballGeo = new THREE.SphereGeometry(slopeState.ball.radius, 22, 22);
                var ballMat = new THREE.MeshStandardMaterial({
                    color: 0x00f0ff,
                    emissive: 0x0088aa,
                    roughness: 0.2,
                    metalness: 0.8
                });
                slopeBallMesh = new THREE.Mesh(ballGeo, ballMat);
                slopeBallLight = new THREE.PointLight(0x00f0ff, 1.8, 14);
                slopeThreeScene.add(slopeBallMesh);
                slopeThreeScene.add(slopeBallLight);

                var starGeo = new THREE.BoxGeometry(0.18, 0.18, 0.18);
                for (var i = 0; i < 48; i++) {
                    var starMat = new THREE.MeshBasicMaterial({
                        color: i % 2 === 0 ? 0x22d3ee : 0xf43f5e,
                        transparent: true,
                        opacity: 0.35 + (i % 4) * 0.12
                    });
                    var star = new THREE.Mesh(starGeo, starMat);
                    star.position.set(
                        (Math.random() - 0.5) * 40,
                        Math.random() * 30 - 5,
                        Math.random() * 200
                    );
                    slopeEffectsGroup.add(star);
                }

                slopeUseThree = true;
            } catch (err) {
                slopeUseThree = false;
            }
        }

        if (!slopeUseThree) {
            slopeFallbackCtx = slopeCanvas.getContext("2d");
        }
        slopeResize();
    }

    function slopeResize() {
        if (!slopeViewport || !slopeCanvas) return;
        var w = Math.max(slopeViewport.clientWidth || 640, 280);
        var h = Math.max(slopeViewport.clientHeight || 520, 320);

        if (slopeUseThree && slopeThreeRenderer && slopeThreeCamera) {
            slopeThreeRenderer.setSize(w, h, false);
            slopeThreeCamera.aspect = w / h;
            slopeThreeCamera.updateProjectionMatrix();
        } else if (slopeFallbackCtx) {
            var dpr = Math.min(window.devicePixelRatio || 1, 2);
            slopeCanvas.width = Math.floor(w * dpr);
            slopeCanvas.height = Math.floor(h * dpr);
        }
    }

    function slopeCreateSegment(zStart) {
        var zEnd = zStart + SLOPE_SEGMENT_LEN;
        var obstacles = [];
        var gems = [];
        var mesh = null;

        var yStart = -zStart * SLOPE_TAN;
        var yEnd = -zEnd * SLOPE_TAN;
        var midZ = (zStart + zEnd) / 2;
        var midY = (yStart + yEnd) / 2;

        if (slopeUseThree && slopeThreeScene) {
            mesh = new THREE.Group();

            var planeGeo = new THREE.PlaneGeometry(SLOPE_TRACK_WIDTH, SLOPE_SEGMENT_LEN);
            var planeMat = new THREE.MeshStandardMaterial({
                color: 0x090d1a,
                roughness: 0.4,
                metalness: 0.5
            });
            var plane = new THREE.Mesh(planeGeo, planeMat);
            plane.rotation.x = -Math.PI / 2 + SLOPE_ANGLE;
            plane.position.set(0, midY, midZ);
            mesh.add(plane);

            var railGeo = new THREE.BoxGeometry(0.2, 0.4, SLOPE_SEGMENT_LEN);
            var railMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
            var leftRail = new THREE.Mesh(railGeo, railMat);
            leftRail.rotation.x = SLOPE_ANGLE;
            leftRail.position.set(SLOPE_HALF_TRACK, midY + 0.2, midZ);
            var rightRail = new THREE.Mesh(railGeo, railMat);
            rightRail.rotation.x = SLOPE_ANGLE;
            rightRail.position.set(-SLOPE_HALF_TRACK, midY + 0.2, midZ);
            mesh.add(leftRail);
            mesh.add(rightRail);

            var dashGeo = new THREE.BoxGeometry(0.12, 0.05, SLOPE_SEGMENT_LEN * 0.4);
            var dashMat = new THREE.MeshBasicMaterial({ color: 0xa855f7 });
            var dash = new THREE.Mesh(dashGeo, dashMat);
            dash.rotation.x = SLOPE_ANGLE;
            dash.position.set(0, midY + 0.02, midZ);
            mesh.add(dash);

            slopeTrackGroup.add(mesh);
        }

        if (zStart >= 40) {
            var lanes = [-3.0, -1.5, 0, 1.5, 3.0];
            var numObs = Math.random() < 0.65 ? 2 : 1;
            var usedLanes = [];

            for (var o = 0; o < numObs; o++) {
                var avail = lanes.filter(function (l) { return usedLanes.indexOf(l) === -1; });
                if (avail.length === 0) break;
                var laneX = avail[Math.floor(Math.random() * avail.length)];
                usedLanes.push(laneX);

                var obsZ = zStart + 6.0 + o * 11.0 + Math.random() * 3.0;
                var obsY = -obsZ * SLOPE_TAN;
                var type = Math.random() < 0.5 ? "spike" : "barrier";
                var obsW = type === "barrier" ? 2.6 : 1.2;
                var obsH = type === "barrier" ? 0.8 : 1.1;
                var obsD = type === "barrier" ? 0.7 : 1.2;

                var obsMesh = null;
                if (slopeUseThree) {
                    var geo = type === "barrier"
                        ? new THREE.BoxGeometry(obsW, obsH, obsD)
                        : new THREE.ConeGeometry(0.65, obsH, 5);
                    var mat = new THREE.MeshStandardMaterial({
                        color: 0x881337,
                        emissive: 0xf43f5e,
                        roughness: 0.3
                    });
                    obsMesh = new THREE.Mesh(geo, mat);
                    if (type === "spike") {
                        obsMesh.position.set(laneX, obsY + obsH / 2, obsZ);
                    } else {
                        obsMesh.rotation.x = SLOPE_ANGLE;
                        obsMesh.position.set(laneX, obsY + obsH / 2, obsZ);
                    }
                    mesh.add(obsMesh);
                }

                obstacles.push({
                    x: laneX,
                    y: obsY,
                    z: obsZ,
                    w: obsW,
                    h: obsH,
                    d: obsD,
                    type: type,
                    passed: false,
                    mesh: obsMesh
                });
            }

            var gemAvail = lanes.filter(function (l) { return usedLanes.indexOf(l) === -1; });
            if (gemAvail.length > 0 && Math.random() < 0.75) {
                var gemX = gemAvail[Math.floor(Math.random() * gemAvail.length)];
                var gemZ = zStart + 12.0 + Math.random() * 6.0;
                var gemY = -gemZ * SLOPE_TAN + 0.65;
                var gemMesh = null;
                if (slopeUseThree) {
                    var gGeo = new THREE.OctahedronGeometry(0.35);
                    var gMat = new THREE.MeshStandardMaterial({
                        color: 0x06b6d4,
                        emissive: 0x22d3ee,
                        roughness: 0.1
                    });
                    gemMesh = new THREE.Mesh(gGeo, gMat);
                    gemMesh.position.set(gemX, gemY, gemZ);
                    mesh.add(gemMesh);
                }
                gems.push({
                    x: gemX,
                    y: gemY,
                    z: gemZ,
                    collected: false,
                    mesh: gemMesh
                });
            }
        }

        return {
            zStart: zStart,
            zEnd: zEnd,
            mesh: mesh,
            obstacles: obstacles,
            gems: gems
        };
    }

    function slopeUpdateSegments() {
        var ballZ = slopeState.ball.z;
        while (slopeState.segments.length > 0 && slopeState.segments[0].zEnd < ballZ - 35) {
            var oldSeg = slopeState.segments.shift();
            if (oldSeg.mesh && slopeTrackGroup) {
                slopeTrackGroup.remove(oldSeg.mesh);
            }
        }
        while (slopeState.nextSegmentZ < ballZ + 180) {
            var newSeg = slopeCreateSegment(slopeState.nextSegmentZ);
            slopeState.segments.push(newSeg);
            slopeState.nextSegmentZ += SLOPE_SEGMENT_LEN;
        }
    }

    function slopeJump() {
        if (slopeState.mode !== "playing") return;
        var ball = slopeState.ball;
        if (!ball.isJumping && !ball.isFalling) {
            ball.vy = 13.5;
            ball.isJumping = true;
            playSlopeJump();
        }
    }

    function slopeStartGame() {
        slopeState.mode = "playing";
        slopeState.gameId++;
        slopeState.submitted = false;
        slopeState.distance = 0;
        slopeState.score = 0;
        slopeState.gems = 0;
        slopeState.combo = 0;
        slopeState.maxCombo = 0;
        slopeState.speed = 34.0;
        slopeInput.left = false;
        slopeInput.right = false;

        var ball = slopeState.ball;
        ball.x = 0;
        ball.y = 0;
        ball.z = 0;
        ball.vx = 0;
        ball.vy = 0;
        ball.isJumping = false;
        ball.isFalling = false;
        ball.fallTime = 0;
        ball.roll = 0;

        if (slopeTrackGroup) {
            clearThreeGroup(slopeTrackGroup);
        }
        slopeState.segments = [];
        slopeState.nextSegmentZ = 0;
        slopeUpdateSegments();

        if (slopeStartOverlay) slopeStartOverlay.hidden = true;
        if (slopeOverOverlay) slopeOverOverlay.hidden = true;
        if (slopeRecordBanner) slopeRecordBanner.hidden = true;

        updateSlopeHud();
        slopeState.lastTime = performance.now();
        if (!slopeState.animFrame) {
            slopeState.animFrame = requestAnimationFrame(slopeLoop);
        }
    }

    function slopeTriggerCrash() {
        if (slopeState.mode === "gameover") return;
        slopeState.mode = "gameover";
        playSlopeCrash();

        if (slopeOverScore) slopeOverScore.textContent = String(slopeState.score);
        if (slopeOverCombo) slopeOverCombo.textContent = "×" + slopeState.maxCombo;

        var prevBest = slopeState.leaderboard && slopeState.leaderboard.myRecord ? slopeState.leaderboard.myRecord.bestScore : 0;
        var optBest = Math.max(prevBest, slopeState.score);
        if (slopeOverBest) slopeOverBest.textContent = String(optBest);
        if (slopeOverRank) {
            var curRank = slopeState.leaderboard && slopeState.leaderboard.myRecord ? "#" + slopeState.leaderboard.myRecord.rank : "—";
            slopeOverRank.textContent = curRank;
        }
        if (slopeRecordBanner) {
            slopeRecordBanner.hidden = !(slopeState.score > prevBest && slopeState.score > 0);
        }
        if (slopeSaveStatus) {
            slopeSaveStatus.textContent = slopeState.score > 0 ? "Saving score to global leaderboard…" : "Play again to post a score!";
        }
        if (slopeOverOverlay) {
            slopeOverOverlay.hidden = false;
        }

        slopeSubmitScore();
    }

    function slopeUpdate(dt) {
        if (slopeState.mode !== "playing") return;
        dt = Math.min(dt, 0.05);
        var ball = slopeState.ball;

        slopeState.speed = Math.min(84.0, slopeState.speed + 0.65 * dt);
        ball.z += slopeState.speed * dt;
        slopeState.distance = ball.z;
        ball.roll += slopeState.speed * dt * 2.2;

        var targetVx = 0;
        if (slopeInput.left) targetVx = 14.5;
        else if (slopeInput.right) targetVx = -14.5;

        ball.vx += (targetVx - ball.vx) * Math.min(1.0, 14.0 * dt);
        ball.x += ball.vx * dt;

        if (ball.isJumping || ball.isFalling) {
            ball.vy -= 36.0 * dt;
            ball.y += ball.vy * dt;
            if (!ball.isFalling && ball.y <= 0) {
                ball.y = 0;
                ball.vy = 0;
                ball.isJumping = false;
            }
        }

        if (!ball.isFalling && Math.abs(ball.x) > SLOPE_HALF_TRACK - 0.1) {
            ball.isFalling = true;
            ball.isJumping = true;
        }

        if (ball.isFalling) {
            ball.fallTime += dt;
            if (ball.fallTime > 0.45) {
                slopeTriggerCrash();
                return;
            }
        }

        slopeUpdateSegments();

        var groundY = -ball.z * SLOPE_TAN;
        var ballWorldY = groundY + ball.y;

        for (var s = 0; s < slopeState.segments.length; s++) {
            var seg = slopeState.segments[s];
            if (seg.zEnd < ball.z - 5 || seg.zStart > ball.z + 15) continue;

            for (var o = 0; o < seg.obstacles.length; o++) {
                var obs = seg.obstacles[o];
                if (obs.passed) continue;

                var dz = Math.abs(ball.z - obs.z);
                var dx = Math.abs(ball.x - obs.x);

                if (!ball.isFalling && dz < (obs.d / 2 + ball.radius * 0.75) && dx < (obs.w / 2 + ball.radius * 0.75)) {
                    if (ball.y < obs.h * 0.85) {
                        slopeTriggerCrash();
                        return;
                    }
                }

                if (ball.z > obs.z + 1.2) {
                    obs.passed = true;
                    slopeState.combo++;
                    slopeState.maxCombo = Math.max(slopeState.maxCombo, slopeState.combo);
                    updateSlopeHud();
                }
            }

            for (var g = 0; g < seg.gems.length; g++) {
                var gem = seg.gems[g];
                if (gem.collected) continue;

                if (gem.mesh) {
                    gem.mesh.rotation.y += 3.5 * dt;
                }

                var gdz = Math.abs(ball.z - gem.z);
                var gdx = Math.abs(ball.x - gem.x);
                var gdy = Math.abs(ballWorldY - gem.y);

                if (gdz < 1.1 && gdx < 1.1 && gdy < 1.3) {
                    gem.collected = true;
                    if (gem.mesh) gem.mesh.visible = false;
                    slopeState.gems++;
                    slopeState.combo += 2;
                    slopeState.maxCombo = Math.max(slopeState.maxCombo, slopeState.combo);
                    playSlopeGem();
                    showSlopePop("+25 CRYSTAL!");
                    updateSlopeHud();
                }
            }
        }

        var distScore = Math.floor(ball.z * 0.15);
        slopeState.score = Math.min(10000, distScore + slopeState.gems * 25);
        updateSlopeHud();
    }

    function updateSlopeHud() {
        if (slopeScoreEl) slopeScoreEl.textContent = String(slopeState.score);
        if (slopeComboEl) {
            if (slopeState.combo >= 2) {
                slopeComboEl.textContent = "STREAK ×" + slopeState.combo;
                slopeComboEl.hidden = false;
            } else {
                slopeComboEl.hidden = true;
            }
        }
        if (slopeGemsEl) slopeGemsEl.textContent = String(slopeState.gems);
        if (slopeSpeedPill) {
            slopeSpeedPill.textContent = (slopeState.speed / 34.0).toFixed(1) + "× Speed";
        }
    }

    function showSlopePop(text) {
        if (!slopePopEl) return;
        slopePopEl.textContent = text;
        slopePopEl.hidden = false;
        if (slopeState.popTimer) clearTimeout(slopeState.popTimer);
        slopeState.popTimer = setTimeout(function () {
            if (slopePopEl) slopePopEl.hidden = true;
        }, 1100);
    }

    function slopeRender() {
        var ball = slopeState.ball;
        var groundY = -ball.z * SLOPE_TAN;

        if (slopeUseThree && slopeThreeRenderer && slopeThreeCamera) {
            if (slopeBallMesh) {
                slopeBallMesh.position.set(ball.x, groundY + ball.y + ball.radius, ball.z);
                slopeBallMesh.rotation.x = ball.roll;
                slopeBallMesh.rotation.z = -ball.vx * 0.08;
            }
            if (slopeBallLight) {
                slopeBallLight.position.set(ball.x, groundY + ball.y + 1.2, ball.z);
            }
            slopeThreeCamera.position.set(
                ball.x * 0.45,
                groundY + ball.y + 2.8,
                ball.z - 6.8
            );
            slopeThreeCamera.lookAt(
                ball.x * 0.25,
                groundY + ball.y + 0.6,
                ball.z + 16.0
            );

            slopeThreeRenderer.render(slopeThreeScene, slopeThreeCamera);
        } else if (slopeFallbackCtx && slopeCanvas) {
            slopeDrawFallback(slopeFallbackCtx, slopeCanvas.width, slopeCanvas.height);
        }
    }

    function slopeDrawFallback(ctx, width, height) {
        var ball = slopeState.ball;
        var groundY = -ball.z * SLOPE_TAN;

        ctx.fillStyle = "#060914";
        ctx.fillRect(0, 0, width, height);

        var grad = ctx.createLinearGradient(0, 0, 0, height * 0.45);
        grad.addColorStop(0, "#1e0b36");
        grad.addColorStop(1, "#070b18");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height * 0.45);

        function project(x, y, z) {
            var relZ = z - ball.z + 6.8;
            if (relZ <= 0.6) return null;
            var fov = height * 0.75;
            var scale = fov / relZ;
            var camX = ball.x * 0.45;
            var camY = groundY + ball.y + 2.8;
            var sx = width / 2 - (x - camX) * scale;
            var sy = height / 2 - (y - camY) * scale;
            return { x: sx, y: sy, scale: scale };
        }

        var pNearL = project(SLOPE_HALF_TRACK, -ball.z * SLOPE_TAN, ball.z);
        var pNearR = project(-SLOPE_HALF_TRACK, -ball.z * SLOPE_TAN, ball.z);
        var farZ = ball.z + 120.0;
        var pFarL = project(SLOPE_HALF_TRACK, -farZ * SLOPE_TAN, farZ);
        var pFarR = project(-SLOPE_HALF_TRACK, -farZ * SLOPE_TAN, farZ);

        if (pNearL && pNearR && pFarL && pFarR) {
            ctx.beginPath();
            ctx.moveTo(pNearL.x, pNearL.y);
            ctx.lineTo(pNearR.x, pNearR.y);
            ctx.lineTo(pFarR.x, pFarR.y);
            ctx.lineTo(pFarL.x, pFarL.y);
            ctx.closePath();
            ctx.fillStyle = "#0a0e1c";
            ctx.fill();

            ctx.strokeStyle = "#00f0ff";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(pNearL.x, pNearL.y);
            ctx.lineTo(pFarL.x, pFarL.y);
            ctx.moveTo(pNearR.x, pNearR.y);
            ctx.lineTo(pFarR.x, pFarR.y);
            ctx.stroke();

            ctx.strokeStyle = "rgba(168, 85, 247, 0.4)";
            ctx.lineWidth = 1.5;
            var gridSpacing = 6.0;
            var startZ = Math.floor(ball.z / gridSpacing) * gridSpacing;
            for (var gz = startZ; gz < ball.z + 100; gz += gridSpacing) {
                var gy = -gz * SLOPE_TAN;
                var gL = project(SLOPE_HALF_TRACK, gy, gz);
                var gR = project(-SLOPE_HALF_TRACK, gy, gz);
                if (gL && gR) {
                    ctx.beginPath();
                    ctx.moveTo(gL.x, gL.y);
                    ctx.lineTo(gR.x, gR.y);
                    ctx.stroke();
                }
            }
        }

        for (var s = 0; s < slopeState.segments.length; s++) {
            var seg = slopeState.segments[s];
            if (seg.zEnd < ball.z - 2 || seg.zStart > ball.z + 100) continue;

            for (var o = 0; o < seg.obstacles.length; o++) {
                var obs = seg.obstacles[o];
                var p = project(obs.x, obs.y + obs.h / 2, obs.z);
                if (p) {
                    var ow = obs.w * p.scale;
                    var oh = obs.h * p.scale;
                    ctx.fillStyle = "rgba(244, 63, 94, 0.9)";
                    ctx.strokeStyle = "#fda4af";
                    ctx.lineWidth = 2;
                    ctx.fillRect(p.x - ow / 2, p.y - oh / 2, ow, oh);
                    ctx.strokeRect(p.x - ow / 2, p.y - oh / 2, ow, oh);
                }
            }

            for (var g = 0; g < seg.gems.length; g++) {
                var gem = seg.gems[g];
                if (gem.collected) continue;
                var gp = project(gem.x, gem.y, gem.z);
                if (gp) {
                    var gr = 0.5 * gp.scale;
                    ctx.save();
                    ctx.translate(gp.x, gp.y);
                    ctx.rotate(performance.now() * 0.003);
                    ctx.fillStyle = "#22d3ee";
                    ctx.beginPath();
                    ctx.moveTo(0, -gr);
                    ctx.lineTo(gr, 0);
                    ctx.lineTo(0, gr);
                    ctx.lineTo(-gr, 0);
                    ctx.closePath();
                    ctx.fill();
                    ctx.restore();
                }
            }
        }

        var bp = project(ball.x, groundY + ball.y + ball.radius, ball.z);
        if (bp) {
            var br = ball.radius * bp.scale;
            ctx.beginPath();
            ctx.arc(bp.x, bp.y, br * 1.35, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(0, 240, 255, 0.25)";
            ctx.fill();

            ctx.beginPath();
            ctx.arc(bp.x, bp.y, br, 0, Math.PI * 2);
            ctx.fillStyle = "#00f0ff";
            ctx.fill();
            ctx.strokeStyle = "#e0f2fe";
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }

    function slopeLoop(now) {
        if (!slopeState.active && slopeState.mode !== "playing") {
            slopeState.animFrame = null;
            return;
        }
        var dt = (now - (slopeState.lastTime || now)) / 1000;
        slopeState.lastTime = now;
        slopeUpdate(dt);
        slopeRender();
        slopeState.animFrame = requestAnimationFrame(slopeLoop);
    }

    function slopePause() {
        if (slopeState.animFrame) {
            cancelAnimationFrame(slopeState.animFrame);
            slopeState.animFrame = null;
        }
    }

    function slopeResume() {
        if (slopeState.active && !slopeState.animFrame) {
            slopeState.lastTime = performance.now();
            slopeState.animFrame = requestAnimationFrame(slopeLoop);
        }
    }

    async function slopeSubmitScore() {
        if (slopeState.submitted) return;
        slopeState.submitted = true;
        var gameId = slopeState.gameId;
        var score = Math.max(0, Math.min(10000, Math.round(slopeState.score)));
        var combo = Math.max(0, Math.min(10000, Math.round(slopeState.maxCombo)));

        try {
            var res = await window.mcwut.api("/api/games/neon-slope/scores", {
                method: "POST",
                headers: window.mcwut.headers({ "Content-Type": "application/json" }),
                body: JSON.stringify({ score: score, maxCombo: combo })
            });
            if (!res) return;
            slopeState.leaderboard = res.leaderboard;
            if (GAME_KEY === "neon-slope") {
                renderLeaderboard(res.leaderboard);
            }
            if (gameId !== slopeState.gameId) return;
            if (slopeOverRank) {
                slopeOverRank.textContent = res.rank ? "#" + res.rank : "—";
            }
            if (slopeRecordBanner) {
                slopeRecordBanner.hidden = !res.isNewBest;
            }
            if (res.isNewBest) {
                playNewRecordFanfare();
            }
            if (slopeSaveStatus) {
                slopeSaveStatus.textContent = res.isNewBest
                    ? "New personal record saved to the global leaderboard!"
                    : "Score recorded. Personal best: " + res.bestScore + ".";
            }
        } catch (err) {
            if (slopeSaveStatus && gameId === slopeState.gameId) {
                slopeSaveStatus.textContent = "Could not save score: " + (err.message || "Network error");
            }
        }
    }

    if (slopeStartBtn) {
        slopeStartBtn.addEventListener("click", function (ev) {
            ev.stopPropagation();
            slopeStartGame();
        });
    }
    if (slopeAgainBtn) {
        slopeAgainBtn.addEventListener("click", function (ev) {
            ev.stopPropagation();
            slopeStartGame();
        });
    }
    if (slopeTouchLeft) {
        slopeTouchLeft.addEventListener("pointerdown", function (ev) {
            ev.preventDefault();
            slopeInput.left = true;
        });
        slopeTouchLeft.addEventListener("pointerup", function (ev) {
            ev.preventDefault();
            slopeInput.left = false;
        });
        slopeTouchLeft.addEventListener("pointercancel", function () {
            slopeInput.left = false;
        });
    }
    if (slopeTouchRight) {
        slopeTouchRight.addEventListener("pointerdown", function (ev) {
            ev.preventDefault();
            slopeInput.right = true;
        });
        slopeTouchRight.addEventListener("pointerup", function (ev) {
            ev.preventDefault();
            slopeInput.right = false;
        });
        slopeTouchRight.addEventListener("pointercancel", function () {
            slopeInput.right = false;
        });
    }
    if (slopeTouchJump) {
        slopeTouchJump.addEventListener("pointerdown", function (ev) {
            ev.preventDefault();
            slopeJump();
        });
    }
    if (slopeViewport) {
        var slopePointerActive = false;
        slopeViewport.addEventListener("pointerdown", function (ev) {
            if (GAME_KEY !== "neon-slope") return;
            if (ev.target.closest("button") || ev.target.closest(".slope-touch-zones")) return;
            if (slopeState.mode === "idle") {
                slopeStartGame();
                return;
            }
            if (slopeState.mode === "playing") {
                slopePointerActive = true;
                var rect = slopeViewport.getBoundingClientRect();
                var clickRelX = (ev.clientX - rect.left) / rect.width;
                if (clickRelX < 0.38) {
                    slopeInput.left = true;
                    slopeInput.right = false;
                } else if (clickRelX > 0.62) {
                    slopeInput.right = true;
                    slopeInput.left = false;
                } else {
                    slopeJump();
                }
            }
        });
        window.addEventListener("pointerup", function () {
            if (slopePointerActive) {
                slopePointerActive = false;
                slopeInput.left = false;
                slopeInput.right = false;
            }
        });
    }

    // =========================================================================
    // --- 2048 Neon (Reactive 4×4 Grid Puzzle) ---
    // =========================================================================
    var n2048Stage = document.getElementById("neon2048-stage");
    var n2048Board = document.getElementById("n2048-board");
    var n2048ScoreEl = document.getElementById("n2048-score");
    var n2048MaxTileEl = document.getElementById("n2048-max-tile");
    var n2048MovesEl = document.getElementById("n2048-moves");
    var n2048UndoBtn = document.getElementById("n2048-undo-btn");
    var n2048ResetBtn = document.getElementById("n2048-reset-btn");
    var n2048StartOverlay = document.getElementById("n2048-start-overlay");
    var n2048WinOverlay = document.getElementById("n2048-win-overlay");
    var n2048OverOverlay = document.getElementById("n2048-over-overlay");
    var n2048StartBtn = document.getElementById("n2048-start-btn");
    var n2048AgainBtn = document.getElementById("n2048-again-btn");
    var n2048WinAgainBtn = document.getElementById("n2048-win-again-btn");
    var n2048KeepGoingBtn = document.getElementById("n2048-keep-going-btn");
    var n2048WinScore = document.getElementById("n2048-win-score");
    var n2048WinTile = document.getElementById("n2048-win-tile");
    var n2048WinBest = document.getElementById("n2048-win-best");
    var n2048WinRank = document.getElementById("n2048-win-rank");
    var n2048OverScore = document.getElementById("n2048-over-score");
    var n2048OverTile = document.getElementById("n2048-over-tile");
    var n2048OverBest = document.getElementById("n2048-over-best");
    var n2048OverRank = document.getElementById("n2048-over-rank");
    var n2048RecordBanner = document.getElementById("n2048-record-banner");
    var n2048WinRecordBanner = document.getElementById("n2048-win-record-banner");
    var n2048SaveStatus = document.getElementById("n2048-save-status");

    var n2048State = {
        active: false,
        mode: "idle",
        grid: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        undoGrid: null,
        undoScore: 0,
        score: 0,
        moves: 0,
        maxTile: 2,
        combo: 0,
        maxCombo: 0,
        hasWon2048: false,
        submitted: false,
        gameId: 0,
        popIndices: [],
        leaderboard: null
    };

    function play2048Merge(val) {
        var ctx = ensureAudio();
        if (!ctx) return;
        try {
            var noteMap = {
                4: 261.63, 8: 293.66, 16: 329.63, 32: 392.00,
                64: 440.00, 128: 523.25, 256: 659.25, 512: 783.99,
                1024: 1046.50, 2048: 1318.51
            };
            var freq = noteMap[val] || 1318.51;
            var now = ctx.currentTime;
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.type = val >= 256 ? "triangle" : "sine";
            osc.frequency.setValueAtTime(freq, now);
            osc.frequency.exponentialRampToValueAtTime(freq * 1.01, now + 0.16);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.22);

            if (val >= 128) {
                var osc2 = ctx.createOscillator();
                var gain2 = ctx.createGain();
                osc2.type = "sine";
                osc2.frequency.setValueAtTime(freq * 1.5, now + 0.04);
                gain2.gain.setValueAtTime(0.06, now + 0.04);
                gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
                osc2.connect(gain2);
                gain2.connect(ctx.destination);
                osc2.start(now + 0.04);
                osc2.stop(now + 0.28);
            }
        } catch (e) {}
    }

    function play2048Slide() {
        var ctx = ensureAudio();
        if (!ctx) return;
        try {
            var now = ctx.currentTime;
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(180, now);
            osc.frequency.exponentialRampToValueAtTime(110, now + 0.08);
            gain.gain.setValueAtTime(0.04, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.08);
        } catch (e) {}
    }

    function play2048Invalid() {
        var ctx = ensureAudio();
        if (!ctx) return;
        try {
            var now = ctx.currentTime;
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.type = "triangle";
            osc.frequency.setValueAtTime(95, now);
            gain.gain.setValueAtTime(0.06, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.09);
        } catch (e) {}
    }

    function play2048GameOver() {
        var ctx = ensureAudio();
        if (!ctx) return;
        try {
            var now = ctx.currentTime;
            var notes = [293.66, 261.63, 220.00, 164.81];
            notes.forEach(function (freq, i) {
                var osc = ctx.createOscillator();
                var gain = ctx.createGain();
                osc.type = "sawtooth";
                var t = now + i * 0.1;
                osc.frequency.setValueAtTime(freq, t);
                gain.gain.setValueAtTime(0.06, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(t);
                osc.stop(t + 0.22);
            });
        } catch (e) {}
    }

    function n2048SpawnTile() {
        var empties = [];
        for (var i = 0; i < 16; i++) {
            if (n2048State.grid[i] === 0) empties.push(i);
        }
        if (empties.length === 0) return -1;
        var pick = empties[Math.floor(Math.random() * empties.length)];
        n2048State.grid[pick] = Math.random() < 0.9 ? 2 : 4;
        return pick;
    }

    function n2048IsGameOver() {
        for (var i = 0; i < 16; i++) {
            if (n2048State.grid[i] === 0) return false;
        }
        for (var r = 0; r < 4; r++) {
            for (var c = 0; c < 4; c++) {
                var val = n2048State.grid[r * 4 + c];
                if (c < 3 && val === n2048State.grid[r * 4 + c + 1]) return false;
                if (r < 3 && val === n2048State.grid[(r + 1) * 4 + c]) return false;
            }
        }
        return true;
    }

    function n2048RenderBoard() {
        if (!n2048Board) return;
        n2048Board.innerHTML = "";
        for (var i = 0; i < 16; i++) {
            var val = n2048State.grid[i];
            var cell = document.createElement("div");
            cell.className = "n2048-cell";
            if (val > 0) {
                var tileCls = val <= 2048 ? "tile-" + val : "tile-super";
                cell.classList.add(tileCls);
                cell.textContent = String(val);
                if (n2048State.popIndices && n2048State.popIndices.indexOf(i) !== -1) {
                    cell.classList.add("is-pop");
                }
            }
            n2048Board.appendChild(cell);
        }
        n2048State.popIndices = [];

        if (n2048ScoreEl) n2048ScoreEl.textContent = String(n2048State.score);
        if (n2048MaxTileEl) n2048MaxTileEl.textContent = String(n2048State.maxTile);
        if (n2048MovesEl) n2048MovesEl.textContent = String(n2048State.moves);
    }

    function n2048StartGame() {
        n2048State.mode = "playing";
        n2048State.gameId++;
        n2048State.submitted = false;
        n2048State.grid = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        n2048State.undoGrid = null;
        n2048State.undoScore = 0;
        n2048State.score = 0;
        n2048State.moves = 0;
        n2048State.maxTile = 2;
        n2048State.combo = 0;
        n2048State.maxCombo = 0;
        n2048State.hasWon2048 = false;

        if (n2048UndoBtn) n2048UndoBtn.disabled = true;
        if (n2048StartOverlay) n2048StartOverlay.hidden = true;
        if (n2048WinOverlay) n2048WinOverlay.hidden = true;
        if (n2048OverOverlay) n2048OverOverlay.hidden = true;
        if (n2048RecordBanner) n2048RecordBanner.hidden = true;
        if (n2048WinRecordBanner) n2048WinRecordBanner.hidden = true;

        n2048SpawnTile();
        n2048SpawnTile();
        n2048RenderBoard();
    }

    function n2048TriggerWin() {
        playNewRecordFanfare();
        if (n2048WinScore) n2048WinScore.textContent = String(n2048State.score);
        if (n2048WinTile) n2048WinTile.textContent = String(n2048State.maxTile);
        var prevBest = n2048State.leaderboard && n2048State.leaderboard.myRecord ? n2048State.leaderboard.myRecord.bestScore : 0;
        if (n2048WinBest) n2048WinBest.textContent = String(Math.max(prevBest, n2048State.score));
        if (n2048WinRank) {
            var curRank = n2048State.leaderboard && n2048State.leaderboard.myRecord ? "#" + n2048State.leaderboard.myRecord.rank : "—";
            n2048WinRank.textContent = curRank;
        }
        if (n2048WinRecordBanner) {
            n2048WinRecordBanner.hidden = !(n2048State.score > prevBest && n2048State.score > 0);
        }
        if (n2048WinOverlay) n2048WinOverlay.hidden = false;
        n2048SubmitScore();
    }

    function n2048TriggerGameOver() {
        if (n2048State.mode === "gameover") return;
        n2048State.mode = "gameover";
        play2048GameOver();

        if (n2048OverScore) n2048OverScore.textContent = String(n2048State.score);
        if (n2048OverTile) n2048OverTile.textContent = String(n2048State.maxTile);

        var prevBest = n2048State.leaderboard && n2048State.leaderboard.myRecord ? n2048State.leaderboard.myRecord.bestScore : 0;
        var optBest = Math.max(prevBest, n2048State.score);
        if (n2048OverBest) n2048OverBest.textContent = String(optBest);
        if (n2048OverRank) {
            var curRank = n2048State.leaderboard && n2048State.leaderboard.myRecord ? "#" + n2048State.leaderboard.myRecord.rank : "—";
            n2048OverRank.textContent = curRank;
        }
        if (n2048RecordBanner) {
            n2048RecordBanner.hidden = !(n2048State.score > prevBest && n2048State.score > 0);
        }
        if (n2048SaveStatus) {
            n2048SaveStatus.textContent = n2048State.score > 0 ? "Saving score to global leaderboard…" : "Play again to post a score!";
        }
        if (n2048OverOverlay) {
            n2048OverOverlay.hidden = false;
        }

        n2048SubmitScore();
    }

    function n2048Undo() {
        if (!n2048State.undoGrid || n2048State.mode !== "playing") return;
        n2048State.grid = n2048State.undoGrid.slice();
        n2048State.score = n2048State.undoScore;
        n2048State.undoGrid = null;
        if (n2048UndoBtn) n2048UndoBtn.disabled = true;
        n2048RenderBoard();
    }

    function n2048Slide(dir) {
        if (n2048State.mode !== "playing") return false;
        var moved = false;
        var scoreGained = 0;
        var mergedAny = false;
        var newGrid = n2048State.grid.slice();
        var mergedIndices = [];

        function processLine(indices) {
            var line = indices.map(function (idx) { return newGrid[idx]; });
            var filtered = line.filter(function (v) { return v !== 0; });
            var merged = [];
            var skip = false;
            for (var i = 0; i < filtered.length; i++) {
                if (skip) {
                    skip = false;
                    continue;
                }
                if (i < filtered.length - 1 && filtered[i] === filtered[i + 1]) {
                    var val = filtered[i] * 2;
                    merged.push(val);
                    scoreGained += val;
                    mergedAny = true;
                    skip = true;
                } else {
                    merged.push(filtered[i]);
                }
            }
            while (merged.length < 4) {
                merged.push(0);
            }
            for (var j = 0; j < 4; j++) {
                var oldVal = newGrid[indices[j]];
                var newVal = merged[j];
                if (oldVal !== newVal) {
                    moved = true;
                }
                newGrid[indices[j]] = newVal;
                if (newVal > oldVal && oldVal !== 0) {
                    mergedIndices.push(indices[j]);
                }
            }
        }

        if (dir === "left") {
            for (var r = 0; r < 4; r++) processLine([r * 4, r * 4 + 1, r * 4 + 2, r * 4 + 3]);
        } else if (dir === "right") {
            for (var r = 0; r < 4; r++) processLine([r * 4 + 3, r * 4 + 2, r * 4 + 1, r * 4]);
        } else if (dir === "up") {
            for (var c = 0; c < 4; c++) processLine([c, c + 4, c + 8, c + 12]);
        } else if (dir === "down") {
            for (var c = 0; c < 4; c++) processLine([c + 12, c + 8, c + 4, c]);
        }

        if (!moved) {
            play2048Invalid();
            return false;
        }

        n2048State.undoGrid = n2048State.grid.slice();
        n2048State.undoScore = n2048State.score;
        if (n2048UndoBtn) n2048UndoBtn.disabled = false;

        n2048State.grid = newGrid;
        n2048State.score = Math.min(10000, n2048State.score + scoreGained);
        n2048State.moves++;

        if (mergedAny) {
            n2048State.combo++;
            n2048State.maxCombo = Math.max(n2048State.maxCombo, n2048State.combo);
            var maxVal = 4;
            for (var m = 0; m < mergedIndices.length; m++) {
                if (newGrid[mergedIndices[m]] > maxVal) {
                    maxVal = newGrid[mergedIndices[m]];
                }
            }
            play2048Merge(maxVal);
        } else {
            n2048State.combo = 0;
            play2048Slide();
        }

        var spawnedIdx = n2048SpawnTile();
        n2048State.popIndices = mergedIndices.concat(spawnedIdx >= 0 ? [spawnedIdx] : []);

        var curMax = 2;
        for (var k = 0; k < 16; k++) {
            if (n2048State.grid[k] > curMax) curMax = n2048State.grid[k];
        }
        n2048State.maxTile = Math.max(n2048State.maxTile, curMax);

        if (n2048State.maxTile >= 2048 && !n2048State.hasWon2048) {
            n2048State.hasWon2048 = true;
            n2048TriggerWin();
        }

        if (n2048IsGameOver()) {
            n2048TriggerGameOver();
        }

        n2048RenderBoard();
        return true;
    }

    async function n2048SubmitScore() {
        if (n2048State.submitted) return;
        n2048State.submitted = true;
        var gameId = n2048State.gameId;
        var score = Math.max(0, Math.min(10000, Math.round(n2048State.score)));
        var combo = Math.max(0, Math.min(score, Math.round(n2048State.maxTile)));

        try {
            var res = await window.mcwut.api("/api/games/merge-2048/scores", {
                method: "POST",
                headers: window.mcwut.headers({ "Content-Type": "application/json" }),
                body: JSON.stringify({ score: score, maxCombo: combo })
            });
            if (!res) return;
            n2048State.leaderboard = res.leaderboard;
            if (GAME_KEY === "merge-2048") {
                renderLeaderboard(res.leaderboard);
            }
            if (gameId !== n2048State.gameId) return;
            if (n2048OverRank) {
                n2048OverRank.textContent = res.rank ? "#" + res.rank : "—";
            }
            if (n2048RecordBanner) {
                n2048RecordBanner.hidden = !res.isNewBest;
            }
            if (n2048WinRecordBanner) {
                n2048WinRecordBanner.hidden = !res.isNewBest;
            }
            if (res.isNewBest) {
                playNewRecordFanfare();
            }
            if (n2048SaveStatus) {
                n2048SaveStatus.textContent = res.isNewBest
                    ? "New personal record saved to the global leaderboard!"
                    : "Score recorded. Personal best: " + res.bestScore + ".";
            }
        } catch (err) {
            if (n2048SaveStatus && gameId === n2048State.gameId) {
                n2048SaveStatus.textContent = "Could not save score: " + (err.message || "Network error");
            }
        }
    }

    if (n2048StartBtn) {
        n2048StartBtn.addEventListener("click", function (ev) {
            ev.stopPropagation();
            n2048StartGame();
        });
    }
    if (n2048AgainBtn) {
        n2048AgainBtn.addEventListener("click", function (ev) {
            ev.stopPropagation();
            n2048StartGame();
        });
    }
    if (n2048WinAgainBtn) {
        n2048WinAgainBtn.addEventListener("click", function (ev) {
            ev.stopPropagation();
            n2048StartGame();
        });
    }
    if (n2048KeepGoingBtn) {
        n2048KeepGoingBtn.addEventListener("click", function (ev) {
            ev.stopPropagation();
            if (n2048WinOverlay) n2048WinOverlay.hidden = true;
            n2048State.mode = "playing";
        });
    }
    if (n2048UndoBtn) {
        n2048UndoBtn.addEventListener("click", function () {
            n2048Undo();
        });
    }
    if (n2048ResetBtn) {
        n2048ResetBtn.addEventListener("click", function () {
            n2048StartGame();
        });
    }

    if (n2048Board) {
        var touchStartX = 0;
        var touchStartY = 0;
        n2048Board.addEventListener("touchstart", function (ev) {
            if (ev.touches && ev.touches.length === 1) {
                touchStartX = ev.touches[0].clientX;
                touchStartY = ev.touches[0].clientY;
            }
        }, { passive: true });

        n2048Board.addEventListener("touchend", function (ev) {
            if (!ev.changedTouches || ev.changedTouches.length === 0) return;
            var dx = ev.changedTouches[0].clientX - touchStartX;
            var dy = ev.changedTouches[0].clientY - touchStartY;
            var absX = Math.abs(dx);
            var absY = Math.abs(dy);
            if (Math.max(absX, absY) > 28) {
                if (absX > absY) {
                    n2048Slide(dx > 0 ? "right" : "left");
                } else {
                    n2048Slide(dy > 0 ? "down" : "up");
                }
            }
        }, { passive: true });
    }

    if (n2048Stage) {
        n2048Stage.addEventListener("click", function (ev) {
            var btn = ev.target.closest(".n2048-dpad-btn");
            if (btn) {
                var dir = btn.getAttribute("data-dir");
                if (dir) {
                    n2048Slide(dir);
                }
            }
        });
    }

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
    var wwEdUndoBtn = document.getElementById("ww-ed-undo-btn");
    var wwEdClearBtn = document.getElementById("ww-ed-clear-btn");
    var wwEdTestBtn = document.getElementById("ww-ed-test-btn");
    var wwEdPublishBtn = document.getElementById("ww-ed-publish-btn");
    var wwReturnEditBtn = document.getElementById("ww-return-edit-btn");
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
    var wwStreakPill = document.getElementById("ww-streak-pill");
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
        finishX: WW_FINISH_X,
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
        squealCooldown: 0,
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
                stars: []
            };
        }
        return {
            version: 1,
            finishX: 2100,
            strips: [
                { pts: [[-120, 420], [280, 420], [560, 375], [840, 420], [1220, 420]] },
                { pts: [[1220, 420], [1420, 345]], boost: true },
                { pts: [[1620, 385], [1820, 420], [2300, 420]] }
            ],
            loops: [],
            springs: [{ x: 880, y: 420, w: 62 }],
            wreckingBalls: [],
            crates: [{ x: 1860, y: 420 }, { x: 1860, y: 386 }],
            stars: [
                { x: 560, y: 320 },
                { x: 1020, y: 270 },
                { x: 1520, y: 265 }
            ]
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

        // Strip 4: Final Gauntlet Hills -> Crate Pyramid -> Checkered Finish Runway
        var strip4 = [[3420, 430]];
        var finalHills = wwSampleSmoothSection(3420, 4480, 30, function (x, t) {
            if (x > 4180) {
                var blend = (x - 4180) / 300;
                return 430 - (1 - blend) * 24 * Math.sin(t * Math.PI * 4);
            }
            return 430 - 38 * Math.sin(t * Math.PI * 3.0);
        });
        for (var fh = 1; fh < finalHills.length; fh++) strip4.push(finalHills[fh]);
        strip4.push([4650, 430], [5350, 430]);
        wwAddPolyline(segments, buckets, strip4, "main", -1, -1);
        groundStrips.push({ pts: strip4, isRampEnd: false });

        var springs = [
            { x: 1210, y: 432, w: 62, anim: 0, cooldown: 0 },
            { x: 2350, y: 515, w: 68, anim: 0, cooldown: 0 },
            { x: 3735, y: 416, w: 62, anim: 0, cooldown: 0 }
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
            { x: 4346, y: 413, w: 34, h: 34, intact: true },
            { x: 4382, y: 413, w: 34, h: 34, intact: true },
            { x: 4328, y: 379, w: 34, h: 34, intact: true },
            { x: 4364, y: 379, w: 34, h: 34, intact: true }
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
            segments: segments,
            buckets: buckets,
            groundStrips: groundStrips,
            loops: loops,
            springs: springs,
            wreckingBalls: wreckingBalls,
            crates: crates,
            stars: stars
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
            wwAddPolyline(segments, buckets, pts, "main", boostMin, boostMax);
            groundStrips.push({ pts: pts, boost: !!sp.boost });
        }

        if (!hasSpawn) {
            var spawnPts = [[-120, 420], [280, 420]];
            wwAddPolyline(segments, buckets, spawnPts, "main");
            groundStrips.unshift({ pts: spawnPts, boost: false });
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
            groundStrips.push({ pts: endRunway, boost: false });
        }

        var loopsIn = Array.isArray(d.loops) ? d.loops : [];
        for (var li = 0; li < loopsIn.length; li++) {
            var lp = loopsIn[li];
            if (!lp) continue;
            wwAddLoopToCourse(segments, buckets, groundStrips, loops, Number(lp.x) || 1200, Number(lp.y) || 275, Number(lp.r) || 150);
        }

        var springs = (Array.isArray(d.springs) ? d.springs : []).map(function (s) {
            return { x: Number(s.x) || 600, y: Number(s.y) || 420, w: Number(s.w) || 62, anim: 0, cooldown: 0 };
        });

        var wreckingBalls = (Array.isArray(d.wreckingBalls) ? d.wreckingBalls : []).map(function (w, idx) {
            return {
                pivotX: Number(w.pivotX) || 900,
                pivotY: Number(w.pivotY) || 130,
                length: Number(w.length) || 205,
                radius: Number(w.radius) || 28,
                amp: Number(w.amp) || 0.7,
                speed: Number(w.speed) || 2.15,
                phase: w.phase !== undefined ? Number(w.phase) : idx * 1.3
            };
        });

        var crates = (Array.isArray(d.crates) ? d.crates : []).map(function (c) {
            return { x: Number(c.x) || 600, y: Number(c.y) || 420, w: 34, h: 34, intact: true };
        });

        var stars = (Array.isArray(d.stars) ? d.stars : []).map(function (st, idx) {
            return { x: Number(st.x) || 500, y: Number(st.y) || 340, collected: false, bobPhase: idx * 0.65 };
        });

        return {
            isOfficial: false,
            finishX: finishX,
            segments: segments,
            buckets: buckets,
            groundStrips: groundStrips,
            loops: loops,
            springs: springs,
            wreckingBalls: wreckingBalls,
            crates: crates,
            stars: stars
        };
    }

    // --- Vehicle & 5-Segment Articulated Toy Ragdoll Creation ---
    function wwCreateEntities() {
        var ch = {
            x: WW_START_X,
            y: 372,
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
            { mountX: -40, mountY: 8, x: WW_START_X - 40, y: 396, vx: 0, vy: 0, r: 21, mass: 1.35, spin: 0, grounded: false },
            { mountX: 40, mountY: 8, x: WW_START_X + 40, y: 396, vx: 0, vy: 0, r: 21, mass: 1.35, spin: 0, grounded: false }
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

        var ch = wwState.chassis;
        var pts = wwState.rider.pts;
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
            wwAddFloatText(pts[3].x, pts[3].y - 24, reasonText || "BONK!", "#fb7185");
            wwShowBanner(reasonText || "TOY WIPEOUT!");
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
        if (layer === "main") return true;
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

    function wwComputeLiveScore(completed) {
        var span = Math.max(400, wwState.finishX - WW_START_X);
        var progress = Math.max(0, Math.min(1, (wwState.maxDistX - WW_START_X) / span));
        var basePts = completed ? 2000 : Math.round(progress * 800);
        var timeBonus = completed
            ? Math.max(0, Math.min(3000, Math.round(((45.0 - Math.max(8.0, wwState.elapsed)) / 37.0) * 3000)))
            : 0;
        var starPts = wwState.starsCollected * 100;
        var raw = basePts + timeBonus + starPts + wwState.stuntPts;
        return Math.max(0, Math.min(10000, Math.round(raw)));
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
                    var cp = wwClosestOnSegment(wh.x, wh.y, seg);
                    var distX = wh.x - cp.x;
                    var distY = wh.y - cp.y;
                    var dist = Math.hypot(distX, distY);
                    if (dist < wh.r && dist > 0.0001) {
                        var sideDot = distX * seg.nx + distY * seg.ny;
                        if (sideDot < -10) continue;
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

                        // Forward tangent along track
                        var ctxT = -cny;
                        var ctyT = cnx;
                        var vt = wh.vx * ctxT + wh.vy * ctyT;

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
                }
            }
        }

        // Chassis nose/tail bumper collision against terrain
        var bumpers = [-42, 42];
        for (var bi = 0; bi < 2; bi++) {
            var bWorldX = ch.x + bumpers[bi] * cosA;
            var bWorldY = ch.y + bumpers[bi] * sinA;
            var bRad = 13;
            var bBucket = Math.floor(bWorldX / WW_BUCKET_W);
            var bSegs = course.buckets[bBucket];
            if (!bSegs) continue;
            for (var bs = 0; bs < bSegs.length; bs++) {
                var bSeg = bSegs[bs];
                if (!wwIsSegmentActive(bSeg)) continue;
                var bcp = wwClosestOnSegment(bWorldX, bWorldY, bSeg);
                var bdx = bWorldX - bcp.x;
                var bdy = bWorldY - bcp.y;
                var bDist = Math.hypot(bdx, bdy);
                if (bDist < bRad && bDist > 0.001) {
                    var bPen = bRad - bDist;
                    ch.x += bSeg.nx * bPen;
                    ch.y += bSeg.ny * bPen;
                    var bvn = ch.vx * bSeg.nx + ch.vy * bSeg.ny;
                    if (bvn < 0) {
                        ch.vx -= bSeg.nx * bvn * 1.2;
                        ch.vy -= bSeg.ny * bvn * 1.2;
                    }
                }
            }
        }

        // --- Airtime & Flip Trick Tracking ---
        var anyGrounded = wheels[0].grounded || wheels[1].grounded;
        if (wwState.riderSeated) {
            if (!anyGrounded) {
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
                    var mult = Math.min(wwState.combo, 6);
                    var ptsGain = 200 * mult;
                    wwState.stuntPts += ptsGain;
                    playPerfectSound(wwState.combo);
                    wwSpawnBurst(ch.x, ch.y, 12, "toy");
                    var label = (isBackflip ? "BACKFLIP" : "FRONTFLIP") + " ×" + wwState.combo + "! +" + ptsGain;
                    wwAddFloatText(ch.x, ch.y - 48, label, "#4ade80");
                    wwShowBanner(label);
                }

                if (wwState.airTime >= 1.15 && !wwState.bigAirAwarded) {
                    wwState.bigAirAwarded = true;
                    wwState.combo++;
                    wwState.maxCombo = Math.max(wwState.maxCombo, wwState.combo);
                    wwState.stuntPts += 150;
                    wwAddFloatText(ch.x, ch.y - 36, "BIG AIR! +150", "#38bdf8");
                }
            } else {
                wwState.airTime = 0;
                wwState.airRotAccum = 0;
                wwState.bigAirAwarded = false;
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
            // Free ragdoll terrain collision
            for (var rp = 0; rp < pts.length; rp++) {
                var rPt = pts[rp];
                var rBx = Math.floor(rPt.x / WW_BUCKET_W);
                for (var rbOff = -1; rbOff <= 1; rbOff++) {
                    var rSegs = course.buckets[rBx + rbOff];
                    if (!rSegs) continue;
                    for (var rs = 0; rs < rSegs.length; rs++) {
                        var rSeg = rSegs[rs];
                        if (!wwIsSegmentActive(rSeg)) continue;
                        var rcp = wwClosestOnSegment(rPt.x, rPt.y, rSeg);
                        var rdx2 = rPt.x - rcp.x;
                        var rdy2 = rPt.y - rcp.y;
                        var rDist = Math.hypot(rdx2, rdy2);
                        if (rDist < rPt.r && rDist > 0.0001) {
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
                                // Rubbery bounce + slight surface friction
                                var bounceVx = rvx2 - rSeg.nx * rvn * 1.38;
                                var bounceVy = rvy2 - rSeg.ny * rvn * 1.38;
                                bounceVx *= 0.9;
                                rPt.px = rPt.x - bounceVx * subDt;
                                rPt.py = rPt.y - bounceVy * subDt;
                            }
                        }
                    }
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
                    wwSpawnBurst(sp.x, sp.y - 12, 12, "toy");
                    wwAddFloatText(sp.x, sp.y - 36, "BOING! +75", "#facc15");
                }
            }
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
            if (Math.abs(ch.x - cr.x) < cr.w * 0.5 + 36 && Math.abs(ch.y - (cr.y - cr.h * 0.5)) < cr.h * 0.5 + 24) {
                hitCrate = true;
                ch.vx *= 0.94;
            } else if (!wwState.riderSeated && Math.abs(pts[0].x - cr.x) < cr.w * 0.5 + 16 && Math.abs(pts[0].y - (cr.y - cr.h * 0.5)) < cr.h * 0.5 + 16) {
                hitCrate = true;
            }
            if (hitCrate) {
                cr.intact = false;
                wwState.stuntPts += 50;
                wwPlayPop();
                wwSpawnBurst(cr.x, cr.y - cr.h * 0.5, 10, "wood");
                wwAddFloatText(cr.x, cr.y - cr.h - 10, "SMASH! +50", "#fb923c");
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

        // Animate particles & floating texts even during gameover celebration
        for (var pi = wwState.particles.length - 1; pi >= 0; pi--) {
            var part = wwState.particles[pi];
            part.vy += 460 * dt;
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

        if (wwState.mode !== "playing") {
            wwSilenceAudio();
            return;
        }

        wwState.elapsed += dt;

        // 2 physics substeps per frame for rock-solid spring & ragdoll stability
        var subDt = dt * 0.5;
        wwStepPhysics(subDt);
        wwStepPhysics(subDt);

        var ch = wwState.chassis;
        var rider = wwState.rider;

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
        focusY = Math.max(130, Math.min(480, focusY));

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
            if (wwState.restTimer >= 0.95 || wwState.dismountTime >= 4.2 || rider.pts[0].y > 860) {
                wwFinishRun(false);
                return;
            }
        } else if (ch.y > 860) {
            wwFinishRun(false);
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
        if (wwHudScore) wwHudScore.textContent = String(wwState.score);

        if (wwStreakPill) {
            if (wwState.combo >= 1) {
                wwStreakPill.textContent = "STUNT STREAK ×" + wwState.combo;
                wwStreakPill.hidden = false;
            } else {
                wwStreakPill.hidden = true;
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
            wwSpawnBurst(wwState.finishX - 20, 340, 32, "toy");
            wwSpawnBurst(wwState.finishX + 35, 320, 32, "toy");
        } else {
            playGameOverSound();
        }

        var timeBonus = completed
            ? Math.max(0, Math.min(3000, Math.round(((45.0 - Math.max(8.0, wwState.elapsed)) / 37.0) * 3000)))
            : 0;
        var starPts = wwState.starsCollected * 100;
        var span = Math.max(400, wwState.finishX - WW_START_X);

        if (wwOverBadge) {
            if (wwState.playContext === "editor-test") {
                wwOverBadge.textContent = completed ? "TEST RUN CLEARED! 🏁" : "TEST RUN WIPEOUT!";
            } else {
                wwOverBadge.textContent = completed
                    ? (wwState.riderSeated ? "COURSE COMPLETE! 🏁" : "RAGDOLL FLYING FINISH! 🚀")
                    : (wwState.ejectedByPlayer ? "RAGDOLL DISMOUNT!" : "TOY RIDER WRECKED!");
            }
            wwOverBadge.style.background = completed ? "#16a34a" : "";
            wwOverBadge.style.color = completed ? "#ffffff" : "";
        }
        if (wwOverTitle) {
            wwOverTitle.textContent = completed ? "Checkered Flag!" : "Wiped Out!";
        }
        if (wwOverBreakdown) {
            if (completed) {
                wwOverBreakdown.textContent =
                    "Course +2000 · Time +" + timeBonus + " · Stars +" + starPts + " · Stunts +" + wwState.stuntPts + " (" + wwFormatTime(wwState.elapsed) + ")";
            } else {
                var pct = Math.max(0, Math.min(99, Math.round(((wwState.maxDistX - WW_START_X) / span) * 100)));
                wwOverBreakdown.textContent =
                    "Reached " + pct + "% of course · Stars +" + starPts + " · Stunts +" + wwState.stuntPts;
            }
        }
        if (wwOverScore) wwOverScore.textContent = String(finalScore);
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
            if (wwOverBest) wwOverBest.textContent = String(Math.max(prevLevelBest, completed ? finalScore : prevLevelBest));
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
        if (wwOverBest) wwOverBest.textContent = String(optBest);
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
            if (wwOverBest) wwOverBest.textContent = String(res.level.bestScore || 0);
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
        var score = Math.max(0, Math.min(10000, Math.round(wwState.score)));
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
            if (wwOverBest) wwOverBest.textContent = String(res.bestScore);
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

        var visLeft = wwState.camX - (w * 0.6) / scale - 160;
        var visRight = wwState.camX + (w * 0.8) / scale + 160;

        // Optional Blueprint Grid in Level Editor Mode
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

        // 3. Terrain Fills & Grassy / Neon Stunt Curbs
        for (var gs = 0; gs < course.groundStrips.length; gs++) {
            var gsObj = course.groundStrips[gs];
            var strip = gsObj.pts;
            if (!strip || strip.length < 2) continue;
            var minSx = Math.min(strip[0][0], strip[strip.length - 1][0]);
            var maxSx = Math.max(strip[0][0], strip[strip.length - 1][0]);
            if (maxSx < visLeft - 100 || minSx > visRight + 100) continue;

            ctx.beginPath();
            ctx.moveTo(strip[0][0], strip[0][1]);
            for (var sp = 1; sp < strip.length; sp++) {
                ctx.lineTo(strip[sp][0], strip[sp][1]);
            }
            ctx.lineTo(strip[strip.length - 1][0], 920);
            ctx.lineTo(strip[0][0], 920);
            ctx.closePath();

            var earthGrad = ctx.createLinearGradient(0, 320, 0, 620);
            earthGrad.addColorStop(0, "#1e293b");
            earthGrad.addColorStop(0.3, "#0f172a");
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
        if (finX + 140 >= visLeft && finX - 140 <= visRight) {
            ctx.fillStyle = "#e2e8f0";
            ctx.fillRect(finX - 8, 265, 10, 165);
            ctx.fillRect(finX + 76, 265, 10, 165);

            var cols = 12;
            var sq = 8;
            for (var r = 0; r < 4; r++) {
                for (var c = 0; c < cols; c++) {
                    ctx.fillStyle = (r + c) % 2 === 0 ? "#0f172a" : "#ffffff";
                    ctx.fillRect(finX - 8 + c * sq, 260 + r * sq, sq, sq);
                }
            }
            ctx.fillStyle = "#facc15";
            ctx.font = "900 13px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("🏁 FINISH", finX + 40, 252);
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

        // 12. Editor In-Progress Stroke & Ghost Cursor Preview
        if (wwState.mode === "editor") {
            if (wwEditor.drawingPts && wwEditor.drawingPts.length > 1) {
                ctx.beginPath();
                ctx.moveTo(wwEditor.drawingPts[0][0], wwEditor.drawingPts[0][1]);
                for (var dp = 1; dp < wwEditor.drawingPts.length; dp++) {
                    ctx.lineTo(wwEditor.drawingPts[dp][0], wwEditor.drawingPts[dp][1]);
                }
                ctx.strokeStyle = wwEditor.tool === "boost" ? "#facc15" : "#4ade80";
                ctx.lineWidth = 7;
                ctx.setLineDash([8, 5]);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            if (wwEditor.hoverWorld && !wwEditor.drawingPts && !wwEditor.panning) {
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
                } else if (wwEditor.tool === "star") {
                    wwDrawStarShape(ctx, hx, hy, 5, 13, 6, 0);
                    ctx.fillStyle = "#fde047";
                    ctx.fill();
                } else if (wwEditor.tool === "finish") {
                    ctx.strokeStyle = "#facc15";
                    ctx.lineWidth = 4;
                    ctx.strokeRect(hx - 8, 260, 94, 170);
                } else if (wwEditor.tool === "erase") {
                    ctx.strokeStyle = "#fb7185";
                    ctx.lineWidth = 2.5;
                    ctx.beginPath();
                    ctx.arc(hx, hy, 32, 0, Math.PI * 2);
                    ctx.stroke();
                } else if (wwEditor.tool === "road" || wwEditor.tool === "boost") {
                    ctx.fillStyle = wwEditor.tool === "boost" ? "#facc15" : "#4ade80";
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

    function wwPushUndo() {
        wwEditor.undoStack.push(JSON.stringify(wwEditor.data));
        if (wwEditor.undoStack.length > 25) wwEditor.undoStack.shift();
        if (wwEdUndoBtn) wwEdUndoBtn.disabled = false;
    }

    function wwEditorUndo() {
        if (wwEditor.undoStack.length === 0) return;
        try {
            wwEditor.data = JSON.parse(wwEditor.undoStack.pop());
            if (wwEdUndoBtn) wwEdUndoBtn.disabled = wwEditor.undoStack.length === 0;
            wwRefreshEditorCourse();
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
        wwState.camZoom = 0.88;
        wwRefreshEditorCourse();
        wwSyncModeUi();
        wwResume();
    }

    function wwSetEditorTool(toolName) {
        wwEditor.tool = toolName;
        if (wwToolPalette) {
            var btns = wwToolPalette.querySelectorAll("[data-ww-tool]");
            for (var i = 0; i < btns.length; i++) {
                btns[i].classList.toggle("is-active", btns[i].getAttribute("data-ww-tool") === toolName);
            }
        }
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
                if (s.layer !== "main") continue;
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

    function wwEraseAt(wx, wy) {
        var d = wwEditor.data;
        var r = 38;
        var changed = false;

        for (var i = d.stars.length - 1; i >= 0; i--) {
            if (Math.hypot(d.stars[i].x - wx, d.stars[i].y - wy) < r) {
                d.stars.splice(i, 1);
                changed = true;
            }
        }
        for (var c = d.crates.length - 1; c >= 0; c--) {
            if (Math.hypot(d.crates[c].x - wx, (d.crates[c].y - 17) - wy) < r) {
                d.crates.splice(c, 1);
                changed = true;
            }
        }
        for (var s = d.springs.length - 1; s >= 0; s--) {
            if (Math.hypot(d.springs[s].x - wx, d.springs[s].y - wy) < r + 10) {
                d.springs.splice(s, 1);
                changed = true;
            }
        }
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
        for (var st = d.strips.length - 1; st >= 0; st--) {
            var pts = d.strips[st].pts;
            for (var p = 0; p < pts.length - 1; p++) {
                var mx = (pts[p][0] + pts[p + 1][0]) * 0.5;
                var my = (pts[p][1] + pts[p + 1][1]) * 0.5;
                // Protect the initial spawn zone (-120..240)
                if (mx < 220 && Math.abs(my - 420) < 30) continue;
                if (Math.hypot(mx - wx, my - wy) < r || Math.hypot(pts[p + 1][0] - wx, pts[p + 1][1] - wy) < r) {
                    d.strips.splice(st, 1);
                    changed = true;
                    break;
                }
            }
        }

        if (changed) {
            wwRefreshEditorCourse();
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
            wwCanvas.setPointerCapture(ev.pointerId);

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
            var wx = Math.max(-120, Math.min(12000, pt.x));
            var wy = Math.max(-380, Math.min(760, pt.y));

            if (wwEditor.tool === "erase") {
                wwPushUndo();
                wwEditor.erasing = true;
                wwEraseAt(wx, wy);
                return;
            }

            if (wwEditor.tool === "road" || wwEditor.tool === "boost") {
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
                    if (Math.hypot(lastP[0] - wx, lastP[1] - wy) < 34) {
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
                var groundY = wwSnapToGroundY(Math.max(360, wx), wy);
                d.loops.push({ x: Math.max(360, wx), y: groundY - 150, r: 150 });
                wwPlayPop();
                wwRefreshEditorCourse();
            } else if (wwEditor.tool === "spring") {
                if (d.springs.length >= 30) return;
                wwPushUndo();
                var sy = wwSnapToGroundY(Math.max(200, wx), wy);
                d.springs.push({ x: Math.max(200, wx), y: sy, w: 62 });
                wwPlaySpring();
                wwRefreshEditorCourse();
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
                wwPlayPop();
                wwRefreshEditorCourse();
            } else if (wwEditor.tool === "crate") {
                if (d.crates.length >= 60) return;
                wwPushUndo();
                var crateY = wwSnapToGroundY(Math.max(220, wx), wy);
                var crateX = Math.max(220, wx);
                // Stack neatly onto an existing crate if clicked right above one
                for (var ci = 0; ci < d.crates.length; ci++) {
                    if (Math.abs(d.crates[ci].x - crateX) < 24 && Math.abs((d.crates[ci].y - 34) - wy) < 28) {
                        crateX = d.crates[ci].x;
                        crateY = d.crates[ci].y - 34;
                    }
                }
                d.crates.push({ x: crateX, y: crateY });
                wwPlayPop();
                wwRefreshEditorCourse();
            } else if (wwEditor.tool === "star") {
                if (d.stars.length >= 40) return;
                wwPushUndo();
                d.stars.push({ x: Math.max(180, wx), y: wy });
                wwPlayStar(d.stars.length);
                wwRefreshEditorCourse();
            } else if (wwEditor.tool === "finish") {
                wwPushUndo();
                d.finishX = Math.max(700, Math.min(12000, wx));
                wwPlayFinishHorn();
                wwRefreshEditorCourse();
            }
        });

        wwCanvas.addEventListener("pointermove", function (ev) {
            if (wwState.mode !== "editor") return;
            if (wwEditor.panning) {
                var baseScale = Math.max(0.56, Math.min(1.08, Math.min(wwState.viewW / 760, wwState.viewH / 440))) * wwState.camZoom;
                wwState.camX = Math.max(-80, Math.min(12200, wwEditor.panStartCamX - (ev.clientX - wwEditor.panStartClientX) / baseScale));
                wwState.camY = Math.max(-220, Math.min(620, wwEditor.panStartCamY - (ev.clientY - wwEditor.panStartClientY) / baseScale));
                wwEditor.savedCamX = wwState.camX;
                wwEditor.savedCamY = wwState.camY;
                return;
            }

            var pt = wwScreenToWorld(ev.clientX, ev.clientY);
            wwEditor.hoverWorld = pt;

            if (wwEditor.erasing) {
                wwEraseAt(pt.x, pt.y);
                return;
            }

            if (wwEditor.drawingPts) {
                var prev = wwEditor.drawingPts[wwEditor.drawingPts.length - 1];
                if (Math.hypot(pt.x - prev[0], pt.y - prev[1]) >= 24 && wwEditor.drawingPts.length < 48) {
                    wwEditor.drawingPts.push([
                        Math.max(-120, Math.min(12000, pt.x)),
                        Math.max(-380, Math.min(760, pt.y))
                    ]);
                }
            }
        });

        var finishPointer = function (ev) {
            if (wwState.mode !== "editor") return;
            wwEditor.panning = false;
            wwEditor.erasing = false;
            if (wwEditor.drawingPts) {
                if (wwEditor.drawingPts.length >= 2) {
                    var smoothed = wwSmoothPoints(wwEditor.drawingPts);
                    wwEditor.data.strips.push({
                        pts: smoothed,
                        boost: wwEditor.tool === "boost"
                    });
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
                    '<span>🏆 Record: <strong class="text-warning">' + lv.bestScore + " pts" + esc(tStr) + '</strong> by ' +
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
                '        <span>' + lv.playsCount + (lv.playsCount === 1 ? " play" : " plays") + " · " + lv.clearsCount + " clears</span>" +
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
        btn.addEventListener("pointerleave", release);
    }

    wwBindHoldButton(wwBtnLeft, "left");
    wwBindHoldButton(wwBtnRight, "right");
    wwBindHoldButton(wwBtnGas, "gas");
    wwBindHoldButton(wwBtnBrake, "brake");

    if (wwBtnEject) {
        wwBtnEject.addEventListener("pointerdown", function (ev) {
            ev.preventDefault();
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
        wwBtnEject.addEventListener("pointerleave", releaseEject);
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
    if (wwEdUndoBtn) {
        wwEdUndoBtn.addEventListener("click", function () {
            wwEditorUndo();
        });
    }
    if (wwEdClearBtn) {
        wwEdClearBtn.addEventListener("click", function () {
            wwPushUndo();
            wwEditor.data = wwDefaultEditorData(false);
            wwState.camX = 480;
            wwEditor.savedCamX = 480;
            wwRefreshEditorCourse();
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


    // =========================================================================
    // --- Cyber Breakout (Arcade Canvas 2D) ---
    // =========================================================================
    var CB_VW = 800;
    var CB_VH = 600;
    var CB_TAU = Math.PI * 2;
    var CB_MAX_LEVEL = 3;

    var CB_COLORS = {
        cyan:    "#00f0ff",
        magenta: "#ff007f",
        amber:   "#ffb700",
        lime:    "#00ff66",
        purple:  "#a050ff",
        blue:    "#4d7cff",
        red:     "#ff3b6b",
        teal:    "#00ffcc"
    };
    var CB_ROW_COLORS = [
        CB_COLORS.magenta, CB_COLORS.purple, CB_COLORS.cyan,
        CB_COLORS.lime, CB_COLORS.amber, CB_COLORS.blue,
        CB_COLORS.teal, CB_COLORS.red
    ];

    var CB_POWERUP_DEFS = {
        multiball: { color: CB_COLORS.cyan,    label: "M", name: "MULTI-BALL" },
        laser:     { color: CB_COLORS.magenta, label: "L", name: "LASER BLASTER" },
        wide:      { color: CB_COLORS.lime,    label: "W", name: "WIDE PADDLE" },
        fire:      { color: CB_COLORS.amber,   label: "F", name: "FIREBALL" },
        slow:      { color: CB_COLORS.purple,  label: "S", name: "SLOW-MO" }
    };
    var CB_POWERUP_KEYS = Object.keys(CB_POWERUP_DEFS);
    var CB_PENTATONIC = [0, 2, 4, 7, 9];

    function cbClamp(v, a, b) { return v < a ? a : v > b ? b : v; }

    function cbRoundRect(ctx, x, y, w, h, r) {
        r = Math.min(r, Math.abs(w) * 0.5, Math.abs(h) * 0.5);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    class CyberBreakoutGame {
        constructor(container, options = {}) {
            if (!container) throw new Error("CyberBreakoutGame: container element required.");

            this.container = container;
            this.options = options;

            // Host callbacks
            this.onScoreUpdate = typeof options.onScoreUpdate === "function" ? options.onScoreUpdate : function () {};
            this.onGameOver    = typeof options.onGameOver    === "function" ? options.onGameOver    : function () {};
            this.onGameWon     = typeof options.onGameWon     === "function" ? options.onGameWon     : function () {};

            // Lifecycle flags
            this.destroyed = false;
            this.paused    = false;
            this.muted     = !!options.muted;
            this.rafId     = 0;
            this.lastTime  = 0;

            // DOM / Canvas
            const cs = window.getComputedStyle(container);
            if (cs.position === "static") container.style.position = "relative";

            this.canvas = document.createElement("canvas");
            this.canvas.style.cssText =
                "position:absolute;inset:0;display:block;width:100%;height:100%;" +
                "touch-action:none;user-select:none;-webkit-user-select:none;";
            container.appendChild(this.canvas);
            this.ctx = this.canvas.getContext("2d", { alpha: false });

            this.dpr = 1; this.scale = 1; this.offX = 0; this.offY = 0;
            this._resize();

            // Responsive
            this._onResizeFallback = () => this._resize();
            if (typeof ResizeObserver !== "undefined") {
                this._ro = new ResizeObserver(() => this._resize());
                this._ro.observe(container);
            } else {
                window.addEventListener("resize", this._onResizeFallback);
            }

            // State
            this.time = 0;
            this.state = "ready";
            this.bricks = [];
            this.balls = [];
            this.particles = [];
            this.powerups = [];
            this.lasers = [];
            this.texts = [];

            this.paddle = {
                x: CB_VW / 2, y: 548, w: 110, h: 14,
                baseW: 110, wideW: 178, targetW: 110,
                sx: 1, sy: 1
            };
            this.paddleTargetX = null;
            this.pointerActive = false;
            this.keys = { left: false, right: false };

            this.score = 0; this.combo = 0; this.multiplier = 1; this.maxCombo = 0;
            this.lives = 3; this.level = 1;
            this.bricksRemaining = 0; this.bricksDestroyed = 0; this.ballsLost = 0;
            this.trauma = 0; this.hitStop = 0; this.slowMo = 0;
            this.laserTime = 0; this.wideTime = 0; this.fireTime = 0; this.laserCooldown = 0;
            this.awaitingLaunch = true; this.lifeFlash = 0;
            this.startTime = 0;

            // Audio
            this.audioCtx = null;
            this.masterGain = null;
            this._noiseBuffer = null;

            // Bound handlers
            this._hPointerDown = this._onPointerDown.bind(this);
            this._hPointerMove = this._onPointerMove.bind(this);
            this._hPointerUp   = this._onPointerUp.bind(this);
            this._hKeyDown     = this._onKeyDown.bind(this);
            this._hKeyUp       = this._onKeyUp.bind(this);
            this._hContextMenu = (e) => e.preventDefault();

            this.canvas.addEventListener("pointerdown", this._hPointerDown, { passive: false });
            window.addEventListener("pointermove", this._hPointerMove, { passive: true });
            window.addEventListener("pointerup", this._hPointerUp, { passive: true });
            window.addEventListener("pointercancel", this._hPointerUp, { passive: true });
            window.addEventListener("keydown", this._hKeyDown);
            window.addEventListener("keyup", this._hKeyUp);
            this.canvas.addEventListener("contextmenu", this._hContextMenu);

            this._render();
        }

        start() {
            if (this.destroyed) return;
            this.paused = false;
            this._resumeAudio();
            this._resetRun();
            this._startLoop();
        }

        pause() {
            if (this.destroyed) return;
            this.paused = true;
            if (this.audioCtx && this.audioCtx.state === "running") {
                this.audioCtx.suspend().catch(function () {});
            }
        }

        resume() {
            if (this.destroyed) return;
            this.paused = false;
            this.lastTime = 0;
            if (this.audioCtx && this.audioCtx.state === "suspended" && !this.muted) {
                this.audioCtx.resume().catch(function () {});
            }
            this._startLoop();
        }

        setMuted(flag) {
            this.muted = !!flag;
            if (this.masterGain && this.audioCtx) {
                this.masterGain.gain.setTargetAtTime(this.muted ? 0 : 0.45, this.audioCtx.currentTime, 0.02);
            }
            if (!this.muted) this._resumeAudio();
        }

        destroy() {
            if (this.destroyed) return;
            this.destroyed = true;
            if (this.rafId) cancelAnimationFrame(this.rafId);
            this.rafId = 0;

            this.canvas.removeEventListener("pointerdown", this._hPointerDown);
            window.removeEventListener("pointermove", this._hPointerMove);
            window.removeEventListener("pointerup", this._hPointerUp);
            window.removeEventListener("pointercancel", this._hPointerUp);
            window.removeEventListener("keydown", this._hKeyDown);
            window.removeEventListener("keyup", this._hKeyUp);
            this.canvas.removeEventListener("contextmenu", this._hContextMenu);
            window.removeEventListener("resize", this._onResizeFallback);

            if (this._ro) { this._ro.disconnect(); this._ro = null; }

            if (this.audioCtx) {
                try { this.audioCtx.close(); } catch (e) { /* noop */ }
                this.audioCtx = null;
            }
            if (this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
            this.bricks.length = 0;
            this.balls.length = 0;
            this.particles.length = 0;
            this.powerups.length = 0;
            this.lasers.length = 0;
            this.texts.length = 0;
        }

        _resize() {
            const rect = this.container.getBoundingClientRect();
            const w = Math.max(1, Math.round(rect.width));
            const h = Math.max(1, Math.round(rect.height));

            this.dpr = Math.min(window.devicePixelRatio || 1, 2);

            this.canvas.width  = Math.round(w * this.dpr);
            this.canvas.height = Math.round(h * this.dpr);
            this.canvas.style.width  = w + "px";
            this.canvas.style.height = h + "px";

            this.scale = Math.min(w / CB_VW, h / CB_VH);
            this.offX = (w - CB_VW * this.scale) * 0.5;
            this.offY = (h - CB_VH * this.scale) * 0.5;

            if (this.paused || this.state === "ready") this._render();
        }

        _toVirtualX(clientX) {
            const r = this.canvas.getBoundingClientRect();
            return (clientX - r.left - this.offX) / this.scale;
        }

        _resetRun() {
            this.score = 0;
            this.combo = 0;
            this.multiplier = 1;
            this.maxCombo = 0;
            this.lives = 3;
            this.level = 1;
            this.bricksDestroyed = 0;
            this.ballsLost = 0;
            this.trauma = 0;
            this.hitStop = 0;
            this.slowMo = 0;
            this.laserTime = 0;
            this.wideTime = 0;
            this.fireTime = 0;
            this.laserCooldown = 0;
            this.lifeFlash = 0;
            this.time = 0;
            this.particles.length = 0;
            this.powerups.length = 0;
            this.lasers.length = 0;
            this.texts.length = 0;

            this.paddle.w = this.paddle.baseW;
            this.paddle.targetW = this.paddle.baseW;
            this.paddle.x = CB_VW / 2;
            this.paddle.sx = 1; this.paddle.sy = 1;
            this.paddleTargetX = null;

            this.startTime = (typeof performance !== "undefined" ? performance.now() : Date.now());

            this._loadLevel(1);
            this._resetBall();
            this.state = "playing";
            this._emitScore();
        }

        _loadLevel(level) {
            this.bricks.length = 0;
            this.bricksRemaining = 0;

            const cols = 11;
            const rows = level === 1 ? 5 : 6;
            const left = 60, right = 60, top = 78;
            const gapX = 6, gapY = 6, bh = 26;
            const bw = (CB_VW - left - right - gapX * (cols - 1)) / cols;

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    if (level === 2 && r === 0 && c % 3 === 1) continue;
                    if (level === 3 && r === 0 && c % 4 === 0) continue;

                    let type = "standard";
                    let hp = 1;

                    if (level >= 2 && r <= 1) { type = "reinforced"; hp = (level >= 3 && r === 0) ? 3 : 2; }
                    if (level >= 3 && r === 2) { type = "reinforced"; hp = 2; }

                    const x = left + c * (bw + gapX);
                    const y = top + r * (bh + gapY);

                    this.bricks.push({
                        x: x, y: y, w: bw, h: bh,
                        type: type, hp: hp, maxHp: hp,
                        color: CB_ROW_COLORS[r % CB_ROW_COLORS.length],
                        alive: true, flash: 0,
                        seed: Math.random() * 100
                    });
                }
            }

            const tntCount = level >= 2 ? level + 1 : 0;
            for (let i = 0; i < tntCount; i++) this._convertRandomBrick("tnt");

            const carrierCount = 2 + level;
            for (let i = 0; i < carrierCount; i++) this._convertRandomBrick("carrier");

            this.bricksRemaining = this.bricks.length;
        }

        _convertRandomBrick(type) {
            const pool = this.bricks.filter(b => b.alive && b.type === "standard");
            if (!pool.length) return;
            const b = pool[Math.floor(Math.random() * pool.length)];
            b.type = type;
            b.hp = 1;
            b.maxHp = 1;
            if (type === "tnt") b.color = CB_COLORS.red;
            else b.color = CB_COLORS.amber;
        }

        _resetBall() {
            const p = this.paddle;
            this.balls = [{
                x: p.x, y: p.y - p.h / 2 - 9,
                vx: 0, vy: 0, r: 7,
                trail: [], stretch: 0, fire: false
            }];
            this.awaitingLaunch = true;
        }

        _launch() {
            if (!this.awaitingLaunch || this.state !== "playing") return;
            this.awaitingLaunch = false;
            const b = this.balls[0];
            if (!b) return;
            const speed = 400 + (this.level - 1) * 30;
            const ang = -Math.PI / 2 + (Math.random() - 0.5) * 0.72;
            b.vx = Math.cos(ang) * speed;
            b.vy = Math.sin(ang) * speed;
            b.stretch = 0.55;
            this.paddle.sy = 0.82;
            this._addTrauma(0.08);
            this._sfx("paddle");
        }

        _startLoop() {
            if (this.destroyed) return;
            if (this.rafId) cancelAnimationFrame(this.rafId);
            this.lastTime = 0;

            const step = (ts) => {
                if (this.destroyed) return;
                this.rafId = requestAnimationFrame(step);

                if (this.paused) { this.lastTime = ts; return; }
                if (!this.lastTime) { this.lastTime = ts; return; }

                let dt = (ts - this.lastTime) / 1000;
                this.lastTime = ts;
                if (dt > 0.05) dt = 0.05;
                if (dt <= 0) return;

                this._update(dt);
                this._render();
            };

            this.rafId = requestAnimationFrame(step);
        }

        _update(rawDt) {
            this.time += rawDt;
            this.trauma = Math.max(0, this.trauma - rawDt * 1.7);
            if (this.lifeFlash > 0) this.lifeFlash = Math.max(0, this.lifeFlash - rawDt * 2.2);

            if (this.hitStop > 0) {
                this.hitStop -= rawDt;
                return;
            }

            const dt = rawDt * (this.slowMo > 0 ? 0.6 : 1);
            this.slowMo        = Math.max(0, this.slowMo - rawDt);
            this.laserTime     = Math.max(0, this.laserTime - rawDt);
            this.wideTime      = Math.max(0, this.wideTime - rawDt);
            this.fireTime      = Math.max(0, this.fireTime - rawDt);
            this.laserCooldown = Math.max(0, this.laserCooldown - rawDt);

            // Paddle
            const p = this.paddle;
            p.targetW = this.wideTime > 0 ? p.wideW : p.baseW;
            p.w += (p.targetW - p.w) * Math.min(1, rawDt * 12);

            let kd = 0;
            if (this.keys.left) kd -= 1;
            if (this.keys.right) kd += 1;

            if (kd !== 0) {
                p.x += kd * 760 * rawDt;
                this.paddleTargetX = null;
            } else if (this.paddleTargetX !== null) {
                p.x += (this.paddleTargetX - p.x) * Math.min(1, rawDt * 45);
            }
            p.x = cbClamp(p.x, p.w / 2, CB_VW - p.w / 2);

            p.sx += (1 - p.sx) * Math.min(1, rawDt * 13);
            p.sy += (1 - p.sy) * Math.min(1, rawDt * 13);

            // Balls
            for (let i = 0; i < this.balls.length; i++) this.balls[i].fire = this.fireTime > 0;

            if (this.awaitingLaunch) {
                const b = this.balls[0];
                if (b) {
                    b.x = p.x;
                    b.y = p.y - p.h / 2 - b.r - 2;
                    if (b.trail.length) b.trail.length = 0;
                }
            } else {
                for (let i = this.balls.length - 1; i >= 0; i--) {
                    const b = this.balls[i];
                    this._stepBall(b, dt);

                    b.trail.push({ x: b.x, y: b.y });
                    if (b.trail.length > 12) b.trail.shift();
                    b.stretch = Math.max(0, b.stretch - rawDt * 4.2);

                    if (b.y - b.r > CB_VH + 24) this.balls.splice(i, 1);
                }
                if (this.balls.length === 0 && this.state === "playing") this._loseLife();
            }

            // Lasers
            for (let i = this.lasers.length - 1; i >= 0; i--) {
                const L = this.lasers[i];
                L.y += L.vy * dt;
                if (L.y < -20) { this.lasers.splice(i, 1); continue; }

                let hit = false;
                for (let k = 0; k < this.bricks.length; k++) {
                    const br = this.bricks[k];
                    if (!br.alive) continue;
                    if (L.x >= br.x && L.x <= br.x + br.w && L.y >= br.y && L.y <= br.y + br.h) {
                        this._damageBrick(br, 1, 0);
                        this._burst(L.x, L.y, br.color, 6, 140);
                        hit = true;
                        break;
                    }
                }
                if (hit) this.lasers.splice(i, 1);
            }

            // Power-ups
            for (let i = this.powerups.length - 1; i >= 0; i--) {
                const pu = this.powerups[i];
                pu.y += pu.vy * dt;
                pu.t += rawDt;

                if (pu.y > CB_VH + 30) { this.powerups.splice(i, 1); continue; }

                const pTop = p.y, pBot = p.y + p.h;
                const pL = p.x - p.w / 2, pR = p.x + p.w / 2;
                if (pu.y + pu.h / 2 > pTop && pu.y - pu.h / 2 < pBot &&
                    pu.x + pu.w / 2 > pL && pu.x - pu.w / 2 < pR) {
                    this._collectPowerup(pu);
                    this.powerups.splice(i, 1);
                }
            }

            // Particles
            for (let i = this.particles.length - 1; i >= 0; i--) {
                const pt = this.particles[i];
                pt.life -= rawDt;
                if (pt.life <= 0) { this.particles.splice(i, 1); continue; }
                pt.vy += pt.grav * rawDt;
                pt.vx *= Math.pow(pt.fric, rawDt * 60);
                pt.vy *= Math.pow(pt.fric, rawDt * 60);
                pt.x += pt.vx * rawDt;
                pt.y += pt.vy * rawDt;
                pt.rot += pt.rotSpeed * rawDt;
            }

            // Floating texts
            for (let i = this.texts.length - 1; i >= 0; i--) {
                const t = this.texts[i];
                t.life -= rawDt;
                if (t.life <= 0) { this.texts.splice(i, 1); continue; }
                t.y += t.vy * rawDt;
                t.vy *= Math.pow(0.9, rawDt * 60);
            }

            // Brick flash decay
            for (let i = 0; i < this.bricks.length; i++) {
                const br = this.bricks[i];
                if (br.flash > 0) br.flash = Math.max(0, br.flash - rawDt * 6);
            }

            // Level clear
            if (this.bricksRemaining <= 0 && this.state === "playing") this._nextLevel();
        }

        _stepBall(b, dt) {
            const speed = Math.hypot(b.vx, b.vy);
            const dist = speed * dt;
            const steps = cbClamp(Math.ceil(dist / 7), 1, 8);
            const sdt = dt / steps;
            for (let i = 0; i < steps; i++) this._moveBall(b, sdt);
        }

        _moveBall(b, dt) {
            b.x += b.vx * dt;
            b.y += b.vy * dt;

            // Walls
            if (b.x - b.r < 0) {
                b.x = b.r; b.vx = Math.abs(b.vx);
                this._wallSpark(b.x, b.y);
            } else if (b.x + b.r > CB_VW) {
                b.x = CB_VW - b.r; b.vx = -Math.abs(b.vx);
                this._wallSpark(b.x, b.y);
            }
            if (b.y - b.r < 0) {
                b.y = b.r; b.vy = Math.abs(b.vy);
                this._wallSpark(b.x, b.y);
            }

            // Paddle
            const p = this.paddle;
            if (b.vy > 0) {
                const top = p.y, bottom = p.y + p.h;
                const halfW = p.w / 2;
                if (b.y + b.r >= top && b.y < bottom &&
                    b.x + b.r > p.x - halfW && b.x - b.r < p.x + halfW) {
                    this._paddleBounce(b);
                }
            }

            // Bricks
            this._ballBrickCollision(b);
        }

        _wallSpark(x, y) {
            this._burst(x, y, CB_COLORS.cyan, 3, 90);
        }

        _paddleBounce(b) {
            const p = this.paddle;
            const half = p.w / 2;
            const rel = cbClamp((b.x - p.x) / half, -1, 1);
            const angle = rel * (Math.PI / 3);

            let speed = Math.hypot(b.vx, b.vy);
            speed = cbClamp(speed, 390, 720);

            b.vx = Math.sin(angle) * speed;
            b.vy = -Math.cos(angle) * speed;
            b.y = p.y - b.r - 0.5;
            b.stretch = 0.65;

            p.sx = 1 + Math.abs(rel) * 0.18 + 0.1;
            p.sy = 1 - 0.26;

            this._addTrauma(0.13);
            this._burst(b.x, p.y, CB_COLORS.cyan, 7, 170);

            if (this.combo > 0) {
                this.combo = 0;
                this.multiplier = 1;
                this._emitScore();
            }
            this._sfx("paddle");
        }

        _ballBrickCollision(b) {
            for (let i = 0; i < this.bricks.length; i++) {
                const br = this.bricks[i];
                if (!br.alive) continue;

                if (b.x + b.r < br.x || b.x - b.r > br.x + br.w ||
                    b.y + b.r < br.y || b.y - b.r > br.y + br.h) continue;

                const nx = cbClamp(b.x, br.x, br.x + br.w);
                const ny = cbClamp(b.y, br.y, br.y + br.h);
                let dx = b.x - nx, dy = b.y - ny;
                let d2 = dx * dx + dy * dy;

                if (d2 > b.r * b.r) continue;

                if (b.fire) {
                    this._damageBrick(br, 99, 1);
                    this._burst(b.x, b.y, CB_COLORS.amber, 8, 200);
                    continue;
                }

                let d = Math.sqrt(d2);
                let nxn, nyn;

                if (d > 0.0001) {
                    nxn = dx / d; nyn = dy / d;
                } else {
                    const cx = br.x + br.w / 2, cy = br.y + br.h / 2;
                    const ox = (br.w / 2 + b.r) - Math.abs(b.x - cx);
                    const oy = (br.h / 2 + b.r) - Math.abs(b.y - cy);
                    if (ox < oy) { nxn = (b.x - cx) >= 0 ? 1 : -1; nyn = 0; }
                    else         { nxn = 0; nyn = (b.y - cy) >= 0 ? 1 : -1; }
                    d = 0;
                }

                const pen = b.r - d;
                b.x += nxn * pen;
                b.y += nyn * pen;

                const dot = b.vx * nxn + b.vy * nyn;
                if (dot < 0) {
                    b.vx -= 2 * dot * nxn;
                    b.vy -= 2 * dot * nyn;
                }
                b.stretch = 0.45;

                this._burst(nx, ny, br.color, 6, 190);
                this._damageBrick(br, 1, 1);
                break;
            }
        }

        _damageBrick(br, dmg, chainDepth) {
            if (!br.alive) return;
            br.hp -= dmg;
            br.flash = 1;

            if (br.hp > 0) {
                this._addTrauma(0.06);
                this._sfx("brick");
                return;
            }
            this._destroyBrick(br, chainDepth);
        }

        _destroyBrick(br, chainDepth) {
            if (!br.alive) return;
            br.alive = false;
            this.bricksRemaining--;
            this.bricksDestroyed++;

            this.combo++;
            if (this.combo > this.maxCombo) this.maxCombo = this.combo;
            this.multiplier = Math.min(5, 1 + Math.floor(this.combo / 4));

            const base = br.type === "tnt" ? 20
                       : br.type === "carrier" ? 15
                       : br.type === "reinforced" ? 12 : 10;
            const pts = Math.round(base * this.multiplier);
            this.score = Math.min(10000, this.score + pts);

            this._addText(br.x + br.w / 2, br.y + br.h / 2, "+" + pts, br.color, 17);
            if (this.multiplier > 1 && this.combo % 4 === 0) {
                this._addText(br.x + br.w / 2, br.y - 6, "COMBO x" + this.multiplier, CB_COLORS.lime, 15);
            }

            this._spawnBrickParticles(br);
            this._addTrauma(br.type === "tnt" ? 0.55 : 0.2);
            this._sfx("brick");

            if (br.type === "carrier") {
                this._spawnPowerup(br.x + br.w / 2, br.y + br.h / 2);
            }

            if (br.type === "tnt" && chainDepth < 5) {
                this.hitStop = Math.max(this.hitStop, 0.045);
                this._addTrauma(0.6);
                this._explosionFX(br.x + br.w / 2, br.y + br.h / 2);
                this._sfx("explode");
                this._addText(br.x + br.w / 2, br.y, "BOOM!", CB_COLORS.red, 24);

                const cx = br.x + br.w / 2, cy = br.y + br.h / 2;
                const radius = 118;
                for (let i = 0; i < this.bricks.length; i++) {
                    const o = this.bricks[i];
                    if (!o.alive) continue;
                    const ox = o.x + o.w / 2, oy = o.y + o.h / 2;
                    if (Math.hypot(ox - cx, oy - cy) <= radius) {
                        this._damageBrick(o, 2, chainDepth + 1);
                    }
                }
            }

            this._emitScore();
        }

        _spawnBrickParticles(br) {
            if (this.particles.length > 850) return;
            const count = 15 + Math.floor(Math.random() * 11);
            for (let i = 0; i < count; i++) {
                const ang = Math.random() * CB_TAU;
                const spd = 60 + Math.random() * 260;
                this.particles.push({
                    x: br.x + Math.random() * br.w,
                    y: br.y + Math.random() * br.h,
                    vx: Math.cos(ang) * spd,
                    vy: Math.sin(ang) * spd - 70,
                    life: 0.55 + Math.random() * 0.75,
                    maxLife: 1.3,
                    size: 2 + Math.random() * 4.5,
                    color: br.color,
                    rot: Math.random() * CB_TAU,
                    rotSpeed: (Math.random() - 0.5) * 16,
                    grav: 430,
                    fric: 0.985,
                    type: "frag"
                });
            }
            for (let i = 0; i < 5; i++) {
                const ang = Math.random() * CB_TAU;
                const spd = 180 + Math.random() * 220;
                this.particles.push({
                    x: br.x + br.w / 2, y: br.y + br.h / 2,
                    vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
                    life: 0.22 + Math.random() * 0.25, maxLife: 0.47,
                    size: 2, color: "#ffffff", rot: 0, rotSpeed: 0,
                    grav: 0, fric: 0.94, type: "spark"
                });
            }
        }

        _explosionFX(x, y) {
            for (let i = 0; i < 26; i++) {
                const ang = Math.random() * CB_TAU;
                const spd = 100 + Math.random() * 380;
                this.particles.push({
                    x: x, y: y,
                    vx: Math.cos(ang) * spd,
                    vy: Math.sin(ang) * spd,
                    life: 0.4 + Math.random() * 0.6, maxLife: 1.0,
                    size: 2 + Math.random() * 5,
                    color: Math.random() < 0.5 ? CB_COLORS.amber : CB_COLORS.red,
                    rot: Math.random() * CB_TAU, rotSpeed: (Math.random() - 0.5) * 20,
                    grav: 220, fric: 0.96, type: "frag"
                });
            }
            for (let i = 0; i < 14; i++) {
                const ang = Math.random() * CB_TAU;
                const spd = 30 + Math.random() * 120;
                this.particles.push({
                    x: x, y: y,
                    vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd - 40,
                    life: 0.6 + Math.random() * 0.8, maxLife: 1.4,
                    size: 6 + Math.random() * 12,
                    color: "#ff7a3c",
                    rot: Math.random() * CB_TAU, rotSpeed: (Math.random() - 0.5) * 4,
                    grav: -30, fric: 0.97, type: "smoke"
                });
            }
        }

        _burst(x, y, color, n, spread) {
            if (this.particles.length > 850) return;
            for (let i = 0; i < n; i++) {
                const ang = Math.random() * CB_TAU;
                const spd = Math.random() * spread;
                this.particles.push({
                    x: x, y: y,
                    vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
                    life: 0.18 + Math.random() * 0.3, maxLife: 0.48,
                    size: 1.5 + Math.random() * 2.5,
                    color: color, rot: 0, rotSpeed: 0,
                    grav: 60, fric: 0.93, type: "spark"
                });
            }
        }

        _addText(x, y, text, color, size) {
            if (this.texts.length > 40) this.texts.shift();
            this.texts.push({
                x: x, y: y, text: text, color: color,
                size: size || 18, vy: -58,
                life: 0.95, maxLife: 0.95
            });
        }

        _addTrauma(v) {
            this.trauma = Math.min(1, this.trauma + v);
        }

        _spawnPowerup(x, y) {
            const type = CB_POWERUP_KEYS[Math.floor(Math.random() * CB_POWERUP_KEYS.length)];
            this.powerups.push({
                x: x, y: y, w: 42, h: 21,
                vy: 152, type: type, t: 0
            });
            this._addText(x, y - 12, "POWER-UP!", CB_COLORS.amber, 15);
        }

        _collectPowerup(pu) {
            const def = CB_POWERUP_DEFS[pu.type];
            this._addText(pu.x, pu.y - 8, def.name + "!", def.color, 22);
            this.hitStop = Math.max(this.hitStop, 0.04);
            this._addTrauma(0.28);
            this._sfx("powerup");
            this._burst(pu.x, pu.y, def.color, 16, 260);

            switch (pu.type) {
                case "multiball": {
                    const src = this.balls.slice();
                    const maxBalls = 9;
                    for (let i = 0; i < src.length; i++) {
                        const b = src[i];
                        const speed = Math.max(380, Math.hypot(b.vx, b.vy) || 400);
                        for (let k = 0; k < 2; k++) {
                            if (this.balls.length >= maxBalls) break;
                            const ang = Math.atan2(b.vy || -1, b.vx || 0) + (k === 0 ? 0.55 : -0.55);
                            this.balls.push({
                                x: b.x, y: b.y,
                                vx: Math.cos(ang) * speed,
                                vy: Math.sin(ang) * speed,
                                r: b.r, trail: [], stretch: 0.4, fire: this.fireTime > 0
                            });
                        }
                    }
                    this.awaitingLaunch = false;
                    break;
                }
                case "laser":
                    this.laserTime = 12;
                    break;
                case "wide":
                    this.wideTime = 12;
                    break;
                case "fire":
                    this.fireTime = 8;
                    for (let i = 0; i < this.balls.length; i++) this.balls[i].fire = true;
                    break;
                case "slow":
                    this.slowMo = 5;
                    break;
            }
        }

        _fireLasers() {
            if (this.laserTime <= 0 || this.laserCooldown > 0 || this.state !== "playing") return;
            this.laserCooldown = 0.16;
            const p = this.paddle;
            const y = p.y - 4;
            this.lasers.push({ x: p.x - p.w / 2 + 9, y: y, vy: -1150 });
            this.lasers.push({ x: p.x + p.w / 2 - 9, y: y, vy: -1150 });
            p.sy = 0.85;
            this._addTrauma(0.07);
            this._sfx("laser");
        }

        _loseLife() {
            this.lives--;
            this.ballsLost++;
            this.combo = 0;
            this.multiplier = 1;
            this._emitScore();

            this._addTrauma(0.95);
            this.hitStop = Math.max(this.hitStop, 0.05);
            this.lifeFlash = 1;
            this._sfx("lifeLost");

            if (this.lives <= 0) {
                this._endRun(false);
                return;
            }

            this.powerups.length = 0;
            this.lasers.length = 0;
            this.laserTime = 0;
            this.wideTime = 0;
            this.fireTime = 0;
            this.slowMo = 0;

            this._resetBall();
            this._addText(CB_VW / 2, CB_VH / 2 + 40, "LIFE LOST", CB_COLORS.red, 26);
        }

        _nextLevel() {
            if (this.level >= CB_MAX_LEVEL) {
                this._endRun(true);
                return;
            }
            this.level++;
            this._loadLevel(this.level);
            this._resetBall();
            this.powerups.length = 0;
            this.lasers.length = 0;
            this.slowMo = 0;
            this.hitStop = Math.max(this.hitStop, 0.1);
            this._addTrauma(0.45);
            this._addText(CB_VW / 2, CB_VH / 2, "WAVE " + this.level, CB_COLORS.cyan, 42);
            this._sfx("levelClear");
        }

        _endRun(won) {
            this.state = won ? "won" : "over";
            this.awaitingLaunch = false;
            this._sfx(won ? "win" : "gameOver");

            const stats = {
                level: this.level,
                bricksDestroyed: this.bricksDestroyed,
                ballsLost: this.ballsLost,
                livesLeft: Math.max(0, this.lives),
                durationMs: Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - this.startTime)
            };
            const payload = { score: this.score, maxCombo: this.maxCombo, stats: stats };

            this._addText(CB_VW / 2, CB_VH / 2 - 20, won ? "YOU WIN!" : "GAME OVER",
                won ? CB_COLORS.lime : CB_COLORS.red, 46);

            if (won) this.onGameWon(payload);
            else this.onGameOver(payload);
        }

        _emitScore() {
            this.onScoreUpdate(this.score, this.combo, this.multiplier);
        }

        _render() {
            const ctx = this.ctx;
            const cw = this.canvas.width, ch = this.canvas.height;
            if (!cw || !ch) return;

            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.globalCompositeOperation = "source-over";
            ctx.globalAlpha = 1;
            ctx.fillStyle = "#05010f";
            ctx.fillRect(0, 0, cw, ch);

            const s = this.scale * this.dpr;
            if (s <= 0) return;

            const shakeAmt = this.trauma * this.trauma * 18;
            const shx = (Math.random() * 2 - 1) * shakeAmt;
            const shy = (Math.random() * 2 - 1) * shakeAmt;

            ctx.setTransform(s, 0, 0, s, this.offX * this.dpr + shx * s, this.offY * this.dpr + shy * s);

            this._drawArena(ctx);
            this._drawBricks(ctx);
            this._drawPowerups(ctx);
            this._drawLasers(ctx);
            this._drawPaddle(ctx);
            this._drawBalls(ctx);
            this._drawParticles(ctx);
            this._drawTexts(ctx);
            this._drawHUD(ctx);

            if (this.lifeFlash > 0) {
                ctx.globalAlpha = this.lifeFlash * 0.35;
                ctx.fillStyle = "#ff007f";
                ctx.fillRect(0, 0, CB_VW, CB_VH);
                ctx.globalAlpha = 1;
            }

            if (this.state === "over" || this.state === "won") {
                ctx.globalAlpha = 0.55;
                ctx.fillStyle = "#05010f";
                ctx.fillRect(0, 0, CB_VW, CB_VH);
                ctx.globalAlpha = 1;

                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                const win = this.state === "won";
                ctx.font = 'bold 54px "Courier New", monospace';
                ctx.fillStyle = win ? CB_COLORS.lime : CB_COLORS.magenta;
                ctx.shadowBlur = 26;
                ctx.shadowColor = win ? CB_COLORS.lime : CB_COLORS.magenta;
                ctx.fillText(win ? "YOU WIN!" : "GAME OVER", CB_VW / 2, CB_VH / 2 - 24);
                ctx.shadowBlur = 0;

                ctx.font = 'bold 22px "Courier New", monospace';
                ctx.fillStyle = "rgba(230,250,255,0.9)";
                ctx.fillText("SCORE  " + this.score, CB_VW / 2, CB_VH / 2 + 34);
            }

            if (this.paused) {
                ctx.globalAlpha = 0.55;
                ctx.fillStyle = "#05010f";
                ctx.fillRect(0, 0, CB_VW, CB_VH);
                ctx.globalAlpha = 1;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.font = 'bold 46px "Courier New", monospace';
                ctx.fillStyle = CB_COLORS.cyan;
                ctx.shadowBlur = 24;
                ctx.shadowColor = CB_COLORS.cyan;
                ctx.fillText("PAUSED", CB_VW / 2, CB_VH / 2);
                ctx.shadowBlur = 0;
            }
        }

        _drawArena(ctx) {
            const g = ctx.createLinearGradient(0, 0, 0, CB_VH);
            g.addColorStop(0, "#08021a");
            g.addColorStop(0.55, "#0f0625");
            g.addColorStop(1, "#1a0b2e");
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, CB_VW, CB_VH);

            const rg = ctx.createRadialGradient(CB_VW / 2, CB_VH + 40, 30, CB_VW / 2, CB_VH + 40, 460);
            rg.addColorStop(0, "rgba(255,0,127,0.20)");
            rg.addColorStop(1, "rgba(255,0,127,0)");
            ctx.fillStyle = rg;
            ctx.fillRect(0, 0, CB_VW, CB_VH);

            ctx.strokeStyle = "rgba(0,240,255,0.055)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let x = 0; x <= CB_VW; x += 40) { ctx.moveTo(x, 0); ctx.lineTo(x, CB_VH); }
            for (let y = 0; y <= CB_VH; y += 40) { ctx.moveTo(0, y); ctx.lineTo(CB_VW, y); }
            ctx.stroke();

            ctx.strokeStyle = "rgba(0,240,255,0.22)";
            ctx.lineWidth = 2;
            ctx.strokeRect(1, 1, CB_VW - 2, CB_VH - 2);
        }

        _drawBricks(ctx) {
            for (let i = 0; i < this.bricks.length; i++) {
                const br = this.bricks[i];
                if (!br.alive) continue;

                ctx.globalCompositeOperation = "lighter";
                ctx.globalAlpha = 0.10 + br.flash * 0.30;
                ctx.fillStyle = br.color;
                cbRoundRect(ctx, br.x - 4, br.y - 4, br.w + 8, br.h + 8, 9);
                ctx.fill();
                ctx.globalCompositeOperation = "source-over";
                ctx.globalAlpha = 1;

                ctx.globalAlpha = 0.20;
                ctx.fillStyle = br.color;
                cbRoundRect(ctx, br.x, br.y, br.w, br.h, 6);
                ctx.fill();
                ctx.globalAlpha = 1;

                ctx.strokeStyle = br.color;
                ctx.lineWidth = 2;
                ctx.stroke();

                ctx.globalAlpha = 0.16;
                ctx.fillStyle = "#ffffff";
                cbRoundRect(ctx, br.x + 4, br.y + 4, br.w - 8, 4, 2);
                ctx.fill();
                ctx.globalAlpha = 1;

                if (br.maxHp > 1 && br.hp < br.maxHp) {
                    const t = 1 - br.hp / br.maxHp;
                    ctx.strokeStyle = "rgba(0,0,0,0.65)";
                    ctx.lineWidth = 1.6;
                    ctx.beginPath();
                    ctx.moveTo(br.x + br.w * 0.18, br.y + 1);
                    ctx.lineTo(br.x + br.w * 0.46, br.y + br.h * 0.62);
                    ctx.lineTo(br.x + br.w * 0.30, br.y + br.h - 1);
                    if (t > 0.35) {
                        ctx.moveTo(br.x + br.w * 0.74, br.y + 1);
                        ctx.lineTo(br.x + br.w * 0.56, br.y + br.h * 0.5);
                        ctx.lineTo(br.x + br.w * 0.82, br.y + br.h - 1);
                    }
                    ctx.stroke();
                }

                if (br.type === "tnt") {
                    const pulse = 0.55 + 0.45 * Math.sin(this.time * 9 + br.seed);
                    ctx.globalAlpha = pulse;
                    ctx.fillStyle = "#ffffff";
                    ctx.beginPath();
                    ctx.arc(br.x + br.w / 2, br.y + br.h / 2, 4.5, 0, CB_TAU);
                    ctx.fill();
                    ctx.globalAlpha = 1;
                }

                if (br.type === "carrier") {
                    const pulse = 0.5 + 0.5 * Math.sin(this.time * 8 + br.seed);
                    ctx.globalAlpha = 0.25 + pulse * 0.55;
                    ctx.strokeStyle = "#ffffff";
                    ctx.lineWidth = 2;
                    cbRoundRect(ctx, br.x - 1.5, br.y - 1.5, br.w + 3, br.h + 3, 8);
                    ctx.stroke();
                    ctx.globalAlpha = 1;
                }

                if (br.flash > 0.02) {
                    ctx.globalAlpha = br.flash * 0.85;
                    ctx.fillStyle = "#ffffff";
                    cbRoundRect(ctx, br.x, br.y, br.w, br.h, 6);
                    ctx.fill();
                    ctx.globalAlpha = 1;
                }
            }
        }

        _drawPowerups(ctx) {
            for (let i = 0; i < this.powerups.length; i++) {
                const pu = this.powerups[i];
                const def = CB_POWERUP_DEFS[pu.type];
                const pulse = 0.6 + 0.4 * Math.sin(pu.t * 10);

                ctx.globalCompositeOperation = "lighter";
                ctx.globalAlpha = 0.22 * pulse + 0.12;
                ctx.fillStyle = def.color;
                cbRoundRect(ctx, pu.x - pu.w / 2 - 5, pu.y - pu.h / 2 - 5, pu.w + 10, pu.h + 10, 13);
                ctx.fill();
                ctx.globalCompositeOperation = "source-over";
                ctx.globalAlpha = 1;

                ctx.fillStyle = "rgba(5,1,15,0.85)";
                cbRoundRect(ctx, pu.x - pu.w / 2, pu.y - pu.h / 2, pu.w, pu.h, 10);
                ctx.fill();

                ctx.strokeStyle = def.color;
                ctx.lineWidth = 2;
                ctx.stroke();

                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.font = 'bold 14px "Courier New", monospace';
                ctx.fillStyle = def.color;
                ctx.fillText(def.label, pu.x, pu.y + 1);
            }
        }

        _drawLasers(ctx) {
            ctx.globalCompositeOperation = "lighter";
            for (let i = 0; i < this.lasers.length; i++) {
                const L = this.lasers[i];
                ctx.globalAlpha = 0.28;
                ctx.fillStyle = CB_COLORS.magenta;
                ctx.fillRect(L.x - 4, L.y - 20, 8, 24);
                ctx.globalAlpha = 1;
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(L.x - 1.5, L.y - 18, 3, 20);
            }
            ctx.globalCompositeOperation = "source-over";
            ctx.globalAlpha = 1;
        }

        _drawPaddle(ctx) {
            const p = this.paddle;
            const laserOn = this.laserTime > 0;
            const col = laserOn ? CB_COLORS.magenta : CB_COLORS.cyan;

            ctx.save();
            ctx.translate(p.x, p.y + p.h / 2);
            ctx.scale(p.sx, p.sy);

            const w = p.w, h = p.h;

            ctx.globalCompositeOperation = "lighter";
            ctx.globalAlpha = 0.24;
            ctx.fillStyle = col;
            cbRoundRect(ctx, -w / 2 - 7, -h / 2 - 7, w + 14, h + 14, 13);
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = "source-over";

            const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
            g.addColorStop(0, "#ffffff");
            g.addColorStop(0.45, col);
            g.addColorStop(1, laserOn ? "#7a0038" : "#005f7a");
            ctx.fillStyle = g;
            cbRoundRect(ctx, -w / 2, -h / 2, w, h, h / 2);
            ctx.fill();

            if (laserOn) {
                ctx.fillStyle = CB_COLORS.magenta;
                ctx.globalCompositeOperation = "lighter";
                ctx.fillRect(-w / 2 + 5, -h / 2 - 6, 6, 8);
                ctx.fillRect(w / 2 - 11, -h / 2 - 6, 6, 8);
                ctx.globalCompositeOperation = "source-over";
            }

            ctx.restore();
        }

        _drawBalls(ctx) {
            ctx.globalCompositeOperation = "lighter";

            for (let i = 0; i < this.balls.length; i++) {
                const b = this.balls[i];
                const col = b.fire ? CB_COLORS.amber : CB_COLORS.cyan;

                const n = b.trail.length;
                for (let k = 0; k < n; k++) {
                    const t = (k + 1) / n;
                    const pt = b.trail[k];
                    ctx.globalAlpha = t * t * 0.42;
                    ctx.fillStyle = col;
                    ctx.beginPath();
                    ctx.arc(pt.x, pt.y, b.r * (0.30 + t * 0.62), 0, CB_TAU);
                    ctx.fill();
                }
                ctx.globalAlpha = 1;

                ctx.save();
                ctx.translate(b.x, b.y);
                const ang = Math.atan2(b.vy, b.vx);
                if (b.vx || b.vy) ctx.rotate(ang);
                ctx.scale(1 + b.stretch * 0.45, 1 - b.stretch * 0.35);

                ctx.globalAlpha = 0.30;
                ctx.fillStyle = col;
                ctx.beginPath(); ctx.arc(0, 0, b.r * 2.3, 0, CB_TAU); ctx.fill();
                ctx.globalAlpha = 0.55;
                ctx.beginPath(); ctx.arc(0, 0, b.r * 1.45, 0, CB_TAU); ctx.fill();
                ctx.globalAlpha = 1;

                ctx.fillStyle = col;
                ctx.beginPath(); ctx.arc(0, 0, b.r, 0, CB_TAU); ctx.fill();
                ctx.fillStyle = "#ffffff";
                ctx.beginPath(); ctx.arc(0, 0, b.r * 0.62, 0, CB_TAU); ctx.fill();

                ctx.restore();
            }

            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = "source-over";
        }

        _drawParticles(ctx) {
            ctx.globalCompositeOperation = "lighter";
            for (let i = 0; i < this.particles.length; i++) {
                const pt = this.particles[i];
                const a = pt.life / pt.maxLife;
                if (a <= 0) continue;
                ctx.globalAlpha = a * (pt.type === "smoke" ? 0.35 : 0.95);
                ctx.fillStyle = pt.color;

                if (pt.type === "spark") {
                    ctx.beginPath();
                    ctx.arc(pt.x, pt.y, pt.size * 0.75, 0, CB_TAU);
                    ctx.fill();
                } else {
                    ctx.save();
                    ctx.translate(pt.x, pt.y);
                    ctx.rotate(pt.rot);
                    ctx.fillRect(-pt.size / 2, -pt.size / 2, pt.size, pt.size);
                    ctx.restore();
                }
            }
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = "source-over";
        }

        _drawTexts(ctx) {
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            for (let i = 0; i < this.texts.length; i++) {
                const t = this.texts[i];
                const a = Math.max(0, t.life / t.maxLife);
                ctx.globalAlpha = a;
                ctx.font = "bold " + t.size + 'px "Courier New", monospace';
                ctx.fillStyle = t.color;
                ctx.shadowBlur = 12;
                ctx.shadowColor = t.color;
                ctx.fillText(t.text, t.x, t.y);
            }
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
        }

        _drawHUD(ctx) {
            ctx.textBaseline = "top";

            ctx.textAlign = "left";
            ctx.font = 'bold 16px "Courier New", monospace';
            ctx.fillStyle = "rgba(0,240,255,0.85)";
            ctx.fillText("WAVE " + this.level, 20, 18);

            ctx.fillStyle = "rgba(255,183,0,0.85)";
            ctx.fillText("SCORE " + this.score, 20, 40);

            ctx.textAlign = "right";
            ctx.fillStyle = "rgba(0,255,102,0.85)";
            ctx.fillText("LIVES", CB_VW - 20, 18);
            for (let i = 0; i < this.lives; i++) {
                const x = CB_VW - 26 - i * 20;
                const y = 44;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x - 7, y + 12);
                ctx.lineTo(x + 7, y + 12);
                ctx.closePath();
                ctx.fillStyle = "rgba(0,255,102,0.9)";
                ctx.fill();
            }

            let ty = 70;
            ctx.textAlign = "right";
            ctx.font = 'bold 13px "Courier New", monospace';
            const timers = [
                { t: this.laserTime, c: CB_COLORS.magenta, label: "LASER" },
                { t: this.wideTime,  c: CB_COLORS.lime,    label: "WIDE"  },
                { t: this.fireTime,  c: CB_COLORS.amber,   label: "FIRE"  },
                { t: this.slowMo,    c: CB_COLORS.purple,  label: "SLOW"  }
            ];
            for (let i = 0; i < timers.length; i++) {
                if (timers[i].t > 0) {
                    ctx.fillStyle = timers[i].c;
                    ctx.fillText(timers[i].label + " " + timers[i].t.toFixed(1) + "s", CB_VW - 20, ty);
                    ty += 17;
                }
            }

            if (this.multiplier > 1) {
                ctx.textAlign = "center";
                ctx.font = 'bold 22px "Courier New", monospace';
                const pulse = 0.7 + 0.3 * Math.sin(this.time * 14);
                ctx.globalAlpha = pulse;
                ctx.fillStyle = CB_COLORS.lime;
                ctx.shadowBlur = 14;
                ctx.shadowColor = CB_COLORS.lime;
                ctx.fillText("x" + this.multiplier, CB_VW / 2, 22);
                ctx.shadowBlur = 0;
                ctx.globalAlpha = 1;
            }

            if (this.awaitingLaunch && this.state === "playing") {
                const pulse = 0.45 + 0.55 * Math.abs(Math.sin(this.time * 3));
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.globalAlpha = pulse;
                ctx.font = 'bold 20px "Courier New", monospace';
                ctx.fillStyle = CB_COLORS.cyan;
                ctx.shadowBlur = 16;
                ctx.shadowColor = CB_COLORS.cyan;
                ctx.fillText("TAP / SPACE TO LAUNCH", CB_VW / 2, 452);
                ctx.shadowBlur = 0;
                ctx.globalAlpha = 1;
            }
        }

        _initAudio() {
            if (this.audioCtx) return;
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return;
            try {
                this.audioCtx = new AC();
                this.masterGain = this.audioCtx.createGain();
                this.masterGain.gain.value = this.muted ? 0 : 0.45;
                this.masterGain.connect(this.audioCtx.destination);
            } catch (e) {
                this.audioCtx = null;
            }
        }

        _resumeAudio() {
            this._initAudio();
            if (!this.audioCtx) return;
            if (this.audioCtx.state === "suspended") {
                this.audioCtx.resume().catch(function () {});
            }
            if (this.masterGain) {
                this.masterGain.gain.setTargetAtTime(this.muted ? 0 : 0.45, this.audioCtx.currentTime, 0.02);
            }
        }

        _tone(opts) {
            const ac = this.audioCtx;
            if (!ac || this.muted || ac.state !== "running") return;

            const freq   = opts.freq   || 440;
            const freq2  = opts.freq2  || null;
            const type   = opts.type   || "sine";
            const dur    = opts.dur    || 0.12;
            const vol    = opts.vol    || 0.25;
            const delay  = opts.delay  || 0;
            const t0     = ac.currentTime + delay;

            const osc = ac.createOscillator();
            const g   = ac.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(Math.max(1, freq), t0);
            if (freq2) {
                osc.frequency.exponentialRampToValueAtTime(Math.max(1, freq2), t0 + dur);
            }

            g.gain.setValueAtTime(0.0001, t0);
            g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + 0.008);
            g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

            let node = osc;
            if (opts.filter) {
                const f = ac.createBiquadFilter();
                f.type = opts.filter;
                f.frequency.setValueAtTime(opts.filterFreq || 1000, t0);
                node.connect(f);
                node = f;
            }
            node.connect(g);
            g.connect(this.masterGain);

            osc.start(t0);
            osc.stop(t0 + dur + 0.03);
        }

        _noise(dur, vol, startFreq) {
            const ac = this.audioCtx;
            if (!ac || this.muted || ac.state !== "running") return;

            const t0 = ac.currentTime;
            const len = Math.max(1, Math.floor(ac.sampleRate * dur));

            if (!this._noiseBuffer || this._noiseBuffer.length !== len) {
                const buf = ac.createBuffer(1, len, ac.sampleRate);
                const d = buf.getChannelData(0);
                for (let i = 0; i < len; i++) {
                    d[i] = (Math.random() * 2 - 1) * (1 - i / len);
                }
                this._noiseBuffer = buf;
            }

            const src = ac.createBufferSource();
            src.buffer = this._noiseBuffer;

            const f = ac.createBiquadFilter();
            f.type = "lowpass";
            f.frequency.setValueAtTime(startFreq || 1800, t0);
            f.frequency.exponentialRampToValueAtTime(110, t0 + dur);

            const g = ac.createGain();
            g.gain.setValueAtTime(vol, t0);
            g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

            src.connect(f);
            f.connect(g);
            g.connect(this.masterGain);
            src.start(t0);
        }

        _sfx(name) {
            if (this.muted) return;
            this._initAudio();
            if (!this.audioCtx || this.audioCtx.state !== "running") return;

            switch (name) {
                case "paddle":
                    this._tone({ freq: 270, freq2: 170, type: "triangle", dur: 0.14, vol: 0.34,
                                 filter: "lowpass", filterFreq: 950 });
                    break;
                case "brick": {
                    const step = CB_PENTATONIC[this.combo % 5] + 12 * (Math.floor(this.combo / 5) % 2);
                    const f = 440 * Math.pow(2, step / 12);
                    this._tone({ freq: f, freq2: f * 1.4, type: "square", dur: 0.07, vol: 0.10 });
                    this._tone({ freq: f * 2, type: "sine", dur: 0.05, vol: 0.06 });
                    break;
                }
                case "explode":
                    this._noise(0.5, 0.45, 2200);
                    this._tone({ freq: 120, freq2: 42, type: "sine", dur: 0.34, vol: 0.3 });
                    break;
                case "powerup":
                    this._tone({ freq: 523, type: "square", dur: 0.09, vol: 0.16, delay: 0 });
                    this._tone({ freq: 784, type: "square", dur: 0.13, vol: 0.16, delay: 0.08 });
                    break;
                case "laser":
                    this._tone({ freq: 1700, freq2: 280, type: "sawtooth", dur: 0.11, vol: 0.11 });
                    break;
                case "lifeLost":
                    this._tone({ freq: 320, freq2: 70, type: "sawtooth", dur: 0.55, vol: 0.28 });
                    this._noise(0.3, 0.18, 900);
                    break;
                case "levelClear":
                    this._tone({ freq: 659, type: "square", dur: 0.12, vol: 0.16, delay: 0 });
                    this._tone({ freq: 880, type: "square", dur: 0.16, vol: 0.16, delay: 0.1 });
                    this._tone({ freq: 1319, type: "square", dur: 0.2, vol: 0.14, delay: 0.22 });
                    break;
                case "gameOver": {
                    const notes = [523, 415, 349, 262];
                    for (let i = 0; i < notes.length; i++) {
                        this._tone({ freq: notes[i], type: "square", dur: 0.22, vol: 0.16, delay: i * 0.17 });
                        this._tone({ freq: notes[i] / 2, type: "triangle", dur: 0.26, vol: 0.12, delay: i * 0.17 });
                    }
                    break;
                }
                case "win": {
                    const notes = [523, 659, 784, 1047, 1319];
                    for (let i = 0; i < notes.length; i++) {
                        this._tone({ freq: notes[i], type: "square", dur: 0.2, vol: 0.15, delay: i * 0.11 });
                        this._tone({ freq: notes[i] * 1.5, type: "sine", dur: 0.18, vol: 0.08, delay: i * 0.11 });
                    }
                    break;
                }
            }
        }

        _onPointerDown(e) {
            if (this.destroyed || this.state !== "playing") return;
            this._resumeAudio();

            try { this.canvas.setPointerCapture(e.pointerId); } catch (err) {}

            this.pointerActive = true;
            this.paddleTargetX = cbClamp(this._toVirtualX(e.clientX), 0, CB_VW);

            if (this.awaitingLaunch) this._launch();
            else this._fireLasers();

            e.preventDefault();
        }

        _onPointerMove(e) {
            if (this.destroyed || this.state !== "playing") return;
            if (e.pointerType === "mouse" || this.pointerActive) {
                this.paddleTargetX = cbClamp(this._toVirtualX(e.clientX), 0, CB_VW);
            }
        }

        _onPointerUp() {
            this.pointerActive = false;
        }

        _onKeyDown(e) {
            if (this.destroyed) return;

            const code = e.code || e.key;

            if (code === "ArrowLeft" || code === "KeyA" || e.key === "a" || e.key === "A") {
                this.keys.left = true;
                if (this.state === "playing") e.preventDefault();
            } else if (code === "ArrowRight" || code === "KeyD" || e.key === "d" || e.key === "D") {
                this.keys.right = true;
                if (this.state === "playing") e.preventDefault();
            } else if (code === "Space" || e.key === " ") {
                if (this.state === "playing") {
                    e.preventDefault();
                    this._resumeAudio();
                    if (this.awaitingLaunch) this._launch();
                    else this._fireLasers();
                }
            }
        }

        _onKeyUp(e) {
            const code = e.code || e.key;
            if (code === "ArrowLeft" || code === "KeyA" || e.key === "a" || e.key === "A") {
                this.keys.left = false;
            } else if (code === "ArrowRight" || code === "KeyD" || e.key === "d" || e.key === "D") {
                this.keys.right = false;
            }
        }
    }

    window.CyberBreakoutGame = CyberBreakoutGame;

    // --- Cyber Breakout Host Wiring & Controller ---
    var cbStage = document.getElementById("breakout-stage");
    var cbViewport = document.getElementById("breakout-viewport");
    var cbStartOverlay = document.getElementById("breakout-start-overlay");
    var cbOverOverlay = document.getElementById("breakout-over-overlay");
    var cbStartBtn = document.getElementById("breakout-start-btn");
    var cbAgainBtn = document.getElementById("breakout-again-btn");
    var cbRestartBtn = document.getElementById("cb-btn-restart");
    var cbRecordBanner = document.getElementById("breakout-record-banner");
    var cbOverTitle = document.getElementById("breakout-over-title");
    var cbOverBadge = document.getElementById("breakout-over-badge");
    var cbOverScore = document.getElementById("breakout-over-score");
    var cbOverCombo = document.getElementById("breakout-over-combo");
    var cbOverBest = document.getElementById("breakout-over-best");
    var cbOverRank = document.getElementById("breakout-over-rank");
    var cbSaveStatus = document.getElementById("breakout-save-status");
    var cbHudScore = document.getElementById("cb-hud-score");
    var cbHudMult = document.getElementById("cb-hud-mult");
    var cbHudCombo = document.getElementById("cb-hud-combo");

    var cbGame = null;
    var cbState = {
        active: false,
        score: 0,
        maxCombo: 0,
        running: false
    };

    function cbEnsureGame() {
        if (!cbViewport) return null;
        if (cbGame) return cbGame;

        cbGame = new CyberBreakoutGame(cbViewport, {
            muted: muted,
            onScoreUpdate: function (score, combo, multiplier) {
                cbState.score = score;
                if (cbHudScore) cbHudScore.textContent = String(score);
                if (cbHudMult) cbHudMult.textContent = "x" + multiplier;
                if (cbHudCombo) cbHudCombo.textContent = String(combo);
            },
            onGameOver: function (payload) {
                cbHandleEnd(payload, false);
            },
            onGameWon: function (payload) {
                cbHandleEnd(payload, true);
            }
        });

        return cbGame;
    }

    function cbStartGame() {
        var g = cbEnsureGame();
        if (!g) return;
        if (cbStartOverlay) cbStartOverlay.hidden = true;
        if (cbOverOverlay) cbOverOverlay.hidden = true;
        cbState.running = true;
        g.setMuted(muted);
        g.start();
    }

    function cbPause() {
        if (cbGame) cbGame.pause();
    }

    function cbResume() {
        if (cbGame && cbState.running) {
            cbGame.setMuted(muted);
            cbGame.resume();
        }
    }

    async function cbHandleEnd(payload, won) {
        cbState.running = false;
        var score = Math.max(0, Math.min(10000, payload.score || 0));
        var maxCombo = Math.max(0, Math.min(score, payload.maxCombo || 0));

        if (cbOverTitle) cbOverTitle.textContent = won ? "Matrix Cleared!" : "Run Finished";
        if (cbOverBadge) {
            cbOverBadge.textContent = won ? "VICTORY · WAVE 3 CLEARED" : "SYSTEM PURGED";
            cbOverBadge.style.background = won ? "#10b981" : "";
        }
        if (cbOverScore) cbOverScore.textContent = String(score);
        if (cbOverCombo) cbOverCombo.textContent = "×" + maxCombo;
        if (cbOverBest) cbOverBest.textContent = String(state.bestScore || 0);
        if (cbOverRank) cbOverRank.textContent = state.myRank ? "#" + state.myRank : "—";
        if (cbSaveStatus) cbSaveStatus.textContent = "Saving score…";
        if (cbRecordBanner) cbRecordBanner.hidden = true;
        if (cbOverOverlay) cbOverOverlay.hidden = false;

        try {
            var res = await submitScore(score, maxCombo);
            if (res) {
                if (cbOverBest) cbOverBest.textContent = String(res.bestScore);
                if (cbOverRank) cbOverRank.textContent = res.rank ? "#" + res.rank : "—";
                if (cbRecordBanner) cbRecordBanner.hidden = !res.isNewBest;
                if (cbSaveStatus) {
                    cbSaveStatus.textContent = res.isNewBest
                        ? "New personal record recorded!"
                        : "Score submitted.";
                }
            }
        } catch (e) {
            if (cbSaveStatus) cbSaveStatus.textContent = "Could not save score.";
        }
    }

    if (cbStartBtn) {
        cbStartBtn.addEventListener("click", function () {
            cbStartGame();
        });
    }
    if (cbAgainBtn) {
        cbAgainBtn.addEventListener("click", function () {
            cbStartGame();
        });
    }
    if (cbRestartBtn) {
        cbRestartBtn.addEventListener("click", function () {
            cbStartGame();
        });
    }

    window.addEventListener("resize", function () {
        if (cbState.active && cbGame) {
            cbGame._resize();
        }
        if (hxState.active && hxGame) {
            hxGame._resize();
        }
    });

    // =========================================================================
    // --- Hextris Neon (Hexagonal Match-3 Canvas 2D) ---
    // =========================================================================
    var HX_COLORS = {
        cyan:    "#00f0ff",
        magenta: "#ff007f",
        lime:    "#00ff66",
        amber:   "#ffb700",
        violet:  "#a050ff"
    };
    var HX_PALETTE = [HX_COLORS.cyan, HX_COLORS.magenta, HX_COLORS.lime, HX_COLORS.amber, HX_COLORS.violet];

    function HextrisAudio() {
        var ctx = null;
        var muted = false;

        function getCtx() {
            if (!ctx && (window.AudioContext || window.webkitAudioContext)) {
                var AudioCtx = window.AudioContext || window.webkitAudioContext;
                ctx = new AudioCtx();
            }
            if (ctx && ctx.state === "suspended") {
                ctx.resume();
            }
            return ctx;
        }

        return {
            setMuted: function (m) { muted = !!m; },
            playRotate: function () {
                if (muted) return;
                var c = getCtx();
                if (!c) return;
                var osc = c.createOscillator();
                var gain = c.createGain();
                osc.type = "triangle";
                osc.frequency.setValueAtTime(520, c.currentTime);
                osc.frequency.exponentialRampToValueAtTime(1040, c.currentTime + 0.035);
                gain.gain.setValueAtTime(0.08, c.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.035);
                osc.connect(gain);
                gain.connect(c.destination);
                osc.start();
                osc.stop(c.currentTime + 0.035);
            },
            playDock: function () {
                if (muted) return;
                var c = getCtx();
                if (!c) return;
                var osc = c.createOscillator();
                var gain = c.createGain();
                osc.type = "sine";
                osc.frequency.setValueAtTime(95, c.currentTime);
                osc.frequency.exponentialRampToValueAtTime(35, c.currentTime + 0.07);
                gain.gain.setValueAtTime(0.18, c.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.07);
                osc.connect(gain);
                gain.connect(c.destination);
                osc.start();
                osc.stop(c.currentTime + 0.07);
            },
            playMatch: function (combo) {
                if (muted) return;
                var c = getCtx();
                if (!c) return;
                var notes = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99];
                var baseFreq = notes[Math.min(notes.length - 1, Math.max(0, (combo || 1) - 1))];
                [1, 1.5].forEach(function (mult, idx) {
                    var osc = c.createOscillator();
                    var gain = c.createGain();
                    osc.type = "sine";
                    osc.frequency.setValueAtTime(baseFreq * mult, c.currentTime + idx * 0.03);
                    gain.gain.setValueAtTime(0.12, c.currentTime + idx * 0.03);
                    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + idx * 0.03 + 0.24);
                    osc.connect(gain);
                    gain.connect(c.destination);
                    osc.start(c.currentTime + idx * 0.03);
                    osc.stop(c.currentTime + idx * 0.03 + 0.24);
                });
            },
            playGameOver: function () {
                if (muted) return;
                var c = getCtx();
                if (!c) return;
                var osc = c.createOscillator();
                var gain = c.createGain();
                osc.type = "sawtooth";
                osc.frequency.setValueAtTime(340, c.currentTime);
                osc.frequency.exponentialRampToValueAtTime(45, c.currentTime + 0.45);
                gain.gain.setValueAtTime(0.16, c.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.45);
                osc.connect(gain);
                gain.connect(c.destination);
                osc.start();
                osc.stop(c.currentTime + 0.45);
            }
        };
    }

    function HextrisGame(viewportEl, canvasEl, options) {
        this.viewport = viewportEl;
        this.canvas = canvasEl;
        this.ctx = canvasEl.getContext("2d");
        this.options = options || {};
        this.audio = new HextrisAudio();
        this.audio.setMuted(this.options.muted);

        this.stacks = [[], [], [], [], [], []];
        this.incomingBars = [];
        this.particles = [];
        this.shockwaves = [];
        this.popups = [];
        this.ambientStars = [];

        this.targetAngle = 0;
        this.currentAngle = 0;
        this.score = 0;
        this.maxCombo = 0;
        this.cascadeCount = 0;
        this.multiplier = 1;

        this.spawnTimer = 0;
        this.spawnInterval = 82;
        this.baseSpeed = 2.0;
        this.softDrop = false;

        this.trauma = 0;
        this.hitstop = 0;

        this.running = false;
        this.paused = false;
        this.gameOver = false;
        this.lastTime = 0;
        this.rafId = null;

        this.maxStack = 7;
        this.baseRadius = 46;
        this.blockThickness = 16;
        this.scale = 1;

        this._initStars();
        this._initControls();
        this._resize();
    }

    HextrisGame.prototype._initStars = function () {
        this.ambientStars = [];
        for (var i = 0; i < 36; i++) {
            this.ambientStars.push({
                x: (Math.random() - 0.5) * 800,
                y: (Math.random() - 0.5) * 800,
                radius: 0.8 + Math.random() * 1.6,
                alpha: 0.2 + Math.random() * 0.6,
                speed: 0.15 + Math.random() * 0.35,
                angle: Math.random() * Math.PI * 2
            });
        }
    };

    HextrisGame.prototype._initControls = function () {
        var self = this;
        var touchLeft = document.getElementById("hx-touch-left");
        var touchRight = document.getElementById("hx-touch-right");

        var startX = 0;
        var startY = 0;

        this.viewport.addEventListener("pointerdown", function (ev) {
            if (!self.running || self.gameOver || self.paused) return;
            var rect = self.viewport.getBoundingClientRect();
            startX = ev.clientX - rect.left;
            startY = ev.clientY - rect.top;

            if (startX < rect.width * 0.5) {
                self.rotateLeft();
                if (touchLeft) touchLeft.classList.add("is-active");
            } else {
                self.rotateRight();
                if (touchRight) touchRight.classList.add("is-active");
            }
        });

        this.viewport.addEventListener("pointermove", function (ev) {
            if (!self.running || self.gameOver || self.paused) return;
            var rect = self.viewport.getBoundingClientRect();
            var curY = ev.clientY - rect.top;
            if (curY - startY > 40) {
                self.setSoftDrop(true);
            }
        });

        function clearTouch() {
            self.setSoftDrop(false);
            if (touchLeft) touchLeft.classList.remove("is-active");
            if (touchRight) touchRight.classList.remove("is-active");
        }

        this.viewport.addEventListener("pointerup", clearTouch);
        this.viewport.addEventListener("pointercancel", clearTouch);
    };

    HextrisGame.prototype._resize = function () {
        var rect = this.viewport.getBoundingClientRect();
        var w = Math.max(280, rect.width);
        var h = Math.max(340, rect.height);
        var dpr = Math.min(window.devicePixelRatio || 1, 2);

        this.width = w;
        this.height = h;
        this.canvas.width = Math.round(w * dpr);
        this.canvas.height = Math.round(h * dpr);
        this.dpr = dpr;

        this.scale = Math.max(0.75, Math.min(1.25, Math.min(w, h) / 480));
        this.baseRadius = 46 * this.scale;
        this.blockThickness = 16 * this.scale;
    };

    HextrisGame.prototype.setMuted = function (m) {
        this.audio.setMuted(m);
    };

    HextrisGame.prototype.rotateLeft = function () {
        this.targetAngle -= Math.PI / 3;
        this.audio.playRotate();
    };

    HextrisGame.prototype.rotateRight = function () {
        this.targetAngle += Math.PI / 3;
        this.audio.playRotate();
    };

    HextrisGame.prototype.setSoftDrop = function (active) {
        this.softDrop = !!active;
    };

    HextrisGame.prototype.start = function () {
        this.stacks = [[], [], [], [], [], []];
        this.incomingBars = [];
        this.particles = [];
        this.shockwaves = [];
        this.popups = [];
        this.score = 0;
        this.maxCombo = 0;
        this.cascadeCount = 0;
        this.multiplier = 1;
        this.targetAngle = 0;
        this.currentAngle = 0;
        this.trauma = 0;
        this.hitstop = 0;
        this.gameOver = false;
        this.paused = false;
        this.running = true;
        this.spawnTimer = 0;
        this._resize();
        this.notifyScore();

        this.lastTime = performance.now();
        var self = this;
        if (this.rafId) cancelAnimationFrame(this.rafId);
        function loop(now) {
            if (!self.running) return;
            var dt = Math.min(0.1, (now - self.lastTime) / 1000);
            self.lastTime = now;
            if (!self.paused) {
                self._update(dt);
            }
            self._render();
            self.rafId = requestAnimationFrame(loop);
        }
        this.rafId = requestAnimationFrame(loop);
    };

    HextrisGame.prototype.pause = function () {
        this.paused = true;
    };

    HextrisGame.prototype.resume = function () {
        if (!this.running || this.gameOver) return;
        this.paused = false;
        this.lastTime = performance.now();
    };

    HextrisGame.prototype.togglePause = function () {
        if (this.paused) this.resume(); else this.pause();
    };

    HextrisGame.prototype.notifyScore = function () {
        if (this.options.onScoreUpdate) {
            this.options.onScoreUpdate(this.score, this.maxCombo, this.multiplier);
        }
    };

    HextrisGame.prototype._spawnBar = function () {
        var lane = Math.floor(Math.random() * 6);
        var color = HX_PALETTE[Math.floor(Math.random() * HX_PALETTE.length)];
        var spawnDist = Math.max(this.width, this.height) * 0.58 + 40;
        var spd = this.baseSpeed + Math.min(2.8, this.score / 1200) * 0.65;

        this.incomingBars.push({
            lane: lane,
            dist: spawnDist,
            color: color,
            speed: spd
        });

        // Rare dual-bar spawn on higher scores
        if (this.score > 400 && Math.random() < 0.22) {
            var lane2 = (lane + 3) % 6;
            var color2 = HX_PALETTE[Math.floor(Math.random() * HX_PALETTE.length)];
            this.incomingBars.push({
                lane: lane2,
                dist: spawnDist + 15,
                color: color2,
                speed: spd
            });
        }
    };

    HextrisGame.prototype._update = function (dt) {
        if (this.hitstop > 0) {
            this.hitstop -= dt * 1000;
            return;
        }

        // Smooth critically-damped spring angle
        var diff = this.targetAngle - this.currentAngle;
        this.currentAngle += diff * 0.28;

        // Trauma decay
        this.trauma = Math.max(0, this.trauma - dt * 1.5);

        // Ambient stars drift
        for (var i = 0; i < this.ambientStars.length; i++) {
            var st = this.ambientStars[i];
            st.x += Math.cos(st.angle) * st.speed;
            st.y += Math.sin(st.angle) * st.speed;
            if (st.x < -400) st.x = 400;
            if (st.x > 400) st.x = -400;
            if (st.y < -400) st.y = 400;
            if (st.y > 400) st.y = -400;
        }

        // Spawn timer
        this.spawnTimer++;
        var currInterval = Math.max(42, this.spawnInterval - Math.min(40, Math.floor(this.score / 160)));
        if (this.spawnTimer >= currInterval) {
            this.spawnTimer = 0;
            this._spawnBar();
        }

        // Update incoming bars
        var speedMult = this.softDrop ? 3.5 : 1.0;
        for (var bi = this.incomingBars.length - 1; bi >= 0; bi--) {
            var bar = this.incomingBars[bi];
            bar.dist -= bar.speed * speedMult * (dt * 60);

            // Aligned face calculation
            var step = Math.round(this.currentAngle / (Math.PI / 3));
            var face = ((bar.lane - step) % 6 + 6) % 6;
            var stack = this.stacks[face];
            var dockDist = this.baseRadius + stack.length * this.blockThickness;

            if (bar.dist <= dockDist) {
                if (stack.length >= this.maxStack) {
                    this._triggerGameOver();
                    return;
                }

                stack.push({
                    color: bar.color,
                    flash: 0.35,
                    scale: 1.2
                });
                this.audio.playDock();
                this.incomingBars.splice(bi, 1);
                this._checkMatches();
            }
        }

        // Particles
        for (var pi = this.particles.length - 1; pi >= 0; pi--) {
            var p = this.particles[pi];
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.94;
            p.vy *= 0.94;
            p.life -= dt * 2.2;
            if (p.life <= 0) {
                this.particles.splice(pi, 1);
            }
        }

        // Shockwaves
        for (var si = this.shockwaves.length - 1; si >= 0; si--) {
            var sw = this.shockwaves[si];
            sw.radius += (sw.maxRadius - sw.radius) * 0.16;
            sw.alpha -= dt * 1.8;
            if (sw.alpha <= 0) {
                this.shockwaves.splice(si, 1);
            }
        }

        // Popups
        for (var ui = this.popups.length - 1; ui >= 0; ui--) {
            var pop = this.popups[ui];
            pop.y += pop.vy;
            pop.alpha -= dt * 1.2;
            if (pop.alpha <= 0) {
                this.popups.splice(ui, 1);
            }
        }
    };

    HextrisGame.prototype._checkMatches = function () {
        var matched = [];
        var visited = {};

        function makeKey(f, l) {
            return f + ":" + l;
        }

        for (var f = 0; f < 6; f++) {
            for (var l = 0; l < this.stacks[f].length; l++) {
                var startKey = makeKey(f, l);
                if (visited[startKey]) continue;

                var targetColor = this.stacks[f][l].color;
                var group = [];
                var queue = [{ f: f, l: l }];
                visited[startKey] = true;

                while (queue.length > 0) {
                    var curr = queue.shift();
                    group.push(curr);

                    var neighbors = [
                        { f: curr.f, l: curr.l + 1 },
                        { f: curr.f, l: curr.l - 1 },
                        { f: (curr.f + 5) % 6, l: curr.l },
                        { f: (curr.f + 1) % 6, l: curr.l }
                    ];

                    for (var ni = 0; ni < neighbors.length; ni++) {
                        var n = neighbors[ni];
                        var nKey = makeKey(n.f, n.l);
                        if (visited[nKey]) continue;
                        if (n.f >= 0 && n.f < 6 && n.l >= 0 && n.l < this.stacks[n.f].length) {
                            if (this.stacks[n.f][n.l].color === targetColor) {
                                visited[nKey] = true;
                                queue.push(n);
                            }
                        }
                    }
                }

                if (group.length >= 3) {
                    for (var gi = 0; gi < group.length; gi++) {
                        matched.push(group[gi]);
                    }
                }
            }
        }

        if (matched.length > 0) {
            this._handleMatches(matched);
            return true;
        }
        return false;
    };

    HextrisGame.prototype._handleMatches = function (matched) {
        this.cascadeCount++;
        this.multiplier = Math.min(10, this.cascadeCount);
        var points = matched.length * 20 * this.multiplier;
        this.score = Math.min(10000, this.score + points);
        this.maxCombo = Math.max(this.maxCombo, this.cascadeCount);

        this.audio.playMatch(this.cascadeCount);
        this.hitstop = 35;
        this.trauma = Math.min(1, this.trauma + 0.35);

        var firstBlock = matched[0];
        var matchColor = (firstBlock && this.stacks[firstBlock.f][firstBlock.l])
            ? this.stacks[firstBlock.f][firstBlock.l].color
            : "#a050ff";

        var popupText = "+" + points + (this.cascadeCount > 1 ? " CASCADE x" + this.cascadeCount + "!" : "");
        this._spawnPopup(popupText, 0, -this.baseRadius - 25, matchColor);
        this._spawnShockwave(0, 0, matchColor);

        for (var i = 0; i < matched.length; i++) {
            var m = matched[i];
            if (this.stacks[m.f][m.l]) {
                this._spawnBlockParticles(m.f, m.l, this.stacks[m.f][m.l].color);
            }
        }

        var removeSet = {};
        for (var ri = 0; ri < matched.length; ri++) {
            removeSet[matched[ri].f + ":" + matched[ri].l] = true;
        }

        for (var f = 0; f < 6; f++) {
            var newStack = [];
            for (var l = 0; l < this.stacks[f].length; l++) {
                if (!removeSet[f + ":" + l]) {
                    newStack.push(this.stacks[f][l]);
                }
            }
            this.stacks[f] = newStack;
        }

        this.notifyScore();

        var self = this;
        setTimeout(function () {
            if (self.running && !self.gameOver && !self.paused) {
                var cascaded = self._checkMatches();
                if (!cascaded) {
                    self.cascadeCount = 0;
                    self.multiplier = 1;
                    self.notifyScore();
                }
            }
        }, 180);
    };

    HextrisGame.prototype._spawnPopup = function (text, x, y, color) {
        this.popups.push({
            text: text,
            x: x,
            y: y,
            alpha: 1.0,
            vy: -1.2,
            color: color || "#00f0ff"
        });
    };

    HextrisGame.prototype._spawnShockwave = function (x, y, color) {
        this.shockwaves.push({
            x: x,
            y: y,
            radius: this.baseRadius,
            maxRadius: this.baseRadius + 140 * this.scale,
            alpha: 0.85,
            color: color || "#a050ff"
        });
    };

    HextrisGame.prototype._spawnBlockParticles = function (face, level, color) {
        var angle = (face + 0.5) * (Math.PI / 3) + this.currentAngle;
        var r = this.baseRadius + (level + 0.5) * this.blockThickness;
        var bx = Math.cos(angle) * r;
        var by = Math.sin(angle) * r;

        for (var i = 0; i < 9; i++) {
            var pAngle = angle + (Math.random() - 0.5) * 1.4;
            var spd = 2.0 + Math.random() * 4.5;
            this.particles.push({
                x: bx,
                y: by,
                vx: Math.cos(pAngle) * spd,
                vy: Math.sin(pAngle) * spd,
                color: color,
                size: 2.2 + Math.random() * 2.8,
                life: 1.0
            });
        }
    };

    HextrisGame.prototype._triggerGameOver = function () {
        if (this.gameOver) return;
        this.gameOver = true;
        this.running = false;
        this.trauma = 0.9;
        this.audio.playGameOver();
        if (this.options.onGameOver) {
            this.options.onGameOver({
                score: this.score,
                maxCombo: this.maxCombo
            });
        }
    };

    HextrisGame.prototype._render = function () {
        var ctx = this.ctx;
        var w = this.width;
        var h = this.height;
        var cx = w * 0.5;
        var cy = h * 0.5;

        ctx.resetTransform();
        ctx.scale(this.dpr, this.dpr);
        ctx.clearRect(0, 0, w, h);

        var shakeX = (Math.random() - 0.5) * this.trauma * this.trauma * 18;
        var shakeY = (Math.random() - 0.5) * this.trauma * this.trauma * 18;

        ctx.save();
        ctx.translate(cx + shakeX, cy + shakeY);

        // Ambient stars
        for (var i = 0; i < this.ambientStars.length; i++) {
            var st = this.ambientStars[i];
            ctx.fillStyle = "rgba(168, 85, 247, " + (st.alpha * 0.4) + ")";
            ctx.beginPath();
            ctx.arc(st.x, st.y, st.radius, 0, Math.PI * 2);
            ctx.fill();
        }

        // Danger outer ring warning
        var isDanger = this.stacks.some(function (s) { return s.length >= 5; });
        var dangerPulse = 0.45 + 0.35 * Math.sin(Date.now() / 140);
        var dangerRadius = this.baseRadius + this.maxStack * this.blockThickness;

        ctx.strokeStyle = isDanger ? "rgba(239, 68, 68, " + dangerPulse + ")" : "rgba(168, 85, 247, 0.15)";
        ctx.lineWidth = isDanger ? 2.2 : 1.2;
        ctx.setLineDash(isDanger ? [6, 4] : [4, 6]);
        ctx.beginPath();
        for (var dk = 0; dk < 6; dk++) {
            var dAngle = dk * (Math.PI / 3);
            var dx = Math.cos(dAngle) * dangerRadius;
            var dy = Math.sin(dAngle) * dangerRadius;
            if (dk === 0) ctx.moveTo(dx, dy); else ctx.lineTo(dx, dy);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.setLineDash([]);

        // Render incoming bars (in world coordinates)
        for (var bi = 0; bi < this.incomingBars.length; bi++) {
            var bar = this.incomingBars[bi];
            var a0 = bar.lane * (Math.PI / 3);
            var a1 = (bar.lane + 1) * (Math.PI / 3);
            var r1 = bar.dist;
            var r2 = bar.dist + this.blockThickness - 1.5;

            ctx.fillStyle = bar.color;
            ctx.shadowColor = bar.color;
            ctx.shadowBlur = 10;

            ctx.beginPath();
            ctx.moveTo(Math.cos(a0) * r1, Math.sin(a0) * r1);
            ctx.lineTo(Math.cos(a1) * r1, Math.sin(a1) * r1);
            ctx.lineTo(Math.cos(a1) * r2, Math.sin(a1) * r2);
            ctx.lineTo(Math.cos(a0) * r2, Math.sin(a0) * r2);
            ctx.closePath();
            ctx.fill();
        }
        ctx.shadowBlur = 0;

        // Render rotating hexagon and docked stacks
        ctx.save();
        ctx.rotate(this.currentAngle);

        // Center hexagon
        ctx.fillStyle = "#110e24";
        ctx.strokeStyle = this.multiplier > 1 ? "#00f0ff" : "#a855f7";
        ctx.lineWidth = 2.5;
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = 12;

        ctx.beginPath();
        for (var k = 0; k < 6; k++) {
            var hAngle = k * (Math.PI / 3);
            var hx = Math.cos(hAngle) * this.baseRadius;
            var hy = Math.sin(hAngle) * this.baseRadius;
            if (k === 0) ctx.moveTo(hx, hy); else ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Center core text
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold " + Math.round(14 * this.scale) + "px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(this.multiplier > 1 ? "x" + this.multiplier : "HEX", 0, 0);

        // Docked blocks
        for (var f = 0; f < 6; f++) {
            var stack = this.stacks[f];
            var fa0 = f * (Math.PI / 3);
            var fa1 = (f + 1) * (Math.PI / 3);

            for (var l = 0; l < stack.length; l++) {
                var blk = stack[l];
                var br1 = this.baseRadius + l * this.blockThickness + 1.2;
                var br2 = this.baseRadius + (l + 1) * this.blockThickness - 1.2;

                ctx.fillStyle = blk.color;
                ctx.beginPath();
                ctx.moveTo(Math.cos(fa0) * br1, Math.sin(fa0) * br1);
                ctx.lineTo(Math.cos(fa1) * br1, Math.sin(fa1) * br1);
                ctx.lineTo(Math.cos(fa1) * br2, Math.sin(fa1) * br2);
                ctx.lineTo(Math.cos(fa0) * br2, Math.sin(fa0) * br2);
                ctx.closePath();
                ctx.fill();

                // Subtle rim bevel
                ctx.strokeStyle = "rgba(255, 255, 255, 0.28)";
                ctx.lineWidth = 1;
                ctx.stroke();

                if (blk.flash > 0) {
                    ctx.fillStyle = "rgba(255, 255, 255, " + blk.flash + ")";
                    ctx.fill();
                    blk.flash = Math.max(0, blk.flash - 0.05);
                }
            }
        }
        ctx.restore();

        // Shockwaves
        for (var swi = 0; swi < this.shockwaves.length; swi++) {
            var swk = this.shockwaves[swi];
            ctx.strokeStyle = swk.color;
            ctx.lineWidth = 3.5;
            ctx.globalAlpha = swk.alpha;
            ctx.beginPath();
            ctx.arc(swk.x, swk.y, swk.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        }

        // Particles
        for (var pki = 0; pki < this.particles.length; pki++) {
            var pk = this.particles[pki];
            ctx.fillStyle = pk.color;
            ctx.globalAlpha = Math.max(0, pk.life);
            ctx.fillRect(pk.x - pk.size * 0.5, pk.y - pk.size * 0.5, pk.size, pk.size);
            ctx.globalAlpha = 1.0;
        }

        // Floating Popups
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        for (var ppi = 0; ppi < this.popups.length; ppi++) {
            var pop = this.popups[ppi];
            ctx.font = "800 " + Math.round(15 * this.scale) + "px sans-serif";
            ctx.fillStyle = pop.color;
            ctx.globalAlpha = Math.max(0, pop.alpha);
            ctx.shadowColor = pop.color;
            ctx.shadowBlur = 8;
            ctx.fillText(pop.text, pop.x, pop.y);
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1.0;
        }

        ctx.restore();
    };

    window.HextrisGame = HextrisGame;

    // --- Hextris Neon Host Wiring & Controller ---
    var hxStage = document.getElementById("hextris-stage");
    var hxViewport = document.getElementById("hextris-viewport");
    var hxCanvas = document.getElementById("hextris-canvas");
    var hxStartOverlay = document.getElementById("hextris-start-overlay");
    var hxOverOverlay = document.getElementById("hextris-over-overlay");
    var hxStartBtn = document.getElementById("hextris-start-btn");
    var hxAgainBtn = document.getElementById("hextris-again-btn");
    var hxRestartBtn = document.getElementById("hx-btn-restart");
    var hxRecordBanner = document.getElementById("hextris-record-banner");
    var hxOverTitle = document.getElementById("hextris-over-title");
    var hxOverBadge = document.getElementById("hextris-over-badge");
    var hxOverScore = document.getElementById("hextris-over-score");
    var hxOverCombo = document.getElementById("hextris-over-combo");
    var hxOverBest = document.getElementById("hextris-over-best");
    var hxOverRank = document.getElementById("hextris-over-rank");
    var hxSaveStatus = document.getElementById("hextris-save-status");
    var hxHudScore = document.getElementById("hx-hud-score");
    var hxHudMult = document.getElementById("hx-hud-mult");
    var hxHudCombo = document.getElementById("hx-hud-combo");

    var hxGame = null;
    var hxState = {
        active: false,
        score: 0,
        maxCombo: 0,
        running: false
    };

    function hxEnsureGame() {
        if (!hxViewport || !hxCanvas) return null;
        if (hxGame) return hxGame;

        hxGame = new HextrisGame(hxViewport, hxCanvas, {
            muted: muted,
            onScoreUpdate: function (score, combo, multiplier) {
                hxState.score = score;
                if (hxHudScore) hxHudScore.textContent = String(score);
                if (hxHudMult) hxHudMult.textContent = "x" + multiplier;
                if (hxHudCombo) hxHudCombo.textContent = String(combo);
            },
            onGameOver: function (payload) {
                hxHandleEnd(payload);
            }
        });

        return hxGame;
    }

    function hxStartGame() {
        var g = hxEnsureGame();
        if (!g) return;
        if (hxStartOverlay) hxStartOverlay.hidden = true;
        if (hxOverOverlay) hxOverOverlay.hidden = true;
        hxState.running = true;
        g.setMuted(muted);
        g.start();
    }

    function hxPause() {
        if (hxGame) hxGame.pause();
    }

    function hxResume() {
        if (hxGame && hxState.running) {
            hxGame.setMuted(muted);
            hxGame.resume();
        }
    }

    async function hxHandleEnd(payload) {
        hxState.running = false;
        var score = Math.max(0, Math.min(10000, payload.score || 0));
        var maxCombo = Math.max(0, Math.min(score, payload.maxCombo || 0));

        if (hxOverTitle) hxOverTitle.textContent = "Run Finished";
        if (hxOverBadge) {
            hxOverBadge.textContent = "HEXAGON OVERLOAD";
            hxOverBadge.style.background = "";
        }
        if (hxOverScore) hxOverScore.textContent = String(score);
        if (hxOverCombo) hxOverCombo.textContent = "×" + maxCombo;
        if (hxOverBest) hxOverBest.textContent = String(state.bestScore || 0);
        if (hxOverRank) hxOverRank.textContent = state.myRank ? "#" + state.myRank : "—";
        if (hxSaveStatus) hxSaveStatus.textContent = "Saving score…";
        if (hxRecordBanner) hxRecordBanner.hidden = true;
        if (hxOverOverlay) hxOverOverlay.hidden = false;

        try {
            var res = await submitScore(score, maxCombo);
            if (res) {
                if (hxOverBest) hxOverBest.textContent = String(res.bestScore);
                if (hxOverRank) hxOverRank.textContent = res.rank ? "#" + res.rank : "—";
                if (hxRecordBanner) hxRecordBanner.hidden = !res.isNewBest;
                if (hxSaveStatus) {
                    hxSaveStatus.textContent = res.isNewBest
                        ? "New personal record recorded!"
                        : "Score submitted.";
                }
            }
        } catch (e) {
            if (hxSaveStatus) hxSaveStatus.textContent = "Could not save score.";
        }
    }

    if (hxStartBtn) {
        hxStartBtn.addEventListener("click", function () {
            hxStartGame();
        });
    }
    if (hxAgainBtn) {
        hxAgainBtn.addEventListener("click", function () {
            hxStartGame();
        });
    }
    if (hxRestartBtn) {
        hxRestartBtn.addEventListener("click", function () {
            hxStartGame();
        });
    }


    // --- Hub Game Switcher & Views ---
    function showHub(pushState) {
        if (pushState !== false) {
            history.pushState(null, "", "/games");
        }
        if (hubView) hubView.hidden = false;
        if (stageView) stageView.hidden = true;
        if (hubActions) hubActions.hidden = true;

        if (pageTitleEl) pageTitleEl.textContent = "Games";
        if (pageKickerEl) pageKickerEl.textContent = "Solo arcade games & global high scores.";

        msPauseClock();
        slopePause();
        wwPause();
        cbPause();
        hxPause();

        loadMyBestScores();
        loadHubLeaderboard(hubHallKey);
    }

    function launchGame(nextKey, pushState) {
        if (!nextKey) nextKey = "stack-3d";
        var targetDef = GAME_DEFS[nextKey];
        if (targetDef && !targetDef.available) {
            if (window.mcwut && window.mcwut.toast) {
                window.mcwut.toast(targetDef.name + " is coming soon!", { kind: "info" });
            }
            return;
        }
        if (pushState !== false) {
            history.pushState(null, "", "/games?game=" + encodeURIComponent(nextKey));
        }
        if (hubView) hubView.hidden = true;
        if (stageView) stageView.hidden = false;
        if (hubActions) hubActions.hidden = false;

        if (pageTitleEl) pageTitleEl.textContent = "Arcade Games";
        if (pageKickerEl) pageKickerEl.textContent = "Play solo in this browser and chase the global high score.";

        switchGame(nextKey);
    }

    function switchGame(nextKey) {
        if (nextKey !== "stack-3d" && nextKey !== "mini-crossword" && nextKey !== "minesweeper" && nextKey !== "neon-slope" && nextKey !== "merge-2048" && nextKey !== "wacky-wheels" && nextKey !== "brick-breaker" && nextKey !== "hextris") {
            return;
        }
        GAME_KEY = nextKey;
        msState.active = nextKey === "minesweeper";
        slopeState.active = nextKey === "neon-slope";
        n2048State.active = nextKey === "merge-2048";
        wwState.active = nextKey === "wacky-wheels";
        cbState.active = nextKey === "brick-breaker";
        hxState.active = nextKey === "hextris";

        if (hubView) hubView.hidden = true;
        if (stageView) stageView.hidden = false;
        if (hubActions) hubActions.hidden = false;

        if (hubStrip) {
            var tabs = hubStrip.querySelectorAll("[data-game-key]");
            for (var i = 0; i < tabs.length; i++) {
                var isMatch = tabs[i].getAttribute("data-game-key") === nextKey;
                tabs[i].classList.toggle("is-active", isMatch);
                tabs[i].setAttribute("aria-selected", isMatch ? "true" : "false");
            }
        }

        if (nextKey === "mini-crossword") {
            msPauseClock();
            slopePause();
            wwPause();
            cbPause();
            hxPause();
            viewport.hidden = true;
            if (cwStage) cwStage.hidden = false;
            if (msStage) msStage.hidden = true;
            if (slopeStage) slopeStage.hidden = true;
            if (n2048Stage) n2048Stage.hidden = true;
            if (wwStage) wwStage.hidden = true;
            if (cbStage) cbStage.hidden = true;
            if (hxStage) hxStage.hidden = true;
            if (activeTitleEl) activeTitleEl.textContent = "Mini Crossword";
            if (stageHintEl) {
                stageHintEl.innerHTML = "Tap cells or clues · Type or use touch keys · <kbd>Space</kbd> flips direction";
            }
        } else if (nextKey === "minesweeper") {
            slopePause();
            wwPause();
            cbPause();
            hxPause();
            viewport.hidden = true;
            if (cwStage) cwStage.hidden = true;
            if (msStage) msStage.hidden = false;
            if (slopeStage) slopeStage.hidden = true;
            if (n2048Stage) n2048Stage.hidden = true;
            if (wwStage) wwStage.hidden = true;
            if (cbStage) cbStage.hidden = true;
            if (hxStage) hxStage.hidden = true;
            if (activeTitleEl) activeTitleEl.textContent = "Minesweeper";
            if (stageHintEl) {
                stageHintEl.innerHTML = "Tap to reveal · Long-press or <kbd>F</kbd> to flag · Chain big cascades";
            }
            requestAnimationFrame(function () {
                msResize();
            });
            msResumeClock();
        } else if (nextKey === "neon-slope") {
            msPauseClock();
            wwPause();
            cbPause();
            hxPause();
            viewport.hidden = true;
            if (cwStage) cwStage.hidden = true;
            if (msStage) msStage.hidden = true;
            if (slopeStage) slopeStage.hidden = false;
            if (n2048Stage) n2048Stage.hidden = true;
            if (wwStage) wwStage.hidden = true;
            if (cbStage) cbStage.hidden = true;
            if (hxStage) hxStage.hidden = true;
            if (activeTitleEl) activeTitleEl.textContent = "Neon Slope";
            if (stageHintEl) {
                stageHintEl.innerHTML = "← → or <kbd>A</kbd> <kbd>D</kbd> steer · <kbd>Space</kbd> / ↑ jump · Touch controls";
            }
            requestAnimationFrame(function () {
                slopeResize();
            });
            slopeResume();
        } else if (nextKey === "merge-2048") {
            msPauseClock();
            slopePause();
            wwPause();
            cbPause();
            hxPause();
            viewport.hidden = true;
            if (cwStage) cwStage.hidden = true;
            if (msStage) msStage.hidden = true;
            if (slopeStage) slopeStage.hidden = true;
            if (n2048Stage) n2048Stage.hidden = false;
            if (wwStage) wwStage.hidden = true;
            if (cbStage) cbStage.hidden = true;
            if (hxStage) hxStage.hidden = true;
            if (activeTitleEl) activeTitleEl.textContent = "2048 Neon";
            if (stageHintEl) {
                stageHintEl.innerHTML = "Swipe or Arrows / <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> to slide & merge · Reach 2048!";
            }
            n2048RenderBoard();
        } else if (nextKey === "wacky-wheels") {
            msPauseClock();
            slopePause();
            cbPause();
            hxPause();
            viewport.hidden = true;
            if (cwStage) cwStage.hidden = true;
            if (msStage) msStage.hidden = true;
            if (slopeStage) slopeStage.hidden = true;
            if (n2048Stage) n2048Stage.hidden = true;
            if (wwStage) wwStage.hidden = false;
            if (cbStage) cbStage.hidden = true;
            if (hxStage) hxStage.hidden = true;
            if (activeTitleEl) activeTitleEl.textContent = "Wacky Wheels";
            if (stageHintEl) {
                stageHintEl.innerHTML = "<kbd>W</kbd>/<kbd>↑</kbd> Gas · <kbd>S</kbd>/<kbd>↓</kbd> Brake · <kbd>A</kbd>/<kbd>D</kbd> Lean · <kbd>Space</kbd> Eject · <kbd>R</kbd> Restart";
            }
            wwLoadLevelsList(false);
            requestAnimationFrame(function () {
                wwResize();
                wwResume();
            });
        } else if (nextKey === "brick-breaker") {
            msPauseClock();
            slopePause();
            wwPause();
            hxPause();
            viewport.hidden = true;
            if (cwStage) cwStage.hidden = true;
            if (msStage) msStage.hidden = true;
            if (slopeStage) slopeStage.hidden = true;
            if (n2048Stage) n2048Stage.hidden = true;
            if (wwStage) wwStage.hidden = true;
            if (cbStage) cbStage.hidden = false;
            if (hxStage) hxStage.hidden = true;
            if (activeTitleEl) activeTitleEl.textContent = "Cyber Breakout";
            if (stageHintEl) {
                stageHintEl.innerHTML = "Mouse / Touch / <kbd>A</kbd><kbd>D</kbd> steer · <kbd>Space</kbd> / Tap launch & fire · <kbd>R</kbd> restart";
            }
            cbEnsureGame();
            cbResume();
        } else if (nextKey === "hextris") {
            msPauseClock();
            slopePause();
            wwPause();
            cbPause();
            viewport.hidden = true;
            if (cwStage) cwStage.hidden = true;
            if (msStage) msStage.hidden = true;
            if (slopeStage) slopeStage.hidden = true;
            if (n2048Stage) n2048Stage.hidden = true;
            if (wwStage) wwStage.hidden = true;
            if (cbStage) cbStage.hidden = true;
            if (hxStage) hxStage.hidden = false;
            if (activeTitleEl) activeTitleEl.textContent = "Hextris Neon";
            if (stageHintEl) {
                stageHintEl.innerHTML = "Tap Left/Right or <kbd>A</kbd><kbd>D</kbd> / <kbd>&larr;</kbd><kbd>&rarr;</kbd> Rotate &middot; <kbd>S</kbd>/<kbd>&darr;</kbd> Drop &middot; Match 3+ colors";
            }
            hxEnsureGame();
            hxResume();
        } else {
            msPauseClock();
            slopePause();
            wwPause();
            cbPause();
            hxPause();
            if (cwStage) cwStage.hidden = true;
            if (msStage) msStage.hidden = true;
            if (slopeStage) slopeStage.hidden = true;
            if (n2048Stage) n2048Stage.hidden = true;
            if (wwStage) wwStage.hidden = true;
            if (cbStage) cbStage.hidden = true;
            if (hxStage) hxStage.hidden = true;
            viewport.hidden = false;
            if (activeTitleEl) activeTitleEl.textContent = "Stack 3D";
            if (stageHintEl) {
                stageHintEl.innerHTML = "Click, tap, or press <kbd>Space</kbd> to drop";
            }
            resizeViewport();
        }

        loadLeaderboard();
    }

    if (hubStrip) {
        hubStrip.addEventListener("click", function (ev) {
            var card = ev.target.closest("[data-game-key]");
            if (!card) return;
            var key = card.getAttribute("data-game-key");
            if (key && key !== GAME_KEY) {
                launchGame(key, true);
            }
        });
    }

    if (backToHubBtn) {
        backToHubBtn.addEventListener("click", function () {
            showHub(true);
        });
    }

    if (stageBackBtn) {
        stageBackBtn.addEventListener("click", function () {
            showHub(true);
        });
    }

    if (hubView) {
        hubView.addEventListener("click", function (ev) {
            var btn = ev.target.closest("[data-launch-game]");
            if (btn) {
                var g = btn.getAttribute("data-launch-game");
                if (g) {
                    launchGame(g, true);
                    return;
                }
            }
            var tile = ev.target.closest(".game-tile[data-game-key], .game-tile-card[data-game-key]");
            if (tile) {
                var gk = tile.getAttribute("data-game-key");
                var def = GAME_DEFS[gk];
                if (tile.classList.contains("is-soon") || (def && !def.available)) {
                    var name = def ? def.name : "That game";
                    if (window.mcwut && window.mcwut.toast) {
                        window.mcwut.toast(name + " is coming soon!", { kind: "info" });
                    }
                    return;
                }
                if (gk) {
                    launchGame(gk, true);
                    return;
                }
            }
        });

        hubView.addEventListener("keydown", function (ev) {
            if (ev.key === "Enter" || ev.key === " ") {
                var tile = ev.target.closest(".game-tile[data-game-key], .game-tile-card[data-game-key]");
                if (tile) {
                    ev.preventDefault();
                    var gk = tile.getAttribute("data-game-key");
                    var def = GAME_DEFS[gk];
                    if (tile.classList.contains("is-soon") || (def && !def.available)) {
                        var name = def ? def.name : "That game";
                        if (window.mcwut && window.mcwut.toast) {
                            window.mcwut.toast(name + " is coming soon!", { kind: "info" });
                        }
                        return;
                    }
                    if (gk) {
                        launchGame(gk, true);
                    }
                }
            }
        });
    }

    var hallPills = document.querySelectorAll("[data-hall-game]");
    for (var h = 0; h < hallPills.length; h++) {
        hallPills[h].addEventListener("click", function () {
            var g = this.getAttribute("data-hall-game");
            if (!g) return;
            var def = GAME_DEFS[g];
            if (def && !def.available) {
                if (window.mcwut && window.mcwut.toast) {
                    window.mcwut.toast(def.name + " is coming soon!", { kind: "info" });
                }
                return;
            }
            for (var j = 0; j < hallPills.length; j++) {
                var match = hallPills[j] === this;
                hallPills[j].classList.toggle("is-active", match);
                hallPills[j].setAttribute("aria-selected", match ? "true" : "false");
            }
            loadHubLeaderboard(g);
        });
    }

    window.addEventListener("popstate", function () {
        var sp = new URLSearchParams(window.location.search);
        var g = sp.get("game");
        if (g && GAME_DEFS[g] && GAME_DEFS[g].available) {
            launchGame(g, false);
        } else {
            showHub(false);
        }
    });

    // --- Input Bindings ---
    if (startBtn) {
        startBtn.addEventListener("click", function (ev) {
            ev.stopPropagation();
            startGame();
        });
    }

    if (againBtn) {
        againBtn.addEventListener("click", function (ev) {
            ev.stopPropagation();
            startGame();
        });
    }

    if (restartBtn) {
        restartBtn.addEventListener("click", function () {
            if (GAME_KEY === "mini-crossword") {
                loadCrosswordPuzzle(cwState.puzzleIdx);
            } else if (GAME_KEY === "minesweeper") {
                msNewGame();
            } else if (GAME_KEY === "neon-slope") {
                slopeStartGame();
            } else if (GAME_KEY === "merge-2048") {
                n2048StartGame();
            } else if (GAME_KEY === "wacky-wheels") {
                wwStartGame();
            } else if (GAME_KEY === "brick-breaker") {
                cbStartGame();
            } else if (GAME_KEY === "hextris") {
                hxStartGame();
            } else {
                startGame();
            }
        });
    }

    if (refreshBtn) {
        refreshBtn.addEventListener("click", function () {
            loadLeaderboard();
        });
    }

    viewport.addEventListener("pointerdown", function (ev) {
        if (GAME_KEY !== "stack-3d") return;
        if (ev.target.closest("button") || ev.target.closest("a")) {
            return;
        }
        if (state.mode === "playing") {
            ev.preventDefault();
            placeActiveSlab();
        } else if (state.mode === "idle") {
            ev.preventDefault();
            startGame();
        }
    });

    window.addEventListener("keydown", function (ev) {
        var tag = document.activeElement ? document.activeElement.tagName : "";
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
            return;
        }
        if (GAME_KEY === "wacky-wheels" && wwState.mode === "editor" && (ev.ctrlKey || ev.metaKey) && (ev.key === "z" || ev.key === "Z")) {
            ev.preventDefault();
            wwEditorUndo();
            return;
        }
        if (ev.ctrlKey || ev.metaKey || ev.altKey) {
            return;
        }

        if (GAME_KEY === "wacky-wheels") {
            if (wwPublishOverlay && !wwPublishOverlay.hidden) {
                if (ev.key === "Escape") {
                    wwPublishOverlay.hidden = true;
                }
                return;
            }
            if (wwLevelsOverlay && !wwLevelsOverlay.hidden) {
                if (ev.key === "Escape") {
                    wwLevelsOverlay.hidden = true;
                    wwSyncModeUi();
                }
                return;
            }
            if (wwState.mode === "editor") {
                if (ev.code === "ArrowLeft" || ev.key === "a" || ev.key === "A") {
                    ev.preventDefault();
                    wwState.camX = Math.max(-80, wwState.camX - 140);
                    wwEditor.savedCamX = wwState.camX;
                } else if (ev.code === "ArrowRight" || ev.key === "d" || ev.key === "D") {
                    ev.preventDefault();
                    wwState.camX = Math.min(12200, wwState.camX + 140);
                    wwEditor.savedCamX = wwState.camX;
                } else if (ev.code === "ArrowUp" || ev.key === "w" || ev.key === "W") {
                    ev.preventDefault();
                    wwState.camY = Math.max(-220, wwState.camY - 90);
                    wwEditor.savedCamY = wwState.camY;
                } else if (ev.code === "ArrowDown" || ev.key === "s" || ev.key === "S") {
                    ev.preventDefault();
                    wwState.camY = Math.min(620, wwState.camY + 90);
                    wwEditor.savedCamY = wwState.camY;
                }
                return;
            }
            if (ev.key === "r" || ev.key === "R") {
                ev.preventDefault();
                wwStartGame();
            } else if (ev.code === "ArrowUp" || ev.key === "w" || ev.key === "W") {
                ev.preventDefault();
                if (wwState.mode === "idle") wwStartGame();
                wwInput.gas = true;
            } else if (ev.code === "ArrowDown" || ev.key === "s" || ev.key === "S") {
                ev.preventDefault();
                if (wwState.mode === "idle") wwStartGame();
                wwInput.brake = true;
            } else if (ev.code === "ArrowLeft" || ev.key === "a" || ev.key === "A") {
                ev.preventDefault();
                wwInput.left = true;
            } else if (ev.code === "ArrowRight" || ev.key === "d" || ev.key === "D") {
                ev.preventDefault();
                wwInput.right = true;
            } else if (ev.code === "Space") {
                ev.preventDefault();
                if (!ev.repeat) {
                    if (wwState.mode === "idle" || wwState.mode === "gameover") {
                        wwStartGame();
                    } else {
                        wwTriggerEjectOrBoost();
                    }
                }
            } else if (ev.key === "Enter") {
                if (wwState.mode === "idle" || wwState.mode === "gameover") {
                    ev.preventDefault();
                    wwStartGame();
                }
            }
            return;
        }

        if (GAME_KEY === "neon-slope") {
            if (ev.key === "r" || ev.key === "R") {
                ev.preventDefault();
                slopeStartGame();
            } else if (ev.code === "ArrowLeft" || ev.key === "a" || ev.key === "A") {
                ev.preventDefault();
                slopeInput.left = true;
            } else if (ev.code === "ArrowRight" || ev.key === "d" || ev.key === "D") {
                ev.preventDefault();
                slopeInput.right = true;
            } else if (ev.code === "Space" || ev.code === "ArrowUp" || ev.key === "w" || ev.key === "W") {
                ev.preventDefault();
                if (slopeState.mode === "idle" || slopeState.mode === "gameover") {
                    slopeStartGame();
                } else {
                    slopeJump();
                }
            }
            return;
        }

        if (GAME_KEY === "merge-2048") {
            if (ev.key === "r" || ev.key === "R") {
                ev.preventDefault();
                n2048StartGame();
            } else if (ev.key === "z" || ev.key === "Z" || ev.key === "u" || ev.key === "U") {
                ev.preventDefault();
                n2048Undo();
            } else if (ev.code === "ArrowLeft" || ev.key === "a" || ev.key === "A") {
                ev.preventDefault();
                n2048Slide("left");
            } else if (ev.code === "ArrowRight" || ev.key === "d" || ev.key === "D") {
                ev.preventDefault();
                n2048Slide("right");
            } else if (ev.code === "ArrowUp" || ev.key === "w" || ev.key === "W") {
                ev.preventDefault();
                n2048Slide("up");
            } else if (ev.code === "ArrowDown" || ev.key === "s" || ev.key === "S") {
                ev.preventDefault();
                n2048Slide("down");
            } else if (ev.code === "Space" || ev.key === "Enter") {
                if (n2048State.mode === "idle" || n2048State.mode === "gameover") {
                    ev.preventDefault();
                    n2048StartGame();
                }
            }
            return;
        }

        if (GAME_KEY === "minesweeper") {
            if (ev.key === "r" || ev.key === "R") {
                ev.preventDefault();
                msNewGame();
            } else if (ev.key === "f" || ev.key === "F") {
                ev.preventDefault();
                msToggleFlagMode();
            } else if (ev.key === "1") {
                ev.preventDefault();
                msSetDifficulty("easy");
            } else if (ev.key === "2") {
                ev.preventDefault();
                msSetDifficulty("medium");
            } else if (ev.key === "3") {
                ev.preventDefault();
                msSetDifficulty("hard");
            } else if (ev.code === "Space" || ev.key === "Enter") {
                if ((msStartOverlay && !msStartOverlay.hidden) || (msOverOverlay && !msOverOverlay.hidden)) {
                    ev.preventDefault();
                    msNewGame();
                }
            }
            return;
        }

        if (GAME_KEY === "mini-crossword") {
            if (ev.key && ev.key.length === 1 && /^[a-zA-Z]$/.test(ev.key)) {
                ev.preventDefault();
                inputCwLetter(ev.key);
            } else if (ev.key === "Backspace" || ev.key === "Delete") {
                ev.preventDefault();
                handleCwBackspace();
            } else if (ev.code === "Space") {
                ev.preventDefault();
                cwState.dir = cwState.dir === "across" ? "down" : "across";
                updateCwBoardUi();
            } else if (ev.key === "Tab") {
                ev.preventDefault();
                cycleCwWord(ev.shiftKey ? -1 : 1);
            } else if (ev.key === "ArrowRight") {
                ev.preventDefault();
                cwState.dir = "across";
                stepCwCursor(1);
                updateCwBoardUi();
            } else if (ev.key === "ArrowLeft") {
                ev.preventDefault();
                cwState.dir = "across";
                stepCwCursor(-1);
                updateCwBoardUi();
            } else if (ev.key === "ArrowDown") {
                ev.preventDefault();
                cwState.dir = "down";
                stepCwCursor(1);
                updateCwBoardUi();
            } else if (ev.key === "ArrowUp") {
                ev.preventDefault();
                cwState.dir = "down";
                stepCwCursor(-1);
                updateCwBoardUi();
            }
            return;
        }

        if (GAME_KEY === "hextris") {
            if (ev.key === "r" || ev.key === "R") {
                ev.preventDefault();
                hxStartGame();
            } else if (ev.code === "ArrowLeft" || ev.key === "a" || ev.key === "A") {
                ev.preventDefault();
                if (hxGame && hxState.running) hxGame.rotateLeft();
            } else if (ev.code === "ArrowRight" || ev.key === "d" || ev.key === "D") {
                ev.preventDefault();
                if (hxGame && hxState.running) hxGame.rotateRight();
            } else if (ev.code === "ArrowDown" || ev.key === "s" || ev.key === "S") {
                ev.preventDefault();
                if (hxGame && hxState.running) hxGame.setSoftDrop(true);
            } else if (ev.code === "Space") {
                ev.preventDefault();
                if (!hxState.running) {
                    hxStartGame();
                } else if (hxGame) {
                    hxGame.togglePause();
                }
            }
            return;
        }

        if (ev.code === "Space" || ev.code === "ArrowDown" || ev.code === "Enter") {
            if (state.mode === "playing") {
                ev.preventDefault();
                placeActiveSlab();
            } else if (state.mode === "idle" || state.mode === "gameover") {
                ev.preventDefault();
                startGame();
            }
        } else if (ev.key === "r" || ev.key === "R") {
            if (state.mode === "playing" || state.mode === "gameover") {
                ev.preventDefault();
                startGame();
            }
        }
    });

    window.addEventListener("keyup", function (ev) {
        if (GAME_KEY === "neon-slope") {
            if (ev.code === "ArrowLeft" || ev.key === "a" || ev.key === "A") {
                slopeInput.left = false;
            } else if (ev.code === "ArrowRight" || ev.key === "d" || ev.key === "D") {
                slopeInput.right = false;
            }
        } else if (GAME_KEY === "wacky-wheels") {
            if (ev.code === "ArrowUp" || ev.key === "w" || ev.key === "W") {
                wwInput.gas = false;
            } else if (ev.code === "ArrowDown" || ev.key === "s" || ev.key === "S") {
                wwInput.brake = false;
            } else if (ev.code === "ArrowLeft" || ev.key === "a" || ev.key === "A") {
                wwInput.left = false;
            } else if (ev.code === "ArrowRight" || ev.key === "d" || ev.key === "D") {
                wwInput.right = false;
            }
        } else if (GAME_KEY === "hextris") {
            if (ev.code === "ArrowDown" || ev.key === "s" || ev.key === "S") {
                if (hxGame) hxGame.setSoftDrop(false);
            }
        }
    });

    window.addEventListener("blur", function () {
        wwInput.gas = false;
        wwInput.brake = false;
        wwInput.left = false;
        wwInput.right = false;
        wwSilenceAudio();
    });

    // --- Boot ---
    initGraphics();
    slopeInitGraphics();
    setupIdleDemo();
    updateViewportBackground(state.baseHue);
    initCrosswordEvents();
    n2048RenderBoard();
    wwResetWorld();

    // Support deep-linking via ?game=stack-3d, ?game=mini-crossword, ?game=minesweeper, ?game=neon-slope, ?game=merge-2048, or ?game=wacky-wheels(&level=...)
    var params = new URLSearchParams(window.location.search);
    var linkedGame = params.get("game");
    var linkedLevel = params.get("level");
    if (linkedGame && GAME_DEFS[linkedGame] && GAME_DEFS[linkedGame].available) {
        launchGame(linkedGame, false);
        if (linkedGame === "wacky-wheels" && linkedLevel) {
            wwLoadAndPlayCustomLevel(linkedLevel, "play", false);
        }
    } else {
        if (linkedGame && GAME_DEFS[linkedGame] && !GAME_DEFS[linkedGame].available) {
            if (window.mcwut && window.mcwut.toast) {
                window.mcwut.toast(GAME_DEFS[linkedGame].name + " is coming soon!", { kind: "info" });
            }
        }
        showHub(false);
    }
    requestAnimationFrame(loop);
})();
