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
