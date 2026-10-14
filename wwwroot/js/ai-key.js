(() => {
    const tokenMeta = document.querySelector('meta[name="request-verification-token"]');
    const antiforgery = tokenMeta ? tokenMeta.getAttribute("content") : "";
    const keyForm = document.getElementById("ai-key-form");
    const keyInput = document.getElementById("ai-key-input");
    const keyStatus = document.getElementById("ai-key-status");
    const removeButton = document.getElementById("ai-key-remove");
    if (!keyForm || !keyInput || !keyStatus) {
        return;
    }

    let configured = false;
    let busy = false;

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

    function setBusy(next) {
        busy = next;
        keyInput.disabled = busy;
        const save = keyForm.querySelector("button[type=submit]");
        if (save) {
            save.disabled = busy;
        }
        if (removeButton) {
            removeButton.disabled = busy || !configured;
        }
    }

    function statusLine(message, href, label) {
        keyStatus.replaceChildren();
        keyStatus.append(document.createTextNode(message));
        if (href) {
            keyStatus.append(document.createTextNode(" "));
            const link = document.createElement("a");
            link.href = href;
            link.textContent = label || "Open";
            keyStatus.append(link);
        }
    }

    function applyStatus(status) {
        configured = !!(status && status.configured);
        if (removeButton) {
            removeButton.hidden = !configured;
        }
        if (!configured) {
            statusLine("No key saved.");
            return;
        }
        if (status.hint) {
            statusLine("Key saved, ending in " + status.hint + ".", "/ai", "Open AI");
            return;
        }
        statusLine("The saved key could not be read. Save it again.");
    }

    keyForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const key = keyInput.value.trim();
        if (!key) {
            statusLine("Paste a key first.");
            return;
        }
        setBusy(true);
        try {
            const status = await api("/api/ai/key", {
                method: "PUT",
                headers: headers({ "Content-Type": "application/json" }),
                body: JSON.stringify({ key })
            });
            keyInput.value = "";
            applyStatus(status);
        } catch (error) {
            statusLine(error.message);
        } finally {
            setBusy(false);
        }
    });

    if (removeButton) {
        removeButton.addEventListener("click", async () => {
            if (!confirm("Remove the saved key from this site?")) {
                return;
            }
            setBusy(true);
            try {
                await api("/api/ai/key", { method: "DELETE", headers: headers() });
                applyStatus({ configured: false });
            } catch (error) {
                statusLine(error.message);
            } finally {
                setBusy(false);
            }
        });
    }

    api("/api/ai/key", { headers: headers() }).then(status => {
        applyStatus(status);
        if (location.hash === "#ai-key" && !configured) {
            keyInput.focus();
        }
    }).catch(error => {
        statusLine(error.message);
    });
})();
