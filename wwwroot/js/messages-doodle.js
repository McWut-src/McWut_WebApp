// McWut Messages 2-Layer Touch Doodle Pad Helper
(() => {
    const DOODLE_COLORS = ["#142033", "#e53935", "#fb8c00", "#fdd835", "#43a047", "#1e88e5", "#8e24aa", "#ec407a"];

    function init(opts) {
        const {
            doodleModalEl,
            doodleBgCanvas,
            doodleDrawCanvas,
            doodleSwatchesEl,
            doodleSizesEl,
            doodleEraserBtn,
            doodleUndoBtn,
            doodleBgBtn,
            doodleBgInput,
            doodleClearBtn,
            doodleSendBtn,
            doodleBtn,
            onSend,
            onError,
            canSend
        } = opts;

        if (!doodleBgCanvas || !doodleDrawCanvas || !doodleModalEl) {
            return;
        }

        let doodleColor = DOODLE_COLORS[0];
        let doodleSize = 5;
        let doodleErasing = false;
        let doodleDrawing = false;
        let doodleLast = null;
        let doodleHistory = [];

        const bgCtx = doodleBgCanvas.getContext("2d");
        const drawCtx = doodleDrawCanvas.getContext("2d");

        function fillWhiteBg() {
            bgCtx.fillStyle = "#ffffff";
            bgCtx.fillRect(0, 0, doodleBgCanvas.width, doodleBgCanvas.height);
        }
        fillWhiteBg();

        if (doodleSwatchesEl && doodleSwatchesEl.children.length === 0) {
            DOODLE_COLORS.forEach((hex, idx) => {
                const sw = document.createElement("button");
                sw.type = "button";
                sw.className = "doodle-swatch" + (idx === 0 ? " active" : "");
                sw.style.background = hex;
                sw.setAttribute("aria-label", `Color ${hex}`);
                sw.addEventListener("click", () => {
                    doodleColor = hex;
                    doodleErasing = false;
                    doodleEraserBtn?.classList.remove("active");
                    doodleSwatchesEl.querySelectorAll(".doodle-swatch").forEach(b => b.classList.remove("active"));
                    sw.classList.add("active");
                });
                doodleSwatchesEl.append(sw);
            });
        }

        doodleSizesEl?.addEventListener("click", (ev) => {
            const btn = ev.target.closest("[data-size]");
            if (!btn) return;
            doodleSize = Number(btn.getAttribute("data-size")) || 5;
            doodleSizesEl.querySelectorAll(".doodle-size-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
        });

        doodleEraserBtn?.addEventListener("click", () => {
            doodleErasing = !doodleErasing;
            doodleEraserBtn.classList.toggle("active", doodleErasing);
            if (doodleErasing) {
                doodleSwatchesEl?.querySelectorAll(".doodle-swatch").forEach(b => b.classList.remove("active"));
            }
        });

        function saveUndoState() {
            try {
                if (doodleHistory.length >= 12) {
                    doodleHistory.shift();
                }
                doodleHistory.push(drawCtx.getImageData(0, 0, doodleDrawCanvas.width, doodleDrawCanvas.height));
            } catch {}
        }

        doodleUndoBtn?.addEventListener("click", () => {
            const prev = doodleHistory.pop();
            if (prev) {
                drawCtx.putImageData(prev, 0, 0);
            } else {
                drawCtx.clearRect(0, 0, doodleDrawCanvas.width, doodleDrawCanvas.height);
            }
        });

        doodleClearBtn?.addEventListener("click", () => {
            saveUndoState();
            drawCtx.clearRect(0, 0, doodleDrawCanvas.width, doodleDrawCanvas.height);
            fillWhiteBg();
        });

        doodleBgBtn?.addEventListener("click", () => doodleBgInput?.click());
        doodleBgInput?.addEventListener("change", () => {
            const file = doodleBgInput.files && doodleBgInput.files[0];
            if (!file) return;
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => {
                fillWhiteBg();
                const scale = Math.min(doodleBgCanvas.width / img.width, doodleBgCanvas.height / img.height);
                const w = img.width * scale;
                const h = img.height * scale;
                const x = (doodleBgCanvas.width - w) / 2;
                const y = (doodleBgCanvas.height - h) / 2;
                bgCtx.drawImage(img, x, y, w, h);
                URL.revokeObjectURL(url);
            };
            img.onerror = () => URL.revokeObjectURL(url);
            img.src = url;
            doodleBgInput.value = "";
        });

        function canvasCoords(ev) {
            const rect = doodleDrawCanvas.getBoundingClientRect();
            const scaleX = doodleDrawCanvas.width / (rect.width || 1);
            const scaleY = doodleDrawCanvas.height / (rect.height || 1);
            return {
                x: (ev.clientX - rect.left) * scaleX,
                y: (ev.clientY - rect.top) * scaleY
            };
        }

        function strokeSegment(from, to) {
            drawCtx.save();
            drawCtx.lineCap = "round";
            drawCtx.lineJoin = "round";
            drawCtx.lineWidth = doodleErasing ? doodleSize * 2.2 : doodleSize;
            drawCtx.globalCompositeOperation = doodleErasing ? "destination-out" : "source-over";
            drawCtx.strokeStyle = doodleColor;
            drawCtx.beginPath();
            drawCtx.moveTo(from.x, from.y);
            drawCtx.lineTo(to.x, to.y);
            drawCtx.stroke();
            drawCtx.restore();
        }

        doodleDrawCanvas.addEventListener("pointerdown", (ev) => {
            ev.preventDefault();
            try { doodleDrawCanvas.setPointerCapture(ev.pointerId); } catch {}
            saveUndoState();
            doodleDrawing = true;
            const pt = canvasCoords(ev);
            doodleLast = pt;
            strokeSegment(pt, { x: pt.x + 0.1, y: pt.y + 0.1 });
        });

        doodleDrawCanvas.addEventListener("pointermove", (ev) => {
            if (!doodleDrawing || !doodleLast) return;
            ev.preventDefault();
            const pt = canvasCoords(ev);
            strokeSegment(doodleLast, pt);
            doodleLast = pt;
        });

        function endStroke() {
            doodleDrawing = false;
            doodleLast = null;
        }
        doodleDrawCanvas.addEventListener("pointerup", endStroke);
        doodleDrawCanvas.addEventListener("pointercancel", endStroke);

        doodleBtn?.addEventListener("click", () => {
            if (!window.bootstrap) return;
            window.bootstrap.Modal.getOrCreateInstance(doodleModalEl).show();
        });

        doodleSendBtn?.addEventListener("click", async () => {
            if (typeof canSend === "function" && !canSend()) return;
            doodleSendBtn.disabled = true;
            try {
                const out = document.createElement("canvas");
                out.width = doodleBgCanvas.width;
                out.height = doodleBgCanvas.height;
                const outCtx = out.getContext("2d");
                outCtx.drawImage(doodleBgCanvas, 0, 0);
                outCtx.drawImage(doodleDrawCanvas, 0, 0);

                const blob = await new Promise((resolve, reject) => {
                    out.toBlob(b => b ? resolve(b) : reject(new Error("Could not export drawing.")), "image/png");
                });

                window.bootstrap?.Modal.getInstance(doodleModalEl)?.hide();
                if (typeof onSend === "function") {
                    await onSend(blob);
                }

                drawCtx.clearRect(0, 0, doodleDrawCanvas.width, doodleDrawCanvas.height);
                fillWhiteBg();
                doodleHistory = [];
            } catch (err) {
                if (typeof onError === "function") {
                    onError(err.message);
                }
            } finally {
                doodleSendBtn.disabled = false;
            }
        });
    }

    window.McWutMessagesDoodle = { init };
})();
