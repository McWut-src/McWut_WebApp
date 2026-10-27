(() => {
    const tokenMeta = document.querySelector('meta[name="request-verification-token"]');
    const antiforgery = tokenMeta ? tokenMeta.getAttribute("content") : "";
    const listEl = document.getElementById("message-list");
    const shellEl = document.getElementById("message-shell");
    const threadEl = document.getElementById("message-thread");
    const whoEl = document.getElementById("message-who");
    const peopleEl = document.getElementById("message-people");
    const peopleListEl = document.getElementById("message-people-list");
    const groupTitleWrap = document.getElementById("message-group-title-wrap");
    const groupTitleInput = document.getElementById("message-group-title");
    const startChatBtn = document.getElementById("message-start-chat");
    const groupEditBtn = document.getElementById("message-group-edit-btn");
    const groupPanelEl = document.getElementById("message-group-panel");
    const groupRenameInput = document.getElementById("message-group-rename");
    const groupAddWrap = document.getElementById("message-group-add-wrap");
    const groupAddList = document.getElementById("message-group-add-list");
    const groupCancelBtn = document.getElementById("message-group-cancel");
    const groupSaveBtn = document.getElementById("message-group-save");
    const logEl = document.getElementById("message-log");
    const typingEl = document.getElementById("message-typing");
    const typingTextEl = document.getElementById("message-typing-text");
    const formEl = document.getElementById("message-form");
    const composeRowEl = document.getElementById("message-compose-row");
    const boxEl = document.getElementById("message-box");
    const errorEl = document.getElementById("message-error");
    const newBtn = document.getElementById("message-new");
    const backBtn = document.getElementById("message-back");
    const sendBtn = document.getElementById("message-send");
    const searchEl = document.getElementById("message-search");
    const notifyBtn = document.getElementById("message-notify");
    const soundBtn = document.getElementById("message-sound");

    const quoteBarEl = document.getElementById("message-quote-bar");
    const quoteWhoEl = document.getElementById("message-quote-who");
    const quoteTextEl = document.getElementById("message-quote-text");
    const quoteClearBtn = document.getElementById("message-quote-clear");

    const attachBarEl = document.getElementById("message-attach-bar");
    const attachThumbEl = document.getElementById("message-attach-thumb");
    const attachNameEl = document.getElementById("message-attach-name");
    const attachStatusEl = document.getElementById("message-attach-status");
    const attachClearBtn = document.getElementById("message-attach-clear");

    const photoInput = document.getElementById("message-photo-input");
    const photoBtn = document.getElementById("message-photo-btn");
    const filesBtn = document.getElementById("message-files-btn");
    const doodleBtn = document.getElementById("message-doodle-btn");
    const stickerBtn = document.getElementById("message-sticker-btn");
    const stickerPopEl = document.getElementById("message-sticker-pop");
    const quickEmojisEl = document.getElementById("message-quick-emojis");
    const stickerGridEl = document.getElementById("message-sticker-grid");
    const stickerCreateThemeEl = document.getElementById("sticker-create-theme");
    const stickerCreatePromptEl = document.getElementById("sticker-create-prompt");
    const stickerCreateBtn = document.getElementById("sticker-create-btn");
    const stickerCreateStatusEl = document.getElementById("sticker-create-status");
    const micBtn = document.getElementById("message-mic-btn");

    const voiceBarEl = document.getElementById("message-voice-bar");
    const voiceTimerEl = document.getElementById("message-voice-timer");
    const voiceCancelBtn = document.getElementById("message-voice-cancel");
    const voiceSendBtn = document.getElementById("message-voice-send");

    const reactMenuEl = document.getElementById("message-react-menu");

    const viewerEl = document.getElementById("message-photo-viewer");
    const viewerBackdrop = document.getElementById("message-viewer-backdrop");
    const viewerImg = document.getElementById("message-viewer-img");
    const viewerName = document.getElementById("message-viewer-name");
    const viewerDownload = document.getElementById("message-viewer-download");
    const viewerClose = document.getElementById("message-viewer-close");

    const filesModalEl = document.getElementById("message-files-modal");
    const filesSearchEl = document.getElementById("message-files-search");
    const filesListEl = document.getElementById("message-files-list");

    const doodleModalEl = document.getElementById("message-doodle-modal");
    const doodleSwatchesEl = document.getElementById("doodle-swatches");
    const doodleSizesEl = document.getElementById("doodle-sizes");
    const doodleEraserBtn = document.getElementById("doodle-eraser-btn");
    const doodleUndoBtn = document.getElementById("doodle-undo-btn");
    const doodleBgBtn = document.getElementById("doodle-bg-btn");
    const doodleBgInput = document.getElementById("doodle-bg-input");
    const doodleClearBtn = document.getElementById("doodle-clear-btn");
    const doodleSendBtn = document.getElementById("doodle-send-btn");
    const doodleBgCanvas = document.getElementById("doodle-bg-canvas");
    const doodleDrawCanvas = document.getElementById("doodle-draw-canvas");

    if (!listEl || !shellEl || !logEl || !formEl || !boxEl) {
        return;
    }

    const NOTIFY_KEY = "mcwut-msg-notify";
    const SOUND_KEY = "mcwut-msg-sound";
    if (!window.McWutMessagesCatalog) {
        console.error("[McWut] Missing dependency: messages-stickers.js must load before messages.js");
    }
    if (!window.McWutMessagesAudio) {
        console.error("[McWut] Missing dependency: messages-audio.js must load before messages.js");
    }
    if (!window.McWutMessagesDoodle) {
        console.error("[McWut] Missing dependency: messages-doodle.js must load before messages.js");
    }
    const catalog = window.McWutMessagesCatalog || { REACTIONS: [], QUICK_EMOJIS: [], STICKERS: [] };
    const REACTIONS = catalog.REACTIONS;
    const QUICK_EMOJIS = catalog.QUICK_EMOJIS;
    const STICKERS = catalog.STICKERS;
    const STICKER_SET = new Set(STICKERS.map(s => s.slug));

    let conversations = [];
    let members = [];
    let customStickers = [];
    let creatingSticker = false;
    let myFilesCache = null;
    let selectedId = null;
    let seen = new Set();
    let messageRowsById = new Map();
    let pollTimer = 0;
    let inboxTimer = 0;
    let unreadByThread = null;
    let sending = false;
    let uploading = false;
    let picking = false;
    let pickedUsers = new Set();
    let groupAddPicked = new Set();
    let activeQuote = null;
    let stagedAttachment = null;
    let reactTargetMessageId = null;
    let lastTypingSentAt = 0;

    let audioCtx = null;
    let voiceRecorder = null;
    let voiceChunks = [];
    let voiceTimer = 0;
    let voiceStartedAt = 0;
    let voiceAction = "cancel";

    function icon(name, cls) {
        return window.mcwutIcon ? window.mcwutIcon(name, cls) : "";
    }

    function setButtonIcon(btn, name) {
        if (btn) {
            btn.innerHTML = icon(name);
        }
    }

    setButtonIcon(photoBtn, "image");
    setButtonIcon(filesBtn, "files");
    setButtonIcon(doodleBtn, "brush");
    setButtonIcon(stickerBtn, "smile");
    setButtonIcon(micBtn, "mic");
    setButtonIcon(quoteClearBtn, "close");
    setButtonIcon(attachClearBtn, "close");
    setButtonIcon(groupEditBtn, "users");
    setButtonIcon(viewerDownload, "download");
    setButtonIcon(viewerClose, "close");
    setButtonIcon(doodleEraserBtn, "eraser");
    setButtonIcon(doodleUndoBtn, "undo");
    setButtonIcon(doodleBgBtn, "image");

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
        const luminance = (0.299 * r) + (0.587 * g) + (0.114 * b);
        return luminance > 160 ? "#0b1f3a" : "#ffffff";
    }

    function memberLabel(member) {
        const raw = String(member?.displayName || "").trim();
        if (raw && !raw.includes("@")) {
            return raw;
        }
        const email = String(member?.email || raw || "").trim();
        const at = email.indexOf("@");
        return at > 0 ? email.slice(0, at) : (email || "Member");
    }

    function initial(name) {
        const clean = String(name || "").trim();
        if (!clean) {
            return "?";
        }
        const chars = Array.from(clean);
        return (chars[0] || "?").toUpperCase();
    }

    function humanSize(bytes) {
        const n = Number(bytes) || 0;
        if (n < 1024) return `${n} B`;
        if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
        return `${(n / (1024 * 1024)).toFixed(1)} MB`;
    }

    function formatWhen(value) {
        if (!value) {
            return "";
        }
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return "";
        }
        const now = new Date();
        const sameDay = date.getFullYear() === now.getFullYear()
            && date.getMonth() === now.getMonth()
            && date.getDate() === now.getDate();
        return sameDay
            ? date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
            : date.toLocaleDateString([], { month: "short", day: "numeric" }) + " " + date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    }

    function formatSec(sec) {
        const s = Math.max(0, Math.floor(Number(sec) || 0));
        return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
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
        errorEl.textContent = message;
        errorEl.hidden = false;
    }

    function selected() {
        return conversations.find(c => c.id === selectedId) || null;
    }

    function previewText(item) {
        if (!item.preview) {
            return item.isGroup ? "Group chat" : "No messages yet";
        }
        if (item.fromMe) {
            if (item.isGroup) {
                const sep = item.preview.indexOf(": ");
                return sep > 0 ? `You: ${item.preview.slice(sep + 2)}` : `You: ${item.preview}`;
            }
            return `You: ${item.preview}`;
        }
        return item.preview;
    }

    // --- Sound Chimes (Web Audio API, zero external assets) ---
    function soundActive() {
        return window.McWutMessagesAudio ? window.McWutMessagesAudio.soundActive() : true;
    }

    function paintSoundButton() {
        if (window.McWutMessagesAudio) {
            window.McWutMessagesAudio.paintSoundButton(soundBtn, icon);
        }
    }

    function ensureAudioContext() {
        return window.McWutMessagesAudio ? window.McWutMessagesAudio.ensureAudioContext() : null;
    }

    function playChime(kind) {
        if (window.McWutMessagesAudio) {
            window.McWutMessagesAudio.playChime(kind);
        }
    }

    soundBtn?.addEventListener("click", () => {
        if (window.McWutMessagesAudio) {
            window.McWutMessagesAudio.toggleSound(soundBtn, icon);
        }
    });

    // --- iPad & iOS Safari visualViewport Keyboard Anchoring ---
    function syncViewport() {
        if (!window.visualViewport || !threadEl) {
            return;
        }
        const vv = window.visualViewport;
        const keyboardOpen = window.innerHeight - vv.height > 110;
        shellEl.classList.toggle("is-keyboard-open", keyboardOpen);
        if (window.innerWidth < 992 && shellEl.classList.contains("is-open")) {
            const rect = threadEl.getBoundingClientRect();
            const available = Math.max(260, Math.floor(vv.height - Math.max(0, rect.top - vv.offsetTop) - 10));
            threadEl.style.height = `${available}px`;
            threadEl.style.maxHeight = `${available}px`;
            if (document.activeElement === boxEl) {
                logEl.scrollTop = logEl.scrollHeight;
            }
        } else {
            threadEl.style.height = "";
            threadEl.style.maxHeight = "";
        }
    }

    if (window.visualViewport) {
        window.visualViewport.addEventListener("resize", syncViewport);
        window.visualViewport.addEventListener("scroll", syncViewport);
    }
    window.addEventListener("resize", syncViewport);

    function syncBoxHeight() {
        boxEl.style.height = "auto";
        const clamped = Math.min(112, Math.max(40, boxEl.scrollHeight));
        boxEl.style.height = `${clamped}px`;
    }

    // --- Conversation List & Header Rendering ---
    function renderList() {
        if (conversations.length === 0) {
            listEl.innerHTML = '<p class="empty">No chats yet. Tap New to message someone or start a group.</p>';
            return;
        }
        const query = (searchEl?.value || "").trim().toLowerCase();
        const visible = query
            ? conversations.filter(item => {
                const memberText = Array.isArray(item.members) ? item.members.map(m => m.name).join(" ") : "";
                return [item.name || "", item.preview || "", memberText].join(" ").toLowerCase().includes(query);
            })
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
            const avatarInner = item.isGroup ? icon("users") : esc(initial(item.name));
            const groupClass = item.isGroup ? " is-group" : "";
            return `<button type="button" class="message-item${active}" data-id="${esc(item.id)}" role="option" aria-selected="${item.id === selectedId ? "true" : "false"}">
                <span class="message-avatar${groupClass}" style="background:${color};color:${pillInk(color)}">${avatarInner}</span>
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
        syncViewport();
    }

    function showPeople(show) {
        picking = show;
        if (peopleEl) {
            peopleEl.hidden = !show;
        }
        if (groupPanelEl && show) {
            groupPanelEl.hidden = true;
        }
        logEl.hidden = show;
        if (typingEl && show) {
            typingEl.hidden = true;
        }
        formEl.hidden = show || !selectedId;
    }

    function paintWho(conv) {
        if (!whoEl) {
            return;
        }
        whoEl.textContent = "";
        if (!conv) {
            whoEl.textContent = "Choose a chat";
            if (groupEditBtn) {
                groupEditBtn.hidden = true;
            }
            return;
        }

        const avatar = document.createElement("span");
        const safe = safeColor(conv.color);
        avatar.className = "message-avatar" + (conv.isGroup ? " is-group" : "");
        avatar.style.background = safe;
        avatar.style.color = pillInk(safe);
        if (conv.isGroup) {
            avatar.innerHTML = icon("users");
        } else {
            avatar.textContent = initial(conv.name);
        }

        const textWrap = document.createElement("div");
        textWrap.className = "message-who-copy";
        const title = document.createElement("div");
        title.className = "message-who-title";
        title.textContent = conv.name || "Chat";
        textWrap.append(title);

        if (conv.isGroup && Array.isArray(conv.members) && conv.members.length > 0) {
            const sub = document.createElement("div");
            sub.className = "message-who-members";
            conv.members.forEach(m => {
                const pill = document.createElement("span");
                pill.className = "member-pill";
                const mc = safeColor(m.color);
                pill.style.background = mc;
                pill.style.color = pillInk(mc);
                pill.textContent = m.name;
                sub.append(pill);
            });
            textWrap.append(sub);
        }

        whoEl.append(avatar, textWrap);
        if (groupEditBtn) {
            groupEditBtn.hidden = !conv.isGroup;
        }
    }

    function nearBottom() {
        return logEl.scrollHeight - logEl.scrollTop - logEl.clientHeight < 90;
    }

    // --- Sticker & Jumbo Emoji Detection ---
    function parseStickerSlug(text) {
        const trimmed = String(text || "").trim();
        if (!trimmed.startsWith("[sticker:") || !trimmed.endsWith("]")) {
            return null;
        }
        const slug = trimmed.slice(9, -1);
        if (STICKER_SET.has(slug) || /^custom-[0-9a-fA-F]{32}$/.test(slug)) {
            return slug;
        }
        return null;
    }

    function stickerUrlForSlug(slug) {
        if (slug && slug.startsWith("custom-")) {
            return `/api/messages/stickers/${encodeURIComponent(slug.slice(7))}.svg`;
        }
        return `/img/stickers/${slug}.svg`;
    }

    function isJumboEmoji(text) {
        const trimmed = String(text || "").trim();
        if (!trimmed || trimmed.length > 24) {
            return false;
        }
        if (/[A-Za-z0-9:/._-]/.test(trimmed)) {
            return false;
        }
        const compact = trimmed.replace(/\s+/g, "");
        if (!compact) {
            return false;
        }
        try {
            if (typeof Intl !== "undefined" && Intl.Segmenter) {
                const segs = Array.from(new Intl.Segmenter([], { granularity: "grapheme" }).segment(compact));
                if (segs.length < 1 || segs.length > 3) {
                    return false;
                }
                return segs.every(s => /\p{Extended_Pictographic}/u.test(s.segment));
            }
        } catch {
            /* Fallback regex check below */
        }
        const matches = compact.match(/\p{Extended_Pictographic}/gu);
        return Boolean(matches && matches.length >= 1 && matches.length <= 3);
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

    // --- Photo Viewer Lightbox ---
    function openPhotoViewer(src, downloadHref, name) {
        if (!viewerEl || !viewerImg) {
            return;
        }
        viewerImg.src = src;
        viewerImg.alt = name || "Photo";
        if (viewerName) {
            viewerName.textContent = name || "Photo";
        }
        if (viewerDownload) {
            viewerDownload.href = downloadHref || src;
            viewerDownload.setAttribute("download", name || "photo");
        }
        viewerEl.hidden = false;
        document.body.classList.add("photo-viewer-open");
    }

    function closePhotoViewer() {
        if (!viewerEl) {
            return;
        }
        viewerEl.hidden = true;
        if (viewerImg) {
            viewerImg.removeAttribute("src");
        }
        document.body.classList.remove("photo-viewer-open");
    }

    viewerBackdrop?.addEventListener("click", closePhotoViewer);
    viewerClose?.addEventListener("click", closePhotoViewer);
    document.addEventListener("keydown", (ev) => {
        if (ev.key === "Escape") {
            if (viewerEl && !viewerEl.hidden) {
                closePhotoViewer();
            }
            hideReactMenu();
            hideStickerPop();
        }
    });

    // --- Inline Voice Player Builder ---
    function buildAudioPlayer(attachment) {
        if (window.McWutMessagesAudio) {
            return window.McWutMessagesAudio.buildAudioPlayer(attachment, { icon, formatSec });
        }
        const wrap = document.createElement("div");
        wrap.className = "message-audio";
        return wrap;
    }

    // --- Bubble Reactions DOM ---
    function renderReactionsInto(container, messageId, reactions) {
        container.textContent = "";
        const list = Array.isArray(reactions) ? reactions : [];
        if (list.length === 0) {
            container.hidden = true;
            return;
        }
        container.hidden = false;
        list.forEach(r => {
            if (!r || !r.count) {
                return;
            }
            const pill = document.createElement("button");
            pill.type = "button";
            pill.className = "reaction-pill" + (r.mine ? " mine" : "");
            const who = Array.isArray(r.names) && r.names.length > 0 ? r.names.join(", ") : "";
            pill.title = who ? `${r.emoji} ${who}` : r.emoji;
            pill.setAttribute("aria-label", `React ${r.emoji} (${r.count})`);
            const em = document.createElement("span");
            em.textContent = r.emoji;
            const ct = document.createElement("span");
            ct.className = "reaction-count";
            ct.textContent = String(r.count);
            pill.append(em, ct);
            pill.addEventListener("click", (ev) => {
                ev.stopPropagation();
                toggleReaction(messageId, r.emoji);
            });
            container.append(pill);
        });
    }

    // --- Message Bubble Builder ---
    function buildBubbleElement(row) {
        messageRowsById.set(row.id, row);
        const conv = selected();
        const isGroup = Boolean(conv && conv.isGroup);
        const stickerSlug = parseStickerSlug(row.body);

        const item = document.createElement("article");
        item.className = "message-bubble"
            + (row.mine ? " mine" : "")
            + (stickerSlug && !row.attachment && !row.quote ? " is-sticker-only" : "");
        item.dataset.id = row.id;

        // Group chat sender header on incoming bubbles
        if (isGroup && !row.mine && row.senderName) {
            const senderHead = document.createElement("div");
            senderHead.className = "message-sender";
            const dot = document.createElement("span");
            dot.className = "message-sender-dot";
            dot.style.background = safeColor(row.senderColor);
            const sName = document.createElement("span");
            sName.textContent = row.senderName;
            senderHead.append(dot, sName);
            item.append(senderHead);
        }

        // Quoted message block
        if (row.quote && row.quote.author) {
            const q = document.createElement("button");
            q.type = "button";
            q.className = "message-quote";
            const qa = document.createElement("span");
            qa.className = "message-quote-author";
            qa.textContent = row.quote.author;
            const qs = document.createElement("span");
            qs.className = "message-quote-snippet";
            qs.textContent = row.quote.snippet || "";
            q.append(qa, qs);
            if (row.quote.messageId) {
                q.addEventListener("click", () => {
                    const target = logEl.querySelector(`.message-bubble[data-id="${CSS.escape(row.quote.messageId)}"]`);
                    if (target) {
                        target.scrollIntoView({ behavior: "smooth", block: "center" });
                        target.classList.add("is-flash");
                        setTimeout(() => target.classList.remove("is-flash"), 1200);
                    }
                });
            }
            item.append(q);
        }

        // Attachment block
        if (row.attachment && row.attachment.fileId) {
            const att = row.attachment;
            const previewUrl = `/api/files/${encodeURIComponent(att.fileId)}/content?preview=true`;
            const downloadUrl = `/api/files/${encodeURIComponent(att.fileId)}/content`;

            if (att.kind === "photo" || att.kind === "drawing") {
                const imgBtn = document.createElement("button");
                imgBtn.type = "button";
                imgBtn.className = "message-photo-btn";
                imgBtn.title = "View full size";
                imgBtn.setAttribute("aria-label", att.fileName || "View photo");
                const img = document.createElement("img");
                img.className = "message-photo";
                img.loading = "lazy";
                img.src = previewUrl;
                img.alt = att.fileName || "Photo";
                imgBtn.append(img);
                imgBtn.addEventListener("click", () => openPhotoViewer(previewUrl, downloadUrl, att.fileName));
                item.append(imgBtn);
            } else if (att.kind === "audio") {
                item.append(buildAudioPlayer(att));
            } else {
                const card = document.createElement("a");
                card.className = "message-file-card";
                card.href = downloadUrl;
                card.setAttribute("download", att.fileName || "file");
                const fIcon = document.createElement("span");
                fIcon.innerHTML = icon("files");
                const fCopy = document.createElement("span");
                fCopy.className = "message-file-copy";
                const fName = document.createElement("span");
                fName.className = "message-file-name";
                fName.textContent = att.fileName || "File";
                const fSize = document.createElement("span");
                fSize.className = "message-file-size";
                fSize.textContent = humanSize(att.sizeBytes);
                fCopy.append(fName, fSize);
                card.append(fIcon, fCopy);
                item.append(card);
            }
        }

        // Sticker or text body
        if (stickerSlug) {
            const st = document.createElement("img");
            st.className = "message-sticker";
            st.src = stickerUrlForSlug(stickerSlug);
            const found = customStickers.find(s => s.slug === stickerSlug) || STICKERS.find(s => s.slug === stickerSlug);
            st.alt = found ? found.label : "Sticker";
            item.append(st);
        } else if (row.body) {
            const body = document.createElement("p");
            body.className = "message-body" + (isJumboEmoji(row.body) ? " is-jumbo" : "");
            fillMessageBody(body, row.body);
            item.append(body);
        }

        // Reactions bar
        const reactionsWrap = document.createElement("div");
        reactionsWrap.className = "message-reactions";
        renderReactionsInto(reactionsWrap, row.id, row.reactions);
        item.append(reactionsWrap);

        // Footer meta: time + read receipt + quick actions
        const meta = document.createElement("div");
        meta.className = "message-meta";

        const when = document.createElement("time");
        when.className = "message-when";
        when.dateTime = row.sentAt || "";
        when.textContent = formatWhen(row.sentAt);
        meta.append(when);

        if (row.mine) {
            const receipt = document.createElement("span");
            receipt.className = "message-receipt" + (row.readByOther ? " is-read" : "");
            receipt.textContent = row.readByOther ? "✓✓ Read" : "✓";
            meta.append(receipt);
        }

        const actions = document.createElement("span");
        actions.className = "message-bubble-actions";

        const reactBtn = document.createElement("button");
        reactBtn.type = "button";
        reactBtn.className = "bubble-action-btn";
        reactBtn.title = "React";
        reactBtn.setAttribute("aria-label", "React to message");
        reactBtn.innerHTML = icon("smile");
        reactBtn.addEventListener("click", (ev) => {
            ev.stopPropagation();
            openReactMenu(row.id, reactBtn);
        });

        const replyBtn = document.createElement("button");
        replyBtn.type = "button";
        replyBtn.className = "bubble-action-btn";
        replyBtn.title = "Reply";
        replyBtn.setAttribute("aria-label", "Reply to message");
        replyBtn.innerHTML = icon("reply");
        replyBtn.addEventListener("click", (ev) => {
            ev.stopPropagation();
            stageQuote(row);
        });

        actions.append(reactBtn, replyBtn);
        meta.append(actions);
        item.append(meta);

        // Long-press on touch devices (iPad/iPhone) opens tapback bar
        let pressTimer = 0;
        let startX = 0;
        let startY = 0;
        item.addEventListener("touchstart", (ev) => {
            if (ev.touches.length !== 1) return;
            startX = ev.touches[0].clientX;
            startY = ev.touches[0].clientY;
            pressTimer = window.setTimeout(() => {
                pressTimer = 0;
                openReactMenu(row.id, item);
            }, 420);
        }, { passive: true });
        item.addEventListener("touchmove", (ev) => {
            if (!pressTimer || ev.touches.length !== 1) return;
            if (Math.abs(ev.touches[0].clientX - startX) > 12 || Math.abs(ev.touches[0].clientY - startY) > 12) {
                clearTimeout(pressTimer);
                pressTimer = 0;
            }
        }, { passive: true });
        item.addEventListener("touchend", () => {
            if (pressTimer) {
                clearTimeout(pressTimer);
                pressTimer = 0;
            }
        }, { passive: true });

        return item;
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
        const item = buildBubbleElement(row);
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
            fragment.append(buildBubbleElement(row));
        });
        logEl.prepend(fragment);
        logEl.scrollTop += logEl.scrollHeight - previous;
    }

    // --- Live Sync of Typing Dots, Read Receipts & Reactions ---
    function applyLiveThreadUpdates(data) {
        if (!data) {
            return;
        }
        if (Array.isArray(data.readMessageIds)) {
            const readSet = new Set(data.readMessageIds);
            readSet.forEach(msgId => {
                const stored = messageRowsById.get(msgId);
                if (stored) {
                    stored.readByOther = true;
                }
                const receipt = logEl.querySelector(`.message-bubble[data-id="${CSS.escape(msgId)}"] .message-receipt`);
                if (receipt && !receipt.classList.contains("is-read")) {
                    receipt.classList.add("is-read");
                    receipt.textContent = "✓✓ Read";
                }
            });
        }
        if (Array.isArray(data.reactionUpdates)) {
            data.reactionUpdates.forEach(sync => {
                if (!sync || !sync.messageId) return;
                const stored = messageRowsById.get(sync.messageId);
                if (stored) {
                    stored.reactions = sync.reactions || [];
                }
                const container = logEl.querySelector(`.message-bubble[data-id="${CSS.escape(sync.messageId)}"] .message-reactions`);
                if (container) {
                    renderReactionsInto(container, sync.messageId, sync.reactions || []);
                }
            });
        }
        paintTyping(data.typing);
    }

    function paintTyping(names) {
        if (!typingEl || !typingTextEl) {
            return;
        }
        const list = Array.isArray(names) ? names.filter(Boolean) : [];
        if (list.length === 0 || picking || !selectedId) {
            typingEl.hidden = true;
            typingTextEl.textContent = "";
            return;
        }
        if (list.length === 1) {
            typingTextEl.textContent = `${list[0]} is typing…`;
        } else if (list.length === 2) {
            typingTextEl.textContent = `${list[0]} and ${list[1]} are typing…`;
        } else {
            typingTextEl.textContent = `${list.slice(0, 2).join(", ")} and others are typing…`;
        }
        typingEl.hidden = false;
    }

    // --- Floating Tapback Menu & Quote Replies ---
    function buildReactMenu() {
        if (!reactMenuEl) {
            return;
        }
        reactMenuEl.textContent = "";
        REACTIONS.forEach(emoji => {
            const b = document.createElement("button");
            b.type = "button";
            b.className = "react-menu-emoji";
            b.textContent = emoji;
            b.setAttribute("aria-label", `React ${emoji}`);
            b.addEventListener("click", (ev) => {
                ev.stopPropagation();
                const targetId = reactTargetMessageId;
                hideReactMenu();
                if (targetId) {
                    toggleReaction(targetId, emoji);
                }
            });
            reactMenuEl.append(b);
        });
        const replyBtn = document.createElement("button");
        replyBtn.type = "button";
        replyBtn.className = "react-menu-reply";
        replyBtn.innerHTML = `${icon("reply")}<span>Reply</span>`;
        replyBtn.addEventListener("click", (ev) => {
            ev.stopPropagation();
            const row = reactTargetMessageId ? messageRowsById.get(reactTargetMessageId) : null;
            hideReactMenu();
            if (row) {
                stageQuote(row);
            }
        });
        reactMenuEl.append(replyBtn);
    }
    buildReactMenu();

    function openReactMenu(messageId, anchorEl) {
        if (!reactMenuEl || !anchorEl) {
            return;
        }
        reactTargetMessageId = messageId;
        reactMenuEl.hidden = false;
        const rect = anchorEl.getBoundingClientRect();
        const menuRect = reactMenuEl.getBoundingClientRect();
        let top = rect.top - menuRect.height - 8;
        if (top < 64) {
            top = Math.min(window.innerHeight - menuRect.height - 12, rect.bottom + 8);
        }
        let left = Math.max(8, Math.min(rect.left, window.innerWidth - menuRect.width - 8));
        reactMenuEl.style.top = `${Math.round(top)}px`;
        reactMenuEl.style.left = `${Math.round(left)}px`;
    }

    function hideReactMenu() {
        if (reactMenuEl) {
            reactMenuEl.hidden = true;
        }
        reactTargetMessageId = null;
    }

    document.addEventListener("click", (ev) => {
        if (reactMenuEl && !reactMenuEl.hidden && !reactMenuEl.contains(ev.target)) {
            hideReactMenu();
        }
        if (stickerPopEl && !stickerPopEl.hidden && !stickerPopEl.contains(ev.target) && !stickerBtn?.contains(ev.target)) {
            hideStickerPop();
        }
    });

    async function toggleReaction(messageId, emoji) {
        if (!selectedId || !messageId) {
            return;
        }
        try {
            const updated = await api(`/api/messages/${selectedId}/reactions`, {
                method: "POST",
                headers: headers({ "Content-Type": "application/json" }),
                body: JSON.stringify({ messageId, emoji })
            });
            const stored = messageRowsById.get(messageId);
            if (stored) {
                stored.reactions = updated || [];
            }
            const container = logEl.querySelector(`.message-bubble[data-id="${CSS.escape(messageId)}"] .message-reactions`);
            if (container) {
                renderReactionsInto(container, messageId, updated || []);
            }
        } catch (err) {
            showError(err.message);
        }
    }

    function quotePreviewForRow(row) {
        const sticker = parseStickerSlug(row.body);
        if (sticker) return "🎨 Sticker";
        if (row.body && row.body.trim()) {
            const flat = row.body.replace(/\s+/g, " ").trim();
            return flat.length > 90 ? flat.slice(0, 90) + "…" : flat;
        }
        if (row.attachment) {
            if (row.attachment.kind === "photo") return "📷 Photo";
            if (row.attachment.kind === "drawing") return "🎨 Drawing";
            if (row.attachment.kind === "audio") return "🎤 Voice note";
            return "📎 " + (row.attachment.fileName || "File");
        }
        return "Message";
    }

    function stageQuote(row) {
        if (!row || !quoteBarEl) {
            return;
        }
        const who = row.mine ? "yourself" : (row.senderName || selected()?.name || "Member");
        activeQuote = {
            id: row.id,
            author: who,
            snippet: quotePreviewForRow(row)
        };
        if (quoteWhoEl) quoteWhoEl.textContent = `Replying to ${who}`;
        if (quoteTextEl) quoteTextEl.textContent = activeQuote.snippet;
        quoteBarEl.hidden = false;
        boxEl.focus();
    }

    function clearQuote() {
        activeQuote = null;
        if (quoteBarEl) {
            quoteBarEl.hidden = true;
        }
    }
    quoteClearBtn?.addEventListener("click", clearQuote);

    // --- Stickers & Quick Emojis ---
    function setStickerStatus(text, isError, showDots) {
        if (!stickerCreateStatusEl) return;
        if (!text) {
            stickerCreateStatusEl.hidden = true;
            stickerCreateStatusEl.textContent = "";
            stickerCreateStatusEl.classList.remove("text-danger", "text-muted");
            return;
        }
        stickerCreateStatusEl.hidden = false;
        stickerCreateStatusEl.textContent = text;
        if (showDots) {
            const dots = document.createElement("span");
            dots.className = "sticker-dots";
            dots.innerHTML = "<span></span><span></span><span></span>";
            stickerCreateStatusEl.append(dots);
        }
        stickerCreateStatusEl.classList.toggle("text-danger", Boolean(isError));
        stickerCreateStatusEl.classList.toggle("text-muted", !isError);
    }

    function renderStickerGrid() {
        if (!stickerGridEl) return;
        stickerGridEl.innerHTML = "";
        const all = [...customStickers, ...STICKERS];
        all.forEach(st => {
            const wrap = document.createElement("div");
            wrap.className = "sticker-pick-cell";

            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "sticker-pick-btn";
            btn.title = st.label;
            btn.setAttribute("aria-label", `Send ${st.label} sticker`);
            const img = document.createElement("img");
            img.src = stickerUrlForSlug(st.slug);
            img.alt = st.label;
            img.loading = "lazy";
            btn.append(img);
            btn.addEventListener("click", () => {
                hideStickerPop();
                sendPayload({ body: `[sticker:${st.slug}]` });
            });
            wrap.append(btn);

            if (st.id && st.canDelete) {
                const delBtn = document.createElement("button");
                delBtn.type = "button";
                delBtn.className = "sticker-del-btn";
                delBtn.title = "Delete custom sticker";
                delBtn.setAttribute("aria-label", `Delete ${st.label} sticker`);
                delBtn.textContent = "×";
                delBtn.addEventListener("click", async (ev) => {
                    ev.stopPropagation();
                    try {
                        await api(`/api/messages/stickers/${encodeURIComponent(st.id)}`, {
                            method: "DELETE",
                            headers: headers()
                        });
                        customStickers = customStickers.filter(item => item.id !== st.id);
                        renderStickerGrid();
                    } catch (err) {
                        setStickerStatus(err.message || "Could not delete sticker.", true);
                    }
                });
                wrap.append(delBtn);
            }

            stickerGridEl.append(wrap);
        });
    }

    async function loadCustomStickers() {
        try {
            const list = await api("/api/messages/stickers", { headers: headers() });
            if (Array.isArray(list)) {
                customStickers = list;
                renderStickerGrid();
            }
        } catch {
            /* Keep built-in stickers if custom fetch fails */
        }
    }

    async function createCustomSticker() {
        if (creatingSticker || !stickerCreatePromptEl) return;
        const prompt = String(stickerCreatePromptEl.value || "").trim();
        if (!prompt) {
            setStickerStatus("Write 1 to 5 words for your sticker.", true);
            stickerCreatePromptEl.focus();
            return;
        }
        const words = prompt.split(/\s+/).filter(Boolean);
        if (words.length > 5) {
            setStickerStatus("Keep your sticker prompt to 5 words max.", true);
            stickerCreatePromptEl.focus();
            return;
        }

        const theme = stickerCreateThemeEl ? stickerCreateThemeEl.value : "street-skate";
        creatingSticker = true;
        if (stickerCreateBtn) {
            stickerCreateBtn.disabled = true;
            stickerCreateBtn.innerHTML = '<span class="sticker-dots"><span></span><span></span><span></span></span>';
        }
        if (stickerCreateThemeEl) stickerCreateThemeEl.disabled = true;
        if (stickerCreatePromptEl) stickerCreatePromptEl.disabled = true;
        setStickerStatus("Drawing your sticker ", false, true);

        try {
            const created = await api("/api/messages/stickers", {
                method: "POST",
                headers: headers({ "Content-Type": "application/json" }),
                body: JSON.stringify({ theme, prompt })
            });
            if (created && created.slug) {
                customStickers = [created, ...customStickers.filter(x => x.slug !== created.slug)];
                renderStickerGrid();
                if (stickerGridEl) {
                    stickerGridEl.scrollTop = 0;
                }
            }
            if (stickerCreatePromptEl) {
                stickerCreatePromptEl.value = "";
            }
            setStickerStatus("Added to your sticker collection!", false, false);
            window.setTimeout(() => setStickerStatus("", false), 2500);
        } catch (err) {
            setStickerStatus(err.message || "Could not create sticker.", true, false);
        } finally {
            creatingSticker = false;
            if (stickerCreateBtn) {
                stickerCreateBtn.disabled = false;
                stickerCreateBtn.textContent = "Create";
            }
            if (stickerCreateThemeEl) stickerCreateThemeEl.disabled = false;
            if (stickerCreatePromptEl) {
                stickerCreatePromptEl.disabled = false;
                stickerCreatePromptEl.focus();
            }
        }
    }

    function initStickersAndEmojis() {
        if (quickEmojisEl) {
            QUICK_EMOJIS.forEach(em => {
                const btn = document.createElement("button");
                btn.type = "button";
                btn.className = "quick-emoji-btn";
                btn.textContent = em;
                btn.setAttribute("aria-label", `Insert ${em}`);
                btn.addEventListener("click", () => {
                    const start = boxEl.selectionStart ?? boxEl.value.length;
                    const end = boxEl.selectionEnd ?? boxEl.value.length;
                    boxEl.value = boxEl.value.slice(0, start) + em + boxEl.value.slice(end);
                    const caret = start + em.length;
                    boxEl.focus();
                    boxEl.setSelectionRange(caret, caret);
                    syncBoxHeight();
                });
                quickEmojisEl.append(btn);
            });
        }
        renderStickerGrid();
        loadCustomStickers();

        stickerCreateBtn?.addEventListener("click", createCustomSticker);
        stickerCreatePromptEl?.addEventListener("keydown", (ev) => {
            if (ev.key === "Enter") {
                ev.preventDefault();
                ev.stopPropagation();
                createCustomSticker();
            }
        });
    }
    initStickersAndEmojis();

    function hideStickerPop() {
        if (stickerPopEl) {
            stickerPopEl.hidden = true;
        }
        stickerBtn?.setAttribute("aria-expanded", "false");
    }

    stickerBtn?.addEventListener("click", (ev) => {
        ev.stopPropagation();
        if (!stickerPopEl) return;
        const nextOpen = stickerPopEl.hidden;
        stickerPopEl.hidden = !nextOpen;
        stickerBtn.setAttribute("aria-expanded", nextOpen ? "true" : "false");
        if (nextOpen) {
            loadCustomStickers();
        }
    });

    // --- Upload Helper & Attachments ---
    async function uploadChatBlob(blob, fileName, contentType, retentionDays) {
        const begin = await api("/api/uploads", {
            method: "POST",
            headers: headers({ "Content-Type": "application/json" }),
            body: JSON.stringify({
                fileName,
                contentType: contentType || "application/octet-stream",
                sizeBytes: blob.size,
                isChatOnly: true,
                retention: { days: retentionDays || 0 }
            })
        });
        const putRes = await fetch(`/api/uploads/${encodeURIComponent(begin.sessionId)}`, {
            method: "PUT",
            headers: headers({ "Content-Type": "application/octet-stream" }),
            body: blob
        });
        if (!putRes.ok) {
            throw new Error(`Upload failed (${putRes.status})`);
        }
        return await api(`/api/uploads/${encodeURIComponent(begin.sessionId)}/complete`, {
            method: "POST",
            headers: headers()
        });
    }

    function clearAttachment() {
        stagedAttachment = null;
        if (attachBarEl) attachBarEl.hidden = true;
        if (attachThumbEl) {
            attachThumbEl.hidden = true;
            attachThumbEl.removeAttribute("src");
        }
        if (photoInput) photoInput.value = "";
    }
    attachClearBtn?.addEventListener("click", clearAttachment);

    function showStagedAttachment(info) {
        stagedAttachment = info;
        if (!attachBarEl) return;
        attachBarEl.hidden = false;
        if (attachNameEl) attachNameEl.textContent = info.fileName || "Attachment";
        if (attachStatusEl) attachStatusEl.textContent = info.status || "Ready to send";
        if (attachThumbEl) {
            if (info.thumbUrl) {
                attachThumbEl.src = info.thumbUrl;
                attachThumbEl.hidden = false;
            } else {
                attachThumbEl.hidden = true;
                attachThumbEl.removeAttribute("src");
            }
        }
    }

    photoBtn?.addEventListener("click", () => photoInput?.click());
    photoInput?.addEventListener("change", async () => {
        const file = photoInput.files && photoInput.files[0];
        if (!file || !selectedId) return;
        uploading = true;
        if (sendBtn) sendBtn.disabled = true;
        showError("");
        const localUrl = URL.createObjectURL(file);
        showStagedAttachment({ fileId: null, kind: "photo", fileName: file.name, thumbUrl: localUrl, status: "Uploading…" });
        try {
            const stored = await uploadChatBlob(file, file.name || "photo.jpg", file.type || "image/jpeg", 0);
            showStagedAttachment({
                fileId: stored.id,
                kind: "photo",
                fileName: stored.originalFileName || file.name,
                thumbUrl: `/api/files/${encodeURIComponent(stored.id)}/content?preview=true`,
                status: humanSize(stored.sizeBytes)
            });
            boxEl.focus();
        } catch (err) {
            clearAttachment();
            showError(err.message);
        } finally {
            URL.revokeObjectURL(localUrl);
            uploading = false;
            if (sendBtn) sendBtn.disabled = false;
        }
    });

    // --- Attach from My Files Modal ---
    function renderMyFilesPicker() {
        if (!filesListEl) return;
        const rows = Array.isArray(myFilesCache) ? myFilesCache : [];
        if (rows.length === 0) {
            filesListEl.innerHTML = '<p class="empty">You have no saved files in My files yet.</p>';
            return;
        }
        const q = (filesSearchEl?.value || "").trim().toLowerCase();
        const filtered = q
            ? rows.filter(f => String(f.originalFileName || "").toLowerCase().includes(q))
            : rows;
        if (filtered.length === 0) {
            filesListEl.innerHTML = '<p class="empty">No matching files.</p>';
            return;
        }
        filesListEl.innerHTML = "";
        filtered.slice(0, 60).forEach(f => {
            const isImg = /^image\/(jpeg|png|gif|webp)$/i.test(f.contentType || "");
            const isAudio = /^audio\//i.test(f.contentType || "");
            const rowBtn = document.createElement("button");
            rowBtn.type = "button";
            rowBtn.className = "message-picker-item";
            if (isImg) {
                const thumb = document.createElement("img");
                thumb.className = "message-picker-thumb";
                thumb.loading = "lazy";
                thumb.src = `/api/files/${encodeURIComponent(f.id)}/content?preview=true`;
                thumb.alt = "";
                rowBtn.append(thumb);
            } else {
                const ic = document.createElement("span");
                ic.className = "message-picker-icon";
                ic.innerHTML = icon(isAudio ? "mic" : "files");
                rowBtn.append(ic);
            }
            const copy = document.createElement("span");
            copy.className = "message-picker-copy";
            const nm = document.createElement("span");
            nm.className = "fw-semibold text-truncate";
            nm.textContent = f.originalFileName || "File";
            const sz = document.createElement("span");
            sz.className = "small text-muted";
            sz.textContent = humanSize(f.sizeBytes);
            copy.append(nm, sz);
            rowBtn.append(copy);

            rowBtn.addEventListener("click", () => {
                const kind = isImg ? "photo" : (isAudio ? "audio" : "file");
                showStagedAttachment({
                    fileId: f.id,
                    kind,
                    fileName: f.originalFileName || "File",
                    thumbUrl: isImg ? `/api/files/${encodeURIComponent(f.id)}/content?preview=true` : null,
                    status: `From My files · ${humanSize(f.sizeBytes)}`
                });
                if (filesModalEl && window.bootstrap) {
                    window.bootstrap.Modal.getInstance(filesModalEl)?.hide();
                }
                boxEl.focus();
            });
            filesListEl.append(rowBtn);
        });
    }

    filesBtn?.addEventListener("click", async () => {
        if (!filesModalEl || !window.bootstrap) return;
        const modal = window.bootstrap.Modal.getOrCreateInstance(filesModalEl);
        modal.show();
        if (filesListEl) filesListEl.innerHTML = '<p class="empty">Loading…</p>';
        try {
            myFilesCache = await api("/api/files");
            renderMyFilesPicker();
        } catch (err) {
            if (filesListEl) filesListEl.innerHTML = `<p class="empty">${esc(err.message)}</p>`;
        }
    });
    filesSearchEl?.addEventListener("input", renderMyFilesPicker);

    // --- Walkie-Talkie Voice Notes (7-Day Auto-Delete) ---
    if (micBtn) {
        if (!navigator.mediaDevices || typeof MediaRecorder === "undefined") {
            micBtn.hidden = true;
        } else {
            micBtn.addEventListener("click", async () => {
                if (!selectedId || voiceRecorder) return;
                showError("");
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
                    const mime = candidates.find(m => typeof MediaRecorder.isTypeSupported === "function" && MediaRecorder.isTypeSupported(m)) || "";
                    voiceChunks = [];
                    voiceAction = "cancel";
                    voiceRecorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);

                    voiceRecorder.addEventListener("dataavailable", (ev) => {
                        if (ev.data && ev.data.size > 0) {
                            voiceChunks.push(ev.data);
                        }
                    });

                    voiceRecorder.addEventListener("stop", async () => {
                        clearInterval(voiceTimer);
                        stream.getTracks().forEach(t => t.stop());
                        if (voiceBarEl) voiceBarEl.hidden = true;
                        if (composeRowEl) composeRowEl.hidden = false;

                        const action = voiceAction;
                        const actualType = (voiceRecorder && voiceRecorder.mimeType) || mime || "audio/webm";
                        const cleanMime = actualType.split(";")[0] || "audio/webm";
                        const ext = cleanMime.includes("mp4") ? ".m4a" : (cleanMime.includes("ogg") ? ".ogg" : ".webm");
                        const blob = new Blob(voiceChunks, { type: cleanMime });
                        voiceRecorder = null;
                        voiceChunks = [];

                        if (action !== "send" || blob.size === 0 || !selectedId) {
                            return;
                        }

                        uploading = true;
                        if (sendBtn) sendBtn.disabled = true;
                        try {
                            const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
                            const stored = await uploadChatBlob(blob, `voice-${stamp}${ext}`, cleanMime, 7);
                            await sendPayload({
                                body: boxEl.value.trim(),
                                attachmentFileId: stored.id,
                                attachmentType: "audio"
                            });
                            boxEl.value = "";
                            syncBoxHeight();
                        } catch (err) {
                            showError(err.message);
                        } finally {
                            uploading = false;
                            if (sendBtn) sendBtn.disabled = false;
                        }
                    });

                    voiceStartedAt = Date.now();
                    if (voiceTimerEl) voiceTimerEl.textContent = "0:00";
                    if (composeRowEl) composeRowEl.hidden = true;
                    if (voiceBarEl) voiceBarEl.hidden = false;
                    voiceTimer = window.setInterval(() => {
                        const sec = Math.floor((Date.now() - voiceStartedAt) / 1000);
                        if (voiceTimerEl) voiceTimerEl.textContent = formatSec(sec);
                        if (sec >= 120 && voiceRecorder && voiceRecorder.state !== "inactive") {
                            voiceAction = "send";
                            voiceRecorder.stop();
                        }
                    }, 400);
                    voiceRecorder.start();
                } catch {
                    showError("Microphone access was denied or is unavailable on this device.");
                }
            });
        }
    }

    voiceCancelBtn?.addEventListener("click", () => {
        if (voiceRecorder && voiceRecorder.state !== "inactive") {
            voiceAction = "cancel";
            voiceRecorder.stop();
        }
    });

    voiceSendBtn?.addEventListener("click", () => {
        if (voiceRecorder && voiceRecorder.state !== "inactive") {
            voiceAction = "send";
            voiceRecorder.stop();
        }
    });

    // --- 2-Layer Touch Doodle Pad ---
    function initDoodlePad() {
        if (window.McWutMessagesDoodle) {
            window.McWutMessagesDoodle.init({
                doodleModalEl,
                doodleBgCanvas,
                doodleDrawCanvas,
                doodleSwatchesEl,
                doodleSizesEl,
                doodleEraserBtn,
                doodleUndoBtn,
                doodleBgBtn,
                doodleBgInput,
                doodleClearBtn,
                doodleSendBtn,
                doodleBtn,
                canSend: () => Boolean(selectedId),
                onError: showError,
                onSend: async (blob) => {
                    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
                    const stored = await uploadChatBlob(blob, "doodle-" + stamp + ".png", "image/png", 0);
                    await sendPayload({
                        body: "",
                        attachmentFileId: stored.id,
                        attachmentType: "drawing"
                    });
                }
            });
        }
    }
    initDoodlePad();

    // --- Thread Loading, Polling & Read Marking ---
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

    let lastUserAction = Date.now();

    function noteActivity(wakeNow) {
        const wasIdle = (Date.now() - lastUserAction) > 45000;
        lastUserAction = Date.now();
        if (selectedId && !document.hidden && !picking && (wasIdle || wakeNow)) {
            scheduleNextPoll(100);
        }
    }

    ["pointerdown", "keydown", "scroll", "touchstart"].forEach(evt => {
        window.addEventListener(evt, () => noteActivity(false), { passive: true });
    });

    function currentPollDelay() {
        const idleMs = Date.now() - lastUserAction;
        if (idleMs < 45000) {
            return 8000; // Active chatting: 8s
        }
        if (idleMs < 120000) {
            return 15000; // 45s–2min quiet: 15s
        }
        if (idleMs < 300000) {
            return 30000; // 2min–5min quiet: 30s
        }
        if (idleMs < 900000) {
            return 60000; // 5min–15min quiet: 60s
        }
        return 0; // >15min inactive: pause completely so Azure SQL can pause!
    }

    function stopPoll() {
        if (pollTimer) {
            window.clearTimeout(pollTimer);
            pollTimer = 0;
        }
    }

    function scheduleNextPoll(overrideMs) {
        stopPoll();
        if (!selectedId || document.hidden || picking) {
            return;
        }
        const delay = overrideMs !== undefined ? overrideMs : currentPollDelay();
        if (delay > 0) {
            pollTimer = window.setTimeout(poll, delay);
        }
    }

    function startPoll() {
        lastUserAction = Date.now();
        scheduleNextPoll(8000);
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
            let incomingFromOther = false;
            (data.messages || []).forEach(row => {
                if (appendMessage(row, false)) {
                    added = true;
                    if (!row.mine) {
                        incomingFromOther = true;
                    }
                }
            });
            applyLiveThreadUpdates(data);
            if (incomingFromOther) {
                playChime("receive");
                lastUserAction = Date.now();
            }
            if (added) {
                await markRead();
                const sel = selected();
                if (sel && data.messages && data.messages.length > 0) {
                    const lastMsg = data.messages[data.messages.length - 1];
                    sel.preview = previewText(lastMsg);
                    sel.sentAt = lastMsg.sentAt;
                    sel.fromMe = lastMsg.mine;
                    renderList();
                }
            }
        } catch (err) {
            showError(err.message);
        } finally {
            scheduleNextPoll();
        }
    }

    async function openThread(id) {
        selectedId = id;
        picking = false;
        seen = new Set();
        messageRowsById = new Map();
        clearQuote();
        clearAttachment();
        hideStickerPop();
        hideReactMenu();
        if (groupPanelEl) groupPanelEl.hidden = true;
        showError("");
        logEl.textContent = "";
        setOpen(true);
        showPeople(false);
        formEl.hidden = false;
        renderList();
        paintWho(selected());
        if (location.hash !== "#" + id) {
            history.replaceState(null, "", "#" + id);
        }
        const data = await api(`/api/messages/${id}`);
        (data.messages || []).forEach(message => appendMessage(message, true));
        applyLiveThreadUpdates(data);
        if (data.hasOlder) {
            showEarlier();
        }
        if ((data.messages || []).length === 0) {
            const empty = document.createElement("p");
            empty.className = "empty";
            empty.id = "message-empty";
            empty.textContent = "Say hello 👋";
            logEl.append(empty);
        }
        logEl.scrollTop = logEl.scrollHeight;
        await markRead();
        await loadList();
        paintWho(selected());
        startPoll();
        if (!window.matchMedia("(pointer: coarse)").matches) {
            boxEl.focus();
        }
    }

    // --- Notifications ---
    function notificationsActive() {
        try {
            return "Notification" in window
                && Notification.permission === "granted"
                && localStorage.getItem(NOTIFY_KEY) === "1";
        } catch {
            return false;
        }
    }

    function paintNotifyButton() {
        if (!notifyBtn) {
            return;
        }
        if (!("Notification" in window)) {
            notifyBtn.hidden = true;
            return;
        }
        notifyBtn.hidden = false;
        const active = notificationsActive();
        notifyBtn.setAttribute("aria-pressed", active ? "true" : "false");
        notifyBtn.classList.toggle("active", active);
        notifyBtn.innerHTML = `${icon("bell")}<span>${active ? "Notifications on" : "Enable notifications"}</span>`;
    }

    function maybeNotify(nextList) {
        if (!unreadByThread) {
            unreadByThread = new Map();
            nextList.forEach(item => unreadByThread.set(item.id, Number(item.unread) || 0));
            return;
        }
        const canNotify = notificationsActive();
        let shouldChime = false;
        nextList.forEach(item => {
            const prev = unreadByThread.get(item.id) || 0;
            const curr = Number(item.unread) || 0;
            unreadByThread.set(item.id, curr);
            if (curr > prev && !item.fromMe && item.id !== selectedId) {
                shouldChime = true;
            }
            if (canNotify && curr > prev && !item.fromMe && (document.hidden || item.id !== selectedId)) {
                try {
                    const n = new Notification(item.name || "New message", {
                        body: item.preview || "Sent you a message",
                        tag: "mcwut-msg-" + item.id
                    });
                    n.onclick = () => {
                        window.focus();
                        openThread(item.id).catch(err => showError(err.message));
                    };
                } catch {
                    /* Ignore notification errors in restricted contexts */
                }
            }
        });
        if (shouldChime && !document.hidden) {
            playChime("receive");
        }
    }

    async function loadList() {
        const data = await api("/api/messages");
        conversations = Array.isArray(data) ? data : [];
        maybeNotify(conversations);
        renderList();
    }

    async function loadMembers() {
        const data = await api("/api/members");
        members = Array.isArray(data) ? data : [];
    }

    // --- New Direct / Group Chat Picker ---
    function syncStartChatButton() {
        if (!startChatBtn) return;
        const count = pickedUsers.size;
        if (groupTitleWrap) {
            groupTitleWrap.hidden = count < 2;
        }
        if (count === 0) {
            startChatBtn.disabled = true;
            startChatBtn.textContent = "Choose someone";
            return;
        }
        startChatBtn.disabled = false;
        if (count === 1) {
            const uid = Array.from(pickedUsers)[0];
            const m = members.find(x => x.userId === uid);
            startChatBtn.textContent = `Chat with ${m ? memberLabel(m) : "member"}`;
        } else {
            startChatBtn.textContent = `Start group (${count + 1} people)`;
        }
    }

    function renderPeople() {
        if (!peopleListEl) {
            return;
        }
        if (members.length === 0) {
            peopleListEl.innerHTML = '<p class="empty">No one else has joined yet.</p>';
            syncStartChatButton();
            return;
        }
        peopleListEl.innerHTML = members.map(member => {
            const uid = String(member.userId);
            const name = memberLabel(member);
            const color = safeColor(member.accentColor);
            const picked = pickedUsers.has(uid);
            return `<button type="button" class="message-item message-pick-row${picked ? " is-picked" : ""}" data-user="${esc(uid)}" role="checkbox" aria-checked="${picked ? "true" : "false"}">
                <span class="message-avatar" style="background:${color};color:${pillInk(color)}">${esc(initial(name))}</span>
                <span class="message-copy"><span class="pw-name">${esc(name)}</span></span>
                <span class="message-pick-check" aria-hidden="true">${picked ? "✓" : ""}</span>
            </button>`;
        }).join("");
        syncStartChatButton();
    }

    peopleListEl?.addEventListener("click", (event) => {
        const button = event.target.closest("[data-user]");
        if (!button) return;
        const uid = button.getAttribute("data-user");
        if (!uid) return;
        if (pickedUsers.has(uid)) {
            pickedUsers.delete(uid);
        } else {
            pickedUsers.add(uid);
        }
        renderPeople();
    });

    startChatBtn?.addEventListener("click", async () => {
        const ids = Array.from(pickedUsers);
        if (ids.length === 0) return;
        startChatBtn.disabled = true;
        showError("");
        try {
            let opened;
            if (ids.length === 1) {
                opened = await api("/api/messages", {
                    method: "POST",
                    headers: headers({ "Content-Type": "application/json" }),
                    body: JSON.stringify({ userId: ids[0] })
                });
            } else {
                const title = (groupTitleInput?.value || "").trim();
                opened = await api("/api/messages/groups", {
                    method: "POST",
                    headers: headers({ "Content-Type": "application/json" }),
                    body: JSON.stringify({ userIds: ids, title: title || null })
                });
            }
            await loadList();
            await openThread(opened.id);
        } catch (err) {
            showError(err.message);
            syncStartChatButton();
        }
    });

    // --- Group Settings Panel (Rename / Add Members) ---
    async function toggleGroupPanel() {
        const conv = selected();
        if (!conv || !conv.isGroup || !groupPanelEl) return;
        const opening = groupPanelEl.hidden;
        if (!opening) {
            groupPanelEl.hidden = true;
            return;
        }
        if (members.length === 0) {
            await loadMembers().catch(() => {});
        }
        groupAddPicked = new Set();
        if (groupRenameInput) {
            groupRenameInput.value = conv.customTitle || "";
        }
        const existingSet = new Set((conv.members || []).map(m => String(m.userId)));
        const available = members.filter(m => !existingSet.has(String(m.userId)));
        if (groupAddWrap && groupAddList) {
            if (available.length === 0) {
                groupAddWrap.hidden = true;
                groupAddList.textContent = "";
            } else {
                groupAddWrap.hidden = false;
                groupAddList.innerHTML = available.map(m => {
                    const uid = String(m.userId);
                    const name = memberLabel(m);
                    return `<button type="button" class="btn btn-sm btn-outline-secondary group-add-chip" data-add-user="${esc(uid)}" aria-pressed="false">+ ${esc(name)}</button>`;
                }).join("");
            }
        }
        groupPanelEl.hidden = false;
    }

    groupEditBtn?.addEventListener("click", () => {
        toggleGroupPanel().catch(err => showError(err.message));
    });

    groupCancelBtn?.addEventListener("click", () => {
        if (groupPanelEl) groupPanelEl.hidden = true;
    });

    groupAddList?.addEventListener("click", (ev) => {
        const chip = ev.target.closest("[data-add-user]");
        if (!chip) return;
        const uid = chip.getAttribute("data-add-user");
        if (!uid) return;
        if (groupAddPicked.has(uid)) {
            groupAddPicked.delete(uid);
            chip.classList.remove("btn-primary");
            chip.classList.add("btn-outline-secondary");
            chip.setAttribute("aria-pressed", "false");
        } else {
            groupAddPicked.add(uid);
            chip.classList.remove("btn-outline-secondary");
            chip.classList.add("btn-primary");
            chip.setAttribute("aria-pressed", "true");
        }
    });

    groupSaveBtn?.addEventListener("click", async () => {
        if (!selectedId) return;
        groupSaveBtn.disabled = true;
        showError("");
        try {
            const title = (groupRenameInput?.value || "").trim();
            await api(`/api/messages/${selectedId}/group`, {
                method: "PATCH",
                headers: headers({ "Content-Type": "application/json" }),
                body: JSON.stringify({
                    title: title || null,
                    updateTitle: true,
                    addUserIds: Array.from(groupAddPicked)
                })
            });
            if (groupPanelEl) groupPanelEl.hidden = true;
            await loadList();
            paintWho(selected());
        } catch (err) {
            showError(err.message);
        } finally {
            groupSaveBtn.disabled = false;
        }
    });

    // --- Sending Messages ---
    async function sendPayload(payload) {
        if (!selectedId || sending) {
            return;
        }
        sending = true;
        if (sendBtn) sendBtn.disabled = true;
        showError("");
        try {
            const bodyObj = {
                body: payload.body ?? "",
                attachmentFileId: payload.attachmentFileId || null,
                attachmentType: payload.attachmentType || null,
                replyToMessageId: activeQuote ? activeQuote.id : null
            };
            const saved = await api(`/api/messages/${selectedId}`, {
                method: "POST",
                headers: headers({ "Content-Type": "application/json" }),
                body: JSON.stringify(bodyObj)
            });
            const empty = document.getElementById("message-empty");
            if (empty) {
                empty.remove();
            }
            appendMessage(saved, true);
            playChime("send");
            clearQuote();
            lastUserAction = Date.now();
            scheduleNextPoll(8000);
            await loadList();
        } catch (err) {
            showError(err.message);
        } finally {
            sending = false;
            if (sendBtn) sendBtn.disabled = false;
        }
    }

    async function sendFromForm() {
        if (uploading || sending || !selectedId) {
            return;
        }
        const text = boxEl.value;
        const hasAttach = Boolean(stagedAttachment && stagedAttachment.fileId);
        if (!hasAttach && !text.trim()) {
            return;
        }
        const att = stagedAttachment;
        clearAttachment();
        boxEl.value = "";
        syncBoxHeight();
        await sendPayload({
            body: text,
            attachmentFileId: att ? att.fileId : null,
            attachmentType: att ? att.kind : null
        });
        if (!window.matchMedia("(pointer: coarse)").matches) {
            boxEl.focus();
        }
    }

    // --- Typing Heartbeat ---
    function maybeSendTyping() {
        if (!selectedId || picking || !boxEl.value.trim()) {
            return;
        }
        const now = Date.now();
        if (now - lastTypingSentAt < 2400) {
            return;
        }
        lastTypingSentAt = now;
        fetch(`/api/messages/typing/${encodeURIComponent(selectedId)}`, {
            method: "POST",
            headers: headers()
        }).catch(() => {});
    }

    boxEl.addEventListener("input", () => {
        syncBoxHeight();
        maybeSendTyping();
    });

    listEl.addEventListener("click", (event) => {
        const button = event.target.closest("[data-id]");
        if (!button) {
            return;
        }
        openThread(button.getAttribute("data-id")).catch(err => showError(err.message));
    });

    searchEl?.addEventListener("input", renderList);

    async function showNew() {
        stopPoll();
        setOpen(true);
        showError("");
        pickedUsers = new Set();
        if (groupTitleInput) groupTitleInput.value = "";
        paintWho(null);
        if (whoEl) {
            whoEl.textContent = "New chat";
        }
        showPeople(true);
        if (!peopleListEl) {
            return;
        }
        if (members.length === 0) {
            peopleListEl.innerHTML = '<p class="empty">Loading…</p>';
            await loadMembers();
        }
        renderPeople();
    }

    newBtn?.addEventListener("click", () => {
        showNew().catch(err => showError(err.message));
    });

    backBtn?.addEventListener("click", () => {
        stopPoll();
        selectedId = null;
        picking = false;
        setOpen(false);
        showPeople(false);
        formEl.hidden = true;
        logEl.textContent = "";
        paintWho(null);
        renderList();
        if (location.hash) {
            history.replaceState(null, "", location.pathname);
        }
    });

    formEl.addEventListener("submit", (event) => {
        event.preventDefault();
        sendFromForm();
    });

    boxEl.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" || event.shiftKey || event.isComposing) {
            return;
        }
        if (window.matchMedia("(pointer: coarse)").matches) {
            return;
        }
        event.preventDefault();
        sendFromForm();
    });

    notifyBtn?.addEventListener("click", async () => {
        if (!("Notification" in window)) {
            return;
        }
        if (notificationsActive()) {
            try { localStorage.setItem(NOTIFY_KEY, "0"); } catch {}
            paintNotifyButton();
            return;
        }
        try {
            const permission = Notification.permission === "granted"
                ? "granted"
                : await Notification.requestPermission();
            if (permission === "granted") {
                try { localStorage.setItem(NOTIFY_KEY, "1"); } catch {}
            } else {
                showError("Browser notifications are blocked in your browser settings.");
            }
        } catch {
            showError("Could not enable browser notifications.");
        }
        paintNotifyButton();
    });

    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            stopPoll();
            return;
        }
        loadList().catch(() => {});
        if (selectedId && !picking) {
            poll();
            startPoll();
        }
    });

    paintSoundButton();
    paintNotifyButton();
    syncBoxHeight();

    inboxTimer = window.setInterval(() => {
        const isIdle = (Date.now() - lastUserAction) > 900000;
        if (!document.hidden && !isIdle) {
            loadList().catch(() => {});
        }
    }, 60000);

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
