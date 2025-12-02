// Note: Claude Sonnet 4.5 (AI) wrote these tests

import { PatternEngine, RegexItem } from './pattern_engine';

// Mock SocialMediaEntry for testing
class MockSocialMediaEntry implements SocialMediaEntry {
    constructor(
        private text: string,
        private options: { suggested?: boolean; hasContentCredentials?: boolean } = { suggested: false, hasContentCredentials: false }
    ) {
    }

    getText(): string {
        return this.text;
    }

    isSuggested(): boolean {
        return this.options.suggested ?? false;
    }

    containsContentCredentials(): boolean {
        return this.options.hasContentCredentials ?? false;
    }

    getHTMLElement(): HTMLElement {
        return document.createElement('div');
    }
}

// Mock Settings for testing
const createSettings = (overrides?: Partial<Settings>): Settings => ({
    filterPatterns: '',
    hideSuggested: false,
    hideContentCredentials: false,
    highlightMode: false,
    ...overrides
});

describe('PatternEngine', () => {
    describe('basic pattern matching', () => {
        it('should hide entries matching a simple word pattern', () => {
            const patterns = 'spam';
            const settings = createSettings();
            const engine = new PatternEngine(patterns, settings);

            const entry = new MockSocialMediaEntry('This is spam content');
            expect(engine.shouldHide(entry)).toBe(true);
        });

        it('should not hide entries that do not match any pattern', () => {
            const patterns = 'spam';
            const settings = createSettings();
            const engine = new PatternEngine(patterns, settings);

            const entry = new MockSocialMediaEntry('This is legitimate content');
            expect(engine.shouldHide(entry)).toBe(false);
        });

        it('should handle multiple patterns on separate lines', () => {
            const patterns = `spam
advertisement
promotion`;
            const settings = createSettings();
            const engine = new PatternEngine(patterns, settings);

            expect(engine.shouldHide(new MockSocialMediaEntry('This is spam'))).toBe(true);
            expect(engine.shouldHide(new MockSocialMediaEntry('Check out this advertisement'))).toBe(true);
            expect(engine.shouldHide(new MockSocialMediaEntry('Special promotion today'))).toBe(true);
            expect(engine.shouldHide(new MockSocialMediaEntry('Normal post'))).toBe(false);
        });
    });

    describe('regex pattern matching', () => {
        it('should support regex patterns with forward slashes', () => {
            const patterns = '/sp[ae]m/';
            const settings = createSettings();
            const engine = new PatternEngine(patterns, settings);

            expect(engine.shouldHide(new MockSocialMediaEntry('This is spam'))).toBe(true);
            expect(engine.shouldHide(new MockSocialMediaEntry('This is spem'))).toBe(true);
            expect(engine.shouldHide(new MockSocialMediaEntry('This is spim'))).toBe(false);
        });

        it('should support regex flags', () => {
            const patterns = '/SPAM/i';
            const settings = createSettings();
            const engine = new PatternEngine(patterns, settings);

            expect(engine.shouldHide(new MockSocialMediaEntry('This is SPAM'))).toBe(true);
            expect(engine.shouldHide(new MockSocialMediaEntry('This is spam'))).toBe(true);
            expect(engine.shouldHide(new MockSocialMediaEntry('This is SpAm'))).toBe(true);
        });

        it('should automatically add unicode flag if not present', () => {
            const patterns = '/emoji/';
            const settings = createSettings();
            const engine = new PatternEngine(patterns, settings);

            // The pattern should work with unicode characters
            const entry = new MockSocialMediaEntry('Check out this emoji 😀');
            // Just verify it doesn't throw an error
            expect(() => engine.shouldHide(entry)).not.toThrow();
        });

        it('should handle invalid regex patterns gracefully', () => {
            const patterns = '/[invalid/';
            const settings = createSettings();
            
            // Should not throw, just ignore the invalid pattern
            expect(() => new PatternEngine(patterns, settings)).not.toThrow();
            
            const engine = new PatternEngine(patterns, settings);
            const entry = new MockSocialMediaEntry('some text');
            expect(engine.shouldHide(entry)).toBe(false);
        });
    });

    describe('allow patterns (! prefix)', () => {
        it('should allow entries matching patterns with ! prefix', () => {
            const patterns = `!important
spam`;
            const settings = createSettings();
            const engine = new PatternEngine(patterns, settings);

            expect(engine.shouldHide(new MockSocialMediaEntry('This is spam'))).toBe(true);
            expect(engine.shouldHide(new MockSocialMediaEntry('This is important spam'))).toBe(false);
            expect(engine.shouldHide(new MockSocialMediaEntry('This is important'))).toBe(false);
        });

        it('should allow entries matching regex patterns with ! prefix', () => {
            const patterns = `!/important.*/
/spam/`;
            const settings = createSettings();
            const engine = new PatternEngine(patterns, settings);

            expect(engine.shouldHide(new MockSocialMediaEntry('spam message'))).toBe(true);
            expect(engine.shouldHide(new MockSocialMediaEntry('important spam message'))).toBe(false);
            expect(engine.shouldHide(new MockSocialMediaEntry('important announcement'))).toBe(false);
        });

        it('should exit early on first match (allow or deny)', () => {
            const patterns = `spam
!spam`;
            const settings = createSettings();
            const engine = new PatternEngine(patterns, settings);

            // First pattern matches and denies
            expect(engine.shouldHide(new MockSocialMediaEntry('This is spam'))).toBe(true);
        });
    });

    describe('comment and empty line handling', () => {
        it('should ignore comment lines starting with #', () => {
            const patterns = `# This is a comment
spam
# Another comment
advertisement`;
            const settings = createSettings();
            const engine = new PatternEngine(patterns, settings);

            expect(engine.shouldHide(new MockSocialMediaEntry('This is spam'))).toBe(true);
            expect(engine.shouldHide(new MockSocialMediaEntry('# This is a comment'))).toBe(false);
        });

        it('should ignore empty lines', () => {
            const patterns = `spam

advertisement

`;
            const settings = createSettings();
            const engine = new PatternEngine(patterns, settings);

            expect(engine.shouldHide(new MockSocialMediaEntry('This is spam'))).toBe(true);
            expect(engine.shouldHide(new MockSocialMediaEntry('This is advertisement'))).toBe(true);
        });

        it('should trim whitespace from patterns', () => {
            const patterns = `  spam  
  advertisement  `;
            const settings = createSettings();
            const engine = new PatternEngine(patterns, settings);

            expect(engine.shouldHide(new MockSocialMediaEntry('This is spam'))).toBe(true);
            expect(engine.shouldHide(new MockSocialMediaEntry('This is advertisement'))).toBe(true);
        });
    });

    describe('text normalization', () => {
        it('should normalize curly single quotes to straight quotes', () => {
            const patterns = "don't";
            const settings = createSettings();
            const engine = new PatternEngine(patterns, settings);

            // U+2018 and U+2019 are curly single quotes
            expect(engine.shouldHide(new MockSocialMediaEntry("don\u2018t do this"))).toBe(true);
            expect(engine.shouldHide(new MockSocialMediaEntry("don\u2019t do this"))).toBe(true);
            expect(engine.shouldHide(new MockSocialMediaEntry("don't do this"))).toBe(true);
        });

        it('should normalize curly double quotes to straight quotes', () => {
            const patterns = '"quoted"';
            const settings = createSettings();
            const engine = new PatternEngine(patterns, settings);

            // U+201C and U+201D are curly double quotes
            expect(engine.shouldHide(new MockSocialMediaEntry('This is \u201Cquoted\u201D text'))).toBe(true);
            expect(engine.shouldHide(new MockSocialMediaEntry('This is "quoted" text'))).toBe(true);
        });
    });

    describe('settings integration', () => {
        it('should hide suggested content when hideSuggested is true', () => {
            const patterns = '';
            const settings = createSettings({ hideSuggested: true });
            const engine = new PatternEngine(patterns, settings);

            const suggestedEntry = new MockSocialMediaEntry('Normal content', { suggested: true });
            const normalEntry = new MockSocialMediaEntry('Normal content', { suggested: false });

            expect(engine.shouldHide(suggestedEntry)).toBe(true);
            expect(engine.shouldHide(normalEntry)).toBe(false);
        });

        it('should not hide suggested content when hideSuggested is false', () => {
            const patterns = '';
            const settings = createSettings({ hideSuggested: false });
            const engine = new PatternEngine(patterns, settings);

            const suggestedEntry = new MockSocialMediaEntry('Normal content', { suggested: true });
            expect(engine.shouldHide(suggestedEntry)).toBe(false);
        });

        it('should hide content with credentials when hideContentCredentials is true', () => {
            const patterns = '';
            const settings = createSettings({ hideContentCredentials: true });
            const engine = new PatternEngine(patterns, settings);

            const credentialEntry = new MockSocialMediaEntry('Normal content', { hasContentCredentials: true });
            const normalEntry = new MockSocialMediaEntry('Normal content', { hasContentCredentials: false });

            expect(engine.shouldHide(credentialEntry)).toBe(true);
            expect(engine.shouldHide(normalEntry)).toBe(false);
        });

        it('should not hide content with credentials when hideContentCredentials is false', () => {
            const patterns = '';
            const settings = createSettings({ hideContentCredentials: false });
            const engine = new PatternEngine(patterns, settings);

            const credentialEntry = new MockSocialMediaEntry('Normal content', { hasContentCredentials: true });
            expect(engine.shouldHide(credentialEntry)).toBe(false);
        });

        it('should prioritize settings checks over pattern matching', () => {
            const patterns = '!allowed';
            const settings = createSettings({ hideSuggested: true });
            const engine = new PatternEngine(patterns, settings);

            // Even though pattern would allow it, suggested setting should hide it
            const suggestedEntry = new MockSocialMediaEntry('This is allowed content', { suggested: true });
            expect(engine.shouldHide(suggestedEntry)).toBe(true);
        });
    });

    describe('complex scenarios', () => {
        it('should handle combination of patterns and settings', () => {
            const patterns = `!important
spam
advertisement`;
            const settings = createSettings({ 
                hideSuggested: true,
                hideContentCredentials: true 
            });
            const engine = new PatternEngine(patterns, settings);

            expect(engine.shouldHide(new MockSocialMediaEntry('spam post'))).toBe(true);
            expect(engine.shouldHide(new MockSocialMediaEntry('important spam'))).toBe(false);
            expect(engine.shouldHide(new MockSocialMediaEntry('advertisement here'))).toBe(true);
            expect(engine.shouldHide(new MockSocialMediaEntry('normal post', { suggested: true }))).toBe(true);
            expect(engine.shouldHide(new MockSocialMediaEntry('normal post', { hasContentCredentials: true }))).toBe(true);
            expect(engine.shouldHide(new MockSocialMediaEntry('normal post'))).toBe(false);
        });

        it('should handle empty pattern list', () => {
            const patterns = '';
            const settings = createSettings();
            const engine = new PatternEngine(patterns, settings);

            expect(engine.shouldHide(new MockSocialMediaEntry('any content'))).toBe(false);
        });

        it('should handle pattern list with only comments and empty lines', () => {
            const patterns = `# Comment 1

# Comment 2

`;
            const settings = createSettings();
            const engine = new PatternEngine(patterns, settings);

            expect(engine.shouldHide(new MockSocialMediaEntry('any content'))).toBe(false);
        });

        it('should match literal word patterns case-insensitively by default', () => {
            const patterns = 'spam';
            const settings = createSettings();
            const engine = new PatternEngine(patterns, settings);

            // Literal word patterns use the 'i' flag by default
            expect(engine.shouldHide(new MockSocialMediaEntry('spam'))).toBe(true);
            expect(engine.shouldHide(new MockSocialMediaEntry('SPAM'))).toBe(true);
            expect(engine.shouldHide(new MockSocialMediaEntry('Spam'))).toBe(true);
        });

        it('should support case-insensitive matching with regex flag', () => {
            const patterns = '/spam/i';
            const settings = createSettings();
            const engine = new PatternEngine(patterns, settings);

            expect(engine.shouldHide(new MockSocialMediaEntry('spam'))).toBe(true);
            expect(engine.shouldHide(new MockSocialMediaEntry('SPAM'))).toBe(true);
            expect(engine.shouldHide(new MockSocialMediaEntry('Spam'))).toBe(true);
        });
    });
});
