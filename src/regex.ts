export interface RegexItem {
    allow: boolean,
    regex: RegExp
}

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function regexFromLiteralWord(word: string): RegExp {
    let regex_expr = escapeRegex(word);

    // Surround with \b to ensure word boundaries.
    // Only add \b at the beginning or end if it begins or ends with an alphanumeric character.

    if (/^[0-9a-zA-Z_]/.test(word)) {
        regex_expr = '\\b' + regex_expr;
    }
    if (/[0-9a-zA-Z_]$/.test(word)) {
        regex_expr = regex_expr + '\\b';
    }

    // Case insensitive, unicode
    const regex = new RegExp(regex_expr, 'iu');
    return regex;
}

// Convert string representations to actual RegExp objects
export function parseRegexList(filterPatterns: string): RegexItem[] {
    // Split the pattern into a list of strings.
    // Remove empty lines and comments.
    const regexStringArray = filterPatterns.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .filter(line => line[0] != '#');

    return regexStringArray.flatMap(str => {
        // If the string starts with !, allow it
        let allow = false;
        if (str.startsWith('!')) {
            allow = true;
            str = str.substring(1);
        }

        const match = str.match(/^\/(.+)\/([a-z]*)$/);

        const pattern = match[1];
        let flags = match[2];

        // If no unicode flags are set, add "u".
        // The user should almost always want this.
        if (!flags.includes('v') && !flags.includes('u')) {
            flags += 'u';
        }

        let regex: RegExp | null = null;

        if (match) {
            try {
                regex = new RegExp(pattern, flags);
            } catch (e) {
                console.error(e);

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
