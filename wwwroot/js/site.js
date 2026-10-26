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
                osc.type = theme === "arcade-8bit" ? "square" : "triangle";
                osc.frequency.setValueAtTime(523.25, now);
                osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.08);
                gain.gain.setValueAtTime(0.06, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.1);
                return;
            }

            if (theme === "arcade-8bit") {
                osc.type = "square";
                osc.frequency.setValueAtTime(987.77, now); // B5
                osc.frequency.setValueAtTime(1318.51, now + 0.07); // E6 coin!
                gain.gain.setValueAtTime(0.06, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
                osc.start(now);
                osc.stop(now + 0.28);
            } else if (theme === "voxel-pop") {
                osc.type = "sine";
                osc.frequency.setValueAtTime(320, now);
                osc.frequency.exponentialRampToValueAtTime(780, now + 0.065);
                gain.gain.setValueAtTime(0.11, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
                osc.start(now);
                osc.stop(now + 0.08);
            } else if (theme === "court-buzzer") {
                osc.type = "sawtooth";
                osc.frequency.setValueAtTime(440, now);
                osc.frequency.setValueAtTime(587.33, now + 0.09);
                gain.gain.setValueAtTime(0.06, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
                osc.start(now);
                osc.stop(now + 0.24);
            } else if (theme === "dojo-gong") {
                osc.type = "triangle";
                osc.frequency.setValueAtTime(293.66, now); // D4
                osc.frequency.exponentialRampToValueAtTime(220, now + 0.35);
                gain.gain.setValueAtTime(0.12, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
                osc.start(now);
                osc.stop(now + 0.36);
            } else {
                osc.type = "sine";
                osc.frequency.setValueAtTime(587.33, now);
                osc.frequency.setValueAtTime(880, now + 0.09);
                gain.gain.setValueAtTime(0.09, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
                osc.start(now);
                osc.stop(now + 0.24);
            }
        } catch (e) {}
    }
};

