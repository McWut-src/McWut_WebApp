// McWut Family Gift & Wish List Manager
(() => {
    const pageEl = document.getElementById("gifts-page");
    if (!pageEl) return;

    const currentUserId = pageEl.dataset.currentUserId;
    const isKid = pageEl.dataset.isKid === "true";

    const membersListEl = document.getElementById("gifts-members-list");
    const listContainerEl = document.getElementById("gifts-list-container");
    const shoppingViewEl = document.getElementById("gifts-shopping-view");
    const shoppingCountEl = document.getElementById("gifts-shopping-count");
    const shoppingGridEl = document.getElementById("gifts-shopping-grid");

    const activeDotEl = document.getElementById("gifts-active-dot");
    const activeNameEl = document.getElementById("gifts-active-name");
    const activeKidBadge = document.getElementById("gifts-active-kid-badge");
    const surpriseOpenBtn = document.getElementById("gifts-surprise-open-btn");
    const activeCountEl = document.getElementById("gifts-active-count");
    const activeClaimChip = document.getElementById("gifts-active-claim-chip");

    // Pinned Sizes & Favorites Profile Bar
    const profileItemsEl = document.getElementById("gifts-profile-items");
    const profileEditBtn = document.getElementById("gifts-profile-edit-btn");
    const profileModalEl = document.getElementById("gifts-profile-modal");
    const profileForm = document.getElementById("gifts-profile-form");
    const profileShirtInput = document.getElementById("profile-shirt-size");
    const profilePantsInput = document.getElementById("profile-pants-size");
    const profileShoeInput = document.getElementById("profile-shoe-size");
    const profileColorsInput = document.getElementById("profile-fav-colors");
    const profileInterestsInput = document.getElementById("profile-interests");
    const profileSaveBtn = document.getElementById("gifts-profile-save-btn");

    // Occasion Filter Bar
    const filterBarEl = document.getElementById("gifts-filter-bar");

    // Composer Form
    const composerCard = document.getElementById("gifts-composer");
    const dropzoneEl = document.getElementById("gifts-dropzone");
    const addForm = document.getElementById("gift-add-form");
    const titleInput = document.getElementById("gift-title");
    const occasionInput = document.getElementById("gift-occasion");
    const categoryInput = document.getElementById("gift-category");
    const mostWantedInput = document.getElementById("gift-most-wanted");
    const urlInput = document.getElementById("gift-url");
    const descInput = document.getElementById("gift-desc");
    const photoBtn = document.getElementById("gift-photo-btn");
    const photoInput = document.getElementById("gift-photo-input");
    const doodleBtn = document.getElementById("gift-doodle-btn");
    const submitBtn = document.getElementById("gift-submit-btn");

    const attachBox = document.getElementById("gift-attachment-box");
    const attachThumb = document.getElementById("gift-attachment-thumb");
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

    // Lightbox, Claim, Edit & Secret Surprise Modals
    const lightboxModalEl = document.getElementById("gifts-lightbox-modal");
    const lightboxImg = document.getElementById("gifts-lightbox-img");

    const claimModalEl = document.getElementById("gifts-claim-modal");
    const claimItemName = document.getElementById("gifts-claim-item-name");
    const claimNoteInput = document.getElementById("gifts-claim-note-input");
    const claimSplitCheck = document.getElementById("gifts-claim-split-check");
    const claimConfirmBtn = document.getElementById("gifts-claim-confirm-btn");

    const editModalEl = document.getElementById("gifts-edit-modal");
    const editForm = document.getElementById("gifts-edit-form");
    const editIdInput = document.getElementById("edit-gift-id");
    const editTitleInput = document.getElementById("edit-gift-title");
    const editOccasionInput = document.getElementById("edit-gift-occasion");
    const editCategoryInput = document.getElementById("edit-gift-category");
    const editMostWantedInput = document.getElementById("edit-gift-most-wanted");
    const editUrlInput = document.getElementById("edit-gift-url");
    const editDescInput = document.getElementById("edit-gift-desc");

    const surpriseModalEl = document.getElementById("gifts-surprise-modal");
    const surpriseForm = document.getElementById("gifts-surprise-form");
    const surpriseRecipientEl = document.getElementById("gifts-surprise-recipient-name");
    const surpriseTitleInput = document.getElementById("surprise-gift-title");
    const surpriseOccasionInput = document.getElementById("surprise-gift-occasion");
    const surpriseUrlInput = document.getElementById("surprise-gift-url");
    const surpriseDescInput = document.getElementById("surprise-gift-desc");
    const surpriseNoteInput = document.getElementById("surprise-gift-note");
    const surpriseSplitInput = document.getElementById("surprise-gift-split");
    const surpriseSubmitBtn = document.getElementById("surprise-gift-submit-btn");

    // Move modals to body to prevent stacking context issues over background wallpaper/headers
    [doodleModalEl, lightboxModalEl, claimModalEl, editModalEl, profileModalEl, surpriseModalEl].forEach(m => {
        if (m && m.parentElement !== document.body) {
            document.body.appendChild(m);
        }
    });

    const bsDoodleModal = doodleModalEl && window.bootstrap ? new window.bootstrap.Modal(doodleModalEl) : null;
    const bsLightboxModal = lightboxModalEl && window.bootstrap ? new window.bootstrap.Modal(lightboxModalEl) : null;
    const bsClaimModal = claimModalEl && window.bootstrap ? new window.bootstrap.Modal(claimModalEl) : null;
    const bsEditModal = editModalEl && window.bootstrap ? new window.bootstrap.Modal(editModalEl) : null;
    const bsProfileModal = profileModalEl && window.bootstrap ? new window.bootstrap.Modal(profileModalEl) : null;
    const bsSurpriseModal = surpriseModalEl && window.bootstrap ? new window.bootstrap.Modal(surpriseModalEl) : null;

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
            } catch (e) {
                // Ignore parse errors
            }
            throw new Error(msg);
        }
        if (res.status === 204) return null;
        return await res.json();
    }

    function toast(text, kind) {
        if (window.mcwut && window.mcwut.toast) {
            window.mcwut.toast(text, { kind: kind || "info", duration: 3200 });
        } else {
            console.log(`[Toast ${kind}]: ${text}`);
        }
    }

    const OCCASION_LABELS = {
        anytime: "✨ Anytime",
        birthday: "🎂 Birthday",
        christmas: "🎄 Christmas",
        holiday: "🎉 Holiday"
    };

    const CATEGORY_LABELS = {
        "under-25": "💵 Under $25",
        small: "🧦 Small",
        "big-wish": "🌟 Big Wish"
    };

    const STATUS_STAGES = [
        { key: "claimed", label: "✓ Claimed" },
        { key: "ordered", label: "📦 Ordered" },
        { key: "wrapped", label: "🎀 Wrapped" }
    ];

    let members = [];
    let selectedOwnerId = currentUserId;
    let viewMode = "list"; // "list" | "shopping"
    let activeFilter = "all";
    let currentItems = [];
    let currentProfile = null;
    let shoppingClaims = [];
    let stagedAttachment = null; // { fileId, kind: 'photo'|'drawing', thumbUrl, fileName }
    let pendingClaimItemId = null;

    // --- UPLOAD LOGIC ---
    async function uploadBlob(blob, fileName, contentType) {
        const begin = await api("/api/uploads", {
            method: "POST",
            headers: headers({ "Content-Type": "application/json" }),
            body: JSON.stringify({
                fileName: fileName || "upload.png",
                contentType: contentType || "image/png",
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
            throw new Error(`Upload failed: ${putRes.status}`);
        }

        return await putRes.json();
    }

    function setStagedAttachment(att) {
        stagedAttachment = att;
        if (!att) {
            attachBox.classList.add("d-none");
            attachThumb.src = "";
            return;
        }

        attachThumb.src = att.thumbUrl;
        attachTypeEl.textContent = att.kind === "drawing" ? "🎨 Doodle Drawing" : "📷 Photo";
        attachStatusEl.textContent = "Ready to add";
        attachBox.classList.remove("d-none");
    }

    attachClearBtn?.addEventListener("click", () => setStagedAttachment(null));

    // --- PHOTO PICKER, DROPZONE & PASTE ---
    photoBtn?.addEventListener("click", () => photoInput?.click());

    photoInput?.addEventListener("change", async () => {
        if (!photoInput.files || photoInput.files.length === 0) return;
        const file = photoInput.files[0];
        await handleImageUpload(file);
        photoInput.value = "";
    });

    async function handleImageUpload(file) {
        try {
            submitBtn.disabled = true;
            const localUrl = URL.createObjectURL(file);
            setStagedAttachment({
                fileId: null,
                kind: "photo",
                thumbUrl: localUrl,
                fileName: file.name
            });
            attachStatusEl.textContent = "Uploading photo…";

            const stored = await uploadBlob(file, file.name || "gift-photo.jpg", file.type || "image/jpeg");
            URL.revokeObjectURL(localUrl);

            setStagedAttachment({
                fileId: stored.id,
                kind: "photo",
                thumbUrl: `/api/files/${encodeURIComponent(stored.id)}/content?preview=true`,
                fileName: stored.originalFileName || file.name
            });
            toast("Photo attached!", "success");
        } catch (err) {
            setStagedAttachment(null);
            toast(err.message, "danger");
        } finally {
            submitBtn.disabled = false;
        }
    }

    ["dragenter", "dragover"].forEach(evtName => {
        dropzoneEl?.addEventListener(evtName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzoneEl.classList.add("is-dragover");
        });
        composerCard?.addEventListener(evtName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzoneEl?.classList.add("is-dragover");
        });
    });

    ["dragleave", "dragend"].forEach(evtName => {
        dropzoneEl?.addEventListener(evtName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzoneEl.classList.remove("is-dragover");
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
        }

        const uriList = dt.getData("text/uri-list");
        if (uriList && uriList.startsWith("http")) {
            urlInput.value = uriList.trim();
            if (!titleInput.value) {
                try {
                    const u = new URL(uriList);
                    titleInput.value = u.hostname.replace(/^www\./, "") + " item";
                } catch (e) {}
            }
            toast("Link attached!", "info");
            return;
        }

        const text = dt.getData("text/plain");
        if (text) {
            const trimmed = text.trim();
            if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
                urlInput.value = trimmed;
                if (!titleInput.value) {
                    try {
                        const u = new URL(trimmed);
                        titleInput.value = u.hostname.replace(/^www\./, "") + " item";
                    } catch (e) {}
                }
                toast("Link dropped into form!", "info");
            } else if (!titleInput.value) {
                titleInput.value = trimmed.slice(0, 200);
                toast("Text dropped into title!", "info");
            } else if (!descInput.value) {
                descInput.value = trimmed.slice(0, 2000);
                toast("Notes added!", "info");
            }
        }
    }

    dropzoneEl?.addEventListener("drop", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await handleDroppedData(e.dataTransfer);
    });

    document.addEventListener("paste", async (e) => {
        if (viewMode !== "list" || selectedOwnerId !== currentUserId) return;
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
        } catch (e) {}
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
            toast("Photo loaded! Circle or draw what you want.", "info");
        };
        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            toast("Could not load photo onto canvas.", "danger");
        };
        img.src = objectUrl;
    }

    function initDoodlePad() {
        if (!doodleBgCanvas || !doodleDrawCanvas) return;
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
            const fileName = `wish-doodle-${stamp}.png`;

            const stored = await uploadBlob(blob, fileName, "image/png");
            setStagedAttachment({
                fileId: stored.id,
                kind: "drawing",
                thumbUrl: `/api/files/${encodeURIComponent(stored.id)}/content?preview=true`,
                fileName: fileName
            });

            bsDoodleModal?.hide();
            toast("Drawing attached to wish!", "success");
        } catch (err) {
            toast(err.message, "danger");
        } finally {
            doodleSaveBtn.disabled = false;
            doodleSaveBtn.textContent = "Attach Drawing";
        }
    });

    // --- FILTER PILLS ---
    filterBarEl?.querySelectorAll(".gifts-filter-pill").forEach(pill => {
        pill.addEventListener("click", () => {
            activeFilter = pill.dataset.filter || "all";
            filterBarEl.querySelectorAll(".gifts-filter-pill").forEach(b => {
                b.classList.toggle("active", b === pill);
            });
            const owner = members.find(m => m.userId === selectedOwnerId);
            renderItems(selectedOwnerId === currentUserId, owner);
        });
    });

    // --- COMPOSER SUBMISSION ---
    addForm?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const title = titleInput.value.trim();
        if (!title) return;

        submitBtn.disabled = true;
        try {
            const body = {
                title: title,
                url: urlInput.value.trim() || null,
                description: descInput.value.trim() || null,
                imageFileId: stagedAttachment ? stagedAttachment.fileId : null,
                imageType: stagedAttachment ? stagedAttachment.kind : null,
                occasion: occasionInput?.value || "anytime",
                categoryTag: categoryInput?.value || null,
                isMostWanted: Boolean(mostWantedInput?.checked)
            };

            await api("/api/gifts", {
                method: "POST",
                headers: headers({ "Content-Type": "application/json" }),
                body: JSON.stringify(body)
            });

            titleInput.value = "";
            urlInput.value = "";
            descInput.value = "";
            if (categoryInput) categoryInput.value = "";
            if (mostWantedInput) mostWantedInput.checked = false;
            setStagedAttachment(null);

            toast("Wish added to your list!", "success");
            await loadList(currentUserId);
            await loadMembers();
        } catch (err) {
            toast(err.message, "danger");
        } finally {
            submitBtn.disabled = false;
        }
    });

    // --- EDIT ITEM FORM ---
    editForm?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const id = editIdInput.value;
        const title = editTitleInput.value.trim();
        if (!id || !title) return;

        const saveBtn = document.getElementById("edit-gift-save-btn");
        if (saveBtn) saveBtn.disabled = true;

        try {
            const existing = currentItems.find(i => i.id === id);
            const body = {
                title: title,
                url: editUrlInput.value.trim() || null,
                description: editDescInput.value.trim() || null,
                imageFileId: existing ? existing.imageFileId : null,
                imageType: existing ? existing.imageType : null,
                occasion: editOccasionInput?.value || "anytime",
                categoryTag: editCategoryInput?.value || null,
                isMostWanted: Boolean(editMostWantedInput?.checked)
            };

            await api(`/api/gifts/${encodeURIComponent(id)}`, {
                method: "PUT",
                headers: headers({ "Content-Type": "application/json" }),
                body: JSON.stringify(body)
            });

            bsEditModal?.hide();
            toast("Wish updated!", "success");
            await loadList(selectedOwnerId);
        } catch (err) {
            toast(err.message, "danger");
        } finally {
            if (saveBtn) saveBtn.disabled = false;
        }
    });

    // --- SIZES & FAVORITES PROFILE MODAL ---
    profileEditBtn?.addEventListener("click", () => {
        profileShirtInput.value = currentProfile?.shirtSize || "";
        profilePantsInput.value = currentProfile?.pantsSize || "";
        profileShoeInput.value = currentProfile?.shoeSize || "";
        profileColorsInput.value = currentProfile?.favoriteColors || "";
        profileInterestsInput.value = currentProfile?.interestsAndAvoid || "";
        bsProfileModal?.show();
    });

    profileForm?.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (profileSaveBtn) profileSaveBtn.disabled = true;
        try {
            const payload = {
                shirtSize: profileShirtInput.value.trim() || null,
                pantsSize: profilePantsInput.value.trim() || null,
                shoeSize: profileShoeInput.value.trim() || null,
                favoriteColors: profileColorsInput.value.trim() || null,
                interestsAndAvoid: profileInterestsInput.value.trim() || null
            };

            currentProfile = await api("/api/gifts/profile", {
                method: "PUT",
                headers: headers({ "Content-Type": "application/json" }),
                body: JSON.stringify(payload)
            });
            renderProfileBar(true, null);
            bsProfileModal?.hide();
            toast("Sizes & favorites saved!", "success");
        } catch (err) {
            toast(err.message, "danger");
        } finally {
            if (profileSaveBtn) profileSaveBtn.disabled = false;
        }
    });

    // --- ADULT SECRET SURPRISE MODAL ---
    surpriseOpenBtn?.addEventListener("click", () => {
        const owner = members.find(m => m.userId === selectedOwnerId);
        if (surpriseRecipientEl) surpriseRecipientEl.textContent = owner?.displayName || "this member";
        surpriseTitleInput.value = "";
        if (surpriseOccasionInput) surpriseOccasionInput.value = "anytime";
        surpriseUrlInput.value = "";
        surpriseDescInput.value = "";
        surpriseNoteInput.value = "";
        if (surpriseSplitInput) surpriseSplitInput.checked = false;
        bsSurpriseModal?.show();
    });

    surpriseForm?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const title = surpriseTitleInput.value.trim();
        if (!title) return;
        if (surpriseSubmitBtn) surpriseSubmitBtn.disabled = true;

        try {
            const payload = {
                title: title,
                occasion: surpriseOccasionInput?.value || "anytime",
                url: surpriseUrlInput.value.trim() || null,
                description: surpriseDescInput.value.trim() || null,
                claimNotes: surpriseNoteInput.value.trim() || null,
                openToSplit: Boolean(surpriseSplitInput?.checked)
            };

            await api(`/api/gifts/list/${encodeURIComponent(selectedOwnerId)}/surprise`, {
                method: "POST",
                headers: headers({ "Content-Type": "application/json" }),
                body: JSON.stringify(payload)
            });

            bsSurpriseModal?.hide();
            toast("Secret off-list surprise saved! Only adults can see it.", "success");
            await loadList(selectedOwnerId);
            await loadMembers();
        } catch (err) {
            toast(err.message, "danger");
        } finally {
            if (surpriseSubmitBtn) surpriseSubmitBtn.disabled = false;
        }
    });

    // --- CLAIM CONFIRMATION ---
    claimConfirmBtn?.addEventListener("click", async () => {
        if (!pendingClaimItemId) return;
        claimConfirmBtn.disabled = true;
        try {
            const note = claimNoteInput.value.trim() || null;
            const openToSplit = Boolean(claimSplitCheck?.checked);
            await api(`/api/gifts/${encodeURIComponent(pendingClaimItemId)}/claim`, {
                method: "POST",
                headers: headers({ "Content-Type": "application/json" }),
                body: JSON.stringify({ claimNotes: note, openToSplit: openToSplit })
            });

            bsClaimModal?.hide();
            toast("Gift claimed! Other adults now know you've got this.", "success");
            await refreshActiveView();
        } catch (err) {
            toast(err.message, "danger");
        } finally {
            claimConfirmBtn.disabled = false;
            pendingClaimItemId = null;
        }
    });

    // --- RENDER MEMBERS & SHOPPING TAB ---
    async function loadMembers() {
        try {
            members = await api("/api/gifts/members", { headers: headers() });
            renderMembers();
        } catch (err) {
            membersListEl.innerHTML = `<div class="text-danger small p-2">Failed to load family members: ${err.message}</div>`;
        }
    }

    function renderMembers() {
        membersListEl.innerHTML = "";
        members.forEach(m => {
            const isMe = m.userId === currentUserId;
            const isSelected = viewMode === "list" && m.userId === selectedOwnerId;

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
                kidTag.textContent = "👶 Kid";
                pill.appendChild(kidTag);
            }

            const countBadge = document.createElement("span");
            countBadge.className = "member-pill-count";
            countBadge.textContent = `${m.itemCount}`;
            pill.appendChild(countBadge);

            if (!isKid && m.claimedCount !== null && m.claimedCount > 0) {
                const claimIndicator = document.createElement("span");
                claimIndicator.className = "member-pill-claimed-tag";
                claimIndicator.title = `${m.claimedCount} of ${m.itemCount} items claimed`;
                claimIndicator.textContent = `🎁 ${m.claimedCount}`;
                pill.appendChild(claimIndicator);
            }

            pill.addEventListener("click", () => selectMember(m.userId));
            membersListEl.appendChild(pill);
        });

        // Add Adult-only "My Shopping List" tab at end of strip
        if (!isKid) {
            const shopPill = document.createElement("button");
            shopPill.type = "button";
            shopPill.id = "gifts-shopping-tab";
            shopPill.className = `gifts-member-pill gifts-shopping-pill ${viewMode === "shopping" ? "active" : ""}`;
            shopPill.setAttribute("role", "tab");
            shopPill.setAttribute("aria-selected", viewMode === "shopping" ? "true" : "false");
            shopPill.innerHTML = `<span class="member-pill-name">🛒 My Shopping List</span>`;
            shopPill.addEventListener("click", selectShoppingView);
            membersListEl.appendChild(shopPill);
        }
    }

    function selectMember(userId) {
        viewMode = "list";
        selectedOwnerId = userId;
        activeFilter = "all";
        filterBarEl?.querySelectorAll(".gifts-filter-pill").forEach(p => {
            p.classList.toggle("active", p.dataset.filter === "all");
        });
        window.location.hash = `member=${userId}`;
        shoppingViewEl?.classList.add("d-none");
        listContainerEl?.classList.remove("d-none");
        renderMembers();
        loadList(userId);
    }

    function selectShoppingView() {
        if (isKid) return;
        viewMode = "shopping";
        window.location.hash = "shopping";
        listContainerEl?.classList.add("d-none");
        shoppingViewEl?.classList.remove("d-none");
        renderMembers();
        loadMyClaims();
    }

    async function refreshActiveView() {
        await loadMembers();
        if (viewMode === "shopping") {
            await loadMyClaims();
        } else {
            await loadList(selectedOwnerId);
        }
    }

    // --- PROFILE BAR RENDERING ---
    async function loadProfile(ownerId, owner) {
        const isMe = ownerId === currentUserId;
        if (profileEditBtn) {
            profileEditBtn.classList.toggle("d-none", !isMe);
        }

        try {
            currentProfile = await api(`/api/gifts/profile/${encodeURIComponent(ownerId)}`, { headers: headers() });
            renderProfileBar(isMe, owner);
        } catch (err) {
            currentProfile = null;
            renderProfileBar(isMe, owner);
        }
    }

    function renderProfileBar(isMe, owner) {
        if (!profileItemsEl) return;
        profileItemsEl.innerHTML = "";

        const chips = [];
        if (currentProfile?.shirtSize) chips.push({ icon: "👕", label: "Shirt", val: currentProfile.shirtSize });
        if (currentProfile?.pantsSize) chips.push({ icon: "👖", label: "Pants", val: currentProfile.pantsSize });
        if (currentProfile?.shoeSize) chips.push({ icon: "👟", label: "Shoes", val: currentProfile.shoeSize });
        if (currentProfile?.favoriteColors) chips.push({ icon: "🎨", label: "Colors", val: currentProfile.favoriteColors });
        if (currentProfile?.interestsAndAvoid) chips.push({ icon: "💡", label: "Interests / Notes", val: currentProfile.interestsAndAvoid });

        if (chips.length === 0) {
            const empty = document.createElement("span");
            empty.className = "gifts-profile-empty";
            empty.textContent = isMe
                ? "Add your clothing sizes, favorite colors, and interests so family members can pick the right fit."
                : `${owner?.displayName || "This member"} hasn't pinned sizes or favorites yet.`;
            profileItemsEl.appendChild(empty);
            return;
        }

        chips.forEach(c => {
            const chip = document.createElement("span");
            chip.className = "gifts-profile-chip";
            chip.innerHTML = `<strong>${c.icon} ${c.label}:</strong> `;
            const valSpan = document.createElement("span");
            valSpan.textContent = c.val;
            chip.appendChild(valSpan);
            profileItemsEl.appendChild(chip);
        });
    }

    // --- LIST LOADING & FILTERING ---
    async function loadList(ownerId) {
        const owner = members.find(m => m.userId === ownerId);
        const isMe = ownerId === currentUserId;

        activeDotEl.style.background = owner?.accentColor || "#0b1f3a";
        activeNameEl.textContent = isMe ? "My Wishlist" : `${owner?.displayName || "Member"}'s Wishlist`;
        activeKidBadge.classList.toggle("d-none", !owner?.isKid);
        composerCard.classList.toggle("d-none", !isMe);

        if (surpriseOpenBtn) {
            surpriseOpenBtn.classList.toggle("d-none", isKid || isMe);
        }

        gridEl.innerHTML = '<div class="gifts-loading-state">Loading wishlist...</div>';

        const profilePromise = loadProfile(ownerId, owner);
        try {
            currentItems = await api(`/api/gifts/list/${encodeURIComponent(ownerId)}`, { headers: headers() });
            await profilePromise;
            renderItems(isMe, owner);
        } catch (err) {
            await profilePromise;
            gridEl.innerHTML = `<div class="text-danger p-3">Failed to load wishlist: ${err.message}</div>`;
        }
    }

    function matchesFilter(item) {
        if (activeFilter === "all") return true;
        if (activeFilter === "most-wanted") return Boolean(item.isMostWanted);
        return (item.occasion || "anytime") === activeFilter;
    }

    function renderItems(isMe, owner) {
        const regularItems = currentItems.filter(i => !i.isAdultSurprise && !i.isDeletedByOwner);
        const filtered = currentItems.filter(matchesFilter);

        if (activeFilter === "all") {
            activeCountEl.textContent = `${regularItems.length} ${regularItems.length === 1 ? "gift" : "gifts"}`;
        } else {
            activeCountEl.textContent = `${filtered.length} shown`;
        }

        if (!isKid && !isMe && regularItems.length > 0) {
            const claimedRegular = regularItems.filter(i => i.isClaimed).length;
            activeClaimChip.classList.remove("d-none");
            activeClaimChip.textContent = `${claimedRegular} of ${regularItems.length} claimed`;
            activeClaimChip.classList.toggle("all-claimed", claimedRegular === regularItems.length);
        } else {
            activeClaimChip.classList.add("d-none");
        }

        if (filtered.length === 0) {
            gridEl.innerHTML = "";
            if (currentItems.length > 0 && activeFilter !== "all") {
                emptyMsgEl.textContent = "No wishes match this filter. Click \"All\" above to see everything.";
            } else {
                emptyMsgEl.textContent = isMe
                    ? "Use the form above to add wishes for birthdays, Christmas, holidays, or anytime!"
                    : `${owner?.displayName || "This member"} hasn't added any wishes yet.`;
            }
            gridEl.appendChild(emptyStateEl);
            emptyStateEl.classList.remove("d-none");
            return;
        }

        emptyStateEl.classList.add("d-none");
        gridEl.innerHTML = "";

        filtered.forEach((item) => {
            const realIndex = currentItems.indexOf(item);
            const card = buildGiftCard(item, {
                isMe: isMe,
                isShoppingView: false,
                index: realIndex,
                totalCount: currentItems.length,
                canReorder: isMe && activeFilter === "all" && currentItems.length > 1
            });
            gridEl.appendChild(card);
        });
    }

    // --- ADULT SHOPPING LIST ---
    async function loadMyClaims() {
        if (!shoppingGridEl || isKid) return;
        shoppingGridEl.innerHTML = '<div class="gifts-loading-state">Loading your shopping list...</div>';

        try {
            shoppingClaims = await api("/api/gifts/my-claims", { headers: headers() });
            renderShoppingList();
        } catch (err) {
            shoppingGridEl.innerHTML = `<div class="text-danger p-3">Failed to load shopping list: ${err.message}</div>`;
        }
    }

    function renderShoppingList() {
        if (!shoppingGridEl) return;
        if (shoppingCountEl) {
            shoppingCountEl.textContent = `${shoppingClaims.length} ${shoppingClaims.length === 1 ? "item" : "items"}`;
        }

        if (shoppingClaims.length === 0) {
            shoppingGridEl.innerHTML = `
                <div class="gifts-empty-state">
                    <div class="gifts-empty-icon">🛒</div>
                    <h3>Your shopping list is empty</h3>
                    <p>Browse family members' wishlists above and click <strong>Claim Gift</strong> or <strong>Chip In</strong> to track items here.</p>
                </div>`;
            return;
        }

        shoppingGridEl.innerHTML = "";
        shoppingClaims.forEach(entry => {
            const card = buildGiftCard(entry.item, {
                isMe: false,
                isShoppingView: true,
                recipient: {
                    userId: entry.recipientUserId,
                    displayName: entry.recipientName,
                    accentColor: entry.recipientAccentColor,
                    isKid: entry.recipientIsKid
                }
            });
            shoppingGridEl.appendChild(card);
        });
    }

    // --- SHARED CARD BUILDER ---
    function buildGiftCard(item, opts) {
        const isMe = opts.isMe;
        const card = document.createElement("div");
        card.className = "gift-card";
        card.dataset.id = item.id;

        if (item.isMostWanted) card.classList.add("is-most-wanted");
        if (item.isAdultSurprise) card.classList.add("is-surprise");
        if (item.isDeletedByOwner) card.classList.add("is-deleted-owner");
        if (item.isClaimed) {
            card.classList.add("is-claimed");
            if (item.isClaimedByMe || item.isSplitByMe) {
                card.classList.add("claimed-by-me");
            }
        }

        // Special Adult Banners (never visible to list owner)
        if (!isMe && !isKid && item.isDeletedByOwner) {
            const warn = document.createElement("div");
            warn.className = "gift-deleted-banner";
            warn.textContent = "⚠️ Removed by owner after claim — still here so you aren't blindsided. Unclaim to clear.";
            card.appendChild(warn);
        } else if (!isMe && !isKid && item.isAdultSurprise) {
            const banner = document.createElement("div");
            banner.className = "gift-surprise-banner";
            banner.textContent = item.createdByName
                ? `🤫 Secret Off-List Surprise · Added by ${item.createdByName}`
                : "🤫 Secret Off-List Surprise (hidden from recipient)";
            card.appendChild(banner);
        }

        // Recipient header inside Shopping List
        if (opts.isShoppingView && opts.recipient) {
            const recBar = document.createElement("button");
            recBar.type = "button";
            recBar.className = "gifts-shopping-recipient-badge";
            recBar.title = `Open ${opts.recipient.displayName}'s wishlist`;

            const rDot = document.createElement("span");
            rDot.className = "member-pill-dot";
            rDot.style.background = opts.recipient.accentColor || "#0b1f3a";

            const rText = document.createElement("span");
            rText.textContent = opts.recipient.isKid
                ? `For ${opts.recipient.displayName} (Kid)`
                : `For ${opts.recipient.displayName}`;

            recBar.appendChild(rDot);
            recBar.appendChild(rText);
            recBar.addEventListener("click", () => selectMember(opts.recipient.userId));
            card.appendChild(recBar);
        }

        // 1. Media
        if (item.imageFileId) {
            const imgWrap = document.createElement("div");
            imgWrap.className = "gift-card-media";

            const img = document.createElement("img");
            img.src = `/api/files/${encodeURIComponent(item.imageFileId)}/content?preview=true`;
            img.alt = item.title;
            img.className = "gift-card-img";
            img.loading = "lazy";
            img.addEventListener("click", () => {
                lightboxImg.src = img.src;
                bsLightboxModal?.show();
            });
            imgWrap.appendChild(img);

            if (item.imageType === "drawing") {
                const tag = document.createElement("span");
                tag.className = "gift-media-badge";
                tag.textContent = "🎨 Doodle";
                imgWrap.appendChild(tag);
            }

            card.appendChild(imgWrap);
        }

        // 2. Body
        const body = document.createElement("div");
        body.className = "gift-card-body";

        // Occasion / Category / Most Wanted Badges Row
        const badgesRow = document.createElement("div");
        badgesRow.className = "gift-card-badges";

        const occKey = item.occasion || "anytime";
        const occBadge = document.createElement("span");
        occBadge.className = `gift-occasion-badge occasion-${occKey}`;
        occBadge.textContent = OCCASION_LABELS[occKey] || occKey;
        badgesRow.appendChild(occBadge);

        if (item.categoryTag && CATEGORY_LABELS[item.categoryTag]) {
            const catBadge = document.createElement("span");
            catBadge.className = "gift-category-badge";
            catBadge.textContent = CATEGORY_LABELS[item.categoryTag];
            badgesRow.appendChild(catBadge);
        }

        if (isMe && !item.isAdultSurprise) {
            const starBtn = document.createElement("button");
            starBtn.type = "button";
            starBtn.className = `gift-star-btn ${item.isMostWanted ? "active" : ""}`;
            starBtn.title = item.isMostWanted ? "Remove Most Wanted star" : "Mark as Most Wanted (max 3)";
            starBtn.textContent = item.isMostWanted ? "⭐ Most Wanted" : "☆ Star";
            starBtn.addEventListener("click", () => toggleMostWanted(item));
            badgesRow.appendChild(starBtn);
        } else if (item.isMostWanted) {
            const starBadge = document.createElement("span");
            starBadge.className = "gift-star-badge";
            starBadge.textContent = "⭐ Most Wanted";
            badgesRow.appendChild(starBadge);
        }

        body.appendChild(badgesRow);

        const title = document.createElement("h3");
        title.className = "gift-card-title";
        title.textContent = item.title;
        body.appendChild(title);

        if (item.description) {
            const desc = document.createElement("p");
            desc.className = "gift-card-desc";
            desc.textContent = item.description;
            body.appendChild(desc);
        }

        if (item.url) {
            const linkWrap = document.createElement("div");
            linkWrap.className = "gift-card-link-wrap";

            let domain = "Store Link";
            try {
                domain = new URL(item.url).hostname.replace(/^www\./, "");
            } catch (e) {}

            const link = document.createElement("a");
            link.href = item.url;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.className = "btn btn-sm btn-outline-primary gift-card-link-btn";
            link.innerHTML = `
                <svg class="icon me-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 5h5v5"/><path d="M19 5l-8 8"/><path d="M17 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h5"/></svg>
                <span>${domain}</span>
            `;
            linkWrap.appendChild(link);
            body.appendChild(linkWrap);
        }

        card.appendChild(body);

        // 3. Footer
        const footer = document.createElement("div");
        footer.className = "gift-card-footer";

        if (isMe) {
            // Owner actions only — NEVER show claim info
            const ownerTools = document.createElement("div");
            ownerTools.className = "gift-owner-tools";

            if (opts.canReorder) {
                if (opts.index > 0) {
                    const upBtn = document.createElement("button");
                    upBtn.type = "button";
                    upBtn.className = "btn btn-sm btn-outline-secondary gift-tool-btn";
                    upBtn.title = "Move up";
                    upBtn.textContent = "▲";
                    upBtn.addEventListener("click", () => moveItem(opts.index, opts.index - 1));
                    ownerTools.appendChild(upBtn);
                }
                if (opts.index < opts.totalCount - 1) {
                    const dnBtn = document.createElement("button");
                    dnBtn.type = "button";
                    dnBtn.className = "btn btn-sm btn-outline-secondary gift-tool-btn";
                    dnBtn.title = "Move down";
                    dnBtn.textContent = "▼";
                    dnBtn.addEventListener("click", () => moveItem(opts.index, opts.index + 1));
                    ownerTools.appendChild(dnBtn);
                }
            }

            const editBtn = document.createElement("button");
            editBtn.type = "button";
            editBtn.className = "btn btn-sm btn-outline-secondary gift-tool-btn";
            editBtn.title = "Edit item";
            editBtn.innerHTML = window.mcwutIcon("pencil");
            editBtn.addEventListener("click", () => openEditModal(item));
            ownerTools.appendChild(editBtn);

            const delBtn = document.createElement("button");
            delBtn.type = "button";
            delBtn.className = "btn btn-sm btn-outline-danger gift-tool-btn";
            delBtn.title = "Delete item";
            delBtn.innerHTML = window.mcwutIcon("trash");
            delBtn.addEventListener("click", () => deleteItem(item));
            ownerTools.appendChild(delBtn);

            footer.appendChild(ownerTools);
        } else if (!isKid) {
            const claimSection = document.createElement("div");
            claimSection.className = "gift-claim-section";

            if (!item.isClaimed) {
                const claimBtn = document.createElement("button");
                claimBtn.type = "button";
                claimBtn.className = "btn btn-sm btn-outline-success gift-claim-btn";
                claimBtn.innerHTML = `
                    <svg class="icon me-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>
                    <span>Claim Gift</span>
                `;
                claimBtn.addEventListener("click", () => openClaimModal(item));
                claimSection.appendChild(claimBtn);
            } else {
                // Header claim badge
                if (item.isClaimedByMe) {
                    const badge = document.createElement("div");
                    badge.className = "gift-claimed-badge is-me";
                    badge.innerHTML = `<span class="badge-text">✓ Claimed by You</span>`;
                    claimSection.appendChild(badge);
                } else {
                    const badge = document.createElement("div");
                    badge.className = "gift-claimed-badge is-other";

                    const dot = document.createElement("span");
                    dot.className = "claimer-dot";
                    dot.style.background = item.claimedByAccentColor || "#0b1f3a";

                    const text = document.createElement("span");
                    text.className = "badge-text";
                    text.textContent = `✓ Claimed by ${item.claimedByName || "another adult"}`;

                    badge.appendChild(dot);
                    badge.appendChild(text);
                    claimSection.appendChild(badge);
                }

                // Stage pills for claimer or split contributor; read-only stage pill for others
                const activeStage = item.claimStatus || "claimed";
                if (item.isClaimedByMe || item.isSplitByMe) {
                    const stageBar = document.createElement("div");
                    stageBar.className = "gift-status-pills";
                    STATUS_STAGES.forEach(st => {
                        const pill = document.createElement("button");
                        pill.type = "button";
                        pill.className = `gift-status-pill ${activeStage === st.key ? "active" : ""}`;
                        pill.textContent = st.label;
                        pill.addEventListener("click", () => updateClaimStatus(item, st.key));
                        stageBar.appendChild(pill);
                    });
                    claimSection.appendChild(stageBar);
                } else {
                    const stageInfo = STATUS_STAGES.find(s => s.key === activeStage);
                    if (stageInfo && activeStage !== "claimed") {
                        const stageChip = document.createElement("span");
                        stageChip.className = "gift-stage-readonly";
                        stageChip.textContent = stageInfo.label;
                        claimSection.appendChild(stageChip);
                    }
                }

                if (item.claimNotes) {
                    const note = document.createElement("div");
                    note.className = "gift-claim-note";
                    note.textContent = item.isClaimedByMe ? `Your note: ${item.claimNotes}` : `Note: ${item.claimNotes}`;
                    claimSection.appendChild(note);
                }

                // Group Split info + Chip In toggle
                if (item.openToSplit) {
                    const splitWrap = document.createElement("div");
                    splitWrap.className = "gift-split-row";

                    const splitBadge = document.createElement("span");
                    splitBadge.className = "gift-split-badge";
                    const helpers = item.splitHelperNames || [];
                    splitBadge.textContent = helpers.length > 0
                        ? `🤝 Group Gift · With ${helpers.join(", ")}`
                        : "🤝 Open to Group Split";
                    splitWrap.appendChild(splitBadge);

                    if (item.canChipIn) {
                        const chipBtn = document.createElement("button");
                        chipBtn.type = "button";
                        chipBtn.className = `btn btn-sm ${item.isSplitByMe ? "btn-outline-secondary" : "btn-outline-primary"} gift-split-btn`;
                        chipBtn.textContent = item.isSplitByMe ? "Leave Split" : "🤝 Chip In";
                        chipBtn.addEventListener("click", () => toggleSplit(item));
                        splitWrap.appendChild(chipBtn);
                    }

                    claimSection.appendChild(splitWrap);
                }

                // Unclaim action (for claimer or Admin)
                if (item.canUnclaim) {
                    const unclaimBtn = document.createElement("button");
                    unclaimBtn.type = "button";
                    unclaimBtn.className = "btn btn-sm btn-link text-danger gift-unclaim-btn";
                    unclaimBtn.textContent = item.isDeletedByOwner ? "Unclaim & Clear" : "Unclaim";
                    unclaimBtn.addEventListener("click", () => unclaimItem(item));
                    claimSection.appendChild(unclaimBtn);
                }
            }

            // Creator/Admin delete button on adult secret surprises
            if (item.isAdultSurprise && item.canDelete) {
                const delSurpriseBtn = document.createElement("button");
                delSurpriseBtn.type = "button";
                delSurpriseBtn.className = "btn btn-sm btn-link text-danger gift-unclaim-btn";
                delSurpriseBtn.textContent = "Delete Surprise";
                delSurpriseBtn.addEventListener("click", () => deleteSurprise(item));
                claimSection.appendChild(delSurpriseBtn);
            }

            footer.appendChild(claimSection);
        }

        card.appendChild(footer);
        return card;
    }

    // --- OWNER & ADULT ACTIONS ---
    function openEditModal(item) {
        editIdInput.value = item.id;
        editTitleInput.value = item.title;
        if (editOccasionInput) editOccasionInput.value = item.occasion || "anytime";
        if (editCategoryInput) editCategoryInput.value = item.categoryTag || "";
        if (editMostWantedInput) editMostWantedInput.checked = Boolean(item.isMostWanted);
        editUrlInput.value = item.url || "";
        editDescInput.value = item.description || "";
        bsEditModal?.show();
    }

    async function toggleMostWanted(item) {
        try {
            const updated = await api(`/api/gifts/${encodeURIComponent(item.id)}/most-wanted`, {
                method: "POST",
                headers: headers()
            });
            const idx = currentItems.findIndex(i => i.id === item.id);
            if (idx >= 0) currentItems[idx] = updated;
            renderItems(true, members.find(m => m.userId === currentUserId));
            toast(updated.isMostWanted ? "Marked as ⭐ Most Wanted!" : "Removed Most Wanted star.", "info");
        } catch (err) {
            toast(err.message, "danger");
        }
    }

    async function deleteItem(item) {
        if (!confirm(`Remove "${item.title}" from your wishlist?`)) return;
        try {
            await api(`/api/gifts/${encodeURIComponent(item.id)}`, {
                method: "DELETE",
                headers: headers()
            });
            toast("Item removed from your wishlist.", "info");
            await loadList(currentUserId);
            await loadMembers();
        } catch (err) {
            toast(err.message, "danger");
        }
    }

    async function deleteSurprise(item) {
        if (!confirm(`Delete secret off-list surprise "${item.title}"?`)) return;
        try {
            await api(`/api/gifts/${encodeURIComponent(item.id)}`, {
                method: "DELETE",
                headers: headers()
            });
            toast("Secret surprise removed.", "info");
            await refreshActiveView();
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

    function openClaimModal(item) {
        pendingClaimItemId = item.id;
        claimItemName.textContent = `"${item.title}"`;
        claimNoteInput.value = "";
        if (claimSplitCheck) claimSplitCheck.checked = false;
        bsClaimModal?.show();
    }

    async function unclaimItem(item) {
        if (!confirm(`Unclaim "${item.title}"?`)) return;
        try {
            await api(`/api/gifts/${encodeURIComponent(item.id)}/unclaim`, {
                method: "POST",
                headers: headers()
            });
            toast("Gift unclaimed.", "info");
            await refreshActiveView();
        } catch (err) {
            toast(err.message, "danger");
        }
    }

    async function updateClaimStatus(item, nextStatus) {
        try {
            await api(`/api/gifts/${encodeURIComponent(item.id)}/claim-status`, {
                method: "POST",
                headers: headers({ "Content-Type": "application/json" }),
                body: JSON.stringify({ status: nextStatus })
            });
            toast(`Updated status to ${nextStatus}.`, "success");
            await refreshActiveView();
        } catch (err) {
            toast(err.message, "danger");
        }
    }

    async function toggleSplit(item) {
        try {
            const updated = await api(`/api/gifts/${encodeURIComponent(item.id)}/split-toggle`, {
                method: "POST",
                headers: headers()
            });
            toast(updated.isSplitByMe ? "Joined group gift split!" : "Left group gift split.", "info");
            await refreshActiveView();
        } catch (err) {
            toast(err.message, "danger");
        }
    }

    // --- INITIALIZE ROUTE ---
    async function init() {
        const hash = window.location.hash;
        if (hash === "#shopping" && !isKid) {
            viewMode = "shopping";
            listContainerEl?.classList.add("d-none");
            shoppingViewEl?.classList.remove("d-none");
            await loadMembers();
            await loadMyClaims();
            return;
        }

        if (hash.startsWith("#member=")) {
            const targetId = hash.replace("#member=", "").trim();
            if (targetId) selectedOwnerId = targetId;
        }

        await loadMembers();
        await loadList(selectedOwnerId);
    }

    init();
})();
