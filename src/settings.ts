const CURRENT_SETTINGS_VERSION: string = 'v1';

export class SettingsMigrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SettingsMigrationError';
  }
}

// Load settings from storage
export function loadSettings(): Settings {
    // Temporary: Set a version if it's not set.
    // Earlier releases didn't set this field.
    // This will be removed.
    if (GM_getValue('version', null) == null) {
        GM_setValue('version', CURRENT_SETTINGS_VERSION);
    }

    return migrate();
}

// Save settings to storage
export function saveSettings(settings: Settings) {
    GM_setValue('version', CURRENT_SETTINGS_VERSION);

    for (const key of Object.keys(settings)) {
        GM_setValue(key, settings[key]);
    }
}

function loadKeys(json: any) {
    const keys = Object.keys(json);
    for (const key of keys) {
        json[key] = GM_getValue(key, json[key]);
    }
}

function migrate(): Settings {
    const version = GM_getValue('version', CURRENT_SETTINGS_VERSION);

    if (version == 'v1') {
        // Default settings for v1
        let doc: SettingsV1 = {
            filterPatterns: '',
            hideSuggested: false,
            hideContentCredentials: false,
            highlightMode: false,
        };
        loadKeys(doc);

        return migrateFromV1(doc);
    } else {
        // Unknown version
        // Likely because the user upgraded and is running an old instance in another tab.
        // It's impossible to back-migrate, because we don't know any future schemas.
        // Throw an error.

        throw new SettingsMigrationError(`Cannot migrate from unknown settings schema: ${version}`)
    }
}

function migrateFromV1(doc: SettingsV1): Settings {
    return doc;
}
