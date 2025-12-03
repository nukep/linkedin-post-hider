interface SocialMediaEntry {
    containsContentCredentials(): boolean;
    isSuggested(): boolean;
    getText(): string;
    getUpdateReason(): string | null;
    getPostedByName(): string | null;
    getReactedByName(): string | null;
    getHTMLElement(): HTMLElement;
}
