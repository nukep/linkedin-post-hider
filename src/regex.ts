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
