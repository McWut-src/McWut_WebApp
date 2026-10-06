/* Readable notes for My files and the public share page.
   Markup in a note is escaped. Links and images are emitted only for http(s).
   Keep the extension list aligned with FamilyVault.Files.Security.ReadableFiles. */
(() => {
    const maxBytes = 200000;

    function media(type) {
        return String(type || "").split(";")[0].trim().toLowerCase();
    }

    function extension(name) {
        const value = String(name || "").trim().toLowerCase();
        const slash = Math.max(value.lastIndexOf("/"), value.lastIndexOf("\\"));
        const base = slash >= 0 ? value.slice(slash + 1) : value;
        const dot = base.lastIndexOf(".");
        if (dot <= 0 || dot === base.length - 1) {
            return "";
        }
        return base.slice(dot);
    }

    function generic(type) {
        return type === "" || type === "application/octet-stream" || type === "binary/octet-stream";
    }

    function isMarkdown(file) {
        const type = media(file && file.contentType);
        const ext = extension(file && (file.originalFileName || file.name));
        if (type === "text/markdown" || type === "text/x-markdown") {
            return true;
        }
        return (ext === ".md" || ext === ".markdown") && (generic(type) || type === "text/plain");
    }

    function isReadable(file) {
        if (isMarkdown(file)) {
            return true;
        }
        const type = media(file && file.contentType);
        if (type === "text/plain" || type === "text/csv" || type === "application/json" || type === "text/json") {
            return true;
        }
        if (!generic(type)) {
            return false;
        }
        const ext = extension(file && (file.originalFileName || file.name));
        return ext === ".txt" || ext === ".text" || ext === ".log" || ext === ".csv" || ext === ".json";
    }

    function escapeHtml(value) {
        return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            "\"": "&quot;",
            "'": "&#39;"
        }[ch]));
    }

    function safeHttp(url) {
        const trimmed = String(url || "").trim();
        if (trimmed.length === 0 || trimmed.length > 2000 || /[\s<>"']/.test(trimmed) || /[\u0000-\u001f]/.test(trimmed)) {
            return null;
        }
        let parsed;
        try {
            parsed = new URL(trimmed);
        } catch {
            return null;
        }
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
            return null;
        }
        return parsed.href;
    }

    function parseLink(src, start) {
        if (src[start] !== "[") {
            return null;
        }
        const close = src.indexOf("]", start + 1);
        if (close < 0 || src[close + 1] !== "(") {
            return null;
        }
        let end = close + 2;
        let depth = 1;
        while (end < src.length && depth > 0) {
            if (src[end] === "(") {
                depth += 1;
            } else if (src[end] === ")") {
                depth -= 1;
            }
            if (depth === 0) {
                break;
            }
            end += 1;
        }
        if (depth !== 0) {
            return null;
        }
        const url = src.slice(close + 2, end);
        if (url.length === 0 || url.length > 2000 || /\s/.test(url)) {
            return null;
        }
        return { label: src.slice(start + 1, close), url, next: end + 1 };
    }

    function inline(src, depth) {
        if (depth > 8) {
            return escapeHtml(src);
        }
        let html = "";
        let i = 0;
        while (i < src.length) {
            if (src[i] === "`") {
                const end = src.indexOf("`", i + 1);
                if (end > i) {
                    html += "<code>" + escapeHtml(src.slice(i + 1, end)) + "</code>";
                    i = end + 1;
                    continue;
                }
            }
            if (src.startsWith("**", i)) {
                const end = src.indexOf("**", i + 2);
                if (end > i + 2) {
                    html += "<strong>" + inline(src.slice(i + 2, end), depth + 1) + "</strong>";
                    i = end + 2;
                    continue;
                }
            }
            if (src.startsWith("~~", i)) {
                const end = src.indexOf("~~", i + 2);
                if (end > i + 2) {
                    html += "<del>" + inline(src.slice(i + 2, end), depth + 1) + "</del>";
                    i = end + 2;
                    continue;
                }
            }
            if (src[i] === "*" && src[i + 1] !== "*") {
                const end = src.indexOf("*", i + 1);
                if (end > i + 1) {
                    html += "<em>" + inline(src.slice(i + 1, end), depth + 1) + "</em>";
                    i = end + 1;
                    continue;
                }
            }
            if (src[i] === "!" && src[i + 1] === "[") {
                const image = parseLink(src, i + 1);
                if (image) {
                    const href = safeHttp(image.url);
                    html += href
                        ? `<img src="${escapeHtml(href)}" alt="${escapeHtml(image.label)}" referrerpolicy="no-referrer">`
                        : escapeHtml(image.label);
                    i = image.next;
                    continue;
                }
            }
            if (src[i] === "[") {
                const link = parseLink(src, i);
                if (link && link.label) {
                    const href = safeHttp(link.url);
                    html += href
                        ? `<a href="${escapeHtml(href)}" rel="noopener noreferrer">${escapeHtml(link.label)}</a>`
                        : escapeHtml(link.label);
                    i = link.next;
                    continue;
                }
            }
            let next = i + 1;
            while (next < src.length && src[next] !== "`" && src[next] !== "*" && src[next] !== "~" && src[next] !== "!" && src[next] !== "[") {
                next += 1;
            }
            html += escapeHtml(src.slice(i, next));
            i = next;
        }
        return html;
    }

    function isFence(line) {
        return /^\s{0,3}```/.test(line);
    }

    function isRule(line) {
        return /^\s{0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line);
    }

    function render(src, depth) {
        const level = depth || 0;
        if (level > 6) {
            return "<p>" + escapeHtml(src) + "</p>";
        }
        const text = String(src ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
        const lines = text.split("\n");
        const blocks = [];
        let i = 0;
        while (i < lines.length) {
            const line = lines[i];
            if (line.trim() === "") {
                i += 1;
                continue;
            }
            if (isFence(line)) {
                const code = [];
                i += 1;
                while (i < lines.length && !isFence(lines[i])) {
                    code.push(lines[i]);
                    i += 1;
                }
                if (i < lines.length) {
                    i += 1;
                }
                blocks.push("<pre class=\"md-code\"><code>" + escapeHtml(code.join("\n")) + "</code></pre>");
                continue;
            }
            if (isRule(line)) {
                blocks.push("<hr>");
                i += 1;
                continue;
            }
            const heading = /^\s{0,3}(#{1,6})\s+(\S.*)$/.exec(line);
            if (heading) {
                const rank = heading[1].length;
                blocks.push("<h" + rank + ">" + inline(heading[2].trim(), 0) + "</h" + rank + ">");
                i += 1;
                continue;
            }
            if (/^\s{0,3}>\s?/.test(line)) {
                const quoted = [];
                while (i < lines.length && /^\s{0,3}>\s?/.test(lines[i])) {
                    quoted.push(lines[i].replace(/^\s{0,3}>\s?/, ""));
                    i += 1;
                }
                blocks.push("<blockquote>" + render(quoted.join("\n"), level + 1) + "</blockquote>");
                continue;
            }
            if (/^\s{0,3}[-*]\s+\S/.test(line)) {
                const items = [];
                while (i < lines.length && /^\s{0,3}[-*]\s+\S/.test(lines[i])) {
                    items.push("<li>" + inline(lines[i].replace(/^\s{0,3}[-*]\s+/, ""), 0) + "</li>");
                    i += 1;
                }
                blocks.push("<ul>" + items.join("") + "</ul>");
                continue;
            }
            if (/^\s{0,3}\d+\.\s+\S/.test(line)) {
                const items = [];
                while (i < lines.length && /^\s{0,3}\d+\.\s+\S/.test(lines[i])) {
                    items.push("<li>" + inline(lines[i].replace(/^\s{0,3}\d+\.\s+/, ""), 0) + "</li>");
                    i += 1;
                }
                blocks.push("<ol>" + items.join("") + "</ol>");
                continue;
            }
            const para = [];
            while (i < lines.length && lines[i].trim() !== "" && !isFence(lines[i]) && !isRule(lines[i]) && !/^\s{0,3}#{1,6}\s+\S/.test(lines[i]) && !/^\s{0,3}>\s?/.test(lines[i]) && !/^\s{0,3}[-*]\s+\S/.test(lines[i]) && !/^\s{0,3}\d+\.\s+\S/.test(lines[i])) {
                para.push(lines[i].trim());
                i += 1;
            }
            blocks.push("<p>" + inline(para.join(" "), 0) + "</p>");
        }
        return blocks.join("");
    }

    function mountShareNotes() {
        document.querySelectorAll("[data-markdown]").forEach((block) => {
            if (block.classList.contains("is-rendered")) {
                return;
            }
            const source = block.querySelector(".md-source");
            if (!source) {
                return;
            }
            const view = document.createElement("article");
            view.className = "md-view";
            view.innerHTML = render(source.textContent);
            block.appendChild(view);
            block.classList.add("is-rendered");
        });
    }

    window.mcwutRead = {
        maxBytes,
        isReadable,
        isMarkdown,
        render,
        mountShareNotes
    };

    mountShareNotes();
})();
