
// Default settings
const DEFAULT_SETTINGS : Settings = {
    regexList: [],
    hideContentCredentials: false,
    highlightMode: false,
};

// Load settings from storage
export function loadSettings(): Settings {
    let settings = {};
    for (const key of Object.keys(DEFAULT_SETTINGS)) {
        settings[key] = GM_getValue(key, DEFAULT_SETTINGS[key]);
    }
    return settings as Settings;
}

// Save settings to storage
export function saveSettings(settings: Settings) {
    for (const key of Object.keys(settings)) {
        GM_setValue(key, settings[key]);
    }
}
