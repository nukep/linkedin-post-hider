
// Default settings
const DEFAULT_SETTINGS : Settings = {
    regexList: [],
    debugMode: false
};

// Load settings from storage
export function loadSettings(): Settings {
    const regexList = GM_getValue('regexList', DEFAULT_SETTINGS.regexList);
    const debugMode = GM_getValue('debugMode', DEFAULT_SETTINGS.debugMode);
    return { regexList, debugMode };
}

// Save settings to storage
export function saveSettings(settings: Settings) {
    GM_setValue('regexList', settings.regexList);
    GM_setValue('debugMode', settings.debugMode);
}