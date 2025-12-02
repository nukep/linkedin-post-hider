// Note: ChatGPT wrote this whole thing.
// Problems are likely.
// So yeah, normally stuff that other people maintain is much more preferrable than vibe-coding the wheel.
// I tried embedding other text editors like Ace and CodeFlask, but they're too big for a userscript or simply buggy.

/* Prompt iterations:
i have a textarea element. when the user presses tab, indent to 4 spaces. when the user presses enter, keep the indentation on the new line.

if the user presses backspace on a line that's entirely whitespace, delete all the whitespace on it

if a range is selected and the user presses tab, indent those lines. if shift+tab is pressed, un-indent.

that's good. however, if the user presses tab and a range isn't selected, just add spaces where the cursor is.

if shift+tab is pressed, regardless of range, unindent the line. it currently works when the range is multiline, but fails otherwise.
*/


function makeTextAreaIndentable(ta: HTMLTextAreaElement) {
    ta.addEventListener('keydown', (e) => {
        const { selectionStart: start, selectionEnd: end, value } = ta;

        // helper to unindent a single line, returns {line, removed}
        function unindentLine(line: string) {
            if (line.startsWith("\t")) return { line: line.slice(1), removed: 1 };
            // count up to 4 leading spaces
            const m = line.match(/^ +/);
            if (!m) return { line, removed: 0 };
            const count = Math.min(4, m[0].length);
            return { line: line.slice(count), removed: count };
        }

        // Backspace: clear line if it's only whitespace
        if (e.key === 'Backspace' && start === end) {
            const lineStart = value.lastIndexOf("\n", start - 1) + 1;
            const lineEnd = value.indexOf("\n", start);
            const actualEnd = lineEnd === -1 ? value.length : lineEnd;
            const line = value.slice(lineStart, actualEnd);

            if (/^[ \t]+$/.test(line)) {
                e.preventDefault();
                ta.value = value.slice(0, lineStart) + value.slice(actualEnd);
                ta.selectionStart = ta.selectionEnd = lineStart;
                return;
            }
        }

        // Tab / Shift+Tab — indent or unindent selected lines (with single-line/single-caret behavior)
        if (e.key === 'Tab') {
            e.preventDefault();

            // If no range selected, simple insert
            if (start === end && !e.shiftKey) {
                ta.value = value.slice(0, start) + "    " + value.slice(end);
                ta.selectionStart = ta.selectionEnd = start + 4;
                return;
            }

            // compute line bounds for selection (cover whole lines)
            const selStartLine = value.lastIndexOf("\n", start - 1) + 1;
            const selEndLineBreak = value.indexOf("\n", Math.max(end - 1, 0));
            const selEndLine = selEndLineBreak === -1 ? value.length : selEndLineBreak + 1 === end ? end - 1 === selEndLineBreak ? selEndLineBreak : value.length : (value.indexOf("\n", end) === -1 ? value.length : value.indexOf("\n", end));

            // normalize: if selection spans multiple lines (there is at least one '\n' between selStartLine and end), treat as multiline.
            const isMultiLine = value.slice(selStartLine, end).includes("\n");

            if (!e.shiftKey) {
                // indent
                if (!isMultiLine) {
                    // single-line selection or caret: insert at cursor
                    ta.value = value.slice(0, start) + "    " + value.slice(end);
                    ta.selectionStart = ta.selectionEnd = start + 4;
                } else {
                    // indent every line in selection
                    const selEnd = value.indexOf("\n", end) === -1 ? value.length : value.indexOf("\n", end);
                    const selected = value.slice(selStartLine, selEnd);
                    const lines = selected.split("\n");
                    const newLines = lines.map(l => "    " + l);
                    const delta = 4;

                    ta.value = value.slice(0, selStartLine) + newLines.join("\n") + value.slice(selEnd);
                    ta.selectionStart = start + delta;
                    ta.selectionEnd = end + delta * lines.length;
                }
            } else {
                // unindent (Shift+Tab) — if multi-line selection, unindent every line; otherwise unindent current line
                if (isMultiLine) {
                    const selEnd = value.indexOf("\n", end) === -1 ? value.length : value.indexOf("\n", end);
                    const selected = value.slice(selStartLine, selEnd);
                    const lines = selected.split("\n");

                    const results = lines.map(unindentLine);
                    const newSelected = results.map(r => r.line).join("\n");
                    const totalRemoved = results.reduce((s, r) => s + r.removed, 0);
                    const firstRemoved = results.length ? results[0].removed : 0;

                    ta.value = value.slice(0, selStartLine) + newSelected + value.slice(selEnd);
                    ta.selectionStart = start - firstRemoved;
                    ta.selectionEnd = end - totalRemoved;
                } else {
                    // single line or caret -> unindent only the current line
                    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
                    const lineEnd = value.indexOf("\n", start);
                    const actualEnd = lineEnd === -1 ? value.length : lineEnd;
                    const line = value.slice(lineStart, actualEnd);

                    const { line: newLine, removed } = unindentLine(line);

                    if (removed > 0) {
                        e.preventDefault();
                        ta.value = value.slice(0, lineStart) + newLine + value.slice(actualEnd);
                        // adjust selection: only reduce by how many removed before cursor
                        const removedBeforeCursor = Math.min(removed, Math.max(0, start - lineStart));
                        ta.selectionStart = Math.max(lineStart, start - removedBeforeCursor);
                        ta.selectionEnd = Math.max(lineStart, end - removedBeforeCursor);
                    } // else nothing to do
                }
            }

            return;
        }

        // Enter: preserve indentation
        if (e.key === 'Enter') {
            e.preventDefault();
            const lineStart = value.lastIndexOf("\n", start - 1) + 1;
            const currentLine = value.slice(lineStart, start);
            const indent = currentLine.match(/^[ \t]*/)[0];

            ta.value = value.slice(0, start) + "\n" + indent + value.slice(end);
            const pos = start + 1 + indent.length;
            ta.selectionStart = ta.selectionEnd = pos;
        }
    });
}

export function createTextEditor(): HTMLTextAreaElement {
    const textarea = document.createElement('textarea');
    textarea.spellcheck = false;

    makeTextAreaIndentable(textarea);
    return textarea;
}
