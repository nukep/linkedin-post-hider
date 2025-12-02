interface SocialMediaEntry {
    containsContentCredentials(): boolean;
    isSuggested(): boolean;
    getText(): string;
    getHTMLElement(): HTMLElement;
}
