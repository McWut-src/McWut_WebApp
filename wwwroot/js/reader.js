/* Readable notes for My files and the public share page.
   Markdown becomes HTML on the server. This script decides which files can be read,
   and draws Mermaid diagrams (flowcharts, Gantt charts, mindmaps) in the browser.
   Keep the extension list aligned with FamilyVault.Files.Security.ReadableFiles. */
(() => {
    const maxBytes = 200000;
    const mermaidSrc = "/lib/mermaid/12.1.0/mermaid.min.js";
    let mermaidReady = null;

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

    function loadMermaid() {
        if (!mermaidReady) {
            mermaidReady = new Promise((resolve, reject) => {
                const script = document.createElement("script");
                script.src = mermaidSrc;
                script.async = true;
                script.onload = () => {
                    const api = window.mermaid;
                    if (!api || typeof api.initialize !== "function") {
                        mermaidReady = null;
                        reject(new Error("Could not load the diagram script."));
                        return;
                    }
                    api.initialize({
                        startOnLoad: false,
                        securityLevel: "sandbox",
                        theme: "neutral"
                    });
                    resolve(api);
                };
                script.onerror = () => {
                    mermaidReady = null;
                    reject(new Error("Could not load the diagram script."));
                };
                document.head.appendChild(script);
            });
        }
        return mermaidReady;
    }

    function markMiss(node) {
        if (node.nextElementSibling && node.nextElementSibling.classList.contains("diagram-miss")) {
            return;
        }
        const note = document.createElement("p");
        note.className = "note-skip diagram-miss";
        note.textContent = "This diagram could not be drawn.";
        node.insertAdjacentElement("afterend", note);
    }

    async function mountDiagrams(root) {
        const scope = root && typeof root.querySelectorAll === "function" ? root : document;
        const nodes = scope.querySelectorAll("pre.mermaid");
        if (nodes.length === 0) {
            return;
        }
        try {
            const api = await loadMermaid();
            await api.run({ nodes, suppressErrors: true });
        } catch {
            nodes.forEach(markMiss);
        }
    }

    window.mcwutRead = {
        maxBytes,
        isReadable,
        isMarkdown,
        mountDiagrams
    };

    mountDiagrams(document);
})();
