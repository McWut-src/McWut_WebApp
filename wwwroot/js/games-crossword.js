(function () {
    "use strict";

    window.McWutGames = window.McWutGames || {};
    var cwStage = document.getElementById("crossword-stage");

    // =========================================================================
    // MINI CROSSWORD (5×5 PACK)
    // =========================================================================
    var CW_PUZZLES = [
        {
            id: "woodland-cabin",
            title: "1. Woodland Cabin",
            rows: ["#CARE", "EATEN", "ABOUT", "RINSE", "SNEER"],
            across: [
                "Tender loving attention",
                "All gone from the dinner plate",
                "Roughly or concerning",
                "Wash away the soap suds",
                "Villain's curling lip"
            ],
            down: [
                "Listening organs or corn cobs",
                "Cozy log getaway in the woods",
                "Make amends for a slip-up",
                "Give an empty jar a second life",
                "Key that submits a form"
            ]
        },
        {
            id: "cozy-kitchen",
            title: "2. Cozy Kitchen",
            rows: ["FLAME", "EATER", "ABODE", "SONIC", "TREAT"],
            across: [
                "Candlelight or gas stove flicker",
                "Enthusiastic brunch guest",
                "Humble home sweet home",
                "Faster than the speed of sound",
                "Sweet bakery reward"
            ],
            down: [
                "Holiday banquet table spread",
                "Hard work or effort",
                "Make things right again",
                "News, podcasts, and cinema",
                "Stand upright, like a tent"
            ]
        },
        {
            id: "sunday-brunch",
            title: "3. Sunday Brunch",
            rows: ["TOAST", "RULER", "ATONE", "MENDS", "PRESS"],
            across: [
                "Crisp sourdough slice or clinked glasses",
                "Straightedge in a desk drawer",
                "Apologize and make amends",
                "Patches up a torn sweater",
                "French ___ coffee maker"
            ],
            down: [
                "Hike heavy-footed through snow",
                "Kind of space beyond Earth's sky",
                "Solo, without a crowd",
                "Drops a postcard in the mail",
                "Long braided lock of hair"
            ]
        },
        {
            id: "winter-scarf",
            title: "4. Winter Scarf",
            rows: ["SPARE", "COLON", "ALOUD", "RANGE", "FREED"],
            across: [
                "Extra tire in the trunk or bowling pickup",
                "Punctuation mark in 12:30 (:)",
                "How a bedtime story is read",
                "Kitchen stove or mountain chain",
                "Let out of the cage"
            ],
            down: [
                "Cozy knit wrap for chilly walks",
                "Like Arctic bears and fleeces",
                "All by oneself",
                "Rosy cheek makeup tint",
                "Wrapped up as the credits rolled"
            ]
        },
        {
            id: "bright-palette",
            title: "5. Bright Palette",
            rows: ["SMART", "COLOR", "ALIVE", "LAKES", "PRESS"],
            across: [
                "Clever and quick-witted",
                "Watercolor hue on a palette",
                "Thriving and full of energy",
                "Calm inland waters for kayaking",
                "Iron flat or push a button"
            ],
            down: [
                "Top of the head under your hair",
                "Back tooth for chewing crunchy apples",
                "Matching like two peas in a pod",
                "Wanders freely across the map",
                "Flowing curl or lock of hair"
            ]
        },
        {
            id: "fresh-start",
            title: "6. Fresh Start",
            rows: ["START", "THREE", "ROOFS", "ASSET", "PEER#"],
            across: [
                "Begin a brand-new chapter",
                "Trio count or a crowd's company",
                "Shingled house tops",
                "Valuable strength or nest-egg item",
                "Look closely or an equal colleague"
            ],
            down: [
                "Purse handle or watchband",
                "The ones over there",
                "Got up with the morning sun",
                "Direct someone to a good book",
                "Pop quiz or recipe trial run"
            ]
        },
        {
            id: "sweet-share",
            title: "7. Sweet Share",
            rows: ["SHARE", "EATEN", "ABOUT", "RINSE", "STEER"],
            across: [
                "Split the last slice of cake",
                "Polished off at dinner",
                "Approximately or regarding",
                "Quick splash under the faucet",
                "Guide the car's wheel"
            ],
            down: [
                "Browns a steak in a hot skillet",
                "Daily morning routine",
                "Make up for a mistake",
                "Bring your own tote bag again",
                "Step inside or press Return"
            ]
        },
        {
            id: "evening-dress",
            title: "8. Evening Dress",
            rows: ["BOAST", "ERROR", "ADORE", "RESTS", "DRESS"],
            across: [
                "Brag about a high score",
                "Typo that needs an eraser",
                "Love to pieces",
                "Takes a quiet afternoon nap",
                "Party gown or salad topping"
            ],
            down: [
                "Santa's snowy chin whiskers",
                "Request at a café counter",
                "Came up in conversation",
                "Organizes laundry by color",
                "Silky strand of hair"
            ]
        }
    ];

    var cwSelectEl = document.getElementById("cw-puzzle-select");
    var cwSolvedPill = document.getElementById("cw-solved-pill");
    var cwTimerEl = document.getElementById("cw-timer");
    var cwLiveScoreEl = document.getElementById("cw-live-score");
    var cwPencilBtn = document.getElementById("cw-pencil-btn");
    var cwCheckBtn = document.getElementById("cw-check-btn");
    var cwHintBtn = document.getElementById("cw-hint-btn");
    var cwGridEl = document.getElementById("cw-grid");
    var cwPrevClueBtn = document.getElementById("cw-prev-clue");
    var cwNextClueBtn = document.getElementById("cw-next-clue");
    var cwActiveClueBtn = document.getElementById("cw-active-clue");
    var cwActiveClueTag = document.getElementById("cw-active-clue-tag");
    var cwActiveClueText = document.getElementById("cw-active-clue-text");
    var cwKeyboardEl = document.getElementById("cw-keyboard");
    var cwAcrossListEl = document.getElementById("cw-clues-across");
    var cwDownListEl = document.getElementById("cw-clues-down");
    var cwWinOverlay = document.getElementById("cw-win-overlay");
    var cwRecordBanner = document.getElementById("cw-record-banner");
    var cwWinTitle = document.getElementById("cw-win-title");
    var cwWinScore = document.getElementById("cw-win-score");
    var cwWinTime = document.getElementById("cw-win-time");
    var cwWinBest = document.getElementById("cw-win-best");
    var cwWinRank = document.getElementById("cw-win-rank");
    var cwSaveStatus = document.getElementById("cw-save-status");
    var cwNextPuzzleBtn = document.getElementById("cw-next-puzzle-btn");
    var cwReplayBtn = document.getElementById("cw-replay-btn");

    var cwState = {
        puzzleIdx: 0,
        cells: [], // 5x5 of { r, c, isBlock, answer, entry, pencil, status, num, el }
        acrossWords: [], // { index, num, clue, cells: [{r,c}], tainted }
        downWords: [],   // { index, num, clue, cells: [{r,c}], tainted }
        row: 0,
        col: 0,
        dir: "across", // "across" | "down"
        pencil: false,
        hintsUsed: 0,
        checksUsed: 0,
        elapsedSec: 0,
        solved: false,
        solvedMap: {},
        timerHandle: null
    };

    try {
        var rawSolved = localStorage.getItem("mcwut-cw-solved");
        if (rawSolved) {
            cwState.solvedMap = JSON.parse(rawSolved) || {};
        }
    } catch (e) {}

    function playKeyTick(isPencil) {
        var ctx = ensureAudio();
        if (!ctx) return;
        try {
            var now = ctx.currentTime;
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(isPencil ? 540 : 660, now);
            gain.gain.setValueAtTime(0.035, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.06);
        } catch (e) {}
    }

    function formatTimer(sec) {
        var m = Math.floor(sec / 60);
        var s = sec % 60;
        return m + ":" + (s < 10 ? "0" + s : s);
    }

    function computeCrosswordScore() {
        var speedBonus = Math.max(0, 450 - cwState.elapsedSec * 3);
        var cleanWords = 0;
        cwState.acrossWords.forEach(function (w) {
            if (!w.tainted) cleanWords++;
        });
        cwState.downWords.forEach(function (w) {
            if (!w.tainted) cleanWords++;
        });
        var raw = 500 + speedBonus + cleanWords * 10 - cwState.hintsUsed * 40 - cwState.checksUsed * 15;
        return {
            score: Math.max(100, raw),
            cleanWords: cleanWords
        };
    }

    function updateCwStatsUi() {
        if (cwTimerEl) {
            cwTimerEl.textContent = formatTimer(cwState.elapsedSec);
        }
        if (cwLiveScoreEl) {
            var calc = computeCrosswordScore();
            cwLiveScoreEl.textContent = calc.score + " pts";
        }
    }

    function renderCwSelectOptions() {
        if (!cwSelectEl) return;
        var html = "";
        for (var i = 0; i < CW_PUZZLES.length; i++) {
            var p = CW_PUZZLES[i];
            var done = cwState.solvedMap[p.id] ? " ✓" : "";
            var sel = i === cwState.puzzleIdx ? " selected" : "";
            html += '<option value="' + i + '"' + sel + ">" + window.mcwut.esc(p.title + done) + "</option>";
        }
        cwSelectEl.innerHTML = html;
        if (cwSolvedPill) {
            var cur = CW_PUZZLES[cwState.puzzleIdx];
            cwSolvedPill.hidden = !(cur && cwState.solvedMap[cur.id]);
        }
    }

    function loadCrosswordPuzzle(idx) {
        cwState.puzzleIdx = ((idx % CW_PUZZLES.length) + CW_PUZZLES.length) % CW_PUZZLES.length;
        var p = CW_PUZZLES[cwState.puzzleIdx];

        cwState.cells = [];
        cwState.acrossWords = [];
        cwState.downWords = [];
        cwState.hintsUsed = 0;
        cwState.checksUsed = 0;
        cwState.elapsedSec = 0;
        cwState.solved = false;
        cwState.dir = "across";
        if (cwWinOverlay) cwWinOverlay.hidden = true;

        var numCounter = 0;
        var r, c;
        for (r = 0; r < 5; r++) {
            var rowArr = [];
            for (c = 0; c < 5; c++) {
                var ch = p.rows[r].charAt(c);
                var isBlock = ch === "#";
                var num = 0;
                if (!isBlock) {
                    var startsA = (c === 0 || p.rows[r].charAt(c - 1) === "#") && (c + 1 < 5 && p.rows[r].charAt(c + 1) !== "#");
                    var startsD = (r === 0 || p.rows[r - 1].charAt(c) === "#") && (r + 1 < 5 && p.rows[r + 1].charAt(c) !== "#");
                    if (startsA || startsD) {
                        numCounter++;
                        num = numCounter;
                    }
                }
                rowArr.push({
                    r: r,
                    c: c,
                    isBlock: isBlock,
                    answer: isBlock ? "" : ch,
                    entry: "",
                    pencil: false,
                    status: "", // "" | "correct" | "error"
                    num: num,
                    el: null
                });
            }
            cwState.cells.push(rowArr);
        }

        // Build Across words (1 per row)
        for (r = 0; r < 5; r++) {
            var aCells = [];
            var aNum = 0;
            for (c = 0; c < 5; c++) {
                if (!cwState.cells[r][c].isBlock) {
                    if (aCells.length === 0) aNum = cwState.cells[r][c].num;
                    aCells.push({ r: r, c: c });
                }
            }
            cwState.acrossWords.push({
                index: r,
                num: aNum,
                clue: p.across[r],
                cells: aCells,
                tainted: false
            });
        }

        // Build Down words (1 per col)
        for (c = 0; c < 5; c++) {
            var dCells = [];
            var dNum = 0;
            for (r = 0; r < 5; r++) {
                if (!cwState.cells[r][c].isBlock) {
                    if (dCells.length === 0) dNum = cwState.cells[r][c].num;
                    dCells.push({ r: r, c: c });
                }
            }
            cwState.downWords.push({
                index: c,
                num: dNum,
                clue: p.down[c],
                cells: dCells,
                tainted: false
            });
        }

        // Pick first non-block cell
        var firstCell = cwState.acrossWords[0].cells[0];
        cwState.row = firstCell.r;
        cwState.col = firstCell.c;

        renderCwSelectOptions();
        buildCwGridDom();
        renderCwClueLists();
        updateCwBoardUi();
        updateCwStatsUi();
    }

    function buildCwGridDom() {
        if (!cwGridEl) return;
        cwGridEl.innerHTML = "";
        for (var r = 0; r < 5; r++) {
            for (var c = 0; c < 5; c++) {
                var cell = cwState.cells[r][c];
                var btn = document.createElement("button");
                btn.type = "button";
                btn.className = "cw-cell" + (cell.isBlock ? " is-block" : "");
                btn.setAttribute("data-r", String(r));
                btn.setAttribute("data-c", String(c));
                if (cell.isBlock) {
                    btn.disabled = true;
                    btn.setAttribute("aria-hidden", "true");
                } else {
                    btn.setAttribute("aria-label", "Row " + (r + 1) + " Column " + (c + 1));
                    var numSpan = document.createElement("span");
                    numSpan.className = "cw-cell-num";
                    numSpan.textContent = cell.num > 0 ? String(cell.num) : "";
                    var letSpan = document.createElement("span");
                    letSpan.className = "cw-cell-letter";
                    letSpan.textContent = "";
                    btn.appendChild(numSpan);
                    btn.appendChild(letSpan);
                }
                cell.el = btn;
                cwGridEl.appendChild(btn);
            }
        }
    }

    function isWordFilled(word) {
        for (var i = 0; i < word.cells.length; i++) {
            var pos = word.cells[i];
            if (!cwState.cells[pos.r][pos.c].entry) return false;
        }
        return true;
    }

    function renderCwClueLists() {
        var esc = window.mcwut.esc;
        if (cwAcrossListEl) {
            var aHtml = "";
            for (var i = 0; i < cwState.acrossWords.length; i++) {
                var w = cwState.acrossWords[i];
                var isAct = cwState.dir === "across" && cwState.row === i;
                var isDone = isWordFilled(w);
                var cls = "cw-clue-item" + (isAct ? " is-active" : "") + (isDone ? " is-done" : "");
                aHtml +=
                    '<button type="button" class="' + cls + '" data-dir="across" data-idx="' + i + '">' +
                    '<span class="cw-clue-item-num">' + w.num + "A</span>" +
                    '<span class="cw-clue-item-text">' + esc(w.clue) + "</span>" +
                    "</button>";
            }
            cwAcrossListEl.innerHTML = aHtml;
        }
        if (cwDownListEl) {
            var dHtml = "";
            for (var j = 0; j < cwState.downWords.length; j++) {
                var dw = cwState.downWords[j];
                var isActD = cwState.dir === "down" && cwState.col === j;
                var isDoneD = isWordFilled(dw);
                var clsD = "cw-clue-item" + (isActD ? " is-active" : "") + (isDoneD ? " is-done" : "");
                dHtml +=
                    '<button type="button" class="' + clsD + '" data-dir="down" data-idx="' + j + '">' +
                    '<span class="cw-clue-item-num">' + dw.num + "D</span>" +
                    '<span class="cw-clue-item-text">' + esc(dw.clue) + "</span>" +
                    "</button>";
            }
            cwDownListEl.innerHTML = dHtml;
        }
    }

    function updateCwBoardUi() {
        for (var r = 0; r < 5; r++) {
            for (var c = 0; c < 5; c++) {
                var cell = cwState.cells[r][c];
                if (cell.isBlock || !cell.el) continue;

                var isAct = r === cwState.row && c === cwState.col;
                var inWord = (cwState.dir === "across" && r === cwState.row) || (cwState.dir === "down" && c === cwState.col);

                var cls = "cw-cell";
                if (isAct) cls += " is-active";
                else if (inWord) cls += " is-word";
                if (cell.pencil && cell.entry) cls += " is-pencil";
                if (cell.status === "correct") cls += " is-correct";
                if (cell.status === "error") cls += " is-error";
                cell.el.className = cls;

                var letEl = cell.el.querySelector(".cw-cell-letter");
                if (letEl) {
                    letEl.textContent = cell.entry;
                }
            }
        }

        // Update active clue banner
        var activeWord = cwState.dir === "across"
            ? cwState.acrossWords[cwState.row]
            : cwState.downWords[cwState.col];
        if (activeWord && cwActiveClueTag && cwActiveClueText) {
            cwActiveClueTag.textContent = activeWord.num + (cwState.dir === "across" ? "A" : "D");
            cwActiveClueText.textContent = activeWord.clue;
        }

        renderCwClueLists();
    }

    function markCellTainted(r, c) {
        if (cwState.acrossWords[r]) cwState.acrossWords[r].tainted = true;
        if (cwState.downWords[c]) cwState.downWords[c].tainted = true;
    }

    function stepCwCursor(delta) {
        var word = cwState.dir === "across"
            ? cwState.acrossWords[cwState.row]
            : cwState.downWords[cwState.col];
        if (!word) return;

        var posIdx = 0;
        for (var i = 0; i < word.cells.length; i++) {
            if (word.cells[i].r === cwState.row && word.cells[i].c === cwState.col) {
                posIdx = i;
                break;
            }
        }

        var nextIdx = posIdx + delta;
        if (nextIdx >= 0 && nextIdx < word.cells.length) {
            cwState.row = word.cells[nextIdx].r;
            cwState.col = word.cells[nextIdx].c;
        } else if (delta > 0) {
            cycleCwWord(1);
        } else if (delta < 0) {
            cycleCwWord(-1);
        }
    }

    function cycleCwWord(delta) {
        var list = cwState.dir === "across" ? cwState.acrossWords : cwState.downWords;
        var curIdx = cwState.dir === "across" ? cwState.row : cwState.col;
        var nextIdx = curIdx + delta;
        if (nextIdx >= list.length) {
            cwState.dir = cwState.dir === "across" ? "down" : "across";
            list = cwState.dir === "across" ? cwState.acrossWords : cwState.downWords;
            nextIdx = 0;
        } else if (nextIdx < 0) {
            cwState.dir = cwState.dir === "across" ? "down" : "across";
            list = cwState.dir === "across" ? cwState.acrossWords : cwState.downWords;
            nextIdx = list.length - 1;
        }
        var targetWord = list[nextIdx];
        if (targetWord && targetWord.cells.length > 0) {
            // Prefer first empty cell in target word, else first cell
            var dest = targetWord.cells[0];
            for (var i = 0; i < targetWord.cells.length; i++) {
                var p = targetWord.cells[i];
                if (!cwState.cells[p.r][p.c].entry) {
                    dest = p;
                    break;
                }
            }
            cwState.row = dest.r;
            cwState.col = dest.c;
        }
        updateCwBoardUi();
    }

    function inputCwLetter(ch) {
        if (cwState.solved) return;
        var cell = cwState.cells[cwState.row][cwState.col];
        if (!cell || cell.isBlock) return;

        cell.entry = ch.toUpperCase();
        cell.pencil = cwState.pencil;
        cell.status = "";
        playKeyTick(cwState.pencil);

        checkCrosswordSolved();
        if (!cwState.solved) {
            stepCwCursor(1);
            updateCwBoardUi();
        }
    }

    function handleCwBackspace() {
        if (cwState.solved) return;
        var cell = cwState.cells[cwState.row][cwState.col];
        if (!cell || cell.isBlock) return;

        if (cell.entry) {
            cell.entry = "";
            cell.pencil = false;
            cell.status = "";
        } else {
            stepCwCursor(-1);
            var prev = cwState.cells[cwState.row][cwState.col];
            if (prev && !prev.isBlock) {
                prev.entry = "";
                prev.pencil = false;
                prev.status = "";
            }
        }
        updateCwBoardUi();
    }

    function checkCrosswordBoard() {
        if (cwState.solved) return;
        cwState.checksUsed++;
        var anyChecked = false;
        for (var r = 0; r < 5; r++) {
            for (var c = 0; c < 5; c++) {
                var cell = cwState.cells[r][c];
                if (cell.isBlock || !cell.entry) continue;
                anyChecked = true;
                if (cell.entry === cell.answer) {
                    cell.status = "correct";
                    cell.pencil = false;
                } else {
                    cell.status = "error";
                    markCellTainted(r, c);
                }
            }
        }
        if (anyChecked) {
            updateCwBoardUi();
            updateCwStatsUi();
        }
    }

    function revealCwHint() {
        if (cwState.solved) return;
        var cell = cwState.cells[cwState.row][cwState.col];
        if (!cell || cell.isBlock) return;

        cwState.hintsUsed++;
        markCellTainted(cwState.row, cwState.col);
        cell.entry = cell.answer;
        cell.pencil = false;
        cell.status = "correct";
        playKeyTick(false);
        updateCwStatsUi();
        checkCrosswordSolved();
        if (!cwState.solved) {
            stepCwCursor(1);
            updateCwBoardUi();
        }
    }

    function checkCrosswordSolved() {
        for (var r = 0; r < 5; r++) {
            for (var c = 0; c < 5; c++) {
                var cell = cwState.cells[r][c];
                if (!cell.isBlock && cell.entry !== cell.answer) {
                    return false;
                }
            }
        }

        // Solved!
        cwState.solved = true;
        updateCwBoardUi();

        var p = CW_PUZZLES[cwState.puzzleIdx];
        if (p) {
            cwState.solvedMap[p.id] = true;
            try {
                localStorage.setItem("mcwut-cw-solved", JSON.stringify(cwState.solvedMap));
            } catch (e) {}
            renderCwSelectOptions();
        }

        // Celebratory wave across all non-block cells
        for (var wr = 0; wr < 5; wr++) {
            for (var wc = 0; wc < 5; wc++) {
                (function (cellObj, delay) {
                    if (cellObj.isBlock || !cellObj.el) return;
                    setTimeout(function () {
                        cellObj.status = "correct";
                        cellObj.el.classList.add("is-wave", "is-correct");
                    }, delay);
                })(cwState.cells[wr][wc], (wr + wc) * 55);
            }
        }

        playNewRecordFanfare();

        var result = computeCrosswordScore();
        setTimeout(function () {
            showCwWinModal(result.score, result.cleanWords);
        }, 480);
        return true;
    }

    async function showCwWinModal(finalScore, cleanWords) {
        var p = CW_PUZZLES[cwState.puzzleIdx];
        if (cwWinTitle && p) {
            cwWinTitle.textContent = p.title.replace(/^\d+\.\s*/, "") + " Solved!";
        }
        if (cwWinScore) cwWinScore.textContent = String(finalScore);
        if (cwWinTime) cwWinTime.textContent = formatTimer(cwState.elapsedSec);

        var prevBest = state.leaderboard && state.leaderboard.myRecord ? state.leaderboard.myRecord.bestScore : 0;
        if (cwWinBest) cwWinBest.textContent = String(Math.max(prevBest, finalScore));
        if (cwWinRank) {
            cwWinRank.textContent = state.leaderboard && state.leaderboard.myRecord ? "#" + state.leaderboard.myRecord.rank : "—";
        }
        if (cwRecordBanner) {
            cwRecordBanner.hidden = !(finalScore > prevBest);
        }
        if (cwSaveStatus) {
            cwSaveStatus.textContent = "Saving score to global leaderboard…";
        }
        if (cwWinOverlay) {
            cwWinOverlay.hidden = false;
        }

        try {
            var res = await window.mcwut.api("/api/games/mini-crossword/scores", {
                method: "POST",
                headers: window.mcwut.headers({ "Content-Type": "application/json" }),
                body: JSON.stringify({ score: finalScore, maxCombo: cleanWords })
            });
            if (!res) return;
            if (GAME_KEY === "mini-crossword") {
                state.leaderboard = res.leaderboard;
                renderLeaderboard(res.leaderboard);
            }
            if (cwWinBest) cwWinBest.textContent = String(res.bestScore);
            if (cwWinRank) cwWinRank.textContent = res.rank ? "#" + res.rank : "—";
            if (cwRecordBanner) cwRecordBanner.hidden = !res.isNewBest;
            if (cwSaveStatus) {
                cwSaveStatus.textContent = res.isNewBest
                    ? "New personal record saved to the global leaderboard!"
                    : "Score recorded on the global leaderboard.";
            }
        } catch (err) {
            if (cwSaveStatus) {
                cwSaveStatus.textContent = "Could not save score: " + (err.message || "Network error");
            }
        }
    }

    function initCrosswordEvents() {
        if (!cwStage) return;

        if (cwSelectEl) {
            cwSelectEl.addEventListener("change", function () {
                var idx = parseInt(cwSelectEl.value, 10) || 0;
                loadCrosswordPuzzle(idx);
            });
        }

        if (cwGridEl) {
            cwGridEl.addEventListener("click", function (ev) {
                var btn = ev.target.closest(".cw-cell");
                if (!btn || btn.classList.contains("is-block")) return;
                var r = parseInt(btn.getAttribute("data-r"), 10);
                var c = parseInt(btn.getAttribute("data-c"), 10);
                if (r === cwState.row && c === cwState.col) {
                    cwState.dir = cwState.dir === "across" ? "down" : "across";
                } else {
                    cwState.row = r;
                    cwState.col = c;
                }
                updateCwBoardUi();
            });
        }

        if (cwActiveClueBtn) {
            cwActiveClueBtn.addEventListener("click", function () {
                cwState.dir = cwState.dir === "across" ? "down" : "across";
                updateCwBoardUi();
            });
        }

        if (cwPrevClueBtn) {
            cwPrevClueBtn.addEventListener("click", function () {
                cycleCwWord(-1);
            });
        }

        if (cwNextClueBtn) {
            cwNextClueBtn.addEventListener("click", function () {
                cycleCwWord(1);
            });
        }

        function handleClueListClick(ev) {
            var btn = ev.target.closest(".cw-clue-item");
            if (!btn) return;
            var dir = btn.getAttribute("data-dir");
            var idx = parseInt(btn.getAttribute("data-idx"), 10);
            cwState.dir = dir;
            var word = dir === "across" ? cwState.acrossWords[idx] : cwState.downWords[idx];
            if (word && word.cells.length > 0) {
                cwState.row = word.cells[0].r;
                cwState.col = word.cells[0].c;
            }
            updateCwBoardUi();
        }

        if (cwAcrossListEl) cwAcrossListEl.addEventListener("click", handleClueListClick);
        if (cwDownListEl) cwDownListEl.addEventListener("click", handleClueListClick);

        if (cwPencilBtn) {
            cwPencilBtn.addEventListener("click", function () {
                cwState.pencil = !cwState.pencil;
                cwPencilBtn.setAttribute("aria-pressed", cwState.pencil ? "true" : "false");
            });
        }

        if (cwCheckBtn) {
            cwCheckBtn.addEventListener("click", function () {
                checkCrosswordBoard();
            });
        }

        if (cwHintBtn) {
            cwHintBtn.addEventListener("click", function () {
                revealCwHint();
            });
        }

        if (cwKeyboardEl) {
            cwKeyboardEl.addEventListener("click", function (ev) {
                var keyBtn = ev.target.closest(".cw-key");
                if (!keyBtn) return;
                var k = keyBtn.getAttribute("data-key");
                if (k === "BACKSPACE") {
                    handleCwBackspace();
                } else if (k === "DIR") {
                    cwState.dir = cwState.dir === "across" ? "down" : "across";
                    updateCwBoardUi();
                } else if (k && k.length === 1) {
                    inputCwLetter(k);
                }
            });
        }

        if (cwNextPuzzleBtn) {
            cwNextPuzzleBtn.addEventListener("click", function () {
                loadCrosswordPuzzle(cwState.puzzleIdx + 1);
            });
        }

        if (cwReplayBtn) {
            cwReplayBtn.addEventListener("click", function () {
                loadCrosswordPuzzle(cwState.puzzleIdx);
            });
        }

        cwState.timerHandle = setInterval(function () {
            if (GAME_KEY === "mini-crossword" && !cwState.solved) {
                cwState.elapsedSec++;
                updateCwStatsUi();
            }
        }, 1000);

        loadCrosswordPuzzle(0);
    }


    window.McWutGames.crossword = {
        state: cwState,
        puzzles: CW_PUZZLES,
        initCrosswordEvents: initCrosswordEvents,
        loadCrosswordPuzzle: loadCrosswordPuzzle,
        inputCwLetter: inputCwLetter,
        handleCwBackspace: handleCwBackspace,
        cycleCwWord: cycleCwWord,
        stepCwCursor: stepCwCursor,
        updateCwBoardUi: updateCwBoardUi
    };
    window.cwState = cwState;
    window.initCrosswordEvents = initCrosswordEvents;
    window.loadCrosswordPuzzle = loadCrosswordPuzzle;
    window.inputCwLetter = inputCwLetter;
    window.handleCwBackspace = handleCwBackspace;
    window.cycleCwWord = cycleCwWord;
    window.stepCwCursor = stepCwCursor;
    window.updateCwBoardUi = updateCwBoardUi;
})();
