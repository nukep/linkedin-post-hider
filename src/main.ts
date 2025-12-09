import { createDialogShadowDom } from './settings_dialog'
import { loadSettings, saveSettings, SettingsMigrationError } from './settings';
import { PatternEngine } from './pattern_engine';
import { isElementAMatch, queryAllEntries } from './linkedin_dom_entry';

const HIGHLIGHT_HIDE_BG_COLOR = '#7742e0';
const HIGHLIGHT_HIDE_FG_COLOR = '#ffffff';
const HIGHLIGHT_SHOW_BG_COLOR = '#158c31';
const HIGHLIGHT_SHOW_FG_COLOR = '#ffffff';

function runFilterOnUrl(url) {
    return !url.includes('/feed/update/');
}

function loadSettingsAppSafe(): Settings {
    try {
        const settings = loadSettings();
        return settings;
    } catch (err) {
        if (err instanceof SettingsMigrationError) {
            const WARNING_ELEMENT_ID = '__linked_post_hider_updated';
            if (!document.getElementById(WARNING_ELEMENT_ID)) {
                const warningNode = document.createElement('div');
                warningNode.id = WARNING_ELEMENT_ID;
                warningNode.textContent = 'LinkedIn Post Hider was updated. Please refresh this page!'
                warningNode.style.backgroundColor = '#c22';
                warningNode.style.color = 'white';
                warningNode.style.position = 'sticky';
                warningNode.style.top = '0';
                warningNode.style.left = '0';
                warningNode.style.right = '0';
                warningNode.style.textAlign = 'center';
                warningNode.style.padding = '1em';
                warningNode.style.zIndex = '1000';

                document.body.prepend(warningNode);
            }
        }
        throw err;
    }
}

function buildGetPatternEngine(): () => PatternEngine {
    let lastFilterPatterns = '';
    let lastResult: PatternEngine | null = null;

    return () => {
        const settings = loadSettingsAppSafe();
        const filterPatterns = settings.filterPatterns;
        if (lastFilterPatterns != filterPatterns) {
            lastFilterPatterns = filterPatterns;
            lastResult = new PatternEngine(filterPatterns, settings);
        }
        return lastResult;
    };
}

const getPatternEngine = buildGetPatternEngine();

