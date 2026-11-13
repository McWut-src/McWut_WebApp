(function () {
    "use strict";

    window.McWutGames = window.McWutGames || {};

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
        msState.score = Math.min(1000000, msState.score + gained);

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
        msState.score = Math.min(1000000, msState.score + d.winBonus + timeBonus);

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
        var score = Math.max(0, Math.min(1000000, Math.round(msState.score)));
        var combo = Math.max(0, Math.min(100000, Math.round(msState.bestCascade)));

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
            slopePause();
        } else {
            if (msState.active) {
                msResumeClock();
            }
            if (slopeState.active && slopeState.mode === "playing") {
                slopeResume();
            }
        }
    });
    requestAnimationFrame(msLoop);



    window.McWutGames.minesweeper = {
        state: msState,
        msNewGame: msNewGame,
        msPauseClock: msPauseClock,
        msResumeClock: msResumeClock,
        msResize: msResize,
        msToggleFlagMode: msToggleFlagMode,
        msSetDifficulty: msSetDifficulty
    };
    window.msState = msState;
    window.msNewGame = msNewGame;
    window.msPauseClock = msPauseClock;
    window.msResumeClock = msResumeClock;
    window.msResize = msResize;
    window.msToggleFlagMode = msToggleFlagMode;
    window.msSetDifficulty = msSetDifficulty;
})();
