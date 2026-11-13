(function () {
    "use strict";

    window.McWutGames = window.McWutGames || {};

    var myBestEl = document.getElementById("game-my-best");
    var myRankEl = document.getElementById("game-my-rank");
    var boardSummary = document.getElementById("board-summary");
    var boardAlert = document.getElementById("board-alert");
    var boardList = document.getElementById("board-list");
    var hubHallSummary = document.getElementById("hub-hall-summary");
    var hubHallPlayBtn = document.getElementById("hub-hall-play-btn");
    var hubHallList = document.getElementById("hub-hall-list");
    var hubHallKey = "stack-3d";

    async function loadLeaderboard(targetKey) {
        if (boardAlert) boardAlert.hidden = true;
        var curKey = targetKey || (window.McWutGames && window.McWutGames.activeGameKey) || (typeof GAME_KEY !== "undefined" ? GAME_KEY : "stack-3d");
        try {
            var board = await window.mcwut.api("/api/games/" + encodeURIComponent(curKey) + "/leaderboard", {
                headers: window.mcwut.headers()
            });
            if (window.stackState) window.stackState.leaderboard = board;
            if (typeof msState !== "undefined") msState.leaderboard = board;
            if (typeof slopeState !== "undefined") slopeState.leaderboard = board;
            if (typeof n2048State !== "undefined") n2048State.leaderboard = board;
            if (typeof cbState !== "undefined") cbState.leaderboard = board;
            if (typeof hxState !== "undefined") hxState.leaderboard = board;
            if (typeof wwState !== "undefined") wwState.leaderboard = board;
            if (typeof gzState !== "undefined") gzState.leaderboard = board;

            renderLeaderboard(board, curKey);
            if (window.McWutGames.stack3d && window.McWutGames.stack3d.updateTargetHud) {
                window.McWutGames.stack3d.updateTargetHud();
            }
            return board;
        } catch (err) {
            if (boardAlert) {
                boardAlert.textContent = err.message || "Could not load leaderboard.";
                boardAlert.hidden = false;
            }
        }
    }

    async function submitScore(a, b, c) {
        var curKey, score, maxCombo;
        if (typeof c !== "undefined") {
            curKey = a;
            score = b;
            maxCombo = c;
        } else {
            curKey = (window.McWutGames && window.McWutGames.activeGameKey) || (typeof GAME_KEY !== "undefined" ? GAME_KEY : "stack-3d");
            score = a;
            maxCombo = b;
        }
        try {
            var res = await window.mcwut.api("/api/games/" + encodeURIComponent(curKey) + "/scores", {
                method: "POST",
                headers: window.mcwut.headers({ "Content-Type": "application/json" }),
                body: JSON.stringify({ score: score, maxCombo: maxCombo })
            });

            if (!res) return;
            renderLeaderboard(res.leaderboard, curKey);

            if (res.isNewBest) {
                if (window.playNewRecordFanfare) {
                    window.playNewRecordFanfare();
                } else if (window.McWutGames.audio && window.McWutGames.audio.playNewRecordFanfare) {
                    window.McWutGames.audio.playNewRecordFanfare();
                }
                if (window.mcwut && window.mcwut.toast) {
                    window.mcwut.toast("New personal record: " + res.bestScore.toLocaleString() + " pts! 🏆", { kind: "ok" });
                }
            }
            var bestValEl = document.querySelector('[data-best-for="' + curKey + '"] .best-val');
            if (bestValEl && res.bestScore > 0) {
                bestValEl.textContent = res.bestScore.toLocaleString();
            }
            return res;
        } catch (err) {
            console.error("Could not save score:", err);
            throw err;
        }
    }

    function formatShortDate(iso) {
        if (!iso) return "";
        try {
            var d = new Date(iso);
            var now = new Date();
            if (d.toDateString() === now.toDateString()) {
                return "Today";
            }
            return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
        } catch (e) {
            return "";
        }
    }

    var GAME_DEFS = {
        "stack-3d": { name: "Stack 3D", comboLabel: "streak", available: true },
        "mini-crossword": { name: "Mini Crossword", comboLabel: "clean words", available: true },
        "minesweeper": { name: "Minesweeper", comboLabel: "cascade", available: true },
        "neon-slope": { name: "Neon Slope", comboLabel: "streak", available: true },
        "merge-2048": { name: "2048 Neon", comboLabel: "tile", available: true },
        "wacky-wheels": { name: "Wacky Wheels", comboLabel: "flips", available: true },
        "brick-breaker": { name: "Cyber Breakout", comboLabel: "combo", available: true },
        "hextris": { name: "Hextris Neon", comboLabel: "cascade", available: true },
        "meme-merge": { name: "Meme Merge", comboLabel: "combo", available: true },
        "godzilla-rampage": { name: "Godzilla Rampage", comboLabel: "rampage", available: true }
    };

    function getGameDisplayName(key) {
        return (GAME_DEFS[key] && GAME_DEFS[key].name) || "Stack 3D";
    }

    function buildLeaderboardHtml(board, gameKey) {
        if (!board) return "";
        var entries = board.entries || [];
        if (entries.length === 0) {
            var emptyGameTitle = getGameDisplayName(gameKey);
            return (
                '<div class="game-board-empty">' +
                '<p class="mb-1 fw-semibold">No scores yet!</p>' +
                '<p class="small text-muted mb-0">Play a round of ' + emptyGameTitle + ' to claim the #1 global spot.</p>' +
                '</div>'
            );
        }

        var esc = window.mcwut.esc;
        var html = "";
        for (var i = 0; i < entries.length; i++) {
            var e = entries[i];
            var rankCls = e.rank === 1 ? "is-gold" : e.rank === 2 ? "is-silver" : e.rank === 3 ? "is-bronze" : "";
            var rowCls = "game-board-row" + (e.isMe ? " is-me" : "");
            var color = window.mcwut.safeColor(e.accentColor);
            var ink = window.mcwut.pillInk(color);

            var badgeHtml = e.badgeUrl
                ? '<img class="game-board-badge" src="' + esc(e.badgeUrl) + '" alt="" aria-hidden="true" />'
                : "";

            var statusHtml = e.statusTag
                ? '<span class="game-board-tag">' + esc(e.statusTag) + '</span>'
                : "";

            var youHtml = e.isMe
                ? '<span class="game-board-you">You</span>'
                : "";

            var def = GAME_DEFS[gameKey] || {};
            var comboLabel = def.comboLabel || "streak";
            var comboHtml = e.bestCombo > 0
                ? '<span class="game-board-combo" title="Best streak">×' + e.bestCombo + " " + comboLabel + "</span>"
                : "";

            var metaParts = [];
            if (e.gamesPlayed > 0) {
                metaParts.push(e.gamesPlayed + (e.gamesPlayed === 1 ? " run" : " runs"));
            }
            var dateStr = formatShortDate(e.achievedAt);
            if (dateStr) {
                metaParts.push(dateStr);
            }

            html +=
                '<div class="' + rowCls + '">' +
                '  <div class="game-rank-badge ' + rankCls + '" aria-label="Rank ' + e.rank + '">#' + e.rank + "</div>" +
                '  <div class="game-board-player">' +
                '    <div class="game-board-identity">' +
                       badgeHtml +
                '      <span class="member-pill" style="background:' + color + ";color:" + ink + '">' + esc(e.displayName) + "</span>" +
                       youHtml +
                       statusHtml +
                "    </div>" +
                '    <div class="game-board-meta">' +
                       comboHtml +
                '      <span>' + esc(metaParts.join(" · ")) + "</span>" +
                "    </div>" +
                "  </div>" +
                '  <div class="game-board-score">' +
                '    <strong>' + e.bestScore + "</strong>" +
                '    <span>pts</span>' +
                "  </div>" +
                "</div>";
        }
        return html;
    }

    function renderLeaderboard(board) {
        if (!board) return;

        var myRec = board.myRecord;
        if (myBestEl) {
            myBestEl.innerHTML = "Best: <strong>" + (myRec ? myRec.bestScore : 0) + "</strong>";
        }
        if (myRankEl) {
            myRankEl.innerHTML = "Rank: <strong>" + (myRec ? "#" + myRec.rank : "—") + "</strong>";
        }

        if (boardSummary) {
            var pCount = board.totalPlayers || 0;
            var gCount = board.totalGamesPlayed || 0;
            boardSummary.textContent =
                pCount + (pCount === 1 ? " player" : " players") + " · " +
                gCount + (gCount === 1 ? " run" : " runs");
        }

        if (boardList) {
            boardList.innerHTML = buildLeaderboardHtml(board, GAME_KEY);
        }
    }

    async function loadHubLeaderboard(gameKey) {
        if (!hubHallList) return;
        hubHallKey = gameKey || "stack-3d";
        var name = getGameDisplayName(hubHallKey);
        if (hubHallPlayBtn) {
            hubHallPlayBtn.setAttribute("data-launch-game", hubHallKey);
            var span = hubHallPlayBtn.querySelector("span");
            if (span) {
                span.textContent = "Play";
            }
            hubHallPlayBtn.title = "Play " + name;
            hubHallPlayBtn.setAttribute("aria-label", "Play " + name);
        }
        if (hubHallSummary) {
            hubHallSummary.textContent = "Loading " + name + " high scores…";
        }
        var chips = document.querySelectorAll("[data-hall-game]");
        for (var c = 0; c < chips.length; c++) {
            var isSel = chips[c].getAttribute("data-hall-game") === hubHallKey;
            chips[c].classList.toggle("is-active", isSel);
            chips[c].setAttribute("aria-selected", isSel ? "true" : "false");
        }
        try {
            var board = await window.mcwut.api("/api/games/" + encodeURIComponent(hubHallKey) + "/leaderboard", {
                headers: window.mcwut.headers()
            });
            if (hubHallSummary) {
                var pCount = board.totalPlayers || 0;
                var gCount = board.totalGamesPlayed || 0;
                hubHallSummary.textContent =
                    name + " · " + pCount + (pCount === 1 ? " player" : " players") + " · " +
                    gCount + (gCount === 1 ? " run" : " runs");
            }
            hubHallList.innerHTML = buildLeaderboardHtml(board, hubHallKey);
        } catch (err) {
            if (hubHallList) {
                hubHallList.innerHTML = '<p class="text-danger small mb-0 py-2">Could not load leaderboard for ' + window.mcwut.esc(name) + '.</p>';
            }
            if (window.mcwut && window.mcwut.toast) {
                window.mcwut.toast("Could not load leaderboard for " + name, { kind: "err" });
            }
        }
    }

    async function loadMyBestScores() {
        try {
            var bests = await window.mcwut.api("/api/games/me/bests", {
                headers: window.mcwut.headers()
            });
            if (bests) {
                var bestEls = document.querySelectorAll("[data-best-for]");
                for (var i = 0; i < bestEls.length; i++) {
                    var el = bestEls[i];
                    var gk = el.getAttribute("data-best-for");
                    var valEl = el.querySelector(".best-val") || el;
                    if (gk && typeof bests[gk] === "number" && bests[gk] > 0) {
                        valEl.textContent = bests[gk].toLocaleString();
                    } else {
                        valEl.textContent = "—";
                    }
                }
            }
        } catch (e) {
            // Silently ignore if personal bests cannot be loaded
        }
    }


    window.McWutGames.leaderboard = {
        GAME_DEFS: GAME_DEFS,
        getGameDisplayName: getGameDisplayName,
        formatShortDate: formatShortDate,
        buildLeaderboardHtml: buildLeaderboardHtml,
        renderLeaderboard: renderLeaderboard,
        loadLeaderboard: loadLeaderboard,
        loadHubLeaderboard: loadHubLeaderboard,
        loadMyBestScores: loadMyBestScores,
        submitScore: submitScore
    };

    window.GAME_DEFS = GAME_DEFS;
    window.getGameDisplayName = getGameDisplayName;
    window.formatShortDate = formatShortDate;
    window.buildLeaderboardHtml = buildLeaderboardHtml;
    window.renderLeaderboard = renderLeaderboard;
    window.loadLeaderboard = loadLeaderboard;
    window.loadHubLeaderboard = loadHubLeaderboard;
    window.loadMyBestScores = loadMyBestScores;
    window.submitScore = submitScore;
})();
