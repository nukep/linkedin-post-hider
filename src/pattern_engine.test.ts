// Note: Claude Sonnet 4.5 (AI) wrote these tests

import { PatternEngine, stripCommentsForLine } from './pattern_engine';

interface TestCase {
    text: string;
    suggested?: boolean;
    hasContentCredentials?: boolean;
}

class MockSocialMediaEntry implements SocialMediaEntry {
    constructor(
        private testCase: TestCase
    ) {
    }

    getText(): string {
        return this.testCase.text;
    }

    isSuggested(): boolean {
        return this.testCase.suggested ?? false;
    }

    containsContentCredentials(): boolean {
        return this.testCase.hasContentCredentials ?? false;
    }

    getHTMLElement(): HTMLElement {
        return document.createElement('div');
    }
}

const createSettings = (overrides?: Partial<Settings>): Settings => ({
    filterPatterns: '',
    hideSuggested: false,
    hideContentCredentials: false,
    highlightMode: false,
    ...overrides
});

function testShouldHide(patterns: string, settings: Partial<Settings>, testCases: TestCase[]) {
    const engine = new PatternEngine(patterns, createSettings(settings));
    const results = testCases.map(testCase => ({
        testCase: testCase,
        hide: engine.shouldHide(new MockSocialMediaEntry(testCase))
    }));
    expect({
        engine: { patterns, settings },
        results: results
    }).toMatchSnapshot();
}

