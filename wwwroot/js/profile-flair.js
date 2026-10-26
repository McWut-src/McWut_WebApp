(function () {
    const sheet = document.getElementById("profile-sheet");
    if (!sheet) return;

    const tokenMeta = document.querySelector('meta[name="request-verification-token"]');
    const antiforgery = tokenMeta ? tokenMeta.getAttribute("content") : "";

    let state = {
        statusTag: sheet.getAttribute("data-tag") || "",
        headerBadge: sheet.getAttribute("data-badge") || "none",
        headerMotif: sheet.getAttribute("data-motif") || "none",
        backgroundTile: sheet.getAttribute("data-tile") || "none",
        chimeTheme: sheet.getAttribute("data-chime") || "classic"
    };

    const colorInput = document.getElementById("AccentColor") || document.querySelector(".color-pick");
    const colorHex = document.getElementById("color-hex");
    const statusInput = document.getElementById("StatusTag");

    // 1. Color Swatches
    document.querySelectorAll("[data-color-preset]").forEach(function (btn) {
        btn.addEventListener("click", function () {
            const hex = btn.getAttribute("data-color-preset");
            if (!hex || !colorInput) return;
            colorInput.value = hex;
            if (colorHex) colorHex.textContent = hex;
            const ink = window.mcwut ? window.mcwut.pillInk(hex) : "#ffffff";
            document.body.style.setProperty("--bar", hex);
            document.body.style.setProperty("--bar-ink", ink);
            document.body.classList.toggle("bar-pale", ink === "#0b1f3a");
            document.body.classList.toggle("bar-dark", ink !== "#0b1f3a");
        });
    });

    async function api(url, method, body) {
        const opts = {
            method: method || "GET",
            headers: {
                "Accept": "application/json",
                "RequestVerificationToken": antiforgery
            }
        };
        if (body !== undefined) {
            opts.headers["Content-Type"] = "application/json";
            opts.body = JSON.stringify(body);
        }
        const res = await fetch(url, opts);
        if (res.status === 204) return null;
        let data = null;
        try {
            data = await res.json();
        } catch {
            data = null;
        }
        if (!res.ok) {
            const msg = (data && (data.error || data.detail || data.title)) || "Request failed.";
            throw new Error(msg);
        }
        return data;
    }

    function applyLivePreview(view) {
        if (!view) return;
        if (view.settings) {
            state.statusTag = view.settings.statusTag || "";
            state.headerBadge = view.settings.headerBadge || "none";
            state.headerMotif = view.settings.headerMotif || "none";
            state.backgroundTile = view.settings.backgroundTile || "none";
            state.chimeTheme = view.settings.chimeTheme || "classic";
            document.body.setAttribute("data-chime", state.chimeTheme);
        }

        // Live-update header badge
        const topbar = document.querySelector(".topbar");
        const brand = topbar ? topbar.querySelector(".brand") : null;
        let badgeImg = topbar ? topbar.querySelector(".brand-badge") : null;
        if (view.badgeUrl && topbar && brand) {
            if (!badgeImg) {
                badgeImg = document.createElement("img");
                badgeImg.className = "brand-badge";
                badgeImg.alt = "";
                badgeImg.setAttribute("aria-hidden", "true");
                topbar.insertBefore(badgeImg, brand);
            }
            badgeImg.src = view.badgeUrl;
        } else if (badgeImg) {
            badgeImg.remove();
        }

        // Live-update header motif
        let motifEl = topbar ? topbar.querySelector(".topbar-motif") : null;
        if (view.motifUrl && topbar) {
            document.body.style.setProperty("--bar-motif", "url('" + view.motifUrl + "')");
            document.body.classList.add("has-bar-motif");
            if (!motifEl) {
                motifEl = document.createElement("div");
                motifEl.className = "topbar-motif";
                motifEl.setAttribute("aria-hidden", "true");
                topbar.insertBefore(motifEl, topbar.firstChild);
            }
        } else {
            document.body.style.removeProperty("--bar-motif");
            document.body.classList.remove("has-bar-motif");
            if (motifEl) motifEl.remove();
        }

        // Live-update background tile
        if (view.tileUrl) {
            document.body.style.setProperty("--bg-tile", "url('" + view.tileUrl + "')");
            document.body.classList.add("has-bg-tile");
        } else {
            document.body.style.removeProperty("--bg-tile");
            document.body.classList.remove("has-bg-tile");
        }
    }

    function markActiveInGrid(kind, value) {
        const gridId = kind === "badge" ? "badge-grid" : (kind === "motif" ? "motif-grid" : "tile-grid");
        const grid = document.getElementById(gridId);
        if (!grid) return;
        grid.querySelectorAll("[data-flair-kind]").forEach(function (btn) {
            const on = (btn.getAttribute("data-flair-value") || "").toLowerCase() === (value || "").toLowerCase();
            btn.classList.toggle("active", on);
            btn.setAttribute("aria-pressed", on ? "true" : "false");
        });
    }

    async function saveFlair() {
        if (statusInput) {
            state.statusTag = statusInput.value.trim();
        }
        const saved = await api("/api/personalization", "PUT", state);
        applyLivePreview(saved);
        return saved;
    }

    function bindOptionButton(btn) {
        btn.addEventListener("click", async function () {
            const kind = btn.getAttribute("data-flair-kind");
            const val = btn.getAttribute("data-flair-value") || "none";
            if (kind === "badge") state.headerBadge = val;
            else if (kind === "motif") state.headerMotif = val;
            else if (kind === "tile") state.backgroundTile = val;

            markActiveInGrid(kind, val);
            try {
                await saveFlair();
            } catch (err) {
                showStatus(kind === "tile" ? "bg-studio-status" : "header-studio-status", err.message, true);
            }
        });
    }

    function bindDeleteButton(btn) {
        btn.addEventListener("click", async function (e) {
            e.stopPropagation();
            const id = btn.getAttribute("data-delete-svg");
            if (!id) return;
            btn.disabled = true;
            try {
                await api("/api/personalization/svg/" + encodeURIComponent(id), "DELETE");
                const wrap = btn.closest(".flair-custom-wrap");
                if (wrap) wrap.remove();
                const refreshed = await api("/api/personalization", "GET");
                applyLivePreview(refreshed);
                markActiveInGrid("badge", state.headerBadge);
                markActiveInGrid("motif", state.headerMotif);
                markActiveInGrid("tile", state.backgroundTile);
            } catch (err) {
                btn.disabled = false;
                showStatus("header-studio-status", err.message, true);
            }
        });
    }

    document.querySelectorAll("[data-flair-kind]").forEach(bindOptionButton);
    document.querySelectorAll("[data-delete-svg]").forEach(bindDeleteButton);

    function showStatus(elId, text, isError) {
        const el = document.getElementById(elId);
        if (!el) return;
        if (!text) {
            el.hidden = true;
            el.textContent = "";
            return;
        }
        el.hidden = false;
        el.textContent = text;
        el.className = isError ? "field-hint text-danger mt-2 mb-0" : "field-hint text-success mt-2 mb-0";
    }

    function appendCustomOption(item) {
        const kind = item.kind;
        const gridId = kind === "badge" ? "badge-grid" : (kind === "motif" ? "motif-grid" : "tile-grid");
        const grid = document.getElementById(gridId);
        if (!grid) return;

        const wrap = document.createElement("div");
        wrap.className = "flair-custom-wrap";

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "flair-option" + (kind === "motif" ? " flair-option-wide" : "") + " active";
        btn.setAttribute("data-flair-kind", kind);
        btn.setAttribute("data-flair-value", item.value);
        btn.setAttribute("aria-pressed", "true");

        if (kind === "badge") {
            const img = document.createElement("img");
            img.src = item.url;
            img.alt = "";
            img.className = "flair-thumb-badge";
            btn.appendChild(img);
        } else {
            const spanThumb = document.createElement("span");
            spanThumb.className = kind === "motif" ? "flair-thumb-motif" : "flair-thumb-tile";
            spanThumb.style.backgroundImage = "url('" + item.url + "')";
            btn.appendChild(spanThumb);
        }

        if (item.label) {
            btn.title = item.label;
            btn.setAttribute("aria-label", item.label);
        }

        const del = document.createElement("button");
        del.type = "button";
        del.className = "flair-delete";
        del.setAttribute("data-delete-svg", item.id);
        del.title = "Delete";
        del.setAttribute("aria-label", "Delete");
        del.textContent = "×";

        wrap.appendChild(btn);
        wrap.appendChild(del);
        grid.appendChild(wrap);

        bindOptionButton(btn);
        bindDeleteButton(del);
    }

    async function handleGenerate(kind) {
        const themeEl = document.getElementById("ai-" + kind + "-theme");
        const promptEl = document.getElementById("ai-" + kind + "-prompt");
        const btnEl = document.getElementById("ai-" + kind + "-btn");
        const statusId = kind === "tile" ? "bg-studio-status" : "header-studio-status";

        if (!themeEl || !promptEl || !btnEl) return;
        const prompt = promptEl.value.trim();
        if (!prompt) {
            showStatus(statusId, "Write 1 to 5 words first.", true);
            promptEl.focus();
            return;
        }

        const origText = btnEl.textContent;
        btnEl.disabled = true;
        btnEl.textContent = "Creating…";
        showStatus(statusId, "Designing compact SVG with Site AI…", false);

        try {
            const item = await api("/api/personalization/generate", "POST", {
                kind: kind,
                theme: themeEl.value,
                prompt: prompt
            });
            appendCustomOption(item);
            if (kind === "badge") state.headerBadge = item.value;
            else if (kind === "motif") state.headerMotif = item.value;
            else state.backgroundTile = item.value;

            markActiveInGrid(kind, item.value);
            const refreshed = await api("/api/personalization", "GET");
            applyLivePreview(refreshed);
            promptEl.value = "";
            showStatus(statusId, "Created and applied!", false);
        } catch (err) {
            showStatus(statusId, err.message, true);
        } finally {
            btnEl.disabled = false;
            btnEl.textContent = origText;
        }
    }

    document.querySelectorAll("[data-gen-kind]").forEach(function (btn) {
        const kind = btn.getAttribute("data-gen-kind");
        btn.addEventListener("click", function () {
            handleGenerate(kind);
        });
        const promptEl = document.getElementById("ai-" + kind + "-prompt");
        if (promptEl) {
            promptEl.addEventListener("keydown", function (e) {
                if (e.key === "Enter") {
                    e.preventDefault();
                    handleGenerate(kind);
                }
            });
        }
    });

    // Chime selector & preview
    const chimeSelect = document.getElementById("chime-select");
    const chimePreviewBtn = document.getElementById("chime-preview-btn");

    if (chimeSelect) {
        chimeSelect.addEventListener("change", async function () {
            state.chimeTheme = chimeSelect.value;
            document.body.setAttribute("data-chime", state.chimeTheme);
            if (window.mcwut && typeof window.mcwut.playChime === "function") {
                window.mcwut.playChime("receive", state.chimeTheme);
            }
            try {
                await saveFlair();
            } catch {}
        });
    }

    if (chimePreviewBtn && chimeSelect) {
        chimePreviewBtn.addEventListener("click", function () {
            if (window.mcwut && typeof window.mcwut.playChime === "function") {
                window.mcwut.playChime("receive", chimeSelect.value);
            }
        });
    }
})();
