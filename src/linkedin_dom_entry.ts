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
            for (const elem of elems) {
                text += '\n';
                text += elem.textContent;
            }
            return text;
        }

        return '';
    }

    getHTMLElement(): HTMLElement {
        return this.element;
    }
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
