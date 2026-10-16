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
    }
};

