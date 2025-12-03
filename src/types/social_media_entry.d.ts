interface SocialMediaEntry {
    containsContentCredentials(): boolean;
    isSuggested(): boolean;
    getText(): string;
    getReactedByName(): string | null;
    getHTMLElement(): HTMLElement;
}
