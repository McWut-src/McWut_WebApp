(function () {
    "use strict";

    window.McWutGames = window.McWutGames || {};

    // =========================================================================
    // --- Meme Merge (Suika-Style Drop & Merge 2D Physics Game) ---
    // =========================================================================

    // Tier definitions with vibrant neon color gradient from smallest to biggest:
    // Violet -> Blue -> Cyan -> Emerald -> Lime ("6 7") -> Amber -> Orange -> Crimson -> Magenta -> Radiant Gold (THE ROCK)
    var MEME_TIERS = [
        { tier: 1,  name: "Skull",         file: "meme-skull.svg",         r: 16, pts: 2,    color: "#8b5cf6", stroke: "#a78bfa", emoji: "💀" },
        { tier: 2,  name: "Clown",         file: "meme-clown.svg",         r: 23, pts: 4,    color: "#3b82f6", stroke: "#60a5fa", emoji: "🤡" },
        { tier: 3,  name: "Cap",           file: "meme-cap.svg",           r: 31, pts: 8,    color: "#06b6d4", stroke: "#22d3ee", emoji: "🧢" },
        { tier: 4,  name: "Bruh",          file: "meme-bruh.svg",          r: 40, pts: 16,   color: "#10b981", stroke: "#34d399", emoji: "😐" },
        { tier: 5,  name: "6 7",           file: "meme-six-seven.svg",     r: 51, pts: 32,   color: "#84cc16", stroke: "#a3e635", emoji: "6️⃣7️⃣" },
        { tier: 6,  name: "This Is Fine",  file: "meme-this-is-fine.svg",  r: 63, pts: 64,   color: "#eab308", stroke: "#fde047", emoji: "☕" },
        { tier: 7,  name: "Fire",          file: "meme-fire.svg",          r: 77, pts: 128,  color: "#f97316", stroke: "#fb923c", emoji: "🔥" },
        { tier: 8,  name: "Gigachad",      file: "meme-chad-stone.svg",    r: 93, pts: 256,  color: "#ef4444", stroke: "#f87171", emoji: "🗿" },
        { tier: 9,  name: "Big W",         file: "meme-big-w.svg",         r: 112, pts: 512, color: "#d946ef", stroke: "#f472b6", emoji: "🏆" },
        { tier: 10, name: "THE ROCK",      file: "meme-rock-side-eye.svg", r: 135, pts: 1024, color: "#facc15", stroke: "#ffffff", emoji: "🤨" }
    ];

    var SIM_WIDTH = 380;
    var SIM_HEIGHT = 560;
    var WALL_LEFT = 16;
    var WALL_RIGHT = 364;
    var FLOOR_Y = 544;
    var DANGER_Y = 96;
    var DROP_Y = 46;
    var GRAVITY = 980;

    // --- Audio Synthesizer (featuring the legendary Vine Boom) ---
    function MemeMergeAudio() {
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
            playDrop: function () {
                if (muted) return;
                var c = getCtx();
                if (!c) return;
                var now = c.currentTime;
                var osc = c.createOscillator();
                var gain = c.createGain();
                osc.type = "sine";
                osc.frequency.setValueAtTime(380, now);
                osc.frequency.exponentialRampToValueAtTime(140, now + 0.08);
                gain.gain.setValueAtTime(0.12, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
                osc.connect(gain);
                gain.connect(c.destination);
                osc.start(now);
                osc.stop(now + 0.08);
            },
            playImpact: function (tier, speed) {
                if (muted) return;
                var c = getCtx();
                if (!c) return;
                var now = c.currentTime;
                var vol = Math.min(0.18, Math.max(0.02, (speed || 50) / 400 * 0.14));
                var freq = Math.max(55, 200 - (tier || 1) * 12);
                var osc = c.createOscillator();
                var gain = c.createGain();
                osc.type = "triangle";
                osc.frequency.setValueAtTime(freq, now);
                osc.frequency.exponentialRampToValueAtTime(35, now + 0.06);
                gain.gain.setValueAtTime(vol, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
                osc.connect(gain);
                gain.connect(c.destination);
                osc.start(now);
                osc.stop(now + 0.06);
            },
            playMerge: function (tier, combo) {
                if (muted) return;
                var c = getCtx();
                if (!c) return;
                var now = c.currentTime;
                var baseFreq = 220 * Math.pow(1.12, Math.min(tier || 1, 9));
                var comboMult = 1 + Math.min((combo || 1) - 1, 6) * 0.1;
                var osc = c.createOscillator();
                var gain = c.createGain();
                osc.type = "sine";
                osc.frequency.setValueAtTime(baseFreq * comboMult, now);
                osc.frequency.exponentialRampToValueAtTime(baseFreq * comboMult * 1.8, now + 0.14);
                gain.gain.setValueAtTime(0.22, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
                osc.connect(gain);
                gain.connect(c.destination);
                osc.start(now);
                osc.stop(now + 0.18);

                // Harmonic shimmer
                var osc2 = c.createOscillator();
                var gain2 = c.createGain();
                osc2.type = "triangle";
                osc2.frequency.setValueAtTime(baseFreq * comboMult * 2, now + 0.02);
                gain2.gain.setValueAtTime(0.08, now + 0.02);
                gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
                osc2.connect(gain2);
                gain2.connect(c.destination);
                osc2.start(now + 0.02);
                osc2.stop(now + 0.22);
            },
            playVineBoom: function () {
                if (muted) return;
                var c = getCtx();
                if (!c) return;
                var now = c.currentTime;

                // 1. Heavy low-frequency pitch drop (135Hz down to 28Hz)
                var osc = c.createOscillator();
                var oscGain = c.createGain();
                osc.type = "sine";
                osc.frequency.setValueAtTime(140, now);
                osc.frequency.exponentialRampToValueAtTime(30, now + 0.55);

                oscGain.gain.setValueAtTime(0.65, now);
                oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.95);
                osc.connect(oscGain);

                // 2. Overdrive / Distortion wave shaper for deep saturation
                var shaper = c.createWaveShaper();
                var curve = new Float32Array(256);
                for (var i = 0; i < 256; ++i) {
                    var x = (i * 2) / 256 - 1;
                    curve[i] = (Math.PI + 4) * x / (Math.PI + 4 * Math.abs(x));
                }
                shaper.curve = curve;

                // 3. Resonant lowpass rumble
                var bufferSize = Math.floor(c.sampleRate * 0.6);
                var noiseBuffer = c.createBuffer(1, bufferSize, c.sampleRate);
                var output = noiseBuffer.getChannelData(0);
                for (var j = 0; j < bufferSize; j++) {
                    output[j] = Math.random() * 2 - 1;
                }
                var noise = c.createBufferSource();
                noise.buffer = noiseBuffer;

                var filter = c.createBiquadFilter();
                filter.type = "lowpass";
                filter.frequency.setValueAtTime(200, now);
                filter.frequency.exponentialRampToValueAtTime(38, now + 0.55);
                filter.Q.value = 5.0;

                var noiseGain = c.createGain();
                noiseGain.gain.setValueAtTime(0.4, now);
                noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

                noise.connect(filter);
                filter.connect(noiseGain);

                // Master bus
                var master = c.createGain();
                master.gain.setValueAtTime(1.0, now);

                oscGain.connect(shaper);
                shaper.connect(master);
                noiseGain.connect(master);
                master.connect(c.destination);

                osc.start(now);
                osc.stop(now + 1.0);
                noise.start(now);
                noise.stop(now + 0.7);
            },
            playUltraVineBoom: function () {
                if (muted) return;
                var self = this;
                self.playVineBoom();
                setTimeout(function () {
                    self.playVineBoom();
                }, 180);
            },
            playDangerTick: function () {
                if (muted) return;
                var c = getCtx();
                if (!c) return;
                var now = c.currentTime;
                var osc = c.createOscillator();
                var gain = c.createGain();
                osc.type = "sawtooth";
                osc.frequency.setValueAtTime(740, now);
                gain.gain.setValueAtTime(0.08, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
                osc.connect(gain);
                gain.connect(c.destination);
                osc.start(now);
                osc.stop(now + 0.05);
            },
            playGameOver: function () {
                if (muted) return;
                var c = getCtx();
                if (!c) return;
                var now = c.currentTime;
                var osc = c.createOscillator();
                var gain = c.createGain();
                osc.type = "sawtooth";
                osc.frequency.setValueAtTime(280, now);
                osc.frequency.exponentialRampToValueAtTime(45, now + 0.6);
                gain.gain.setValueAtTime(0.18, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
                osc.connect(gain);
                gain.connect(c.destination);
                osc.start(now);
                osc.stop(now + 0.65);
            }
        };
    }

    // --- Image Preloader ---
    var stickerImages = {};
    function preloadStickers() {
        MEME_TIERS.forEach(function (tier) {
            var img = new Image();
            img.src = "/img/stickers/" + tier.file;
            img.onload = function () {
                stickerImages[tier.tier] = img;
            };
        });
    }
    preloadStickers();

    // --- Game Instance ---
    function MemeMergeGame(viewportEl, canvasEl, options) {
        this.viewport = viewportEl;
        this.canvas = canvasEl;
        this.ctx = canvasEl.getContext("2d");
        this.options = options || {};
        this.audio = new MemeMergeAudio();
        this.audio.setMuted(this.options.muted);

        this.bodies = [];
        this.particles = [];
        this.popups = [];
        this.shockwaves = [];

        this.score = 0;
        this.maxCombo = 1;
        this.currentCombo = 1;
        this.highestTierAchieved = 1;
        this.comboResetTimer = 0;

        this.dropperX = SIM_WIDTH / 2;
        this.targetDropperX = SIM_WIDTH / 2;
        this.currentTier = this.randomDropTier();
        this.nextTier = this.randomDropTier();
        this.dropCooldown = 0;

        this.dangerTimer = 0;
        this.dangerMaxTime = 3.0; // 3 seconds above line to overflow
        this.dangerWarningTick = 0;

        this.trauma = 0;
        this.running = false;
        this.paused = false;
        this.gameOver = false;
        this.animId = null;
        this.lastTime = 0;

        this.dpr = window.devicePixelRatio || 1;
        this.scaleX = 1;
        this.scaleY = 1;

        this.bindEvents();
        this.resize();
        this.updateHUD();
    }

    MemeMergeGame.prototype.randomDropTier = function () {
        // Player only drops lower tiers: 1 (Skull), 2 (Clown), 3 (Cap), 4 (Bruh)
        // Weighted towards smaller tiers
        var r = Math.random();
        if (r < 0.42) return MEME_TIERS[0]; // Skull (Tier 1)
        if (r < 0.72) return MEME_TIERS[1]; // Clown (Tier 2)
        if (r < 0.90) return MEME_TIERS[2]; // Cap (Tier 3)
        return MEME_TIERS[3];                // Bruh (Tier 4)
    };

    MemeMergeGame.prototype.resize = function () {
        var rect = this.viewport.getBoundingClientRect();
        var width = Math.max(300, rect.width || SIM_WIDTH);
        var height = Math.max(440, rect.height || SIM_HEIGHT);

        this.dpr = window.devicePixelRatio || 1;
        this.canvas.width = width * this.dpr;
        this.canvas.height = height * this.dpr;

        this.scaleX = (width * this.dpr) / SIM_WIDTH;
        this.scaleY = (height * this.dpr) / SIM_HEIGHT;
    };

    MemeMergeGame.prototype.bindEvents = function () {
        var self = this;

        // Pointer / Touch aiming on canvas
        function handlePointerMove(e) {
            if (!self.running || self.gameOver || self.paused) return;
            var rect = self.canvas.getBoundingClientRect();
            var clientX = e.touches && e.touches.length > 0 ? e.touches[0].clientX : e.clientX;
            var relX = (clientX - rect.left) / rect.width * SIM_WIDTH;
            self.setDropperTargetX(relX);
        }

        this.canvas.addEventListener("mousemove", handlePointerMove, { passive: true });
        this.canvas.addEventListener("touchmove", handlePointerMove, { passive: true });

        // Click / Touch release to drop
        this.canvas.addEventListener("mouseup", function (e) {
            if (!self.running || self.gameOver || self.paused) return;
            self.dropCurrentMeme();
        });

        this.canvas.addEventListener("touchend", function (e) {
            if (!self.running || self.gameOver || self.paused) return;
            self.dropCurrentMeme();
        });

        // Touch Bar on mobile
        var btnLeft = document.getElementById("mm-touch-left");
        var btnRight = document.getElementById("mm-touch-right");
        var btnDrop = document.getElementById("mm-touch-drop");

        if (btnLeft) {
            btnLeft.addEventListener("click", function () {
                self.setDropperTargetX(self.dropperX - 45);
            });
        }
        if (btnRight) {
            btnRight.addEventListener("click", function () {
                self.setDropperTargetX(self.dropperX + 45);
            });
        }
        if (btnDrop) {
            btnDrop.addEventListener("click", function () {
                self.dropCurrentMeme();
            });
        }

        // Restart button
        var restartBtn = document.getElementById("mm-btn-restart");
        if (restartBtn) {
            restartBtn.addEventListener("click", function () {
                self.restart();
            });
        }

        // Window resize
        window.addEventListener("resize", function () {
            self.resize();
        });
    };

    MemeMergeGame.prototype.handleKeyDown = function (code) {
        if (!this.running || this.gameOver || this.paused) return;
        if (code === "KeyA" || code === "ArrowLeft") {
            this.setDropperTargetX(this.dropperX - 25);
        } else if (code === "KeyD" || code === "ArrowRight") {
            this.setDropperTargetX(this.dropperX + 25);
        } else if (code === "Space" || code === "KeyS" || code === "ArrowDown") {
            this.dropCurrentMeme();
        } else if (code === "KeyR") {
            this.restart();
        }
    };

    MemeMergeGame.prototype.setDropperTargetX = function (x) {
        var minX = WALL_LEFT + this.currentTier.r + 2;
        var maxX = WALL_RIGHT - this.currentTier.r - 2;
        this.targetDropperX = Math.max(minX, Math.min(maxX, x));
    };

    MemeMergeGame.prototype.dropCurrentMeme = function () {
        if (this.dropCooldown > 0 || this.gameOver || !this.running || this.paused) return;

        var tierDef = this.currentTier;
        var x = Math.max(WALL_LEFT + tierDef.r + 2, Math.min(WALL_RIGHT - tierDef.r - 2, this.dropperX));
        var y = DROP_Y + tierDef.r;

        var body = {
            id: Math.random().toString(36).substr(2, 9),
            tier: tierDef.tier,
            name: tierDef.name,
            r: tierDef.r,
            pts: tierDef.pts,
            color: tierDef.color,
            stroke: tierDef.stroke,
            emoji: tierDef.emoji,
            file: tierDef.file,
            x: x,
            y: y,
            vx: (this.dropperX - this.targetDropperX) * -0.5,
            vy: 40,
            angle: 0,
            omega: (Math.random() - 0.5) * 2,
            mass: tierDef.r * tierDef.r,
            age: 0,
            merging: false,
            scaleX: 0.85,
            scaleY: 1.15
        };

        this.bodies.push(body);
        this.audio.playDrop();

        this.currentTier = this.nextTier;
        this.nextTier = this.randomDropTier();
        this.dropCooldown = 0.45; // 450ms cooldown
        this.updateHUD();
    };

    MemeMergeGame.prototype.start = function () {
        this.bodies = [];
        this.particles = [];
        this.popups = [];
        this.shockwaves = [];
        this.score = 0;
        this.maxCombo = 1;
        this.currentCombo = 1;
        this.highestTierAchieved = 1;
        this.comboResetTimer = 0;
        this.dangerTimer = 0;
        this.trauma = 0;
        this.gameOver = false;
        this.running = true;
        this.paused = false;

        this.currentTier = this.randomDropTier();
        this.nextTier = this.randomDropTier();
        this.dropperX = SIM_WIDTH / 2;
        this.targetDropperX = SIM_WIDTH / 2;
        this.dropCooldown = 0;

        var startOverlay = document.getElementById("meme-start-overlay");
        if (startOverlay) startOverlay.hidden = true;
        var overOverlay = document.getElementById("meme-over-overlay");
        if (overOverlay) overOverlay.hidden = true;

        this.resize();
        this.updateHUD();

        var self = this;
        this.lastTime = performance.now();
        if (this.animId) cancelAnimationFrame(this.animId);
        function loop(now) {
            var dt = Math.min(0.06, (now - self.lastTime) / 1000);
            self.lastTime = now;
            self.update(dt);
            self.draw();
            if (self.running) {
                self.animId = requestAnimationFrame(loop);
            }
        }
        this.animId = requestAnimationFrame(loop);
    };

    MemeMergeGame.prototype.restart = function () {
        this.start();
    };

    MemeMergeGame.prototype.pause = function () {
        this.paused = true;
    };

    MemeMergeGame.prototype.resume = function () {
        this.paused = false;
        this.lastTime = performance.now();
    };

    MemeMergeGame.prototype.setMuted = function (m) {
        this.audio.setMuted(m);
    };

    MemeMergeGame.prototype.update = function (dt) {
        if (!this.running || this.paused || this.gameOver) return;

        // Smooth dropper movement
        this.dropperX += (this.targetDropperX - this.dropperX) * Math.min(1, dt * 18);
        if (this.dropCooldown > 0) {
            this.dropCooldown = Math.max(0, this.dropCooldown - dt);
        }

        // Combo timeout decay
        if (this.comboResetTimer > 0) {
            this.comboResetTimer -= dt;
            if (this.comboResetTimer <= 0) {
                this.currentCombo = 1;
                this.updateHUD();
            }
        }

        // Sub-stepped physics integration (8 sub-steps for jitter-free circle collisions)
        var SUB_STEPS = 8;
        var subDt = dt / SUB_STEPS;
        for (var step = 0; step < SUB_STEPS; step++) {
            this.physicsStep(subDt);
        }

        // Check for merges and handle squash/stretch spring return
        for (var i = 0; i < this.bodies.length; i++) {
            var b = this.bodies[i];
            b.age += dt;
            b.scaleX += (1.0 - b.scaleX) * Math.min(1, dt * 12);
            b.scaleY += (1.0 - b.scaleY) * Math.min(1, dt * 12);
        }

        // Danger line evaluation
        var settledAboveDanger = false;
        for (var d = 0; d < this.bodies.length; d++) {
            var body = this.bodies[d];
            if (body.age > 1.2 && Math.abs(body.vy) < 25 && (body.y - body.r) < DANGER_Y) {
                settledAboveDanger = true;
                break;
            }
        }

        if (settledAboveDanger) {
            this.dangerTimer += dt;
            this.dangerWarningTick += dt;
            if (this.dangerWarningTick >= 0.5) {
                this.dangerWarningTick = 0;
                this.audio.playDangerTick();
            }
            if (this.dangerTimer >= this.dangerMaxTime) {
                this.triggerGameOver();
                return;
            }
        } else {
            this.dangerTimer = Math.max(0, this.dangerTimer - dt * 2);
            this.dangerWarningTick = 0;
        }

        // Screen trauma decay
        if (this.trauma > 0) {
            this.trauma = Math.max(0, this.trauma - dt * 1.5);
        }

        // Update shockwaves
        for (var s = this.shockwaves.length - 1; s >= 0; s--) {
            var sw = this.shockwaves[s];
            sw.r += sw.speed * dt;
            sw.alpha -= sw.decay * dt;
            if (sw.alpha <= 0) {
                this.shockwaves.splice(s, 1);
            }
        }

        // Update particles
        for (var p = this.particles.length - 1; p >= 0; p--) {
            var pt = this.particles[p];
            pt.x += pt.vx * dt;
            pt.y += pt.vy * dt;
            pt.vy += GRAVITY * 0.4 * dt;
            pt.life -= dt;
            if (pt.life <= 0) {
                this.particles.splice(p, 1);
            }
        }

        // Update floating popups
        for (var pu = this.popups.length - 1; pu >= 0; pu--) {
            var pop = this.popups[pu];
            pop.y -= pop.vy * dt;
            pop.life -= dt;
            if (pop.life <= 0) {
                this.popups.splice(pu, 1);
            }
        }
    };

    MemeMergeGame.prototype.physicsStep = function (dt) {
        var bodies = this.bodies;
        var n = bodies.length;

        // 1. Integrate forces and positions
        for (var i = 0; i < n; i++) {
            var b = bodies[i];
            if (b.merging) continue;

            b.vy += GRAVITY * dt;
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            b.angle += b.omega * dt;

            // Air damping
            b.vx *= Math.pow(0.995, dt * 60);
            b.vy *= Math.pow(0.998, dt * 60);
            b.omega *= Math.pow(0.97, dt * 60);

            // Wall collisions (Left & Right)
            if (b.x - b.r < WALL_LEFT) {
                b.x = WALL_LEFT + b.r;
                if (b.vx < 0) {
                    this.audio.playImpact(b.tier, Math.abs(b.vx));
                    b.vx = -b.vx * 0.3;
                    b.omega = b.vy * 0.05;
                }
            } else if (b.x + b.r > WALL_RIGHT) {
                b.x = WALL_RIGHT - b.r;
                if (b.vx > 0) {
                    this.audio.playImpact(b.tier, Math.abs(b.vx));
                    b.vx = -b.vx * 0.3;
                    b.omega = -b.vy * 0.05;
                }
            }

            // Floor collision
            if (b.y + b.r > FLOOR_Y) {
                b.y = FLOOR_Y - b.r;
                if (b.vy > 0) {
                    if (b.vy > 60) this.audio.playImpact(b.tier, b.vy);
                    b.vy = -b.vy * 0.25;
                    b.vx *= 0.88; // Floor friction
                    b.omega = (b.vx / b.r) * 1.2;
                }
            }
        }

        // 2. Circle-to-Circle collisions and Merges
        var mergesToExecute = [];
        for (var i = 0; i < n; i++) {
            var b1 = bodies[i];
            if (b1.merging) continue;

            for (var j = i + 1; j < n; j++) {
                var b2 = bodies[j];
                if (b2.merging) continue;

                var dx = b2.x - b1.x;
                var dy = b2.y - b1.y;
                var distSq = dx * dx + dy * dy;
                var minDist = b1.r + b2.r;

                if (distSq < minDist * minDist) {
                    // Check for merge match
                    if (b1.tier === b2.tier && !b1.merging && !b2.merging) {
                        b1.merging = true;
                        b2.merging = true;
                        mergesToExecute.push({ a: b1, b: b2 });
                        continue;
                    }

                    // Physics collision response
                    var dist = Math.sqrt(distSq) || 0.001;
                    var overlap = minDist - dist;
                    var nx = dx / dist;
                    var ny = dy / dist;

                    // Positional separation based on mass
                    var totalMass = b1.mass + b2.mass;
                    var m1Ratio = b2.mass / totalMass;
                    var m2Ratio = b1.mass / totalMass;

                    b1.x -= nx * overlap * m1Ratio;
                    b1.y -= ny * overlap * m1Ratio;
                    b2.x += nx * overlap * m2Ratio;
                    b2.y += ny * overlap * m2Ratio;

                    // Impulse resolution
                    var kx = b1.vx - b2.vx;
                    var ky = b1.vy - b2.vy;
                    var p = 2 * (nx * kx + ny * ky) / totalMass;

                    var restitution = 0.22;
                    b1.vx -= p * b2.mass * nx * (1 + restitution);
                    b1.vy -= p * b2.mass * ny * (1 + restitution);
                    b2.vx += p * b1.mass * nx * (1 + restitution);
                    b2.vy += p * b1.mass * ny * (1 + restitution);

                    // Rolling friction exchange
                    var tangentX = -ny;
                    var tangentY = nx;
                    var relTangentVel = (b1.vx - b2.vx) * tangentX + (b1.vy - b2.vy) * tangentY;
                    var frictionImpulse = relTangentVel * 0.15;
                    b1.omega -= (frictionImpulse / b1.r) * 0.5;
                    b2.omega += (frictionImpulse / b2.r) * 0.5;
                }
            }
        }

        // Execute queued merges
        for (var m = 0; m < mergesToExecute.length; m++) {
            this.handleMerge(mergesToExecute[m].a, mergesToExecute[m].b);
        }

        // Clean up merging bodies
        if (mergesToExecute.length > 0) {
            this.bodies = this.bodies.filter(function (body) {
                return !body.merging;
            });
        }
    };

    MemeMergeGame.prototype.handleMerge = function (a, b) {
        var currentTierIdx = a.tier - 1;
        var nextTierIdx = currentTierIdx + 1;

        var midX = (a.x + b.x) / 2;
        var midY = (a.y + b.y) / 2;
        var avgVx = (a.vx + b.vx) / 2;
        var avgVy = (a.vy + b.vy) / 2 - 25; // Gentle upward pop

        // Check if two apex tier (The Rock) merge: Cosmic Ultra Vine Boom & clear!
        if (a.tier === 10) {
            this.audio.playUltraVineBoom();
            this.trauma = Math.min(1.0, this.trauma + 0.9);
            this.shockwaves.push({ x: midX, y: midY, r: 10, maxR: 280, speed: 550, color: "#facc15", alpha: 1.0, decay: 1.2 });
            this.spawnParticles(midX, midY, "#facc15", 40);
            this.popups.push({ text: "COSMIC VINE BOOM! +2048", x: midX, y: midY - 20, vy: 50, life: 1.6, color: "#facc15", size: 16 });
            this.addScore(2048);
            return;
        }

        var nextDef = MEME_TIERS[nextTierIdx];
        if (!nextDef) return;

        // Create upgraded meme
        var newBody = {
            id: Math.random().toString(36).substr(2, 9),
            tier: nextDef.tier,
            name: nextDef.name,
            r: nextDef.r,
            pts: nextDef.pts,
            color: nextDef.color,
            stroke: nextDef.stroke,
            emoji: nextDef.emoji,
            file: nextDef.file,
            x: midX,
            y: midY,
            vx: avgVx,
            vy: avgVy,
            angle: 0,
            omega: (Math.random() - 0.5) * 4,
            mass: nextDef.r * nextDef.r,
            age: 0,
            merging: false,
            scaleX: 1.35,
            scaleY: 0.75
        };
        this.bodies.push(newBody);

        // Score & combo
        this.currentCombo++;
        if (this.currentCombo > this.maxCombo) {
            this.maxCombo = this.currentCombo;
        }
        this.comboResetTimer = 2.0;

        var gainedPts = nextDef.pts * Math.min(5, this.currentCombo);
        this.addScore(gainedPts);

        if (nextDef.tier > this.highestTierAchieved) {
            this.highestTierAchieved = nextDef.tier;
        }

        // Particle explosion
        this.spawnParticles(midX, midY, nextDef.color, 18);

        // Shockwave pushing neighboring bodies
        var shockR = nextDef.r * 1.8;
        this.shockwaves.push({ x: midX, y: midY, r: 10, maxR: shockR, speed: 380, color: nextDef.color, alpha: 0.85, decay: 2.0 });
        for (var i = 0; i < this.bodies.length; i++) {
            var other = this.bodies[i];
            if (other === newBody || other.merging) continue;
            var pdx = other.x - midX;
            var pdy = other.y - midY;
            var pdist = Math.sqrt(pdx * pdx + pdy * pdy) || 1;
            if (pdist < shockR) {
                var force = (1 - pdist / shockR) * 120;
                other.vx += (pdx / pdist) * force;
                other.vy += (pdy / pdist) * force - 15;
            }
        }

        // Sound & Special Tier Effects
        if (nextDef.tier === 10) {
            // SUMMONED THE ROCK!
            this.audio.playVineBoom();
            this.trauma = Math.min(1.0, this.trauma + 0.85);
            this.popups.push({ text: "🤨 THE ROCK! +1024", x: midX, y: midY - 20, vy: 55, life: 1.8, color: "#facc15", size: 18 });
        } else if (nextDef.tier === 5) {
            // 6 7!
            this.audio.playMerge(nextDef.tier, this.currentCombo);
            this.popups.push({ text: "6️⃣7️⃣ +" + gainedPts, x: midX, y: midY - 15, vy: 45, life: 1.3, color: "#84cc16", size: 15 });
        } else {
            this.audio.playMerge(nextDef.tier, this.currentCombo);
            var popupText = "+" + gainedPts;
            if (this.currentCombo > 1) {
                popupText += " (x" + this.currentCombo + ")";
            }
            this.popups.push({ text: popupText, x: midX, y: midY - 10, vy: 40, life: 1.2, color: nextDef.stroke, size: 13 });
        }

        this.updateHUD();
    };

    MemeMergeGame.prototype.addScore = function (pts) {
        this.score = Math.min(10000, this.score + pts);
        this.updateHUD();
    };

    MemeMergeGame.prototype.spawnParticles = function (x, y, color, count) {
        for (var i = 0; i < count; i++) {
            var angle = Math.random() * Math.PI * 2;
            var speed = Math.random() * 180 + 40;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 30,
                r: Math.random() * 3.5 + 1.5,
                color: color,
                life: Math.random() * 0.45 + 0.25
            });
        }
    };

    MemeMergeGame.prototype.updateHUD = function () {
        var scoreEl = document.getElementById("mm-hud-score");
        if (scoreEl) scoreEl.textContent = this.score;

        var comboEl = document.getElementById("mm-hud-combo");
        if (comboEl) comboEl.textContent = "x" + Math.max(1, this.currentCombo);

        var nextIconEl = document.getElementById("mm-next-icon");
        var nextPillEl = document.getElementById("mm-hud-next");
        if (nextIconEl && this.nextTier) {
            nextIconEl.textContent = this.nextTier.emoji;
        }
        if (nextPillEl && this.nextTier) {
            nextPillEl.style.borderColor = this.nextTier.color;
        }

        var apexEl = document.getElementById("mm-hud-apex");
        if (apexEl) {
            var apexDef = MEME_TIERS[this.highestTierAchieved - 1];
            apexEl.textContent = apexDef ? apexDef.name : "Tier 1";
        }
    };

    MemeMergeGame.prototype.triggerGameOver = function () {
        if (this.gameOver) return;
        this.gameOver = true;
        this.running = false;
        this.audio.playGameOver();

        var overOverlay = document.getElementById("meme-over-overlay");
        var overScore = document.getElementById("meme-over-score");
        var overCombo = document.getElementById("meme-over-combo");
        var overBest = document.getElementById("meme-over-best");
        var overRank = document.getElementById("meme-over-rank");
        var recordBanner = document.getElementById("meme-record-banner");
        var saveStatus = document.getElementById("meme-save-status");

        if (overScore) overScore.textContent = this.score;
        if (overCombo) overCombo.textContent = "x" + this.maxCombo;

        if (overOverlay) overOverlay.hidden = false;

        // Submit score to McWut Leaderboard API
        var self = this;
        if (window.submitScore) {
            if (saveStatus) saveStatus.textContent = "Saving score…";
            window.submitScore(this.score, this.maxCombo).then(function (res) {
                if (!res) return;
                if (overBest) overBest.textContent = res.bestScore;
                if (overRank) overRank.textContent = res.rank != null ? "#" + res.rank : "—";
                if (recordBanner && res.isNewPersonalBest) recordBanner.hidden = false;
                if (saveStatus) saveStatus.textContent = "Score recorded on the global leaderboard.";
                if (window.refreshLeaderboard) window.refreshLeaderboard();
            }).catch(function () {
                if (saveStatus) saveStatus.textContent = "Score saved locally.";
            });
        }
    };

    // --- Rendering ---
    MemeMergeGame.prototype.draw = function () {
        var ctx = this.ctx;
        ctx.save();
        ctx.scale(this.scaleX, this.scaleY);

        // Screen shake
        if (this.trauma > 0) {
            var shakeAmount = this.trauma * this.trauma * 14;
            var shakeX = (Math.random() - 0.5) * shakeAmount;
            var shakeY = (Math.random() - 0.5) * shakeAmount;
            ctx.translate(shakeX, shakeY);
        }

        // Background
        ctx.fillStyle = "#090d16";
        ctx.fillRect(0, 0, SIM_WIDTH, SIM_HEIGHT);

        // Container Jar styling
        ctx.save();
        ctx.strokeStyle = "rgba(56, 189, 248, 0.18)";
        ctx.lineWidth = 4;
        ctx.lineJoin = "round";
        ctx.strokeRect(WALL_LEFT, DANGER_Y, WALL_RIGHT - WALL_LEFT, FLOOR_Y - DANGER_Y);

        // Danger Line
        var dangerActive = this.dangerTimer > 0;
        var dangerAlpha = dangerActive ? 0.4 + 0.6 * Math.abs(Math.sin(performance.now() * 0.008)) : 0.25;
        ctx.strokeStyle = dangerActive ? "rgba(239, 68, 68, " + dangerAlpha + ")" : "rgba(244, 63, 94, 0.35)";
        ctx.setLineDash([8, 6]);
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(WALL_LEFT, DANGER_Y);
        ctx.lineTo(WALL_RIGHT, DANGER_Y);
        ctx.stroke();
        ctx.setLineDash([]);

        if (dangerActive) {
            ctx.fillStyle = "rgba(239, 68, 68, 0.9)";
            ctx.font = "bold 11px system-ui, sans-serif";
            ctx.textAlign = "right";
            var timeLeft = Math.max(0, this.dangerMaxTime - this.dangerTimer).toFixed(1);
            ctx.fillText("OVERFLOW WARNING: " + timeLeft + "s", WALL_RIGHT - 8, DANGER_Y - 6);
        }
        ctx.restore();

        // Dropper guide line and current meme preview
        if (this.running && !this.gameOver) {
            var curX = Math.max(WALL_LEFT + this.currentTier.r + 2, Math.min(WALL_RIGHT - this.currentTier.r - 2, this.dropperX));
            ctx.save();
            ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
            ctx.setLineDash([4, 4]);
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(curX, DROP_Y + this.currentTier.r);
            ctx.lineTo(curX, FLOOR_Y);
            ctx.stroke();
            ctx.restore();

            // Draw floating dropper meme
            this.drawMemeDisc(ctx, curX, DROP_Y, this.currentTier, 0, 1.0, 1.0);
        }

        // Draw settled bodies
        for (var i = 0; i < this.bodies.length; i++) {
            var b = this.bodies[i];
            this.drawMemeDisc(ctx, b.x, b.y, b, b.angle, b.scaleX, b.scaleY);
        }

        // Draw shockwaves
        for (var s = 0; s < this.shockwaves.length; s++) {
            var sw = this.shockwaves[s];
            ctx.save();
            ctx.strokeStyle = sw.color;
            ctx.globalAlpha = Math.max(0, sw.alpha);
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // Draw particles
        for (var p = 0; p < this.particles.length; p++) {
            var pt = this.particles[p];
            ctx.save();
            ctx.fillStyle = pt.color;
            ctx.globalAlpha = Math.min(1, pt.life * 2.5);
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Draw floating text popups
        for (var pu = 0; pu < this.popups.length; pu++) {
            var pop = this.popups[pu];
            ctx.save();
            ctx.fillStyle = pop.color;
            ctx.font = "bold " + (pop.size || 14) + "px Impact, Arial Black, sans-serif";
            ctx.textAlign = "center";
            ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
            ctx.shadowBlur = 6;
            ctx.globalAlpha = Math.min(1, pop.life * 1.5);
            ctx.fillText(pop.text, pop.x, pop.y);
            ctx.restore();
        }

        ctx.restore();
    };

    MemeMergeGame.prototype.drawMemeDisc = function (ctx, x, y, tier, angle, scaleX, scaleY) {
        ctx.save();
        ctx.translate(x, y);
        if (scaleX !== 1 || scaleY !== 1) {
            ctx.scale(scaleX || 1, scaleY || 1);
        }
        ctx.rotate(angle || 0);

        var r = tier.r;

        // Glowing outer disc
        ctx.shadowColor = tier.color;
        ctx.shadowBlur = tier.tier === 10 ? 22 : 10;

        var grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
        grad.addColorStop(0, "#1e293b");
        grad.addColorStop(0.85, tier.color);
        grad.addColorStop(1, tier.stroke);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = tier.stroke;
        ctx.lineWidth = tier.tier === 10 ? 3.5 : 2.5;
        ctx.stroke();

        ctx.shadowBlur = 0; // reset shadow

        // Check if preloaded sticker SVG image is available
        var img = stickerImages[tier.tier];
        if (img && img.complete && img.naturalWidth !== 0) {
            var imgSize = r * 1.76;
            ctx.drawImage(img, -imgSize / 2, -imgSize / 2, imgSize, imgSize);
        } else {
            // Crisp fallback: Emoji and label
            ctx.font = (r * 0.95) + "px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(tier.emoji, 0, 0);
        }

        // Glossy bubble highlight reflection
        ctx.beginPath();
        ctx.ellipse(-r * 0.35, -r * 0.38, r * 0.38, r * 0.22, -Math.PI / 4, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
        ctx.fill();

        ctx.restore();
    };

    // --- Singleton Registration & Global Hookup ---
    var mmGame = null;
    var mmState = {
        running: false,
        score: 0,
        maxCombo: 1,
        highestTier: 1
    };

    function mmEnsureGame() {
        var viewport = document.getElementById("meme-viewport");
        var canvas = document.getElementById("meme-canvas");
        if (!viewport || !canvas) return null;
        if (!mmGame) {
            mmGame = new MemeMergeGame(viewport, canvas, {
                muted: localStorage.getItem("mcwut-games-muted") === "1"
            });
        }
        return mmGame;
    }

    function mmStartGame() {
        var g = mmEnsureGame();
        if (!g) return;
        var startOverlay = document.getElementById("meme-start-overlay");
        var overOverlay = document.getElementById("meme-over-overlay");
        if (startOverlay) startOverlay.hidden = true;
        if (overOverlay) overOverlay.hidden = true;
        mmState.running = true;
        g.start();
    }

    function mmPause() {
        if (mmGame) mmGame.pause();
    }

    function mmResume() {
        if (mmGame && mmState.running) {
            mmGame.resume();
        }
    }

    var startBtn = document.getElementById("meme-start-btn");
    var againBtn = document.getElementById("meme-again-btn");
    var restartBtn = document.getElementById("mm-btn-restart");

    if (startBtn) {
        startBtn.addEventListener("click", function () {
            mmStartGame();
        });
    }
    if (againBtn) {
        againBtn.addEventListener("click", function () {
            mmStartGame();
        });
    }
    if (restartBtn) {
        restartBtn.addEventListener("click", function () {
            mmStartGame();
        });
    }

    window.MemeMergeGame = MemeMergeGame;
    window.McWutGames.memeMerge = {
        MemeMergeGame: MemeMergeGame,
        state: mmState,
        getGame: function () { return mmGame; },
        mmEnsureGame: mmEnsureGame,
        mmStartGame: mmStartGame,
        mmPause: mmPause,
        mmResume: mmResume,
        mmSetMuted: function (m) { if (mmGame) mmGame.setMuted(m); }
    };

    window.mmState = mmState;
    window.mmEnsureGame = mmEnsureGame;
    window.mmStartGame = mmStartGame;
    window.mmPause = mmPause;
    window.mmResume = mmResume;

    try {
        Object.defineProperty(window, "mmGame", {
            get: function () { return mmGame; },
            set: function (v) { mmGame = v; },
            configurable: true
        });
    } catch (e) {
        window.mmGame = mmGame;
    }
})();