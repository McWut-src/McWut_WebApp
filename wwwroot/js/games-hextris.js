(function () {
    "use strict";

    window.McWutGames = window.McWutGames || {};

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



    window.HextrisGame = HextrisGame;
    window.McWutGames.hextris = {
        HextrisGame: HextrisGame,
        state: hxState,
        getGame: function () { return hxGame; },
        hxEnsureGame: hxEnsureGame,
        hxStartGame: hxStartGame,
        hxPause: hxPause,
        hxResume: hxResume,
        hxSetMuted: function (m) { if (hxGame) hxGame.setMuted(m); }
    };
    window.hxState = hxState;
    window.hxEnsureGame = hxEnsureGame;
    window.hxStartGame = hxStartGame;
    window.hxPause = hxPause;
    window.hxResume = hxResume;
    try {
        Object.defineProperty(window, "hxGame", {
            get: function () { return hxGame; },
            set: function (v) { hxGame = v; },
            configurable: true
        });
    } catch (e) {
        window.hxGame = hxGame;
    }
})();
