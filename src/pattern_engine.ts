import { regexFromLiteralWord } from "./regex";
import { parseIndentedLinesIntoBlocks, Block } from "./block_parser";

type Pattern =
    | { kind: 'allow'; value: Pattern }
    | { kind: 'regex'; value: RegExp }
    // | { kind: 'posted_by_name'; value: RegExp }
    | { kind: 'reacted_by_name'; value: RegExp }
    | { kind: 'block'; value: Pattern[] };

enum EvalResult {
    Match,
    Unmatch,
    Inconclusive
}

function assertUnreachable(value: never): never {
  throw new Error(`Unreachable code reached with value: ${value}`);
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

function parseBlock(block: Block): Pattern[] {
    let str = block.line;

    // If the string starts with !, allow it
    let allow = false;
    if (str.startsWith('!')) {
        allow = true;
        str = str.substring(1);
    }

    let reacted_by_name = false;

    // If the string starts with $react, remove it and flag it as such
    // TODO: make more robust once there's more rules like these
    if (str.startsWith('$react ')) {
        str = str.substring('$react '.length).trimStart();
        reacted_by_name = true;
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
        let pattern: Pattern;

        if (reacted_by_name) {
            pattern = { kind: 'reacted_by_name', value: regex };
        } else {
            pattern = { kind: 'regex', value: regex };
        }
        
        if (allow) {
            return [{ kind: 'allow', value: pattern }]
        } else {
            return [pattern]
        }
    }
    return []
}

function parseBlocks(blocks: Block[]): Pattern {
    const patterns = blocks.flatMap(parseBlock)
    return {
        kind: 'block',
        value: patterns
    }
}

// Convert string representations to Pattern objects
function parseRegexList(filterPatterns: string): Pattern {
    // Split the pattern into a list of strings.
    // Remove empty lines and comments.
    const lines = filterPatterns.split('\n')
        .map(line => line.trimEnd())
        .filter(line => line.length > 0)
        .filter(line => stripCommentsForLine(line))
        .map(line => line.trimEnd());
    
    const blocks = parseIndentedLinesIntoBlocks(lines);

    return parseBlocks(blocks);
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

    private evaluatePattern(pattern: Pattern, entry: SocialMediaEntry): EvalResult {
        if (pattern.kind == 'regex') {
            const text = normalizeText(entry.getText())
            return pattern.value.test(text) ? EvalResult.Match : EvalResult.Inconclusive;
        } else if (pattern.kind == 'reacted_by_name') {
            const name = entry.getReactedByName()
            if (name == null) {
                return EvalResult.Inconclusive;
            }
            return pattern.value.test(name) ? EvalResult.Match : EvalResult.Inconclusive;
        } else if (pattern.kind == 'allow') {
            const allowResult = this.evaluatePattern(pattern.value, entry);

            // Negate the result
            switch (allowResult) {
                case EvalResult.Match:
                    return EvalResult.Unmatch;
                case EvalResult.Unmatch:
                    return EvalResult.Match;
                case EvalResult.Inconclusive:
                    return EvalResult.Inconclusive;
            }
        } else if (pattern.kind == 'block') {
            for (const p of pattern.value) {
                const result = this.evaluatePattern(p, entry);
                if (result !== EvalResult.Inconclusive) {
                    return result;
                }
            }
            return EvalResult.Inconclusive;
        }
        assertUnreachable(pattern)
    }

    // Function to check if an entry should be hidden
    shouldHide(entry: SocialMediaEntry): boolean {
        if (this.settings.hideContentCredentials) {
            if (entry.containsContentCredentials()) {
                return true;
            }
        }
    
        if (this.settings.hideSuggested) {
            if (entry.isSuggested()) {
                return true;
            }
        }
    
        const result = this.evaluatePattern(this.root_pattern, entry);

        // If the result is inconclusive, then don't hide
        switch (result) {
            case EvalResult.Unmatch:
            case EvalResult.Inconclusive:
                return false;
            case EvalResult.Match:
                return true;
        }
    }
}
