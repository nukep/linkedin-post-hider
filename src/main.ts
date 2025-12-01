import { createDialogShadowDom } from './settings_dialog'
import { loadSettings, saveSettings } from './settings';
import * as DomUtils from './dom_utils';

const HIGHLIGHT_BG_COLOR = '#7742e0';
const HIGHLIGHT_FG_COLOR = '#ffffff';

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

interface RegexItem {
    allow: boolean,
    regex: RegExp
}

// Convert string representations to actual RegExp objects
function parseRegexList(filterPatterns: string): RegexItem[] {
    // Split the pattern into a list of strings.
    // Remove empty lines and comments.
    const regexStringArray = filterPatterns.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .filter(line => line[0] != '#');

    return regexStringArray.map(str => {
        // If the string starts with !, allow it
        let allow = false;
        if (str.startsWith('!')) {
            allow = true;
            str = str.substring(1);
        }

        const match = str.match(/^\/(.+)\/([gimuy]*)$/);

        let regex: RegExp;

        if (match) {
            regex = new RegExp(match[1], match[2]);
        } else {
            // If not in /pattern/flags format, treat as literal word
            regex = regexFromLiteralWord(str);
        }

        return {
            allow,
            regex
        };
    }).filter(Boolean);
}

function buildGetRegexList(): () => RegexItem[] {
    let lastFilterPatterns = '';
    let lastResult: RegexItem[] = [];

    return () => {
        const filterPatterns = loadSettings().filterPatterns;
        if (lastFilterPatterns != filterPatterns) {
            lastFilterPatterns = filterPatterns;
            lastResult = parseRegexList(lastFilterPatterns);
        }
        return lastResult;
    };
}

const getRegexList = buildGetRegexList();

// Function to check if element should be removed
function shouldRemove(element, settings: Settings, regexList: RegexItem[]) {
    if (settings.hideContentCredentials) {
        if (DomUtils.doesElementContainContentCredentials(element)) {
            return true;
        }
    }

    if (settings.hideSuggested) {
        if (DomUtils.isElementSuggested(element)) {
            return true;
        }
    }

    const text = DomUtils.getElementText(element);
    for (const { allow, regex } of regexList) {
        if (regex.test(text)) {
            // Exit early on both explicit "allow" and "deny".
            return !allow;
        }
    }
    return false;
}

// Function to remove matching posts and other elements
function filterElements() {
    const elements = DomUtils.queryAllElements();
    let processed = 0;

    const settings = loadSettings();
    const highlightMode = settings.highlightMode;
    const regexList = getRegexList();

    elements.forEach(element => {
        if (shouldRemove(element, settings, regexList)) {
            if (highlightMode) {
                if (!element.dataset.filtered) {
                    // const highlightNode = document.createElement('div');
                    // highlightNode.textContent = 'Matched';
                    // highlightNode.style.color = HIGHLIGHT_FG_COLOR;
                    // highlightNode.style.backgroundColor = HIGHLIGHT_BG_COLOR;
                    // highlightNode.style.textAlign = 'center';
                    // element.prepend(highlightNode);

                    element.style.setProperty('border', `${HIGHLIGHT_BG_COLOR} 5px solid`, 'important');

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
        const action = highlightMode ? 'Highlighted' : 'Removed';
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
            if (node.nodeType === Node.ELEMENT_NODE) {
                const elem = node as HTMLElement;
                if (DomUtils.isElementAMatch(elem)) {
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