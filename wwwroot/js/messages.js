(() => {
    const tokenMeta = document.querySelector('meta[name="request-verification-token"]');
    const antiforgery = tokenMeta ? tokenMeta.getAttribute("content") : "";
    const listEl = document.getElementById("message-list");
    const shellEl = document.getElementById("message-shell");
    const whoEl = document.getElementById("message-who");
    const peopleEl = document.getElementById("message-people");
    const logEl = document.getElementById("message-log");
    const formEl = document.getElementById("message-form");
    const boxEl = document.getElementById("message-box");
    const errorEl = document.getElementById("message-error");
    const newBtn = document.getElementById("message-new");
    const backBtn = document.getElementById("message-back");
    const sendBtn = document.getElementById("message-send");
    const searchEl = document.getElementById("message-search");
    if (!listEl || !shellEl || !logEl || !formEl || !boxEl) {
        return;
    }

    let conversations = [];
    let members = [];
    let selectedId = null;
    let seen = new Set();
    let pollTimer = 0;
    let sending = false;
    let picking = false;

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
        let data = null;
        if (text) {
            try {
                data = JSON.parse(text);
            } catch {
                throw new Error("Sign in again.");
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

    function localPart(value) {
        const text = String(value || "").trim();
        const at = text.indexOf("@");
        if (at <= 0) {
            return "";
        }
        return text.slice(0, at).trim();
    }

    function memberLabel(member) {
        const name = String(member.displayName || "").trim();
        if (name && !name.includes("@")) {
            return name;
        }
        return localPart(member.email) || localPart(name) || "Member";
    }

    function initial(name) {
        const text = String(name || "").trim();
        return text ? text.slice(0, 1).toUpperCase() : "M";
    }

    function formatWhen(iso) {
        if (!iso) {
            return "";
        }
        const when = new Date(iso);
        if (Number.isNaN(when.getTime())) {
            return "";
        }
        const now = new Date();
        if (when.toDateString() === now.toDateString()) {
            return when.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
        }
        return when.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    }

    function showError(message) {
        if (!errorEl) {
            return;
        }
        if (!message) {
            errorEl.hidden = true;
            errorEl.textContent = "";
            return;
        }
        errorEl.hidden = false;
        errorEl.textContent = message;
    }

    function selected() {
        return conversations.find(item => item.id === selectedId) || null;
    }

    function previewText(item) {
        if (!item.preview) {
            return "No messages yet";
        }
        return item.fromMe ? "You: " + item.preview : item.preview;
    }

    function paintBadge() {
        const total = conversations.reduce((sum, item) => sum + (Number(item.unread) || 0), 0);
        const label = total > 99 ? "99+" : String(total);
        document.querySelectorAll('a[href="/messages"]').forEach(link => {
            const dot = link.classList.contains("top-icon");
            let badge = link.querySelector(dot ? ".top-count" : ".side-count");
            if (total <= 0) {
                if (badge) {
                    badge.remove();
                }
                return;
            }
            if (!badge) {
                badge = document.createElement("span");
                badge.className = dot ? "top-count" : "side-count";
                link.append(badge);
            }
            if (!dot) {
                badge.textContent = label;
            }
        });
    }

    function renderList() {
        paintBadge();
        if (conversations.length === 0) {
            listEl.innerHTML = '<p class="empty">No messages yet. Choose New to write to someone.</p>';
            return;
        }
        const query = (searchEl?.value || "").trim().toLowerCase();
        const visible = query
            ? conversations.filter(item => [item.name || "", item.preview || ""].join(" ").toLowerCase().includes(query))
            : conversations;
        if (visible.length === 0) {
            listEl.innerHTML = '<p class="empty">No matches.</p>';
            return;
        }
        listEl.innerHTML = visible.map(item => {
            const color = safeColor(item.color);
            const active = item.id === selectedId ? " active" : "";
            const unread = item.unread > 0
                ? `<span class="message-unread">${item.unread > 99 ? "99+" : item.unread}</span>`
                : "";
            return `<button type="button" class="message-item${active}" data-id="${esc(item.id)}" role="option" aria-selected="${item.id === selectedId ? "true" : "false"}">
                <span class="message-avatar" style="background:${color};color:${pillInk(color)}">${esc(initial(item.name))}</span>
                <span class="message-copy">
                    <span class="pw-name">${esc(item.name)}</span>
                    <span class="pw-sub">${esc(previewText(item))}</span>
                </span>
                ${unread}
            </button>`;
        }).join("");
    }

    function setOpen(open) {
        shellEl.classList.toggle("is-open", open);
    }

    function showPeople(show) {
        picking = show;
        if (peopleEl) {
            peopleEl.hidden = !show;
        }
        logEl.hidden = show;
        formEl.hidden = show || !selectedId;
    }

    function paintWho(name, color) {
        if (!whoEl) {
            return;
        }
        whoEl.textContent = "";
        if (!name) {
            whoEl.textContent = "Choose a person";
            return;
        }
        const avatar = document.createElement("span");
        avatar.className = "message-avatar";
        const safe = safeColor(color);
        avatar.style.background = safe;
        avatar.style.color = pillInk(safe);
        avatar.textContent = initial(name);
        const label = document.createElement("span");
        label.textContent = name;
        whoEl.append(avatar, label);
    }

    function nearBottom() {
        return logEl.scrollHeight - logEl.scrollTop - logEl.clientHeight < 80;
    }

    function fillMessageBody(el, text) {
        const raw = String(text || "");
        const pattern = /(https?:\/\/[^\s<>"]+|\/s\/[A-Za-z0-9_-]{8,64}|\/files#(file|story)=[0-9a-fA-F-]{36})/g;
        let lastIndex = 0;
        let match;
        while ((match = pattern.exec(raw)) !== null) {
            if (match.index > lastIndex) {
                el.append(document.createTextNode(raw.slice(lastIndex, match.index)));
            }
            let url = match[0];
            let trailing = "";
            while (url.length > 0 && /[.,!?;:)]$/.test(url)) {
                trailing = url.slice(-1) + trailing;
                url = url.slice(0, -1);
            }
            if (url) {
                const a = document.createElement("a");
                a.href = url;
                a.target = "_blank";
                a.rel = "noopener noreferrer";
                a.textContent = url;
                el.append(a);
            }
            if (trailing) {
                el.append(document.createTextNode(trailing));
            }
            lastIndex = pattern.lastIndex;
        }
        if (lastIndex < raw.length) {
            el.append(document.createTextNode(raw.slice(lastIndex)));
        }
    }

    function appendMessage(row, stick) {
        if (!row || seen.has(row.id)) {
            return false;
        }
        seen.add(row.id);
        const empty = document.getElementById("message-empty");
        if (empty) {
            empty.remove();
        }
        const follow = stick || nearBottom();
        const item = document.createElement("article");
        item.className = "message-bubble" + (row.mine ? " mine" : "");
        item.dataset.id = row.id;
        const body = document.createElement("p");
        body.className = "message-body";
        fillMessageBody(body, row.body || "");
        const when = document.createElement("time");
        when.className = "message-when";
        when.dateTime = row.sentAt || "";
        when.textContent = formatWhen(row.sentAt);
        item.append(body, when);
        logEl.append(item);
        if (follow) {
            logEl.scrollTop = logEl.scrollHeight;
        }
        return true;
    }

    function prependMessages(rows) {
        if (!rows || rows.length === 0) {
            return;
        }
        const previous = logEl.scrollHeight;
        const fragment = document.createDocumentFragment();
        rows.forEach(row => {
            if (!row || seen.has(row.id)) {
                return;
            }
            seen.add(row.id);
            const item = document.createElement("article");
            item.className = "message-bubble" + (row.mine ? " mine" : "");
            item.dataset.id = row.id;
            const body = document.createElement("p");
            body.className = "message-body";
            fillMessageBody(body, row.body || "");
            const when = document.createElement("time");
            when.className = "message-when";
            when.dateTime = row.sentAt || "";
            when.textContent = formatWhen(row.sentAt);
            item.append(body, when);
            fragment.append(item);
        });
        logEl.prepend(fragment);
        logEl.scrollTop += logEl.scrollHeight - previous;
    }

    function oldestId() {
        const first = logEl.querySelector(".message-bubble");
        return first ? first.dataset.id : null;
    }

    function newestId() {
        const nodes = logEl.querySelectorAll(".message-bubble");
        return nodes.length ? nodes[nodes.length - 1].dataset.id : null;
    }

    function clearEarlier() {
        const button = document.getElementById("message-earlier");
        if (button) {
            button.remove();
        }
    }

    function showEarlier() {
        clearEarlier();
        const button = document.createElement("button");
        button.type = "button";
        button.id = "message-earlier";
        button.className = "btn btn-link message-earlier";
        button.textContent = "Earlier";
        button.addEventListener("click", () => loadEarlier(button));
        logEl.prepend(button);
    }

    async function loadEarlier(button) {
        const before = oldestId();
        if (!selectedId || !before) {
            return;
        }
        button.disabled = true;
        try {
            const data = await api(`/api/messages/${selectedId}?before=${encodeURIComponent(before)}`);
            button.remove();
            prependMessages(data.messages || []);
            if (data.hasOlder) {
                showEarlier();
            }
        } catch (err) {
            button.disabled = false;
            showError(err.message);
        }
    }

    async function markRead() {
        const through = newestId();
        if (!selectedId || !through) {
            return;
        }
        try {
            await api(`/api/messages/${selectedId}/read`, {
                method: "POST",
                headers: headers({ "Content-Type": "application/json" }),
                body: JSON.stringify({ throughId: through })
            });
            const row = selected();
            if (row) {
                row.unread = 0;
                renderList();
            }
        } catch {
            /* The next open tries again. */
        }
    }

    function stopPoll() {
        if (pollTimer) {
            window.clearInterval(pollTimer);
            pollTimer = 0;
        }
    }

    function startPoll() {
        stopPoll();
        if (!selectedId || document.hidden) {
            return;
        }
        pollTimer = window.setInterval(poll, 4000);
    }

    async function poll() {
        if (!selectedId || picking || document.hidden) {
            return;
        }
        const after = newestId();
        const url = after
            ? `/api/messages/${selectedId}?after=${encodeURIComponent(after)}`
            : `/api/messages/${selectedId}`;
        try {
            const data = await api(url);
            let added = false;
            (data.messages || []).forEach(row => {
                if (appendMessage(row, false)) {
                    added = true;
                }
            });
            if (added) {
                await markRead();
                await loadList();
            }
        } catch (err) {
            showError(err.message);
        }
    }

    async function openThread(id, stickName) {
        selectedId = id;
        picking = false;
        seen = new Set();
        showError("");
        logEl.textContent = "";
        setOpen(true);
        showPeople(false);
        formEl.hidden = false;
        renderList();
        const row = selected();
        if (row) {
            paintWho(row.name, row.color);
        } else if (!stickName) {
            paintWho("", "");
        }
        if (location.hash !== "#" + id) {
            history.replaceState(null, "", "#" + id);
        }
        const data = await api(`/api/messages/${id}`);
        (data.messages || []).forEach(message => appendMessage(message, true));
        if (data.hasOlder) {
            showEarlier();
        }
        if ((data.messages || []).length === 0) {
            const empty = document.createElement("p");
            empty.className = "empty";
            empty.id = "message-empty";
            empty.textContent = "Say hello.";
            logEl.append(empty);
        }
        logEl.scrollTop = logEl.scrollHeight;
        await markRead();
        await loadList();
        startPoll();
        boxEl.focus();
    }

    async function loadList() {
        const data = await api("/api/messages");
        conversations = Array.isArray(data) ? data : [];
        renderList();
    }

    async function loadMembers() {
        const data = await api("/api/members");
        members = Array.isArray(data) ? data : [];
    }

    function renderPeople() {
        if (!peopleEl) {
            return;
        }
        if (members.length === 0) {
            peopleEl.innerHTML = '<p class="empty">No one else has joined yet.</p>';
            return;
        }
        peopleEl.innerHTML = members.map(member => {
            const name = memberLabel(member);
            const color = safeColor(member.accentColor);
            return `<button type="button" class="message-item" data-user="${esc(member.userId)}">
                <span class="message-avatar" style="background:${color};color:${pillInk(color)}">${esc(initial(name))}</span>
                <span class="message-copy"><span class="pw-name">${esc(name)}</span></span>
            </button>`;
        }).join("");
    }

    async function choosePerson(userId) {
        showError("");
        const opened = await api("/api/messages", {
            method: "POST",
            headers: headers({ "Content-Type": "application/json" }),
            body: JSON.stringify({ userId })
        });
        await loadList();
        await openThread(opened.id);
    }

    async function send() {
        const text = boxEl.value;
        if (!selectedId || sending || !text.trim()) {
            return;
        }
        sending = true;
        if (sendBtn) {
            sendBtn.disabled = true;
        }
        showError("");
        try {
            const saved = await api(`/api/messages/${selectedId}`, {
                method: "POST",
                headers: headers({ "Content-Type": "application/json" }),
                body: JSON.stringify({ body: text })
            });
            const empty = document.getElementById("message-empty");
            if (empty) {
                empty.remove();
            }
            appendMessage(saved, true);
            boxEl.value = "";
            await loadList();
        } catch (err) {
            showError(err.message);
        } finally {
            sending = false;
            if (sendBtn) {
                sendBtn.disabled = false;
            }
            boxEl.focus();
        }
    }

    listEl.addEventListener("click", (event) => {
        const button = event.target.closest("[data-id]");
        if (!button) {
            return;
        }
        openThread(button.getAttribute("data-id")).catch(err => showError(err.message));
    });

    searchEl?.addEventListener("input", renderList);

    if (peopleEl) {
        peopleEl.addEventListener("click", (event) => {
            const button = event.target.closest("[data-user]");
            if (!button) {
                return;
            }
            choosePerson(button.getAttribute("data-user")).catch(err => showError(err.message));
        });
    }

    async function showNew() {
        stopPoll();
        setOpen(true);
        showError("");
        paintWho("", "");
        if (whoEl) {
            whoEl.textContent = "New message";
        }
        showPeople(true);
        if (!peopleEl) {
            return;
        }
        if (members.length === 0) {
            peopleEl.innerHTML = '<p class="empty">Loading…</p>';
            await loadMembers();
        }
        renderPeople();
    }

    if (newBtn) {
        newBtn.addEventListener("click", () => {
            showNew().catch(err => showError(err.message));
        });
    }

    if (backBtn) {
        backBtn.addEventListener("click", () => {
            stopPoll();
            selectedId = null;
            picking = false;
            setOpen(false);
            showPeople(false);
            formEl.hidden = true;
            logEl.textContent = "";
            paintWho("", "");
            renderList();
            if (location.hash) {
                history.replaceState(null, "", location.pathname);
            }
        });
    }

    formEl.addEventListener("submit", (event) => {
        event.preventDefault();
        send();
    });

    boxEl.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" || event.shiftKey || event.isComposing) {
            return;
        }
        if (window.matchMedia("(pointer: coarse)").matches) {
            return;
        }
        event.preventDefault();
        send();
    });

    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            stopPoll();
            return;
        }
        if (selectedId && !picking) {
            poll();
            startPoll();
        }
    });

    loadList()
        .then(loadMembers)
        .then(() => {
            const hash = (location.hash || "").replace("#", "");
            if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(hash)) {
                return openThread(hash).catch(err => showError(err.message));
            }
        })
        .catch(err => {
            listEl.innerHTML = `<p class="empty">${esc(err.message)}</p>`;
        });
})();
