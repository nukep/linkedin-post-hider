interface TextAreaSectionParams {
    labelText: string;
    placeholderText: string;
    hintText: string;
    text: string;
}

interface CheckBoxSectionParams {
    checked: boolean;
    labelText: string;
    hintText: string;
}

interface DialogParams {
    settings: Settings;
    applySettings: (settings: Settings) => void;
}

function createTextAreaSection({
    labelText,
    placeholderText,
    hintText,
    text
}: TextAreaSectionParams): [HTMLElement, () => string] {
    const section = document.createElement('div');
    section.className = '_nospam_ext_section';

    const label = document.createElement('label');
    label.className = '_nospam_ext_label';
    label.textContent = labelText;

    const textarea = document.createElement('textarea');
    textarea.className = '_nospam_ext_textarea';
    textarea.placeholder = placeholderText;
    textarea.textContent = text;

    section.appendChild(label);
    section.appendChild(textarea);

    for (const hintLine of hintText.split('\n')) {
        const hint = document.createElement('small');
        hint.className = '_nospam_ext_hint';
        hint.textContent = hintLine;
        section.appendChild(hint);
    }

    const getValue = () => {
        return textarea.value;
    };

    return [section, getValue];
}

function createCheckBoxSection({
    checked,
    labelText,
    hintText
}: CheckBoxSectionParams): [HTMLElement, () => boolean] {
    const section = document.createElement('div');
    section.className = '_nospam_ext_section';

    const label = document.createElement('label');
    label.className = '_nospam_ext_checkbox_label';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.className = '_nospam_ext_checkbox';
    input.checked = checked;

    const span = document.createElement('span');
    span.className = '_nospam_ext_checkbox_text';
    span.textContent = labelText;

    label.appendChild(input);
    label.appendChild(span);
    section.appendChild(label);

    for (const hintLine of hintText.split('\n')) {
        const hint = document.createElement('small');
        hint.className = '_nospam_ext_hint';
        hint.textContent = hintLine;
        section.appendChild(hint);
    }

    const getValue = () => {
        return input.checked;
    };

    return [section, getValue];
}

const STYLESHEET = `

/* All your prefixed classes */
._nospam_ext_modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    padding: 25px;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    z-index: 10000;
    max-width: 500px;
    width: 90%;
}

._nospam_ext_title {
    margin: 0 0 20px 0;
    color: #333;
    font-size: 20px;
}

._nospam_ext_section {
    margin-bottom: 20px;
}

._nospam_ext_label {
    display: block;
    margin-bottom: 8px;
    font-weight: 600;
    color: #555;
}

._nospam_ext_textarea {
    width: 100%;
    height: 150px;
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-family: monospace;
    font-size: 13px;
    box-sizing: border-box;
    resize: vertical;
}

._nospam_ext_hint {
    color: #666;
    display: block;
    margin-top: 5px;
}

._nospam_ext_checkbox_label {
    display: flex;
    align-items: center;
    cursor: pointer;
    user-select: none;
}

._nospam_ext_checkbox {
    margin-right: 8px;
    width: 18px;
    height: 18px;
    cursor: pointer;
    appearance: auto !important;
    -webkit-appearance: checkbox !important;
    -moz-appearance: checkbox !important;
    opacity: 1 !important;
    position: relative !important;
    pointer-events: auto !important;
}

._nospam_ext_checkbox_text {
    font-weight: 600;
    color: #555;
}

._nospam_ext_button_row {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
}

._nospam_ext_btn_cancel {
    padding: 10px 20px;
    border: 1px solid #ccc;
    background: white;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
}

._nospam_ext_btn_save {
    padding: 10px 20px;
    border: none;
    background: #0a66c2;
    color: white;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
}

._nospam_ext_overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
    z-index: 9999;
}
`;

// Create settings UI
export function createDialogShadowDom({ settings, applySettings }: DialogParams): HTMLElement {
    // Create host element
    const host = document.createElement('div');
    host.id = 'linkedin-filter-shadow-host';

    // Attach shadow DOM
    const shadow = host.attachShadow({ mode: 'open' });

    // Add CSS inside shadow
    const style = document.createElement('style');
    style.textContent = STYLESHEET;

    // Add the HTML for the UI
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
<div class="_nospam_ext_modal">
    <h2 class="_nospam_ext_title">LinkedIn Post Filter Settings</h2>

    <div id="sections"></div>

    <div class="_nospam_ext_button_row">
        <button id="cancel-btn" class="_nospam_ext_btn_cancel">Cancel</button>
        <button id="save-btn" class="_nospam_ext_btn_save">Save & Apply</button>
    </div>

</div>

<div class="_nospam_ext_overlay" id="modal-bg-overlay"></div>
`;

    // Insert CSS + HTML into shadow
    shadow.append(style, wrapper);

    const sections = wrapper.querySelector('#sections')!;

    const [regex_input_section, get_regex_text] = createTextAreaSection({
        labelText: 'Filter Patterns (one per line):',
        placeholderText: 'AI\n/\\bsynerg(y|ize|ise)/i\nhustle\nhack:',
        hintText: 'Use /pattern/flags format (e.g., /\\bfoo.*?bar\\b/i) or plain text.\n' +
            'Start with ! to explicitly allow post and to ignore future patterns.\n' +
            'Patterns are evaluated first to last.',
        text: settings.regexList.join('\n')
    })

    const [hide_content_credentials, get_hide_content_credentials] = createCheckBoxSection({
        labelText: 'Hide Content Credentials',
        hintText: 'Usually includes posts with AI generated content, but not necessarily',
        checked: settings.hideContentCredentials
    })

    const [highlight_mode_section, get_highlight_mode] = createCheckBoxSection({
        labelText: 'Highlight Mode',
        hintText: 'Highlights posts instead of removing them',
        checked: settings.highlightMode
    })

    sections.appendChild(regex_input_section);
    sections.appendChild(hide_content_credentials);
    sections.appendChild(highlight_mode_section);

    const save_btn_elem         = wrapper.querySelector('#save-btn')!;
    const cancel_btn_elem       = wrapper.querySelector('#cancel-btn')!;
    const model_bg_overlay_elem = wrapper.querySelector('#modal-bg-overlay')!;

    // Remove the dialog on cancel or overlay click

    cancel_btn_elem.addEventListener('click', () => {
        host.remove();
    });
    model_bg_overlay_elem.addEventListener('click', () => {
        host.remove();
    });

    save_btn_elem.addEventListener('click', () => {
        const regexInput = get_regex_text();
        const hideContentCredentials = get_hide_content_credentials();
        const highlightMode = get_highlight_mode();

        // Parse regex list
        const regexList = regexInput
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);

        // Apply settings
        applySettings({ regexList, hideContentCredentials, highlightMode });

        host.remove();
    });

    // Insert CSS + HTML into shadow
    shadow.append(style, wrapper);

    return host;
}