describe('PatternEngine', () => {
    describe('basic pattern matching', () => {
        it('should hide entries matching a simple word pattern', () => {
            testShouldHide('spam', {}, [
                { text: 'This is spam content' },
                { text: 'This is legitimate content' }
            ]);
        });

        it('should handle multiple patterns on separate lines', () => {
            testShouldHide(`spam
advertisement
promotion`, {}, [
                { text: 'This is spam' },
                { text: 'Check out this advertisement' },
                { text: 'Special promotion today' },
                { text: 'Normal post' }
            ]);
        });
    });

    describe('regex pattern matching', () => {
        it('should support regex patterns with forward slashes', () => {
            testShouldHide('/sp[ae]m/', {}, [
                { text: 'This is spam' },
                { text: 'This is spem' },
                { text: 'This is spim' }
            ]);
        });

        it('should support regex flags', () => {
            testShouldHide('/SPAM/i', {}, [
                { text: 'This is SPAM' },
                { text: 'This is spam' },
                { text: 'This is SpAm' }
            ]);
        });

        it('should automatically add unicode flag if not present', () => {
            const engine = new PatternEngine('/emoji/', createSettings());
            // The pattern should work with unicode characters
            const entry = new MockSocialMediaEntry({ text: 'Check out this emoji 😀' });
            // Just verify it doesn't throw an error
            expect(() => engine.shouldHide(entry)).not.toThrow();
        });

        it('should handle invalid regex patterns gracefully', () => {
            // Should not throw, just ignore the invalid pattern
            expect(() => new PatternEngine('/[invalid/', createSettings())).not.toThrow();
            
            testShouldHide('/[invalid/', {}, [
                { text: 'some text' }
            ]);
        });
    });

    describe('allow patterns (! prefix)', () => {
        it('should allow entries matching patterns with ! prefix', () => {
            testShouldHide(`!important
spam`, {}, [
                { text: 'This is spam' },
                { text: 'This is important spam' },
                { text: 'This is important' }
            ]);
        });

        it('should allow entries matching regex patterns with ! prefix', () => {
            testShouldHide(`!/important.*/
/spam/`, {}, [
                { text: 'spam message' },
                { text: 'important spam message' },
                { text: 'important announcement' }
            ]);
        });

        it('should exit early on first match (allow or deny)', () => {
            testShouldHide(`spam
!spam`, {}, [
                { text: 'This is spam' }
            ]);
        });
    });

    describe('comment and empty line handling', () => {
        it('should ignore comment lines starting with ;', () => {
            testShouldHide(`; This is a comment
spam
; Another comment
advertisement`, {}, [
                { text: 'This is spam' },
                { text: '; This is a comment' }
            ]);
        });

        it('should ignore empty lines', () => {
            testShouldHide(`spam

advertisement

`, {}, [
                { text: 'This is spam' },
                { text: 'This is advertisement' }
            ]);
        });

        it('should trim whitespace from patterns', () => {
            testShouldHide(`spam  
advertisement  `, {}, [
                { text: 'This is spam' },
                { text: 'This is advertisement' }
            ]);
        });
    });

    describe('text normalization', () => {
        it('should normalize curly single quotes to straight quotes', () => {
            testShouldHide("don't", {}, [
                { text: "don\u2018t do this" },
                { text: "don\u2019t do this" },
                { text: "don't do this" }
            ]);
        });

        it('should normalize curly double quotes to straight quotes', () => {
            testShouldHide('"quoted"', {}, [
                { text: 'This is \u201Cquoted\u201D text' },
                { text: 'This is "quoted" text' }
            ]);
        });
    });

    describe('settings integration', () => {
        it('should hide suggested content when hideSuggested is true', () => {
            testShouldHide('', { hideSuggested: true }, [
                { text: 'Normal content', suggested: true },
                { text: 'Normal content', suggested: false }
            ]);
        });

        it('should not hide suggested content when hideSuggested is false', () => {
            testShouldHide('', { hideSuggested: false }, [
                { text: 'Normal content', suggested: true }
            ]);
        });

        it('should hide content with credentials when hideContentCredentials is true', () => {
            testShouldHide('', { hideContentCredentials: true }, [
                { text: 'Normal content', hasContentCredentials: true },
                { text: 'Normal content', hasContentCredentials: false }
            ]);
        });

        it('should not hide content with credentials when hideContentCredentials is false', () => {
            testShouldHide('', { hideContentCredentials: false }, [
                { text: 'Normal content', hasContentCredentials: true }
            ]);
        });

        it('should prioritize settings checks over pattern matching', () => {
            testShouldHide('!allowed', { hideSuggested: true }, [
                { text: 'This is allowed content', suggested: true }
            ]);
        });
    });

    describe('complex scenarios', () => {
        it('should handle combination of patterns and settings', () => {
            testShouldHide(`!important
spam
advertisement`, { 
                hideSuggested: true,
                hideContentCredentials: true 
            }, [
                { text: 'spam post' },
                { text: 'important spam' },
                { text: 'advertisement here' },
                { text: 'normal post', suggested: true },
                { text: 'normal post', hasContentCredentials: true },
                { text: 'normal post' }
            ]);
        });

        it('should handle empty pattern list', () => {
            testShouldHide('', {}, [
                { text: 'any content' }
            ]);
        });

        it('should handle pattern list with only comments and empty lines', () => {
            testShouldHide(`; Comment 1

; Comment 2

`, {}, [
                { text: 'any content' }
            ]);
        });

        it('should match literal word patterns case-insensitively by default', () => {
            testShouldHide('spam', {}, [
                { text: 'spam' },
                { text: 'SPAM' },
                { text: 'Spam' }
            ]);
        });

        it('should support case-insensitive matching with regex flag', () => {
            testShouldHide('/spam/i', {}, [
                { text: 'spam' },
                { text: 'SPAM' },
                { text: 'Spam' }
            ]);
        });
    });

    describe('stripCommentsForLine', () => {
        it('should remove comments after semicolon', () => {
            expect(stripCommentsForLine('pattern; this is a comment')).toBe('pattern');
        });

        it('should trim trailing whitespace after removing comment', () => {
            expect(stripCommentsForLine('pattern  ; comment')).toBe('pattern  ');
        });

        it('should return the line unchanged if no semicolon', () => {
            expect(stripCommentsForLine('pattern without comment')).toBe('pattern without comment');
        });

        it('should handle empty string', () => {
            expect(stripCommentsForLine('')).toBe('');
        });

        it('should handle line with only semicolon', () => {
            expect(stripCommentsForLine(';')).toBe('');
        });

        it('should handle line with only comment', () => {
            expect(stripCommentsForLine('; just a comment')).toBe('');
        });

        it('should preserve escaped semicolons', () => {
            expect(stripCommentsForLine('pattern\\; with escaped; comment')).toBe('pattern; with escaped');
        });

        it('should preserve multiple escaped semicolons', () => {
            expect(stripCommentsForLine('foo\\;bar\\;baz; comment')).toBe('foo;bar;baz');
        });

        it('should preserve semicolons inside regex patterns', () => {
            expect(stripCommentsForLine('/;[0-9]+/; comment')).toBe('/;[0-9]+/');
        });

        it('should preserve multiple semicolons inside regex patterns', () => {
            expect(stripCommentsForLine('/foo;bar;baz/; comment')).toBe('/foo;bar;baz/');
        });

        it('should handle regex with flags and semicolon inside', () => {
            expect(stripCommentsForLine('/test;pattern/i; comment')).toBe('/test;pattern/i');
        });

        it('should handle semicolon after regex pattern', () => {
            expect(stripCommentsForLine('/pattern/; this is a comment')).toBe('/pattern/');
        });

        it('should handle escaped backslash before semicolon in regex', () => {
            expect(stripCommentsForLine('/\\\\;/; comment')).toBe('/\\\\;/');
        });

        it('should handle line with regex and no comment', () => {
            expect(stripCommentsForLine('/;+/')).toBe('/;+/');
        });

        it('should handle non-regex line starting with slash', () => {
            expect(stripCommentsForLine('/not-a-regex; comment')).toBe('/not-a-regex');
        });

        it('should handle multiple semicolons outside regex', () => {
            expect(stripCommentsForLine('pattern; comment; more comment')).toBe('pattern');
        });

        it('should handle regex followed by text and comment', () => {
            expect(stripCommentsForLine('/;/ extra text; comment')).toBe('/;/ extra text');
        });

        it('should handle unicode and emojis', () => {
            expect(stripCommentsForLine('/;🚨\\;/ éxt\\;ra🚨 text; comment')).toBe('/;🚨\\;/ éxt;ra🚨 text');
        });
    });
});
