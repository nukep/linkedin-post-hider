export function isElementPost(element: Element): boolean {
    return element.matches('[role="article"]');
}

export function isElementNews(element: Element): boolean {
    return element.matches('.news-module__storyline');
}

export function isElementAMatch(element: Element): boolean {
    return isElementPost(element) || isElementNews(element);
}

export function doesElementContainContentCredentials(element: Element): boolean {
    return element.querySelectorAll('#content-credentials').length > 0;
}

export function isElementSuggested(element: Element): boolean {
    // Get the elements that indicate why the post is on your feed, if any
    const elems = element.querySelectorAll('.update-components-header');

    for (const elem of elems) {
        if (elem.textContent.includes('Suggested')) {
            return true;
        }
    }
    return false;
}

export function queryAllElements(root: HTMLElement | null = null): NodeListOf<HTMLElement> {
    if (!root) {
        root = window.document.body;
    }
    return root.querySelectorAll('[role="article"],.news-module__storyline');
}

export function getElementText(element: Element): string {
    if (isElementNews(element)) {
        // LinkedIn News
        return element.textContent;
    }
    if (isElementPost(element)) {
        // Post

        // Concatenate all text in these elements.
        // It includes content in reposts.
        const elems = element.querySelectorAll('.break-words');
        let text = '';
        for (const elem of elems) {
            text += '\n';
            text += elem.textContent;
        }
        return text;
    }

    return '';
}