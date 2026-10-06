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
        const previous = button.textContent;
        button.textContent = "Copied";
        setTimeout(() => { button.textContent = previous; }, 1200);
    }

    function renderList() {
        const query = (searchEl?.value || "").trim().toLowerCase();
        const visible = items.filter(item => matches(item, query));
        if (visible.length === 0) {
            listEl.innerHTML = `<p class="text-muted p-3 mb-0">${items.length === 0 ? "No logins yet." : "No matches."}</p>`;
            return;
        }
        listEl.innerHTML = visible.map(item => `
            <button type="button" class="password-item${item.id === selectedId ? " active" : ""}" data-id="${esc(item.id)}" role="option">
                <div class="fw-semibold">${esc(item.name)}</div>
                <div class="small text-muted">${esc(item.username || item.url || "")}</div>
            </button>`).join("");
    }

    function fieldRow(label, value, actions) {
        return `
            <div class="mb-3">
                <div class="form-label mb-1">${label}</div>
                <div class="d-flex flex-wrap gap-2 align-items-center">
                    <div class="password-value flex-grow-1">${value}</div>
                    ${actions}
                </div>
            </div>`;
    }

    function renderDetail() {
        const item = selected();
        if (!item && !editing) {
            detailEl.innerHTML = `<div class="card-body"><p class="text-muted mb-0">Select a login, or create one.</p></div>`;
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
        detailEl.innerHTML = `
            <div class="card-body">
                ${item.unreadable ? `<div class="alert alert-warning">This login could not be read. Saving a new copy replaces it.</div>` : ""}
                <div class="d-flex justify-content-between align-items-start gap-2 mb-3">
                    <h2 class="h5 mb-0">${esc(item.name)}</h2>
                    <div class="btn-group btn-group-sm">
                        <button type="button" class="btn btn-outline-primary" id="pw-edit">Edit</button>
                        <button type="button" class="btn btn-outline-danger" id="pw-delete">Delete</button>
                    </div>
                </div>
                ${fieldRow("Username", `<span id="pw-username-text">${esc(item.username || "—")}</span>`, item.username ? `<button type="button" class="btn btn-sm btn-outline-secondary" data-copy="username">Copy</button>` : "")}
                ${fieldRow("Password", `<span id="pw-password-text">${item.password ? "••••••••" : "—"}</span>`, item.password ? `<button type="button" class="btn btn-sm btn-outline-secondary" id="pw-show">Show</button><button type="button" class="btn btn-sm btn-outline-secondary" data-copy="password">Copy</button>` : "")}
                ${fieldRow("URL", href ? `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(item.url)}</a>` : `<span>${esc(item.url || "—")}</span>`, href ? `<button type="button" class="btn btn-sm btn-outline-secondary" data-copy="url">Copy</button><a class="btn btn-sm btn-outline-primary" href="${esc(href)}" target="_blank" rel="noopener noreferrer">Open</a>` : "")}
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

    document.getElementById("password-new")?.addEventListener("click", () => {
        selectedId = null;
        editing = true;
        renderList();
        renderDetail();
        document.getElementById("pw-name")?.focus();
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
        if (button.id === "pw-show" && item) {
            const text = document.getElementById("pw-password-text");
            const shown = detailEl.dataset.passwordShown === "1";
            if (text) {
                text.textContent = shown ? "••••••••" : item.password;
            }
            detailEl.dataset.passwordShown = shown ? "0" : "1";
            button.textContent = shown ? "Show" : "Hide";
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
        listEl.innerHTML = `<p class="text-danger p-3 mb-0">${esc(err.message)}</p>`;
    });
})();
