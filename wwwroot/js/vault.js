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

    function esc(value) {
        return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            "\"": "&quot;",
            "'": "&#39;"
        }[ch]));
    }

    function isImage(contentType) {
        const type = String(contentType || "").split(";")[0].trim().toLowerCase();
        return type === "image/jpeg" || type === "image/png" || type === "image/gif" || type === "image/webp";
    }

    function previewSrc(file) {
        return `/api/files/${esc(file.id)}/content?preview=true`;
    }

    function photoCard(file, actions) {
        return `
            <article class="photo-card" data-id="${esc(file.id)}">
                <button type="button" class="photo-open" data-action="view" aria-label="View ${esc(file.originalFileName)}">
                    <img alt="" loading="lazy" src="${previewSrc(file)}">
                </button>
                <div class="photo-name" title="${esc(file.originalFileName)}">${esc(file.originalFileName)}</div>
                <div class="small text-muted">${formatSize(file.sizeBytes)}${file.hasPassword ? " · password" : ""}</div>
                ${actions}
            </article>`;
    }

    function ownedPhotoActions() {
        return `
            <div class="photo-actions">
                <button type="button" class="btn btn-sm btn-outline-primary" data-action="link">Link</button>
                <button type="button" class="btn btn-sm btn-outline-secondary" data-action="download">Download</button>
                <button type="button" class="btn btn-sm btn-outline-danger" data-action="delete">Delete</button>
            </div>
            <select class="form-select form-select-sm mt-1" data-action="grant">${memberOptions()}</select>`;
    }

    function sharedPhotoActions(file) {
        return `<a class="btn btn-sm btn-primary mt-1" href="/api/files/${esc(file.id)}/content">Download</a>`;
    }

    function pasteFile() {
        const pasteEl = document.getElementById("paste-text");
        if (!pasteEl) {
            return null;
        }
        const text = pasteEl.value;
        if (!text.trim()) {
            return null;
        }
        let name = (document.getElementById("drop-title")?.value || "note").trim();
        name = name.replace(/[\\/]/g, "-").replace(/[\u0000-\u001f]/g, "");
        name = name.replace(/\.[^.]+$/, "");
        if (!name || name === "." || name === "..") {
            name = "note";
        }
        if (name.length > 240) {
            name = name.slice(0, 240);
        }
        return new File([text], name + ".txt", { type: "text/plain" });
    }

    const dropzone = document.getElementById("dropzone");
    const fileInput = document.getElementById("file-input");
    const fileList = document.getElementById("file-list");
    const uploadBtn = document.getElementById("upload-btn");
    const myFiles = document.getElementById("my-files");
    const sharedFiles = document.getElementById("shared-files");
    let queued = [];
    let members = [];
    let ownedFiles = [];
    let sharedList = [];
    let viewerPhotos = [];
    let viewerIndex = -1;
    let viewerReturn = null;

    function renderQueue() {
        if (!fileList) return;
        const pasted = pasteFile();
        const items = queued.map(f => `<li>${esc(f.name)} (${formatSize(f.size)})</li>`);
        if (pasted) {
            items.push(`<li>${esc(pasted.name)} (${formatSize(pasted.size)})</li>`);
        }
        fileList.innerHTML = items.join("");
        if (uploadBtn) {
            uploadBtn.disabled = queued.length === 0 && !pasted;
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

    document.getElementById("paste-text")?.addEventListener("input", renderQueue);

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
            members.map(m => `<option value="${esc(m.userId)}">${esc(m.displayName)}</option>`).join("");
    }

    async function renderOwned() {
        if (!myFiles) return;
        const files = await api("/api/files", { headers: headers() }) || [];
        ownedFiles = files;
        if (files.length === 0) {
            myFiles.innerHTML = `<p class="text-muted mb-0">No files yet.</p>`;
            return;
        }
        const photos = files.filter(f => isImage(f.contentType));
        const others = files.filter(f => !isImage(f.contentType));
        const grid = photos.length === 0 ? "" : `
            <div class="photo-grid" aria-label="Photos">
                ${photos.map(f => photoCard(f, ownedPhotoActions())).join("")}
            </div>`;
        const table = others.length === 0 ? "" : `
            <table class="table align-middle">
                <thead><tr><th>File</th><th>Expires</th><th>Downloads</th><th></th></tr></thead>
                <tbody>
                    ${others.map(f => `
                        <tr data-id="${esc(f.id)}">
                            <td>
                                <div>${esc(f.originalFileName)}</div>
                                <div class="small text-muted">${formatSize(f.sizeBytes)}${f.hasPassword ? " · password" : ""}</div>
                            </td>
                            <td><span class="badge text-bg-secondary">${esc(formatExpiry(f.expiresAt))}</span></td>
                            <td>${esc(f.downloadCount)}${f.maxDownloads != null ? " / " + esc(f.maxDownloads) : ""}</td>
                            <td class="text-end">
                                <div class="btn-group btn-group-sm mb-1">
                                    <button type="button" class="btn btn-outline-primary" data-action="link">Link</button>
                                    <button type="button" class="btn btn-outline-secondary" data-action="download">Download</button>
                                    <button type="button" class="btn btn-outline-danger" data-action="delete">Delete</button>
                                </div>
                                <select class="form-select form-select-sm" data-action="grant">${memberOptions()}</select>
                            </td>
                        </tr>`).join("")}
                </tbody>
            </table>`;
        myFiles.innerHTML = grid + table;
    }

    async function renderShared() {
        if (!sharedFiles) return;
        const files = await api("/api/files/shared-with-me", { headers: headers() }) || [];
        sharedList = files;
        if (files.length === 0) {
            sharedFiles.innerHTML = `<p class="text-muted mb-0">Nothing has been tagged to you yet.</p>`;
            return;
        }
        const photos = files.filter(f => isImage(f.contentType));
        const others = files.filter(f => !isImage(f.contentType));
        const grid = photos.length === 0 ? "" : `
            <div class="photo-grid" aria-label="Photos">
                ${photos.map(f => photoCard(f, sharedPhotoActions(f))).join("")}
            </div>`;
        const table = others.length === 0 ? "" : `
            <table class="table align-middle">
                <thead><tr><th>File</th><th>Expires</th><th></th></tr></thead>
                <tbody>
                    ${others.map(f => `
                        <tr>
                            <td>
                                ${esc(f.originalFileName)}
                                <div class="small text-muted">${formatSize(f.sizeBytes)}</div>
                            </td>
                            <td>${esc(formatExpiry(f.expiresAt))}</td>
                            <td class="text-end"><a class="btn btn-sm btn-primary" href="/api/files/${esc(f.id)}/content">Download</a></td>
                        </tr>`).join("")}
                </tbody>
            </table>`;
        sharedFiles.innerHTML = grid + table;
    }

    function ensureViewer() {
        if (document.getElementById("photo-viewer")) {
            return;
        }
        const root = document.createElement("div");
        root.id = "photo-viewer";
        root.className = "photo-viewer";
        root.hidden = true;
        root.setAttribute("role", "dialog");
        root.setAttribute("aria-modal", "true");
        root.setAttribute("aria-label", "Photo");
        root.innerHTML = `
            <button type="button" class="photo-viewer-backdrop" data-photo-close aria-label="Close"></button>
            <div class="photo-viewer-frame">
                <img alt="">
                <div class="photo-viewer-bar">
                    <div class="photo-viewer-name" data-photo-name></div>
                    <div class="photo-viewer-buttons">
                        <button type="button" class="btn btn-sm btn-light" data-photo-prev>Previous</button>
                        <button type="button" class="btn btn-sm btn-light" data-photo-next>Next</button>
                        <a class="btn btn-sm btn-primary" data-photo-download>Download</a>
                        <button type="button" class="btn btn-sm btn-light" data-photo-close>Close</button>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(root);
        root.addEventListener("click", (event) => {
            const target = event.target.closest("[data-photo-close], [data-photo-prev], [data-photo-next]");
            if (!target || root.hidden) {
                return;
            }
            if (target.hasAttribute("data-photo-close")) {
                closeViewer();
            } else if (target.hasAttribute("data-photo-prev") && viewerIndex > 0) {
                viewerIndex -= 1;
                showViewer();
            } else if (target.hasAttribute("data-photo-next") && viewerIndex < viewerPhotos.length - 1) {
                viewerIndex += 1;
                showViewer();
            }
        });
    }

    function showViewer() {
        const file = viewerPhotos[viewerIndex];
        const root = document.getElementById("photo-viewer");
        if (!file || !root) {
            return;
        }
        const image = root.querySelector("img");
        image.src = `/api/files/${file.id}/content?preview=true`;
        image.alt = file.originalFileName || "Photo";
        root.querySelector("[data-photo-name]").textContent = file.originalFileName || "Photo";
        const download = root.querySelector("[data-photo-download]");
        download.href = `/api/files/${file.id}/content`;
        const many = viewerPhotos.length > 1;
        const prev = root.querySelector("[data-photo-prev]");
        const next = root.querySelector("[data-photo-next]");
        prev.hidden = !many;
        next.hidden = !many;
        prev.disabled = viewerIndex <= 0;
        next.disabled = viewerIndex >= viewerPhotos.length - 1;
        root.hidden = false;
        document.body.classList.add("photo-viewer-open");
    }

    function closeViewer() {
        const root = document.getElementById("photo-viewer");
        if (!root || root.hidden) {
            return;
        }
        root.hidden = true;
        const image = root.querySelector("img");
        image.removeAttribute("src");
        image.alt = "";
        document.body.classList.remove("photo-viewer-open");
        viewerIndex = -1;
        viewerPhotos = [];
        if (viewerReturn) {
            viewerReturn.focus();
            viewerReturn = null;
        }
    }

    function openViewer(files, id, button) {
        viewerPhotos = files.filter(f => isImage(f.contentType));
        viewerIndex = viewerPhotos.findIndex(f => f.id === id);
        if (viewerIndex < 0) {
            return;
        }
        viewerReturn = button;
        ensureViewer();
        showViewer();
        document.querySelector("#photo-viewer .photo-viewer-frame [data-photo-close]")?.focus();
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
            let title = document.getElementById("drop-title").value || "";
            if (title.length > 200) {
                title = title.slice(0, 200);
            }
            const batch = queued.slice();
            const pasted = pasteFile();
            if (pasted) {
                batch.push(pasted);
            }
            if (batch.length === 0) {
                throw new Error("Choose a file or paste some text.");
            }
            const drop = await api("/api/drops", {
                method: "POST",
                headers: headers({ "Content-Type": "application/json" }),
                body: JSON.stringify({
                    title,
                    retention,
                    password
                })
            });
            for (const file of batch) {
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
            if (fileInput) {
                fileInput.value = "";
            }
            const pasteEl = document.getElementById("paste-text");
            if (pasteEl) {
                pasteEl.value = "";
            }
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
        const row = button.closest("[data-id]");
        const id = row.getAttribute("data-id");
        const action = button.getAttribute("data-action");
        try {
            if (action === "view") {
                openViewer(ownedFiles, id, button);
            } else if (action === "download") {
                window.location.href = `/api/files/${id}/content`;
            } else if (action === "delete") {
                if (!confirm("Delete this file?")) return;
                await api(`/api/files/${id}`, { method: "DELETE", headers: headers() });
                if (viewerPhotos[viewerIndex] && viewerPhotos[viewerIndex].id === id) {
                    closeViewer();
                }
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
        const id = select.closest("[data-id]").getAttribute("data-id");
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

    sharedFiles?.addEventListener("click", (event) => {
        const button = event.target.closest("button[data-action='view']");
        if (!button) {
            return;
        }
        const id = button.closest("[data-id]").getAttribute("data-id");
        openViewer(sharedList, id, button);
    });

    document.addEventListener("keydown", (event) => {
        const root = document.getElementById("photo-viewer");
        if (!root || root.hidden) {
            return;
        }
        if (event.key === "Escape") {
            closeViewer();
        } else if (event.key === "ArrowLeft" && viewerIndex > 0) {
            viewerIndex -= 1;
            showViewer();
        } else if (event.key === "ArrowRight" && viewerIndex < viewerPhotos.length - 1) {
            viewerIndex += 1;
            showViewer();
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
                myFiles.innerHTML = `<p class="text-danger">${esc(err.message)}</p>`;
            }
        }
        if (sharedFiles) {
            try {
                await renderShared();
            } catch (err) {
                sharedFiles.innerHTML = `<p class="text-danger">${esc(err.message)}</p>`;
            }
        }
    }

    start();
})();
