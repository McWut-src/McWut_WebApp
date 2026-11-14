(function () {
    "use strict";

    window.McWutGames = window.McWutGames || {};

    // =========================================================================
    // --- Crowd Quest (search-find): 5-Level Where's Waldo Search & Find ---
    // =========================================================================

    var GAME_KEY = "search-find";
    var MAX_SCORE = 1000000;
    var MAX_COMBO = 100000;
    var WORLD_W = 1200;
    var WORLD_H = 720;
    var HIT_RADIUS = 30;

    // --- DOM Elements ---
    var stageEl = document.getElementById("searchfind-stage");
    var viewportEl = document.getElementById("sf-viewport");
    var canvasEl = document.getElementById("sf-canvas");
    var hudPopEl = document.getElementById("sf-hud-pop");
    var wantedBarEl = document.getElementById("sf-wanted-bar");

    var levelPillsEl = document.getElementById("sf-level-pills");
    var levelNameEl = document.getElementById("sf-level-name");
    var foundCountEl = document.getElementById("sf-found-count");
    var foundTotalEl = document.getElementById("sf-found-total");
    var timerValEl = document.getElementById("sf-timer-val");
    var streakValEl = document.getElementById("sf-streak-val");
    var scoreValEl = document.getElementById("sf-score-val");
    var hintCountEl = document.getElementById("sf-hint-count");

    var zoomOutBtn = document.getElementById("sf-zoom-out-btn");
    var zoomResetBtn = document.getElementById("sf-zoom-reset-btn");
    var zoomInBtn = document.getElementById("sf-zoom-in-btn");
    var loupeBtn = document.getElementById("sf-loupe-btn");
    var hintBtn = document.getElementById("sf-hint-btn");

    var startOverlay = document.getElementById("sf-start-overlay");
    var levelOverlay = document.getElementById("sf-level-overlay");
    var overOverlay = document.getElementById("sf-over-overlay");
    var startBtn = document.getElementById("sf-start-btn");
    var nextLevelBtn = document.getElementById("sf-next-level-btn");
    var againBtn = document.getElementById("sf-again-btn");

    var levelBadgeEl = document.getElementById("sf-level-badge");
    var levelTitleEl = document.getElementById("sf-level-title");
    var levelBreakdownEl = document.getElementById("sf-level-breakdown");

    var overRecordBanner = document.getElementById("sf-record-banner");
    var overBadge = document.getElementById("sf-over-badge");
    var overTitle = document.getElementById("sf-over-title");
    var overBreakdown = document.getElementById("sf-over-breakdown");
    var overScore = document.getElementById("sf-over-score");
    var overCombo = document.getElementById("sf-over-combo");
    var overBest = document.getElementById("sf-over-best");
    var overRank = document.getElementById("sf-over-rank");
    var overSaveStatus = document.getElementById("sf-save-status");

    var muted = false;
    try {
        muted = localStorage.getItem("mcwut-game-mute") === "1";
    } catch (e) {}

    // --- Target Definitions (10 Quirky Characters & Props) ---
    var TARGET_DEFS = {
        explorer: {
            id: "explorer",
            name: "Striped Explorer",
            draw: function (ctx, x, y, s, t) {
                ctx.save();
                ctx.translate(x, y + Math.sin(t * 3.1) * 1.4);
                ctx.scale(s, s);
                // Shadow
                ctx.fillStyle = "rgba(0,0,0,0.28)";
                ctx.beginPath();
                ctx.ellipse(0, 21, 13, 4.5, 0, 0, Math.PI * 2);
                ctx.fill();
                // Legs
                ctx.fillStyle = "#1d4ed8";
                ctx.fillRect(-7, 10, 5.5, 11);
                ctx.fillRect(1.5, 10, 5.5, 11);
                ctx.fillStyle = "#78350f";
                ctx.fillRect(-8, 18.5, 7, 3.5);
                ctx.fillRect(1, 18.5, 7, 3.5);
                // Walking cane
                ctx.strokeStyle = "#92400e";
                ctx.lineWidth = 2.4;
                ctx.beginPath();
                ctx.moveTo(12, 4);
                ctx.lineTo(14, 21);
                ctx.stroke();
                // Red & white striped torso
                ctx.fillStyle = "#ef4444";
                ctx.beginPath();
                ctx.roundRect(-9.5, -5, 19, 16, 4);
                ctx.fill();
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(-9.5, -1, 19, 3.3);
                ctx.fillRect(-9.5, 5.5, 19, 3.3);
                ctx.strokeStyle = "#1e293b";
                ctx.lineWidth = 1.3;
                ctx.strokeRect(-9.5, -5, 19, 16);
                // Head
                ctx.fillStyle = "#fde68a";
                ctx.beginPath();
                ctx.arc(0, -12, 8.2, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = "#1e293b";
                ctx.lineWidth = 1.2;
                ctx.stroke();
                // Round glasses
                ctx.fillStyle = "#ffffff";
                ctx.strokeStyle = "#0f172a";
                ctx.lineWidth = 1.4;
                ctx.beginPath();
                ctx.arc(-3.2, -12, 2.8, 0, Math.PI * 2);
                ctx.arc(3.2, -12, 2.8, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = "#0f172a";
                ctx.beginPath();
                ctx.arc(-3.2, -12, 1.0, 0, Math.PI * 2);
                ctx.arc(3.2, -12, 1.0, 0, Math.PI * 2);
                ctx.fill();
                // Smile
                ctx.beginPath();
                ctx.arc(0, -9.2, 2.8, 0.2, Math.PI - 0.2);
                ctx.stroke();
                // Red & white beanie + pom-pom
                ctx.fillStyle = "#ef4444";
                ctx.beginPath();
                ctx.arc(0, -15.5, 8.4, Math.PI, 0);
                ctx.fill();
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(-8.8, -17, 17.6, 3.2);
                ctx.beginPath();
                ctx.arc(0, -24.5, 3.2, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = "#1e293b";
                ctx.lineWidth = 1.1;
                ctx.stroke();
                ctx.restore();
            }
        },
        bronny: {
            id: "bronny",
            name: "Baby Bronny #6",
            draw: function (ctx, x, y, s, t) {
                ctx.save();
                ctx.translate(x, y + Math.sin(t * 4.2) * 1.6);
                ctx.scale(s, s);
                ctx.fillStyle = "rgba(0,0,0,0.28)";
                ctx.beginPath();
                ctx.ellipse(0, 21, 13, 4.5, 0, 0, Math.PI * 2);
                ctx.fill();
                // Basketball bouncing on right
                var bounce = Math.abs(Math.sin(t * 5.2)) * 5;
                ctx.fillStyle = "#f97316";
                ctx.beginPath();
                ctx.arc(13, 14 - bounce, 5.8, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = "#431407";
                ctx.lineWidth = 1.2;
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(7.4, 14 - bounce);
                ctx.lineTo(18.6, 14 - bounce);
                ctx.stroke();
                // Shorts & sneakers
                ctx.fillStyle = "#581c87";
                ctx.fillRect(-7.5, 9, 15, 6);
                ctx.fillStyle = "#92400e";
                ctx.fillRect(-6, 15, 4.2, 5);
                ctx.fillRect(1.8, 15, 4.2, 5);
                ctx.fillStyle = "#facc15";
                ctx.fillRect(-7, 19, 6, 3);
                ctx.fillRect(1, 19, 6, 3);
                // Purple & gold #6 Jersey
                ctx.fillStyle = "#7e22ce";
                ctx.beginPath();
                ctx.roundRect(-8.5, -5, 17, 15, 3);
                ctx.fill();
                ctx.strokeStyle = "#facc15";
                ctx.lineWidth = 1.6;
                ctx.stroke();
                ctx.fillStyle = "#facc15";
                ctx.font = "900 10px sans-serif";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText("6", 0, 3);
                // Head & headband
                ctx.fillStyle = "#8d5524";
                ctx.beginPath();
                ctx.arc(0, -12, 8.2, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = "#facc15";
                ctx.fillRect(-8.2, -16.5, 16.4, 3);
                ctx.fillStyle = "#111827";
                ctx.beginPath();
                ctx.arc(-2.8, -11.5, 1.3, 0, Math.PI * 2);
                ctx.arc(2.8, -11.5, 1.3, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = "#ffffff";
                ctx.lineWidth = 1.3;
                ctx.beginPath();
                ctx.arc(0, -9, 2.8, 0.15, Math.PI - 0.15);
                ctx.stroke();
                ctx.restore();
            }
        },
        kaiju: {
            id: "kaiju",
            name: "Mini Orb-Kaiju",
            draw: function (ctx, x, y, s, t) {
                ctx.save();
                ctx.translate(x, y + Math.sin(t * 3.8) * 1.5);
                ctx.scale(s, s);
                ctx.fillStyle = "rgba(0,0,0,0.28)";
                ctx.beginPath();
                ctx.ellipse(0, 20, 14, 4.8, 0, 0, Math.PI * 2);
                ctx.fill();
                // Tail & spikes
                ctx.fillStyle = "#4d7c0f";
                ctx.beginPath();
                ctx.moveTo(8, 8);
                ctx.lineTo(18, 12);
                ctx.lineTo(10, 15);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = "#a3e635";
                ctx.beginPath();
                ctx.moveTo(-5, -13);
                ctx.lineTo(-2, -19);
                ctx.lineTo(1, -13);
                ctx.lineTo(4, -18);
                ctx.lineTo(7, -12);
                ctx.fill();
                // Stubby legs & arms
                ctx.fillStyle = "#65a30d";
                ctx.fillRect(-8, 12, 5.5, 7);
                ctx.fillRect(2.5, 12, 5.5, 7);
                ctx.fillRect(-14, 0, 5, 4);
                ctx.fillRect(9, 0, 5, 4);
                // Mossy orb body
                ctx.fillStyle = "#65a30d";
                ctx.beginPath();
                ctx.arc(0, 1, 13, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = "#365314";
                ctx.lineWidth = 1.6;
                ctx.stroke();
                // Glowing amber slit eyes
                ctx.fillStyle = "#f97316";
                ctx.beginPath();
                ctx.ellipse(-4.5, -3.5, 2.8, 1.8, -0.25, 0, Math.PI * 2);
                ctx.ellipse(4.5, -3.5, 2.8, 1.8, 0.25, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = "#fef08a";
                ctx.fillRect(-5, -4.5, 1.2, 2);
                ctx.fillRect(4, -4.5, 1.2, 2);
                // Roaring jaw + ivory fangs
                ctx.fillStyle = "#450a0a";
                ctx.beginPath();
                ctx.ellipse(0, 5.2, 6.2, 4.2, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = "#fef9c3";
                ctx.beginPath();
                ctx.moveTo(-4, 2);
                ctx.lineTo(-2.5, 5);
                ctx.lineTo(-1, 2);
                ctx.moveTo(1, 2);
                ctx.lineTo(2.5, 5);
                ctx.lineTo(4, 2);
                ctx.fill();
                ctx.restore();
            }
        },
        trophy: {
            id: "trophy",
            name: "Golden Trophy",
            draw: function (ctx, x, y, s, t) {
                ctx.save();
                ctx.translate(x, y);
                ctx.scale(s, s);
                ctx.fillStyle = "rgba(0,0,0,0.28)";
                ctx.beginPath();
                ctx.ellipse(0, 19, 12, 4, 0, 0, Math.PI * 2);
                ctx.fill();
                // Handles
                ctx.strokeStyle = "#facc15";
                ctx.lineWidth = 2.6;
                ctx.beginPath();
                ctx.arc(-8.5, -4, 5, Math.PI * 0.5, Math.PI * 1.5);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(8.5, -4, 5, -Math.PI * 0.5, Math.PI * 0.5);
                ctx.stroke();
                // Base
                ctx.fillStyle = "#78350f";
                ctx.fillRect(-8, 13, 16, 5);
                ctx.fillStyle = "#eab308";
                ctx.fillRect(-3, 5, 6, 8);
                // Cup
                ctx.fillStyle = "#facc15";
                ctx.beginPath();
                ctx.moveTo(-10, -13);
                ctx.lineTo(10, -13);
                ctx.quadraticCurveTo(9, 6, 0, 7);
                ctx.quadraticCurveTo(-9, 6, -10, -13);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = "#a16207";
                ctx.lineWidth = 1.4;
                ctx.stroke();
                // Twinkle
                var g = 0.65 + 0.35 * Math.sin(t * 5);
                ctx.fillStyle = "rgba(255, 255, 255, " + g + ")";
                ctx.beginPath();
                ctx.arc(-4, -8, 2.2, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        },
        cat: {
            id: "cat",
            name: "Cyber Cat",
            draw: function (ctx, x, y, s, t) {
                ctx.save();
                ctx.translate(x, y + Math.sin(t * 3.5) * 1.2);
                ctx.scale(s, s);
                ctx.fillStyle = "rgba(0,0,0,0.25)";
                ctx.beginPath();
                ctx.ellipse(0, 19, 12, 4, 0, 0, Math.PI * 2);
                ctx.fill();
                // Tail
                ctx.strokeStyle = "#06b6d4";
                ctx.lineWidth = 3.2;
                ctx.lineCap = "round";
                ctx.beginPath();
                ctx.moveTo(7, 13);
                ctx.quadraticCurveTo(16, 9, 14, 1);
                ctx.stroke();
                // Body
                ctx.fillStyle = "#0891b2";
                ctx.beginPath();
                ctx.roundRect(-8, 0, 16, 17, 6);
                ctx.fill();
                // Ears
                ctx.fillStyle = "#06b6d4";
                ctx.beginPath();
                ctx.moveTo(-9, -9);
                ctx.lineTo(-10, -19);
                ctx.lineTo(-2, -13);
                ctx.moveTo(9, -9);
                ctx.lineTo(10, -19);
                ctx.lineTo(2, -13);
                ctx.fill();
                // Head
                ctx.beginPath();
                ctx.arc(0, -7, 9.5, 0, Math.PI * 2);
                ctx.fill();
                // Glowing neon visor
                ctx.fillStyle = "#0f172a";
                ctx.fillRect(-8, -11, 16, 5.2);
                ctx.fillStyle = "#ec4899";
                ctx.fillRect(-6, -9.5, 12, 2.2);
                ctx.restore();
            }
        },
        alien: {
            id: "alien",
            name: "Alien Plush",
            draw: function (ctx, x, y, s, t) {
                ctx.save();
                ctx.translate(x, y + Math.sin(t * 4.5) * 1.4);
                ctx.scale(s, s);
                ctx.fillStyle = "rgba(0,0,0,0.25)";
                ctx.beginPath();
                ctx.ellipse(0, 19, 11, 4, 0, 0, Math.PI * 2);
                ctx.fill();
                // Antenna
                ctx.strokeStyle = "#65a30d";
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(0, -14);
                ctx.lineTo(0, -22);
                ctx.stroke();
                ctx.fillStyle = "#fde047";
                ctx.beginPath();
                ctx.arc(0, -23, 3, 0, Math.PI * 2);
                ctx.fill();
                // Suit
                ctx.fillStyle = "#2563eb";
                ctx.beginPath();
                ctx.roundRect(-8, 1, 16, 16, 5);
                ctx.fill();
                // Lime head
                ctx.fillStyle = "#84cc16";
                ctx.beginPath();
                ctx.ellipse(0, -7, 10, 8.5, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = "#365314";
                ctx.lineWidth = 1.3;
                ctx.stroke();
                // 3 Eyes
                ctx.fillStyle = "#0f172a";
                ctx.beginPath();
                ctx.arc(-4.5, -8, 1.9, 0, Math.PI * 2);
                ctx.arc(0, -10.5, 1.9, 0, Math.PI * 2);
                ctx.arc(4.5, -8, 1.9, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(-5, -8.8, 1, 1);
                ctx.fillRect(-0.4, -11.3, 1, 1);
                ctx.fillRect(4.1, -8.8, 1, 1);
                ctx.restore();
            }
        },
        board: {
            id: "board",
            name: "Flame Skateboard",
            draw: function (ctx, x, y, s, t) {
                ctx.save();
                ctx.translate(x, y);
                ctx.scale(s, s);
                ctx.rotate(-0.28);
                ctx.fillStyle = "rgba(0,0,0,0.25)";
                ctx.beginPath();
                ctx.ellipse(0, 12, 16, 4, 0, 0, Math.PI * 2);
                ctx.fill();
                // Wheels
                ctx.fillStyle = "#22d3ee";
                ctx.beginPath();
                ctx.arc(-9, 6.5, 3.6, 0, Math.PI * 2);
                ctx.arc(9, 6.5, 3.6, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = "#083344";
                ctx.lineWidth = 1.2;
                ctx.stroke();
                // Deck
                ctx.fillStyle = "#f97316";
                ctx.beginPath();
                ctx.roundRect(-16, -2, 32, 7.5, 3.8);
                ctx.fill();
                ctx.strokeStyle = "#fde047";
                ctx.lineWidth = 1.6;
                ctx.stroke();
                // Flame stripe
                ctx.fillStyle = "#fde047";
                ctx.beginPath();
                ctx.moveTo(-9, 1.8);
                ctx.lineTo(0, -0.5);
                ctx.lineTo(9, 1.8);
                ctx.lineTo(0, 3.8);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }
        },
        wizard: {
            id: "wizard",
            name: "Wizard Hat",
            draw: function (ctx, x, y, s, t) {
                ctx.save();
                ctx.translate(x, y);
                ctx.scale(s, s);
                ctx.fillStyle = "rgba(0,0,0,0.26)";
                ctx.beginPath();
                ctx.ellipse(0, 13, 15, 4.5, 0, 0, Math.PI * 2);
                ctx.fill();
                // Brim
                ctx.fillStyle = "#4f46e5";
                ctx.beginPath();
                ctx.ellipse(0, 9, 15, 5.2, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = "#1e1b4b";
                ctx.lineWidth = 1.4;
                ctx.stroke();
                // Cone
                ctx.fillStyle = "#6366f1";
                ctx.beginPath();
                ctx.moveTo(-10, 8);
                ctx.quadraticCurveTo(-2, -9, 6, -18);
                ctx.quadraticCurveTo(9, -6, 10, 8);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                // Gold band + stars
                ctx.fillStyle = "#facc15";
                ctx.fillRect(-9.2, 3.5, 18.4, 3.6);
                ctx.beginPath();
                ctx.arc(-1, -4, 2, 0, Math.PI * 2);
                ctx.arc(3.5, -10, 1.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        },
        keytar: {
            id: "keytar",
            name: "Keytar Synth",
            draw: function (ctx, x, y, s, t) {
                ctx.save();
                ctx.translate(x, y);
                ctx.scale(s, s);
                ctx.rotate(-0.32);
                ctx.fillStyle = "rgba(0,0,0,0.25)";
                ctx.beginPath();
                ctx.ellipse(0, 13, 15, 4, 0, 0, Math.PI * 2);
                ctx.fill();
                // Neck
                ctx.fillStyle = "#db2777";
                ctx.fillRect(-19, -3.5, 13, 5);
                // Body
                ctx.fillStyle = "#ec4899";
                ctx.beginPath();
                ctx.roundRect(-8, -7, 23, 13, 3);
                ctx.fill();
                ctx.strokeStyle = "#831843";
                ctx.lineWidth = 1.4;
                ctx.stroke();
                // Keys
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(-4, -1, 16, 6);
                ctx.fillStyle = "#0f172a";
                for (var k = -2; k <= 10; k += 4) {
                    ctx.fillRect(k, -1, 2.1, 3.6);
                }
                ctx.restore();
            }
        },
        ramen: {
            id: "ramen",
            name: "Spicy Ramen",
            draw: function (ctx, x, y, s, t) {
                ctx.save();
                ctx.translate(x, y);
                ctx.scale(s, s);
                ctx.fillStyle = "rgba(0,0,0,0.26)";
                ctx.beginPath();
                ctx.ellipse(0, 15, 13, 4.2, 0, 0, Math.PI * 2);
                ctx.fill();
                // Chopsticks
                ctx.strokeStyle = "#fde68a";
                ctx.lineWidth = 2.2;
                ctx.beginPath();
                ctx.moveTo(-4, -4);
                ctx.lineTo(14, -14);
                ctx.moveTo(-1, -1);
                ctx.lineTo(15, -9);
                ctx.stroke();
                // Broth + noodles
                ctx.fillStyle = "#facc15";
                ctx.beginPath();
                ctx.ellipse(0, -2, 12, 5.2, 0, 0, Math.PI * 2);
                ctx.fill();
                // Narutomaki swirl
                ctx.fillStyle = "#ffffff";
                ctx.beginPath();
                ctx.arc(-4, -3, 3.4, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = "#f43f5e";
                ctx.beginPath();
                ctx.arc(-4, -3, 1.5, 0, Math.PI * 2);
                ctx.fill();
                // Red bowl
                ctx.fillStyle = "#dc2626";
                ctx.beginPath();
                ctx.arc(0, -1, 13, 0, Math.PI);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = "#7f1d1d";
                ctx.lineWidth = 1.4;
                ctx.stroke();
                ctx.restore();
            }
        }
    };

    // --- 5 Level Configurations ---
    var LEVELS = [
        {
            level: 1,
            name: "Sunny Boardwalk",
            timeLimit: 75,
            crowdCount: 48,
            targets: ["explorer", "bronny", "kaiju", "board"],
            bgType: "boardwalk"
        },
        {
            level: 2,
            name: "Neon Arcade Carnival",
            timeLimit: 75,
            crowdCount: 72,
            targets: ["explorer", "bronny", "kaiju", "trophy", "keytar"],
            bgType: "carnival"
        },
        {
            level: 3,
            name: "Grand Central Subway",
            timeLimit: 80,
            crowdCount: 96,
            targets: ["explorer", "bronny", "kaiju", "cat", "board", "ramen"],
            bgType: "subway"
        },
        {
            level: 4,
            name: "Monster Movie Backlot",
            timeLimit: 85,
            crowdCount: 120,
            targets: ["explorer", "bronny", "kaiju", "alien", "wizard", "trophy", "cat"],
            bgType: "backlot"
        },
        {
            level: 5,
            name: "Cosmic Night Market",
            timeLimit: 90,
            crowdCount: 145,
            targets: ["explorer", "bronny", "kaiju", "ramen", "keytar", "alien", "wizard", "trophy"],
            bgType: "market"
        }
    ];

    // --- Game State ---
    var sfState = {
        active: false,
        mode: "idle", // "idle" | "playing" | "levelclear" | "gameover"
        levelIdx: 0,
        score: 0,
        streak: 0,
        maxCombo: 0,
        timeLeft: 75,
        hintsLeft: 2,
        totalFound: 0,
        totalMisses: 0,
        levelsCleared: 0,
        targets: [],
        decoys: [],
        effects: [],
        hintRing: null,
        priorityTargetId: null,
        cooldownTimer: 0,
        zoom: 1.0,
        panX: 0,
        panY: 0,
        loupeEnabled: false,
        pointerWorldX: WORLD_W * 0.5,
        pointerWorldY: WORLD_H * 0.5,
        pointerScreenX: -999,
        pointerScreenY: -999,
        pointerInside: false,
        elapsed: 0,
        lastTime: performance.now(),
        rafId: null,
        autoAdvanceTimer: null,
        popTimer: 0,
        gameId: 0,
        submitted: false,
        leaderboard: null
    };

    // --- Audio Helpers ---
    function playFoundSfx(streak) {
        if (muted) return;
        if (window.McWutGames && window.McWutGames.audio && typeof window.McWutGames.audio.playPerfectSound === "function") {
            window.McWutGames.audio.playPerfectSound(Math.max(1, streak));
        } else if (typeof window.playPerfectSound === "function") {
            window.playPerfectSound(Math.max(1, streak));
        }
    }

    function playMissSfx() {
        if (muted) return;
        if (window.McWutGames && window.McWutGames.audio && typeof window.McWutGames.audio.playSliceSound === "function") {
            window.McWutGames.audio.playSliceSound(0.2);
        } else if (typeof window.playSliceSound === "function") {
            window.playSliceSound(0.2);
        }
    }

    function playOverSfx(won) {
        if (muted) return;
        if (won) {
            if (window.McWutGames && window.McWutGames.audio && typeof window.McWutGames.audio.playNewRecordFanfare === "function") {
                window.McWutGames.audio.playNewRecordFanfare();
            } else if (typeof window.playNewRecordFanfare === "function") {
                window.playNewRecordFanfare();
            }
        } else {
            if (window.McWutGames && window.McWutGames.audio && typeof window.McWutGames.audio.playGameOverSound === "function") {
                window.McWutGames.audio.playGameOverSound();
            } else if (typeof window.playGameOverSound === "function") {
                window.playGameOverSound();
            }
        }
    }

    // --- Procedural Crowd & Level Builder ---
    var SHIRT_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#a855f7", "#06b6d4", "#ec4899", "#f43f5e", "#6366f1", "#84cc16"];
    var SKIN_TONES = ["#fde68a", "#fed7aa", "#d97706", "#8d5524", "#fca5a5"];
    var HAIR_COLORS = ["#1e293b", "#78350f", "#facc15", "#b91c1c", "#f97316", "#64748b"];
    var PANTS_COLORS = ["#1e293b", "#1d4ed8", "#334155", "#475569", "#3f3f46"];

    function buildLevelEntities(cfg) {
        sfState.targets = [];
        sfState.decoys = [];
        sfState.effects = [];
        sfState.hintRing = null;
        sfState.priorityTargetId = null;

        // Place targets with guaranteed spacing & margins
        var placedTargets = [];
        for (var i = 0; i < cfg.targets.length; i++) {
            var tid = cfg.targets[i];
            var def = TARGET_DEFS[tid];
            if (!def) continue;
            var tx = 140 + Math.random() * (WORLD_W - 280);
            var ty = 135 + Math.random() * (WORLD_H - 220);
            for (var attempt = 0; attempt < 50; attempt++) {
                var candX = 95 + Math.random() * (WORLD_W - 190);
                var candY = 125 + Math.random() * (WORLD_H - 195);
                var ok = true;
                for (var k = 0; k < placedTargets.length; k++) {
                    var dx = candX - placedTargets[k].x;
                    var dy = candY - placedTargets[k].y;
                    if (dx * dx + dy * dy < 115 * 115) {
                        ok = false;
                        break;
                    }
                }
                if (ok) {
                    tx = candX;
                    ty = candY;
                    break;
                }
            }
            var tObj = {
                id: tid,
                name: def.name,
                x: tx,
                y: ty,
                scale: 1.0,
                found: false,
                foundAnim: 0,
                def: def
            };
            placedTargets.push(tObj);
            sfState.targets.push(tObj);
        }

        // Populate bustling crowd & decoy characters (including striped look-alikes!)
        for (var d = 0; d < cfg.crowdCount; d++) {
            var dxPos = 54 + Math.random() * (WORLD_W - 108);
            var dyPos = 105 + Math.random() * (WORLD_H - 155);

            // Prevent decoys from standing right in front of or directly on top of any target center
            for (var pTry = 0; pTry < 16; pTry++) {
                var blocked = false;
                for (var tIdx = 0; tIdx < sfState.targets.length; tIdx++) {
                    var tg = sfState.targets[tIdx];
                    var ox = dxPos - tg.x;
                    var oy = dyPos - tg.y;
                    if (Math.abs(ox) < 34 && oy >= -18 && oy < 42) {
                        blocked = true;
                        break;
                    }
                }
                if (!blocked) break;
                dxPos = 54 + Math.random() * (WORLD_W - 108);
                dyPos = 105 + Math.random() * (WORLD_H - 155);
            }

            var kindRoll = Math.random();
            var lookAlike = kindRoll < 0.24; // ~24% look-alike decoys (wrong color stripes, green backpacks, etc.)
            var isProp = !lookAlike && kindRoll > 0.86;
            sfState.decoys.push({
                x: dxPos,
                y: dyPos,
                scale: 0.88 + Math.random() * 0.22,
                phase: Math.random() * Math.PI * 2,
                shirt: lookAlike ? (Math.random() < 0.5 ? "#2563eb" : "#16a34a") : SHIRT_COLORS[d % SHIRT_COLORS.length],
                stripe: lookAlike,
                skin: SKIN_TONES[d % SKIN_TONES.length],
                hair: HAIR_COLORS[d % HAIR_COLORS.length],
                pants: PANTS_COLORS[d % PANTS_COLORS.length],
                hat: Math.random() < 0.36 ? (lookAlike ? "#0284c7" : SHIRT_COLORS[(d + 3) % SHIRT_COLORS.length]) : null,
                propType: isProp ? (d % 4) : -1,
                facing: Math.random() < 0.5 ? 1 : -1
            });
        }
    }

    function drawDecoy(ctx, d, t) {
        ctx.save();
        var bob = Math.sin(t * 2.4 + d.phase) * 1.1;
        ctx.translate(d.x, d.y + bob);
        ctx.scale(d.scale * d.facing, d.scale);

        ctx.fillStyle = "rgba(0,0,0,0.22)";
        ctx.beginPath();
        ctx.ellipse(0, 20, 11, 3.8, 0, 0, Math.PI * 2);
        ctx.fill();

        if (d.propType === 0) {
            // Potted palm / market crate decoy
            ctx.fillStyle = "#b45309";
            ctx.fillRect(-10, 2, 20, 16);
            ctx.strokeStyle = "#78350f";
            ctx.lineWidth = 1.4;
            ctx.strokeRect(-10, 2, 20, 16);
            ctx.fillStyle = "#16a34a";
            ctx.beginPath();
            ctx.arc(-5, -3, 6, 0, Math.PI * 2);
            ctx.arc(5, -3, 6, 0, Math.PI * 2);
            ctx.arc(0, -8, 6.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            return;
        } else if (d.propType === 1) {
            // Trash bin / hydrant
            ctx.fillStyle = "#475569";
            ctx.beginPath();
            ctx.roundRect(-8, -2, 16, 20, 3);
            ctx.fill();
            ctx.fillStyle = "#94a3b8";
            ctx.fillRect(-9, -4, 18, 4);
            ctx.restore();
            return;
        } else if (d.propType === 2) {
            // Floating balloon cluster
            ctx.strokeStyle = "#cbd5e1";
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(0, 18);
            ctx.lineTo(-4, -8);
            ctx.moveTo(0, 18);
            ctx.lineTo(5, -11);
            ctx.stroke();
            ctx.fillStyle = "#f43f5e";
            ctx.beginPath();
            ctx.arc(-4, -12, 6.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#38bdf8";
            ctx.beginPath();
            ctx.arc(5, -14, 6.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            return;
        }

        // Standard crowd character
        ctx.fillStyle = d.pants;
        ctx.fillRect(-6, 9, 4.8, 10);
        ctx.fillRect(1.2, 9, 4.8, 10);

        ctx.fillStyle = d.shirt;
        ctx.beginPath();
        ctx.roundRect(-8.5, -5, 17, 15, 4);
        ctx.fill();
        if (d.stripe) {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(-8.5, -1, 17, 2.8);
            ctx.fillRect(-8.5, 4.5, 17, 2.8);
        }
        ctx.strokeStyle = "rgba(15, 23, 42, 0.7)";
        ctx.lineWidth = 1.1;
        ctx.strokeRect(-8.5, -5, 17, 15);

        // Head
        ctx.fillStyle = d.skin;
        ctx.beginPath();
        ctx.arc(0, -11.5, 7.2, 0, Math.PI * 2);
        ctx.fill();

        // Hair or cap
        ctx.fillStyle = d.hat || d.hair;
        ctx.beginPath();
        ctx.arc(0, -14.5, 7.4, Math.PI, 0);
        ctx.fill();
        if (d.hat) {
            ctx.fillRect(-7.5, -15, 18, 2.4);
        }

        // Eyes
        ctx.fillStyle = "#0f172a";
        ctx.beginPath();
        ctx.arc(-2.2, -11, 1.1, 0, Math.PI * 2);
        ctx.arc(2.6, -11, 1.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // --- 5 Scene Backdrops ---
    function drawSceneBackdrop(ctx, bgType, t) {
        if (bgType === "boardwalk") {
            var sky = ctx.createLinearGradient(0, 0, 0, 230);
            sky.addColorStop(0, "#0ea5e9");
            sky.addColorStop(1, "#bae6fd");
            ctx.fillStyle = sky;
            ctx.fillRect(0, 0, WORLD_W, 230);
            // Sun
            ctx.fillStyle = "#fde047";
            ctx.beginPath();
            ctx.arc(1040, 68, 38, 0, Math.PI * 2);
            ctx.fill();
            // Ocean
            ctx.fillStyle = "#0284c7";
            ctx.fillRect(0, 120, WORLD_W, 95);
            ctx.strokeStyle = "rgba(255,255,255,0.45)";
            ctx.lineWidth = 2;
            for (var w = 0; w < 14; w++) {
                var wx = ((w * 95 + t * 22) % (WORLD_W + 120)) - 60;
                ctx.beginPath();
                ctx.moveTo(wx, 150 + (w % 3) * 18);
                ctx.quadraticCurveTo(wx + 24, 144 + (w % 3) * 18, wx + 48, 150 + (w % 3) * 18);
                ctx.stroke();
            }
            // Sand
            ctx.fillStyle = "#fde68a";
            ctx.fillRect(0, 215, WORLD_W, 220);
            // Wooden Boardwalk
            ctx.fillStyle = "#b45309";
            ctx.fillRect(0, 415, WORLD_W, WORLD_H - 415);
            ctx.strokeStyle = "rgba(69, 26, 3, 0.45)";
            ctx.lineWidth = 2;
            for (var pl = 0; pl < WORLD_W; pl += 48) {
                ctx.beginPath();
                ctx.moveTo(pl, 415);
                ctx.lineTo(pl, WORLD_H);
                ctx.stroke();
            }
            ctx.fillStyle = "#d97706";
            ctx.fillRect(0, 408, WORLD_W, 10);
            // Beach Umbrellas & Lifeguard Tower
            var umbX = [160, 420, 740, 1010];
            var umbCols = ["#ef4444", "#ec4899", "#14b8a6", "#f59e0b"];
            for (var u = 0; u < umbX.length; u++) {
                ctx.strokeStyle = "#78350f";
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(umbX[u], 240);
                ctx.lineTo(umbX[u], 300);
                ctx.stroke();
                ctx.fillStyle = umbCols[u];
                ctx.beginPath();
                ctx.arc(umbX[u], 246, 38, Math.PI, 0);
                ctx.fill();
                ctx.fillStyle = "#ffffff";
                ctx.beginPath();
                ctx.arc(umbX[u], 246, 20, Math.PI, 0);
                ctx.fill();
            }
            // Lifeguard Tower
            ctx.fillStyle = "#f8fafc";
            ctx.fillRect(548, 170, 64, 54);
            ctx.fillStyle = "#ef4444";
            ctx.beginPath();
            ctx.moveTo(536, 170);
            ctx.lineTo(580, 144);
            ctx.lineTo(624, 170);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = "#94a3b8";
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(554, 224);
            ctx.lineTo(546, 275);
            ctx.moveTo(606, 224);
            ctx.lineTo(614, 275);
            ctx.stroke();
        } else if (bgType === "carnival") {
            var cSky = ctx.createLinearGradient(0, 0, 0, WORLD_H);
            cSky.addColorStop(0, "#1e1b4b");
            cSky.addColorStop(0.55, "#312e81");
            cSky.addColorStop(1, "#1e293b");
            ctx.fillStyle = cSky;
            ctx.fillRect(0, 0, WORLD_W, WORLD_H);
            // Ferris Wheel
            ctx.save();
            ctx.translate(920, 210);
            ctx.strokeStyle = "rgba(56, 189, 248, 0.45)";
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(0, 0, 130, 0, Math.PI * 2);
            ctx.stroke();
            for (var sp = 0; sp < 10; sp++) {
                var ang = sp * (Math.PI / 5) + t * 0.25;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(Math.cos(ang) * 130, Math.sin(ang) * 130);
                ctx.stroke();
                ctx.fillStyle = sp % 2 === 0 ? "#ec4899" : "#facc15";
                ctx.fillRect(Math.cos(ang) * 130 - 9, Math.sin(ang) * 130 - 5, 18, 12);
            }
            ctx.restore();
            // Midway Asphalt & Tiles
            ctx.fillStyle = "#27272a";
            ctx.fillRect(0, 280, WORLD_W, WORLD_H - 280);
            ctx.fillStyle = "#3f3f46";
            for (var row = 280; row < WORLD_H; row += 48) {
                ctx.fillRect(0, row, WORLD_W, 2);
            }
            // Carnival Prize Booths
            var booths = [80, 340, 620];
            for (var b = 0; b < booths.length; b++) {
                ctx.fillStyle = "#4c1d95";
                ctx.fillRect(booths[b], 125, 180, 145);
                ctx.fillStyle = b % 2 === 0 ? "#ec4899" : "#06b6d4";
                ctx.fillRect(booths[b] - 8, 110, 196, 26);
                ctx.fillStyle = "#0f172a";
                ctx.fillRect(booths[b] + 16, 148, 148, 72);
            }
            // String lights
            for (var lx = 40; lx < WORLD_W; lx += 55) {
                ctx.fillStyle = lx % 110 === 40 ? "#facc15" : "#22d3ee";
                ctx.beginPath();
                ctx.arc(lx, 56 + Math.sin(lx * 0.04) * 12, 5, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (bgType === "subway") {
            ctx.fillStyle = "#0f172a";
            ctx.fillRect(0, 0, WORLD_W, WORLD_H);
            // Concourse wall
            ctx.fillStyle = "#1e293b";
            ctx.fillRect(0, 0, WORLD_W, 230);
            // Arched windows
            ctx.fillStyle = "#0284c7";
            for (var win = 90; win < WORLD_W - 80; win += 210) {
                ctx.beginPath();
                ctx.roundRect(win, 34, 110, 130, [55, 55, 4, 4]);
                ctx.fill();
            }
            // Express Train Banner
            ctx.fillStyle = "#334155";
            ctx.fillRect(0, 195, WORLD_W, 75);
            ctx.fillStyle = "#f97316";
            ctx.fillRect(0, 235, WORLD_W, 12);
            // Tiled platform floor
            ctx.fillStyle = "#475569";
            ctx.fillRect(0, 270, WORLD_W, WORLD_H - 270);
            ctx.fillStyle = "#facc15";
            ctx.fillRect(0, 270, WORLD_W, 10);
            ctx.strokeStyle = "rgba(15, 23, 42, 0.35)";
            ctx.lineWidth = 2;
            for (var gx = 0; gx < WORLD_W; gx += 60) {
                ctx.beginPath();
                ctx.moveTo(gx, 280);
                ctx.lineTo(gx - 40, WORLD_H);
                ctx.stroke();
            }
            // Departure Board
            ctx.fillStyle = "#020617";
            ctx.fillRect(460, 44, 280, 74);
            ctx.strokeStyle = "#facc15";
            ctx.lineWidth = 3;
            ctx.strokeRect(460, 44, 280, 74);
            ctx.fillStyle = "#facc15";
            ctx.font = "bold 18px monospace";
            ctx.textAlign = "center";
            ctx.fillText("EXP 07  ON TIME", 600, 88);
        } else if (bgType === "backlot") {
            ctx.fillStyle = "#090d16";
            ctx.fillRect(0, 0, WORLD_W, WORLD_H);
            // Studio trusses
            ctx.strokeStyle = "#334155";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(0, 62);
            ctx.lineTo(WORLD_W, 62);
            ctx.stroke();
            // Cardboard Skyline Props
            var bWidths = [110, 140, 95, 160, 120, 130, 110];
            var bx = 40;
            for (var i = 0; i < bWidths.length; i++) {
                var bh = 130 + ((i * 53) % 90);
                ctx.fillStyle = i % 2 === 0 ? "#1e293b" : "#312e81";
                ctx.fillRect(bx, 270 - bh, bWidths[i], bh);
                ctx.fillStyle = "#fde047";
                for (var wy = 285 - bh; wy < 250; wy += 24) {
                    for (var wxp = bx + 16; wxp < bx + bWidths[i] - 18; wxp += 26) {
                        ctx.fillRect(wxp, wy, 12, 12);
                    }
                }
                bx += bWidths[i] + 38;
            }
            // Soundstage floor
            ctx.fillStyle = "#1f2937";
            ctx.fillRect(0, 270, WORLD_W, WORLD_H - 270);
            // Green Screen Zone
            ctx.fillStyle = "#16a34a";
            ctx.fillRect(480, 120, 220, 150);
            ctx.strokeStyle = "#4ade80";
            ctx.lineWidth = 3;
            ctx.strokeRect(480, 120, 220, 150);
            // Spotlight Cones
            ctx.fillStyle = "rgba(254, 240, 138, 0.08)";
            ctx.beginPath();
            ctx.moveTo(220, 62);
            ctx.lineTo(80, 420);
            ctx.lineTo(360, 420);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(960, 62);
            ctx.lineTo(820, 420);
            ctx.lineTo(1100, 420);
            ctx.closePath();
            ctx.fill();
        } else {
            // Level 5: Cosmic Night Market
            var mSky = ctx.createLinearGradient(0, 0, 0, WORLD_H);
            mSky.addColorStop(0, "#09051a");
            mSky.addColorStop(0.4, "#1e1b4b");
            mSky.addColorStop(1, "#0f172a");
            ctx.fillStyle = mSky;
            ctx.fillRect(0, 0, WORLD_W, WORLD_H);
            // Neon Market Canopies & Hologram Signs
            ctx.fillStyle = "#1e1b4b";
            ctx.fillRect(0, 240, WORLD_W, WORLD_H - 240);
            // Glowing Floor Reflections
            ctx.fillStyle = "rgba(236, 72, 153, 0.12)";
            ctx.fillRect(90, 320, 260, 160);
            ctx.fillStyle = "rgba(34, 211, 238, 0.12)";
            ctx.fillRect(760, 360, 300, 190);
            // Stall Row
            var stalls = [70, 360, 670, 950];
            var stallColors = ["#ec4899", "#06b6d4", "#f59e0b", "#a855f7"];
            for (var s = 0; s < stalls.length; s++) {
                ctx.fillStyle = "#0f172a";
                ctx.fillRect(stalls[s], 125, 190, 120);
                ctx.fillStyle = stallColors[s];
                ctx.fillRect(stalls[s] - 10, 112, 210, 24);
                ctx.strokeStyle = stallColors[s];
                ctx.lineWidth = 2.4;
                ctx.strokeRect(stalls[s] + 15, 72, 160, 30);
            }
            // Glowing Paper Lanterns
            for (var lx2 = 60; lx2 < WORLD_W; lx2 += 72) {
                var sw = Math.sin(t * 2 + lx2 * 0.03) * 3;
                ctx.fillStyle = lx2 % 144 === 60 ? "#f97316" : "#ec4899";
                ctx.beginPath();
                ctx.ellipse(lx2 + sw, 52, 12, 16, 0, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    // --- Camera & Coordinate Conversion ---
    function getViewportMetrics() {
        var cw = canvasEl.width || 1;
        var ch = canvasEl.height || 1;
        var fitScale = Math.min(cw / WORLD_W, ch / WORLD_H);
        var scale = fitScale * sfState.zoom;
        var viewW = WORLD_W * scale;
        var viewH = WORLD_H * scale;
        var maxPanX = Math.max(0, (viewW - cw) * 0.5);
        var maxPanY = Math.max(0, (viewH - ch) * 0.5);
        sfState.panX = Math.max(-maxPanX, Math.min(maxPanX, sfState.panX));
        sfState.panY = Math.max(-maxPanY, Math.min(maxPanY, sfState.panY));
        var originX = (cw - viewW) * 0.5 + sfState.panX;
        var originY = (ch - viewH) * 0.5 + sfState.panY;
        return { scale: scale, originX: originX, originY: originY, fitScale: fitScale };
    }

    function clientToWorld(clientX, clientY) {
        var rect = canvasEl.getBoundingClientRect();
        var dpr = canvasEl.width / Math.max(1, rect.width);
        var cx = (clientX - rect.left) * dpr;
        var cy = (clientY - rect.top) * dpr;
        var m = getViewportMetrics();
        return {
            wx: (cx - m.originX) / m.scale,
            wy: (cy - m.originY) / m.scale,
            cx: cx,
            cy: cy
        };
    }

    function setZoom(nextZoom, focusClientX, focusClientY) {
        var clamped = Math.max(1.0, Math.min(2.6, nextZoom));
        if (clamped === sfState.zoom) return;
        var prevWorld = typeof focusClientX === "number" ? clientToWorld(focusClientX, focusClientY) : null;
        sfState.zoom = clamped;
        if (clamped <= 1.01) {
            sfState.zoom = 1.0;
            sfState.panX = 0;
            sfState.panY = 0;
        } else if (prevWorld) {
            var rect = canvasEl.getBoundingClientRect();
            var dpr = canvasEl.width / Math.max(1, rect.width);
            var cx = (focusClientX - rect.left) * dpr;
            var cy = (focusClientY - rect.top) * dpr;
            var cw = canvasEl.width || 1;
            var ch = canvasEl.height || 1;
            var fitScale = Math.min(cw / WORLD_W, ch / WORLD_H);
            var newScale = fitScale * sfState.zoom;
            var viewW = WORLD_W * newScale;
            var viewH = WORLD_H * newScale;
            sfState.panX = cx - prevWorld.wx * newScale - (cw - viewW) * 0.5;
            sfState.panY = cy - prevWorld.wy * newScale - (ch - viewH) * 0.5;
            getViewportMetrics();
        }
        updateHudDom();
    }

    // --- Wanted Target Bar ---
    function renderWantedBar() {
        if (!wantedBarEl) return;
        wantedBarEl.innerHTML = "";
        for (var i = 0; i < sfState.targets.length; i++) {
            var tg = sfState.targets[i];
            var btn = document.createElement("button");
            btn.type = "button";
            btn.className = "sf-target-chip" + (tg.found ? " is-found" : "") + (sfState.priorityTargetId === tg.id ? " is-selected" : "");
            btn.setAttribute("data-sf-target", tg.id);
            btn.title = tg.found ? (tg.name + " (Found)") : ("Hunting: " + tg.name + " (tap to prioritize hint)");

            var miniCanvas = document.createElement("canvas");
            miniCanvas.width = 40;
            miniCanvas.height = 40;
            miniCanvas.className = "sf-target-portrait";
            var mctx = miniCanvas.getContext("2d");
            if (mctx && tg.def) {
                tg.def.draw(mctx, 20, 22, 0.72, 0);
            }
            btn.appendChild(miniCanvas);

            var label = document.createElement("span");
            label.className = "sf-target-name";
            label.textContent = tg.name;
            btn.appendChild(label);

            if (tg.found) {
                var check = document.createElement("span");
                check.className = "sf-target-check";
                check.textContent = "\u2713";
                btn.appendChild(check);
            }

            (function (targetId) {
                btn.addEventListener("click", function () {
                    sfState.priorityTargetId = sfState.priorityTargetId === targetId ? null : targetId;
                    renderWantedBar();
                });
            })(tg.id);

            wantedBarEl.appendChild(btn);
        }
    }

    function updateHudDom() {
        var cfg = LEVELS[sfState.levelIdx];
        if (levelNameEl) levelNameEl.textContent = "Lv " + cfg.level + ": " + cfg.name;
        if (levelPillsEl) {
            var pills = levelPillsEl.querySelectorAll("[data-sf-level]");
            for (var i = 0; i < pills.length; i++) {
                var lv = parseInt(pills[i].getAttribute("data-sf-level"), 10);
                pills[i].classList.toggle("is-active", lv === cfg.level);
                pills[i].classList.toggle("is-cleared", lv < cfg.level);
            }
        }
        var foundCount = 0;
        for (var j = 0; j < sfState.targets.length; j++) {
            if (sfState.targets[j].found) foundCount++;
        }
        if (foundCountEl) foundCountEl.textContent = String(foundCount);
        if (foundTotalEl) foundTotalEl.textContent = String(sfState.targets.length);

        var sec = Math.max(0, Math.ceil(sfState.timeLeft));
        var mins = Math.floor(sec / 60);
        var rem = sec % 60;
        if (timerValEl) {
            timerValEl.textContent = mins + ":" + (rem < 10 ? "0" + rem : rem);
        }
        if (streakValEl) streakValEl.textContent = "\u00D7" + Math.max(1, Math.min(8, sfState.streak));
        if (scoreValEl) scoreValEl.textContent = Math.round(sfState.score).toLocaleString();
        if (hintCountEl) hintCountEl.textContent = String(sfState.hintsLeft);
        if (hintBtn) hintBtn.disabled = sfState.hintsLeft <= 0 || sfState.mode !== "playing";
        if (zoomResetBtn) zoomResetBtn.textContent = Math.round(sfState.zoom * 100) + "%";
        if (loupeBtn) {
            loupeBtn.classList.toggle("is-active", sfState.loupeEnabled);
            loupeBtn.setAttribute("aria-pressed", sfState.loupeEnabled ? "true" : "false");
        }
    }

    function showPopBanner(text) {
        if (!hudPopEl) return;
        hudPopEl.textContent = text;
        hudPopEl.hidden = false;
        sfState.popTimer = 1.15;
    }

    // --- Level & Game Lifecycle ---
    function loadLevel(levelIndex, resetRunStats) {
        if (sfState.autoAdvanceTimer) {
            clearTimeout(sfState.autoAdvanceTimer);
            sfState.autoAdvanceTimer = null;
        }
        sfState.levelIdx = Math.max(0, Math.min(LEVELS.length - 1, levelIndex));
        var cfg = LEVELS[sfState.levelIdx];

        if (resetRunStats) {
            sfState.gameId++;
            sfState.score = 0;
            sfState.streak = 0;
            sfState.maxCombo = 0;
            sfState.hintsLeft = 2;
            sfState.totalFound = 0;
            sfState.totalMisses = 0;
            sfState.levelsCleared = 0;
            sfState.submitted = false;
        }

        sfState.timeLeft = cfg.timeLimit;
        sfState.zoom = 1.0;
        sfState.panX = 0;
        sfState.panY = 0;
        sfState.cooldownTimer = 0;

        buildLevelEntities(cfg);
        renderWantedBar();
        updateHudDom();
    }

    function sfStartGame(startLevelNum) {
        var idx = typeof startLevelNum === "number" ? Math.max(0, Math.min(LEVELS.length - 1, startLevelNum - 1)) : 0;
        loadLevel(idx, true);
        sfState.mode = "playing";
        if (startOverlay) startOverlay.hidden = true;
        if (levelOverlay) levelOverlay.hidden = true;
        if (overOverlay) overOverlay.hidden = true;
        if (overRecordBanner) overRecordBanner.hidden = true;
        if (hudPopEl) hudPopEl.hidden = true;
        updateHudDom();
        sfResume();
    }

    function completeCurrentLevel() {
        var cfg = LEVELS[sfState.levelIdx];
        var levelBonus = 500 * cfg.level;
        var timeBonus = Math.round(Math.max(0, sfState.timeLeft) * 15);
        sfState.levelsCleared++;
        sfState.score = Math.min(MAX_SCORE, sfState.score + levelBonus + timeBonus);

        if (sfState.levelIdx >= LEVELS.length - 1) {
            // Campaign Completed!
            var masterBonus = 1500;
            sfState.score = Math.min(MAX_SCORE, sfState.score + masterBonus);
            finishGameOver(true);
            return;
        }

        if (cfg.level % 2 === 0) {
            sfState.hintsLeft = Math.min(3, sfState.hintsLeft + 1);
        }

        sfState.mode = "levelclear";
        playOverSfx(true);
        if (levelBadgeEl) levelBadgeEl.textContent = "LEVEL " + cfg.level + " COMPLETE!";
        if (levelTitleEl) levelTitleEl.textContent = cfg.name + " Cleared!";
        if (levelBreakdownEl) {
            levelBreakdownEl.textContent =
                "+" + levelBonus.toLocaleString() + " clear bonus · +" +
                timeBonus.toLocaleString() + " speed bonus";
        }
        if (levelOverlay) levelOverlay.hidden = false;
        updateHudDom();

        sfState.autoAdvanceTimer = setTimeout(function () {
            if (sfState.mode === "levelclear") {
                advanceLevel();
            }
        }, 2000);
    }

    function advanceLevel() {
        if (sfState.autoAdvanceTimer) {
            clearTimeout(sfState.autoAdvanceTimer);
            sfState.autoAdvanceTimer = null;
        }
        if (sfState.levelIdx >= LEVELS.length - 1) {
            finishGameOver(true);
            return;
        }
        loadLevel(sfState.levelIdx + 1, false);
        sfState.mode = "playing";
        if (levelOverlay) levelOverlay.hidden = true;
        updateHudDom();
    }

    function finishGameOver(won) {
        if (sfState.autoAdvanceTimer) {
            clearTimeout(sfState.autoAdvanceTimer);
            sfState.autoAdvanceTimer = null;
        }
        sfState.mode = "gameover";
        if (levelOverlay) levelOverlay.hidden = true;
        playOverSfx(won);

        var finalScore = Math.max(0, Math.min(MAX_SCORE, Math.round(sfState.score)));
        var finalCombo = Math.max(0, Math.min(MAX_COMBO, Math.min(finalScore, sfState.maxCombo)));

        if (overBadge) overBadge.textContent = won ? "ALL 5 LEVELS CLEARED!" : "TIME UP!";
        if (overTitle) overTitle.textContent = won ? "Master Seeker!" : "Crowd Escaped!";
        if (overBreakdown) {
            overBreakdown.textContent =
                sfState.levelsCleared + "/5 levels cleared · " +
                sfState.totalFound + " targets found · " +
                sfState.totalMisses + " misses";
        }
        if (overScore) overScore.textContent = finalScore.toLocaleString();
        if (overCombo) overCombo.textContent = "\u00D7" + finalCombo.toLocaleString();
        if (overBest) overBest.textContent = "\u2014";
        if (overRank) overRank.textContent = "\u2014";
        if (overSaveStatus) overSaveStatus.textContent = "Saving score\u2026";
        if (overOverlay) overOverlay.hidden = false;
        updateHudDom();

        submitSearchFindScore(finalScore, finalCombo);
    }

    async function submitSearchFindScore(finalScore, finalCombo) {
        if (sfState.submitted) return;
        sfState.submitted = true;
        var gid = sfState.gameId;

        try {
            var res = null;
            if (window.McWutGames && window.McWutGames.leaderboard && typeof window.McWutGames.leaderboard.submitScore === "function") {
                res = await window.McWutGames.leaderboard.submitScore(GAME_KEY, finalScore, finalCombo);
            } else if (typeof window.submitScore === "function") {
                res = await window.submitScore(GAME_KEY, finalScore, finalCombo);
            }
            if (!res || gid !== sfState.gameId) return;

            sfState.leaderboard = res.leaderboard;
            if (overBest) overBest.textContent = (res.bestScore || finalScore).toLocaleString();
            if (overRank) overRank.textContent = res.rank ? "#" + res.rank : "\u2014";
            if (overRecordBanner) overRecordBanner.hidden = !res.isNewBest;
            if (overSaveStatus) {
                overSaveStatus.textContent = res.isNewBest
                    ? "New personal record saved to the global leaderboard!"
                    : "Score recorded. Personal best: " + (res.bestScore || 0).toLocaleString() + ".";
            }
        } catch (err) {
            if (overSaveStatus && gid === sfState.gameId) {
                overSaveStatus.textContent = "Could not save score right now.";
            }
        }
    }

    // --- Actions: Hit Testing & Hints ---
    function captureTarget(tg) {
        if (!tg || tg.found || sfState.mode !== "playing") return;
        tg.found = true;
        tg.foundAnim = 1.0;
        sfState.streak++;
        if (sfState.streak > sfState.maxCombo) {
            sfState.maxCombo = sfState.streak;
        }
        sfState.totalFound++;
        var mult = Math.min(8, sfState.streak);
        var pts = 250 * mult;
        sfState.score = Math.min(MAX_SCORE, sfState.score + pts);
        if (sfState.hintRing && sfState.hintRing.targetId === tg.id) {
            sfState.hintRing = null;
        }

        playFoundSfx(sfState.streak);
        sfState.effects.push({
            kind: "ring",
            x: tg.x,
            y: tg.y,
            life: 1.0,
            text: "+" + pts + (mult > 1 ? " \u00D7" + mult : "")
        });
        showPopBanner(tg.name.toUpperCase() + "! +" + pts);
        renderWantedBar();
        updateHudDom();

        var remaining = 0;
        for (var i = 0; i < sfState.targets.length; i++) {
            if (!sfState.targets[i].found) remaining++;
        }
        if (remaining === 0) {
            completeCurrentLevel();
        }
    }

    function handleSceneClick(wx, wy) {
        if (sfState.mode !== "playing") return;
        if (sfState.cooldownTimer > 0) return;

        // Find closest unfound target within hit radius
        var best = null;
        var bestDist = HIT_RADIUS * HIT_RADIUS;
        for (var i = 0; i < sfState.targets.length; i++) {
            var tg = sfState.targets[i];
            if (tg.found) continue;
            var dx = wx - tg.x;
            var dy = wy - tg.y;
            var d2 = dx * dx + dy * dy;
            if (d2 <= bestDist) {
                bestDist = d2;
                best = tg;
            }
        }

        if (best) {
            captureTarget(best);
            return;
        }

        // Misfire penalty
        sfState.streak = 0;
        sfState.totalMisses++;
        sfState.score = Math.max(0, sfState.score - 50);
        sfState.timeLeft = Math.max(0, sfState.timeLeft - 2);
        sfState.cooldownTimer = 0.55;
        playMissSfx();
        sfState.effects.push({
            kind: "miss",
            x: wx,
            y: wy,
            life: 1.0,
            text: "MISS -50"
        });
        showPopBanner("MISS! -2s");
        updateHudDom();
        if (sfState.timeLeft <= 0) {
            finishGameOver(false);
        }
    }

    function useRadarHint() {
        if (sfState.mode !== "playing" || sfState.hintsLeft <= 0) return;
        var chosen = null;
        if (sfState.priorityTargetId) {
            for (var p = 0; p < sfState.targets.length; p++) {
                if (sfState.targets[p].id === sfState.priorityTargetId && !sfState.targets[p].found) {
                    chosen = sfState.targets[p];
                    break;
                }
            }
        }
        if (!chosen) {
            for (var i = 0; i < sfState.targets.length; i++) {
                if (!sfState.targets[i].found) {
                    chosen = sfState.targets[i];
                    break;
                }
            }
        }
        if (!chosen) return;

        sfState.hintsLeft--;
        sfState.score = Math.max(0, sfState.score - 150);
        sfState.hintRing = {
            targetId: chosen.id,
            x: chosen.x + (Math.random() - 0.5) * 28,
            y: chosen.y + (Math.random() - 0.5) * 28,
            timer: 4.5
        };
        playFoundSfx(2);
        showPopBanner("RADAR: " + chosen.name.toUpperCase());
        updateHudDom();
    }

    function revealNextTarget() {
        for (var i = 0; i < sfState.targets.length; i++) {
            if (!sfState.targets[i].found) {
                captureTarget(sfState.targets[i]);
                return sfState.targets[i];
            }
        }
        return null;
    }

    // --- Rendering ---
    function drawWorld(ctx, t) {
        var cfg = LEVELS[sfState.levelIdx];
        drawSceneBackdrop(ctx, cfg.bgType, t);

        // Y-sort crowd decoys and targets together for 2.5D crowd layering
        var items = [];
        for (var d = 0; d < sfState.decoys.length; d++) {
            items.push({ isTarget: false, y: sfState.decoys[d].y, obj: sfState.decoys[d] });
        }
        for (var k = 0; k < sfState.targets.length; k++) {
            items.push({ isTarget: true, y: sfState.targets[k].y, obj: sfState.targets[k] });
        }
        items.sort(function (a, b) { return a.y - b.y; });

        for (var i = 0; i < items.length; i++) {
            var it = items[i];
            if (!it.isTarget) {
                drawDecoy(ctx, it.obj, t);
            } else {
                var tg = it.obj;
                if (tg.found) {
                    ctx.save();
                    ctx.globalAlpha = 0.42;
                    tg.def.draw(ctx, tg.x, tg.y, tg.scale, t);
                    ctx.restore();
                    // Found ring
                    ctx.save();
                    ctx.strokeStyle = "#34d399";
                    ctx.lineWidth = 3.5;
                    ctx.beginPath();
                    ctx.arc(tg.x, tg.y, 24, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.fillStyle = "#10b981";
                    ctx.beginPath();
                    ctx.arc(tg.x + 17, tg.y - 17, 9, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = "#ffffff";
                    ctx.font = "900 12px sans-serif";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillText("\u2713", tg.x + 17, tg.y - 16.5);
                    ctx.restore();
                } else {
                    tg.def.draw(ctx, tg.x, tg.y, tg.scale, t);
                }
            }
        }

        // Hint radar pulse
        if (sfState.hintRing && sfState.hintRing.timer > 0) {
            var hr = sfState.hintRing;
            var pulse = 36 + Math.sin(t * 7) * 8;
            ctx.save();
            ctx.strokeStyle = "#facc15";
            ctx.lineWidth = 4;
            ctx.setLineDash([9, 6]);
            ctx.beginPath();
            ctx.arc(hr.x, hr.y, pulse, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = "rgba(250, 204, 21, 0.14)";
            ctx.beginPath();
            ctx.arc(hr.x, hr.y, pulse, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Floating ring & miss effects
        for (var e = 0; e < sfState.effects.length; e++) {
            var ef = sfState.effects[e];
            ctx.save();
            ctx.globalAlpha = Math.max(0, ef.life);
            if (ef.kind === "ring") {
                ctx.strokeStyle = "#34d399";
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(ef.x, ef.y, 22 + (1 - ef.life) * 34, 0, Math.PI * 2);
                ctx.stroke();
                ctx.fillStyle = "#fef08a";
            } else {
                ctx.strokeStyle = "#f43f5e";
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(ef.x - 10, ef.y - 10);
                ctx.lineTo(ef.x + 10, ef.y + 10);
                ctx.moveTo(ef.x + 10, ef.y - 10);
                ctx.lineTo(ef.x - 10, ef.y + 10);
                ctx.stroke();
                ctx.fillStyle = "#fda4af";
            }
            ctx.font = "900 18px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(ef.text, ef.x, ef.y - 26 - (1 - ef.life) * 24);
            ctx.restore();
        }
    }

    function render() {
        if (!canvasEl) return;
        var ctx = canvasEl.getContext("2d");
        if (!ctx) return;

        var cw = canvasEl.width;
        var ch = canvasEl.height;
        ctx.clearRect(0, 0, cw, ch);
        ctx.fillStyle = "#090d16";
        ctx.fillRect(0, 0, cw, ch);

        var m = getViewportMetrics();
        ctx.save();
        ctx.translate(m.originX, m.originY);
        ctx.scale(m.scale, m.scale);
        drawWorld(ctx, sfState.elapsed);
        ctx.restore();

        // Magnifying Loupe Lens
        if (sfState.loupeEnabled && sfState.pointerInside && sfState.mode === "playing") {
            var dpr = canvasEl.width / Math.max(1, canvasEl.clientWidth || canvasEl.width);
            var lensR = 76 * dpr;
            var lx = sfState.pointerScreenX;
            var ly = sfState.pointerScreenY;
            var magZoom = m.scale * 2.25;

            ctx.save();
            ctx.beginPath();
            ctx.arc(lx, ly, lensR, 0, Math.PI * 2);
            ctx.clip();
            ctx.fillStyle = "#090d16";
            ctx.fillRect(lx - lensR, ly - lensR, lensR * 2, lensR * 2);

            ctx.save();
            ctx.translate(lx - sfState.pointerWorldX * magZoom, ly - sfState.pointerWorldY * magZoom);
            ctx.scale(magZoom, magZoom);
            drawWorld(ctx, sfState.elapsed);
            ctx.restore();

            // Subtle crosshair
            ctx.strokeStyle = "rgba(45, 212, 191, 0.45)";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(lx - 12, ly);
            ctx.lineTo(lx + 12, ly);
            ctx.moveTo(lx, ly - 12);
            ctx.lineTo(lx, ly + 12);
            ctx.stroke();
            ctx.restore();

            // Rim glow
            ctx.save();
            ctx.strokeStyle = "#2dd4bf";
            ctx.lineWidth = 4 * dpr;
            ctx.beginPath();
            ctx.arc(lx, ly, lensR, 0, Math.PI * 2);
            ctx.stroke();
            ctx.strokeStyle = "rgba(255,255,255,0.45)";
            ctx.lineWidth = 2 * dpr;
            ctx.beginPath();
            ctx.arc(lx, ly, lensR - 5 * dpr, -Math.PI * 0.85, -Math.PI * 0.35);
            ctx.stroke();
            ctx.restore();
        }
    }

    function step(now) {
        if (!sfState.active) {
            sfState.rafId = null;
            return;
        }
        var dt = Math.min((now - sfState.lastTime) / 1000, 0.1);
        sfState.lastTime = now;
        sfState.elapsed += dt;

        if (sfState.popTimer > 0) {
            sfState.popTimer -= dt;
            if (sfState.popTimer <= 0 && hudPopEl) hudPopEl.hidden = true;
        }

        if (sfState.mode === "playing") {
            if (sfState.cooldownTimer > 0) {
                sfState.cooldownTimer = Math.max(0, sfState.cooldownTimer - dt);
            }
            if (sfState.hintRing) {
                sfState.hintRing.timer -= dt;
                if (sfState.hintRing.timer <= 0) sfState.hintRing = null;
            }
            var prevSec = Math.ceil(sfState.timeLeft);
            sfState.timeLeft = Math.max(0, sfState.timeLeft - dt);
            if (Math.ceil(sfState.timeLeft) !== prevSec) {
                updateHudDom();
            }
            if (sfState.timeLeft <= 0) {
                finishGameOver(false);
            }
        }

        for (var i = sfState.effects.length - 1; i >= 0; i--) {
            sfState.effects[i].life -= dt * 1.45;
            if (sfState.effects[i].life <= 0) {
                sfState.effects.splice(i, 1);
            }
        }

        render();
        sfState.rafId = requestAnimationFrame(step);
    }

    // --- Lifecycle & Resize ---
    function sfResize() {
        if (!viewportEl || !canvasEl) return;
        var w = viewportEl.clientWidth || 640;
        var h = viewportEl.clientHeight || 480;
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvasEl.width = Math.max(1, Math.floor(w * dpr));
        canvasEl.height = Math.max(1, Math.floor(h * dpr));
        render();
    }

    function sfPause() {
        sfState.active = false;
        if (sfState.rafId) {
            cancelAnimationFrame(sfState.rafId);
            sfState.rafId = null;
        }
        if (sfState.autoAdvanceTimer) {
            clearTimeout(sfState.autoAdvanceTimer);
            sfState.autoAdvanceTimer = null;
        }
    }

    function sfResume() {
        sfState.active = true;
        sfState.lastTime = performance.now();
        sfResize();
        if (!sfState.rafId) {
            sfState.rafId = requestAnimationFrame(step);
        }
    }

    function sfHandleKey(ev) {
        if (ev.key === "r" || ev.key === "R") {
            ev.preventDefault();
            sfStartGame();
            return true;
        }
        if (ev.key === "m" || ev.key === "M") {
            ev.preventDefault();
            sfState.loupeEnabled = !sfState.loupeEnabled;
            updateHudDom();
            return true;
        }
        if (ev.key === "h" || ev.key === "H") {
            ev.preventDefault();
            useRadarHint();
            return true;
        }
        if (ev.key === "+" || ev.key === "=") {
            ev.preventDefault();
            setZoom(sfState.zoom + 0.35);
            return true;
        }
        if (ev.key === "-" || ev.key === "_") {
            ev.preventDefault();
            setZoom(sfState.zoom - 0.35);
            return true;
        }
        if (ev.code === "Space" || ev.key === "Enter") {
            if (sfState.mode === "idle" || sfState.mode === "gameover") {
                ev.preventDefault();
                sfStartGame();
                return true;
            }
            if (sfState.mode === "levelclear") {
                ev.preventDefault();
                advanceLevel();
                return true;
            }
        }
        return false;
    }

    // --- Event Wiring ---
    if (startBtn) startBtn.addEventListener("click", function () { sfStartGame(); });
    if (againBtn) againBtn.addEventListener("click", function () { sfStartGame(); });
    if (nextLevelBtn) nextLevelBtn.addEventListener("click", function () { advanceLevel(); });
    if (zoomInBtn) zoomInBtn.addEventListener("click", function () { setZoom(sfState.zoom + 0.35); });
    if (zoomOutBtn) zoomOutBtn.addEventListener("click", function () { setZoom(sfState.zoom - 0.35); });
    if (zoomResetBtn) zoomResetBtn.addEventListener("click", function () { setZoom(1.0); });
    if (loupeBtn) {
        loupeBtn.addEventListener("click", function () {
            sfState.loupeEnabled = !sfState.loupeEnabled;
            updateHudDom();
        });
    }
    if (hintBtn) hintBtn.addEventListener("click", useRadarHint);

    if (levelPillsEl) {
        levelPillsEl.addEventListener("click", function (ev) {
            var btn = ev.target.closest("[data-sf-level]");
            if (!btn) return;
            var lv = parseInt(btn.getAttribute("data-sf-level"), 10);
            if (lv >= 1 && lv <= LEVELS.length) {
                sfStartGame(lv);
            }
        });
    }

    if (canvasEl) {
        var drag = { down: false, dragging: false, startX: 0, startY: 0, lastX: 0, lastY: 0, pointerId: null };

        canvasEl.addEventListener("pointerdown", function (ev) {
            if (sfState.mode === "idle") {
                sfStartGame();
                return;
            }
            if (sfState.mode !== "playing") return;
            drag.down = true;
            drag.dragging = false;
            drag.startX = ev.clientX;
            drag.startY = ev.clientY;
            drag.lastX = ev.clientX;
            drag.lastY = ev.clientY;
            drag.pointerId = ev.pointerId;
            try { canvasEl.setPointerCapture(ev.pointerId); } catch (e) {}

            var pt = clientToWorld(ev.clientX, ev.clientY);
            sfState.pointerWorldX = pt.wx;
            sfState.pointerWorldY = pt.wy;
            sfState.pointerScreenX = pt.cx;
            sfState.pointerScreenY = pt.cy;
            sfState.pointerInside = true;
        });

        canvasEl.addEventListener("pointermove", function (ev) {
            var pt = clientToWorld(ev.clientX, ev.clientY);
            sfState.pointerWorldX = pt.wx;
            sfState.pointerWorldY = pt.wy;
            sfState.pointerScreenX = pt.cx;
            sfState.pointerScreenY = pt.cy;
            sfState.pointerInside = true;

            if (!drag.down || ev.pointerId !== drag.pointerId) return;
            var totalDx = ev.clientX - drag.startX;
            var totalDy = ev.clientY - drag.startY;
            if (!drag.dragging && (totalDx * totalDx + totalDy * totalDy > 64) && sfState.zoom > 1.02) {
                drag.dragging = true;
            }
            if (drag.dragging) {
                var rect = canvasEl.getBoundingClientRect();
                var dpr = canvasEl.width / Math.max(1, rect.width);
                sfState.panX += (ev.clientX - drag.lastX) * dpr;
                sfState.panY += (ev.clientY - drag.lastY) * dpr;
                getViewportMetrics();
            }
            drag.lastX = ev.clientX;
            drag.lastY = ev.clientY;
        });

        var endDrag = function (ev) {
            if (!drag.down || ev.pointerId !== drag.pointerId) return;
            try { canvasEl.releasePointerCapture(ev.pointerId); } catch (e) {}
            if (!drag.dragging && sfState.mode === "playing") {
                var pt = clientToWorld(ev.clientX, ev.clientY);
                handleSceneClick(pt.wx, pt.wy);
            }
            drag.down = false;
            drag.dragging = false;
            drag.pointerId = null;
        };

        canvasEl.addEventListener("pointerup", endDrag);
        canvasEl.addEventListener("pointercancel", endDrag);
        canvasEl.addEventListener("pointerleave", function () {
            sfState.pointerInside = false;
        });

        canvasEl.addEventListener("wheel", function (ev) {
            if (sfState.mode !== "playing") return;
            ev.preventDefault();
            var delta = ev.deltaY < 0 ? 0.25 : -0.25;
            setZoom(sfState.zoom + delta, ev.clientX, ev.clientY);
        }, { passive: false });
    }

    window.addEventListener("resize", sfResize);
    if (window.ResizeObserver && viewportEl) {
        try {
            new ResizeObserver(sfResize).observe(viewportEl);
        } catch (e) {}
    }

    // Boot initial level preview on canvas
    loadLevel(0, true);

    window.McWutGames.searchFind = {
        state: sfState,
        sfStartGame: sfStartGame,
        sfPause: sfPause,
        sfResume: sfResume,
        sfResize: sfResize,
        sfHandleKey: sfHandleKey,
        advanceLevel: advanceLevel,
        revealNextTarget: revealNextTarget,
        useRadarHint: useRadarHint,
        setMuted: function (m) { muted = !!m; }
    };

    window.sfState = sfState;
    window.sfStartGame = sfStartGame;
    window.sfPause = sfPause;
    window.sfResume = sfResume;
    window.sfResize = sfResize;
    window.sfHandleKey = sfHandleKey;
})();
