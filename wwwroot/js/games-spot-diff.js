(function () {
    "use strict";

    window.McWutGames = window.McWutGames || {};

    // =========================================================================
    // --- Spot the Diff (spot-diff): 5-Level Twin Scene Visual Detective ---
    // =========================================================================

    var GAME_KEY = "spot-diff";
    var MAX_SCORE = 1000000;
    var MAX_COMBO = 100000;
    var PANEL_W = 600;
    var PANEL_H = 450;
    var HIT_RADIUS = 36;

    // --- DOM Elements ---
    var stageEl = document.getElementById("spotdiff-stage");
    var viewportEl = document.getElementById("sd-viewport");
    var canvasEl = document.getElementById("sd-canvas");
    var hudPopEl = document.getElementById("sd-hud-pop");

    var levelPillsEl = document.getElementById("sd-level-pills");
    var levelNameEl = document.getElementById("sd-level-name");
    var diffFoundEl = document.getElementById("sd-diff-found");
    var diffTotalEl = document.getElementById("sd-diff-total");
    var pipsEl = document.getElementById("sd-pips");
    var timerValEl = document.getElementById("sd-timer-val");
    var streakValEl = document.getElementById("sd-streak-val");
    var scoreValEl = document.getElementById("sd-score-val");
    var hintCountEl = document.getElementById("sd-hint-count");
    var hintBtn = document.getElementById("sd-hint-btn");

    var startOverlay = document.getElementById("sd-start-overlay");
    var levelOverlay = document.getElementById("sd-level-overlay");
    var overOverlay = document.getElementById("sd-over-overlay");
    var startBtn = document.getElementById("sd-start-btn");
    var nextLevelBtn = document.getElementById("sd-next-level-btn");
    var againBtn = document.getElementById("sd-again-btn");

    var levelBadgeEl = document.getElementById("sd-level-badge");
    var levelTitleEl = document.getElementById("sd-level-title");
    var levelBreakdownEl = document.getElementById("sd-level-breakdown");

    var overRecordBanner = document.getElementById("sd-record-banner");
    var overBadge = document.getElementById("sd-over-badge");
    var overTitle = document.getElementById("sd-over-title");
    var overBreakdown = document.getElementById("sd-over-breakdown");
    var overScore = document.getElementById("sd-over-score");
    var overCombo = document.getElementById("sd-over-combo");
    var overBest = document.getElementById("sd-over-best");
    var overRank = document.getElementById("sd-over-rank");
    var overSaveStatus = document.getElementById("sd-save-status");

    var muted = false;
    try {
        muted = localStorage.getItem("mcwut-game-mute") === "1";
    } catch (e) {}

    // --- 5 Level Definitions (10 Authored Difference Slots per Scene) ---
    var LEVELS = [
        {
            level: 1,
            name: "Cozy Retro Diner",
            diffCount: 5,
            timeLimit: 65,
            slots: [
                { id: 0, x: 300, y: 55, r: 38, label: "Neon Diner Sign" },
                { id: 1, x: 520, y: 80, r: 34, label: "Wall Clock Hands" },
                { id: 2, x: 110, y: 120, r: 34, label: "Hanging Lamp Shade" },
                { id: 3, x: 410, y: 140, r: 38, label: "Pie Display Case" },
                { id: 4, x: 85, y: 270, r: 42, label: "Retro Jukebox" },
                { id: 5, x: 245, y: 242, r: 34, label: "Milkshake Cherry" },
                { id: 6, x: 350, y: 252, r: 34, label: "Condiment Bottles" },
                { id: 7, x: 505, y: 295, r: 40, label: "Diner Booth Cushion" },
                { id: 8, x: 230, y: 372, r: 36, label: "Diner Cat" },
                { id: 9, x: 465, y: 392, r: 36, label: "Floor Star Sticker" }
            ],
            drawScene: drawDinerScene
        },
        {
            level: 2,
            name: "Deep Sea Sub Lab",
            diffCount: 6,
            timeLimit: 70,
            slots: [
                { id: 0, x: 145, y: 140, r: 42, label: "Left Porthole Fish" },
                { id: 1, x: 455, y: 140, r: 42, label: "Right Porthole Surprise" },
                { id: 2, x: 300, y: 76, r: 36, label: "Periscope Valve" },
                { id: 3, x: 300, y: 185, r: 40, label: "Sonar Radar Screen" },
                { id: 4, x: 105, y: 275, r: 36, label: "Specimen Jar" },
                { id: 5, x: 215, y: 255, r: 34, label: "Pressure Gauge" },
                { id: 6, x: 400, y: 255, r: 38, label: "Diving Helmet" },
                { id: 7, x: 515, y: 275, r: 38, label: "Hatch Wheel" },
                { id: 8, x: 280, y: 355, r: 38, label: "Control Levers" },
                { id: 9, x: 165, y: 395, r: 36, label: "Lab Mug / Beaker" }
            ],
            drawScene: drawSubLabScene
        },
        {
            level: 3,
            name: "Wizard's Alchemy Attic",
            diffCount: 6,
            timeLimit: 75,
            slots: [
                { id: 0, x: 300, y: 110, r: 42, label: "Moon Window" },
                { id: 1, x: 115, y: 115, r: 36, label: "Perched Owl" },
                { id: 2, x: 485, y: 115, r: 38, label: "Candle Chandelier" },
                { id: 3, x: 138, y: 225, r: 40, label: "Potion Shelf" },
                { id: 4, x: 300, y: 305, r: 42, label: "Bubbling Cauldron" },
                { id: 5, x: 465, y: 245, r: 38, label: "Crystal Ball" },
                { id: 6, x: 528, y: 355, r: 38, label: "Spellbook Lectern" },
                { id: 7, x: 88, y: 365, r: 36, label: "Golden Hourglass" },
                { id: 8, x: 408, y: 375, r: 38, label: "Wizard Broomstick" },
                { id: 9, x: 205, y: 395, r: 38, label: "Familiar Rug" }
            ],
            drawScene: drawWizardScene
        },
        {
            level: 4,
            name: "Cyber Rooftop Skyline",
            diffCount: 7,
            timeLimit: 80,
            slots: [
                { id: 0, x: 95, y: 80, r: 38, label: "Night Sky Moon/UFO" },
                { id: 1, x: 300, y: 105, r: 42, label: "Hologram Billboard" },
                { id: 2, x: 495, y: 95, r: 38, label: "Satellite Dish" },
                { id: 3, x: 185, y: 155, r: 36, label: "Skyscraper Windows" },
                { id: 4, x: 105, y: 285, r: 40, label: "Neon Vending Machine" },
                { id: 5, x: 285, y: 280, r: 42, label: "Cyber Ramen Stall" },
                { id: 6, x: 455, y: 235, r: 38, label: "Delivery Drone" },
                { id: 7, x: 530, y: 325, r: 36, label: "Steam Vent Pipes" },
                { id: 8, x: 195, y: 380, r: 40, label: "Hover-Bike" },
                { id: 9, x: 400, y: 385, r: 38, label: "Drone Landing Pad" }
            ],
            drawScene: drawCyberScene
        },
        {
            level: 5,
            name: "Royal Museum Heist",
            diffCount: 8,
            timeLimit: 85,
            slots: [
                { id: 0, x: 300, y: 65, r: 40, label: "Crystal Chandelier" },
                { id: 1, x: 110, y: 155, r: 40, label: "Portrait Painting" },
                { id: 2, x: 490, y: 155, r: 38, label: "Security Camera" },
                { id: 3, x: 300, y: 195, r: 44, label: "T-Rex Skeleton" },
                { id: 4, x: 115, y: 315, r: 40, label: "Golden Sarcophagus" },
                { id: 5, x: 300, y: 320, r: 38, label: "Royal Crown Case" },
                { id: 6, x: 485, y: 310, r: 38, label: "Marble Bust" },
                { id: 7, x: 205, y: 295, r: 36, label: "Security Lasers" },
                { id: 8, x: 410, y: 390, r: 38, label: "Velvet Rope" },
                { id: 9, x: 195, y: 395, r: 36, label: "Guard Stool & Donut" }
            ],
            drawScene: drawMuseumScene
        }
    ];

    // Helper: returns true if difference slot `id` is mutated in this modified panel
    function isMut(modMap, id) {
        return !!(modMap && modMap[id]);
    }

    // =========================================================================
    // --- Scene Painters (600 x 450) ---
    // =========================================================================

    function drawDinerScene(ctx, modMap, t) {
        // Wall & Wainscoting
        ctx.fillStyle = "#1e1b4b";
        ctx.fillRect(0, 0, PANEL_W, 330);
        ctx.fillStyle = "#312e81";
        ctx.fillRect(0, 220, PANEL_W, 110);
        // Checkered Floor
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, 330, PANEL_W, 120);
        for (var r = 0; r < 4; r++) {
            for (var c = 0; c < 15; c++) {
                if ((r + c) % 2 === 0) {
                    ctx.fillStyle = "#e2e8f0";
                    ctx.fillRect(c * 40, 330 + r * 30, 40, 30);
                }
            }
        }
        // Slot 9: Floor Star Sticker (465, 392)
        if (!isMut(modMap, 9)) {
            ctx.fillStyle = "#f43f5e";
            ctx.beginPath();
            ctx.arc(465, 392, 13, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#fef08a";
            ctx.font = "bold 16px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("\u2605", 465, 393);
        } else {
            ctx.fillStyle = "#06b6d4";
            ctx.beginPath();
            ctx.roundRect(451, 378, 28, 28, 6);
            ctx.fill();
        }

        // Slot 0: Neon DINER Sign (300, 55)
        ctx.fillStyle = "#0f172a";
        ctx.beginPath();
        ctx.roundRect(212, 24, 176, 58, 12);
        ctx.fill();
        ctx.strokeStyle = isMut(modMap, 0) ? "#facc15" : "#ec4899";
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.fillStyle = isMut(modMap, 0) ? "#facc15" : "#38bdf8";
        ctx.font = "900 28px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("DINER", 292, 54);
        if (!isMut(modMap, 0)) {
            ctx.fillStyle = "#facc15";
            ctx.font = "900 20px sans-serif";
            ctx.fillText("\u2605", 358, 54);
        }

        // Slot 1: Wall Clock (520, 80)
        ctx.fillStyle = "#f8fafc";
        ctx.beginPath();
        ctx.arc(520, 80, 26, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = isMut(modMap, 1) ? "#ec4899" : "#ef4444";
        ctx.lineWidth = 5;
        ctx.stroke();
        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(520, 80);
        ctx.lineTo(520, 62);
        ctx.moveTo(520, 80);
        ctx.lineTo(isMut(modMap, 1) ? 504 : 536, 80);
        ctx.stroke();

        // Slot 2: Hanging Lamp (110, 120)
        ctx.strokeStyle = "#94a3b8";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(110, 0);
        ctx.lineTo(110, 100);
        ctx.stroke();
        ctx.fillStyle = isMut(modMap, 2) ? "#a855f7" : "#facc15";
        ctx.beginPath();
        ctx.moveTo(82, 130);
        ctx.lineTo(138, 130);
        ctx.lineTo(124, 98);
        ctx.lineTo(96, 98);
        ctx.closePath();
        ctx.fill();

        // Counter
        ctx.fillStyle = "#dc2626";
        ctx.fillRect(170, 265, 250, 72);
        ctx.fillStyle = "#e2e8f0";
        ctx.fillRect(162, 256, 266, 13);

        // Slot 3: Pie Display Case (410, 140)
        ctx.fillStyle = "rgba(186, 230, 253, 0.35)";
        ctx.fillRect(368, 108, 86, 62);
        ctx.strokeStyle = "#cbd5e1";
        ctx.lineWidth = 2.5;
        ctx.strokeRect(368, 108, 86, 62);
        // Pie 1
        ctx.fillStyle = "#d97706";
        ctx.fillRect(378, 152, 28, 12);
        ctx.fillStyle = "#f43f5e";
        ctx.fillRect(380, 147, 24, 6);
        // Pie 2 (mutated: missing or green)
        if (!isMut(modMap, 3)) {
            ctx.fillStyle = "#d97706";
            ctx.fillRect(416, 152, 28, 12);
            ctx.fillStyle = "#facc15";
            ctx.fillRect(418, 147, 24, 6);
        }

        // Slot 4: Retro Jukebox (85, 270)
        ctx.fillStyle = "#78350f";
        ctx.beginPath();
        ctx.roundRect(45, 200, 80, 140, [40, 40, 6, 6]);
        ctx.fill();
        ctx.strokeStyle = isMut(modMap, 4) ? "#22d3ee" : "#f43f5e";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(85, 240, 28, Math.PI, 0);
        ctx.stroke();
        ctx.fillStyle = isMut(modMap, 4) ? "#10b981" : "#facc15";
        ctx.fillRect(58, 252, 54, 34);
        ctx.fillStyle = "#e2e8f0";
        ctx.fillRect(62, 298, 46, 24);

        // Slot 5: Milkshake (245, 242)
        ctx.fillStyle = isMut(modMap, 5) ? "#34d399" : "#f472b6";
        ctx.beginPath();
        ctx.moveTo(234, 224);
        ctx.lineTo(256, 224);
        ctx.lineTo(252, 256);
        ctx.lineTo(238, 256);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(245, 222, 11, Math.PI, 0);
        ctx.fill();
        if (!isMut(modMap, 5)) {
            ctx.fillStyle = "#ef4444";
            ctx.beginPath();
            ctx.arc(245, 210, 4.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Slot 6: Ketchup & Mustard (350, 252)
        ctx.fillStyle = isMut(modMap, 6) ? "#facc15" : "#ef4444";
        ctx.fillRect(334, 232, 12, 24);
        ctx.fillStyle = isMut(modMap, 6) ? "#ef4444" : "#facc15";
        ctx.fillRect(354, 232, 12, 24);
        if (isMut(modMap, 6)) {
            // Extra green pickle jar
            ctx.fillStyle = "#22c55e";
            ctx.fillRect(370, 238, 12, 18);
        }

        // Slot 7: Diner Booth (505, 295)
        ctx.fillStyle = isMut(modMap, 7) ? "#0d9488" : "#e11d48";
        ctx.beginPath();
        ctx.roundRect(455, 245, 105, 92, 10);
        ctx.fill();
        ctx.fillStyle = "#f8fafc";
        ctx.fillRect(465, 255, 12, 50);
        ctx.fillRect(535, 255, 12, 50);
        ctx.fillStyle = "#94a3b8";
        ctx.fillRect(465, 296, 85, 12);

        // Stools
        for (var s = 0; s < 2; s++) {
            var sx = 215 + s * 90;
            ctx.fillStyle = "#94a3b8";
            ctx.fillRect(sx - 3, 300, 6, 36);
            ctx.fillStyle = "#ef4444";
            ctx.beginPath();
            ctx.ellipse(sx, 298, 22, 7, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Slot 8: Diner Cat (230, 372)
        ctx.fillStyle = isMut(modMap, 8) ? "#111827" : "#f97316";
        ctx.beginPath();
        ctx.ellipse(230, 376, 18, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(213, 368, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(205, 361);
        ctx.lineTo(206, 351);
        ctx.lineTo(213, 358);
        ctx.moveTo(213, 358);
        ctx.lineTo(220, 351);
        ctx.lineTo(221, 361);
        ctx.fill();
        ctx.fillStyle = "#fde047";
        ctx.fillRect(208, 366, 3, 3);
        ctx.fillRect(216, 366, 3, 3);
    }

    function drawSubLabScene(ctx, modMap, t) {
        // Steel hull
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, 0, PANEL_W, PANEL_H);
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(18, 24, PANEL_W - 36, 310);
        ctx.fillStyle = "#334155";
        ctx.fillRect(0, 334, PANEL_W, 116);

        // Slot 0: Left Porthole (145, 140)
        ctx.fillStyle = "#0284c7";
        ctx.beginPath();
        ctx.arc(145, 140, 56, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#ca8a04";
        ctx.lineWidth = 10;
        ctx.stroke();
        if (!isMut(modMap, 0)) {
            // Orange Clownfish
            ctx.fillStyle = "#f97316";
            ctx.beginPath();
            ctx.ellipse(145, 140, 22, 13, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(140, 128, 6, 24);
            ctx.fillStyle = "#f97316";
            ctx.beginPath();
            ctx.moveTo(123, 140);
            ctx.lineTo(110, 130);
            ctx.lineTo(110, 150);
            ctx.closePath();
            ctx.fill();
        } else {
            // Yellow Pufferfish facing left
            ctx.fillStyle = "#facc15";
            ctx.beginPath();
            ctx.arc(145, 140, 19, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#0f172a";
            ctx.beginPath();
            ctx.arc(136, 136, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // Slot 1: Right Porthole (455, 140)
        ctx.fillStyle = "#0369a1";
        ctx.beginPath();
        ctx.arc(455, 140, 56, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#ca8a04";
        ctx.lineWidth = 10;
        ctx.stroke();
        if (!isMut(modMap, 1)) {
            // Purple Tentacle
            ctx.strokeStyle = "#c084fc";
            ctx.lineWidth = 14;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(435, 185);
            ctx.quadraticCurveTo(465, 145, 445, 110);
            ctx.stroke();
        } else {
            // Sunken Treasure Chest
            ctx.fillStyle = "#b45309";
            ctx.fillRect(432, 136, 46, 28);
            ctx.fillStyle = "#facc15";
            ctx.fillRect(432, 136, 46, 6);
        }

        // Slot 2: Periscope Pipe (300, 76)
        ctx.fillStyle = "#64748b";
        ctx.fillRect(288, 0, 24, 110);
        ctx.fillStyle = isMut(modMap, 2) ? "#facc15" : "#ef4444";
        ctx.beginPath();
        ctx.arc(300, 76, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#f8fafc";
        ctx.lineWidth = 3;
        ctx.stroke();

        // Slot 3: Sonar Radar Screen (300, 185)
        ctx.fillStyle = "#020617";
        ctx.beginPath();
        ctx.roundRect(246, 135, 108, 96, 10);
        ctx.fill();
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.strokeStyle = "#16a34a";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(300, 183, 34, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = isMut(modMap, 3) ? "#ef4444" : "#4ade80";
        ctx.beginPath();
        ctx.arc(316, 168, 5, 0, Math.PI * 2);
        ctx.fill();
        if (isMut(modMap, 3)) {
            ctx.beginPath();
            ctx.arc(282, 198, 5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Desk
        ctx.fillStyle = "#475569";
        ctx.fillRect(65, 295, 470, 50);

        // Slot 4: Specimen Jar (105, 275)
        ctx.fillStyle = "rgba(103, 232, 249, 0.3)";
        ctx.fillRect(85, 240, 40, 56);
        ctx.strokeStyle = "#94a3b8";
        ctx.lineWidth = 2.4;
        ctx.strokeRect(85, 240, 40, 56);
        ctx.fillStyle = isMut(modMap, 4) ? "#84cc16" : "#ec4899";
        ctx.beginPath();
        ctx.arc(105, 266, 10, Math.PI, 0);
        ctx.fill();
        if (isMut(modMap, 4)) {
            ctx.fillRect(102, 266, 6, 14);
        }

        // Slot 5: Pressure Gauge (215, 255)
        ctx.fillStyle = "#f8fafc";
        ctx.beginPath();
        ctx.arc(215, 255, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(215, 255);
        ctx.lineTo(isMut(modMap, 5) ? 231 : 200, 245);
        ctx.stroke();

        // Slot 6: Diving Helmet (400, 255)
        ctx.fillStyle = "#ca8a04";
        ctx.beginPath();
        ctx.arc(400, 258, 28, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = isMut(modMap, 6) ? "#f43f5e" : "#38bdf8";
        ctx.beginPath();
        ctx.arc(400, 258, 15, 0, Math.PI * 2);
        ctx.fill();

        // Slot 7: Hatch Wheel (515, 275)
        ctx.fillStyle = "#64748b";
        ctx.beginPath();
        ctx.arc(515, 275, 32, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = isMut(modMap, 7) ? "#facc15" : "#e2e8f0";
        ctx.lineWidth = 4;
        ctx.stroke();
        var spokes = isMut(modMap, 7) ? 4 : 6;
        for (var sp = 0; sp < spokes; sp++) {
            var ang = (sp * Math.PI * 2) / spokes;
            ctx.beginPath();
            ctx.moveTo(515, 275);
            ctx.lineTo(515 + Math.cos(ang) * 28, 275 + Math.sin(ang) * 28);
            ctx.stroke();
        }

        // Slot 8: Control Levers (280, 355)
        for (var lv = 0; lv < 3; lv++) {
            var lx = 248 + lv * 32;
            ctx.strokeStyle = "#cbd5e1";
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(lx, 365);
            ctx.lineTo(lx, 342);
            ctx.stroke();
            ctx.fillStyle = (isMut(modMap, 8) && lv === 2) ? "#22d3ee" : "#ef4444";
            ctx.beginPath();
            ctx.arc(lx, 340, 7, 0, Math.PI * 2);
            ctx.fill();
        }

        // Slot 9: Lab Mug / Beaker (165, 395)
        if (!isMut(modMap, 9)) {
            ctx.fillStyle = "#f8fafc";
            ctx.fillRect(152, 382, 24, 24);
            ctx.fillStyle = "#78350f";
            ctx.fillRect(154, 384, 20, 6);
        } else {
            ctx.fillStyle = "#38bdf8";
            ctx.beginPath();
            ctx.moveTo(154, 406);
            ctx.lineTo(178, 406);
            ctx.lineTo(171, 382);
            ctx.lineTo(161, 382);
            ctx.closePath();
            ctx.fill();
        }
    }

    function drawWizardScene(ctx, modMap, t) {
        ctx.fillStyle = "#1e1b4b";
        ctx.fillRect(0, 0, PANEL_W, 335);
        ctx.fillStyle = "#3b0764";
        ctx.fillRect(0, 335, PANEL_W, 115);

        // Slot 0: Arched Moon Window (300, 110)
        ctx.fillStyle = "#020617";
        ctx.beginPath();
        ctx.roundRect(245, 36, 110, 145, [55, 55, 6, 6]);
        ctx.fill();
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.fillStyle = "#fef08a";
        ctx.beginPath();
        ctx.arc(isMut(modMap, 0) ? 315 : 285, 88, 22, 0, Math.PI * 2);
        ctx.fill();
        if (!isMut(modMap, 0)) {
            ctx.fillStyle = "#020617";
            ctx.beginPath();
            ctx.arc(294, 84, 18, 0, Math.PI * 2);
            ctx.fill();
        }

        // Slot 1: Perched Owl (115, 115)
        ctx.fillStyle = "#78350f";
        ctx.fillRect(85, 138, 60, 8);
        ctx.fillStyle = isMut(modMap, 1) ? "#92400e" : "#f8fafc";
        ctx.beginPath();
        ctx.ellipse(115, 116, 18, 22, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#facc15";
        ctx.beginPath();
        ctx.arc(108, 108, 4, 0, Math.PI * 2);
        ctx.arc(122, 108, 4, 0, Math.PI * 2);
        ctx.fill();

        // Slot 2: Candle Chandelier (485, 115)
        ctx.strokeStyle = "#facc15";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(485, 0);
        ctx.lineTo(485, 95);
        ctx.moveTo(450, 95);
        ctx.lineTo(520, 95);
        ctx.stroke();
        var candles = isMut(modMap, 2) ? [450, 472, 498, 520] : [452, 485, 518];
        for (var ci = 0; ci < candles.length; ci++) {
            ctx.fillStyle = "#f8fafc";
            ctx.fillRect(candles[ci] - 4, 78, 8, 17);
            ctx.fillStyle = isMut(modMap, 2) ? "#c084fc" : "#fb923c";
            ctx.beginPath();
            ctx.arc(candles[ci], 72, 4.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Slot 3: Potion Shelf (138, 225)
        ctx.fillStyle = "#78350f";
        ctx.fillRect(78, 245, 120, 10);
        var pCols = ["#ef4444", "#38bdf8", "#22c55e"];
        for (var pi = 0; pi < 3; pi++) {
            if (isMut(modMap, 3) && pi === 1) continue;
            ctx.fillStyle = pCols[pi];
            ctx.beginPath();
            ctx.arc(102 + pi * 36, 232, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillRect(98 + pi * 36, 212, 8, 12);
        }

        // Slot 4: Bubbling Cauldron (300, 305)
        ctx.fillStyle = isMut(modMap, 4) ? "#a855f7" : "#4ade80";
        ctx.beginPath();
        ctx.ellipse(300, 282, 38, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#0f172a";
        ctx.beginPath();
        ctx.arc(300, 295, 42, 0, Math.PI);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = isMut(modMap, 4) ? "#f43f5e" : "#86efac";
        ctx.beginPath();
        ctx.arc(288, 260, 6, 0, Math.PI * 2);
        ctx.arc(312, 252, 8, 0, Math.PI * 2);
        ctx.fill();

        // Slot 5: Crystal Ball (465, 245)
        ctx.fillStyle = "#b45309";
        ctx.fillRect(448, 268, 34, 14);
        ctx.fillStyle = isMut(modMap, 5) ? "#ec4899" : "#22d3ee";
        ctx.beginPath();
        ctx.arc(465, 244, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.65)";
        ctx.beginPath();
        ctx.arc(457, 236, 6, 0, Math.PI * 2);
        ctx.fill();

        // Slot 6: Spellbook Lectern (528, 355)
        ctx.fillStyle = "#78350f";
        ctx.fillRect(516, 358, 24, 46);
        ctx.fillStyle = isMut(modMap, 6) ? "#7e22ce" : "#fef3c7";
        ctx.fillRect(500, 336, 56, 26);

        // Slot 7: Golden Hourglass (88, 365)
        ctx.strokeStyle = "#facc15";
        ctx.lineWidth = 3;
        ctx.strokeRect(70, 342, 36, 48);
        ctx.fillStyle = isMut(modMap, 7) ? "#38bdf8" : "#fde047";
        ctx.beginPath();
        ctx.moveTo(74, isMut(modMap, 7) ? 346 : 388);
        ctx.lineTo(102, isMut(modMap, 7) ? 346 : 388);
        ctx.lineTo(88, 366);
        ctx.closePath();
        ctx.fill();

        // Slot 8: Broomstick (408, 375)
        ctx.strokeStyle = "#b45309";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(378, 392);
        ctx.lineTo(438, 348);
        ctx.stroke();
        ctx.fillStyle = isMut(modMap, 8) ? "#22d3ee" : "#facc15";
        ctx.beginPath();
        ctx.arc(isMut(modMap, 8) ? 438 : 378, isMut(modMap, 8) ? 348 : 392, 13, 0, Math.PI * 2);
        ctx.fill();

        // Slot 9: Rug & Familiar (205, 395)
        ctx.fillStyle = "#be123c";
        ctx.beginPath();
        ctx.ellipse(205, 396, 48, 16, 0, 0, Math.PI * 2);
        ctx.fill();
        if (!isMut(modMap, 9)) {
            ctx.fillStyle = "#6366f1";
            ctx.beginPath();
            ctx.moveTo(192, 395);
            ctx.lineTo(205, 368);
            ctx.lineTo(218, 395);
            ctx.closePath();
            ctx.fill();
        } else {
            ctx.fillStyle = "#0f172a";
            ctx.beginPath();
            ctx.arc(205, 392, 12, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawCyberScene(ctx, modMap, t) {
        var sky = ctx.createLinearGradient(0, 0, 0, 320);
        sky.addColorStop(0, "#09051a");
        sky.addColorStop(1, "#311042");
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, PANEL_W, 320);
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(0, 320, PANEL_W, 130);

        // Slot 0: Moon / UFO (95, 80)
        ctx.fillStyle = isMut(modMap, 0) ? "#ec4899" : "#fde047";
        ctx.beginPath();
        ctx.arc(95, 80, 26, 0, Math.PI * 2);
        ctx.fill();
        if (isMut(modMap, 0)) {
            ctx.strokeStyle = "#22d3ee";
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.ellipse(95, 80, 42, 10, -0.3, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Background Buildings & Slot 3: Skyscraper Windows (185, 155)
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(145, 95, 80, 225);
        for (var wy = 112; wy < 210; wy += 24) {
            for (var wx = 160; wx < 212; wx += 24) {
                if (isMut(modMap, 3) && wy === 160) continue;
                ctx.fillStyle = isMut(modMap, 3) ? "#ec4899" : "#38bdf8";
                ctx.fillRect(wx, wy, 14, 14);
            }
        }

        // Slot 1: Hologram Billboard (300, 105)
        ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
        ctx.fillRect(240, 62, 120, 82);
        ctx.strokeStyle = "#22d3ee";
        ctx.lineWidth = 3;
        ctx.strokeRect(240, 62, 120, 82);
        ctx.fillStyle = isMut(modMap, 1) ? "#ec4899" : "#84cc16";
        ctx.beginPath();
        ctx.arc(300, 103, 22, 0, Math.PI * 2);
        ctx.fill();

        // Slot 2: Satellite Dish (495, 95)
        ctx.strokeStyle = "#94a3b8";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(495, 130);
        ctx.lineTo(495, 95);
        ctx.stroke();
        ctx.fillStyle = isMut(modMap, 2) ? "#f97316" : "#e2e8f0";
        ctx.beginPath();
        ctx.arc(495, 92, 24, isMut(modMap, 2) ? -Math.PI * 0.4 : Math.PI * 0.6, isMut(modMap, 2) ? Math.PI * 0.6 : Math.PI * 1.6);
        ctx.fill();

        // Slot 4: Neon Vending Machine (105, 285)
        ctx.fillStyle = isMut(modMap, 4) ? "#db2777" : "#0284c7";
        ctx.fillRect(72, 226, 66, 104);
        ctx.fillStyle = "#e0f2fe";
        ctx.fillRect(82, 238, 46, 52);

        // Slot 5: Cyber Ramen Stall (285, 280)
        ctx.fillStyle = "#1e1b4b";
        ctx.fillRect(225, 236, 120, 92);
        ctx.fillStyle = isMut(modMap, 5) ? "#22c55e" : "#ef4444";
        ctx.fillRect(218, 224, 134, 20);
        ctx.fillStyle = "#facc15";
        ctx.font = "bold 16px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(isMut(modMap, 5) ? "SUSHI" : "RAMEN", 285, 239);

        // Slot 6: Delivery Drone (455, 235)
        ctx.fillStyle = "#475569";
        ctx.fillRect(430, 220, 50, 12);
        ctx.fillStyle = isMut(modMap, 6) ? "#f43f5e" : "#facc15";
        ctx.fillRect(441, 234, 28, 20);

        // Slot 7: Steam Vent Pipes (530, 325)
        ctx.fillStyle = "#64748b";
        ctx.fillRect(514, 290, 32, 42);
        ctx.fillStyle = isMut(modMap, 7) ? "#4ade80" : "rgba(255,255,255,0.65)";
        ctx.beginPath();
        ctx.arc(530, 275, 14, 0, Math.PI * 2);
        ctx.fill();

        // Slot 8: Hover-Bike (195, 380)
        ctx.fillStyle = "#0f172a";
        ctx.beginPath();
        ctx.roundRect(148, 368, 94, 24, 12);
        ctx.fill();
        ctx.strokeStyle = isMut(modMap, 8) ? "#f97316" : "#22d3ee";
        ctx.lineWidth = 4;
        ctx.stroke();

        // Slot 9: Landing Pad (400, 385)
        ctx.strokeStyle = isMut(modMap, 9) ? "#22d3ee" : "#facc15";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(400, 386, 48, 18, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = isMut(modMap, 9) ? "#22d3ee" : "#facc15";
        ctx.font = "900 18px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(isMut(modMap, 9) ? "X" : "H", 400, 387);
    }

    function drawMuseumScene(ctx, modMap, t) {
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(0, 0, PANEL_W, 330);
        ctx.fillStyle = "#334155";
        ctx.fillRect(0, 330, PANEL_W, 120);

        // Slot 0: Crystal Chandelier (300, 65)
        ctx.strokeStyle = "#facc15";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(300, 0);
        ctx.lineTo(300, 48);
        ctx.moveTo(250, 52);
        ctx.lineTo(350, 52);
        ctx.stroke();
        ctx.fillStyle = isMut(modMap, 0) ? "#38bdf8" : "#fde047";
        for (var cx = 260; cx <= 340; cx += 20) {
            if (isMut(modMap, 0) && cx === 300) continue;
            ctx.beginPath();
            ctx.arc(cx, 66, 7, 0, Math.PI * 2);
            ctx.fill();
        }

        // Slot 1: Portrait Frame (110, 155)
        ctx.fillStyle = "#ca8a04";
        ctx.fillRect(72, 108, 76, 94);
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(80, 116, 60, 78);
        ctx.fillStyle = "#fde68a";
        ctx.beginPath();
        ctx.arc(110, 152, 18, 0, Math.PI * 2);
        ctx.fill();
        if (isMut(modMap, 1)) {
            ctx.fillStyle = "#facc15";
            ctx.fillRect(96, 126, 28, 10);
        } else {
            ctx.fillStyle = "#0f172a";
            ctx.fillRect(98, 146, 24, 8);
        }

        // Slot 2: Security Camera (490, 155)
        ctx.fillStyle = "#cbd5e1";
        ctx.fillRect(468, 142, 42, 20);
        ctx.fillStyle = isMut(modMap, 2) ? "#22c55e" : "#ef4444";
        ctx.beginPath();
        ctx.arc(isMut(modMap, 2) ? 505 : 473, 152, 5, 0, Math.PI * 2);
        ctx.fill();

        // Slot 3: T-Rex Skeleton (300, 195)
        ctx.strokeStyle = "#f8fafc";
        ctx.fillStyle = "#f8fafc";
        ctx.lineWidth = 4;
        ctx.fillRect(265, 165, 58, 24);
        ctx.beginPath();
        ctx.moveTo(270, 188);
        ctx.lineTo(270, 232);
        ctx.moveTo(315, 188);
        ctx.lineTo(315, 232);
        ctx.stroke();
        if (!isMut(modMap, 3)) {
            // Tail spike
            ctx.beginPath();
            ctx.moveTo(323, 175);
            ctx.lineTo(356, 165);
            ctx.stroke();
        }

        // Slot 7: Security Lasers (205, 295)
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 2.4;
        var beams = isMut(modMap, 7) ? 2 : 3;
        for (var lb = 0; lb < beams; lb++) {
            ctx.beginPath();
            ctx.moveTo(165, 275 + lb * 16);
            ctx.lineTo(245, 275 + lb * 16);
            ctx.stroke();
        }

        // Slot 4: Golden Sarcophagus (115, 315)
        ctx.fillStyle = "#eab308";
        ctx.beginPath();
        ctx.roundRect(82, 260, 66, 108, 16);
        ctx.fill();
        ctx.fillStyle = isMut(modMap, 4) ? "#ef4444" : "#2563eb";
        ctx.fillRect(92, 292, 46, 10);
        ctx.fillRect(92, 318, 46, 10);

        // Slot 5: Royal Crown Case (300, 320)
        ctx.fillStyle = "rgba(186, 230, 253, 0.35)";
        ctx.fillRect(264, 275, 72, 68);
        ctx.strokeStyle = "#e2e8f0";
        ctx.lineWidth = 2;
        ctx.strokeRect(264, 275, 72, 68);
        ctx.fillStyle = isMut(modMap, 5) ? "#9333ea" : "#dc2626";
        ctx.fillRect(272, 324, 56, 14);
        ctx.fillStyle = isMut(modMap, 5) ? "#34d399" : "#facc15";
        ctx.beginPath();
        ctx.moveTo(280, 324);
        ctx.lineTo(285, 296);
        ctx.lineTo(300, 312);
        ctx.lineTo(315, 296);
        ctx.lineTo(320, 324);
        ctx.closePath();
        ctx.fill();

        // Slot 6: Marble Bust (485, 310)
        ctx.fillStyle = "#e2e8f0";
        ctx.fillRect(465, 318, 40, 36);
        ctx.beginPath();
        ctx.arc(485, 295, 18, 0, Math.PI * 2);
        ctx.fill();
        if (isMut(modMap, 6)) {
            ctx.fillStyle = "#ec4899";
            ctx.fillRect(471, 290, 28, 7);
        }

        // Slot 8: Velvet Rope (410, 390)
        ctx.fillStyle = isMut(modMap, 8) ? "#94a3b8" : "#facc15";
        ctx.fillRect(365, 358, 8, 44);
        ctx.fillRect(447, 358, 8, 44);
        ctx.strokeStyle = "#e11d48";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(369, 368);
        ctx.quadraticCurveTo(410, isMut(modMap, 8) ? 404 : 382, 451, 368);
        ctx.stroke();

        // Slot 9: Guard Stool & Donut (195, 395)
        ctx.fillStyle = "#94a3b8";
        ctx.fillRect(172, 396, 46, 12);
        ctx.fillStyle = isMut(modMap, 9) ? "#78350f" : "#f472b6";
        ctx.beginPath();
        ctx.arc(195, 386, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#334155";
        ctx.beginPath();
        ctx.arc(195, 386, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    // --- Game State ---
    var sdState = {
        active: false,
        mode: "idle", // "idle" | "playing" | "levelclear" | "gameover"
        levelIdx: 0,
        score: 0,
        streak: 0,
        maxCombo: 0,
        timeLeft: 65,
        hintsLeft: 3,
        totalFound: 0,
        totalMisses: 0,
        levelMisses: 0,
        levelsCleared: 0,
        lastSpotTime: -10,
        activeDiffs: [], // array of { id, x, y, r, label, found }
        mutMap: {},
        effects: [],
        hintRing: null,
        elapsed: 0,
        lastTime: performance.now(),
        rafId: null,
        autoAdvanceTimer: null,
        popTimer: 0,
        gameId: 0,
        submitted: false,
        leaderboard: null
    };

    function playSpotSfx(streak) {
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
            window.McWutGames.audio.playSliceSound(0.18);
        } else if (typeof window.playSliceSound === "function") {
            window.playSliceSound(0.18);
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

    // --- Setup Level ---
    function loadLevel(levelIndex, resetRunStats) {
        if (sdState.autoAdvanceTimer) {
            clearTimeout(sdState.autoAdvanceTimer);
            sdState.autoAdvanceTimer = null;
        }
        sdState.levelIdx = Math.max(0, Math.min(LEVELS.length - 1, levelIndex));
        var cfg = LEVELS[sdState.levelIdx];

        if (resetRunStats) {
            sdState.gameId++;
            sdState.score = 0;
            sdState.streak = 0;
            sdState.maxCombo = 0;
            sdState.hintsLeft = 3;
            sdState.totalFound = 0;
            sdState.totalMisses = 0;
            sdState.levelsCleared = 0;
            sdState.submitted = false;
        }

        sdState.timeLeft = cfg.timeLimit;
        sdState.levelMisses = 0;
        sdState.lastSpotTime = -10;
        sdState.effects = [];
        sdState.hintRing = null;

        // Shuffle the 10 slots and pick diffCount active differences
        var pool = cfg.slots.slice();
        for (var i = pool.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = pool[i];
            pool[i] = pool[j];
            pool[j] = tmp;
        }
        sdState.activeDiffs = [];
        sdState.mutMap = {};
        for (var k = 0; k < cfg.diffCount; k++) {
            var slot = pool[k];
            sdState.mutMap[slot.id] = true;
            sdState.activeDiffs.push({
                id: slot.id,
                x: slot.x,
                y: slot.y,
                r: slot.r || HIT_RADIUS,
                label: slot.label,
                found: false
            });
        }
        updateHudDom();
    }

    function updateHudDom() {
        var cfg = LEVELS[sdState.levelIdx];
        if (levelNameEl) levelNameEl.textContent = "Lv " + cfg.level + ": " + cfg.name;
        if (levelPillsEl) {
            var pills = levelPillsEl.querySelectorAll("[data-sd-level]");
            for (var i = 0; i < pills.length; i++) {
                var lv = parseInt(pills[i].getAttribute("data-sd-level"), 10);
                pills[i].classList.toggle("is-active", lv === cfg.level);
                pills[i].classList.toggle("is-cleared", lv < cfg.level);
            }
        }
        var foundCount = 0;
        for (var j = 0; j < sdState.activeDiffs.length; j++) {
            if (sdState.activeDiffs[j].found) foundCount++;
        }
        if (diffFoundEl) diffFoundEl.textContent = String(foundCount);
        if (diffTotalEl) diffTotalEl.textContent = String(sdState.activeDiffs.length);

        if (pipsEl) {
            pipsEl.innerHTML = "";
            for (var p = 0; p < sdState.activeDiffs.length; p++) {
                var dot = document.createElement("span");
                dot.className = "sd-pip" + (sdState.activeDiffs[p].found ? " is-found" : "");
                pipsEl.appendChild(dot);
            }
        }

        var sec = Math.max(0, Math.ceil(sdState.timeLeft));
        var mins = Math.floor(sec / 60);
        var rem = sec % 60;
        if (timerValEl) timerValEl.textContent = mins + ":" + (rem < 10 ? "0" + rem : rem);
        if (streakValEl) streakValEl.textContent = "\u00D7" + Math.max(1, Math.min(6, sdState.streak));
        if (scoreValEl) scoreValEl.textContent = Math.round(sdState.score).toLocaleString();
        if (hintCountEl) hintCountEl.textContent = String(sdState.hintsLeft);
        if (hintBtn) hintBtn.disabled = sdState.hintsLeft <= 0 || sdState.mode !== "playing";
    }

    function showPopBanner(text) {
        if (!hudPopEl) return;
        hudPopEl.textContent = text;
        hudPopEl.hidden = false;
        sdState.popTimer = 1.15;
    }

    function sdStartGame(startLevelNum) {
        var idx = typeof startLevelNum === "number" ? Math.max(0, Math.min(LEVELS.length - 1, startLevelNum - 1)) : 0;
        loadLevel(idx, true);
        sdState.mode = "playing";
        if (startOverlay) startOverlay.hidden = true;
        if (levelOverlay) levelOverlay.hidden = true;
        if (overOverlay) overOverlay.hidden = true;
        if (overRecordBanner) overRecordBanner.hidden = true;
        if (hudPopEl) hudPopEl.hidden = true;
        updateHudDom();
        sdResume();
    }

    function completeCurrentLevel() {
        var cfg = LEVELS[sdState.levelIdx];
        var levelBonus = 400 * cfg.level;
        var timeBonus = Math.round(Math.max(0, sdState.timeLeft) * 12);
        var flawlessBonus = sdState.levelMisses === 0 ? 300 : 0;
        sdState.levelsCleared++;
        sdState.score = Math.min(MAX_SCORE, sdState.score + levelBonus + timeBonus + flawlessBonus);

        if (sdState.levelIdx >= LEVELS.length - 1) {
            sdState.score = Math.min(MAX_SCORE, sdState.score + 1500);
            finishGameOver(true);
            return;
        }

        if (cfg.level % 2 === 0) {
            sdState.hintsLeft = Math.min(4, sdState.hintsLeft + 1);
        }

        sdState.mode = "levelclear";
        playOverSfx(true);
        if (levelBadgeEl) levelBadgeEl.textContent = "LEVEL " + cfg.level + " VERIFIED!";
        if (levelTitleEl) levelTitleEl.textContent = cfg.name + " Complete!";
        if (levelBreakdownEl) {
            levelBreakdownEl.textContent =
                "+" + levelBonus.toLocaleString() + " clear · +" +
                timeBonus.toLocaleString() + " speed" +
                (flawlessBonus > 0 ? " · +300 FLAWLESS!" : "");
        }
        if (levelOverlay) levelOverlay.hidden = false;
        updateHudDom();

        sdState.autoAdvanceTimer = setTimeout(function () {
            if (sdState.mode === "levelclear") {
                advanceLevel();
            }
        }, 2000);
    }

    function advanceLevel() {
        if (sdState.autoAdvanceTimer) {
            clearTimeout(sdState.autoAdvanceTimer);
            sdState.autoAdvanceTimer = null;
        }
        if (sdState.levelIdx >= LEVELS.length - 1) {
            finishGameOver(true);
            return;
        }
        loadLevel(sdState.levelIdx + 1, false);
        sdState.mode = "playing";
        if (levelOverlay) levelOverlay.hidden = true;
        updateHudDom();
    }

    function finishGameOver(won) {
        if (sdState.autoAdvanceTimer) {
            clearTimeout(sdState.autoAdvanceTimer);
            sdState.autoAdvanceTimer = null;
        }
        sdState.mode = "gameover";
        if (levelOverlay) levelOverlay.hidden = true;
        playOverSfx(won);

        var finalScore = Math.max(0, Math.min(MAX_SCORE, Math.round(sdState.score)));
        var finalCombo = Math.max(0, Math.min(MAX_COMBO, Math.min(finalScore, sdState.maxCombo)));

        if (overBadge) overBadge.textContent = won ? "ALL 5 SCENES SOLVED!" : "TIME UP!";
        if (overTitle) overTitle.textContent = won ? "Master Detective!" : "Case Unsolved!";
        if (overBreakdown) {
            overBreakdown.textContent =
                sdState.levelsCleared + "/5 scenes cleared · " +
                sdState.totalFound + " diffs spotted · " +
                sdState.totalMisses + " misses";
        }
        if (overScore) overScore.textContent = finalScore.toLocaleString();
        if (overCombo) overCombo.textContent = "\u00D7" + finalCombo.toLocaleString();
        if (overBest) overBest.textContent = "\u2014";
        if (overRank) overRank.textContent = "\u2014";
        if (overSaveStatus) overSaveStatus.textContent = "Saving score\u2026";
        if (overOverlay) overOverlay.hidden = false;
        updateHudDom();

        submitSpotDiffScore(finalScore, finalCombo);
    }

    async function submitSpotDiffScore(finalScore, finalCombo) {
        if (sdState.submitted) return;
        sdState.submitted = true;
        var gid = sdState.gameId;

        try {
            var res = null;
            if (window.McWutGames && window.McWutGames.leaderboard && typeof window.McWutGames.leaderboard.submitScore === "function") {
                res = await window.McWutGames.leaderboard.submitScore(GAME_KEY, finalScore, finalCombo);
            } else if (typeof window.submitScore === "function") {
                res = await window.submitScore(GAME_KEY, finalScore, finalCombo);
            }
            if (!res || gid !== sdState.gameId) return;

            sdState.leaderboard = res.leaderboard;
            if (overBest) overBest.textContent = (res.bestScore || finalScore).toLocaleString();
            if (overRank) overRank.textContent = res.rank ? "#" + res.rank : "\u2014";
            if (overRecordBanner) overRecordBanner.hidden = !res.isNewBest;
            if (overSaveStatus) {
                overSaveStatus.textContent = res.isNewBest
                    ? "New personal record saved to the global leaderboard!"
                    : "Score recorded. Personal best: " + (res.bestScore || 0).toLocaleString() + ".";
            }
        } catch (err) {
            if (overSaveStatus && gid === sdState.gameId) {
                overSaveStatus.textContent = "Could not save score right now.";
            }
        }
    }

    // --- Dual Panel Layout & Coordinate Mapping ---
    function getPanelRects() {
        var cw = canvasEl.width || 1;
        var ch = canvasEl.height || 1;
        var cssW = canvasEl.clientWidth || cw;
        var dpr = cw / Math.max(1, cssW);
        var pad = 10 * dpr;
        var gap = 12 * dpr;
        var stacked = cssW < 680;

        var rects = [];
        if (stacked) {
            var availW = cw - pad * 2;
            var availH = (ch - pad * 2 - gap) * 0.5;
            var s = Math.min(availW / PANEL_W, availH / PANEL_H);
            var pw = PANEL_W * s;
            var ph = PANEL_H * s;
            var px = (cw - pw) * 0.5;
            var totalH = ph * 2 + gap;
            var topY = (ch - totalH) * 0.5;
            rects.push({ x: px, y: topY, w: pw, h: ph, scale: s, dpr: dpr, label: "ORIGINAL", mod: false });
            rects.push({ x: px, y: topY + ph + gap, w: pw, h: ph, scale: s, dpr: dpr, label: "MODIFIED", mod: true });
        } else {
            var availW2 = (cw - pad * 2 - gap) * 0.5;
            var availH2 = ch - pad * 2;
            var s2 = Math.min(availW2 / PANEL_W, availH2 / PANEL_H);
            var pw2 = PANEL_W * s2;
            var ph2 = PANEL_H * s2;
            var totalW = pw2 * 2 + gap;
            var leftX = (cw - totalW) * 0.5;
            var py = (ch - ph2) * 0.5;
            rects.push({ x: leftX, y: py, w: pw2, h: ph2, scale: s2, dpr: dpr, label: "ORIGINAL", mod: false });
            rects.push({ x: leftX + pw2 + gap, y: py, w: pw2, h: ph2, scale: s2, dpr: dpr, label: "MODIFIED", mod: true });
        }
        return rects;
    }

    function spotDifference(diff) {
        if (!diff || diff.found || sdState.mode !== "playing") return;
        diff.found = true;
        sdState.totalFound++;
        if (sdState.elapsed - sdState.lastSpotTime <= 8.0) {
            sdState.streak++;
        } else {
            sdState.streak = Math.max(1, sdState.streak + 1);
        }
        sdState.lastSpotTime = sdState.elapsed;
        if (sdState.streak > sdState.maxCombo) sdState.maxCombo = sdState.streak;

        var mult = Math.min(6, sdState.streak);
        var pts = 200 * mult;
        sdState.score = Math.min(MAX_SCORE, sdState.score + pts);
        if (sdState.hintRing && sdState.hintRing.id === diff.id) {
            sdState.hintRing = null;
        }

        playSpotSfx(sdState.streak);
        sdState.effects.push({
            kind: "spot",
            x: diff.x,
            y: diff.y,
            life: 1.0,
            text: "+" + pts
        });
        showPopBanner(diff.label.toUpperCase() + "! +" + pts);
        updateHudDom();

        var remaining = 0;
        for (var i = 0; i < sdState.activeDiffs.length; i++) {
            if (!sdState.activeDiffs[i].found) remaining++;
        }
        if (remaining === 0) {
            completeCurrentLevel();
        }
    }

    function handlePanelTap(clientX, clientY) {
        if (sdState.mode !== "playing" || !canvasEl) return;
        var rect = canvasEl.getBoundingClientRect();
        var dpr = canvasEl.width / Math.max(1, rect.width);
        var cx = (clientX - rect.left) * dpr;
        var cy = (clientY - rect.top) * dpr;
        var panels = getPanelRects();

        var tappedScene = null;
        for (var p = 0; p < panels.length; p++) {
            var pr = panels[p];
            if (cx >= pr.x && cx <= pr.x + pr.w && cy >= pr.y && cy <= pr.y + pr.h) {
                tappedScene = {
                    sx: (cx - pr.x) / pr.scale,
                    sy: (cy - pr.y) / pr.scale
                };
                break;
            }
        }
        if (!tappedScene) return;

        var best = null;
        var bestDist = Infinity;
        for (var i = 0; i < sdState.activeDiffs.length; i++) {
            var d = sdState.activeDiffs[i];
            if (d.found) continue;
            var dx = tappedScene.sx - d.x;
            var dy = tappedScene.sy - d.y;
            var dist2 = dx * dx + dy * dy;
            var rad = d.r || HIT_RADIUS;
            if (dist2 <= rad * rad && dist2 < bestDist) {
                bestDist = dist2;
                best = d;
            }
        }

        if (best) {
            spotDifference(best);
            return;
        }

        // Mistake penalty
        sdState.streak = 0;
        sdState.totalMisses++;
        sdState.levelMisses++;
        sdState.score = Math.max(0, sdState.score - 75);
        sdState.timeLeft = Math.max(0, sdState.timeLeft - 4);
        playMissSfx();
        sdState.effects.push({
            kind: "miss",
            x: tappedScene.sx,
            y: tappedScene.sy,
            life: 1.0,
            text: "-4s"
        });
        showPopBanner("NO DIFFERENCE! -4s");
        updateHudDom();
        if (sdState.timeLeft <= 0) {
            finishGameOver(false);
        }
    }

    function useDetectorHint() {
        if (sdState.mode !== "playing" || sdState.hintsLeft <= 0) return;
        var target = null;
        for (var i = 0; i < sdState.activeDiffs.length; i++) {
            if (!sdState.activeDiffs[i].found) {
                target = sdState.activeDiffs[i];
                break;
            }
        }
        if (!target) return;

        sdState.hintsLeft--;
        sdState.score = Math.max(0, sdState.score - 150);
        sdState.hintRing = { id: target.id, x: target.x, y: target.y, timer: 4.5 };
        playSpotSfx(2);
        showPopBanner("CLUE: " + target.label.toUpperCase());
        updateHudDom();
    }

    function spotNextDiff() {
        for (var i = 0; i < sdState.activeDiffs.length; i++) {
            if (!sdState.activeDiffs[i].found) {
                spotDifference(sdState.activeDiffs[i]);
                return sdState.activeDiffs[i];
            }
        }
        return null;
    }

    // --- Render Dual Panels ---
    function render() {
        if (!canvasEl) return;
        var ctx = canvasEl.getContext("2d");
        if (!ctx) return;
        var cw = canvasEl.width;
        var ch = canvasEl.height;
        ctx.clearRect(0, 0, cw, ch);
        ctx.fillStyle = "#090d16";
        ctx.fillRect(0, 0, cw, ch);

        var cfg = LEVELS[sdState.levelIdx];
        var panels = getPanelRects();

        for (var p = 0; p < panels.length; p++) {
            var pr = panels[p];
            ctx.save();
            ctx.beginPath();
            ctx.roundRect(pr.x, pr.y, pr.w, pr.h, 12);
            ctx.clip();

            ctx.save();
            ctx.translate(pr.x, pr.y);
            ctx.scale(pr.scale, pr.scale);
            cfg.drawScene(ctx, pr.mod ? sdState.mutMap : null, sdState.elapsed);

            // Found emerald check rings on BOTH panels
            for (var i = 0; i < sdState.activeDiffs.length; i++) {
                var d = sdState.activeDiffs[i];
                if (!d.found) continue;
                ctx.strokeStyle = "#34d399";
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(d.x, d.y, 26, 0, Math.PI * 2);
                ctx.stroke();

                ctx.fillStyle = "#10b981";
                ctx.beginPath();
                ctx.arc(d.x + 19, d.y - 19, 10, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = "#ffffff";
                ctx.font = "900 13px sans-serif";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText("\u2713", d.x + 19, d.y - 18.5);
            }

            // Hint pulse ring on BOTH panels
            if (sdState.hintRing && sdState.hintRing.timer > 0) {
                var pulse = 30 + Math.sin(sdState.elapsed * 7) * 6;
                ctx.strokeStyle = "#facc15";
                ctx.lineWidth = 4;
                ctx.setLineDash([8, 5]);
                ctx.beginPath();
                ctx.arc(sdState.hintRing.x, sdState.hintRing.y, pulse, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            // Transient spot / miss animations on BOTH panels
            for (var e = 0; e < sdState.effects.length; e++) {
                var ef = sdState.effects[e];
                ctx.save();
                ctx.globalAlpha = Math.max(0, ef.life);
                if (ef.kind === "spot") {
                    ctx.strokeStyle = "#6ee7b7";
                    ctx.lineWidth = 4;
                    ctx.beginPath();
                    ctx.arc(ef.x, ef.y, 24 + (1 - ef.life) * 28, 0, Math.PI * 2);
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
                ctx.font = "900 17px sans-serif";
                ctx.textAlign = "center";
                ctx.fillText(ef.text, ef.x, ef.y - 26 - (1 - ef.life) * 18);
                ctx.restore();
            }

            ctx.restore();
            ctx.restore();

            // Panel Border + Badge Tag ("ORIGINAL" vs "MODIFIED")
            var pDpr = pr.dpr || 1;
            ctx.save();
            ctx.strokeStyle = pr.mod ? "rgba(236, 72, 153, 0.72)" : "rgba(56, 189, 248, 0.72)";
            ctx.lineWidth = 2.5 * pDpr;
            ctx.beginPath();
            ctx.roundRect(pr.x, pr.y, pr.w, pr.h, 12 * pDpr);
            ctx.stroke();

            var tagPad = 8 * pDpr;
            var tagW = 82 * pDpr;
            var tagH = 20 * pDpr;
            ctx.fillStyle = pr.mod ? "rgba(190, 24, 93, 0.88)" : "rgba(3, 105, 161, 0.88)";
            ctx.beginPath();
            ctx.roundRect(pr.x + tagPad, pr.y + tagPad, tagW, tagH, 999);
            ctx.fill();
            ctx.fillStyle = "#ffffff";
            ctx.font = "800 " + Math.round(11 * pDpr) + "px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(pr.label, pr.x + tagPad + tagW * 0.5, pr.y + tagPad + tagH * 0.5);
            ctx.restore();
        }
    }

    function step(now) {
        if (!sdState.active) {
            sdState.rafId = null;
            return;
        }
        var dt = Math.min((now - sdState.lastTime) / 1000, 0.1);
        sdState.lastTime = now;
        sdState.elapsed += dt;

        if (sdState.popTimer > 0) {
            sdState.popTimer -= dt;
            if (sdState.popTimer <= 0 && hudPopEl) hudPopEl.hidden = true;
        }

        if (sdState.mode === "playing") {
            if (sdState.hintRing) {
                sdState.hintRing.timer -= dt;
                if (sdState.hintRing.timer <= 0) sdState.hintRing = null;
            }
            var prevSec = Math.ceil(sdState.timeLeft);
            sdState.timeLeft = Math.max(0, sdState.timeLeft - dt);
            if (Math.ceil(sdState.timeLeft) !== prevSec) {
                updateHudDom();
            }
            if (sdState.timeLeft <= 0) {
                finishGameOver(false);
            }
        }

        for (var i = sdState.effects.length - 1; i >= 0; i--) {
            sdState.effects[i].life -= dt * 1.5;
            if (sdState.effects[i].life <= 0) {
                sdState.effects.splice(i, 1);
            }
        }

        render();
        sdState.rafId = requestAnimationFrame(step);
    }

    // --- Lifecycle & Resize ---
    function sdResize() {
        if (!viewportEl || !canvasEl) return;
        var w = viewportEl.clientWidth || 640;
        var h = viewportEl.clientHeight || 480;
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvasEl.width = Math.max(1, Math.floor(w * dpr));
        canvasEl.height = Math.max(1, Math.floor(h * dpr));
        render();
    }

    function sdPause() {
        sdState.active = false;
        if (sdState.rafId) {
            cancelAnimationFrame(sdState.rafId);
            sdState.rafId = null;
        }
        if (sdState.autoAdvanceTimer) {
            clearTimeout(sdState.autoAdvanceTimer);
            sdState.autoAdvanceTimer = null;
        }
    }

    function sdResume() {
        sdState.active = true;
        sdState.lastTime = performance.now();
        sdResize();
        if (!sdState.rafId) {
            sdState.rafId = requestAnimationFrame(step);
        }
    }

    function sdHandleKey(ev) {
        if (ev.key === "r" || ev.key === "R") {
            ev.preventDefault();
            sdStartGame();
            return true;
        }
        if (ev.key === "h" || ev.key === "H") {
            ev.preventDefault();
            useDetectorHint();
            return true;
        }
        if (ev.code === "Space" || ev.key === "Enter") {
            if (sdState.mode === "idle" || sdState.mode === "gameover") {
                ev.preventDefault();
                sdStartGame();
                return true;
            }
            if (sdState.mode === "levelclear") {
                ev.preventDefault();
                advanceLevel();
                return true;
            }
        }
        return false;
    }

    // --- Event Wiring ---
    if (startBtn) startBtn.addEventListener("click", function () { sdStartGame(); });
    if (againBtn) againBtn.addEventListener("click", function () { sdStartGame(); });
    if (nextLevelBtn) nextLevelBtn.addEventListener("click", function () { advanceLevel(); });
    if (hintBtn) hintBtn.addEventListener("click", useDetectorHint);

    if (levelPillsEl) {
        levelPillsEl.addEventListener("click", function (ev) {
            var btn = ev.target.closest("[data-sd-level]");
            if (!btn) return;
            var lv = parseInt(btn.getAttribute("data-sd-level"), 10);
            if (lv >= 1 && lv <= LEVELS.length) {
                sdStartGame(lv);
            }
        });
    }

    if (canvasEl) {
        canvasEl.addEventListener("pointerdown", function (ev) {
            if (sdState.mode === "idle") {
                sdStartGame();
                return;
            }
            if (sdState.mode !== "playing") return;
            handlePanelTap(ev.clientX, ev.clientY);
        });
    }

    window.addEventListener("resize", sdResize);
    if (window.ResizeObserver && viewportEl) {
        try {
            new ResizeObserver(sdResize).observe(viewportEl);
        } catch (e) {}
    }

    loadLevel(0, true);

    window.McWutGames.spotDiff = {
        state: sdState,
        sdStartGame: sdStartGame,
        sdPause: sdPause,
        sdResume: sdResume,
        sdResize: sdResize,
        sdHandleKey: sdHandleKey,
        advanceLevel: advanceLevel,
        spotNextDiff: spotNextDiff,
        useDetectorHint: useDetectorHint,
        setMuted: function (m) { muted = !!m; }
    };

    window.sdState = sdState;
    window.sdStartGame = sdStartGame;
    window.sdPause = sdPause;
    window.sdResume = sdResume;
    window.sdResize = sdResize;
    window.sdHandleKey = sdHandleKey;
})();
