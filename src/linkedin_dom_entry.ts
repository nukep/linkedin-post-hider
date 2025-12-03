export class LinkedInDomEntry implements SocialMediaEntry {
    private element: HTMLElement;

    constructor(element: HTMLElement) {
        this.element = element;
    }

    containsContentCredentials(): boolean {
        return this.element.querySelectorAll('#content-credentials').length > 0;
    }

    isSuggested(): boolean {
        // Get the elements that indicate why the post is on your feed, if any
        const elems = this.element.querySelectorAll('.update-components-header');

        for (const elem of elems) {
            if (elem.textContent.includes('Suggested')) {
                return true;
            }
        }
        return false;
    }

    getText(): string {
        if (isElementNews(this.element)) {
            // LinkedIn News
            return this.element.textContent;
        }
        if (isElementPost(this.element)) {
            // Post

            // Concatenate all text in these elements.
            // It includes content in reposts.
            const elems = this.element.querySelectorAll('.break-words');
            let text = '';

            // Just textContent or innerText isn't good enough,
            // because they ignore whitespace between adjacent elements within.

            for (const elem of elems) {
                text += '\n'
                text += getAllElementText(elem as HTMLElement)
            }
            return text;
        }

        return '';
    }

    getPostedByName(): string | null {
        if (isElementPost(this.element)) {
            // Post
            // Get the elements that indicate the poster, if any
            // This selector is a bit busy, unfortunately...
            const elems = this.element.querySelectorAll('.update-components-actor__meta .update-components-actor__title span.visually-hidden');

            // Just the first element
            // There are usually other elements, but they're not the name
            for (const elem of elems) {
                return elem.textContent.trim();
            }
        }
        return null;
    }

    getUpdateReason(): string | null {
        if (isElementPost(this.element)) {
            // Post
            // Get the elements that indicate why the post is on your feed, if any
            const elems = this.element.querySelectorAll('.update-components-header');

            let text = ''
            for (const elem of elems) {
                text += elem.textContent.trim();
            }
            if (text == '') {
                return null;
            }
            return text;
        }
        return null;
    }

    getReactedByName(): string | null {
        if (isElementPost(this.element)) {
            // Post
            // Get the elements that indicate why the post is on your feed, if any
            // From there, get hyperlinks to profiles
            const elems = this.element.querySelectorAll('.update-components-header a');

            // The first profile link with text in it is the reacter
            for (const elem of elems) {
                const a = elem as HTMLAnchorElement;
                const text = a.textContent.trim();
                if (text != '' && a.href.includes('/in/')) {
                    return text
                }
            }
        }
        return null;
    }

    getHTMLElement(): HTMLElement {
        return this.element;
    }
}

// Mostly written by ChatGPT
function getAllElementText(elem: HTMLElement): string {
    const parts = [];

    const walker = elem.ownerDocument.createTreeWalker(
        elem,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode(node) {
                const t = node.textContent.trim();
                return t ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
            }
        }
    );

    let n;
    while ((n = walker.nextNode())) {
        parts.push(n.textContent.trim());
    }

    return parts.join(' ')
}

export function isElementPost(element: Element): boolean {
    return element.matches('[role="article"]');
}

export function isElementNews(element: Element): boolean {
    return element.matches('.news-module__storyline');
}

export function isElementAMatch(element: Element): boolean {
    return isElementPost(element) || isElementNews(element);
}

export function queryAllElements(root: HTMLElement): NodeListOf<HTMLElement> {
    return root.querySelectorAll('[role="article"],.news-module__storyline');
}

export function queryAllEntries(root: HTMLElement): LinkedInDomEntry[] {
    const elements = queryAllElements(root);
    return Array.from(elements).map(element => new LinkedInDomEntry(element));
}
