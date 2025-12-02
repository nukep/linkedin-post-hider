import { regexFromLiteralWord } from "./regex";

export interface RegexItem {
    allow: boolean,
    regex: RegExp
}

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

    for (let i = 0; i < line.length; i++) {
        if (line[i] !== ';') {
            continue;
        }

        if (line[i-1] == '\\') {
            continue;
        }

        if (regexEnd !== null && i < regexEnd) {
            continue;
        }

        return line.slice(0, i).trimEnd();
    }

    return line;
}

// Convert string representations to actual RegExp objects
function parseRegexList(filterPatterns: string): RegexItem[] {
    // Split the pattern into a list of strings.
    // Remove empty lines and comments.
    const regexStringArray = filterPatterns.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .filter(line => stripCommentsForLine(line));

    return regexStringArray.flatMap(str => {
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
            return [
                { allow, regex }
            ];
        } else {
            return [];
        }
    });
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
    private regexItems: RegexItem[];
    private settings: Settings;

    constructor(filterPatterns: string, settings: Settings) {
        this.regexItems = parseRegexList(filterPatterns);
        this.settings = settings;
    }

    // Function to check if an entry should be hidden
    shouldHide(element: SocialMediaEntry) {
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
        for (const { allow, regex } of this.regexItems) {
            if (regex.test(text)) {
                // Exit early on both explicit "allow" and "deny".
                return !allow;
            }
        }
        return false;
    }
}
