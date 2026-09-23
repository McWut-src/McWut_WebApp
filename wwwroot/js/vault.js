(() => {
    const tokenMeta = document.querySelector('meta[name="request-verification-token"]');
    const antiforgery = tokenMeta ? tokenMeta.getAttribute("content") : "";

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
        const data = text ? JSON.parse(text) : null;
        if (!response.ok) {
            const message = data && (data.error || data.title) ? (data.error || data.title) : `Request failed (${response.status})`;
            throw new Error(message);
        }
        return data;
    }

    function formatExpiry(iso) {
        if (!iso) {
            return "Forever";
        }
        const when = new Date(iso);
        return when.toLocaleString();
    }

    function formatSize(bytes) {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
        return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    }

    const dropzone = document.getElementById("dropzone");
    const fileInput = document.getElementById("file-input");
    const fileList = document.getElementById("file-list");
    const uploadBtn = document.getElementById("upload-btn");
    const myFiles = document.getElementById("my-files");
    const sharedFiles = document.getElementById("shared-files");
    let queued = [];
    let members = [];

    function renderQueue() {
        if (!fileList) return;
        fileList.innerHTML = queued.map(f => `<li>${f.name} (${formatSize(f.size)})</li>`).join("");
        if (uploadBtn) {
            uploadBtn.disabled = queued.length === 0;
        }
    }

    function addFiles(fileListLike) {
        queued = queued.concat(Array.from(fileListLike));
        renderQueue();
    }

    if (dropzone && fileInput) {
        dropzone.addEventListener("click", (e) => {
            if (e.target.id !== "pick-files") {
                fileInput.click();
            }
        });
        document.getElementById("pick-files")?.addEventListener("click", (e) => {
            e.stopPropagation();
            fileInput.click();
        });
        fileInput.addEventListener("change", () => addFiles(fileInput.files));
        dropzone.addEventListener("dragover", (e) => {
            e.preventDefault();
            dropzone.classList.add("is-over");
        });
        dropzone.addEventListener("dragleave", () => dropzone.classList.remove("is-over"));
        dropzone.addEventListener("drop", (e) => {
            e.preventDefault();
            dropzone.classList.remove("is-over");
            addFiles(e.dataTransfer.files);
        });
    }

    async function loadMembers() {
        try {
            members = await api("/api/members", { headers: headers() }) || [];
        } catch {
            members = [];
        }
    }

    function memberOptions() {
        if (members.length === 0) {
            return `<option value="">No other members have signed in yet</option>`;
        }
        return `<option value="">Tag a member</option>` +
            members.map(m => `<option value="${m.userId}">${m.displayName}</option>`).join("");
    }

    async function renderOwned() {
        if (!myFiles) return;
        const files = await api("/api/files", { headers: headers() }) || [];
        if (files.length === 0) {
            myFiles.innerHTML = `<p class="text-muted mb-0">No files yet.</p>`;
            return;
        }
        myFiles.innerHTML = `
            <table class="table align-middle">
                <thead><tr><th>File</th><th>Expires</th><th>Downloads</th><th></th></tr></thead>
                <tbody>
                    ${files.map(f => `
                        <tr data-id="${f.id}">
                            <td>
                                <div>${f.originalFileName}</div>
                                <div class="small text-muted">${formatSize(f.sizeBytes)}${f.hasPassword ? " · password" : ""}</div>
                            </td>
                            <td><span class="badge text-bg-secondary">${formatExpiry(f.expiresAt)}</span></td>
                            <td>${f.downloadCount}${f.maxDownloads != null ? " / " + f.maxDownloads : ""}</td>
                            <td class="text-end">
                                <div class="btn-group btn-group-sm mb-1">
                                    <button class="btn btn-outline-primary" data-action="link">Link</button>
                                    <button class="btn btn-outline-secondary" data-action="download">Download</button>
                                    <button class="btn btn-outline-danger" data-action="delete">Delete</button>
                                </div>
                                <select class="form-select form-select-sm" data-action="grant">${memberOptions()}</select>
                            </td>
                        </tr>`).join("")}
                </tbody>
            </table>`;
    }

    async function renderShared() {
        if (!sharedFiles) return;
        const files = await api("/api/files/shared-with-me", { headers: headers() }) || [];
        if (files.length === 0) {
            sharedFiles.innerHTML = `<p class="text-muted mb-0">Nothing has been tagged to you yet.</p>`;
            return;
        }
        sharedFiles.innerHTML = `
            <table class="table align-middle">
                <thead><tr><th>File</th><th>Expires</th><th></th></tr></thead>
                <tbody>
                    ${files.map(f => `
                        <tr>
                            <td>${f.originalFileName}<div class="small text-muted">${formatSize(f.sizeBytes)}</div></td>
                            <td>${formatExpiry(f.expiresAt)}</td>
                            <td class="text-end"><a class="btn btn-sm btn-primary" href="/api/files/${f.id}/content">Download</a></td>
                        </tr>`).join("")}
                </tbody>
            </table>`;
    }

    document.getElementById("upload-btn")?.addEventListener("click", async () => {
        const status = document.getElementById("upload-status");
        const linkBox = document.getElementById("link-box");
        const shareUrl = document.getElementById("share-url");
        status.hidden = false;
        status.textContent = "Uploading…";
        linkBox.hidden = true;
        try {
            const ttl = Number(document.getElementById("ttl").value);
            const retention = { days: ttl === 0 ? null : ttl };
            const password = document.getElementById("password").value || null;
            const drop = await api("/api/drops", {
                method: "POST",
                headers: headers({ "Content-Type": "application/json" }),
                body: JSON.stringify({
                    title: document.getElementById("drop-title").value,
                    retention,
                    password
                })
            });
            for (const file of queued) {
                if (!file.size) {
                    throw new Error(file.name + " is empty. Choose a file that has some content.");
                }
                const session = await api(`/api/drops/${drop.id}/files`, {
                    method: "POST",
                    headers: headers({ "Content-Type": "application/json" }),
                    body: JSON.stringify({
                        fileName: file.name,
                        contentType: file.type || "application/octet-stream",
                        sizeBytes: file.size,
                        retention,
                        password
                    })
                });
                const put = await fetch(`/api/uploads/${session.sessionId}`, {
                    method: "PUT",
                    headers: headers({ "Content-Type": "application/octet-stream" }),
                    body: file
                });
                if (!put.ok) {
                    throw new Error("Upload failed for " + file.name);
                }
                await api(`/api/uploads/${session.sessionId}/complete`, {
                    method: "POST",
                    headers: headers()
                });
            }
            const link = await api(`/api/drops/${drop.id}/links`, {
                method: "POST",
                headers: headers({ "Content-Type": "application/json" }),
                body: JSON.stringify({ retention, password, allowPreview: true })
            });
            shareUrl.value = link.url;
            linkBox.hidden = false;
            status.textContent = "Ready. Copy the link to share.";
            queued = [];
            fileInput.value = "";
            renderQueue();
            await renderOwned();
        } catch (err) {
            status.textContent = err.message;
        }
    });

    document.getElementById("copy-link")?.addEventListener("click", async () => {
        const shareUrl = document.getElementById("share-url");
        await navigator.clipboard.writeText(shareUrl.value);
        document.getElementById("copy-link").textContent = "Copied";
        setTimeout(() => { document.getElementById("copy-link").textContent = "Copy"; }, 1500);
    });

    myFiles?.addEventListener("click", async (e) => {
        const button = e.target.closest("button[data-action]");
        if (!button) return;
        const row = button.closest("tr");
        const id = row.getAttribute("data-id");
        const action = button.getAttribute("data-action");
        try {
            if (action === "download") {
                window.location.href = `/api/files/${id}/content`;
            } else if (action === "delete") {
                if (!confirm("Delete this file?")) return;
                await api(`/api/files/${id}`, { method: "DELETE", headers: headers() });
                await renderOwned();
            } else if (action === "link") {
                const link = await api(`/api/files/${id}/links`, {
                    method: "POST",
                    headers: headers({ "Content-Type": "application/json" }),
                    body: JSON.stringify({ allowPreview: true })
                });
                await navigator.clipboard.writeText(link.url);
                button.textContent = "Copied";
                setTimeout(() => { button.textContent = "Link"; }, 1500);
            }
        } catch (err) {
            alert(err.message);
        }
    });

    myFiles?.addEventListener("change", async (e) => {
        const select = e.target.closest("select[data-action='grant']");
        if (!select || !select.value) return;
        const id = select.closest("tr").getAttribute("data-id");
        try {
            await api(`/api/files/${id}/grants`, {
                method: "POST",
                headers: headers({ "Content-Type": "application/json" }),
                body: JSON.stringify({ userId: select.value, permission: "Download" })
            });
            select.value = "";
            alert("Tagged. They will see it under Shared files.");
        } catch (err) {
            alert(err.message);
        }
    });

    async function start() {
        if (myFiles || sharedFiles) {
            await loadMembers();
        }
        if (myFiles) {
            try {
                await renderOwned();
            } catch (err) {
                myFiles.innerHTML = `<p class="text-danger">${err.message}</p>`;
            }
        }
        if (sharedFiles) {
            try {
                await renderShared();
            } catch (err) {
                sharedFiles.innerHTML = `<p class="text-danger">${err.message}</p>`;
            }
        }
    }

    start();
})();
