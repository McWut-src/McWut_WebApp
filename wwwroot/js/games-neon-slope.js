(function () {
    "use strict";

    window.McWutGames = window.McWutGames || {};

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


    window.McWutGames.neonSlope = {
        state: slopeState,
        input: slopeInput,
        slopeInitGraphics: slopeInitGraphics,
        slopeStartGame: slopeStartGame,
        slopePause: slopePause,
        slopeResume: slopeResume,
        slopeResize: slopeResize,
        slopeJump: slopeJump
    };
    window.slopeState = slopeState;
    window.slopeInput = slopeInput;
    window.slopeInitGraphics = slopeInitGraphics;
    window.slopeStartGame = slopeStartGame;
    window.slopePause = slopePause;
    window.slopeResume = slopeResume;
    window.slopeResize = slopeResize;
    window.slopeJump = slopeJump;
})();
