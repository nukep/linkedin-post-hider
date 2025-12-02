// Note: Claude Sonnet 4.5 (AI) wrote this implementation
/* Prompt: 
I have a list of strings in typescript.
Write a function to parse them based on indentation (Python-style).

Block is an interface with the fields:
* line: string
* children: Block[]

function parseIndentedLinesIntoBlocks(lines: string[]): Block[] {
}
*/

interface Block {
    line: string;
    children: Block[];
}

export function parseIndentedLinesIntoBlocks(lines: string[]): Block[] {
    if (lines.length === 0) {
        return [];
    }
    
    const root: Block[] = [];
    const stack: { block: Block; indent: number }[] = [];
    
    for (const line of lines) {
        // Skip empty lines
        if (line.trim() === '') {
            continue;
        }
        
        // Calculate indentation (number of leading spaces)
        const indent = line.length - line.trimStart().length;
        const trimmedLine = line.trim();
        
        const newBlock: Block = {
            line: trimmedLine,
            children: []
        };
        
        // Pop stack until we find the correct parent level
        while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
            stack.pop();
        }
        
        // Add to parent's children or root
        if (stack.length === 0) {
            root.push(newBlock);
        } else {
            stack[stack.length - 1].block.children.push(newBlock);
        }
        
        // Push current block onto stack
        stack.push({ block: newBlock, indent });
    }
    
    return root;
}
