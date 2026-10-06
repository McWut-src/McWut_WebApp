window.mcwutIcon = function (name, extra) {
    const paths = {
        files: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
        image: '<rect x="4" y="5" width="16" height="14" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="M4 16l4.5-4.5a1.5 1.5 0 0 1 2.1 0L16 16"/><path d="M13 14l1.5-1.5a1.5 1.5 0 0 1 2.1 0L20 15"/>',
        users: '<path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="9.5" cy="7" r="3"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a3 3 0 0 1 0 5.75"/>',
        lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
        search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>',
        upload: '<path d="M12 16V6"/><path d="M8 9l4-4 4 4"/><path d="M5 19h14"/>',
        download: '<path d="M12 5v10"/><path d="M8 11l4 4 4-4"/><path d="M5 19h14"/>',
        link: '<path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.1-.1l-2 2a5 5 0 0 0 7.1 7.1l1.1-1.1"/>',
        trash: '<path d="M4 7h16"/><path d="M9 7V5h6v2"/><path d="M7 7l1 13h8l1-13"/>',
        eye: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.5"/>',
        "eye-off": '<path d="M3 3l18 18"/><path d="M10.5 6.2A10.6 10.6 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-3.2 3.8"/><path d="M6.1 6.8C3.7 8.5 2 12 2 12a17 17 0 0 0 6.2 5.2"/><path d="M9.9 9.9a2.5 2.5 0 0 0 3.5 3.5"/>',
        copy: '<rect x="8" y="8" width="11" height="12" rx="2"/><path d="M6 16H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
        plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
        logout: '<path d="M10 7V5a2 2 0 0 1 2-2h7v18h-7a2 2 0 0 1-2-2v-2"/><path d="M4 12h10"/><path d="M11 9l3 3-3 3"/>',
        key: '<circle cx="8" cy="14" r="4"/><path d="M11.5 12.5L20 4"/><path d="M17 7l3 3"/><path d="M15 9l2 2"/>',
        mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 7 9-7"/>',
        people: '<circle cx="12" cy="8" r="3"/><path d="M5 19a7 7 0 0 1 14 0"/>',
        activity: '<path d="M3 12h4l2-6 4 12 2-6h6"/>',
        refresh: '<path d="M20 12a8 8 0 1 1-2.2-5.5"/><path d="M20 4v5h-5"/>',
        close: '<path d="M6 6l12 12"/><path d="M18 6L6 18"/>',
        left: '<path d="M15 5l-7 7 7 7"/>',
        right: '<path d="M9 5l7 7-7 7"/>',
        external: '<path d="M14 5h5v5"/><path d="M19 5l-8 8"/><path d="M17 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h5"/>',
        pencil: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/>',
        menu: '<path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/>',
        note: '<path d="M7 3h8l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M15 3v5h5"/><path d="M9 13h6"/><path d="M9 17h4"/>'
    };
    const body = paths[name] || paths.files;
    const cls = extra ? "icon " + extra : "icon";
    return '<svg class="' + cls + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + "</svg>";
};
