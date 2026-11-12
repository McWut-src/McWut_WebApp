(function () {
    "use strict";

    window.McWutGames = window.McWutGames || {};

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


    window.CyberBreakoutGame = CyberBreakoutGame;
    window.McWutGames.breakout = {
        CyberBreakoutGame: CyberBreakoutGame,
        state: cbState,
        getGame: function () { return cbGame; },
        cbEnsureGame: cbEnsureGame,
        cbStartGame: cbStartGame,
        cbPause: cbPause,
        cbResume: cbResume,
        cbSetMuted: function (m) { if (cbGame) cbGame.setMuted(m); }
    };
    window.cbState = cbState;
    window.cbEnsureGame = cbEnsureGame;
    window.cbStartGame = cbStartGame;
    window.cbPause = cbPause;
    window.cbResume = cbResume;
    try {
        Object.defineProperty(window, "cbGame", {
            get: function () { return cbGame; },
            set: function (v) { cbGame = v; },
            configurable: true
        });
    } catch (e) {
        window.cbGame = cbGame;
    }
})();
