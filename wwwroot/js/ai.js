(() => {
    const tokenMeta = document.querySelector('meta[name="request-verification-token"]');
    const antiforgery = tokenMeta ? tokenMeta.getAttribute("content") : "";
    const waitEl = document.getElementById("ai-wait");
    const setupEl = document.getElementById("ai-setup");
    const leadEl = document.getElementById("ai-setup-lead");
    const setupGo = document.getElementById("ai-setup-go");
    const chatEl = document.getElementById("ai-chat");
    const modelSelect = document.getElementById("ai-model");
    const metaEl = document.getElementById("ai-meta");
    const aboutEl = document.getElementById("ai-about");
    const aboutText = document.getElementById("ai-about-text");
    const alertEl = document.getElementById("ai-alert");
    const noteEl = document.getElementById("ai-note");
    const logEl = document.getElementById("ai-log");
    const emptyEl = document.getElementById("ai-empty");
    const chatForm = document.getElementById("ai-form");
    const textEl = document.getElementById("ai-text");
    const sendButton = document.getElementById("ai-send");
    const saveButton = document.getElementById("ai-save");
    const linkButton = document.getElementById("ai-link");
    const newButton = document.getElementById("ai-new");
    const mdBox = document.getElementById("ai-md");
    if (!modelSelect || !logEl || !chatForm || !textEl || !setupEl || !chatEl) {
        return;
    }

    const transcript = [];
    let models = [];
    let chatReady = false;
    let modelsReady = false;
    let busy = false;
    let chosenId = "";
    let chosenName = "";
    let savedId = null;
    let savedKey = "";
    let streaming = false;
    let abort = null;
    const mdStore = "mcwut-ai-md";

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

    function rejected(error) {
        return error && error.message === "OpenRouter rejected the key.";
    }

    function setAlert(message) {
        alertEl.textContent = message || "";
        alertEl.hidden = !message;
        if (message) {
            setNote("");
        }
    }

    function setNote(message, href, label) {
        noteEl.replaceChildren();
        if (!message) {
            noteEl.hidden = true;
            return;
        }
        noteEl.hidden = false;
        noteEl.append(document.createTextNode(message));
        if (href) {
            noteEl.append(document.createTextNode(" "));
            const link = document.createElement("a");
            link.href = href;
            link.textContent = label || "Open";
            noteEl.append(link);
        }
    }

    function rememberModel() {
        if (!modelSelect.value) {
            return;
        }
        chosenId = modelSelect.value;
        const model = currentModel();
        chosenName = model && model.name ? model.name : modelSelect.selectedOptions[0].textContent;
    }

    function setBusy(next) {
        busy = next;
        const ready = chatReady && modelsReady && !!modelSelect.value;
        textEl.disabled = !ready;
        sendButton.disabled = !ready;
        sendButton.textContent = streaming ? "Stop" : "Send";
        modelSelect.disabled = !ready || busy;
        if (saveButton) {
            saveButton.disabled = busy || transcript.length === 0;
        }
        if (linkButton) {
            linkButton.disabled = busy || transcript.length === 0;
        }
        if (newButton) {
            newButton.disabled = busy;
        }
    }

    function showSetup(kind) {
        if (waitEl) {
            waitEl.hidden = true;
        }
        chatReady = false;
        setupEl.hidden = false;
        const expired = kind === "rejected";
        if (leadEl) {
            leadEl.textContent = expired
                ? "OpenRouter rejected the saved key. Create a new one and replace it on Profile."
                : "Save your own OpenRouter key on Profile. The chat stays off until that key works.";
        }
        if (setupGo) {
            setupGo.textContent = expired ? "Replace the key" : "Add a key";
        }
        chatEl.hidden = transcript.length === 0;
        setBusy(false);
    }

    function showChat() {
        if (waitEl) {
            waitEl.hidden = true;
        }
        chatReady = true;
        setupEl.hidden = true;
        chatEl.hidden = false;
        setBusy(false);
    }

    function clearModels(placeholder) {
        models = [];
        modelsReady = false;
        modelSelect.replaceChildren();
        const option = document.createElement("option");
        option.value = "";
        option.textContent = placeholder;
        modelSelect.append(option);
        modelSelect.value = "";
        showModel();
        setBusy(busy);
    }

    function fillModels(list, previous) {
        models = Array.isArray(list) ? list : [];
        modelSelect.replaceChildren();
        if (models.length === 0) {
            clearModels("No free models");
            return;
        }
        models.forEach(model => {
            const option = document.createElement("option");
            option.value = model.id;
            option.textContent = model.name || model.id;
            modelSelect.append(option);
        });
        const stillThere = previous && models.some(model => model.id === previous);
        modelSelect.value = stillThere ? previous : models[0].id;
        modelsReady = true;
        rememberModel();
        showModel();
        setBusy(busy);
    }

    function currentModel() {
        return models.find(model => model.id === modelSelect.value) || null;
    }

    function formatCount(value) {
        return Number(value).toLocaleString();
    }

    function formatWhen(iso) {
        const when = new Date(iso + "T00:00:00Z");
        if (Number.isNaN(when.getTime())) {
            return iso;
        }
        return when.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
    }

    function showModel() {
        const model = currentModel();
        if (!metaEl) {
            return;
        }
        if (!model) {
            metaEl.textContent = "";
            if (aboutText) {
                aboutText.textContent = "";
            }
            if (aboutEl) {
                aboutEl.hidden = true;
                aboutEl.open = false;
            }
            return;
        }
        const bits = [];
        if (model.contextLength) {
            bits.push(formatCount(model.contextLength) + " context");
        }
        if (model.maxOutput) {
            bits.push("up to " + formatCount(model.maxOutput));
        }
        bits.push(model.expires ? "Free through " + formatWhen(model.expires) : "Free");
        if (model.inputs) {
            bits.push("Also " + model.inputs);
        }
        metaEl.textContent = bits.join(" · ");
        const about = model.about || "";
        if (aboutText) {
            aboutText.textContent = about;
        }
        if (aboutEl) {
            aboutEl.hidden = !about;
            if (!about) {
                aboutEl.open = false;
            }
        }
    }

    function showEmpty(show) {
        if (emptyEl) {
            emptyEl.hidden = !show;
        }
    }

    function addMessage(role, text) {
        showEmpty(false);
        const item = document.createElement("div");
        item.className = "ai-msg " + role;
        const who = document.createElement("div");
        who.className = "ai-who";
        who.textContent = role === "user" ? "You" : "Reply";
        const body = document.createElement("div");
        body.className = "ai-body";
        body.textContent = text;
        item.append(who, body);
        logEl.append(item);
        logEl.scrollTop = logEl.scrollHeight;
        return item;
    }

    function clearChat() {
        transcript.length = 0;
        savedId = null;
        savedKey = "";
        logEl.querySelectorAll(".ai-msg").forEach(item => item.remove());
        showEmpty(true);
        setAlert("");
        setNote("");
        if (!chatReady) {
            chatEl.hidden = true;
        }
        setBusy(false);
    }

    function markdownOn() {
        return !mdBox || mdBox.checked;
    }

    function redact(text) {
        return String(text || "").replace(/sk-or-v1-[0-9a-fA-F]{64}/gi, "[key removed]");
    }

    function looksLikeMarkdown(text) {
        return /(^|\n)#{1,6}[ \t]/.test(text)
            || /(^|\n)```/.test(text)
            || /(^|\n)([-*+]|\d+\.)[ \t]/.test(text)
            || /(^|\n)\|.+\|/.test(text)
            || /\[[^\]\n]{1,80}\]\(https?:\/\//.test(text)
            || /\*\*[^*\n]+\*\*/.test(text);
    }

    function beginReply() {
        showEmpty(false);
        const item = document.createElement("div");
        item.className = "ai-msg assistant is-waiting";
        const who = document.createElement("div");
        who.className = "ai-who";
        who.textContent = "Reply";
        const body = document.createElement("div");
        body.className = "ai-body";
        body.textContent = "Waiting…";
        item.append(who, body);
        logEl.append(item);
        logEl.scrollTop = logEl.scrollHeight;
        return body;
    }

    async function paint() {
        await new Promise(resolve => requestAnimationFrame(resolve));
    }

    async function drawReply(body, text) {
        const clean = redact(text).trim();
        if (!clean) {
            return "";
        }
        const asMarkdown = markdownOn() || looksLikeMarkdown(clean);
        if (!asMarkdown || clean.length > 200000) {
            body.classList.remove("md-view");
            body.textContent = clean;
            return clean;
        }
        try {
            const data = await api("/api/ai/preview", {
                method: "POST",
                headers: headers({ "Content-Type": "application/json" }),
                body: JSON.stringify({ text: clean })
            });
            if (!data || !data.html) {
                body.classList.remove("md-view");
                body.textContent = clean;
                return clean;
            }
            body.classList.add("md-view");
            body.innerHTML = data.html;
            if (window.mcwutRead && typeof window.mcwutRead.mountDiagrams === "function") {
                await window.mcwutRead.mountDiagrams(body);
            }
        } catch (error) {
            body.classList.remove("md-view");
            body.textContent = clean;
        }
        return clean;
    }

    async function readEvents(response, onEvent) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        try {
            while (true) {
                const step = await reader.read();
                if (step.done) {
                    buffer += decoder.decode();
                    const last = buffer.trim();
                    if (last) {
                        onEvent(JSON.parse(last));
                    }
                    break;
                }
                buffer += decoder.decode(step.value, { stream: true });
                let split = buffer.indexOf("\n");
                while (split >= 0) {
                    const line = buffer.slice(0, split).trim();
                    buffer = buffer.slice(split + 1);
                    if (line) {
                        onEvent(JSON.parse(line));
                    }
                    split = buffer.indexOf("\n");
                }
                await paint();
            }
        } finally {
            reader.cancel().catch(() => {});
        }
    }

    function payloadFrom(turns) {
        const kept = [];
        let total = 0;
        for (let i = turns.length - 1; i >= 0 && kept.length < 40; i--) {
            const content = turns[i].content || "";
            if (total + content.length > 64000) {
                break;
            }
            total += content.length;
            kept.push(turns[i]);
        }
        kept.reverse();
        return kept;
    }

    function fingerprint() {
        return JSON.stringify({ model: chosenId, messages: transcript });
    }

    async function loadModels() {
        const previous = modelSelect.value || chosenId;
        setAlert("");
        try {
            const listed = await api("/api/ai/models", { headers: headers() });
            showChat();
            fillModels(listed, previous);
        } catch (error) {
            if (rejected(error)) {
                showSetup("rejected");
                clearModels("Save a key first");
                return;
            }
            showChat();
            clearModels("Could not load models");
            setAlert(error.message);
        }
    }

    async function ensureSaved() {
        rememberModel();
        if (!chosenId) {
            throw new Error("Choose a free model.");
        }
        const key = fingerprint();
        if (savedId && savedKey === key) {
            return { id: savedId, reused: true };
        }
        const data = await api("/api/ai/chats", {
            method: "POST",
            headers: headers({ "Content-Type": "application/json" }),
            body: JSON.stringify({
                model: chosenId,
                modelName: chosenName,
                messages: transcript
            })
        });
        savedId = data.id;
        savedKey = key;
        return { id: savedId, reused: false };
    }

    if (saveButton) {
        saveButton.addEventListener("click", async () => {
            if (busy || transcript.length === 0) {
                return;
            }
            setBusy(true);
            setAlert("");
            try {
                const saved = await ensureSaved();
                const href = "/files#file=" + saved.id;
                setNote(saved.reused ? "Already saved in Chats." : "Saved in Chats.", href, "Open it");
            } catch (error) {
                setAlert(error.message);
            } finally {
                setBusy(false);
            }
        });
    }

    if (linkButton) {
        linkButton.addEventListener("click", async () => {
            if (busy || transcript.length === 0) {
                return;
            }
            setBusy(true);
            setAlert("");
            try {
                const saved = await ensureSaved();
                const link = await api("/api/files/" + saved.id + "/links", {
                    method: "POST",
                    headers: headers({ "Content-Type": "application/json" }),
                    body: JSON.stringify({ allowPreview: true })
                });
                const url = link && link.url ? link.url : "";
                if (!url) {
                    throw new Error("Could not make a link.");
                }
                try {
                    await navigator.clipboard.writeText(url);
                    setNote("Link copied. It is on URLs and lasts 7 days.");
                } catch (error) {
                    setNote(url);
                }
            } catch (error) {
                setAlert(error.message);
            } finally {
                setBusy(false);
            }
        });
    }

    if (newButton) {
        newButton.addEventListener("click", () => {
            if (transcript.length > 0 && !confirm("Clear this chat? Save it first if you want to keep it.")) {
                return;
            }
            clearChat();
        });
    }

    modelSelect.addEventListener("change", () => {
        rememberModel();
        showModel();
        setBusy(busy);
    });

    textEl.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            chatForm.requestSubmit();
        }
    });

    chatForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (streaming) {
            if (abort) {
                abort.abort();
            }
            return;
        }
        const text = textEl.value.trim();
        if (!text || busy) {
            return;
        }
        rememberModel();
        if (!modelSelect.value) {
            setAlert("Choose a free model.");
            return;
        }
        const pending = addMessage("user", text);
        const draft = textEl.value;
        textEl.value = "";
        const replyBody = beginReply();
        streaming = true;
        abort = new AbortController();
        setBusy(true);
        setAlert("");
        setNote("");
        let reply = "";
        let started = false;
        await paint();
        try {
            const messages = payloadFrom(transcript.concat([{ role: "user", content: text }]));
            const response = await fetch("/api/ai/chat", {
                method: "POST",
                headers: headers({ "Content-Type": "application/json", "Accept": "application/x-ndjson" }),
                body: JSON.stringify({
                    model: modelSelect.value,
                    markdown: markdownOn(),
                    messages
                }),
                signal: abort.signal
            });
            if (!response.ok) {
                let data = null;
                try {
                    data = await response.json();
                } catch (parseError) {
                    data = null;
                }
                const message = data && (data.error || data.title) ? (data.error || data.title) : `Request failed (${response.status})`;
                throw new Error(message);
            }
            await readEvents(response, (item) => {
                if (item && item.error) {
                    throw new Error(item.error);
                }
                if (!item || !item.delta) {
                    return;
                }
                if (!started) {
                    started = true;
                    replyBody.parentElement.classList.remove("is-waiting");
                    reply = "";
                }
                reply += item.delta;
                replyBody.textContent = redact(reply);
                logEl.scrollTop = logEl.scrollHeight;
            });
            const clean = await drawReply(replyBody, reply);
            if (!clean) {
                throw new Error("The model returned nothing.");
            }
            replyBody.parentElement.classList.remove("is-waiting");
            transcript.push({ role: "user", content: text });
            transcript.push({ role: "assistant", content: clean });
        } catch (error) {
            const stopped = error && error.name === "AbortError";
            const clean = redact(reply).trim();
            if (clean) {
                await drawReply(replyBody, clean);
                replyBody.parentElement.classList.remove("is-waiting");
                transcript.push({ role: "user", content: text });
                transcript.push({ role: "assistant", content: clean });
                if (!stopped) {
                    setAlert(error.message);
                }
            } else {
                pending.remove();
                if (replyBody.parentElement) {
                    replyBody.parentElement.remove();
                }
                if (!logEl.querySelector(".ai-msg")) {
                    showEmpty(true);
                }
                if (!textEl.value) {
                    textEl.value = draft;
                }
                if (!stopped) {
                    if (rejected(error)) {
                        showSetup("rejected");
                    }
                    setAlert(error.message);
                }
            }
        } finally {
            streaming = false;
            abort = null;
            setBusy(false);
            if (chatReady && document.activeElement === document.body) {
                textEl.focus();
            }
        }
    });

    try {
        if (mdBox && localStorage.getItem(mdStore) === "0") {
            mdBox.checked = false;
        }
    } catch (error) {
        /* This browser is not storing the choice. The box stays on. */
    }
    if (mdBox) {
        mdBox.addEventListener("change", () => {
            try {
                localStorage.setItem(mdStore, mdBox.checked ? "1" : "0");
            } catch (error) {
                /* The choice still applies to this page. */
            }
        });
    }

    setAlert("");
    clearModels("Loading models…");
    api("/api/ai/key", { headers: headers() }).then(async status => {
        if (!status || !status.configured || !status.hint) {
            showSetup("missing");
            clearModels("Save a key first");
            return;
        }
        await loadModels();
    }).catch(error => {
        showSetup("missing");
        setAlert(error.message);
    });
})();
