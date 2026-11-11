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
            }
            if (overSaveStatus) {
                overSaveStatus.textContent = res.isNewBest
                    ? "New personal record saved to the global leaderboard!"
                    : "Score recorded on the global leaderboard.";
            }
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

        if (!boardList) return;
        var entries = board.entries || [];
        if (entries.length === 0) {
            var emptyGameTitle = GAME_KEY === "mini-crossword"
                ? "Mini Crossword"
                : GAME_KEY === "minesweeper"
                    ? "Minesweeper"
                    : "Stack 3D";
            boardList.innerHTML =
                '<div class="game-board-empty">' +
                "<p class=\"mb-1 fw-semibold\">No scores yet!</p>" +
                "<p class=\"small text-muted mb-0\">Play a round of " + emptyGameTitle + " to claim the #1 global spot.</p>" +
                "</div>";
            return;
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
                ? '<span class="game-board-tag">' + esc(e.statusTag) + "</span>"
                : "";

            var youHtml = e.isMe
                ? '<span class="game-board-you">You</span>'
                : "";

            var comboLabel = GAME_KEY === "mini-crossword"
                ? "clean words"
                : GAME_KEY === "minesweeper"
                    ? "cascade"
                    : "streak";
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

        boardList.innerHTML = html;
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

        updatePhysics(dt);
        renderScene();
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
        } else if (msState.active) {
            msResumeClock();
        }
    });
    requestAnimationFrame(msLoop);

    // --- Hub Game Switcher ---
    function switchGame(nextKey) {
        if (nextKey !== "stack-3d" && nextKey !== "mini-crossword" && nextKey !== "minesweeper") {
            return;
        }
        GAME_KEY = nextKey;
        msState.active = nextKey === "minesweeper";

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
            viewport.hidden = true;
            if (cwStage) cwStage.hidden = false;
            if (msStage) msStage.hidden = true;
            if (activeTitleEl) activeTitleEl.textContent = "Mini Crossword";
            if (stageHintEl) {
                stageHintEl.innerHTML = "Tap cells or clues · Type or use touch keys · <kbd>Space</kbd> flips direction";
            }
        } else if (nextKey === "minesweeper") {
            viewport.hidden = true;
            if (cwStage) cwStage.hidden = true;
            if (msStage) msStage.hidden = false;
            if (activeTitleEl) activeTitleEl.textContent = "Minesweeper";
            if (stageHintEl) {
                stageHintEl.innerHTML = "Tap to reveal · Long-press or <kbd>F</kbd> to flag · Chain big cascades";
            }
            requestAnimationFrame(function () {
                msResize();
            });
            msResumeClock();
        } else {
            msPauseClock();
            if (cwStage) cwStage.hidden = true;
            if (msStage) msStage.hidden = true;
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
                switchGame(key);
            }
        });
    }

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
        if (ev.ctrlKey || ev.metaKey || ev.altKey) {
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

    // --- Boot ---
    initGraphics();
    setupIdleDemo();
    updateViewportBackground(state.baseHue);
    initCrosswordEvents();

    // Support deep-linking via ?game=mini-crossword or ?game=minesweeper
    var params = new URLSearchParams(window.location.search);
    var linkedGame = params.get("game");
    if (linkedGame === "mini-crossword" || linkedGame === "minesweeper") {
        switchGame(linkedGame);
    } else {
        loadLeaderboard();
    }
    requestAnimationFrame(loop);
})();
