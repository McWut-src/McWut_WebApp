(function () {
    var pick = document.querySelector(".color-pick");
    var hex = document.getElementById("color-hex");
    if (pick && hex) {
        pick.addEventListener("input", function () {
            hex.textContent = pick.value;
        });
    }

    function applyTheme(dark) {
        if (dark) {
            document.documentElement.setAttribute("data-theme", "dark");
        } else {
            document.documentElement.removeAttribute("data-theme");
        }
        document.querySelectorAll("[data-theme-value]").forEach(function (btn) {
            var on = (btn.getAttribute("data-theme-value") === "dark") === dark;
            btn.setAttribute("aria-pressed", on ? "true" : "false");
        });
    }

    var savedDark = false;
    try {
        savedDark = localStorage.getItem("mcwut-theme") === "dark";
    } catch (e) { }
    applyTheme(savedDark);

    document.querySelectorAll("[data-theme-value]").forEach(function (btn) {
        btn.addEventListener("click", function () {
            var dark = btn.getAttribute("data-theme-value") === "dark";
            applyTheme(dark);
            try {
                if (dark) {
                    localStorage.setItem("mcwut-theme", "dark");
                } else {
                    localStorage.removeItem("mcwut-theme");
                }
            } catch (e) { }
        });
    });

    var button = document.getElementById("rail-toggle");
    if (!button) {
        return;
    }

    function paint(icons) {
        document.documentElement.classList.toggle("is-rail", icons);
        button.setAttribute("aria-pressed", icons ? "true" : "false");
        var label = icons ? "Show names" : "Icons only";
        button.title = label;
        button.setAttribute("aria-label", label);
    }

    paint(document.documentElement.classList.contains("is-rail"));

    button.addEventListener("click", function () {
        var icons = !document.documentElement.classList.contains("is-rail");
        paint(icons);
        try {
            localStorage.setItem("mcwut-nav", icons ? "icons" : "names");
        } catch (e) { }
    });
})();

window.mcwut = window.mcwut || {
    csrfToken: function () {
        var meta = document.querySelector('meta[name="request-verification-token"]');
        return meta ? meta.getAttribute("content") : "";
    },
    headers: function (extra) {
        return Object.assign({
            "RequestVerificationToken": (window.mcwut.csrfToken ? window.mcwut.csrfToken() : ""),
            "Accept": "application/json"
        }, extra || {});
    },
    api: async function (url, options) {
        var response = await fetch(url, options);
        if (response.status === 204) {
            return null;
        }
        var text = await response.text();
        var data = null;
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
            var message = data && (data.error || data.title) ? (data.error || data.title) : "Request failed (" + response.status + ")";
            throw new Error(message);
        }
        return data;
    },
    esc: function (value) {
        return String(value ?? "").replace(/[&<>"']/g, function (ch) {
            return {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                "\"": "&quot;",
                "'": "&#39;"
            }[ch];
        });
    },
    sameId: function (a, b) {
        return String(a || "").toLowerCase() === String(b || "").toLowerCase();
    },
    safeColor: function (value) {
        var color = String(value || "").trim().toLowerCase();
        return /^#[0-9a-f]{6}$/.test(color) ? color : "#0b1f3a";
    },
    pillInk: function (color) {
        var hex = window.mcwut.safeColor(color).slice(1);
        var r = parseInt(hex.slice(0, 2), 16);
        var g = parseInt(hex.slice(2, 4), 16);
        var b = parseInt(hex.slice(4, 6), 16);
        return (r * 299 + g * 587 + b * 114) / 1000 > 160 ? "#0b1f3a" : "#ffffff";
    },
    formatSize: function (bytes) {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
        return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    },
    formatExpiry: function (iso) {
        if (!iso) {
            return "Forever";
        }
        var when = new Date(iso);
        return when.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    },
    _audioCtx: null,
    playChime: function (kind, themeOverride) {
        var Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        try {
            if (!window.mcwut._audioCtx) {
                window.mcwut._audioCtx = new Ctx();
            }
            var ctx = window.mcwut._audioCtx;
            if (ctx.state === "suspended") {
                ctx.resume().catch(function () {});
            }
            var theme = themeOverride || document.body.getAttribute("data-chime") || "classic";
            var now = ctx.currentTime;
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            if (kind === "send") {
                osc.type = "sine";
                osc.frequency.setValueAtTime(523.25, now);
                osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.08);
                gain.gain.setValueAtTime(0.05, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.1);
                return;
            }

            if (theme === "soft-bell" || theme === "arcade-8bit") {
                // Pure crystal bell: soft sine chime with high shimmer
                osc.type = "sine";
                osc.frequency.setValueAtTime(880, now); // A5
                osc.frequency.setValueAtTime(1318.51, now + 0.07); // E6
                gain.gain.setValueAtTime(0.06, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
                osc.start(now);
                osc.stop(now + 0.32);
            } else if (theme === "acoustic-wood" || theme === "voxel-pop") {
                // Warm acoustic marimba / wooden tap
                osc.type = "triangle";
                osc.frequency.setValueAtTime(440, now); // A4
                osc.frequency.exponentialRampToValueAtTime(370, now + 0.09);
                gain.gain.setValueAtTime(0.09, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
                osc.start(now);
                osc.stop(now + 0.14);
            } else if (theme === "executive-pulse" || theme === "court-buzzer") {
                // Executive discrete pulse: subtle two-tone sine
                osc.type = "sine";
                osc.frequency.setValueAtTime(659.25, now); // E5
                osc.frequency.setValueAtTime(783.99, now + 0.08); // G5
                gain.gain.setValueAtTime(0.05, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
                osc.start(now);
                osc.stop(now + 0.22);
            } else if (theme === "minimal-tap" || theme === "dojo-gong") {
                // Minimalist studio tick: discrete subtle tap
                osc.type = "triangle";
                osc.frequency.setValueAtTime(523.25, now); // C5
                gain.gain.setValueAtTime(0.06, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
                osc.start(now);
                osc.stop(now + 0.06);
            } else {
                // Classic studio chime: warm harmonic interval (D5 to A5)
                osc.type = "sine";
                osc.frequency.setValueAtTime(587.33, now); // D5
                osc.frequency.setValueAtTime(880, now + 0.08); // A5
                gain.gain.setValueAtTime(0.07, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
                osc.start(now);
                osc.stop(now + 0.26);
            }
        } catch (e) {}
    }
};

