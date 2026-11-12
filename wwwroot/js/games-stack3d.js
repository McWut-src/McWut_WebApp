(function () {
    "use strict";

    window.McWutGames = window.McWutGames || {};

    var BASE_SIZE = 5.0;
    var BOX_HEIGHT = 0.85;
    var MOVE_BOUNDS = 6.8;
    var PERFECT_TOLERANCE = 0.17;
    var GRAVITY = 30.0;

    var canvas = document.getElementById("stack-canvas");
    var viewport = document.getElementById("stack-viewport");

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


    window.McWutGames.stack3d = {
        state: state,
        initGraphics: initGraphics,
        setupIdleDemo: setupIdleDemo,
        updateViewportBackground: updateViewportBackground,
        resizeViewport: resizeViewport,
        startGame: startGame,
        placeActiveSlab: placeActiveSlab,
        triggerGameOver: triggerGameOver,
        loop: loop,
        updateHud: updateHud,
        updateTargetHud: updateTargetHud
    };

    window.initGraphics = initGraphics;
    window.setupIdleDemo = setupIdleDemo;
    window.updateViewportBackground = updateViewportBackground;
    window.resizeViewport = resizeViewport;
    window.startGame = startGame;
    window.placeActiveSlab = placeActiveSlab;
    window.loop = loop;
    window.stackState = state;
    try {
        Object.defineProperty(window, "state", {
            get: function () { return state; },
            configurable: true
        });
    } catch (e) {
        window.state = state;
    }
})();
