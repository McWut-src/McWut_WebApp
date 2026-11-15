// McWut Simple Family Gift Lists
(() => {
    const pageEl = document.getElementById("gifts-page");
    if (!pageEl) return;

    const currentUserId = pageEl.dataset.currentUserId;

    const membersListEl = document.getElementById("gifts-members-list");
    const activeDotEl = document.getElementById("gifts-active-dot");
    const activeNameEl = document.getElementById("gifts-active-name");
    const activeKidBadge = document.getElementById("gifts-active-kid-badge");
    const activeCountEl = document.getElementById("gifts-active-count");

    // Composer Elements
    const composerCard = document.getElementById("gifts-composer");
    const dropzoneEl = document.getElementById("gifts-dropzone");
    const addForm = document.getElementById("gift-add-form");
    const titleInput = document.getElementById("gift-title");
    const urlInput = document.getElementById("gift-url");
    const descInput = document.getElementById("gift-desc");
    const photoBtn = document.getElementById("gift-photo-btn");
    const photoInput = document.getElementById("gift-photo-input");
    const voiceBtn = document.getElementById("gift-voice-btn");
    const voiceInput = document.getElementById("gift-voice-input");
    const doodleBtn = document.getElementById("gift-doodle-btn");
    const submitBtn = document.getElementById("gift-submit-btn");

    const voiceBar = document.getElementById("gift-voice-bar");
    const voiceTimerEl = document.getElementById("gift-voice-timer");
    const voiceCancelBtn = document.getElementById("gift-voice-cancel");
    const voiceStopBtn = document.getElementById("gift-voice-stop");

    const attachBox = document.getElementById("gift-attachment-box");
    const attachThumb = document.getElementById("gift-attachment-thumb");
    const attachAudio = document.getElementById("gift-attachment-audio");
    const attachTypeEl = document.getElementById("gift-attachment-type");
    const attachStatusEl = document.getElementById("gift-attachment-status");
    const attachClearBtn = document.getElementById("gift-attach-clear");

    const gridEl = document.getElementById("gifts-grid");
    const emptyStateEl = document.getElementById("gifts-empty-state");
    const emptyMsgEl = document.getElementById("gifts-empty-msg");

    // Doodle Modal Elements
    const doodleModalEl = document.getElementById("gifts-doodle-modal");
    const doodleSwatchesEl = document.getElementById("gifts-doodle-swatches");
    const doodleSizesEl = document.getElementById("gifts-doodle-sizes");
    const doodleBgBtn = document.getElementById("gifts-doodle-bg-btn");
    const doodleBgInput = document.getElementById("gifts-doodle-bg-input");
    const doodleEraserBtn = document.getElementById("gifts-doodle-eraser");
    const doodleUndoBtn = document.getElementById("gifts-doodle-undo");
    const doodleClearBtn = document.getElementById("gifts-doodle-clear");
    const doodleSaveBtn = document.getElementById("gifts-doodle-save-btn");
    const doodleBgCanvas = document.getElementById("gifts-doodle-bg");
    const doodleDrawCanvas = document.getElementById("gifts-doodle-draw");

    // Lightbox & Edit Modals
    const lightboxModalEl = document.getElementById("gifts-lightbox-modal");
    const lightboxImg = document.getElementById("gifts-lightbox-img");

    const editModalEl = document.getElementById("gifts-edit-modal");
    const editForm = document.getElementById("gifts-edit-form");
    const editIdInput = document.getElementById("edit-gift-id");
    const editTitleInput = document.getElementById("edit-gift-title");
    const editUrlInput = document.getElementById("edit-gift-url");
    const editDescInput = document.getElementById("edit-gift-desc");
    const editAttachRow = document.getElementById("edit-gift-attachment-row");
    const editRemoveAttachInput = document.getElementById("edit-gift-remove-attachment");

    // Move modals to body to prevent stacking context issues over background wallpaper/headers
    [doodleModalEl, lightboxModalEl, editModalEl].forEach(m => {
        if (m && m.parentElement !== document.body) {
            document.body.appendChild(m);
        }
    });

    const bsDoodleModal = doodleModalEl && window.bootstrap ? new window.bootstrap.Modal(doodleModalEl) : null;
    const bsLightboxModal = lightboxModalEl && window.bootstrap ? new window.bootstrap.Modal(lightboxModalEl) : null;
    const bsEditModal = editModalEl && window.bootstrap ? new window.bootstrap.Modal(editModalEl) : null;

    const modalState = new WeakMap();
    [doodleModalEl, lightboxModalEl, editModalEl].forEach(el => {
        if (!el) return;
        const state = { opening: false, closeAfterShow: false };
        modalState.set(el, state);
        el.addEventListener("show.bs.modal", () => {
            state.opening = true;
            state.closeAfterShow = false;
        });
        el.addEventListener("shown.bs.modal", () => {
            state.opening = false;
            if (state.closeAfterShow) {
                state.closeAfterShow = false;
                window.bootstrap?.Modal.getInstance(el)?.hide();
            }
        });
        el.addEventListener("hidden.bs.modal", () => {
            state.opening = false;
            state.closeAfterShow = false;
        });
    });

    function hideModal(bsModal, el) {
        if (!bsModal || !el) return;
        const st = modalState.get(el);
        if (st && st.opening) {
            st.closeAfterShow = true;
            return;
        }
        bsModal.hide();
    }

    const antiforgery = document.querySelector('meta[name="request-verification-token"]')?.getAttribute("content") || "";

    function headers(extra) {
        return Object.assign({
            "RequestVerificationToken": antiforgery,
            "Accept": "application/json",
            "Cache-Control": "no-store"
        }, extra || {});
    }

    async function api(url, options) {
        const res = await fetch(url, options);
        if (!res.ok) {
            let msg = `HTTP ${res.status}`;
            try {
                const json = await res.json();
                if (json && json.error) msg = json.error;
            } catch {
                // Ignore parse errors
            }
            throw new Error(msg);
        }
        if (res.status === 204) return null;
        const text = await res.text();
        return text ? JSON.parse(text) : null;
    }

    function toast(text, kind) {
        if (window.mcwut && window.mcwut.toast) {
            window.mcwut.toast(text, { kind: kind || "info", duration: 3200 });
        }
    }

    function formatDuration(sec) {
        const s = Math.max(0, Math.floor(Number(sec) || 0));
        return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
    }

    let members = [];
    let selectedOwnerId = currentUserId;
    let currentItems = [];
    let stagedAttachment = null; // { fileId, kind: 'photo'|'drawing'|'voice', thumbUrl?, audioUrl?, fileName, objectUrl? }

    let voiceRecorder = null;
    let voiceChunks = [];
    let voiceTimer = 0;
    let voiceStartedAt = 0;
    let voiceAction = "cancel";

    // --- UPLOAD LOGIC ---
    async function uploadBlob(blob, fileName, contentType) {
        const begin = await api("/api/uploads", {
            method: "POST",
            headers: headers({ "Content-Type": "application/json" }),
            body: JSON.stringify({
                fileName: fileName || "upload.bin",
                contentType: contentType || "application/octet-stream",
                sizeBytes: blob.size,
                isChatOnly: true,
                retention: { days: 0 }
            })
        });

        const putRes = await fetch(`/api/uploads/${encodeURIComponent(begin.sessionId)}`, {
            method: "PUT",
            headers: headers({ "Content-Type": "application/octet-stream" }),
            body: blob
        });

        if (!putRes.ok) {
            throw new Error(`Upload failed (${putRes.status})`);
        }

        return await api(`/api/uploads/${encodeURIComponent(begin.sessionId)}/complete`, {
            method: "POST",
            headers: headers()
        });
    }

    function setStagedAttachment(att) {
        if (stagedAttachment?.objectUrl && stagedAttachment.objectUrl !== att?.objectUrl) {
            URL.revokeObjectURL(stagedAttachment.objectUrl);
        }
        stagedAttachment = att;

        if (!att) {
            attachBox?.classList.add("d-none");
            if (attachThumb) {
                attachThumb.classList.add("d-none");
                attachThumb.removeAttribute("src");
            }
            if (attachAudio) {
                attachAudio.pause();
                attachAudio.classList.add("d-none");
                attachAudio.removeAttribute("src");
            }
            return;
        }

        if (att.kind === "voice") {
            if (attachThumb) {
                attachThumb.classList.add("d-none");
                attachThumb.removeAttribute("src");
            }
            if (attachAudio) {
                attachAudio.src = att.audioUrl || "";
                attachAudio.classList.remove("d-none");
            }
            if (attachTypeEl) attachTypeEl.textContent = "🎤 Voice Note";
        } else {
            if (attachAudio) {
                attachAudio.pause();
                attachAudio.classList.add("d-none");
                attachAudio.removeAttribute("src");
            }
            if (attachThumb) {
                attachThumb.src = att.thumbUrl || "";
                attachThumb.classList.remove("d-none");
            }
            if (attachTypeEl) attachTypeEl.textContent = att.kind === "drawing" ? "🎨 Drawing" : "📷 Image";
        }

        if (attachStatusEl) attachStatusEl.textContent = att.status || "Ready to add";
        attachBox?.classList.remove("d-none");
    }

    attachClearBtn?.addEventListener("click", () => setStagedAttachment(null));

    // --- IMAGE PICKER, DROPZONE & PASTE ---
    photoBtn?.addEventListener("click", () => photoInput?.click());

    photoInput?.addEventListener("change", async () => {
        if (!photoInput.files || photoInput.files.length === 0) return;
        const file = photoInput.files[0];
        photoInput.value = "";
        await handleImageUpload(file);
    });

    async function handleImageUpload(file) {
        if (!file || file.size <= 0) {
            toast("That image is empty.", "danger");
            return;
        }

        const localUrl = URL.createObjectURL(file);
        try {
            if (submitBtn) submitBtn.disabled = true;
            setStagedAttachment({
                fileId: null,
                kind: "photo",
                thumbUrl: localUrl,
                objectUrl: localUrl,
                fileName: file.name,
                status: "Uploading image…"
            });

            const stored = await uploadBlob(file, file.name || "gift-image.jpg", file.type || "image/jpeg");
            setStagedAttachment({
                fileId: stored.id,
                kind: "photo",
                thumbUrl: `/api/files/${encodeURIComponent(stored.id)}/content?preview=true`,
                fileName: stored.originalFileName || file.name,
                status: "Ready to add"
            });
            toast("Image attached!", "success");
        } catch (err) {
            setStagedAttachment(null);
            toast(err.message, "danger");
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
    }

    // --- VOICE RECORDING & AUDIO UPLOAD ---
    function stopActiveRecording(action) {
        if (voiceRecorder && voiceRecorder.state !== "inactive") {
            voiceAction = action || "cancel";
            voiceRecorder.stop();
        }
    }

    async function handleAudioUpload(fileOrBlob, overrideName, overrideType) {
        if (!fileOrBlob || fileOrBlob.size <= 0) {
            toast("That voice note is empty.", "danger");
            return;
        }

        const fileName = overrideName || fileOrBlob.name || "gift-voice.webm";
        const contentType = overrideType || fileOrBlob.type || "audio/webm";
        const localUrl = URL.createObjectURL(fileOrBlob);

        try {
            if (submitBtn) submitBtn.disabled = true;
            setStagedAttachment({
                fileId: null,
                kind: "voice",
                audioUrl: localUrl,
                objectUrl: localUrl,
                fileName,
                status: "Uploading voice…"
            });

            const stored = await uploadBlob(fileOrBlob, fileName, contentType);
            setStagedAttachment({
                fileId: stored.id,
                kind: "voice",
                audioUrl: `/api/files/${encodeURIComponent(stored.id)}/content?preview=true`,
                fileName: stored.originalFileName || fileName,
                status: "Ready to add"
            });
            toast("Voice note attached!", "success");
        } catch (err) {
            setStagedAttachment(null);
            toast(err.message, "danger");
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
    }

    voiceInput?.addEventListener("change", async () => {
        if (!voiceInput.files || voiceInput.files.length === 0) return;
        const file = voiceInput.files[0];
        voiceInput.value = "";
        await handleAudioUpload(file);
    });

    voiceBtn?.addEventListener("click", async () => {
        if (voiceRecorder) return;

        if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
            voiceInput?.click();
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
            const mime = candidates.find(m => typeof MediaRecorder.isTypeSupported === "function" && MediaRecorder.isTypeSupported(m)) || "";
            voiceChunks = [];
            voiceAction = "cancel";
            voiceRecorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);

            voiceRecorder.addEventListener("dataavailable", (ev) => {
                if (ev.data && ev.data.size > 0) {
                    voiceChunks.push(ev.data);
                }
            });

            voiceRecorder.addEventListener("stop", async () => {
                window.clearInterval(voiceTimer);
                stream.getTracks().forEach(t => t.stop());
                voiceBar?.classList.add("d-none");
                if (voiceBtn) voiceBtn.disabled = false;

                const action = voiceAction;
                const actualType = (voiceRecorder && voiceRecorder.mimeType) || mime || "audio/webm";
                const cleanMime = actualType.split(";")[0] || "audio/webm";
                const ext = cleanMime.includes("mp4") ? ".m4a" : (cleanMime.includes("ogg") ? ".ogg" : ".webm");
                const blob = new Blob(voiceChunks, { type: cleanMime });
                voiceRecorder = null;
                voiceChunks = [];

                if (action !== "send" || blob.size === 0) {
                    return;
                }

                const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
                await handleAudioUpload(blob, `gift-voice-${stamp}${ext}`, cleanMime);
            });

            voiceStartedAt = Date.now();
            if (voiceTimerEl) voiceTimerEl.textContent = "0:00";
            voiceBar?.classList.remove("d-none");
            if (voiceBtn) voiceBtn.disabled = true;

            voiceTimer = window.setInterval(() => {
                const sec = Math.floor((Date.now() - voiceStartedAt) / 1000);
                if (voiceTimerEl) voiceTimerEl.textContent = formatDuration(sec);
                if (sec >= 120) {
                    stopActiveRecording("send");
                }
            }, 400);

            voiceRecorder.start();
        } catch {
            toast("Microphone unavailable — pick an audio file instead!", "info");
            voiceInput?.click();
        }
    });

    voiceCancelBtn?.addEventListener("click", () => stopActiveRecording("cancel"));
    voiceStopBtn?.addEventListener("click", () => stopActiveRecording("send"));

    // --- DRAG & DROP / PASTE ---
    ["dragenter", "dragover"].forEach(evtName => {
        composerCard?.addEventListener(evtName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzoneEl?.classList.add("is-dragover");
        });
    });

    ["dragleave", "dragend"].forEach(evtName => {
        composerCard?.addEventListener(evtName, (e) => {
            if (e.currentTarget === composerCard && e.relatedTarget && composerCard.contains(e.relatedTarget)) {
                return;
            }
            dropzoneEl?.classList.remove("is-dragover");
        });
    });

    async function handleDroppedData(dt) {
        dropzoneEl?.classList.remove("is-dragover");
        if (!dt) return;

        if (dt.files && dt.files.length > 0) {
            const file = dt.files[0];
            if (file.type.startsWith("image/")) {
                await handleImageUpload(file);
                return;
            }
            if (file.type.startsWith("audio/")) {
                await handleAudioUpload(file);
                return;
            }
        }

        const uriList = dt.getData("text/uri-list");
        if (uriList && /^https?:\/\//i.test(uriList.trim())) {
            if (urlInput) urlInput.value = uriList.trim();
            toast("Link added!", "info");
            return;
        }

        const text = dt.getData("text/plain");
        if (text) {
            const trimmed = text.trim();
            if (/^https?:\/\//i.test(trimmed) && !/\s/.test(trimmed)) {
                if (urlInput) urlInput.value = trimmed;
                toast("Link dropped into form!", "info");
            } else if (titleInput && !titleInput.value) {
                titleInput.value = trimmed.slice(0, 200);
                toast("Text added!", "info");
            } else if (descInput && !descInput.value) {
                descInput.value = trimmed.slice(0, 2000);
                toast("Notes added!", "info");
            }
        }
    }

    composerCard?.addEventListener("drop", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await handleDroppedData(e.dataTransfer);
    });

    document.addEventListener("paste", async (e) => {
        if (selectedOwnerId !== currentUserId) return;
        const target = e.target;
        if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
            if (!e.clipboardData?.files || e.clipboardData.files.length === 0) return;
        }

        const items = e.clipboardData?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf("image") !== -1) {
                const blob = items[i].getAsFile();
                if (blob) {
                    e.preventDefault();
                    await handleImageUpload(blob);
                    return;
                }
            }
        }
    });

    // --- 2-LAYER DOODLE + DRAW-ON-PHOTO PAD ---
    const DOODLE_COLORS = ["#d32f2f", "#388e3c", "#1976d2", "#f57c00", "#7b1fa2", "#0b1f3a", "#5d4037", "#000000"];
    let doodleColor = DOODLE_COLORS[0];
    let doodleSize = 7;
    let doodleErasing = false;
    let doodleDrawing = false;
    let doodleLast = null;
    let doodleHistory = [];

    const bgCtx = doodleBgCanvas?.getContext("2d");
    const drawCtx = doodleDrawCanvas?.getContext("2d");

    function fillWhiteBg() {
        if (!bgCtx || !doodleBgCanvas) return;
        bgCtx.fillStyle = "#ffffff";
        bgCtx.fillRect(0, 0, doodleBgCanvas.width, doodleBgCanvas.height);
    }

    function resetDoodleCanvas() {
        if (!bgCtx || !drawCtx || !doodleDrawCanvas) return;
        fillWhiteBg();
        drawCtx.clearRect(0, 0, doodleDrawCanvas.width, doodleDrawCanvas.height);
        doodleHistory = [];
        saveDoodleHistory();
    }

    function saveDoodleHistory() {
        if (!drawCtx || !doodleDrawCanvas) return;
        try {
            doodleHistory.push(drawCtx.getImageData(0, 0, doodleDrawCanvas.width, doodleDrawCanvas.height));
            if (doodleHistory.length > 25) doodleHistory.shift();
        } catch {
            // Ignore canvas security errors
        }
    }

    function loadBackgroundPhotoOntoCanvas(file) {
        if (!bgCtx || !doodleBgCanvas || !file) return;
        const objectUrl = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            fillWhiteBg();
            const cw = doodleBgCanvas.width;
            const ch = doodleBgCanvas.height;
            const scale = Math.min(cw / img.width, ch / img.height);
            const dw = img.width * scale;
            const dh = img.height * scale;
            const dx = (cw - dw) / 2;
            const dy = (ch - dh) / 2;
            bgCtx.drawImage(img, dx, dy, dw, dh);
            URL.revokeObjectURL(objectUrl);
            toast("Photo loaded! Draw or circle what you want.", "info");
        };
        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            toast("Could not load photo onto canvas.", "danger");
        };
        img.src = objectUrl;
    }

    function initDoodlePad() {
        if (!doodleBgCanvas || !doodleDrawCanvas || !drawCtx) return;
        resetDoodleCanvas();

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
                doodleSwatchesEl.appendChild(sw);
            });
        }

        doodleSizesEl?.querySelectorAll(".doodle-size-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                doodleSizesEl.querySelectorAll(".doodle-size-btn").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                doodleSize = parseInt(btn.dataset.size || "7", 10);
            });
        });

        doodleBgBtn?.addEventListener("click", () => doodleBgInput?.click());
        doodleBgInput?.addEventListener("change", () => {
            if (doodleBgInput.files && doodleBgInput.files.length > 0) {
                loadBackgroundPhotoOntoCanvas(doodleBgInput.files[0]);
                doodleBgInput.value = "";
            }
        });

        doodleEraserBtn?.addEventListener("click", () => {
            doodleErasing = !doodleErasing;
            doodleEraserBtn.classList.toggle("active", doodleErasing);
            if (doodleErasing) {
                doodleSwatchesEl?.querySelectorAll(".doodle-swatch").forEach(b => b.classList.remove("active"));
            } else {
                doodleSwatchesEl?.children[0]?.classList.add("active");
                doodleColor = DOODLE_COLORS[0];
            }
        });

        doodleUndoBtn?.addEventListener("click", () => {
            if (doodleHistory.length > 1) {
                doodleHistory.pop();
                drawCtx.putImageData(doodleHistory[doodleHistory.length - 1], 0, 0);
            } else if (doodleHistory.length === 1) {
                drawCtx.clearRect(0, 0, doodleDrawCanvas.width, doodleDrawCanvas.height);
            }
        });

        doodleClearBtn?.addEventListener("click", resetDoodleCanvas);

        function getCanvasPos(e) {
            const rect = doodleDrawCanvas.getBoundingClientRect();
            return {
                x: (e.clientX - rect.left) * (doodleDrawCanvas.width / rect.width),
                y: (e.clientY - rect.top) * (doodleDrawCanvas.height / rect.height)
            };
        }

        doodleDrawCanvas.addEventListener("pointerdown", (e) => {
            e.preventDefault();
            doodleDrawing = true;
            doodleLast = getCanvasPos(e);
            doodleDrawCanvas.setPointerCapture(e.pointerId);

            drawCtx.beginPath();
            drawCtx.arc(doodleLast.x, doodleLast.y, (doodleSize * (doodleErasing ? 2.5 : 1)) / 2, 0, Math.PI * 2);
            if (doodleErasing) {
                drawCtx.globalCompositeOperation = "destination-out";
                drawCtx.fillStyle = "rgba(0,0,0,1)";
            } else {
                drawCtx.globalCompositeOperation = "source-over";
                drawCtx.fillStyle = doodleColor;
            }
            drawCtx.fill();
        });

        doodleDrawCanvas.addEventListener("pointermove", (e) => {
            if (!doodleDrawing || !doodleLast) return;
            e.preventDefault();
            const cur = getCanvasPos(e);

            drawCtx.beginPath();
            drawCtx.moveTo(doodleLast.x, doodleLast.y);
            drawCtx.lineTo(cur.x, cur.y);
            drawCtx.lineCap = "round";
            drawCtx.lineJoin = "round";

            if (doodleErasing) {
                drawCtx.globalCompositeOperation = "destination-out";
                drawCtx.strokeStyle = "rgba(0,0,0,1)";
                drawCtx.lineWidth = doodleSize * 2.5;
            } else {
                drawCtx.globalCompositeOperation = "source-over";
                drawCtx.strokeStyle = doodleColor;
                drawCtx.lineWidth = doodleSize;
            }
            drawCtx.stroke();
            doodleLast = cur;
        });

        function endStroke() {
            if (doodleDrawing) {
                doodleDrawing = false;
                doodleLast = null;
                saveDoodleHistory();
            }
        }
        doodleDrawCanvas.addEventListener("pointerup", endStroke);
        doodleDrawCanvas.addEventListener("pointercancel", endStroke);
    }
    initDoodlePad();

    doodleBtn?.addEventListener("click", () => {
        resetDoodleCanvas();
        bsDoodleModal?.show();
    });

    doodleSaveBtn?.addEventListener("click", async () => {
        if (!doodleBgCanvas || !doodleDrawCanvas) return;
        try {
            doodleSaveBtn.disabled = true;
            doodleSaveBtn.textContent = "Saving…";

            const merged = document.createElement("canvas");
            merged.width = doodleDrawCanvas.width;
            merged.height = doodleDrawCanvas.height;
            const mCtx = merged.getContext("2d");
            mCtx.drawImage(doodleBgCanvas, 0, 0);
            mCtx.drawImage(doodleDrawCanvas, 0, 0);

            const blob = await new Promise(res => merged.toBlob(res, "image/png"));
            const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
            const fileName = `gift-drawing-${stamp}.png`;

            const stored = await uploadBlob(blob, fileName, "image/png");
            setStagedAttachment({
                fileId: stored.id,
                kind: "drawing",
                thumbUrl: `/api/files/${encodeURIComponent(stored.id)}/content?preview=true`,
                fileName,
                status: "Ready to add"
            });

            hideModal(bsDoodleModal, doodleModalEl);
            toast("Drawing attached!", "success");
        } catch (err) {
            toast(err.message, "danger");
        } finally {
            doodleSaveBtn.disabled = false;
            doodleSaveBtn.textContent = "Attach Drawing";
        }
    });

    // --- COMPOSER SUBMISSION ---
    addForm?.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (stagedAttachment && !stagedAttachment.fileId) {
            toast("Please wait for your attachment to finish uploading.", "info");
            return;
        }

        const title = titleInput?.value.trim() || "";
        const url = urlInput?.value.trim() || "";
        const description = descInput?.value.trim() || "";
        const fileId = stagedAttachment ? stagedAttachment.fileId : null;

        if (!title && !url && !description && !fileId) {
            toast("Add some text, a URL, an image, a voice note, or a drawing.", "info");
            return;
        }

        if (submitBtn) submitBtn.disabled = true;
        try {
            const body = {
                title: title || null,
                url: url || null,
                description: description || null,
                imageFileId: fileId,
                imageType: stagedAttachment ? stagedAttachment.kind : null
            };

            await api("/api/gifts", {
                method: "POST",
                headers: headers({ "Content-Type": "application/json" }),
                body: JSON.stringify(body)
            });

            if (titleInput) titleInput.value = "";
            if (urlInput) urlInput.value = "";
            if (descInput) descInput.value = "";
            setStagedAttachment(null);

            toast("Added to your gift list!", "success");
            await loadList(currentUserId);
            await loadMembers();
        } catch (err) {
            toast(err.message, "danger");
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
    });

    // --- EDIT ITEM FORM ---
    editForm?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const id = editIdInput?.value;
        if (!id) return;

        const saveBtn = document.getElementById("edit-gift-save-btn");
        if (saveBtn) saveBtn.disabled = true;

        try {
            const existing = currentItems.find(i => i.id === id);
            const removeAttachment = Boolean(editRemoveAttachInput?.checked);
            const body = {
                title: editTitleInput?.value.trim() || null,
                url: editUrlInput?.value.trim() || null,
                description: editDescInput?.value.trim() || null,
                imageFileId: (!removeAttachment && existing) ? existing.imageFileId : null,
                imageType: (!removeAttachment && existing) ? existing.imageType : null
            };

            await api(`/api/gifts/${encodeURIComponent(id)}`, {
                method: "PUT",
                headers: headers({ "Content-Type": "application/json" }),
                body: JSON.stringify(body)
            });

            hideModal(bsEditModal, editModalEl);
            toast("Item updated!", "success");
            await loadList(selectedOwnerId);
        } catch (err) {
            toast(err.message, "danger");
        } finally {
            if (saveBtn) saveBtn.disabled = false;
        }
    });

    // --- RENDER MEMBERS ---
    async function loadMembers() {
        try {
            members = await api("/api/gifts/members", { headers: headers() });
            if (members.length > 0 && !members.some(m => m.userId === selectedOwnerId)) {
                selectedOwnerId = currentUserId;
            }
            renderMembers();
        } catch (err) {
            if (membersListEl) {
                membersListEl.textContent = `Failed to load family members: ${err.message}`;
            }
        }
    }

    function renderMembers() {
        if (!membersListEl) return;
        membersListEl.innerHTML = "";
        members.forEach(m => {
            const isMe = m.userId === currentUserId;
            const isSelected = m.userId === selectedOwnerId;

            const pill = document.createElement("button");
            pill.type = "button";
            pill.className = `gifts-member-pill ${isSelected ? "active" : ""} ${m.isKid ? "is-kid" : ""}`;
            pill.setAttribute("role", "tab");
            pill.setAttribute("aria-selected", isSelected ? "true" : "false");

            const dot = document.createElement("span");
            dot.className = "member-pill-dot";
            dot.style.background = m.accentColor || "#0b1f3a";

            const nameSpan = document.createElement("span");
            nameSpan.className = "member-pill-name";
            nameSpan.textContent = isMe ? `${m.displayName} (Me)` : m.displayName;

            pill.appendChild(dot);
            pill.appendChild(nameSpan);

            if (m.isKid) {
                const kidTag = document.createElement("span");
                kidTag.className = "member-pill-kid-tag";
                kidTag.textContent = "Kid";
                pill.appendChild(kidTag);
            }

            const countBadge = document.createElement("span");
            countBadge.className = "member-pill-count";
            countBadge.textContent = `${m.itemCount}`;
            pill.appendChild(countBadge);

            pill.addEventListener("click", () => selectMember(m.userId));
            membersListEl.appendChild(pill);
        });
    }

    function selectMember(userId) {
        stopActiveRecording("cancel");
        selectedOwnerId = userId;
        window.location.hash = `member=${userId}`;
        renderMembers();
        loadList(userId);
    }

    // --- LIST LOADING & RENDERING ---
    async function loadList(ownerId) {
        const owner = members.find(m => m.userId === ownerId);
        const isMe = ownerId === currentUserId;

        if (activeDotEl) activeDotEl.style.background = owner?.accentColor || "#0b1f3a";
        if (activeNameEl) activeNameEl.textContent = isMe ? "My Gift List" : `${owner?.displayName || "Member"}'s Gift List`;
        activeKidBadge?.classList.toggle("d-none", !owner?.isKid);
        composerCard?.classList.toggle("d-none", !isMe);

        if (gridEl) gridEl.innerHTML = '<div class="gifts-loading-state">Loading list...</div>';

        try {
            currentItems = await api(`/api/gifts/list/${encodeURIComponent(ownerId)}`, { headers: headers() });
            renderItems(isMe, owner);
        } catch (err) {
            if (gridEl) {
                const errDiv = document.createElement("div");
                errDiv.className = "text-danger p-3";
                errDiv.textContent = `Failed to load gift list: ${err.message}`;
                gridEl.innerHTML = "";
                gridEl.appendChild(errDiv);
            }
        }
    }

    function renderItems(isMe, owner) {
        if (!gridEl) return;

        if (activeCountEl) {
            activeCountEl.textContent = `${currentItems.length} ${currentItems.length === 1 ? "item" : "items"}`;
        }

        if (currentItems.length === 0) {
            gridEl.innerHTML = "";
            if (emptyMsgEl) {
                emptyMsgEl.textContent = isMe
                    ? "Add text, a URL, an image, a voice note, or a drawing above!"
                    : `${owner?.displayName || "This member"} hasn't added anything to their gift list yet.`;
            }
            if (emptyStateEl) {
                gridEl.appendChild(emptyStateEl);
                emptyStateEl.classList.remove("d-none");
            }
            return;
        }

        emptyStateEl?.classList.add("d-none");
        gridEl.innerHTML = "";

        currentItems.forEach((item, index) => {
            const card = buildGiftCard(item, {
                isMe,
                index,
                totalCount: currentItems.length,
                canReorder: isMe && currentItems.length > 1
            });
            gridEl.appendChild(card);
        });
    }

    // --- CARD BUILDER ---
    function buildGiftCard(item, opts) {
        const isMe = opts.isMe;
        const card = document.createElement("div");
        card.className = "gift-card";
        card.dataset.id = item.id;

        // 1. Media (Image, Drawing, or Voice)
        if (item.imageFileId) {
            const mediaUrl = `/api/files/${encodeURIComponent(item.imageFileId)}/content?preview=true`;
            if (item.imageType === "voice" || item.imageType === "audio") {
                const voiceWrap = document.createElement("div");
                voiceWrap.className = "gift-card-voice";

                const voiceHeader = document.createElement("div");
                voiceHeader.className = "gift-voice-header";
                voiceHeader.textContent = "🎤 Voice Note";

                const audio = document.createElement("audio");
                audio.controls = true;
                audio.preload = "metadata";
                audio.className = "gift-audio-player";
                audio.src = mediaUrl;

                voiceWrap.appendChild(voiceHeader);
                voiceWrap.appendChild(audio);
                card.appendChild(voiceWrap);
            } else {
                const isDrawing = item.imageType === "drawing";
                const imgWrap = document.createElement("div");
                imgWrap.className = `gift-card-media ${isDrawing ? "is-drawing" : ""}`;

                const img = document.createElement("img");
                img.src = mediaUrl;
                img.alt = item.title || (isDrawing ? "Drawing" : "Gift image");
                img.className = "gift-card-img";
                img.loading = "lazy";
                img.addEventListener("click", () => {
                    if (lightboxImg) {
                        lightboxImg.src = img.src;
                        lightboxImg.alt = img.alt;
                    }
                    bsLightboxModal?.show();
                });
                imgWrap.appendChild(img);

                const tag = document.createElement("span");
                tag.className = "gift-media-badge";
                tag.textContent = isDrawing ? "🎨 Drawing" : "📷 Image";
                imgWrap.appendChild(tag);

                card.appendChild(imgWrap);
            }
        }

        // 2. Body (Text / Notes / URL)
        if (item.title || item.description || item.url) {
            const body = document.createElement("div");
            body.className = "gift-card-body";

            if (item.title) {
                const title = document.createElement("h3");
                title.className = "gift-card-title";
                title.textContent = item.title;
                body.appendChild(title);
            }

            if (item.description) {
                const desc = document.createElement("p");
                desc.className = "gift-card-desc";
                desc.textContent = item.description;
                body.appendChild(desc);
            }

            if (item.url) {
                const linkWrap = document.createElement("div");
                linkWrap.className = "gift-card-link-wrap";

                let domain = item.url;
                try {
                    domain = new URL(item.url).hostname.replace(/^www\./, "");
                } catch {
                    // Fallback to full URL string
                }

                const link = document.createElement("a");
                link.href = item.url;
                link.target = "_blank";
                link.rel = "noopener noreferrer";
                link.className = "btn btn-sm btn-outline-primary gift-card-link-btn";
                link.innerHTML = '<svg class="icon me-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 5h5v5"/><path d="M19 5l-8 8"/><path d="M17 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h5"/></svg>';
                const labelSpan = document.createElement("span");
                labelSpan.textContent = domain;
                link.appendChild(labelSpan);

                linkWrap.appendChild(link);
                body.appendChild(linkWrap);
            }

            card.appendChild(body);
        }

        // 3. Footer (Owner reorder / edit / delete only)
        if (isMe) {
            const footer = document.createElement("div");
            footer.className = "gift-card-footer";

            const ownerTools = document.createElement("div");
            ownerTools.className = "gift-owner-tools";

            if (opts.canReorder) {
                if (opts.index > 0) {
                    const upBtn = document.createElement("button");
                    upBtn.type = "button";
                    upBtn.className = "btn btn-sm btn-outline-secondary gift-tool-btn";
                    upBtn.title = "Move up";
                    upBtn.setAttribute("aria-label", "Move up");
                    upBtn.textContent = "▲";
                    upBtn.addEventListener("click", () => moveItem(opts.index, opts.index - 1));
                    ownerTools.appendChild(upBtn);
                }
                if (opts.index < opts.totalCount - 1) {
                    const dnBtn = document.createElement("button");
                    dnBtn.type = "button";
                    dnBtn.className = "btn btn-sm btn-outline-secondary gift-tool-btn";
                    dnBtn.title = "Move down";
                    dnBtn.setAttribute("aria-label", "Move down");
                    dnBtn.textContent = "▼";
                    dnBtn.addEventListener("click", () => moveItem(opts.index, opts.index + 1));
                    ownerTools.appendChild(dnBtn);
                }
            }

            const editBtn = document.createElement("button");
            editBtn.type = "button";
            editBtn.className = "btn btn-sm btn-outline-secondary gift-tool-btn";
            editBtn.title = "Edit item";
            editBtn.setAttribute("aria-label", "Edit item");
            editBtn.innerHTML = window.mcwutIcon("pencil");
            editBtn.addEventListener("click", () => openEditModal(item));
            ownerTools.appendChild(editBtn);

            const delBtn = document.createElement("button");
            delBtn.type = "button";
            delBtn.className = "btn btn-sm btn-outline-danger gift-tool-btn";
            delBtn.title = "Delete item";
            delBtn.setAttribute("aria-label", "Delete item");
            delBtn.innerHTML = window.mcwutIcon("trash");
            delBtn.addEventListener("click", () => deleteItem(item));
            ownerTools.appendChild(delBtn);

            footer.appendChild(ownerTools);
            card.appendChild(footer);
        }

        return card;
    }

    // --- OWNER ACTIONS ---
    function openEditModal(item) {
        if (editIdInput) editIdInput.value = item.id;
        if (editTitleInput) editTitleInput.value = item.title || "";
        if (editUrlInput) editUrlInput.value = item.url || "";
        if (editDescInput) editDescInput.value = item.description || "";
        if (editAttachRow) editAttachRow.classList.toggle("d-none", !item.imageFileId);
        if (editRemoveAttachInput) editRemoveAttachInput.checked = false;
        bsEditModal?.show();
    }

    async function deleteItem(item) {
        const label = item.title || item.url || "this item";
        if (!confirm(`Remove "${label}" from your gift list?`)) return;
        try {
            await api(`/api/gifts/${encodeURIComponent(item.id)}`, {
                method: "DELETE",
                headers: headers()
            });
            toast("Item removed from your list.", "info");
            await loadList(currentUserId);
            await loadMembers();
        } catch (err) {
            toast(err.message, "danger");
        }
    }

    async function moveItem(fromIndex, toIndex) {
        if (fromIndex < 0 || toIndex < 0 || fromIndex >= currentItems.length || toIndex >= currentItems.length) return;
        const reordered = [...currentItems];
        const [moved] = reordered.splice(fromIndex, 1);
        reordered.splice(toIndex, 0, moved);

        currentItems = reordered;
        renderItems(true, members.find(m => m.userId === currentUserId));

        try {
            await api("/api/gifts/reorder", {
                method: "POST",
                headers: headers({ "Content-Type": "application/json" }),
                body: JSON.stringify(reordered.map(i => i.id))
            });
        } catch (err) {
            toast("Failed to save order: " + err.message, "danger");
            await loadList(currentUserId);
        }
    }

    // --- INITIALIZE ROUTE ---
    async function init() {
        const hash = window.location.hash;
        if (hash.startsWith("#member=")) {
            const targetId = hash.replace("#member=", "").trim();
            if (targetId) selectedOwnerId = targetId;
        }

        await loadMembers();
        await loadList(selectedOwnerId);
    }

    init();
})();
