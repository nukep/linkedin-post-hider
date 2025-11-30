// ==UserScript==
// @name         Remove LinkedIn Posts
// @namespace    http://tampermonkey.net/
// @version      2025-11-30
// @description  Remove LinkedIn posts and other elements matching regex patterns
// @author       Danny Spencer, Claude Sonnet 4.5
// @match        https://www.linkedin.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @run-at       document-start
// ==/UserScript==


// NOTE: This is mostly AI-generated because I don't write TamperMonkey scripts all the time, and I was in dire need.
// I acknowledge the irony of my having writing this to filter out the AI spam on my feed. Maybe using AI to block AI is actually poetic!
// With that said, here it is in case it's of any use to someone.

// Feedback and any new revisions to make it not suck are welcome!


function isElementArticle(element) {
    return element.matches('[role="article"]');
}

function isElementNews(element) {
    return element.matches('.news-module__storyline');
}

function isElementAMatch(element) {
    return isElementArticle(element) || isElementNews(element);
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
    if (isElementArticle(element)) {
        // Article
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

(function() {
    'use strict';

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

    let settings = loadSettings();
    let compiledRegexList = parseRegexList(settings.regexList);

    // Function to check if element should be removed
    function shouldRemove(element) {
        const text = getElementText(element);
        for (const regex of compiledRegexList) {
            if (regex.test(text)) {
                return true;
            }
        }
        return false;
    }

    // Function to remove matching articles
    function filterElements() {
        const elements = queryAllElements();
        let processed = 0;

        elements.forEach(element => {
            if (shouldRemove(element)) {
                if (settings.debugMode) {
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
            const action = settings.debugMode ? 'Highlighted' : 'Removed';
            console.log(`[LinkedIn Element Filter] ${action} ${processed} elements(s)`);
        }
    }

    // Create settings UI
    function showSettingsDialog() {
        // Remove existing dialog if present
        const existingDialog = document.getElementById('linkedin-filter-settings');
        if (existingDialog) {
            existingDialog.remove();
        }

        const dialog = document.createElement('div');
        dialog.id = 'linkedin-filter-settings';

        // TODO - Make this Claude-generated mess nicer. Use CSS classes if possible?
        dialog.innerHTML = `
            <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                        background: white; padding: 25px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                        z-index: 10000; max-width: 500px; width: 90%; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                <h2 style="margin: 0 0 20px 0; color: #333; font-size: 20px;">LinkedIn Post Filter Settings</h2>

                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #555;">
                        Filter Patterns (one per line):
                    </label>
                    <textarea id="regex-input" style="width: 100%; height: 150px; padding: 10px;
                              border: 1px solid #ccc; border-radius: 4px; font-family: monospace;
                              font-size: 13px; box-sizing: border-box; resize: vertical;"
                              placeholder="AI&#10;/\\bsynerg(y|ize|ise)/i&#10;hustle&#10;hack:">${settings.regexList.join('\n')}</textarea>
                    <small style="color: #666; display: block; margin-top: 5px;">
                        Use /pattern/flags format (e.g., /\\bfoo.*?bar\\b/i) or plain text
                    </small>
                </div>

                <div style="margin-bottom: 20px;">
                    <label style="display: flex; align-items: center; cursor: pointer; user-select: none;">
                        <input type="checkbox" id="debug-mode" ${settings.debugMode ? 'checked' : ''}
                               style="margin-right: 8px; width: 18px; height: 18px; cursor: pointer;
                               appearance: auto !important; -webkit-appearance: checkbox !important;
                               -moz-appearance: checkbox !important; opacity: 1 !important;
                               position: relative !important; pointer-events: auto !important;">
                        <span style="font-weight: 600; color: #555;">Debug Mode (highlight instead of remove)</span>
                    </label>
                </div>

                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button id="cancel-btn" style="padding: 10px 20px; border: 1px solid #ccc;
                            background: white; border-radius: 4px; cursor: pointer; font-size: 14px;">
                        Cancel
                    </button>
                    <button id="save-btn" style="padding: 10px 20px; border: none;
                            background: #0a66c2; color: white; border-radius: 4px; cursor: pointer;
                            font-size: 14px; font-weight: 600;">
                        Save & Apply
                    </button>
                </div>
            </div>
            <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                        background: rgba(0,0,0,0.5); z-index: 9999;"></div>
        `;

        document.body.appendChild(dialog);

        // Event listeners
        document.getElementById('cancel-btn').addEventListener('click', () => {
            dialog.remove();
        });

        document.getElementById('save-btn').addEventListener('click', () => {
            const regexInput = document.getElementById('regex-input').value;
            const debugMode = document.getElementById('debug-mode').checked;

            // Parse regex list
            const regexList = regexInput
                .split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0);

            // Save settings
            settings = { regexList, debugMode };
            saveSettings(settings);
            compiledRegexList = parseRegexList(settings.regexList);

            console.log('[LinkedIn Element Filter] Settings saved:', settings);

            dialog.remove();

            // Reload the page
            window.location.reload();
        });

        // Close on overlay click
        // TODO - Fix this horrible thing that Claude made. Selecting by the background color? What???
        dialog.querySelector('div[style*="rgba(0,0,0,0.5)"]').addEventListener('click', () => {
            dialog.remove();
        });
    }

    // Register menu command to open settings
    GM_registerMenuCommand('Filter Settings', showSettingsDialog);

    // Run filter when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', filterElements);
    } else {
        filterElements();
    }

    // Watch for dynamically loaded articles
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
})();