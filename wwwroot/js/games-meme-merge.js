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
    var JAR_TOP_Y = 96;
    // Overflow line sits inside the jar, not at its rim. A pile that is
    // visually all the way up must actually end the run instead of idling
    // just under the rim while the player keeps dropping memes.
    var DANGER_Y = 150;
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
        this.jarFill = 0;

        this.trauma = 0;
        this.running = false;
        this.paused = false;
        this.gameOver = false;
        this.animId = null;
        this.lastTime = 0;

        this.dpr = window.devicePixelRatio || 1;
        this.cssScale = 1;
        this.cssOffsetX = 0;
        this.cssOffsetY = 0;
        this.viewScale = 1;
        this.viewOffsetX = 0;
        this.viewOffsetY = 0;

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
        var rect = this.canvas.getBoundingClientRect();
        var cssWidth = Math.max(1, rect.width || SIM_WIDTH);
        var cssHeight = Math.max(1, rect.height || SIM_HEIGHT);

        // Cap DPR so large tablets do not allocate huge bitmaps.
        this.dpr = Math.min(2, window.devicePixelRatio || 1);
        this.canvas.width = Math.max(1, Math.round(cssWidth * this.dpr));
        this.canvas.height = Math.max(1, Math.round(cssHeight * this.dpr));

        // Fit the simulation uniformly and letterbox the leftover space, so
        // circles stay circles no matter how the viewport is resized.
        this.cssScale = Math.min(cssWidth / SIM_WIDTH, cssHeight / SIM_HEIGHT);
        this.cssOffsetX = (cssWidth - SIM_WIDTH * this.cssScale) / 2;
        this.cssOffsetY = (cssHeight - SIM_HEIGHT * this.cssScale) / 2;

        this.viewScale = this.cssScale * this.dpr;
        this.viewOffsetX = this.cssOffsetX * this.dpr;
        this.viewOffsetY = this.cssOffsetY * this.dpr;
    };

    MemeMergeGame.prototype.bindEvents = function () {
        var self = this;

        // Pointer / Touch aiming on canvas
        function handlePointerMove(e) {
            if (!self.running || self.gameOver || self.paused) return;
            var rect = self.canvas.getBoundingClientRect();
            var clientX = e.touches && e.touches.length > 0 ? e.touches[0].clientX : e.clientX;
            var relX = (clientX - rect.left - self.cssOffsetX) / (self.cssScale || 1);
            self.setDropperTargetX(relX);
        }

        this.canvas.addEventListener("mousemove", handlePointerMove, { passive: true });
        this.canvas.addEventListener("touchmove", handlePointerMove, { passive: true });
        // Aim on press as well, so a quick tap drops where the player tapped
        // even when no move event fired first.
        this.canvas.addEventListener("mousedown", handlePointerMove);
        this.canvas.addEventListener("touchstart", handlePointerMove, { passive: true });

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
        // Snap to the aim point so the meme lands where the player pointed
        // instead of inheriting a sideways fling from the smoothing lag.
        this.dropperX = this.targetDropperX;
        var x = Math.max(WALL_LEFT + tierDef.r + 2, Math.min(WALL_RIGHT - tierDef.r - 2, this.dropperX));
        this.dropperX = x;
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
            vx: 0,
            vy: 25,
            angle: 0,
            omega: (Math.random() - 0.5) * 2,
            mass: tierDef.r * tierDef.r,
            age: 0,
            restTimer: 0,
            merging: false,
            scaleX: 0.85,
            scaleY: 1.15
        };

        this.bodies.push(body);
        this.audio.playDrop();

        this.currentTier = this.nextTier;
        this.nextTier = this.randomDropTier();
        this.dropCooldown = 0.8; // ~800ms between drops
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
        this.dangerWarningTick = 0;
        this.jarFill = 0;
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

        // Jar fill + overflow evaluation. Driven by pile height (a position
        // test with hysteresis), not instantaneous velocity: a jittering or
        // spinning pile used to keep |vy| high and the lose condition never
        // fired, letting the player stack forever.
        var highestTop = Infinity;
        for (var d = 0; d < this.bodies.length; d++) {
            var body = this.bodies[d];
            if (body.age > 0.5) {
                highestTop = Math.min(highestTop, body.y - body.r);
            }
        }

        if (highestTop === Infinity) {
            this.jarFill = 0;
        } else {
            var usableHeight = FLOOR_Y - DANGER_Y;
            this.jarFill = Math.max(0, Math.min(1, (FLOOR_Y - highestTop) / usableHeight));
        }

        if (highestTop < DANGER_Y) {
            this.dangerTimer += dt;
        } else if (highestTop > DANGER_Y + 24) {
            // Only drain once the pile is clearly below the line. The wide
            // dead band stops a wobbly top ball from resetting the countdown.
            this.dangerTimer = Math.max(0, this.dangerTimer - dt * 1.5);
            this.dangerWarningTick = 0;
        }

        if (this.dangerTimer > 0) {
            this.dangerWarningTick += dt;
            if (this.dangerWarningTick >= 0.5) {
                this.dangerWarningTick = 0;
                this.audio.playDangerTick();
            }
            if (this.dangerTimer >= this.dangerMaxTime) {
                this.triggerGameOver();
                return;
            }
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
            // Angular damping is deliberately strong: stickers should settle
            // instead of spinning on forever once the pile comes to rest.
            b.omega *= Math.pow(0.90, dt * 60);
            b.omega = Math.max(-8, Math.min(8, b.omega));

            // Wall collisions (Left & Right). Do not assign spin here: a
            // wedged ball re-hits the wall every step and would spin forever.
            if (b.x - b.r < WALL_LEFT) {
                b.x = WALL_LEFT + b.r;
                if (b.vx < 0) {
                    if (Math.abs(b.vx) > 40) this.audio.playImpact(b.tier, Math.abs(b.vx));
                    b.vx = -b.vx * 0.25;
                }
            } else if (b.x + b.r > WALL_RIGHT) {
                b.x = WALL_RIGHT - b.r;
                if (b.vx > 0) {
                    if (Math.abs(b.vx) > 40) this.audio.playImpact(b.tier, Math.abs(b.vx));
                    b.vx = -b.vx * 0.25;
                }
            }

            // Floor collision
            if (b.y + b.r > FLOOR_Y) {
                b.y = FLOOR_Y - b.r;
                if (b.vy > 0) {
                    if (b.vy > 90) this.audio.playImpact(b.tier, b.vy);
                    // Kill tiny bounces so balls settle instead of vibrating.
                    b.vy = b.vy > 45 ? -b.vy * 0.18 : 0;
                }
                // Rolling friction while in contact with the floor. Only
                // couple spin to travel when the ball is actually rolling:
                // at low speeds solver jitter made omega chase tiny vx
                // values forever.
                b.vx *= Math.pow(0.90, dt * 60);
                if (Math.abs(b.vx) < 30) {
                    b.omega *= Math.pow(0.75, dt * 60);
                    if (Math.abs(b.omega) < 0.05) {
                        b.omega = 0;
                    }
                } else {
                    var rollTarget = Math.max(-10, Math.min(10, b.vx / b.r));
                    b.omega += (rollTarget - b.omega) * Math.min(1, dt * 12);
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

                    // Impulse resolution. Positive approach means the bodies
                    // are closing; only those contacts get an impulse.
                    // (Resolving separating contacts pulled piles together
                    // and injected energy every step.)
                    var kx = b1.vx - b2.vx;
                    var ky = b1.vy - b2.vy;
                    var approach = nx * kx + ny * ky;

                    if (approach > 0) {
                        // No bounce for slow contacts, so resting stacks can
                        // actually fall asleep instead of micro-bouncing.
                        var restitution = approach > 40 ? 0.2 : 0;
                        var p = approach / totalMass;

                        b1.vx -= p * b2.mass * nx * (1 + restitution);
                        b1.vy -= p * b2.mass * ny * (1 + restitution);
                        b2.vx += p * b1.mass * nx * (1 + restitution);
                        b2.vy += p * b1.mass * ny * (1 + restitution);

                        // Linear contact friction only (no omega exchange).
                        // This stops piles from sliding apart and is part of
                        // why the old tangent-spin pump is gone for good.
                        var tx = -ny;
                        var ty = nx;
                        var tangentVel = kx * tx + ky * ty;
                        var jt = -tangentVel * 0.03 / totalMass;
                        b1.vx += jt * b2.mass * tx;
                        b1.vy += jt * b2.mass * ty;
                        b2.vx -= jt * b1.mass * tx;
                        b2.vy -= jt * b1.mass * ty;
                    }

                    // No ball-to-ball spin transfer: the old tangent-velocity
                    // exchange had no matching linear impulse, so dense piles
                    // pumped omega to the clamp and never stopped spinning.
                    // Rotation comes from wall/floor rolling only.
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

        // Put slow bodies to sleep so residual solver jitter cannot keep
        // stickers rotating (or vibrating) forever once a pile settles.
        var settledBodies = this.bodies;
        for (var r = 0; r < settledBodies.length; r++) {
            var rb = settledBodies[r];
            if (rb.merging) continue;

            // Re-clamp after positional separation in case a collision pushed
            // a body through a wall or the floor.
            if (rb.x - rb.r < WALL_LEFT) rb.x = WALL_LEFT + rb.r;
            else if (rb.x + rb.r > WALL_RIGHT) rb.x = WALL_RIGHT - rb.r;
            if (rb.y + rb.r > FLOOR_Y) rb.y = FLOOR_Y - rb.r;

            var speedSq = rb.vx * rb.vx + rb.vy * rb.vy;
            // Sleep on linear speed alone. Requiring |omega| to be small as
            // well let a ball sit still while slowly rotating forever.
            if (speedSq < 1600) {
                rb.restTimer = (rb.restTimer || 0) + dt;
                if (rb.restTimer > 0.4) {
                    rb.vx = 0;
                    rb.vy = 0;
                    rb.omega = 0;
                }
            } else {
                rb.restTimer = 0;
            }
            // Extra angular damping for near-stationary bodies so any spin
            // picked up from a merge or a collision bleeds off quickly.
            if (speedSq < 2500) {
                rb.omega *= Math.pow(0.9, dt * 60);
            }

            // Position-based spin cutoff: if a body barely moved over the
            // last 0.25s it is not rolling, no matter what solver jitter says.
            if (rb.trackX === undefined) {
                rb.trackX = rb.x;
                rb.trackY = rb.y;
                rb.trackTimer = 0;
            }
            rb.trackTimer += dt;
            if (rb.trackTimer >= 0.25) {
                var netX = rb.x - rb.trackX;
                var netY = rb.y - rb.trackY;
                if (netX * netX + netY * netY < 36) {
                    rb.omega = 0;
                }
                rb.trackX = rb.x;
                rb.trackY = rb.y;
                rb.trackTimer = 0;
            }
        }
    };

    MemeMergeGame.prototype.handleMerge = function (a, b) {
        var currentTierIdx = a.tier - 1;
        var nextTierIdx = currentTierIdx + 1;

        var midX = (a.x + b.x) / 2;
        var midY = (a.y + b.y) / 2;
        var avgVx = (a.vx + b.vx) / 2;
        var avgVy = (a.vy + b.vy) / 2 - 10; // Gentle upward pop

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
            restTimer: 0,
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
                var force = (1 - pdist / shockR) * 55;
                other.vx += (pdx / pdist) * force;
                other.vy += (pdy / pdist) * force - 6;
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
        this.score = Math.min(1000000, this.score + pts);
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

        // Clear in device space (also paints the letterbox bars).
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = "#090d16";
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Uniform scale + centered offset keeps every disc perfectly round.
        ctx.save();
        ctx.setTransform(this.viewScale, 0, 0, this.viewScale, this.viewOffsetX, this.viewOffsetY);

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
        ctx.strokeRect(WALL_LEFT, JAR_TOP_Y, WALL_RIGHT - WALL_LEFT, FLOOR_Y - JAR_TOP_Y);

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

            // Draw floating dropper meme (dimmed while the drop reloads)
            ctx.save();
            if (this.dropCooldown > 0) {
                ctx.globalAlpha = 0.55;
            }
            this.drawMemeDisc(ctx, curX, DROP_Y, this.currentTier, 0, 1.0, 1.0);
            ctx.restore();
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

        // Fill meter is drawn last so no body can hide it.
        this.drawJarFillMeter(ctx);

        ctx.restore();
    };

    MemeMergeGame.prototype.drawJarFillMeter = function (ctx) {
        var barX = WALL_LEFT;
        var barY = FLOOR_Y + 3;
        var barW = WALL_RIGHT - WALL_LEFT;
        var barH = 10;
        var ratio = Math.max(0, Math.min(1, this.jarFill || 0));
        var overflow = this.dangerTimer > 0;
        var pulse = 0.55 + 0.45 * Math.abs(Math.sin(performance.now() * 0.008));

        ctx.save();

        // Track
        ctx.fillStyle = "rgba(2, 6, 23, 0.9)";
        ctx.strokeStyle = overflow
            ? "rgba(239, 68, 68, " + pulse.toFixed(2) + ")"
            : "rgba(148, 163, 184, 0.35)";
        ctx.lineWidth = 1;
        ctx.fillRect(barX, barY, barW, barH);
        ctx.strokeRect(barX + 0.5, barY + 0.5, barW - 1, barH - 1);

        // Fill: green -> amber -> red as the jar approaches the danger line.
        if (ratio > 0.005) {
            var hue = Math.round(150 - 150 * ratio);
            ctx.fillStyle = "hsl(" + hue + ", 85%, 48%)";
            ctx.fillRect(barX + 2, barY + 2, (barW - 4) * ratio, barH - 4);
        }

        // Label + percentage
        ctx.font = "bold 8px system-ui, sans-serif";
        ctx.textBaseline = "middle";
        ctx.textAlign = "left";
        ctx.fillStyle = "rgba(226, 232, 240, 0.9)";
        ctx.fillText("JAR FILL", barX + 6, barY + barH / 2 + 0.5);
        ctx.textAlign = "right";
        ctx.fillText(Math.round(ratio * 100) + "%", barX + barW - 6, barY + barH / 2 + 0.5);

        // Countdown sits above the bar, on top of every body.
        if (overflow) {
            var timeLeft = Math.max(0, this.dangerMaxTime - this.dangerTimer).toFixed(1);
            ctx.textAlign = "center";
            ctx.font = "bold 11px system-ui, sans-serif";
            ctx.fillStyle = "rgba(248, 113, 113, " + pulse.toFixed(2) + ")";
            ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
            ctx.shadowBlur = 4;
            ctx.fillText("JAR FULL - " + timeLeft + "s", SIM_WIDTH / 2, DANGER_Y - 8);
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