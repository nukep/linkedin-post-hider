import { regexFromLiteralWord } from "./regex";

type Pattern =
    | { kind: 'allow'; value: Pattern }
    | { kind: 'regex'; value: RegExp }
    | { kind: 'block'; value: Pattern[] };

function checkForRegexEnd(line: string): number | null {
    if (line.startsWith('/')) {
        for (let i = 1; i < line.length; i++) {
            if (line[i] === '/' && line[i-1] != '\\') {
                return i;
            }
        }
    }

    return null;
}

export function stripCommentsForLine(line: string): string {
    // Remove anything after the semicolon ";" symbol.
    // Exceptions are:
    // - If it's in a regular expression: e.g. /;[0-9]+/ or /foo;bar/
    // - If it's preceded by an escape character: \;

    const regexEnd = checkForRegexEnd(line);

    let indicesToRemove: Set<number> = new Set();

    let chars = Array.from(line);

    for (let i = 0; i < chars.length; i++) {
        if (regexEnd !== null && i < regexEnd) {
            continue;
        }

        if (chars[i] !== ';') {
            continue;
        }

        if (chars[i-1] == '\\') {
            indicesToRemove.add(i-1);
            continue;
        }

        chars = chars.slice(0, i);
        break;
    }

    if (indicesToRemove.size > 0) {
        // Go ahead and remove the escape characters at the indices
        chars = chars.filter((_, i) => !indicesToRemove.has(i));
    }

    return chars.join('');
}

// Convert string representations to Pattern objects
function parseRegexList(filterPatterns: string): Pattern {
    // Split the pattern into a list of strings.
    // Remove empty lines and comments.
    const regexStringArray = filterPatterns.split('\n')
        .map(line => line.trimEnd())
        .filter(line => line.length > 0)
        .filter(line => stripCommentsForLine(line))
        .map(line => line.trimEnd());

    let list: Pattern[] = [];

    for (let str of regexStringArray) {
        // If the string starts with !, allow it
        let allow = false;
        if (str.startsWith('!')) {
            allow = true;
            str = str.substring(1);
        }

        const match = str.match(/^\/(.+)\/([a-z]*)$/);

        let regex: RegExp | null = null;

        if (match) {
            const pattern = match[1];
            let flags = match[2];

            // If no unicode flags are set, add "u".
            // The user should almost always want this.
            if (!flags.includes('v') && !flags.includes('u')) {
                flags += 'u';
            }

            try {
                regex = new RegExp(pattern, flags);
            } catch (e) {
                // There was a problem making the regex. Ignore that particular pattern.
                regex = null;
            }
        } else {
            // If not in /pattern/flags format, treat as literal word
            regex = regexFromLiteralWord(str);
        }

        if (regex) {
            const regexPattern: Pattern = { kind: 'regex', value: regex };
            if (allow) {
                list.push({ kind: 'allow', value: regexPattern });
            } else {
                list.push(regexPattern);
            }
        }
    }

    return { kind: 'block', value: list };
}

function normalizeText(text: string): string {
    // Replace single quote variants
    text = text.replaceAll('\u2018', '\'');
    text = text.replaceAll('\u2019', '\'');

    // Replace double quote variants
    text = text.replaceAll('\u201C', '"');
    text = text.replaceAll('\u201D', '"');

    return text;
}

export class PatternEngine {
    private root_pattern: Pattern;
    private settings: Settings;

    constructor(filterPatterns: string, settings: Settings) {
        this.root_pattern = parseRegexList(filterPatterns);
        this.settings = settings;
    }

    // Returns a ternary value:
    // - true: Explicitly hide
    // - false: Explicitly show
    // - null: Inconclusive
    private evaluatePattern(pattern: Pattern, text: string): boolean | null {
        if (pattern.kind == 'regex') {
            // Explicitly hide, or inconclusive
            return pattern.value.test(text) ? true : null;
        } else if (pattern.kind == 'allow') {
            // Explicitly don't hide, or inconclusive
            const allowResult = this.evaluatePattern(pattern.value, text);
            return allowResult ? false : null;
        } else if (pattern.kind == 'block') {
            for (const p of pattern.value) {
                const result = this.evaluatePattern(p, text);
                if (result !== null) {
                    return result;
                }
            }
            return false;
        }
    }

    // Function to check if an entry should be hidden
    shouldHide(element: SocialMediaEntry): boolean {
        if (this.settings.hideContentCredentials) {
            if (element.containsContentCredentials()) {
                return true;
            }
        }
    
        if (this.settings.hideSuggested) {
            if (element.isSuggested()) {
                return true;
            }
        }
    
        let text = element.getText();
        text = normalizeText(text);
        const result = this.evaluatePattern(this.root_pattern, text);

        // If the result is inconclusive, then don't hide
        if (result === null) {
            return false;
        }
        return result;
    }
}
