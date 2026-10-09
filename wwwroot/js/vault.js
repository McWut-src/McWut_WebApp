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

    function formatExpiry(iso) {
        if (!iso) {
            return "Forever";
        }
        const when = new Date(iso);
        return when.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
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

    function icon(name, extra) {
        return window.mcwutIcon ? window.mcwutIcon(name, extra) : "";
    }

    function iconButton(action, name, label, danger) {
        return `<button type="button" class="icon-btn${danger ? " danger" : ""}" data-action="${action}" title="${label}" aria-label="${label}">${icon(name)}</button>`;
    }

    function flashButton(button, label) {
        const previous = button.getAttribute("aria-label") || "";
        const previousTitle = button.getAttribute("title") || "";
        button.classList.add("is-copied");
        button.setAttribute("aria-label", label);
        button.setAttribute("title", label);
        setTimeout(() => {
            button.classList.remove("is-copied");
            button.setAttribute("aria-label", previous);
            button.setAttribute("title", previousTitle);
        }, 1200);
    }

    function fileQuery(inputId) {
        return (document.getElementById(inputId)?.value || "").trim().toLowerCase();
    }

    function filterFiles(files, inputId) {
        const query = fileQuery(inputId);
        if (!query) {
            return files;
        }
        return files.filter(file => String(file.originalFileName || "").toLowerCase().includes(query));
    }

    function fileMeta(file, withDownloads) {
        const bits = [formatSize(file.sizeBytes)];
        if (file.expiresAt) {
            bits.push(formatExpiry(file.expiresAt));
        }
        if (withDownloads && (file.downloadCount || file.maxDownloads != null)) {
            bits.push(file.maxDownloads != null ? `${file.downloadCount} / ${file.maxDownloads}` : `${file.downloadCount} downloads`);
        }
        if (file.hasPassword) {
            bits.push("password");
        }
        return esc(bits.join(" · "));
    }

    function photoCard(file, actions) {
        return `
            <article class="photo-card" data-id="${esc(file.id)}">
                <button type="button" class="photo-open" data-action="view" aria-label="View ${esc(file.originalFileName)}">
                    <img alt="" loading="lazy" src="${previewSrc(file)}">
                </button>
                <div class="photo-name" title="${esc(file.originalFileName)}">${esc(file.originalFileName)}</div>
                <div class="photo-meta">${formatSize(file.sizeBytes)}${file.expiresAt ? " · " + esc(formatExpiry(file.expiresAt)) : ""}${file.hasPassword ? " · password" : ""}</div>
                ${actions}
            </article>`;
    }

    function ownedPhotoActions() {
        return `
            <div class="photo-actions">
                ${iconButton("link", "link", "Copy link")}
                ${iconButton("download", "download", "Download")}
                ${iconButton("delete", "trash", "Delete", true)}
            </div>`;
    }

    function canRead(file) {
        return window.mcwutRead ? window.mcwutRead.isReadable(file) : false;
    }

    function fileGlyph(file) {
        const name = isImage(file.contentType) ? "image" : (canRead(file) ? "note" : "files");
        return `<div class="file-glyph" aria-hidden="true">${icon(name)}</div>`;
    }

    function ownedRow(file) {
        const title = canRead(file)
            ? `<button type="button" class="file-title file-title-btn" data-action="read" title="Read ${esc(file.originalFileName)}">${esc(file.originalFileName)}</button>`
            : `<div class="file-title" title="${esc(file.originalFileName)}">${esc(file.originalFileName)}</div>`;
        const read = canRead(file) ? iconButton("read", "eye", "Read") : "";
        return `
            <div class="file-row" data-id="${esc(file.id)}">
                ${fileGlyph(file)}
                <div class="file-main">
                    ${title}
                    <div class="file-meta">${fileMeta(file, true)}</div>
                </div>
                <div class="file-actions">
                    ${read}
                    ${iconButton("link", "link", "Copy link")}
                    ${iconButton("download", "download", "Download")}
                    ${iconButton("delete", "trash", "Delete", true)}
                </div>
            </div>`;
    }

    function contentTypeFor(file) {
        const name = String(file.name || "").toLowerCase();
        const declared = String(file.type || "").split(";")[0].trim().toLowerCase();
        const generic = !declared || declared === "application/octet-stream" || declared === "binary/octet-stream";
        if ((name.endsWith(".md") || name.endsWith(".markdown")) && (generic || declared === "text/plain")) {
            return "text/markdown";
        }
        if (!generic) {
            return declared;
        }
        if (name.endsWith(".txt") || name.endsWith(".text") || name.endsWith(".log")) {
            return "text/plain";
        }
        if (name.endsWith(".csv")) {
            return "text/csv";
        }
        if (name.endsWith(".json")) {
            return "application/json";
        }
        return "application/octet-stream";
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
        let name = (document.getElementById("note-name")?.value || "note").trim();
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
    let queued = [];
    let ownedFiles = [];
    let viewerPhotos = [];
    let viewerIndex = -1;
    let viewerReturn = null;
    let noteReturn = null;
    let noteFileId = null;

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

    function optionSummary() {
        const ttl = document.getElementById("ttl")?.value || "0";
        const labels = { "0": "Kept forever", "1": "Kept 1 day", "7": "Kept 7 days", "30": "Kept 30 days" };
        let text = labels[ttl] || "Kept forever";
        if ((document.getElementById("password")?.value || "").length > 0) {
            text += " · password";
        }
        return text;
    }

    function syncOptions() {
        const summary = document.getElementById("options-summary");
        if (summary) {
            summary.textContent = optionSummary();
        }
        const nameWrap = document.getElementById("note-name-wrap");
        const pasteEl = document.getElementById("paste-text");
        if (nameWrap) {
            nameWrap.hidden = !pasteEl || !pasteEl.value.trim();
        }
    }

    function resetOptions() {
        const ttl = document.getElementById("ttl");
        const password = document.getElementById("password");
        const name = document.getElementById("note-name");
        const options = document.getElementById("composer-options");
        if (ttl) {
            ttl.value = "0";
        }
        if (password) {
            password.value = "";
        }
        if (name) {
            name.value = "";
        }
        if (options) {
            options.open = false;
        }
        syncOptions();
    }

    document.getElementById("paste-text")?.addEventListener("input", () => {
        syncOptions();
        renderQueue();
    });
    document.getElementById("note-name")?.addEventListener("input", renderQueue);
    document.getElementById("ttl")?.addEventListener("change", syncOptions);
    document.getElementById("password")?.addEventListener("input", syncOptions);

    function paintLibrary(target, files, sourceCount, photoActions, rowBuilder, emptyText) {
        if (sourceCount === 0) {
            target.innerHTML = `<p class="empty">${emptyText}</p>`;
            return;
        }
        if (files.length === 0) {
            target.innerHTML = `<p class="empty">No matches.</p>`;
            return;
        }
        const photos = files.filter(f => isImage(f.contentType));
        const others = files.filter(f => !isImage(f.contentType));
        const grid = photos.length === 0 ? "" : `
            <div class="section-label">Photos</div>
            <div class="photo-grid" aria-label="Photos">
                ${photos.map(f => photoCard(f, photoActions(f))).join("")}
            </div>`;
        const rows = others.length === 0 ? "" : `
            <div class="section-label">Files</div>
            ${others.map(rowBuilder).join("")}`;
        target.innerHTML = grid + rows;
    }

    function paintOwned() {
        if (!myFiles) return;
        paintLibrary(
            myFiles,
            filterFiles(ownedFiles, "file-search"),
            ownedFiles.length,
            () => ownedPhotoActions(),
            ownedRow,
            "No files yet.");
    }

    async function renderOwned() {
        if (!myFiles) return;
        ownedFiles = await api("/api/files", { headers: headers() }) || [];
        paintOwned();
    }

    document.getElementById("file-search")?.addEventListener("input", paintOwned);
    document.getElementById("file-refresh")?.addEventListener("click", () => {
        renderOwned().catch(err => { myFiles.innerHTML = `<p class="empty">${esc(err.message)}</p>`; });
    });

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
                        <button type="button" class="icon-btn" data-photo-prev title="Previous" aria-label="Previous">${icon("left")}</button>
                        <button type="button" class="icon-btn" data-photo-next title="Next" aria-label="Next">${icon("right")}</button>
                        <a class="icon-btn" data-photo-download title="Download" aria-label="Download">${icon("download")}</a>
                        <button type="button" class="icon-btn" data-photo-close title="Close" aria-label="Close">${icon("close")}</button>
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

    function ensureNoteReader() {
        if (document.getElementById("note-reader")) {
            return;
        }
        const root = document.createElement("div");
        root.id = "note-reader";
        root.className = "note-reader";
        root.hidden = true;
        root.setAttribute("role", "dialog");
        root.setAttribute("aria-modal", "true");
        root.setAttribute("aria-label", "Note");
        root.innerHTML = `
            <button type="button" class="note-reader-backdrop" data-note-close aria-label="Close"></button>
            <div class="note-reader-frame">
                <div class="note-reader-bar">
                    <div class="note-reader-name" data-note-name></div>
                    <div class="note-reader-buttons">
                        <a class="icon-btn" data-note-download title="Download" aria-label="Download">${icon("download")}</a>
                        <button type="button" class="icon-btn" data-note-close title="Close" aria-label="Close">${icon("close")}</button>
                    </div>
                </div>
                <div class="note-reader-body" data-note-body></div>
            </div>`;
        document.body.appendChild(root);
        root.addEventListener("click", (event) => {
            if (event.target.closest("[data-note-close]")) {
                closeNote();
            }
        });
    }

    function closeNote() {
        const root = document.getElementById("note-reader");
        if (!root || root.hidden) {
            return;
        }
        root.hidden = true;
        root.querySelector("[data-note-body]").replaceChildren();
        document.body.classList.remove("note-reader-open");
        noteFileId = null;
        if (noteReturn) {
            noteReturn.focus();
            noteReturn = null;
        }
    }

    async function failureMessage(response) {
        try {
            const problem = await response.json();
            if (problem && problem.requiresPassword) {
                return "This note needs a password.";
            }
            if (problem && problem.error) {
                return String(problem.error);
            }
        } catch {
            /* The body was not JSON. */
        }
        return "Could not open this note.";
    }

    async function openNote(file, button) {
        if (!file || !canRead(file)) {
            return;
        }
        closeViewer();
        ensureNoteReader();
        noteReturn = button;
        noteFileId = file.id;
        const root = document.getElementById("note-reader");
        root.querySelector("[data-note-name]").textContent = file.originalFileName || "Note";
        const download = root.querySelector("[data-note-download]");
        download.href = `/api/files/${file.id}/content`;
        const body = root.querySelector("[data-note-body]");
        body.replaceChildren();
        root.hidden = false;
        document.body.classList.add("note-reader-open");
        if ((file.sizeBytes || 0) > (window.mcwutRead.maxBytes || 200000)) {
            const message = document.createElement("p");
            message.className = "note-skip";
            message.textContent = "This note is too long to read here. Download it instead.";
            body.appendChild(message);
            root.querySelector(".note-reader-buttons [data-note-close]")?.focus();
            return;
        }
        const waiting = document.createElement("p");
        waiting.className = "note-skip";
        waiting.textContent = "Opening…";
        body.appendChild(waiting);
        try {
            if (window.mcwutRead.isMarkdown(file)) {
                const response = await fetch(`/api/files/${file.id}/html`, { headers: { "Accept": "application/json" } });
                if (!response.ok) {
                    throw new Error(await failureMessage(response));
                }
                const payload = await response.json();
                if (!payload || typeof payload.html !== "string") {
                    throw new Error("Could not open this note.");
                }
                const article = document.createElement("article");
                article.className = "md-view";
                article.innerHTML = payload.html;
                body.replaceChildren(article);
                await window.mcwutRead.mountDiagrams(article);
            } else {
                const response = await fetch(`/api/files/${file.id}/content?preview=true`, { headers: { "Accept": "text/plain, text/markdown, */*" } });
                if (!response.ok) {
                    throw new Error("Could not open this note.");
                }
                const pre = document.createElement("pre");
                pre.className = "note-body";
                pre.textContent = await response.text();
                body.replaceChildren(pre);
            }
        } catch (err) {
            body.replaceChildren();
            const message = document.createElement("p");
            message.className = "note-skip";
            message.textContent = err.message;
            body.appendChild(message);
        }
        root.querySelector(".note-reader-buttons [data-note-close]")?.focus();
    }

    document.getElementById("upload-btn")?.addEventListener("click", async () => {
        const status = document.getElementById("upload-status");
        const button = document.getElementById("upload-btn");
        status.hidden = false;
        status.textContent = "Saving…";
        if (button) {
            button.disabled = true;
        }
        try {
            const ttl = Number(document.getElementById("ttl").value);
            const retention = { days: ttl === 0 ? null : ttl };
            const password = document.getElementById("password").value || null;
            const batch = queued.slice();
            const pasted = pasteFile();
            if (pasted) {
                batch.push(pasted);
            }
            if (batch.length === 0) {
                throw new Error("Choose a file or paste some text.");
            }
            let title = "";
            if (pasted) {
                title = pasted.name.replace(/\.txt$/i, "");
                if (title.length > 200) {
                    title = title.slice(0, 200);
                }
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
                        contentType: contentTypeFor(file),
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
            queued = [];
            if (fileInput) {
                fileInput.value = "";
            }
            const pasteEl = document.getElementById("paste-text");
            if (pasteEl) {
                pasteEl.value = "";
            }
            resetOptions();
            renderQueue();
            status.textContent = "Saved.";
            await renderOwned();
        } catch (err) {
            status.textContent = err.message;
            renderQueue();
        }
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
            } else if (action === "read") {
                openNote(ownedFiles.find(file => file.id === id), button);
            } else if (action === "download") {
                window.location.href = `/api/files/${id}/content`;
            } else if (action === "delete") {
                if (!confirm("Delete this file?")) return;
                await api(`/api/files/${id}`, { method: "DELETE", headers: headers() });
                if (viewerPhotos[viewerIndex] && viewerPhotos[viewerIndex].id === id) {
                    closeViewer();
                }
                if (noteFileId === id) {
                    closeNote();
                }
                await renderOwned();
            } else if (action === "link") {
                const link = await api(`/api/files/${id}/links`, {
                    method: "POST",
                    headers: headers({ "Content-Type": "application/json" }),
                    body: JSON.stringify({ allowPreview: true })
                });
                await navigator.clipboard.writeText(link.url);
                flashButton(button, "Copied");
            }
        } catch (err) {
            alert(err.message);
        }
    });

    document.addEventListener("keydown", (event) => {
        const note = document.getElementById("note-reader");
        if (note && !note.hidden) {
            if (event.key === "Escape") {
                closeNote();
            }
            return;
        }
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
        if (myFiles) {
            try {
                await renderOwned();
            } catch (err) {
                myFiles.innerHTML = `<p class="empty">${esc(err.message)}</p>`;
            }
        }
    }

    start();
})();
