(function () {
    var pick = document.querySelector(".color-pick");
    var hex = document.getElementById("color-hex");
    if (pick && hex) {
        pick.addEventListener("input", function () {
            hex.textContent = pick.value;
        });
    }

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
