import { createDialogShadowDom } from './settings_dialog.mjs'


// Default settings
const DEFAULT_SETTINGS = {
    regexList: [],
    debugMode: false
};

// Load settings from storage
function loadSettings() {
    const regexList = GM_getValue('regexList', DEFAULT_SETTINGS.regexList);
    const debugMode = GM_getValue('debugMode', DEFAULT_SETTINGS.debugMode);
    return { regexList, debugMode };
}

// Save settings to storage
function saveSettings(settings) {
    GM_setValue('regexList', settings.regexList);
    GM_setValue('debugMode', settings.debugMode);
}

function isElementPost(element) {
    return element.matches('[role="article"]');
}

function isElementNews(element) {
    return element.matches('.news-module__storyline');
}

function isElementAMatch(element) {
    return isElementPost(element) || isElementNews(element);
}

function queryAllElements(root=null) {
    if (!root) {
        root = document;
    }
    return root.querySelectorAll('[role="article"],.news-module__storyline');
}


function getElementText(element) {
    if (isElementNews(element)) {
        // LinkedIn News
        return element.innerText;
    }
    if (isElementPost(element)) {
        // Post
        const elem = element.querySelector('.break-words');
        if (!elem) {
            return '';
        }
        return elem.innerText;
    }

    return '';
}

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function regexFromLiteralWord(word) {
    // Surround with \b to ensure word boundaries.
    const regex = new RegExp(`\\b${escapeRegex(word)}\\b`, 'i');
    return regex;
}

function runFilterOnUrl(url) {
    return !url.includes('/feed/update/');
}

// Convert string representations to actual RegExp objects
function parseRegexList(regexStringArray) {
    return regexStringArray.map(str => {
        const match = str.match(/^\/(.+)\/([gimuy]*)$/);
        if (match) {
            return new RegExp(match[1], match[2]);
        }
        // If not in /pattern/flags format, treat as literal word
        return regexFromLiteralWord(str);
    }).filter(Boolean);
}

function buildGetRegexList() {
    let lastRegexStringArray = [];
    let lastResult = [];

    return () => {
        const regexStringArray = loadSettings().regexList;
        if (lastRegexStringArray != regexStringArray) {
            lastRegexStringArray = regexStringArray;
            lastResult = parseRegexList(regexStringArray);
        }
        return lastResult;
    };
}

const getRegexList = buildGetRegexList();

// Function to check if element should be removed
function shouldRemove(element) {
    const text = getElementText(element);
    for (const regex of getRegexList()) {
        if (regex.test(text)) {
            return true;
        }
    }
    return false;
}

// Function to remove matching posts and other elements
function filterElements() {
    const elements = queryAllElements();
    let processed = 0;

    const debugMode = loadSettings().debugMode;

    elements.forEach(element => {
        if (shouldRemove(element)) {
            if (debugMode) {
                // Debug mode: highlight the element
                if (!element.dataset.filtered) {
                    const highlightNode = document.createElement('div');
                    highlightNode.textContent = 'Matched';
                    highlightNode.style.backgroundColor = '#ff00ff';
                    highlightNode.style.textAlign = 'center';
                    element.prepend(highlightNode);

                    element.style.setProperty('border', '#f0f 5px solid', 'important');

                    element.dataset.filtered = 'true';
                    processed++;
                }
            } else {
                // Normal mode: remove the element
                element.remove();
                processed++;
            }
        }
    });

    if (processed > 0) {
        const action = debugMode ? 'Highlighted' : 'Removed';
        console.log(`[LinkedIn Element Filter] ${action} ${processed} elements(s)`);
    }
}


function showSettingsDialog() {
    // Remove existing dialog if present
    const existingDialog = document.getElementById('linkedin-filter-settings');
    if (existingDialog) {
        existingDialog.remove();
    }

    function applySettings(settings) {
        saveSettings(settings);

        console.log('[LinkedIn Element Filter] Settings saved:', settings);

        // Reload the page
        window.location.reload();
    }

    const dialogHost = createDialogShadowDom({
        settings: loadSettings(),
        applySettings: applySettings
    });
    document.body.appendChild(dialogHost);
}

// Register menu command to open settings
GM_registerMenuCommand('Filter Settings', showSettingsDialog);

// Run filter when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', filterElements);
} else {
    filterElements();
}

// Watch for dynamically loaded elements
const observer = new MutationObserver((mutations) => {
    // Only run if we're on a page that allows changes
    if (!runFilterOnUrl(window.location.href)) {
        return;
    }

    let shouldFilter = false;

    for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
            // TODO - replace hard-coded number
            if (node.nodeType === 1) {
                if (isElementAMatch(node)) {
                    shouldFilter = true;
                    break;
                }
            }
        }
        if (shouldFilter) {
            break;
        }
    }

    if (shouldFilter) {
        filterElements();
    }
});

// Start observing
observer.observe(document.documentElement, {
    childList: true,
    subtree: true
});

// Also run periodically as backup
//setInterval(filterElements, 2000);