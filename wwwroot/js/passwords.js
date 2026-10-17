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
        const raw = String(url).trim();
        if (!raw) {
            return null;
        }
        const candidate = /^https?:\/\//i.test(raw)
            ? raw
            : raw.startsWith("//")
                ? "https:" + raw
                : "https://" + raw;
        try {
            const parsed = new URL(candidate);
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

    function faviconHost(url) {
        const href = safeUrl(url);
        if (!href) {
            return null;
        }
        try {
            const host = new URL(href).hostname.toLowerCase();
            if (!host || host === "localhost" || !host.includes(".") || /^\d+(\.\d+){3}$/.test(host) || host.startsWith("[")) {
                return null;
            }
            if (host.endsWith(".local") || host.endsWith(".example") || host.endsWith(".internal") || host.endsWith(".invalid") || host.endsWith(".test")) {
                return null;
            }
            return host;
        } catch {
            return null;
        }
    }

    function itemMark(item) {
        const host = faviconHost(item && item.url);
        if (!host) {
            return `<span class="pw-mark">${icon("lock")}</span>`;
        }
        const src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`;
        return `<span class="pw-mark"><img class="pw-favicon" src="${esc(src)}" alt="" loading="lazy" referrerpolicy="no-referrer" hidden /><span class="pw-fallback">${icon("lock")}</span></span>`;
    }

    function isShared(item) {
        return !!(item && item.sharedBy);
    }

    function safeColor(value) {
        const color = String(value || "").trim().toLowerCase();
        return /^#[0-9a-f]{6}$/.test(color) ? color : "#0b1f3a";
    }

    function pillInk(color) {
        const hex = safeColor(color).slice(1);
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        return (r * 299 + g * 587 + b * 114) / 1000 > 160 ? "#0b1f3a" : "#ffffff";
    }

    function pill(label, color) {
        const c = safeColor(color);
        return `<span class="member-pill" style="background:${c};color:${pillInk(c)}">${esc(label || "Member")}</span>`;
    }

    function itemPills(item) {
        if (isShared(item)) {
            return `<span class="member-pills">${pill("From " + (item.sharedBy.displayName || "Member"), item.sharedBy.color)}</span>`;
        }
        const tags = Array.isArray(item.sharedWith) ? item.sharedWith : [];
        if (tags.length === 0) {
            return "";
        }
        return `<span class="member-pills">${tags.map(tag => pill(tag.displayName, tag.color)).join("")}</span>`;
    }

    function memberLabel(member) {
        const name = String(member.displayName || "").trim();
        if (name && !name.includes("@")) {
            return name;
        }
        const source = String(member.email || name || "");
        const at = source.indexOf("@");
        return (at > 0 ? source.slice(0, at).trim() : "") || "Member";
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
        const query = (searchEl?.value || "").trim().toLowerCase();
        const visible = items.filter(item => matches(item, query));
        if (visible.length === 0) {
            listEl.innerHTML = `<p class="empty">${items.length === 0 ? "No logins yet." : "No matches."}</p>`;
            return;
        }
        listEl.innerHTML = visible.map(item => `
            <button type="button" class="password-item${item.id === selectedId ? " active" : ""}" data-id="${esc(item.id)}" role="option" aria-selected="${item.id === selectedId ? "true" : "false"}">
                ${itemMark(item)}
                <span>
                    <span class="pw-name">${esc(item.name)}</span>
                    <span class="pw-sub">${esc(item.username || item.url || "No username")}</span>
                    ${itemPills(item)}
                </span>
            </button>`).join("");
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
                        <button type="button" class="btn btn-link btn-sm px-0" id="pw-show-edit">Show</button>
                    </div>
                    <div class="mb-3">
                        <label class="form-label" for="pw-url">URL</label>
                        <input id="pw-url" class="form-control" value="${esc(current.url || "")}" placeholder="facebook.com" autocomplete="off" />
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
        const shared = isShared(item);
        const sharedBanner = shared
            ? `<div class="alert alert-info py-2 small">Shared with you by <strong>${esc(item.sharedBy.displayName || "Member")}</strong>. Read only. Changes they make show here.</div>`
            : "";
        const tools = shared
            ? ""
            : `<button type="button" class="icon-btn" id="pw-share" title="Share with a member" aria-label="Share with a member">${icon("users")}</button>
                        <button type="button" class="icon-btn" id="pw-edit" title="Edit" aria-label="Edit">${icon("pencil")}</button>
                        <button type="button" class="icon-btn danger" id="pw-delete" title="Delete" aria-label="Delete">${icon("trash")}</button>`;
        detailEl.innerHTML = `
            <div class="card-body">
                ${item.unreadable ? `<div class="alert alert-warning">This login could not be read.${shared ? "" : " Saving a new copy replaces it."}</div>` : ""}
                ${sharedBanner}
                <div class="d-flex justify-content-between align-items-start gap-2 mb-3">
                    <div class="d-flex align-items-center gap-2">
                        ${itemMark(item)}
                        <div>
                            <h2 class="h5 mb-0">${esc(item.name)}</h2>
                            <span id="pw-detail-pills">${itemPills(item)}</span>
                        </div>
                    </div>
                    <div class="field-tools">
                        ${tools}
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

    function handleFaviconEvent(event) {
        const img = event.target;
        if (!img || !img.classList || !img.classList.contains("pw-favicon")) {
            return;
        }
        const fallback = img.parentElement && img.parentElement.querySelector(".pw-fallback");
        if (event.type === "error" || !img.naturalWidth || img.naturalWidth <= 16) {
            img.hidden = true;
            if (fallback) {
                fallback.hidden = false;
            }
        } else if (event.type === "load") {
            img.hidden = false;
            if (fallback) {
                fallback.hidden = true;
            }
        }
    }

    listEl.addEventListener("load", handleFaviconEvent, true);
    listEl.addEventListener("error", handleFaviconEvent, true);
    detailEl.addEventListener("load", handleFaviconEvent, true);
    detailEl.addEventListener("error", handleFaviconEvent, true);

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

    const genBtn = document.getElementById("password-gen-btn");
    const genOut = document.getElementById("password-gen-out");
    const genCopy = document.getElementById("password-gen-copy");

    genBtn?.addEventListener("click", () => {
        if (!genOut) {
            return;
        }
        genOut.value = generateStrongPassword();
        if (genCopy) {
            genCopy.disabled = false;
        }
    });

    genOut?.addEventListener("click", () => {
        if (genOut.value) {
            genOut.select();
        }
    });

    genCopy?.addEventListener("click", async () => {
        if (!genOut || !genOut.value) {
            return;
        }
        try {
            await navigator.clipboard.writeText(genOut.value);
            const prev = genCopy.textContent;
            genCopy.textContent = "Copied";
            setTimeout(() => {
                genCopy.textContent = prev;
            }, 1200);
        } catch (err) {
            alert(err.message);
        }
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

    let menuItemId = null;

    function closeShareMenu() {
        menuItemId = null;
        const menu = document.getElementById("member-menu");
        if (menu) {
            menu.hidden = true;
        }
    }

    function ensureShareMenu() {
        let menu = document.getElementById("member-menu");
        if (menu) {
            return menu;
        }
        menu = document.createElement("div");
        menu.id = "member-menu";
        menu.className = "member-menu";
        menu.hidden = true;
        menu.setAttribute("role", "group");
        menu.setAttribute("aria-label", "Share with a member");
        document.body.appendChild(menu);
        menu.addEventListener("change", (event) => {
            const input = event.target.closest("input[data-user-id]");
            if (input) {
                toggleShare(input).catch(err => alert(err.message));
            }
        });
        return menu;
    }

    function placeShareMenu(button) {
        const menu = ensureShareMenu();
        const rect = button.getBoundingClientRect();
        const width = menu.offsetWidth || 240;
        const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));
        let top = rect.bottom + 6;
        menu.style.left = left + "px";
        menu.style.top = top + "px";
        const height = menu.offsetHeight;
        if (top + height > window.innerHeight - 8) {
            menu.style.top = Math.max(8, rect.top - height - 6) + "px";
        }
    }

    async function openShareMenu(item, button) {
        const menu = ensureShareMenu();
        if (!menu.hidden && menuItemId === item.id) {
            closeShareMenu();
            return;
        }
        menuItemId = item.id;
        const rows = await api("/api/members", { headers: headers() }) || [];
        if (menuItemId !== item.id) {
            return;
        }
        if (rows.length === 0) {
            menu.innerHTML = `<p class="member-menu-empty">No one else is on McWut yet.</p>`;
        } else {
            const sharedIds = new Set((item.sharedWith || []).map(tag => String(tag.userId).toLowerCase()));
            menu.innerHTML = `<p class="member-menu-empty">Read only. They can view and copy, not edit.</p>` + rows.map(member => {
                const color = safeColor(member.accentColor);
                const checked = sharedIds.has(String(member.userId).toLowerCase()) ? " checked" : "";
                return `<label class="member-menu-row">
                    <input type="checkbox" data-user-id="${esc(member.userId)}"${checked}>
                    <span class="member-swatch" style="background:${color}"></span>
                    <span class="member-menu-name">${esc(memberLabel(member))}</span>
                </label>`;
            }).join("");
        }
        menu.hidden = false;
        placeShareMenu(button);
    }

    async function toggleShare(input) {
        const item = items.find(row => row.id === menuItemId);
        const userId = input.getAttribute("data-user-id");
        if (!item || !userId || isShared(item)) {
            return;
        }
        input.disabled = true;
        try {
            const tags = input.checked
                ? await api(`/api/passwords/${item.id}/grants`, {
                    method: "POST",
                    headers: headers({ "Content-Type": "application/json" }),
                    body: JSON.stringify({ userId })
                })
                : await api(`/api/passwords/${item.id}/grants/${userId}`, { method: "DELETE", headers: headers() });
            item.sharedWith = tags || [];
            renderList();
            const pills = document.getElementById("pw-detail-pills");
            if (pills && selectedId === item.id) {
                pills.innerHTML = itemPills(item);
            }
        } catch (err) {
            input.checked = !input.checked;
            throw err;
        } finally {
            input.disabled = false;
        }
    }

    document.addEventListener("click", (event) => {
        const menu = document.getElementById("member-menu");
        if (!menu || menu.hidden) {
            return;
        }
        if (menu.contains(event.target) || event.target.closest("#pw-share")) {
            return;
        }
        closeShareMenu();
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeShareMenu();
        }
    });

    detailEl.addEventListener("click", async (event) => {
        const button = event.target.closest("button");
        if (!button) {
            return;
        }
        const item = selected();
        if (button.id === "pw-share" && item && !isShared(item)) {
            openShareMenu(item, button).catch(err => alert(err.message));
            return;
        }
        if (button.id === "pw-edit" && !isShared(item)) {
            closeShareMenu();
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
