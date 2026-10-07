(() => {
    const tokenMeta = document.querySelector('meta[name="request-verification-token"]');
    const antiforgery = tokenMeta ? tokenMeta.getAttribute("content") : "";
    const listEl = document.getElementById("url-list");
    const detailEl = document.getElementById("url-detail");
    const browserEl = document.getElementById("url-browser");
    const searchEl = document.getElementById("url-search");
    const longUrl = document.getElementById("long-url");
    const shortenBtn = document.getElementById("shorten-btn");
    if (!listEl || !detailEl) {
        return;
    }

    let items = [];
    let loadError = "";
    let selectedKey = "";

    function headers(extra) {
        return Object.assign({
            "RequestVerificationToken": antiforgery,
            "Accept": "application/json"
        }, extra || {});
    }

    async function api(url, options) {
        const response = await fetch(url, options);
        if (response.status === 204) {
            return null;
        }
        const text = await response.text();
        let data = null;
        if (text) {
            try {
                data = JSON.parse(text);
            } catch (err) {
                if (response.ok) {
                    throw err;
                }
            }
        }
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

    function icon(name) {
        return window.mcwutIcon ? window.mcwutIcon(name) : "";
    }

    function iconButton(action, name, label, danger) {
        return `<button type="button" class="icon-btn${danger ? " danger" : ""}" data-action="${action}" title="${label}" aria-label="${label}">${icon(name)}</button>`;
    }

    function flashButton(button, label) {
        const previous = button.getAttribute("aria-label") || "";
        const previousTitle = button.getAttribute("title") || "";
        const keepsText = !button.querySelector("svg");
        const previousText = keepsText ? button.textContent : "";
        button.classList.add("is-copied");
        button.setAttribute("aria-label", label);
        button.setAttribute("title", label);
        if (keepsText) {
            button.textContent = label;
        }
        setTimeout(() => {
            button.classList.remove("is-copied");
            button.setAttribute("aria-label", previous);
            button.setAttribute("title", previousTitle);
            if (keepsText) {
                button.textContent = previousText;
            }
        }, 1200);
    }

    function displayUrl(url) {
        return String(url || "").replace(/^https?:\/\//, "");
    }

    function formatWhen(iso) {
        if (!iso) {
            return "";
        }
        const when = new Date(iso);
        return when.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    }

    function kindLabel(item) {
        if (item.kind === "web") {
            return "Web";
        }
        if (item.kind === "drop") {
            return "Shared files";
        }
        return "File";
    }

    function rowTitle(item) {
        if (item.kind === "web") {
            return displayUrl(item.url);
        }
        return item.label || "Shared file";
    }

    function rowMeta(item) {
        if (item.kind === "web") {
            return item.target || "";
        }
        const bits = [kindLabel(item)];
        if (item.expired) {
            bits.push("expired");
        } else if (item.expiresAt) {
            bits.push("until " + formatWhen(item.expiresAt));
        } else {
            bits.push("until you delete it");
        }
        if (item.hasPassword) {
            bits.push("password");
        }
        const path = displayUrl(item.url);
        if (path) {
            bits.push(path);
        }
        return bits.join(" · ");
    }

    function query() {
        return (searchEl?.value || "").trim().toLowerCase();
    }

    function matches(item, text) {
        if (!text) {
            return true;
        }
        const haystack = [rowTitle(item), rowMeta(item), item.url, item.target, item.label].join(" ").toLowerCase();
        return haystack.includes(text);
    }

    function visibleItems() {
        const text = query();
        return items.filter(item => matches(item, text));
    }

    function findKey(key) {
        return items.find(item => item.key === key) || null;
    }

    function paintDetail() {
        const item = findKey(selectedKey);
        if (!item) {
            detailEl.hidden = true;
            detailEl.innerHTML = "";
            return;
        }
        const expiry = item.kind === "web"
            ? "Stays until you delete it."
            : (item.expired ? "Expired." : (item.expiresAt ? "Until " + formatWhen(item.expiresAt) + "." : "Stays until you delete it."));
        const password = item.hasPassword ? `<p>This link asks for a password.</p>` : "";
        const opens = item.kind === "web"
            ? `<p class="url-target" title="${esc(item.target)}">Opens ${esc(item.target)}</p>`
            : `<p>Opens ${esc(item.label)}</p>`;
        detailEl.hidden = false;
        detailEl.innerHTML = `
            <div data-key="${esc(item.key)}">
                <p class="url-kind">${esc(kindLabel(item))}${item.expired ? " · expired" : ""}</p>
                ${opens}
                <label class="form-label" for="url-public">Public link</label>
                <div class="input-group mb-2">
                    <input id="url-public" class="form-control" readonly value="${esc(item.url)}" />
                    <button type="button" class="btn btn-outline-primary" data-action="copy" title="Copy link" aria-label="Copy link">Copy</button>
                </div>
                <p class="url-when">Made ${esc(formatWhen(item.createdAt))}. ${esc(expiry)}</p>
                ${password}
                <div class="url-detail-actions">
                    <button type="button" class="btn btn-outline-primary" data-action="open">Quick open</button>
                    <button type="button" class="btn btn-outline-danger" data-action="delete">Delete</button>
                </div>
            </div>`;
    }

    function paintList() {
        const rows = visibleItems();
        if (loadError && items.length === 0) {
            listEl.innerHTML = `<p class="empty">${esc(loadError)}</p>`;
            return;
        }
        if (items.length === 0) {
            listEl.innerHTML = `<p class="empty">No public links yet. Shorten an address, or share a file from My files.</p>`;
            return;
        }
        if (rows.length === 0) {
            listEl.innerHTML = `<p class="empty">No links match that search.</p>`;
            return;
        }
        const error = loadError ? `<p class="small text-danger">${esc(loadError)}</p>` : "";
        listEl.innerHTML = error + rows.map(item => {
            const glyph = item.kind === "web" ? "link" : "files";
            const title = rowTitle(item);
            const meta = rowMeta(item);
            const selected = item.key === selectedKey ? " is-selected" : "";
            return `
                <div class="file-row${selected}" data-key="${esc(item.key)}">
                    <div class="file-glyph" aria-hidden="true">${icon(glyph)}</div>
                    <div class="file-main">
                        <button type="button" class="file-title file-title-btn" data-action="view" title="View ${esc(title)}">${esc(title)}</button>
                        <div class="file-meta short-target" title="${esc(meta)}">${esc(meta)}</div>
                    </div>
                    <div class="file-actions">
                        ${iconButton("view", "eye", "View")}
                        ${iconButton("open", "external", "Quick open")}
                        ${iconButton("copy", "copy", "Copy link")}
                        ${iconButton("delete", "trash", "Delete", true)}
                    </div>
                </div>`;
        }).join("");
    }

    function paint() {
        paintDetail();
        paintList();
    }

    function fromShort(link) {
        return {
            key: "web:" + link.token,
            token: link.token,
            url: link.url,
            kind: "web",
            label: displayUrl(link.url),
            target: link.targetUrl || "",
            createdAt: link.createdAt,
            expiresAt: null,
            hasPassword: false,
            expired: false
        };
    }

    function fromShare(link) {
        return {
            key: "share:" + link.token,
            token: link.token,
            url: link.url,
            kind: link.kind === "drop" ? "drop" : "file",
            label: link.label || "Shared file",
            target: "",
            createdAt: link.createdAt,
            expiresAt: link.expiresAt || null,
            hasPassword: !!link.hasPassword,
            expired: !!link.expired
        };
    }

    async function load() {
        loadError = "";
        let shorts = [];
        let shares = [];
        const errors = [];
        try {
            shorts = await api("/api/short-links", { headers: headers() }) || [];
        } catch (err) {
            errors.push(err.message);
        }
        try {
            shares = await api("/api/links", { headers: headers() }) || [];
        } catch (err) {
            errors.push(err.message);
        }
        loadError = errors.join(" ");
        items = shorts.map(fromShort).concat(shares.map(fromShare));
        items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        if (selectedKey && !findKey(selectedKey)) {
            selectedKey = "";
        }
        paint();
    }

    async function copyUrl(item, button) {
        await navigator.clipboard.writeText(item.url);
        if (button) {
            flashButton(button, "Copied");
        }
    }

    function openItem(item) {
        window.open(item.url, "_blank", "noopener,noreferrer");
    }

    async function deleteItem(item) {
        const message = item.kind === "web"
            ? "Delete this short link?"
            : "Delete this share link? The file stays in My files.";
        if (!confirm(message)) {
            return;
        }
        const path = item.kind === "web"
            ? `/api/short-links/${encodeURIComponent(item.token)}`
            : `/api/links/${encodeURIComponent(item.token)}`;
        await api(path, { method: "DELETE", headers: headers() });
        if (selectedKey === item.key) {
            selectedKey = "";
        }
        await load();
    }

    async function onAction(action, key, button) {
        const item = findKey(key);
        if (!item) {
            return;
        }
        if (action === "view") {
            selectedKey = item.key;
            paint();
            detailEl.scrollIntoView({ block: "nearest" });
            return;
        }
        if (action === "open") {
            openItem(item);
            return;
        }
        if (action === "copy") {
            await copyUrl(item, button);
            return;
        }
        if (action === "delete") {
            await deleteItem(item);
        }
    }

    browserEl?.addEventListener("click", async (event) => {
        const button = event.target.closest("button[data-action]");
        if (!button) {
            return;
        }
        const holder = button.closest("[data-key]");
        const key = holder ? holder.getAttribute("data-key") : "";
        try {
            await onAction(button.getAttribute("data-action"), key, button);
        } catch (err) {
            alert(err.message);
        }
    });

    searchEl?.addEventListener("input", () => paintList());

    document.getElementById("url-refresh")?.addEventListener("click", async () => {
        try {
            await load();
        } catch (err) {
            listEl.innerHTML = `<p class="empty">${esc(err.message)}</p>`;
        }
    });

    longUrl?.addEventListener("input", () => {
        if (shortenBtn) {
            shortenBtn.disabled = !longUrl.value.trim();
        }
    });

    longUrl?.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            shortenBtn?.click();
        }
    });

    shortenBtn?.addEventListener("click", async () => {
        const status = document.getElementById("short-status");
        const box = document.getElementById("short-box");
        const output = document.getElementById("short-url");
        status.hidden = false;
        status.textContent = "Shortening…";
        box.hidden = true;
        try {
            const link = await api("/api/short-links", {
                method: "POST",
                headers: headers({ "Content-Type": "application/json" }),
                body: JSON.stringify({ url: longUrl.value.trim() })
            });
            output.value = link.url;
            box.hidden = false;
            status.textContent = "Ready. Copy the short link.";
            longUrl.value = "";
            shortenBtn.disabled = true;
            selectedKey = "web:" + link.token;
            await load();
        } catch (err) {
            status.textContent = err.message;
        }
    });

    document.getElementById("copy-short")?.addEventListener("click", async () => {
        const output = document.getElementById("short-url");
        try {
            await navigator.clipboard.writeText(output.value);
            flashButton(document.getElementById("copy-short"), "Copied");
        } catch (err) {
            alert(err.message);
        }
    });

    load().catch((err) => {
        listEl.innerHTML = `<p class="empty">${esc(err.message)}</p>`;
    });
})();
