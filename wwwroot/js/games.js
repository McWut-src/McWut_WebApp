(function () {
    "use strict";

    window.McWutGames = window.McWutGames || {};
    var GAME_KEY = "stack-3d";
    window.McWutGames.activeGameKey = GAME_KEY;
    try {
        Object.defineProperty(window, "GAME_KEY", {
            get: function () { return window.McWutGames.activeGameKey || "stack-3d"; },
            set: function (v) { window.McWutGames.activeGameKey = v; GAME_KEY = v; },
            configurable: true
        });
    } catch (e) {
        window.GAME_KEY = GAME_KEY;
    }

    var viewport = document.getElementById("stack-viewport");
    var cwStage = document.getElementById("crossword-stage");
    var msStage = document.getElementById("minesweeper-stage");
    var slopeStage = document.getElementById("slope-stage");
    var n2048Stage = document.getElementById("neon2048-stage");
    var wwStage = document.getElementById("wheels-stage");
    var cbStage = document.getElementById("breakout-stage");
    var hxStage = document.getElementById("hextris-stage");
    var mmStage = document.getElementById("meme-stage");
    var gzStage = document.getElementById("godzilla-stage");
    var ssStage = document.getElementById("subway-stage");

    var hubStrip = document.getElementById("game-hub-strip");
    var activeTitleEl = document.getElementById("game-active-title");
    var stageHintEl = document.getElementById("game-stage-hint");
    var hubView = document.getElementById("game-hub-view");
    var stageView = document.getElementById("game-stage-view");
    var backToHubBtn = document.getElementById("btn-back-to-hub");
    var stageBackBtn = document.getElementById("btn-stage-back");
    var hubActions = document.getElementById("games-hub-actions");
    var pageTitleEl = document.getElementById("games-page-title");
    var pageKickerEl = document.getElementById("games-page-kicker");
    var hubHallSummary = document.getElementById("hub-hall-summary");
    var hubHallPlayBtn = document.getElementById("hub-hall-play-btn");
    var hubHallList = document.getElementById("hub-hall-list");
    var hubHallKey = "stack-3d";

    var startBtn = document.getElementById("stack-start-btn");
    var againBtn = document.getElementById("stack-again-btn");
    var restartBtn = document.getElementById("game-restart-btn");
    var muteBtn = document.getElementById("game-mute-btn");
    var refreshBtn = document.getElementById("board-refresh-btn");

    // --- Hub Game Switcher & Views ---
    function showHub(pushState) {
        if (pushState !== false) {
            history.pushState(null, "", "/games");
        }
        if (hubView) hubView.hidden = false;
        if (stageView) stageView.hidden = true;
        if (hubActions) hubActions.hidden = true;

        if (pageTitleEl) pageTitleEl.textContent = "Games";
        if (pageKickerEl) pageKickerEl.textContent = "Solo arcade games & global high scores.";

        msPauseClock();
        slopePause();
        wwPause();
        cbPause();
        hxPause();
        if (typeof mmPause === "function") mmPause();
        if (typeof gzPause === "function") gzPause();
        if (typeof ssPause === "function") ssPause();

        loadMyBestScores();
        loadHubLeaderboard(hubHallKey);
    }

    function launchGame(nextKey, pushState) {
        if (!nextKey) nextKey = "stack-3d";
        var targetDef = GAME_DEFS[nextKey];
        if (targetDef && !targetDef.available) {
            if (window.mcwut && window.mcwut.toast) {
                window.mcwut.toast(targetDef.name + " is coming soon!", { kind: "info" });
            }
            return;
        }
        if (pushState !== false) {
            history.pushState(null, "", "/games?game=" + encodeURIComponent(nextKey));
        }
        if (hubView) hubView.hidden = true;
        if (stageView) stageView.hidden = false;
        if (hubActions) hubActions.hidden = false;

        if (pageTitleEl) pageTitleEl.textContent = "Arcade Games";
        if (pageKickerEl) pageKickerEl.textContent = "Play solo in this browser and chase the global high score.";

        switchGame(nextKey);
    }

    function switchGame(nextKey) {
        if (nextKey !== "stack-3d" && nextKey !== "mini-crossword" && nextKey !== "minesweeper" && nextKey !== "neon-slope" && nextKey !== "merge-2048" && nextKey !== "wacky-wheels" && nextKey !== "brick-breaker" && nextKey !== "hextris" && nextKey !== "meme-merge" && nextKey !== "godzilla-rampage" && nextKey !== "subway-surfer") {
            return;
        }
        GAME_KEY = nextKey;
        if (window.McWutGames) window.McWutGames.activeGameKey = nextKey;
        msState.active = nextKey === "minesweeper";
        slopeState.active = nextKey === "neon-slope";
        n2048State.active = nextKey === "merge-2048";
        wwState.active = nextKey === "wacky-wheels";
        cbState.active = nextKey === "brick-breaker";
        hxState.active = nextKey === "hextris";
        if (typeof mmState !== "undefined" && mmState) mmState.active = nextKey === "meme-merge";
        if (typeof gzState !== "undefined" && gzState) gzState.active = nextKey === "godzilla-rampage";
        if (typeof ssState !== "undefined" && ssState) ssState.active = nextKey === "subway-surfer";

        if (nextKey !== "subway-surfer") {
            if (typeof ssPause === "function") ssPause();
            if (ssStage) ssStage.hidden = true;
        }

        if (hubView) hubView.hidden = true;
        if (stageView) stageView.hidden = false;
        if (hubActions) hubActions.hidden = false;

        if (hubStrip) {
            var tabs = hubStrip.querySelectorAll("[data-game-key]");
            for (var i = 0; i < tabs.length; i++) {
                var isMatch = tabs[i].getAttribute("data-game-key") === nextKey;
                tabs[i].classList.toggle("is-active", isMatch);
                tabs[i].setAttribute("aria-selected", isMatch ? "true" : "false");
            }
        }

        if (nextKey === "mini-crossword") {
            msPauseClock();
            slopePause();
            wwPause();
            cbPause();
            hxPause();
            if (typeof mmPause === "function") mmPause();
            if (typeof gzPause === "function") gzPause();
            viewport.hidden = true;
            if (cwStage) cwStage.hidden = false;
            if (msStage) msStage.hidden = true;
            if (slopeStage) slopeStage.hidden = true;
            if (n2048Stage) n2048Stage.hidden = true;
            if (wwStage) wwStage.hidden = true;
            if (cbStage) cbStage.hidden = true;
            if (hxStage) hxStage.hidden = true;
            if (mmStage) mmStage.hidden = true;
            if (gzStage) gzStage.hidden = true;
            if (activeTitleEl) activeTitleEl.textContent = "Mini Crossword";
            if (stageHintEl) {
                stageHintEl.innerHTML = "Tap cells or clues · Type or use touch keys · <kbd>Space</kbd> flips direction";
            }
        } else if (nextKey === "minesweeper") {
            slopePause();
            wwPause();
            cbPause();
            hxPause();
            if (typeof mmPause === "function") mmPause();
            if (typeof gzPause === "function") gzPause();
            viewport.hidden = true;
            if (cwStage) cwStage.hidden = true;
            if (msStage) msStage.hidden = false;
            if (slopeStage) slopeStage.hidden = true;
            if (n2048Stage) n2048Stage.hidden = true;
            if (wwStage) wwStage.hidden = true;
            if (cbStage) cbStage.hidden = true;
            if (hxStage) hxStage.hidden = true;
            if (mmStage) mmStage.hidden = true;
            if (gzStage) gzStage.hidden = true;
            if (activeTitleEl) activeTitleEl.textContent = "Minesweeper";
            if (stageHintEl) {
                stageHintEl.innerHTML = "Tap to reveal · Long-press or <kbd>F</kbd> to flag · Chain big cascades";
            }
            requestAnimationFrame(function () {
                msResize();
            });
            msResumeClock();
        } else if (nextKey === "neon-slope") {
            msPauseClock();
            wwPause();
            cbPause();
            hxPause();
            if (typeof mmPause === "function") mmPause();
            if (typeof gzPause === "function") gzPause();
            viewport.hidden = true;
            if (cwStage) cwStage.hidden = true;
            if (msStage) msStage.hidden = true;
            if (slopeStage) slopeStage.hidden = false;
            if (n2048Stage) n2048Stage.hidden = true;
            if (wwStage) wwStage.hidden = true;
            if (cbStage) cbStage.hidden = true;
            if (hxStage) hxStage.hidden = true;
            if (mmStage) mmStage.hidden = true;
            if (gzStage) gzStage.hidden = true;
            if (activeTitleEl) activeTitleEl.textContent = "Neon Slope";
            if (stageHintEl) {
                stageHintEl.innerHTML = "← → or <kbd>A</kbd> <kbd>D</kbd> steer · <kbd>Space</kbd> / ↑ jump · Touch controls";
            }
            requestAnimationFrame(function () {
                slopeResize();
            });
            slopeResume();
        } else if (nextKey === "merge-2048") {
            msPauseClock();
            slopePause();
            wwPause();
            cbPause();
            hxPause();
            if (typeof mmPause === "function") mmPause();
            if (typeof gzPause === "function") gzPause();
            viewport.hidden = true;
            if (cwStage) cwStage.hidden = true;
            if (msStage) msStage.hidden = true;
            if (slopeStage) slopeStage.hidden = true;
            if (n2048Stage) n2048Stage.hidden = false;
            if (wwStage) wwStage.hidden = true;
            if (cbStage) cbStage.hidden = true;
            if (hxStage) hxStage.hidden = true;
            if (mmStage) mmStage.hidden = true;
            if (gzStage) gzStage.hidden = true;
            if (activeTitleEl) activeTitleEl.textContent = "2048 Neon";
            if (stageHintEl) {
                stageHintEl.innerHTML = "Swipe or Arrows / <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> to slide & merge · Reach 2048!";
            }
            n2048RenderBoard();
        } else if (nextKey === "wacky-wheels") {
            msPauseClock();
            slopePause();
            cbPause();
            hxPause();
            if (typeof mmPause === "function") mmPause();
            if (typeof gzPause === "function") gzPause();
            viewport.hidden = true;
            if (cwStage) cwStage.hidden = true;
            if (msStage) msStage.hidden = true;
            if (slopeStage) slopeStage.hidden = true;
            if (n2048Stage) n2048Stage.hidden = true;
            if (wwStage) wwStage.hidden = false;
            if (cbStage) cbStage.hidden = true;
            if (hxStage) hxStage.hidden = true;
            if (mmStage) mmStage.hidden = true;
            if (gzStage) gzStage.hidden = true;
            if (activeTitleEl) activeTitleEl.textContent = "Wacky Wheels";
            if (stageHintEl) {
                stageHintEl.innerHTML = "<kbd>W</kbd>/<kbd>↑</kbd> Gas · <kbd>S</kbd>/<kbd>↓</kbd> Brake · <kbd>A</kbd>/<kbd>D</kbd> Lean · <kbd>Space</kbd> Eject · <kbd>R</kbd> Restart";
            }
            wwLoadLevelsList(false);
            requestAnimationFrame(function () {
                wwResize();
                wwResume();
            });
        } else if (nextKey === "brick-breaker") {
            msPauseClock();
            slopePause();
            wwPause();
            hxPause();
            if (typeof mmPause === "function") mmPause();
            if (typeof gzPause === "function") gzPause();
            viewport.hidden = true;
            if (cwStage) cwStage.hidden = true;
            if (msStage) msStage.hidden = true;
            if (slopeStage) slopeStage.hidden = true;
            if (n2048Stage) n2048Stage.hidden = true;
            if (wwStage) wwStage.hidden = true;
            if (cbStage) cbStage.hidden = false;
            if (hxStage) hxStage.hidden = true;
            if (mmStage) mmStage.hidden = true;
            if (gzStage) gzStage.hidden = true;
            if (activeTitleEl) activeTitleEl.textContent = "Cyber Breakout";
            if (stageHintEl) {
                stageHintEl.innerHTML = "Mouse / Touch / <kbd>A</kbd><kbd>D</kbd> steer · <kbd>Space</kbd> / Tap launch & fire · <kbd>R</kbd> restart";
            }
            cbEnsureGame();
            cbResume();
        } else if (nextKey === "hextris") {
            msPauseClock();
            slopePause();
            wwPause();
            cbPause();
            if (typeof mmPause === "function") mmPause();
            if (typeof gzPause === "function") gzPause();
            viewport.hidden = true;
            if (cwStage) cwStage.hidden = true;
            if (msStage) msStage.hidden = true;
            if (slopeStage) slopeStage.hidden = true;
            if (n2048Stage) n2048Stage.hidden = true;
            if (wwStage) wwStage.hidden = true;
            if (cbStage) cbStage.hidden = true;
            if (hxStage) hxStage.hidden = false;
            if (mmStage) mmStage.hidden = true;
            if (gzStage) gzStage.hidden = true;
            if (activeTitleEl) activeTitleEl.textContent = "Hextris Neon";
            if (stageHintEl) {
                stageHintEl.innerHTML = "Tap Left/Right or <kbd>A</kbd><kbd>D</kbd> / <kbd>&larr;</kbd><kbd>&rarr;</kbd> Rotate &middot; <kbd>S</kbd>/<kbd>&darr;</kbd> Drop &middot; Match 3+ colors";
            }
            hxEnsureGame();
            hxResume();
        } else if (nextKey === "meme-merge") {
            msPauseClock();
            slopePause();
            wwPause();
            cbPause();
            hxPause();
            if (typeof gzPause === "function") gzPause();
            viewport.hidden = true;
            if (cwStage) cwStage.hidden = true;
            if (msStage) msStage.hidden = true;
            if (slopeStage) slopeStage.hidden = true;
            if (n2048Stage) n2048Stage.hidden = true;
            if (wwStage) wwStage.hidden = true;
            if (cbStage) cbStage.hidden = true;
            if (hxStage) hxStage.hidden = true;
            if (mmStage) mmStage.hidden = false;
            if (gzStage) gzStage.hidden = true;
            if (activeTitleEl) activeTitleEl.textContent = "Meme Merge";
            if (stageHintEl) {
                stageHintEl.innerHTML = "Aim with mouse/touch or <kbd>A</kbd><kbd>D</kbd> / <kbd>&larr;</kbd><kbd>&rarr;</kbd> &middot; Drop with <kbd>Space</kbd> / <kbd>&darr;</kbd> or Tap &middot; Match memes to summon The Rock";
            }
            if (typeof mmEnsureGame === "function") mmEnsureGame();
            if (typeof mmResume === "function") mmResume();
        } else if (nextKey === "godzilla-rampage") {
            msPauseClock();
            slopePause();
            wwPause();
            cbPause();
            hxPause();
            if (typeof mmPause === "function") mmPause();
            viewport.hidden = true;
            if (cwStage) cwStage.hidden = true;
            if (msStage) msStage.hidden = true;
            if (slopeStage) slopeStage.hidden = true;
            if (n2048Stage) n2048Stage.hidden = true;
            if (wwStage) wwStage.hidden = true;
            if (cbStage) cbStage.hidden = true;
            if (hxStage) hxStage.hidden = true;
            if (mmStage) mmStage.hidden = true;
            if (gzStage) gzStage.hidden = false;
            if (activeTitleEl) activeTitleEl.textContent = "Godzilla Rampage";
            if (stageHintEl) {
                stageHintEl.innerHTML = "<kbd>WASD</kbd>/Arrows Move &middot; <kbd>Space</kbd>/Click Smash &middot; <kbd>E</kbd>/<kbd>Shift</kbd> Tail Whip &middot; <kbd>Q</kbd>/<kbd>F</kbd> Roar Beam";
            }
            requestAnimationFrame(function () {
                if (typeof gzResize === "function") gzResize();
                if (typeof gzResume === "function") gzResume();
            });
        } else if (nextKey === "subway-surfer") {
            msPauseClock();
            slopePause();
            wwPause();
            cbPause();
            hxPause();
            if (typeof mmPause === "function") mmPause();
            if (typeof gzPause === "function") gzPause();
            viewport.hidden = true;
            if (cwStage) cwStage.hidden = true;
            if (msStage) msStage.hidden = true;
            if (slopeStage) slopeStage.hidden = true;
            if (n2048Stage) n2048Stage.hidden = true;
            if (wwStage) wwStage.hidden = true;
            if (cbStage) cbStage.hidden = true;
            if (hxStage) hxStage.hidden = true;
            if (mmStage) mmStage.hidden = true;
            if (gzStage) gzStage.hidden = true;
            if (ssStage) ssStage.hidden = false;
            if (activeTitleEl) activeTitleEl.textContent = "Subway Surfer";
            if (stageHintEl) {
                stageHintEl.innerHTML = "&larr;&rarr; / <kbd>A</kbd><kbd>D</kbd> Lanes &middot; &uarr; / <kbd>Space</kbd> Jump &middot; &darr; / <kbd>S</kbd> Roll &middot; <kbd>E</kbd>/<kbd>Shift</kbd> Hoverboard";
            }
            requestAnimationFrame(function () {
                if (typeof ssResize === "function") ssResize();
                if (typeof ssResume === "function") ssResume();
            });
        } else {
            msPauseClock();
            slopePause();
            wwPause();
            cbPause();
            hxPause();
            if (typeof mmPause === "function") mmPause();
            if (typeof gzPause === "function") gzPause();
            if (typeof ssPause === "function") ssPause();
            if (cwStage) cwStage.hidden = true;
            if (msStage) msStage.hidden = true;
            if (slopeStage) slopeStage.hidden = true;
            if (n2048Stage) n2048Stage.hidden = true;
            if (wwStage) wwStage.hidden = true;
            if (cbStage) cbStage.hidden = true;
            if (hxStage) hxStage.hidden = true;
            if (mmStage) mmStage.hidden = true;
            if (gzStage) gzStage.hidden = true;
            if (ssStage) ssStage.hidden = true;
            viewport.hidden = false;
            if (activeTitleEl) activeTitleEl.textContent = "Stack 3D";
            if (stageHintEl) {
                stageHintEl.innerHTML = "Click, tap, or press <kbd>Space</kbd> to drop";
            }
            resizeViewport();
            requestAnimationFrame(function () {
                if (typeof resizeViewport === "function") resizeViewport();
            });
        }

        loadLeaderboard();
    }

    if (hubStrip) {
        hubStrip.addEventListener("click", function (ev) {
            var card = ev.target.closest("[data-game-key]");
            if (!card) return;
            var key = card.getAttribute("data-game-key");
            if (key && key !== GAME_KEY) {
                launchGame(key, true);
            }
        });
    }

    if (backToHubBtn) {
        backToHubBtn.addEventListener("click", function () {
            showHub(true);
        });
    }

    if (stageBackBtn) {
        stageBackBtn.addEventListener("click", function () {
            showHub(true);
        });
    }

    if (hubView) {
        hubView.addEventListener("click", function (ev) {
            var btn = ev.target.closest("[data-launch-game]");
            if (btn) {
                var g = btn.getAttribute("data-launch-game");
                if (g) {
                    launchGame(g, true);
                    return;
                }
            }
            var tile = ev.target.closest(".game-tile[data-game-key], .game-tile-card[data-game-key]");
            if (tile) {
                var gk = tile.getAttribute("data-game-key");
                var def = GAME_DEFS[gk];
                if (tile.classList.contains("is-soon") || (def && !def.available)) {
                    var name = def ? def.name : "That game";
                    if (window.mcwut && window.mcwut.toast) {
                        window.mcwut.toast(name + " is coming soon!", { kind: "info" });
                    }
                    return;
                }
                if (gk) {
                    launchGame(gk, true);
                    return;
                }
            }
        });

        hubView.addEventListener("keydown", function (ev) {
            if (ev.key === "Enter" || ev.key === " ") {
                var tile = ev.target.closest(".game-tile[data-game-key], .game-tile-card[data-game-key]");
                if (tile) {
                    ev.preventDefault();
                    var gk = tile.getAttribute("data-game-key");
                    var def = GAME_DEFS[gk];
                    if (tile.classList.contains("is-soon") || (def && !def.available)) {
                        var name = def ? def.name : "That game";
                        if (window.mcwut && window.mcwut.toast) {
                            window.mcwut.toast(name + " is coming soon!", { kind: "info" });
                        }
                        return;
                    }
                    if (gk) {
                        launchGame(gk, true);
                    }
                }
            }
        });
    }

    var hallPills = document.querySelectorAll("[data-hall-game]");
    for (var h = 0; h < hallPills.length; h++) {
        hallPills[h].addEventListener("click", function () {
            var g = this.getAttribute("data-hall-game");
            if (!g) return;
            var def = GAME_DEFS[g];
            if (def && !def.available) {
                if (window.mcwut && window.mcwut.toast) {
                    window.mcwut.toast(def.name + " is coming soon!", { kind: "info" });
                }
                return;
            }
            for (var j = 0; j < hallPills.length; j++) {
                var match = hallPills[j] === this;
                hallPills[j].classList.toggle("is-active", match);
                hallPills[j].setAttribute("aria-selected", match ? "true" : "false");
            }
            loadHubLeaderboard(g);
        });
    }

    window.addEventListener("popstate", function () {
        var sp = new URLSearchParams(window.location.search);
        var g = sp.get("game");
        if (g && GAME_DEFS[g] && GAME_DEFS[g].available) {
            launchGame(g, false);
        } else {
            showHub(false);
        }
    });

    // --- Input Bindings ---
    if (startBtn) {
        startBtn.addEventListener("click", function (ev) {
            ev.stopPropagation();
            startGame();
        });
    }

    if (againBtn) {
        againBtn.addEventListener("click", function (ev) {
            ev.stopPropagation();
            startGame();
        });
    }

    if (restartBtn) {
        restartBtn.addEventListener("click", function () {
            if (GAME_KEY === "mini-crossword") {
                loadCrosswordPuzzle(cwState.puzzleIdx);
            } else if (GAME_KEY === "minesweeper") {
                msNewGame();
            } else if (GAME_KEY === "neon-slope") {
                slopeStartGame();
            } else if (GAME_KEY === "merge-2048") {
                n2048StartGame();
            } else if (GAME_KEY === "wacky-wheels") {
                wwStartGame();
            } else if (GAME_KEY === "brick-breaker") {
                cbStartGame();
            } else if (GAME_KEY === "hextris") {
                hxStartGame();
            } else if (GAME_KEY === "meme-merge") {
                if (typeof mmStartGame === "function") mmStartGame();
            } else if (GAME_KEY === "godzilla-rampage") {
                if (typeof gzStartGame === "function") gzStartGame();
            } else if (GAME_KEY === "subway-surfer") {
                if (typeof ssStartGame === "function") ssStartGame();
            } else {
                startGame();
            }
        });
    }

    if (refreshBtn) {
        refreshBtn.addEventListener("click", function () {
            loadLeaderboard();
        });
    }

    viewport.addEventListener("pointerdown", function (ev) {
        if (GAME_KEY !== "stack-3d") return;
        if (ev.target.closest("button") || ev.target.closest("a")) {
            return;
        }
        if (state.mode === "playing") {
            ev.preventDefault();
            placeActiveSlab();
        } else if (state.mode === "idle") {
            ev.preventDefault();
            startGame();
        }
    });

    window.addEventListener("keydown", function (ev) {
        var tag = document.activeElement ? document.activeElement.tagName : "";
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
            return;
        }
        if (GAME_KEY === "wacky-wheels" && wwState.mode === "editor" && (ev.ctrlKey || ev.metaKey) && (ev.key === "z" || ev.key === "Z")) {
            ev.preventDefault();
            wwEditorUndo();
            return;
        }
        if (ev.ctrlKey || ev.metaKey || ev.altKey) {
            return;
        }
        if (stageView && stageView.hidden) {
            return;
        }

        if (GAME_KEY === "wacky-wheels") {
            if (wwPublishOverlay && !wwPublishOverlay.hidden) {
                if (ev.key === "Escape") {
                    wwPublishOverlay.hidden = true;
                }
                return;
            }
            if (wwLevelsOverlay && !wwLevelsOverlay.hidden) {
                if (ev.key === "Escape") {
                    wwLevelsOverlay.hidden = true;
                    wwSyncModeUi();
                }
                return;
            }
            if (wwState.mode === "editor") {
                if (ev.code === "ArrowLeft" || ev.key === "a" || ev.key === "A") {
                    ev.preventDefault();
                    wwState.camX = Math.max(-80, wwState.camX - 140);
                    wwEditor.savedCamX = wwState.camX;
                } else if (ev.code === "ArrowRight" || ev.key === "d" || ev.key === "D") {
                    ev.preventDefault();
                    wwState.camX = Math.min(12200, wwState.camX + 140);
                    wwEditor.savedCamX = wwState.camX;
                } else if (ev.code === "ArrowUp" || ev.key === "w" || ev.key === "W") {
                    ev.preventDefault();
                    wwState.camY = Math.max(-360, wwState.camY - 90);
                    wwEditor.savedCamY = wwState.camY;
                } else if (ev.code === "ArrowDown" || ev.key === "s" || ev.key === "S") {
                    ev.preventDefault();
                    wwState.camY = Math.min(720, wwState.camY + 90);
                    wwEditor.savedCamY = wwState.camY;
                } else if (ev.key === "Delete" || ev.key === "Backspace") {
                    if (typeof wwDeleteSelected === "function" && wwDeleteSelected()) {
                        ev.preventDefault();
                    }
                } else if (ev.key === "+" || ev.key === "=") {
                    if (typeof wwSetEditorZoom === "function") {
                        ev.preventDefault();
                        wwSetEditorZoom((wwEditor.zoom || 0.88) + 0.14);
                    }
                } else if (ev.key === "-" || ev.key === "_") {
                    if (typeof wwSetEditorZoom === "function") {
                        ev.preventDefault();
                        wwSetEditorZoom((wwEditor.zoom || 0.88) - 0.14);
                    }
                }
                return;
            }
            if (ev.key === "r" || ev.key === "R") {
                ev.preventDefault();
                wwStartGame();
            } else if (ev.key === "c" || ev.key === "C") {
                if (!ev.repeat && typeof wwRespawnAtCheckpoint === "function" && wwRespawnAtCheckpoint()) {
                    ev.preventDefault();
                }
            } else if (ev.code === "ArrowUp" || ev.key === "w" || ev.key === "W") {
                ev.preventDefault();
                if (wwState.mode === "idle") wwStartGame();
                wwInput.gas = true;
            } else if (ev.code === "ArrowDown" || ev.key === "s" || ev.key === "S") {
                ev.preventDefault();
                if (wwState.mode === "idle") wwStartGame();
                wwInput.brake = true;
            } else if (ev.code === "ArrowLeft" || ev.key === "a" || ev.key === "A") {
                ev.preventDefault();
                wwInput.left = true;
            } else if (ev.code === "ArrowRight" || ev.key === "d" || ev.key === "D") {
                ev.preventDefault();
                wwInput.right = true;
            } else if (ev.code === "Space") {
                ev.preventDefault();
                if (!ev.repeat) {
                    if (wwState.mode === "idle" || wwState.mode === "gameover") {
                        wwStartGame();
                    } else {
                        wwTriggerEjectOrBoost();
                    }
                }
            } else if (ev.key === "Enter") {
                if (wwState.mode === "idle" || wwState.mode === "gameover") {
                    ev.preventDefault();
                    wwStartGame();
                }
            }
            return;
        }

        if (GAME_KEY === "neon-slope") {
            if (ev.key === "r" || ev.key === "R") {
                ev.preventDefault();
                slopeStartGame();
            } else if (ev.code === "ArrowLeft" || ev.key === "a" || ev.key === "A") {
                ev.preventDefault();
                slopeInput.left = true;
            } else if (ev.code === "ArrowRight" || ev.key === "d" || ev.key === "D") {
                ev.preventDefault();
                slopeInput.right = true;
            } else if (ev.code === "Space" || ev.code === "ArrowUp" || ev.key === "w" || ev.key === "W") {
                ev.preventDefault();
                if (slopeState.mode === "idle" || slopeState.mode === "gameover") {
                    slopeStartGame();
                } else {
                    slopeJump();
                }
            }
            return;
        }

        if (GAME_KEY === "merge-2048") {
            if (ev.key === "r" || ev.key === "R") {
                ev.preventDefault();
                n2048StartGame();
            } else if (ev.key === "z" || ev.key === "Z" || ev.key === "u" || ev.key === "U") {
                ev.preventDefault();
                n2048Undo();
            } else if (ev.code === "ArrowLeft" || ev.key === "a" || ev.key === "A") {
                ev.preventDefault();
                n2048Slide("left");
            } else if (ev.code === "ArrowRight" || ev.key === "d" || ev.key === "D") {
                ev.preventDefault();
                n2048Slide("right");
            } else if (ev.code === "ArrowUp" || ev.key === "w" || ev.key === "W") {
                ev.preventDefault();
                n2048Slide("up");
            } else if (ev.code === "ArrowDown" || ev.key === "s" || ev.key === "S") {
                ev.preventDefault();
                n2048Slide("down");
            } else if (ev.code === "Space" || ev.key === "Enter") {
                if (n2048State.mode === "idle" || n2048State.mode === "gameover") {
                    ev.preventDefault();
                    n2048StartGame();
                }
            }
            return;
        }

        if (GAME_KEY === "minesweeper") {
            if (ev.key === "r" || ev.key === "R") {
                ev.preventDefault();
                msNewGame();
            } else if (ev.key === "f" || ev.key === "F") {
                ev.preventDefault();
                msToggleFlagMode();
            } else if (ev.key === "1") {
                ev.preventDefault();
                msSetDifficulty("easy");
            } else if (ev.key === "2") {
                ev.preventDefault();
                msSetDifficulty("medium");
            } else if (ev.key === "3") {
                ev.preventDefault();
                msSetDifficulty("hard");
            } else if (ev.code === "Space" || ev.key === "Enter") {
                if ((msStartOverlay && !msStartOverlay.hidden) || (msOverOverlay && !msOverOverlay.hidden)) {
                    ev.preventDefault();
                    msNewGame();
                }
            }
            return;
        }

        if (GAME_KEY === "mini-crossword") {
            if (ev.key && ev.key.length === 1 && /^[a-zA-Z]$/.test(ev.key)) {
                ev.preventDefault();
                inputCwLetter(ev.key);
            } else if (ev.key === "Backspace" || ev.key === "Delete") {
                ev.preventDefault();
                handleCwBackspace();
            } else if (ev.code === "Space") {
                ev.preventDefault();
                cwState.dir = cwState.dir === "across" ? "down" : "across";
                updateCwBoardUi();
            } else if (ev.key === "Tab") {
                ev.preventDefault();
                cycleCwWord(ev.shiftKey ? -1 : 1);
            } else if (ev.key === "ArrowRight") {
                ev.preventDefault();
                cwState.dir = "across";
                stepCwCursor(1);
                updateCwBoardUi();
            } else if (ev.key === "ArrowLeft") {
                ev.preventDefault();
                cwState.dir = "across";
                stepCwCursor(-1);
                updateCwBoardUi();
            } else if (ev.key === "ArrowDown") {
                ev.preventDefault();
                cwState.dir = "down";
                stepCwCursor(1);
                updateCwBoardUi();
            } else if (ev.key === "ArrowUp") {
                ev.preventDefault();
                cwState.dir = "down";
                stepCwCursor(-1);
                updateCwBoardUi();
            }
            return;
        }

        if (GAME_KEY === "hextris") {
            if (ev.key === "r" || ev.key === "R") {
                ev.preventDefault();
                hxStartGame();
            } else if (ev.code === "ArrowLeft" || ev.key === "a" || ev.key === "A") {
                ev.preventDefault();
                if (hxGame && hxState.running) hxGame.rotateLeft();
            } else if (ev.code === "ArrowRight" || ev.key === "d" || ev.key === "D") {
                ev.preventDefault();
                if (hxGame && hxState.running) hxGame.rotateRight();
            } else if (ev.code === "ArrowDown" || ev.key === "s" || ev.key === "S") {
                ev.preventDefault();
                if (hxGame && hxState.running) hxGame.setSoftDrop(true);
            } else if (ev.code === "Space") {
                ev.preventDefault();
                if (!hxState.running) {
                    hxStartGame();
                } else if (hxGame) {
                    hxGame.togglePause();
                }
            }
            return;
        }

        if (GAME_KEY === "meme-merge") {
            if (ev.key === "r" || ev.key === "R") {
                ev.preventDefault();
                if (typeof mmStartGame === "function") mmStartGame();
            } else if (window.mmGame) {
                window.mmGame.handleKeyDown(ev.code);
            }
            return;
        }

        if (GAME_KEY === "godzilla-rampage") {
            if (ev.key === "r" || ev.key === "R") {
                ev.preventDefault();
                if (typeof gzStartGame === "function") gzStartGame();
                return;
            }
            if (typeof gzHandleKey === "function") {
                var handled = gzHandleKey(ev, true);
                if (handled) ev.preventDefault();
            }
            return;
        }

        if (GAME_KEY === "subway-surfer") {
            if (ev.key === "r" || ev.key === "R") {
                ev.preventDefault();
                if (typeof ssStartGame === "function") ssStartGame();
                return;
            }
            if (typeof ssHandleKey === "function") {
                var ssHandled = ssHandleKey(ev, true);
                if (ssHandled) ev.preventDefault();
            }
            return;
        }

        if (ev.code === "Space" || ev.code === "ArrowDown" || ev.code === "Enter") {
            if (state.mode === "playing") {
                ev.preventDefault();
                placeActiveSlab();
            } else if (state.mode === "idle" || state.mode === "gameover") {
                ev.preventDefault();
                startGame();
            }
        } else if (ev.key === "r" || ev.key === "R") {
            if (state.mode === "playing" || state.mode === "gameover") {
                ev.preventDefault();
                startGame();
            }
        }
    });

    window.addEventListener("keyup", function (ev) {
        if (GAME_KEY === "neon-slope") {
            if (ev.code === "ArrowLeft" || ev.key === "a" || ev.key === "A") {
                slopeInput.left = false;
            } else if (ev.code === "ArrowRight" || ev.key === "d" || ev.key === "D") {
                slopeInput.right = false;
            }
        } else if (GAME_KEY === "wacky-wheels") {
            if (ev.code === "ArrowUp" || ev.key === "w" || ev.key === "W") {
                wwInput.gas = false;
            } else if (ev.code === "ArrowDown" || ev.key === "s" || ev.key === "S") {
                wwInput.brake = false;
            } else if (ev.code === "ArrowLeft" || ev.key === "a" || ev.key === "A") {
                wwInput.left = false;
            } else if (ev.code === "ArrowRight" || ev.key === "d" || ev.key === "D") {
                wwInput.right = false;
            }
        } else if (GAME_KEY === "hextris") {
            if (ev.code === "ArrowDown" || ev.key === "s" || ev.key === "S") {
                if (hxGame) hxGame.setSoftDrop(false);
            }
        } else if (GAME_KEY === "godzilla-rampage") {
            if (typeof gzHandleKey === "function") {
                gzHandleKey(ev, false);
            }
        } else if (GAME_KEY === "subway-surfer") {
            if (typeof ssHandleKey === "function") {
                ssHandleKey(ev, false);
            }
        }
    });

    window.addEventListener("blur", function () {
        wwInput.gas = false;
        wwInput.brake = false;
        wwInput.left = false;
        wwInput.right = false;
        wwSilenceAudio();
        if (typeof gzClearInput === "function") gzClearInput();
        if (typeof ssClearInput === "function") ssClearInput();
    });

    // --- Boot ---
    function boot() {
        if (typeof initGraphics === "function") initGraphics();
        if (typeof slopeInitGraphics === "function") slopeInitGraphics();
        if (typeof gzInitGraphics === "function") gzInitGraphics();
        if (typeof ssInitGraphics === "function") ssInitGraphics();
        if (typeof setupIdleDemo === "function") setupIdleDemo();
        if (typeof updateViewportBackground === "function" && typeof state !== "undefined" && state) {
            updateViewportBackground(state.baseHue);
        }
        if (typeof initCrosswordEvents === "function") initCrosswordEvents();
        if (typeof n2048RenderBoard === "function") n2048RenderBoard();
        if (typeof wwResetWorld === "function") wwResetWorld();

        // Support deep-linking via ?game=stack-3d, ?game=mini-crossword, ?game=minesweeper, ?game=neon-slope, ?game=merge-2048, or ?game=wacky-wheels(&level=...)
        var params = new URLSearchParams(window.location.search);
        var linkedGame = params.get("game");
        var linkedLevel = params.get("level");
        if (linkedGame && typeof GAME_DEFS !== "undefined" && GAME_DEFS[linkedGame] && GAME_DEFS[linkedGame].available) {
            launchGame(linkedGame, false);
            if (linkedGame === "wacky-wheels" && linkedLevel && typeof wwLoadAndPlayCustomLevel === "function") {
                wwLoadAndPlayCustomLevel(linkedLevel, "play", false);
            }
        } else {
            if (linkedGame && typeof GAME_DEFS !== "undefined" && GAME_DEFS[linkedGame] && !GAME_DEFS[linkedGame].available) {
                if (window.mcwut && window.mcwut.toast) {
                    window.mcwut.toast(GAME_DEFS[linkedGame].name + " is coming soon!", { kind: "info" });
                }
            }
            showHub(false);
        }
        if (typeof loop === "function") requestAnimationFrame(loop);
    }

    var SUBMODULES = [
        "games-audio.js",
        "games-leaderboard.js",
        "games-stack3d.js",
        "games-crossword.js",
        "games-minesweeper.js",
        "games-neon-slope.js",
        "games-2048.js",
        "games-wacky-wheels.js",
        "games-breakout.js",
        "games-hextris.js",
        "games-meme-merge.js",
        "games-godzilla.js",
        "games-subway-surfer.js"
    ];

    function ensureSubmodules(onReady) {
        if (window.McWutGames && window.McWutGames.stack3d && window.McWutGames.crossword) {
            onReady();
            return;
        }
        var pending = 0;
        for (var i = 0; i < SUBMODULES.length; i++) {
            var file = SUBMODULES[i];
            if (!document.querySelector('script[src*="' + file + '"]')) {
                pending++;
                var s = document.createElement("script");
                s.src = "/js/" + file;
                s.onload = s.onerror = function () {
                    pending--;
                    if (pending <= 0) onReady();
                };
                document.head.appendChild(s);
            }
        }
        if (pending === 0) {
            onReady();
        }
    }

    ensureSubmodules(boot);


    window.McWutGames.hub = {
        showHub: showHub,
        launchGame: launchGame,
        switchGame: switchGame,
        getActiveGameKey: function () { return window.McWutGames.activeGameKey; }
    };

    window.showHub = showHub;
    window.launchGame = launchGame;
    window.switchGame = switchGame;
})();
