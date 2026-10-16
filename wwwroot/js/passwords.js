(() => {
    const tokenMeta = document.querySelector('meta[name="request-verification-token"]');
    const antiforgery = tokenMeta ? tokenMeta.getAttribute("content") : "";
    const listEl = document.getElementById("password-list");
    const detailEl = document.getElementById("password-detail");
    const searchEl = document.getElementById("password-search");
    if (!listEl || !detailEl) {
        return;
    }

    let items = [];
    let selectedId = null;
    let editing = false;
    let weakOnly = false;
    const weakBtn = document.getElementById("password-weak-only");

    function headers(extra) {
        return Object.assign({
            "RequestVerificationToken": antiforgery,
            "Accept": "application/json",
            "Cache-Control": "no-store"
        }, extra || {});
    }

    async function api(url, options) {
        const response = await fetch(url, options);
        if (response.status === 204) {
            return null;
        }
        const text = await response.text();
        const data = text ? JSON.parse(text) : null;
        if (!response.ok) {
            const message = data && (data.error || data.title) ? (data.error || data.title) : `Request failed (${response.status})`;
            throw new Error(message);
        }
        return data;
    }

    function esc(value) {
        return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            "\"": "&quot;",
            "'": "&#39;"
        }[ch]));
    }

    function safeUrl(url) {
        if (!url) {
            return null;
        }
        try {
            const parsed = new URL(url);
            if (parsed.protocol === "https:" || parsed.protocol === "http:") {
                return parsed.href;
            }
        } catch {
            return null;
        }
        return null;
    }

    function icon(name, extra) {
        return window.mcwutIcon ? window.mcwutIcon(name, extra) : "";
    }

    function passwordCounts() {
        const counts = new Map();
        for (const item of items) {
            const pw = String(item.password || "");
            if (pw) {
                counts.set(pw, (counts.get(pw) || 0) + 1);
            }
        }
        return counts;
    }

    function itemWarnings(item, counts) {
        const flags = [];
        const pw = String(item.password || "");
        if (!pw) {
            return flags;
        }
        if ((counts.get(pw) || 0) > 1) {
            flags.push("Reused");
        }
        if (pw.length < 10) {
            flags.push("Short");
        }
        return flags;
    }

    function generateStrongPassword(length = 20) {
        const chars = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%^&*()-_=+";
        const bytes = new Uint32Array(length);
        crypto.getRandomValues(bytes);
        let out = "";
        for (let i = 0; i < length; i++) {
            out += chars[bytes[i] % chars.length];
        }
        return out;
    }

    function matches(item, query) {
        if (!query) {
            return true;
        }
        const haystack = [item.name, item.username, item.url, item.information].join("\n").toLowerCase();
        return haystack.includes(query);
    }

    function selected() {
        return items.find(item => item.id === selectedId) || null;
    }

    async function copyText(value, button) {
        const text = value || "";
        if (!text) {
            return;
        }
        await navigator.clipboard.writeText(text);
        const previous = button.getAttribute("aria-label") || "Copy";
        const previousTitle = button.getAttribute("title") || previous;
        button.classList.add("is-copied");
        button.setAttribute("aria-label", "Copied");
        button.setAttribute("title", "Copied");
        setTimeout(() => {
            button.classList.remove("is-copied");
            button.setAttribute("aria-label", previous);
            button.setAttribute("title", previousTitle);
        }, 1200);
    }

    function renderList() {
        const counts = passwordCounts();
        const weakCount = items.filter(item => itemWarnings(item, counts).length > 0).length;
        if (weakBtn) {
            weakBtn.hidden = weakCount === 0 && !weakOnly;
            weakBtn.textContent = weakCount > 0 ? `Weak / reused (${weakCount})` : "Weak / reused";
            weakBtn.setAttribute("aria-pressed", weakOnly ? "true" : "false");
            weakBtn.classList.toggle("btn-warning", weakOnly);
            weakBtn.classList.toggle("btn-outline-secondary", !weakOnly);
        }
        const query = (searchEl?.value || "").trim().toLowerCase();
        const visible = items.filter(item => {
            if (weakOnly && itemWarnings(item, counts).length === 0) {
                return false;
            }
            return matches(item, query);
        });
        if (visible.length === 0) {
            listEl.innerHTML = `<p class="empty">${items.length === 0 ? "No logins yet." : "No matches."}</p>`;
            return;
        }
        listEl.innerHTML = visible.map(item => {
            const flags = itemWarnings(item, counts);
            const flagText = flags.length > 0 ? ` · ${flags.join(", ")}` : "";
            return `
            <button type="button" class="password-item${item.id === selectedId ? " active" : ""}" data-id="${esc(item.id)}" role="option" aria-selected="${item.id === selectedId ? "true" : "false"}">
                <span class="pw-mark">${icon("lock")}</span>
                <span>
                    <span class="pw-name">${esc(item.name)}</span>
                    <span class="pw-sub">${esc((item.username || item.url || "No username") + flagText)}</span>
                </span>
            </button>`;
        }).join("");
    }

    function fieldRow(label, value, actions) {
        return `
            <div class="mb-3">
                <div class="form-label mb-1">${label}</div>
                <div class="d-flex gap-2 align-items-center">
                    <div class="password-value secret flex-grow-1">${value}</div>
                    <div class="field-tools">${actions}</div>
                </div>
            </div>`;
    }

    function renderDetail() {
        const item = selected();
        if (!item && !editing) {
            detailEl.innerHTML = `<div class="card-body"><p class="empty">Select a login, or create one.</p></div>`;
            return;
        }

        if (editing) {
            const current = item || { name: "", username: "", password: "", url: "", information: "" };
            detailEl.innerHTML = `
                <div class="card-body">
                    <h2 class="h5 mb-3">${item ? "Edit login" : "New login"}</h2>
                    <div id="password-form-error" class="alert alert-danger" hidden></div>
                    <div class="mb-3">
                        <label class="form-label" for="pw-name">Name</label>
                        <input id="pw-name" class="form-control" value="${esc(current.name)}" autocomplete="off" />
                    </div>
                    <div class="mb-3">
                        <label class="form-label" for="pw-username">Username</label>
                        <input id="pw-username" class="form-control" value="${esc(current.username)}" autocomplete="off" />
                    </div>
                    <div class="mb-3">
                        <label class="form-label" for="pw-password">Password</label>
                        <input id="pw-password" class="form-control" type="password" value="${esc(current.password)}" autocomplete="new-password" />
                        <div class="d-flex gap-3">
                            <button type="button" class="btn btn-link btn-sm px-0" id="pw-show-edit">Show</button>
                            <button type="button" class="btn btn-link btn-sm px-0" id="pw-generate">Generate strong password</button>
                        </div>
                    </div>
                    <div class="mb-3">
                        <label class="form-label" for="pw-url">URL</label>
                        <input id="pw-url" class="form-control" value="${esc(current.url || "")}" placeholder="https://" autocomplete="off" />
                    </div>
                    <div class="mb-3">
                        <label class="form-label" for="pw-information">Information</label>
                        <textarea id="pw-information" class="form-control" rows="5">${esc(current.information || "")}</textarea>
                    </div>
                    <div class="d-flex gap-2">
                        <button type="button" class="btn btn-primary" id="pw-save">Save</button>
                        <button type="button" class="btn btn-outline-secondary" id="pw-cancel">Cancel</button>
                    </div>
                </div>`;
            return;
        }

        const href = safeUrl(item.url);
        const passwordShown = false;
        const warnings = itemWarnings(item, passwordCounts());
        const warningBanner = warnings.length > 0
            ? `<div class="alert alert-warning py-2 small">Password check: <strong>${esc(warnings.join(", "))}</strong>. Consider editing this login and generating a unique password.</div>`
            : "";
        detailEl.innerHTML = `
            <div class="card-body">
                ${item.unreadable ? `<div class="alert alert-warning">This login could not be read. Saving a new copy replaces it.</div>` : ""}
                ${warningBanner}
                <div class="d-flex justify-content-between align-items-start gap-2 mb-3">
                    <h2 class="h5 mb-0">${esc(item.name)}</h2>
                    <div class="field-tools">
                        <button type="button" class="icon-btn" id="pw-edit" title="Edit" aria-label="Edit">${icon("pencil")}</button>
                        <button type="button" class="icon-btn danger" id="pw-delete" title="Delete" aria-label="Delete">${icon("trash")}</button>
                    </div>
                </div>
                ${fieldRow("Username", `<span id="pw-username-text">${esc(item.username || "—")}</span>`, item.username ? `<button type="button" class="icon-btn" data-copy="username" title="Copy username" aria-label="Copy username">${icon("copy")}</button>` : "")}
                ${fieldRow("Password", `<span id="pw-password-text">${item.password ? "••••••••" : "—"}</span>`, item.password ? `<button type="button" class="icon-btn" id="pw-show" title="Show password" aria-label="Show password">${icon("eye", "icon-show")}${icon("eye-off", "icon-hide")}</button><button type="button" class="icon-btn" data-copy="password" title="Copy password" aria-label="Copy password">${icon("copy")}</button>` : "")}
                ${fieldRow("URL", href ? `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(item.url)}</a>` : `<span>${esc(item.url || "—")}</span>`, href ? `<button type="button" class="icon-btn" data-copy="url" title="Copy URL" aria-label="Copy URL">${icon("copy")}</button><a class="icon-btn" href="${esc(href)}" target="_blank" rel="noopener noreferrer" title="Open" aria-label="Open">${icon("external")}</a>` : "")}
                <div class="mb-0">
                    <div class="form-label">Information</div>
                    <div class="password-notes">${esc(item.information || "—")}</div>
                </div>
            </div>`;
        detailEl.dataset.passwordShown = passwordShown ? "1" : "0";
    }

    async function load(selectId) {
        items = await api("/api/passwords", { headers: headers() }) || [];
        if (selectId && items.some(item => item.id === selectId)) {
            selectedId = selectId;
        } else if (selectedId && !items.some(item => item.id === selectedId)) {
            selectedId = null;
            editing = false;
        }
        renderList();
        renderDetail();
    }

    listEl.addEventListener("click", (event) => {
        const button = event.target.closest("button[data-id]");
        if (!button) {
            return;
        }
        selectedId = button.getAttribute("data-id");
        editing = false;
        renderList();
        renderDetail();
    });

    searchEl?.addEventListener("input", renderList);

    weakBtn?.addEventListener("click", () => {
        weakOnly = !weakOnly;
        renderList();
    });

    document.getElementById("password-new")?.addEventListener("click", () => {
        selectedId = null;
        editing = true;
        renderList();
        renderDetail();
        document.getElementById("pw-name")?.focus();
    });

    const importBtn = document.getElementById("password-import");
    const importFile = document.getElementById("password-import-file");
    const statusEl = document.getElementById("password-status");

    function setStatus(message) {
        if (!statusEl) {
            return;
        }
        statusEl.textContent = message || "";
        statusEl.hidden = !message;
    }

    importBtn?.addEventListener("click", () => {
        if (importFile) {
            importFile.value = "";
            importFile.click();
        }
    });

    importFile?.addEventListener("change", async () => {
        const file = importFile.files && importFile.files[0];
        if (!file) {
            return;
        }
        try {
            const text = await file.text();
            const result = await api("/api/passwords/import", {
                method: "POST",
                headers: headers({ "Content-Type": "application/json" }),
                body: text
            });
            editing = false;
            await load(result && result.firstAddedId ? result.firstAddedId : selectedId);
            const added = result ? result.added : 0;
            const skipped = result ? result.skipped : 0;
            const parts = [`Imported ${added} ${added === 1 ? "login" : "logins"}.`];
            if (skipped > 0) {
                parts.push(`${skipped} already in your vault.`);
            }
            setStatus(parts.join(" "));
        } catch (err) {
            setStatus(err.message);
        } finally {
            importFile.value = "";
        }
    });

    detailEl.addEventListener("click", async (event) => {
        const button = event.target.closest("button");
        if (!button) {
            return;
        }
        const item = selected();
        if (button.id === "pw-edit") {
            editing = true;
            renderDetail();
            return;
        }
        if (button.id === "pw-cancel") {
            editing = false;
            renderDetail();
            return;
        }
        if (button.id === "pw-show-edit") {
            const input = document.getElementById("pw-password");
            if (!input) {
                return;
            }
            const hidden = input.type === "password";
            input.type = hidden ? "text" : "password";
            button.textContent = hidden ? "Hide" : "Show";
            return;
        }
        if (button.id === "pw-generate") {
            const input = document.getElementById("pw-password");
            if (!input) {
                return;
            }
            input.value = generateStrongPassword();
            input.type = "text";
            const showEdit = document.getElementById("pw-show-edit");
            if (showEdit) {
                showEdit.textContent = "Hide";
            }
            return;
        }
        if (button.id === "pw-show" && item) {
            const text = document.getElementById("pw-password-text");
            const reveal = detailEl.dataset.passwordShown !== "1";
            if (text) {
                text.textContent = reveal ? item.password : "••••••••";
            }
            detailEl.dataset.passwordShown = reveal ? "1" : "0";
            button.classList.toggle("is-revealed", reveal);
            const label = reveal ? "Hide password" : "Show password";
            button.setAttribute("aria-label", label);
            button.setAttribute("title", label);
            return;
        }
        if (button.dataset.copy && item) {
            const value = button.dataset.copy === "username" ? item.username
                : button.dataset.copy === "password" ? item.password
                : item.url;
            try {
                await copyText(value, button);
            } catch (err) {
                alert(err.message);
            }
            return;
        }
        if (button.id === "pw-delete" && item) {
            if (!confirm("Delete this login?")) {
                return;
            }
            try {
                await api(`/api/passwords/${item.id}`, { method: "DELETE", headers: headers() });
                selectedId = null;
                editing = false;
                await load(null);
            } catch (err) {
                alert(err.message);
            }
            return;
        }
        if (button.id === "pw-save") {
            const body = {
                name: document.getElementById("pw-name").value,
                username: document.getElementById("pw-username").value,
                password: document.getElementById("pw-password").value,
                url: document.getElementById("pw-url").value,
                information: document.getElementById("pw-information").value
            };
            const errorEl = document.getElementById("password-form-error");
            try {
                const saved = item
                    ? await api(`/api/passwords/${item.id}`, {
                        method: "PUT",
                        headers: headers({ "Content-Type": "application/json" }),
                        body: JSON.stringify(body)
                    })
                    : await api("/api/passwords", {
                        method: "POST",
                        headers: headers({ "Content-Type": "application/json" }),
                        body: JSON.stringify(body)
                    });
                editing = false;
                await load(saved.id);
            } catch (err) {
                if (errorEl) {
                    errorEl.hidden = false;
                    errorEl.textContent = err.message;
                }
            }
        }
    });

    load(null).catch(err => {
        listEl.innerHTML = `<p class="empty">${esc(err.message)}</p>`;
    });
})();
