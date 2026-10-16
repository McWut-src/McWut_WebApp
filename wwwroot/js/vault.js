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

    function isVideo(contentType) {
        const type = String(contentType || "").split(";")[0].trim().toLowerCase();
        return type === "video/mp4" || type === "video/webm" || type === "video/quicktime" || type === "video/ogg";
    }

    function isAudio(contentType) {
        const type = String(contentType || "").split(";")[0].trim().toLowerCase();
        return type === "audio/mpeg" || type === "audio/mp3" || type === "audio/mp4" || type === "audio/x-m4a" || type === "audio/wav" || type === "audio/x-wav" || type === "audio/ogg" || type === "audio/webm";
    }

    function isMedia(contentType) {
        return isVideo(contentType) || isAudio(contentType);
    }

    function isChat(contentType) {
        return String(contentType || "").split(";")[0].trim().toLowerCase() === "text/x-mcwut-chat";
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

    function sameId(a, b) {
        return String(a || "").toLowerCase() === String(b || "").toLowerCase();
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

    function shareTags(file) {
        if (Array.isArray(file.sharedWith) && file.sharedWith.length > 0) {
            return file.sharedWith;
        }
        if (file.fromName) {
            return [{ displayName: file.fromName, color: file.fromColor }];
        }
        return [];
    }

    function memberPills(tags) {
        if (!tags || tags.length === 0) {
            return "";
        }
        const pills = tags.map(tag => {
            const color = safeColor(tag.color);
            return `<span class="member-pill" style="background:${color};color:${pillInk(color)}">${esc(tag.displayName || "Member")}</span>`;
        }).join("");
        return `<div class="member-pills">${pills}</div>`;
    }

    function shareButton() {
        return iconButton("share", "users", "Share with a member");
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

    function fileHaystack(file) {
        const parts = [file.originalFileName || ""];
        if (file.fromName) {
            parts.push(file.fromName);
        }
        if (Array.isArray(file.sharedWith)) {
            file.sharedWith.forEach(tag => parts.push(tag.displayName || ""));
        }
        return parts.join(" ").toLowerCase();
    }

    function filterFiles(files, inputId) {
        const query = fileQuery(inputId);
        if (!query) {
            return files;
        }
        return files.filter(file => fileHaystack(file).includes(query));
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
                <div class="photo-meta">${formatSize(file.sizeBytes)}${file.expiresAt ? " · " + esc(formatExpiry(file.expiresAt)) : ""}${file.hasPassword && !file.fromName ? " · password" : ""}</div>
                ${memberPills(shareTags(file))}
                ${actions}
            </article>`;
    }

    function ownedPhotoActions(file) {
        const share = Array.isArray(file.sharedWith) ? shareButton() : "";
        return `
            <div class="photo-actions">
                ${iconButton("link", "link", "Copy link")}
                ${share}
                ${iconButton("download", "download", "Download")}
                ${iconButton("delete", "trash", "Delete", true)}
            </div>`;
    }

    function incomingPhotoActions() {
        return `
            <div class="photo-actions">
                ${iconButton("download", "download", "Download")}
            </div>`;
    }

    function canRead(file) {
        return window.mcwutRead ? window.mcwutRead.isReadable(file) : false;
    }

    function fileGlyph(file) {
        const name = isChat(file.contentType)
            ? "spark"
            : (isImage(file.contentType)
                ? "image"
                : (isMedia(file.contentType)
                    ? "play"
                    : (canRead(file) ? "note" : "files")));
        return `<div class="file-glyph" aria-hidden="true">${icon(name)}</div>`;
    }

    function ownedRow(file) {
        const playable = isMedia(file.contentType);
        const readable = canRead(file);
        const title = readable
            ? `<button type="button" class="file-title file-title-btn" data-action="read" title="Read ${esc(file.originalFileName)}">${esc(file.originalFileName)}</button>`
            : (playable
                ? `<button type="button" class="file-title file-title-btn" data-action="play" title="Play ${esc(file.originalFileName)}">${esc(file.originalFileName)}</button>`
                : `<div class="file-title" title="${esc(file.originalFileName)}">${esc(file.originalFileName)}</div>`);
        const read = readable ? iconButton("read", "eye", "Read") : (playable ? iconButton("play", "play", "Play") : "");
        const share = Array.isArray(file.sharedWith) ? shareButton() : "";
        return `
            <div class="file-row" data-id="${esc(file.id)}">
                ${fileGlyph(file)}
                <div class="file-main">
                    ${title}
                    <div class="file-meta">${fileMeta(file, true)}</div>
                    ${memberPills(shareTags(file))}
                </div>
                <div class="file-actions">
                    ${read}
                    ${iconButton("link", "link", "Copy link")}
                    ${share}
                    ${iconButton("download", "download", "Download")}
                    ${iconButton("delete", "trash", "Delete", true)}
                </div>
            </div>`;
    }

    function incomingRow(file) {
        const playable = isMedia(file.contentType);
        const readable = canRead(file);
        const title = readable
            ? `<button type="button" class="file-title file-title-btn" data-action="read" title="Read ${esc(file.originalFileName)}">${esc(file.originalFileName)}</button>`
            : (playable
                ? `<button type="button" class="file-title file-title-btn" data-action="play" title="Play ${esc(file.originalFileName)}">${esc(file.originalFileName)}</button>`
                : `<div class="file-title" title="${esc(file.originalFileName)}">${esc(file.originalFileName)}</div>`);
        const read = readable ? iconButton("read", "eye", "Read") : (playable ? iconButton("play", "play", "Play") : "");
        return `
            <div class="file-row" data-id="${esc(file.id)}">
                ${fileGlyph(file)}
                <div class="file-main">
                    ${title}
                    <div class="file-meta">${fileMeta({ ...file, hasPassword: false }, false)}</div>
                    ${memberPills(shareTags(file))}
                </div>
                <div class="file-actions">
                    ${read}
                    ${iconButton("download", "download", "Download")}
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
        if (name.endsWith(".mp4") || name.endsWith(".m4v")) {
            return "video/mp4";
        }
        if (name.endsWith(".webm")) {
            return "video/webm";
        }
        if (name.endsWith(".mov")) {
            return "video/quicktime";
        }
        if (name.endsWith(".mp3")) {
            return "audio/mpeg";
        }
        if (name.endsWith(".m4a")) {
            return "audio/mp4";
        }
        if (name.endsWith(".wav")) {
            return "audio/wav";
        }
        if (name.endsWith(".ogg")) {
            return "audio/ogg";
        }
        return "application/octet-stream";
    }

    function cleanTitle(raw, fallback, max) {
        let name = String(raw || "").trim();
        name = name.replace(/[\\/]/g, "-").replace(/[\u0000-\u001f]/g, "").replace(/\.\./g, ".");
        name = name.replace(/\.[^.]+$/, "");
        name = name.trim().replace(/^\.+$/, "");
        if (!name) {
            name = fallback;
        }
        const limit = max || 200;
        if (name.length > limit) {
            name = name.slice(0, limit).trim();
        }
        return name || fallback;
    }

    function typedTitle() {
        return (document.getElementById("note-name")?.value || "").trim();
    }

    function storyText() {
        const pasteEl = document.getElementById("paste-text");
        return pasteEl ? pasteEl.value : "";
    }

    function noteBase() {
        return typedTitle() ? cleanTitle(typedTitle(), "note", 200) : "note";
    }

    function storyTitle(text) {
        if (typedTitle()) {
            return cleanTitle(typedTitle(), "Story", 200);
        }
        const line = String(text || "").split(/\r?\n/).map(part => part.trim()).find(Boolean) || "";
        return cleanTitle(line, "Story", 80);
    }

    function pasteFile() {
        const text = storyText();
        if (!text.trim()) {
            return null;
        }
        return new File([text], noteBase() + ".txt", { type: "text/plain" });
    }

    const dropzone = document.getElementById("dropzone");
    const fileInput = document.getElementById("file-input");
    const fileList = document.getElementById("file-list");
    const uploadBtn = document.getElementById("upload-btn");
    const myFiles = document.getElementById("my-files");
    let queued = [];
    let ownedFiles = [];
    let incomingFiles = [];
    let ownedStories = [];
    let incomingStories = [];
    let viewerPhotos = [];
    let viewerIndex = -1;
    let viewerReturn = null;
    let noteReturn = null;
    let noteFileId = null;
    let storyReturn = null;
    let storyOpenId = null;
    let menuFileId = null;
    let menuToken = 0;

    function renderQueue() {
        if (!fileList) return;
        const text = storyText();
        const hasText = !!text.trim();
        const isStory = hasText && queued.length > 0;
        const items = queued.map(f => `<li>${esc(f.name)} (${formatSize(f.size)})</li>`);
        if (isStory) {
            items.push(`<li>Story · ${esc(storyTitle(text))}</li>`);
        } else if (hasText) {
            const pasted = pasteFile();
            if (pasted) {
                items.push(`<li>${esc(pasted.name)} (${formatSize(pasted.size)})</li>`);
            }
        }
        fileList.innerHTML = items.join("");
        if (uploadBtn) {
            uploadBtn.disabled = queued.length === 0 && !hasText;
        }
    }

    function addFiles(fileListLike) {
        queued = queued.concat(Array.from(fileListLike));
        renderQueue();
    }

    if (dropzone && fileInput) {
        dropzone.addEventListener("click", (e) => {
            if (e.target.id !== "pick-files" && e.target.id !== "record-voice") {
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

    let voiceRecorder = null;
    let voiceChunks = [];
    let voiceTimer = 0;
    let voiceStartedAt = 0;
    const recordVoiceBtn = document.getElementById("record-voice");
    if (recordVoiceBtn) {
        if (!navigator.mediaDevices || typeof MediaRecorder === "undefined") {
            recordVoiceBtn.hidden = true;
        } else {
            recordVoiceBtn.addEventListener("click", async (e) => {
                e.stopPropagation();
                if (voiceRecorder && voiceRecorder.state !== "inactive") {
                    voiceRecorder.stop();
                    return;
                }
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
                    const mime = candidates.find(m => typeof MediaRecorder.isTypeSupported === "function" && MediaRecorder.isTypeSupported(m)) || "";
                    voiceChunks = [];
                    voiceRecorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
                    voiceRecorder.addEventListener("dataavailable", (ev) => {
                        if (ev.data && ev.data.size > 0) {
                            voiceChunks.push(ev.data);
                        }
                    });
                    voiceRecorder.addEventListener("stop", () => {
                        clearInterval(voiceTimer);
                        stream.getTracks().forEach(t => t.stop());
                        recordVoiceBtn.classList.remove("btn-danger");
                        recordVoiceBtn.classList.add("btn-outline-secondary");
                        recordVoiceBtn.textContent = "Record voice";
                        const actualType = (voiceRecorder && voiceRecorder.mimeType) || mime || "audio/webm";
                        const ext = actualType.includes("mp4") ? ".m4a" : (actualType.includes("ogg") ? ".ogg" : ".webm");
                        const blob = new Blob(voiceChunks, { type: actualType.split(";")[0] || "audio/webm" });
                        if (blob.size > 0) {
                            const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
                            const file = new File([blob], `voice-${stamp}${ext}`, { type: blob.type });
                            addFiles([file]);
                        }
                        voiceRecorder = null;
                    });
                    voiceStartedAt = Date.now();
                    recordVoiceBtn.classList.remove("btn-outline-secondary");
                    recordVoiceBtn.classList.add("btn-danger");
                    recordVoiceBtn.textContent = "Stop (0:00)";
                    voiceTimer = setInterval(() => {
                        const sec = Math.floor((Date.now() - voiceStartedAt) / 1000);
                        const m = Math.floor(sec / 60);
                        const s = String(sec % 60).padStart(2, "0");
                        recordVoiceBtn.textContent = `Stop (${m}:${s})`;
                    }, 500);
                    voiceRecorder.start();
                } catch (err) {
                    alert("Microphone access was denied or is unavailable.");
                }
            });
        }
    }

    function optionSummary() {
        const ttl = document.getElementById("ttl")?.value || "0";
        const labels = { "0": "Kept forever", "1": "Kept 1 day", "7": "Kept 7 days", "30": "Kept 30 days" };
        let text = labels[ttl] || "Kept forever";
        const maxDl = Number(document.getElementById("max-downloads")?.value || 0);
        if (maxDl === 1) {
            text += " · 1 download";
        } else if (maxDl > 1) {
            text += ` · ${maxDl} downloads`;
        }
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
        const maxDl = document.getElementById("max-downloads");
        const password = document.getElementById("password");
        const name = document.getElementById("note-name");
        const options = document.getElementById("composer-options");
        if (ttl) {
            ttl.value = "0";
        }
        if (maxDl) {
            maxDl.value = "0";
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
    document.getElementById("max-downloads")?.addEventListener("change", syncOptions);
    document.getElementById("password")?.addEventListener("input", syncOptions);

    function storyDropIds(stories) {
        return new Set((stories || []).map(story => String(story.id || "").toLowerCase()));
    }

    function withoutStories(files, stories) {
        const ids = storyDropIds(stories);
        return (files || []).filter(file => !file.dropId || !ids.has(String(file.dropId).toLowerCase()));
    }

    function storyHaystack(story) {
        const parts = [story.title || ""];
        if (story.fromName) {
            parts.push(story.fromName);
        }
        if (story.body && story.body.originalFileName) {
            parts.push(story.body.originalFileName);
        }
        (story.attachments || []).forEach(file => parts.push(file.originalFileName || ""));
        if (Array.isArray(story.sharedWith)) {
            story.sharedWith.forEach(tag => parts.push(tag.displayName || ""));
        }
        return parts.join(" ").toLowerCase();
    }

    function filterStories(stories) {
        const query = fileQuery("file-search");
        if (!query) {
            return stories || [];
        }
        return (stories || []).filter(story => storyHaystack(story).includes(query));
    }

    function storyMeta(story) {
        const count = (story.attachments || []).length;
        const bits = [count === 1 ? "1 file" : count + " files"];
        if (story.expiresAt) {
            bits.push(formatExpiry(story.expiresAt));
        }
        if (story.hasPassword && !story.fromName) {
            bits.push("password");
        }
        return esc(bits.join(" · "));
    }

    function storyThumbs(story) {
        const photos = (story.attachments || []).filter(file => isImage(file.contentType)).slice(0, 4);
        if (photos.length === 0) {
            return "";
        }
        return `<div class="story-thumbs">${photos.map(file => `
            <button type="button" class="story-thumb" data-action="view" data-file-id="${esc(file.id)}" aria-label="View ${esc(file.originalFileName)}">
                <img alt="" loading="lazy" src="${previewSrc(file)}">
            </button>`).join("")}</div>`;
    }

    function storyCard(story, owned) {
        const title = esc(story.title || "Story");
        const share = owned && Array.isArray(story.sharedWith) ? shareButton() : "";
        const link = owned ? iconButton("link", "link", "Copy link") : "";
        const remove = owned ? iconButton("delete", "trash", "Delete", true) : "";
        return `
            <div class="file-row story-card" data-id="${esc(story.id)}" data-kind="story">
                <div class="file-glyph" aria-hidden="true">${icon("story")}</div>
                <div class="file-main">
                    <button type="button" class="file-title file-title-btn" data-action="read" title="Read ${title}">${title}</button>
                    <div class="file-meta">${storyMeta(story)}</div>
                    ${memberPills(shareTags(story))}
                    ${storyThumbs(story)}
                </div>
                <div class="file-actions">
                    ${iconButton("read", "eye", "Read")}
                    ${link}
                    ${share}
                    ${iconButton("download", "download", "Download")}
                    ${remove}
                </div>
            </div>`;
    }

    function paintLibrary(target, files, stories, sourceCount, photoActions, rowBuilder, emptyText) {
        if (sourceCount === 0) {
            target.innerHTML = `<p class="empty">${emptyText}</p>`;
            return;
        }
        const loose = withoutStories(files, stories);
        const shownStories = filterStories(stories);
        const shownFiles = filterFiles(loose, "file-search");
        if (shownStories.length === 0 && shownFiles.length === 0) {
            target.innerHTML = `<p class="empty">No matches.</p>`;
            return;
        }
        const chats = shownFiles.filter(f => isChat(f.contentType));
        const photos = shownFiles.filter(f => isImage(f.contentType));
        const others = shownFiles.filter(f => !isImage(f.contentType) && !isChat(f.contentType));
        const storyHtml = shownStories.length === 0 ? "" : `
            <div class="section-label">Stories</div>
            ${shownStories.map(story => storyCard(story, Array.isArray(story.sharedWith))).join("")}`;
        const chatHtml = chats.length === 0 ? "" : `
            <div class="section-label">Chats</div>
            ${chats.map(rowBuilder).join("")}`;
        const grid = photos.length === 0 ? "" : `
            <div class="section-label">Photos</div>
            <div class="photo-grid" aria-label="Photos">
                ${photos.map(f => photoCard(f, photoActions(f))).join("")}
            </div>`;
        const rows = others.length === 0 ? "" : `
            <div class="section-label">Files</div>
            ${others.map(rowBuilder).join("")}`;
        target.innerHTML = storyHtml + chatHtml + grid + rows;
    }

    function paintOwned() {
        if (!myFiles) return;
        paintLibrary(
            myFiles,
            ownedFiles,
            ownedStories,
            ownedFiles.length + ownedStories.length,
            ownedPhotoActions,
            ownedRow,
            "No files yet.");
    }

    function paintIncoming() {
        const root = document.getElementById("from-others");
        const list = document.getElementById("from-others-list");
        if (!root || !list) {
            return;
        }
        if (incomingFiles.length === 0 && incomingStories.length === 0) {
            root.hidden = true;
            list.innerHTML = "";
            return;
        }
        root.hidden = false;
        paintLibrary(
            list,
            incomingFiles,
            incomingStories,
            incomingFiles.length + incomingStories.length,
            () => incomingPhotoActions(),
            incomingRow,
            "No files yet.");
    }

    function paintLibraries() {
        paintOwned();
        paintIncoming();
    }

    async function renderOwned() {
        if (!myFiles) return;
        const [owned, incoming, stories, sharedStories] = await Promise.all([
            api("/api/files", { headers: headers() }),
            api("/api/files/shared-with-me", { headers: headers() }),
            api("/api/stories", { headers: headers() }),
            api("/api/stories/shared-with-me", { headers: headers() })
        ]);
        ownedFiles = owned || [];
        incomingFiles = incoming || [];
        ownedStories = stories || [];
        incomingStories = sharedStories || [];
        paintLibraries();
        openFromHash();
    }

    document.getElementById("file-search")?.addEventListener("input", paintLibraries);
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
                        <button type="button" class="icon-btn" data-share hidden title="Share with a member" aria-label="Share with a member">${icon("users")}</button>
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
        closeMenu();
        const file = viewerPhotos[viewerIndex];
        const root = document.getElementById("photo-viewer");
        if (!file || !root) {
            return;
        }
        document.body.appendChild(root);
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
        syncShareButton(root, file);
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
        viewerIndex = viewerPhotos.findIndex(f => sameId(f.id, id));
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
                        <button type="button" class="icon-btn" data-note-ai hidden title="Ask AI" aria-label="Ask AI">${icon("spark")}</button>
                        <button type="button" class="icon-btn" data-note-edit hidden title="Edit" aria-label="Edit">${icon("pencil")}</button>
                        <button type="button" class="icon-btn" data-share hidden title="Share with a member" aria-label="Share with a member">${icon("users")}</button>
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
                return;
            }
            if (event.target.closest("[data-note-edit]")) {
                editCurrentNote().catch(err => alert(err.message));
                return;
            }
            if (event.target.closest("[data-note-ai]")) {
                askAiAboutCurrentNote().catch(err => alert(err.message));
            }
        });
    }

    async function askAiAboutCurrentNote() {
        const file = ownedFiles.concat(incomingFiles).find(f => sameId(f.id, noteFileId));
        if (!file || !canRead(file)) {
            return;
        }
        const response = await fetch(`/api/files/${file.id}/content?preview=true`, { headers: { "Accept": "text/plain, text/markdown, */*" } });
        if (!response.ok) {
            throw new Error("Could not load note for AI.");
        }
        const text = await response.text();
        try {
            sessionStorage.setItem("mcwut-ai-context", JSON.stringify({
                title: file.originalFileName || "Note",
                text: text.slice(0, 12000)
            }));
        } catch { }
        window.location.href = "/ai";
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

    async function editCurrentNote() {
        const file = ownedFiles.find(f => sameId(f.id, noteFileId));
        const root = document.getElementById("note-reader");
        if (!file || !root || !canRead(file)) {
            return;
        }
        const body = root.querySelector("[data-note-body]");
        const response = await fetch(`/api/files/${file.id}/content?preview=true`, { headers: { "Accept": "text/plain, text/markdown, */*" } });
        if (!response.ok) {
            throw new Error("Could not load note for editing.");
        }
        const currentText = await response.text();
        body.innerHTML = `
            <div class="p-3">
                <div id="note-edit-error" class="alert alert-danger" hidden></div>
                <div class="mb-3">
                    <label class="form-label" for="note-edit-name">Name</label>
                    <input id="note-edit-name" class="form-control" value="${esc(file.originalFileName || "note.txt")}" maxlength="200" />
                </div>
                <div class="mb-3">
                    <label class="form-label" for="note-edit-text">Text</label>
                    <textarea id="note-edit-text" class="form-control" rows="10">${esc(currentText)}</textarea>
                </div>
                <div class="d-flex gap-2">
                    <button type="button" class="btn btn-primary" id="note-edit-save">Save</button>
                    <button type="button" class="btn btn-outline-secondary" id="note-edit-cancel">Cancel</button>
                </div>
            </div>`;
        body.querySelector("#note-edit-text")?.focus();
        body.querySelector("#note-edit-cancel")?.addEventListener("click", () => {
            openNote(file, noteReturn);
        });
        body.querySelector("#note-edit-save")?.addEventListener("click", async () => {
            const nameInput = body.querySelector("#note-edit-name");
            const textInput = body.querySelector("#note-edit-text");
            const errorEl = body.querySelector("#note-edit-error");
            const saveBtn = body.querySelector("#note-edit-save");
            if (saveBtn) saveBtn.disabled = true;
            try {
                const updated = await api(`/api/files/${file.id}/text`, {
                    method: "PUT",
                    headers: headers({ "Content-Type": "application/json" }),
                    body: JSON.stringify({
                        fileName: nameInput ? nameInput.value : file.originalFileName,
                        text: textInput ? textInput.value : ""
                    })
                });
                await renderOwned();
                const refreshed = ownedFiles.find(f => sameId(f.id, updated.id)) || updated;
                await openNote(refreshed, noteReturn);
            } catch (err) {
                if (errorEl) {
                    errorEl.hidden = false;
                    errorEl.textContent = err.message;
                }
                if (saveBtn) saveBtn.disabled = false;
            }
        });
    }

    async function openMedia(file, button) {
        if (!file || !isMedia(file.contentType)) {
            return;
        }
        closeMenu();
        closeViewer();
        ensureNoteReader();
        noteReturn = button;
        noteFileId = file.id;
        const root = document.getElementById("note-reader");
        document.body.appendChild(root);
        root.querySelector("[data-note-name]").textContent = file.originalFileName || "Media";
        const download = root.querySelector("[data-note-download]");
        download.href = `/api/files/${file.id}/content`;
        const editBtn = root.querySelector("[data-note-edit]");
        if (editBtn) editBtn.hidden = true;
        const aiBtn = root.querySelector("[data-note-ai]");
        if (aiBtn) aiBtn.hidden = true;
        syncShareButton(root, file);
        const body = root.querySelector("[data-note-body]");
        body.replaceChildren();
        const wrap = document.createElement("div");
        wrap.className = "p-3 d-flex justify-content-center align-items-center";
        const player = document.createElement(isVideo(file.contentType) ? "video" : "audio");
        player.controls = true;
        player.preload = "metadata";
        player.src = `/api/files/${file.id}/content?preview=true`;
        player.className = isVideo(file.contentType) ? "w-100 rounded" : "w-100";
        if (isVideo(file.contentType)) {
            player.style.maxHeight = "70vh";
        }
        wrap.appendChild(player);
        body.appendChild(wrap);
        root.hidden = false;
        document.body.classList.add("note-reader-open");
        root.querySelector(".note-reader-buttons [data-note-close]")?.focus();
    }

    async function openNote(file, button) {
        if (!file || !canRead(file)) {
            return;
        }
        closeMenu();
        closeViewer();
        ensureNoteReader();
        noteReturn = button;
        noteFileId = file.id;
        const root = document.getElementById("note-reader");
        document.body.appendChild(root);
        root.querySelector("[data-note-name]").textContent = file.originalFileName || "Note";
        const download = root.querySelector("[data-note-download]");
        download.href = `/api/files/${file.id}/content`;
        const withinLimit = (file.sizeBytes || 0) <= (window.mcwutRead.maxBytes || 200000);
        const editBtn = root.querySelector("[data-note-edit]");
        if (editBtn) {
            editBtn.hidden = !(Array.isArray(file.sharedWith) && !isChat(file.contentType) && withinLimit);
        }
        const aiBtn = root.querySelector("[data-note-ai]");
        if (aiBtn) {
            aiBtn.hidden = !withinLimit;
        }
        syncShareButton(root, file);
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

    function findStory(id) {
        return ownedStories.concat(incomingStories).find(story => sameId(story.id, id)) || null;
    }

    function storyForFile(id) {
        return ownedStories.concat(incomingStories).find(story =>
            sameId(story.id, id)
            || (story.body && sameId(story.body.id, id))
            || (story.attachments || []).some(file => sameId(file.id, id))) || null;
    }

    function ensureStoryReader() {
        if (document.getElementById("story-reader")) {
            return;
        }
        const root = document.createElement("div");
        root.id = "story-reader";
        root.className = "note-reader";
        root.hidden = true;
        root.setAttribute("role", "dialog");
        root.setAttribute("aria-modal", "true");
        root.setAttribute("aria-label", "Story");
        root.innerHTML = `
            <button type="button" class="note-reader-backdrop" data-story-close aria-label="Close"></button>
            <div class="note-reader-frame">
                <div class="note-reader-bar">
                    <div class="note-reader-name" data-story-name></div>
                    <div class="note-reader-buttons">
                        <button type="button" class="icon-btn" data-story-ai hidden title="Ask AI" aria-label="Ask AI">${icon("spark")}</button>
                        <button type="button" class="icon-btn" data-story-edit hidden title="Edit" aria-label="Edit">${icon("pencil")}</button>
                        <button type="button" class="icon-btn" data-share hidden title="Share with a member" aria-label="Share with a member">${icon("users")}</button>
                        <a class="icon-btn" data-story-download title="Download" aria-label="Download">${icon("download")}</a>
                        <button type="button" class="icon-btn" data-story-close title="Close" aria-label="Close">${icon("close")}</button>
                    </div>
                </div>
                <div class="note-reader-body" data-story-body></div>
            </div>`;
        document.body.appendChild(root);
        root.addEventListener("click", (event) => {
            if (event.target.closest("[data-story-close]")) {
                closeStory();
                return;
            }
            if (event.target.closest("[data-story-edit]")) {
                editCurrentStory().catch(err => alert(err.message));
                return;
            }
            if (event.target.closest("[data-story-ai]")) {
                askAiAboutCurrentStory().catch(err => alert(err.message));
                return;
            }
            const button = event.target.closest("[data-story-action]");
            if (!button) {
                return;
            }
            const story = findStory(storyOpenId);
            const fileId = button.getAttribute("data-file-id");
            const file = story && (story.attachments || []).find(item => sameId(item.id, fileId));
            const action = button.getAttribute("data-story-action");
            if (!story || !file) {
                return;
            }
            if (action === "view") {
                openViewer(story.attachments || [], file.id, button);
            } else if (action === "read") {
                openNote(file, button).catch(err => alert(err.message));
            } else if (action === "play") {
                openMedia(file, button).catch(err => alert(err.message));
            } else if (action === "download") {
                window.location.href = `/api/files/${file.id}/content`;
            }
        });
    }

    async function askAiAboutCurrentStory() {
        const story = findStory(storyOpenId);
        if (!story || !story.body) {
            return;
        }
        const response = await fetch(`/api/files/${story.body.id}/content?preview=true`, { headers: { "Accept": "text/plain, */*" } });
        if (!response.ok) {
            throw new Error("Could not load story for AI.");
        }
        const text = await response.text();
        try {
            sessionStorage.setItem("mcwut-ai-context", JSON.stringify({
                title: story.title || "Story",
                text: text.slice(0, 12000)
            }));
        } catch { }
        window.location.href = "/ai";
    }

    async function editCurrentStory() {
        const story = ownedStories.find(s => sameId(s.id, storyOpenId));
        const root = document.getElementById("story-reader");
        if (!story || !story.body || !root) {
            return;
        }
        const response = await fetch(`/api/files/${story.body.id}/content?preview=true`, { headers: { "Accept": "text/plain, */*" } });
        if (!response.ok) {
            throw new Error("Could not load story for editing.");
        }
        const currentText = await response.text();
        const body = root.querySelector("[data-story-body]");
        body.innerHTML = `
            <div class="p-3">
                <div id="story-edit-error" class="alert alert-danger" hidden></div>
                <div class="mb-3">
                    <label class="form-label" for="story-edit-title">Title</label>
                    <input id="story-edit-title" class="form-control" value="${esc(story.title || "Story")}" maxlength="200" />
                </div>
                <div class="mb-3">
                    <label class="form-label" for="story-edit-text">Story</label>
                    <textarea id="story-edit-text" class="form-control" rows="8">${esc(currentText)}</textarea>
                </div>
                <div class="d-flex gap-2">
                    <button type="button" class="btn btn-primary" id="story-edit-save">Save</button>
                    <button type="button" class="btn btn-outline-secondary" id="story-edit-cancel">Cancel</button>
                </div>
            </div>`;
        body.querySelector("#story-edit-text")?.focus();
        body.querySelector("#story-edit-cancel")?.addEventListener("click", () => {
            openStory(story, storyReturn);
        });
        body.querySelector("#story-edit-save")?.addEventListener("click", async () => {
            const titleInput = body.querySelector("#story-edit-title");
            const textInput = body.querySelector("#story-edit-text");
            const errorEl = body.querySelector("#story-edit-error");
            const saveBtn = body.querySelector("#story-edit-save");
            if (saveBtn) saveBtn.disabled = true;
            try {
                const updated = await api(`/api/stories/${story.id}`, {
                    method: "PUT",
                    headers: headers({ "Content-Type": "application/json" }),
                    body: JSON.stringify({
                        title: titleInput ? titleInput.value : story.title,
                        text: textInput ? textInput.value : ""
                    })
                });
                await renderOwned();
                const refreshed = ownedStories.find(s => sameId(s.id, updated.id)) || updated;
                await openStory(refreshed, storyReturn);
            } catch (err) {
                if (errorEl) {
                    errorEl.hidden = false;
                    errorEl.textContent = err.message;
                }
                if (saveBtn) saveBtn.disabled = false;
            }
        });
    }

    function closeStory() {
        const root = document.getElementById("story-reader");
        if (!root || root.hidden) {
            return;
        }
        root.hidden = true;
        root.querySelector("[data-story-body]").replaceChildren();
        storyOpenId = null;
        const note = document.getElementById("note-reader");
        if (!note || note.hidden) {
            document.body.classList.remove("note-reader-open");
        }
        if (storyReturn) {
            storyReturn.focus();
            storyReturn = null;
        }
    }

    function storyFilesHtml(story) {
        const files = story.attachments || [];
        if (files.length === 0) {
            return "";
        }
        const photos = files.filter(file => isImage(file.contentType));
        const others = files.filter(file => !isImage(file.contentType));
        const grid = photos.length === 0 ? "" : `
            <div class="photo-grid" aria-label="Photos in this story">
                ${photos.map(file => `
                    <article class="photo-card">
                        <button type="button" class="photo-open" data-story-action="view" data-file-id="${esc(file.id)}" aria-label="View ${esc(file.originalFileName)}">
                            <img alt="" loading="lazy" src="${previewSrc(file)}">
                        </button>
                        <div class="photo-name" title="${esc(file.originalFileName)}">${esc(file.originalFileName)}</div>
                    </article>`).join("")}
            </div>`;
        const rows = others.map(file => {
            const readable = canRead(file);
            const playable = isMedia(file.contentType);
            const read = readable
                ? `<button type="button" class="icon-btn" data-story-action="read" data-file-id="${esc(file.id)}" title="Read" aria-label="Read">${icon("eye")}</button>`
                : (playable
                    ? `<button type="button" class="icon-btn" data-story-action="play" data-file-id="${esc(file.id)}" title="Play" aria-label="Play">${icon("play")}</button>`
                    : "");
            const title = readable
                ? `<button type="button" class="file-title file-title-btn" data-story-action="read" data-file-id="${esc(file.id)}">${esc(file.originalFileName)}</button>`
                : (playable
                    ? `<button type="button" class="file-title file-title-btn" data-story-action="play" data-file-id="${esc(file.id)}">${esc(file.originalFileName)}</button>`
                    : `<div class="file-title">${esc(file.originalFileName)}</div>`);
            return `
                <div class="file-row">
                    ${fileGlyph(file)}
                    <div class="file-main">
                        ${title}
                        <div class="file-meta">${fileMeta(file, false)}</div>
                    </div>
                    <div class="file-actions">
                        ${read}
                        <a class="icon-btn" href="/api/files/${esc(file.id)}/content" title="Download" aria-label="Download">${icon("download")}</a>
                    </div>
                </div>`;
        }).join("");
        return `<div class="story-reader-files">${grid}${rows}</div>`;
    }

    async function openStory(story, button) {
        if (!story) {
            return;
        }
        closeMenu();
        closeViewer();
        closeNote();
        ensureStoryReader();
        storyReturn = button || null;
        storyOpenId = story.id;
        const root = document.getElementById("story-reader");
        document.body.appendChild(root);
        root.querySelector("[data-story-name]").textContent = story.title || "Story";
        const download = root.querySelector("[data-story-download]");
        download.href = `/api/drops/${story.id}/archive`;
        const share = root.querySelector("[data-share]");
        const canShare = Array.isArray(story.sharedWith);
        share.hidden = !canShare;
        const editBtn = root.querySelector("[data-story-edit]");
        if (editBtn) {
            editBtn.hidden = !(canShare && story.body);
        }
        const aiBtn = root.querySelector("[data-story-ai]");
        if (aiBtn) {
            aiBtn.hidden = !story.body;
        }
        if (canShare) {
            share.setAttribute("data-story-id", story.id);
        } else {
            share.removeAttribute("data-story-id");
        }
        const body = root.querySelector("[data-story-body]");
        body.replaceChildren();
        const words = document.createElement("div");
        const files = document.createElement("div");
        files.innerHTML = storyFilesHtml(story);
        body.append(words, files);
        root.hidden = false;
        document.body.classList.add("note-reader-open");
        const source = story.body;
        if (!source) {
            words.textContent = "";
            const message = document.createElement("p");
            message.className = "note-skip";
            message.textContent = "This story has no words.";
            words.appendChild(message);
            root.querySelector("[data-story-close]")?.focus();
            return;
        }
        if ((source.sizeBytes || 0) > (window.mcwutRead.maxBytes || 200000)) {
            const message = document.createElement("p");
            message.className = "note-skip";
            message.textContent = "This story is too long to read here. Download it instead.";
            words.appendChild(message);
            root.querySelector("[data-story-close]")?.focus();
            return;
        }
        const waiting = document.createElement("p");
        waiting.className = "note-skip";
        waiting.textContent = "Opening…";
        words.appendChild(waiting);
        try {
            const response = await fetch(`/api/files/${source.id}/content?preview=true`, { headers: { "Accept": "text/plain, */*" } });
            if (!response.ok) {
                throw new Error("Could not open this story.");
            }
            const pre = document.createElement("pre");
            pre.className = "note-body";
            pre.textContent = await response.text();
            words.replaceChildren(pre);
        } catch (err) {
            const message = document.createElement("p");
            message.className = "note-skip";
            message.textContent = err.message;
            words.replaceChildren(message);
        }
        root.querySelector("[data-story-close]")?.focus();
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
            const maxDl = Number(document.getElementById("max-downloads")?.value || 0);
            const retention = { days: ttl === 0 ? null : ttl, maxDownloads: maxDl > 0 ? maxDl : null };
            const password = document.getElementById("password").value || null;
            const text = storyText();
            const hasText = !!text.trim();
            const isStory = hasText && queued.length > 0;
            const batch = queued.slice();
            if (!hasText && batch.length === 0) {
                throw new Error("Choose a file or write a story.");
            }
            const title = isStory ? storyTitle(text) : (hasText ? noteBase() : "");
            const drop = await api("/api/drops", {
                method: "POST",
                headers: headers({ "Content-Type": "application/json" }),
                body: JSON.stringify({
                    title,
                    retention,
                    password,
                    isStory
                })
            });
            if (hasText) {
                const bodyName = (isStory ? (drop.title || title) : noteBase()) + ".txt";
                batch.push(new File([text], bodyName, { type: "text/plain" }));
            }
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

    function menuIsOpen() {
        const menu = document.getElementById("member-menu");
        return !!menu && !menu.hidden;
    }

    function closeMenu() {
        menuToken += 1;
        menuFileId = null;
        const menu = document.getElementById("member-menu");
        if (menu) {
            menu.hidden = true;
        }
    }

    function ensureMenu() {
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
            if (!input) {
                return;
            }
            toggleShare(input).catch(err => alert(err.message));
        });
        return menu;
    }

    function placeMenu(button) {
        const menu = ensureMenu();
        const rect = button.getBoundingClientRect();
        const width = menu.offsetWidth || 240;
        let left = Math.min(rect.left, window.innerWidth - width - 8);
        left = Math.max(8, left);
        let top = rect.bottom + 6;
        menu.style.left = left + "px";
        menu.style.top = top + "px";
        const height = menu.offsetHeight;
        if (top + height > window.innerHeight - 8) {
            menu.style.top = Math.max(8, rect.top - height - 6) + "px";
        }
    }

    function syncShareButton(root, file) {
        const button = root.querySelector("[data-share]");
        if (!button) {
            return;
        }
        const show = !!(file && Array.isArray(file.sharedWith));
        button.hidden = !show;
        if (show) {
            button.setAttribute("data-file-id", file.id);
        } else {
            button.removeAttribute("data-file-id");
        }
    }

    function syncPills(file) {
        document.querySelectorAll("#my-files [data-id]").forEach(row => {
            if (!sameId(row.getAttribute("data-id"), file.id)) {
                return;
            }
            const html = memberPills(shareTags(file));
            const current = row.querySelector(".member-pills");
            if (!html) {
                if (current) {
                    current.remove();
                }
                return;
            }
            if (current) {
                current.outerHTML = html;
                return;
            }
            const meta = row.querySelector(".file-meta, .photo-meta");
            if (meta) {
                meta.insertAdjacentHTML("afterend", html);
            }
        });
    }

    async function loadMembers() {
        const rows = await api("/api/members", { headers: headers() }) || [];
        return rows.map(member => ({
            userId: member.userId,
            displayName: memberLabel(member),
            color: safeColor(member.accentColor)
        }));
    }

    async function openShareMenu(file, button) {
        if (!file || !Array.isArray(file.sharedWith)) {
            return;
        }
        if (menuIsOpen() && sameId(menuFileId, file.id)) {
            closeMenu();
            return;
        }
        const token = menuToken + 1;
        menuToken = token;
        menuFileId = file.id;
        const people = await loadMembers();
        if (token !== menuToken) {
            return;
        }
        const menu = ensureMenu();
        if (people.length === 0) {
            menu.innerHTML = `<p class="member-menu-empty">No one else is here yet.</p>`;
        } else {
            const shared = new Set((file.sharedWith || []).map(tag => String(tag.userId).toLowerCase()));
            menu.innerHTML = people.map(member => {
                const checked = shared.has(String(member.userId).toLowerCase()) ? " checked" : "";
                return `<label class="member-menu-row">
                    <input type="checkbox" data-user-id="${esc(member.userId)}" data-color="${member.color}"${checked}>
                    <span class="member-swatch" style="background:${member.color}"></span>
                    <span class="member-menu-name">${esc(member.displayName)}</span>
                </label>`;
            }).join("");
        }
        menu.hidden = false;
        placeMenu(button);
    }

    async function toggleShare(input) {
        const story = ownedStories.find(item => sameId(item.id, menuFileId));
        const file = ownedFiles.find(item => sameId(item.id, menuFileId));
        const target = story || file;
        const userId = input.getAttribute("data-user-id");
        if (!target || !userId) {
            return;
        }
        const grantPath = story ? `/api/drops/${story.id}/grants` : `/api/files/${file.id}/grants`;
        input.disabled = true;
        try {
            if (input.checked) {
                await api(grantPath, {
                    method: "POST",
                    headers: headers({ "Content-Type": "application/json" }),
                    body: JSON.stringify({ userId })
                });
                const row = input.closest(".member-menu-row");
                const name = row ? row.querySelector(".member-menu-name").textContent : "Member";
                const color = safeColor(input.getAttribute("data-color"));
                target.sharedWith = (target.sharedWith || []).concat([{ userId, displayName: name, color }]);
            } else {
                await api(`${grantPath}/${userId}`, { method: "DELETE", headers: headers() });
                target.sharedWith = (target.sharedWith || []).filter(tag => !sameId(tag.userId, userId));
            }
            syncPills(target);
        } catch (err) {
            input.checked = !input.checked;
            throw err;
        } finally {
            input.disabled = false;
        }
    }

    function openFromHash() {
        const storyMatch = /^#story=([0-9a-f-]{36})$/i.exec(location.hash || "");
        if (storyMatch) {
            const story = findStory(storyMatch[1]);
            if (story && !sameId(storyOpenId, story.id)) {
                openStory(story, null);
            }
            return;
        }
        const match = /^#file=([0-9a-f-]{36})$/i.exec(location.hash || "");
        if (!match) {
            return;
        }
        const id = match[1];
        const holding = storyForFile(id);
        if (holding && !sameId(holding.id, id)) {
            if (!sameId(storyOpenId, holding.id)) {
                openStory(holding, null);
            }
            return;
        }
        const owned = withoutStories(ownedFiles, ownedStories).find(file => sameId(file.id, id));
        const incoming = withoutStories(incomingFiles, incomingStories).find(file => sameId(file.id, id));
        const file = owned || incoming;
        if (!file) {
            return;
        }
        const pool = owned
            ? withoutStories(ownedFiles, ownedStories)
            : withoutStories(incomingFiles, incomingStories);
        const row = document.querySelector(`[data-id="${file.id}"]`);
        if (isImage(file.contentType)) {
            openViewer(pool, file.id, row ? row.querySelector("[data-action='view']") : null);
            return;
        }
        if (canRead(file)) {
            openNote(file, row ? row.querySelector("[data-action='read']") : null);
            return;
        }
        if (isMedia(file.contentType)) {
            openMedia(file, row ? row.querySelector("[data-action='play']") : null);
            return;
        }
        if (row) {
            row.scrollIntoView({ block: "nearest" });
        }
    }

    async function onLibraryClick(e) {
        const button = e.target.closest("button[data-action]");
        if (!button) return;
        const row = button.closest("[data-id]");
        if (!row) return;
        const id = row.getAttribute("data-id");
        const incoming = !!button.closest("#from-others");
        const pool = incoming
            ? withoutStories(incomingFiles, incomingStories)
            : withoutStories(ownedFiles, ownedStories);
        const file = pool.find(item => sameId(item.id, id));
        const action = button.getAttribute("data-action");
        if (row.getAttribute("data-kind") === "story") {
            const stories = incoming ? incomingStories : ownedStories;
            const story = stories.find(item => sameId(item.id, id));
            if (!story) {
                return;
            }
            try {
                if (action === "read") {
                    await openStory(story, button);
                } else if (action === "view") {
                    openViewer(story.attachments || [], button.getAttribute("data-file-id"), button);
                } else if (action === "download") {
                    window.location.href = `/api/drops/${story.id}/archive`;
                } else if (action === "share") {
                    if (!incoming) {
                        await openShareMenu(story, button);
                    }
                } else if (action === "delete") {
                    if (incoming) {
                        return;
                    }
                    if (!confirm("Delete this story? Its files are deleted too.")) {
                        return;
                    }
                    await api(`/api/drops/${story.id}`, { method: "DELETE", headers: headers() });
                    if (sameId(storyOpenId, story.id)) {
                        closeStory();
                    }
                    await renderOwned();
                } else if (action === "link") {
                    if (incoming) {
                        return;
                    }
                    const link = await api(`/api/drops/${story.id}/links`, {
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
            return;
        }
        try {
            if (action === "view") {
                openViewer(pool, id, button);
            } else if (action === "read") {
                await openNote(file, button);
            } else if (action === "play") {
                await openMedia(file, button);
            } else if (action === "download") {
                window.location.href = `/api/files/${id}/content`;
            } else if (action === "share") {
                if (incoming) return;
                await openShareMenu(file, button);
            } else if (action === "delete") {
                if (incoming) return;
                if (!confirm("Delete this file?")) return;
                await api(`/api/files/${id}`, { method: "DELETE", headers: headers() });
                if (viewerPhotos[viewerIndex] && sameId(viewerPhotos[viewerIndex].id, id)) {
                    closeViewer();
                }
                if (sameId(noteFileId, id)) {
                    closeNote();
                }
                await renderOwned();
            } else if (action === "link") {
                if (incoming) return;
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
    }

    myFiles?.addEventListener("click", onLibraryClick);
    document.getElementById("from-others")?.addEventListener("click", onLibraryClick);

    document.addEventListener("click", (event) => {
        const viewerShare = event.target.closest("[data-share]");
        if (viewerShare) {
            const storyId = viewerShare.getAttribute("data-story-id");
            if (storyId) {
                const story = ownedStories.find(item => sameId(item.id, storyId));
                if (story) {
                    openShareMenu(story, viewerShare).catch(err => alert(err.message));
                }
                return;
            }
            const file = ownedFiles.find(item => sameId(item.id, viewerShare.getAttribute("data-file-id")));
            if (file) {
                openShareMenu(file, viewerShare).catch(err => alert(err.message));
            }
            return;
        }
        if (event.target.closest("[data-action='share']") || event.target.closest("#member-menu")) {
            return;
        }
        if (menuFileId) {
            closeMenu();
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && (menuIsOpen() || menuFileId)) {
            closeMenu();
            return;
        }
        const viewer = document.getElementById("photo-viewer");
        if (viewer && !viewer.hidden) {
            if (event.key === "Escape") {
                closeViewer();
            } else if (event.key === "ArrowLeft" && viewerIndex > 0) {
                viewerIndex -= 1;
                showViewer();
            } else if (event.key === "ArrowRight" && viewerIndex < viewerPhotos.length - 1) {
                viewerIndex += 1;
                showViewer();
            }
            return;
        }
        const note = document.getElementById("note-reader");
        if (note && !note.hidden) {
            if (event.key === "Escape") {
                closeNote();
            }
            return;
        }
        const story = document.getElementById("story-reader");
        if (story && !story.hidden && event.key === "Escape") {
            closeStory();
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
