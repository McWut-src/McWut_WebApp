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
            var emptyGameTitle = GAME_KEY === "mini-crossword" ? "Mini Crossword" : "Stack 3D";
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

            var comboLabel = GAME_KEY === "mini-crossword" ? "clean words" : "streak";
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

    // --- Hub Game Switcher ---
    function switchGame(nextKey) {
        if (nextKey !== "stack-3d" && nextKey !== "mini-crossword") {
            return;
        }
        GAME_KEY = nextKey;

        if (hubStrip) {
            var tabs = hubStrip.querySelectorAll("[data-game-key]");
            for (var i = 0; i < tabs.length; i++) {
                var isMatch = tabs[i].getAttribute("data-game-key") === nextKey;
                tabs[i].classList.toggle("is-active", isMatch);
                tabs[i].setAttribute("aria-selected", isMatch ? "true" : "false");
            }
        }

        if (nextKey === "mini-crossword") {
            viewport.hidden = true;
            if (cwStage) cwStage.hidden = false;
            if (activeTitleEl) activeTitleEl.textContent = "Mini Crossword";
            if (stageHintEl) {
                stageHintEl.innerHTML = "Tap cells or clues · Type or use touch keys · <kbd>Space</kbd> flips direction";
            }
        } else {
            if (cwStage) cwStage.hidden = true;
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

    // Support deep-linking via ?game=mini-crossword
    var params = new URLSearchParams(window.location.search);
    if (params.get("game") === "mini-crossword") {
        switchGame("mini-crossword");
    } else {
        loadLeaderboard();
    }
    requestAnimationFrame(loop);
})();