// Function to remove matching posts and other elements
function filterElements() {
    const entries = queryAllEntries(document.body);
    let processed = 0;

    const settings = loadSettingsAppSafe();
    const highlightMode = settings.highlightMode;
    const patternEngine = getPatternEngine();

    entries.forEach(entry => {
        const result = patternEngine.showOrHide(entry);
        const element = entry.getHTMLElement();

        if (highlightMode) {
            if (result.kind == 'hide') {
                if (!element.dataset.filtered) {
                    const reason = result.reason;
                    const highlightNode = document.createElement('div');
                    highlightNode.textContent = `Hidden: ${reason}`;
                    highlightNode.style.color = HIGHLIGHT_HIDE_FG_COLOR;
                    highlightNode.style.backgroundColor = HIGHLIGHT_HIDE_BG_COLOR;
                    highlightNode.style.textAlign = 'center';
                    element.prepend(highlightNode);

                    element.style.setProperty('border', `${HIGHLIGHT_HIDE_BG_COLOR} 5px solid`, 'important');

                    element.dataset.filtered = 'true';
                    processed++;
                }
            }
        } else {
            if (result.kind == 'hide') {
                // Normal mode: remove the element
                element.remove();
                processed++;
            }
        }

        if (result.kind == 'show') {
            if (!element.dataset.filtered) {
                const reason = result.reason;
                const highlightNode = document.createElement('div');
                highlightNode.textContent = `Show: ${reason}`;
                highlightNode.style.color = HIGHLIGHT_SHOW_FG_COLOR;
                highlightNode.style.backgroundColor = HIGHLIGHT_SHOW_BG_COLOR;
                highlightNode.style.textAlign = 'center';
                element.prepend(highlightNode);

                element.style.setProperty('border', `${HIGHLIGHT_SHOW_BG_COLOR} 5px solid`, 'important');

                element.dataset.filtered = 'true';
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
        settings: loadSettingsAppSafe(),
        applySettings: applySettings
    });
    document.body.appendChild(dialogHost);
}

function injectSettingsButton(globalNavElement: HTMLElement) {
    // This approach is quite fragile, especially if the LinkedIn layout changes.
    // Let's just hope that doesn't happen too often!

    const svg_path = 'm12.017 2.2287c-6.1373 0.016608-9.2263 4.4931-9.0819 8.8095 0.041258 0.78231 0.26188 1.8532 0.54441 2.6419 0.16618 0.46392 0.21569 0.96385 0.17314 1.7506-0.038351 0.6274 0.067438 1.3978 0.89549 1.4209 0.21579 5.41e-4 0.44613-0.0145 0.51178-0.03357 0.095473-0.02773 0.1226 0.06087 0.13598 0.44277 0.02043 0.58375 0.16751 1.6579 0.27524 2.0106 0.091968 0.30108 0.40914 0.49704 0.79821 0.49328 0.56123-0.0054 0.81368-0.45338 0.85011-1.5092 0.028408-0.82392 0.094505-1.0344 0.32465-1.0344 0.24144 0 0.45456 0.3551 0.56058 0.93404 0.27668 1.5109 0.86142 1.9895 2.111 1.728 0.30469-0.06375 0.56358-0.11578 0.57534-0.11578 0.0117 0 0.01624 0.51025 0.0099 1.1339-0.0061 0.62364 0.01049 1.2234 0.03726 1.3328 0.10282 0.41959 0.2335 0.6314 0.43671 0.7076 0.237 0.08886 0.76572 0.03489 0.98812-0.10086 0.23312-0.14229 0.45207-0.55471 0.50696-0.95517 0.0278-0.20298 0.0068-0.86371-0.04681-1.4683-0.08422-0.95045-0.08128-1.1381 0.02205-1.3855 0.15928-0.38121 0.38929-0.50298 0.70386-0.37268 0.32777 0.13577 0.39032 0.35913 0.37424 1.3376-0.01772 1.079 0.51208 1.6229 1.0795 1.6287 0.52754 0.04745 0.85294-0.2948 0.82198-1.5684-0.01197-0.45819 0.0047-0.85988 0.03761-0.8927 0.03267-0.03282 0.25652 0.0073 0.49732 0.08921 1.3615 0.26787 1.5672-0.49764 1.8578-1.6994 0.0802-0.58058 0.27219-1.0152 0.41076-0.92953 0.16091 0.09944 0.23103 0.65671 0.18463 1.4677-0.02895 0.52189-0.09344 1.501 0.83271 1.6171 0.7618 0 0.93304-0.34824 1.0086-2.0507 0.05864-1.3216 0.35596-3.1278 0.67014-4.072 0.31846-0.95708 0.367-1.3176 0.36258-2.6916-0.034783-4.688-3.3327-8.6829-9.4701-8.6663zm-2.6526 4.76a1.3105 1.368 0 0 1 1.3106 1.3681 1.3105 1.368 0 0 1-1.3106 1.368 1.3105 1.368 0 0 1-1.3106-1.368 1.3105 1.368 0 0 1 1.3106-1.3681zm5.9739 0.94289a1.3105 1.368 0 0 1 1.3106 1.3681 1.3105 1.368 0 0 1-1.3106 1.368 1.3105 1.368 0 0 1-1.3105-1.368 1.3105 1.368 0 0 1 1.3105-1.3681zm-6.6164 4.3721c0.1548 0.0109 0.36462 0.10343 0.633 0.27772 1.2377 0.80384 2.3238 1.1643 3.4803 1.1552 0.87432-0.0069 1.5177-0.15718 2.4019-0.56135 0.7255-0.33164 1.0197-0.31969 1.0197 0.04119 0 0.26562-0.46172 0.74073-1.114 1.1463-0.55242 0.3435-0.78026 0.43305-1.4721 0.57876-0.68169 0.14357-1.2689 0.1425-1.9495-0.0036-1.0807-0.23197-1.8731-0.654-2.7089-1.4424-0.5708-0.53847-0.67757-0.71475-0.59336-0.98004 0.048231-0.152 0.1481-0.22273 0.3029-0.21183z';

    const html = `
    <a class="global-nav__primary-link global-nav__primary-item--divider pl3">
      <div class="global-nav__primary-link-notif artdeco-notification-badge ember-view">  
        <div class="ivm-image-view-model global-nav__icon-ivm">
          <div class="ivm-view-attr__img-wrapper">
            <li-icon aria-hidden="true" type="bell-fill" class="ivm-view-attr__icon" size="large">
            </li-icon>
          </div>
        </div>
      </div>
      <span class="t-12 break-words block t-black--light t-normal global-nav__primary-link-text" title="Post Hider Settings">
        Hider Settings
      </span>
    </a>
`;

    const item = document.createElement('li');
    item.className = 'global-nav__primary-item'
    item.innerHTML = html;

    const icon = item.querySelector('li-icon');
    
    // Create SVG element programmatically
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('data-supported-dps', '24x24');
    svg.setAttribute('fill', 'currentColor');
    svg.setAttribute('class', 'mercado-match');
    svg.setAttribute('width', '24');
    svg.setAttribute('height', '24');
    svg.setAttribute('focusable', 'false');
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', svg_path);
    
    svg.appendChild(path);
    icon.appendChild(svg);

    const itemLink = item.querySelector('a');
    itemLink.addEventListener('click', () => showSettingsDialog());

    globalNavElement.appendChild(item);
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
                if (isElementAMatch(elem)) {
                    shouldFilter = true;
                    break;
                }

                // Inject the settings button once the primary navigation appears
                if (elem.matches('ul.global-nav__primary-items')) {
                    injectSettingsButton(elem);
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