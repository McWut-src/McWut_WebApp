(function () {
    "use strict";

    window.McWutGames = window.McWutGames || {};

    // =========================================================================
    // --- 2048 Neon (Reactive 4×4 Grid Puzzle) ---
    // =========================================================================
    var n2048Stage = document.getElementById("neon2048-stage");
    var n2048Board = document.getElementById("n2048-board");
    var n2048ScoreEl = document.getElementById("n2048-score");
    var n2048MaxTileEl = document.getElementById("n2048-max-tile");
    var n2048MovesEl = document.getElementById("n2048-moves");
    var n2048UndoBtn = document.getElementById("n2048-undo-btn");
    var n2048ResetBtn = document.getElementById("n2048-reset-btn");
    var n2048StartOverlay = document.getElementById("n2048-start-overlay");
    var n2048WinOverlay = document.getElementById("n2048-win-overlay");
    var n2048OverOverlay = document.getElementById("n2048-over-overlay");
    var n2048StartBtn = document.getElementById("n2048-start-btn");
    var n2048AgainBtn = document.getElementById("n2048-again-btn");
    var n2048WinAgainBtn = document.getElementById("n2048-win-again-btn");
    var n2048KeepGoingBtn = document.getElementById("n2048-keep-going-btn");
    var n2048WinScore = document.getElementById("n2048-win-score");
    var n2048WinTile = document.getElementById("n2048-win-tile");
    var n2048WinBest = document.getElementById("n2048-win-best");
    var n2048WinRank = document.getElementById("n2048-win-rank");
    var n2048OverScore = document.getElementById("n2048-over-score");
    var n2048OverTile = document.getElementById("n2048-over-tile");
    var n2048OverBest = document.getElementById("n2048-over-best");
    var n2048OverRank = document.getElementById("n2048-over-rank");
    var n2048RecordBanner = document.getElementById("n2048-record-banner");
    var n2048WinRecordBanner = document.getElementById("n2048-win-record-banner");
    var n2048SaveStatus = document.getElementById("n2048-save-status");

    var n2048State = {
        active: false,
        mode: "idle",
        grid: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        undoGrid: null,
        undoScore: 0,
        score: 0,
        moves: 0,
        maxTile: 2,
        combo: 0,
        maxCombo: 0,
        hasWon2048: false,
        submitted: false,
        gameId: 0,
        popIndices: [],
        leaderboard: null
    };

    function play2048Merge(val) {
        var ctx = ensureAudio();
        if (!ctx) return;
        try {
            var noteMap = {
                4: 261.63, 8: 293.66, 16: 329.63, 32: 392.00,
                64: 440.00, 128: 523.25, 256: 659.25, 512: 783.99,
                1024: 1046.50, 2048: 1318.51
            };
            var freq = noteMap[val] || 1318.51;
            var now = ctx.currentTime;
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.type = val >= 256 ? "triangle" : "sine";
            osc.frequency.setValueAtTime(freq, now);
            osc.frequency.exponentialRampToValueAtTime(freq * 1.01, now + 0.16);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.22);

            if (val >= 128) {
                var osc2 = ctx.createOscillator();
                var gain2 = ctx.createGain();
                osc2.type = "sine";
                osc2.frequency.setValueAtTime(freq * 1.5, now + 0.04);
                gain2.gain.setValueAtTime(0.06, now + 0.04);
                gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
                osc2.connect(gain2);
                gain2.connect(ctx.destination);
                osc2.start(now + 0.04);
                osc2.stop(now + 0.28);
            }
        } catch (e) {}
    }

    function play2048Slide() {
        var ctx = ensureAudio();
        if (!ctx) return;
        try {
            var now = ctx.currentTime;
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(180, now);
            osc.frequency.exponentialRampToValueAtTime(110, now + 0.08);
            gain.gain.setValueAtTime(0.04, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.08);
        } catch (e) {}
    }

    function play2048Invalid() {
        var ctx = ensureAudio();
        if (!ctx) return;
        try {
            var now = ctx.currentTime;
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.type = "triangle";
            osc.frequency.setValueAtTime(95, now);
            gain.gain.setValueAtTime(0.06, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.09);
        } catch (e) {}
    }

    function play2048GameOver() {
        var ctx = ensureAudio();
        if (!ctx) return;
        try {
            var now = ctx.currentTime;
            var notes = [293.66, 261.63, 220.00, 164.81];
            notes.forEach(function (freq, i) {
                var osc = ctx.createOscillator();
                var gain = ctx.createGain();
                osc.type = "sawtooth";
                var t = now + i * 0.1;
                osc.frequency.setValueAtTime(freq, t);
                gain.gain.setValueAtTime(0.06, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(t);
                osc.stop(t + 0.22);
            });
        } catch (e) {}
    }

    function n2048SpawnTile() {
        var empties = [];
        for (var i = 0; i < 16; i++) {
            if (n2048State.grid[i] === 0) empties.push(i);
        }
        if (empties.length === 0) return -1;
        var pick = empties[Math.floor(Math.random() * empties.length)];
        n2048State.grid[pick] = Math.random() < 0.9 ? 2 : 4;
        return pick;
    }

    function n2048IsGameOver() {
        for (var i = 0; i < 16; i++) {
            if (n2048State.grid[i] === 0) return false;
        }
        for (var r = 0; r < 4; r++) {
            for (var c = 0; c < 4; c++) {
                var val = n2048State.grid[r * 4 + c];
                if (c < 3 && val === n2048State.grid[r * 4 + c + 1]) return false;
                if (r < 3 && val === n2048State.grid[(r + 1) * 4 + c]) return false;
            }
        }
        return true;
    }

    function n2048RenderBoard() {
        if (!n2048Board) return;
        n2048Board.innerHTML = "";
        for (var i = 0; i < 16; i++) {
            var val = n2048State.grid[i];
            var cell = document.createElement("div");
            cell.className = "n2048-cell";
            if (val > 0) {
                var tileCls = val <= 2048 ? "tile-" + val : "tile-super";
                cell.classList.add(tileCls);
                cell.textContent = String(val);
                if (n2048State.popIndices && n2048State.popIndices.indexOf(i) !== -1) {
                    cell.classList.add("is-pop");
                }
            }
            n2048Board.appendChild(cell);
        }
        n2048State.popIndices = [];

        if (n2048ScoreEl) n2048ScoreEl.textContent = String(n2048State.score);
        if (n2048MaxTileEl) n2048MaxTileEl.textContent = String(n2048State.maxTile);
        if (n2048MovesEl) n2048MovesEl.textContent = String(n2048State.moves);
    }

    function n2048StartGame() {
        n2048State.mode = "playing";
        n2048State.gameId++;
        n2048State.submitted = false;
        n2048State.grid = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        n2048State.undoGrid = null;
        n2048State.undoScore = 0;
        n2048State.score = 0;
        n2048State.moves = 0;
        n2048State.maxTile = 2;
        n2048State.combo = 0;
        n2048State.maxCombo = 0;
        n2048State.hasWon2048 = false;

        if (n2048UndoBtn) n2048UndoBtn.disabled = true;
        if (n2048StartOverlay) n2048StartOverlay.hidden = true;
        if (n2048WinOverlay) n2048WinOverlay.hidden = true;
        if (n2048OverOverlay) n2048OverOverlay.hidden = true;
        if (n2048RecordBanner) n2048RecordBanner.hidden = true;
        if (n2048WinRecordBanner) n2048WinRecordBanner.hidden = true;

        n2048SpawnTile();
        n2048SpawnTile();
        n2048RenderBoard();
    }

    function n2048TriggerWin() {
        playNewRecordFanfare();
        if (n2048WinScore) n2048WinScore.textContent = String(n2048State.score);
        if (n2048WinTile) n2048WinTile.textContent = String(n2048State.maxTile);
        var prevBest = n2048State.leaderboard && n2048State.leaderboard.myRecord ? n2048State.leaderboard.myRecord.bestScore : 0;
        if (n2048WinBest) n2048WinBest.textContent = String(Math.max(prevBest, n2048State.score));
        if (n2048WinRank) {
            var curRank = n2048State.leaderboard && n2048State.leaderboard.myRecord ? "#" + n2048State.leaderboard.myRecord.rank : "—";
            n2048WinRank.textContent = curRank;
        }
        if (n2048WinRecordBanner) {
            n2048WinRecordBanner.hidden = !(n2048State.score > prevBest && n2048State.score > 0);
        }
        if (n2048WinOverlay) n2048WinOverlay.hidden = false;
        n2048SubmitScore();
    }

    function n2048TriggerGameOver() {
        if (n2048State.mode === "gameover") return;
        n2048State.mode = "gameover";
        play2048GameOver();

        if (n2048OverScore) n2048OverScore.textContent = String(n2048State.score);
        if (n2048OverTile) n2048OverTile.textContent = String(n2048State.maxTile);

        var prevBest = n2048State.leaderboard && n2048State.leaderboard.myRecord ? n2048State.leaderboard.myRecord.bestScore : 0;
        var optBest = Math.max(prevBest, n2048State.score);
        if (n2048OverBest) n2048OverBest.textContent = String(optBest);
        if (n2048OverRank) {
            var curRank = n2048State.leaderboard && n2048State.leaderboard.myRecord ? "#" + n2048State.leaderboard.myRecord.rank : "—";
            n2048OverRank.textContent = curRank;
        }
        if (n2048RecordBanner) {
            n2048RecordBanner.hidden = !(n2048State.score > prevBest && n2048State.score > 0);
        }
        if (n2048SaveStatus) {
            n2048SaveStatus.textContent = n2048State.score > 0 ? "Saving score to global leaderboard…" : "Play again to post a score!";
        }
        if (n2048OverOverlay) {
            n2048OverOverlay.hidden = false;
        }

        n2048SubmitScore();
    }

    function n2048Undo() {
        if (!n2048State.undoGrid || n2048State.mode !== "playing") return;
        n2048State.grid = n2048State.undoGrid.slice();
        n2048State.score = n2048State.undoScore;
        n2048State.undoGrid = null;
        if (n2048UndoBtn) n2048UndoBtn.disabled = true;
        n2048RenderBoard();
    }

    function n2048Slide(dir) {
        if (n2048State.mode !== "playing") return false;
        var moved = false;
        var scoreGained = 0;
        var mergedAny = false;
        var newGrid = n2048State.grid.slice();
        var mergedIndices = [];

        function processLine(indices) {
            var line = indices.map(function (idx) { return newGrid[idx]; });
            var filtered = line.filter(function (v) { return v !== 0; });
            var merged = [];
            var skip = false;
            for (var i = 0; i < filtered.length; i++) {
                if (skip) {
                    skip = false;
                    continue;
                }
                if (i < filtered.length - 1 && filtered[i] === filtered[i + 1]) {
                    var val = filtered[i] * 2;
                    merged.push(val);
                    scoreGained += val;
                    mergedAny = true;
                    skip = true;
                } else {
                    merged.push(filtered[i]);
                }
            }
            while (merged.length < 4) {
                merged.push(0);
            }
            for (var j = 0; j < 4; j++) {
                var oldVal = newGrid[indices[j]];
                var newVal = merged[j];
                if (oldVal !== newVal) {
                    moved = true;
                }
                newGrid[indices[j]] = newVal;
                if (newVal > oldVal && oldVal !== 0) {
                    mergedIndices.push(indices[j]);
                }
            }
        }

        if (dir === "left") {
            for (var r = 0; r < 4; r++) processLine([r * 4, r * 4 + 1, r * 4 + 2, r * 4 + 3]);
        } else if (dir === "right") {
            for (var r = 0; r < 4; r++) processLine([r * 4 + 3, r * 4 + 2, r * 4 + 1, r * 4]);
        } else if (dir === "up") {
            for (var c = 0; c < 4; c++) processLine([c, c + 4, c + 8, c + 12]);
        } else if (dir === "down") {
            for (var c = 0; c < 4; c++) processLine([c + 12, c + 8, c + 4, c]);
        }

        if (!moved) {
            play2048Invalid();
            return false;
        }

        n2048State.undoGrid = n2048State.grid.slice();
        n2048State.undoScore = n2048State.score;
        if (n2048UndoBtn) n2048UndoBtn.disabled = false;

        n2048State.grid = newGrid;
        n2048State.score = Math.min(1000000, n2048State.score + scoreGained);
        n2048State.moves++;

        if (mergedAny) {
            n2048State.combo++;
            n2048State.maxCombo = Math.max(n2048State.maxCombo, n2048State.combo);
            var maxVal = 4;
            for (var m = 0; m < mergedIndices.length; m++) {
                if (newGrid[mergedIndices[m]] > maxVal) {
                    maxVal = newGrid[mergedIndices[m]];
                }
            }
            play2048Merge(maxVal);
        } else {
            n2048State.combo = 0;
            play2048Slide();
        }

        var spawnedIdx = n2048SpawnTile();
        n2048State.popIndices = mergedIndices.concat(spawnedIdx >= 0 ? [spawnedIdx] : []);

        var curMax = 2;
        for (var k = 0; k < 16; k++) {
            if (n2048State.grid[k] > curMax) curMax = n2048State.grid[k];
        }
        n2048State.maxTile = Math.max(n2048State.maxTile, curMax);

        if (n2048State.maxTile >= 2048 && !n2048State.hasWon2048) {
            n2048State.hasWon2048 = true;
            n2048TriggerWin();
        }

        if (n2048IsGameOver()) {
            n2048TriggerGameOver();
        }

        n2048RenderBoard();
        return true;
    }

    async function n2048SubmitScore() {
        if (n2048State.submitted) return;
        n2048State.submitted = true;
        var gameId = n2048State.gameId;
        var score = Math.max(0, Math.min(1000000, Math.round(n2048State.score)));
        var combo = Math.max(0, Math.min(score, Math.round(n2048State.maxTile)));

        try {
            var res = await window.mcwut.api("/api/games/merge-2048/scores", {
                method: "POST",
                headers: window.mcwut.headers({ "Content-Type": "application/json" }),
                body: JSON.stringify({ score: score, maxCombo: combo })
            });
            if (!res) return;
            n2048State.leaderboard = res.leaderboard;
            if (GAME_KEY === "merge-2048") {
                renderLeaderboard(res.leaderboard);
            }
            if (gameId !== n2048State.gameId) return;
            if (n2048OverRank) {
                n2048OverRank.textContent = res.rank ? "#" + res.rank : "—";
            }
            if (n2048RecordBanner) {
                n2048RecordBanner.hidden = !res.isNewBest;
            }
            if (n2048WinRecordBanner) {
                n2048WinRecordBanner.hidden = !res.isNewBest;
            }
            if (res.isNewBest) {
                playNewRecordFanfare();
            }
            if (n2048SaveStatus) {
                n2048SaveStatus.textContent = res.isNewBest
                    ? "New personal record saved to the global leaderboard!"
                    : "Score recorded. Personal best: " + res.bestScore + ".";
            }
        } catch (err) {
            if (n2048SaveStatus && gameId === n2048State.gameId) {
                n2048SaveStatus.textContent = "Could not save score: " + (err.message || "Network error");
            }
        }
    }

    if (n2048StartBtn) {
        n2048StartBtn.addEventListener("click", function (ev) {
            ev.stopPropagation();
            n2048StartGame();
        });
    }
    if (n2048AgainBtn) {
        n2048AgainBtn.addEventListener("click", function (ev) {
            ev.stopPropagation();
            n2048StartGame();
        });
    }
    if (n2048WinAgainBtn) {
        n2048WinAgainBtn.addEventListener("click", function (ev) {
            ev.stopPropagation();
            n2048StartGame();
        });
    }
    if (n2048KeepGoingBtn) {
        n2048KeepGoingBtn.addEventListener("click", function (ev) {
            ev.stopPropagation();
            if (n2048WinOverlay) n2048WinOverlay.hidden = true;
            n2048State.mode = "playing";
        });
    }
    if (n2048UndoBtn) {
        n2048UndoBtn.addEventListener("click", function () {
            n2048Undo();
        });
    }
    if (n2048ResetBtn) {
        n2048ResetBtn.addEventListener("click", function () {
            n2048StartGame();
        });
    }

    if (n2048Board) {
        var touchStartX = 0;
        var touchStartY = 0;
        n2048Board.addEventListener("touchstart", function (ev) {
            if (ev.touches && ev.touches.length === 1) {
                touchStartX = ev.touches[0].clientX;
                touchStartY = ev.touches[0].clientY;
            }
        }, { passive: true });

        n2048Board.addEventListener("touchend", function (ev) {
            if (!ev.changedTouches || ev.changedTouches.length === 0) return;
            var dx = ev.changedTouches[0].clientX - touchStartX;
            var dy = ev.changedTouches[0].clientY - touchStartY;
            var absX = Math.abs(dx);
            var absY = Math.abs(dy);
            if (Math.max(absX, absY) > 28) {
                if (absX > absY) {
                    n2048Slide(dx > 0 ? "right" : "left");
                } else {
                    n2048Slide(dy > 0 ? "down" : "up");
                }
            }
        }, { passive: true });
    }

    if (n2048Stage) {
        n2048Stage.addEventListener("click", function (ev) {
            var btn = ev.target.closest(".n2048-dpad-btn");
            if (btn) {
                var dir = btn.getAttribute("data-dir");
                if (dir) {
                    n2048Slide(dir);
                }
            }
        });
    }


    window.McWutGames.merge2048 = {
        state: n2048State,
        n2048StartGame: n2048StartGame,
        n2048Slide: n2048Slide,
        n2048Undo: n2048Undo,
        n2048RenderBoard: n2048RenderBoard
    };
    window.n2048State = n2048State;
    window.n2048StartGame = n2048StartGame;
    window.n2048Slide = n2048Slide;
    window.n2048Undo = n2048Undo;
    window.n2048RenderBoard = n2048RenderBoard;
})();
