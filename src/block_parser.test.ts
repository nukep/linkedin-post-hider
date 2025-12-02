// Note: Claude Sonnet 4.5 (AI) wrote these tests

import { parseIndentedLinesIntoBlocks } from './block_parser';

describe('parseIndentedLinesIntoBlocks', () => {
    test('parses basic hierarchical structure', () => {
        const lines = [
            "Root 1",
            "  Child 1.1",
            "    Grandchild 1.1.1",
            "  Child 1.2",
            "Root 2",
            "  Child 2.1"
        ];

        const result = parseIndentedLinesIntoBlocks(lines);

        expect(result).toEqual([
            {
                line: "Root 1",
                children: [
                    {
                        line: "Child 1.1",
                        children: [
                            {
                                line: "Grandchild 1.1.1",
                                children: []
                            }
                        ]
                    },
                    {
                        line: "Child 1.2",
                        children: []
                    }
                ]
            },
            {
                line: "Root 2",
                children: [
                    {
                        line: "Child 2.1",
                        children: []
                    }
                ]
            }
        ]);
    });

    test('handles empty array', () => {
        const result = parseIndentedLinesIntoBlocks([]);
        expect(result).toEqual([]);
    });

    test('handles single line', () => {
        const result = parseIndentedLinesIntoBlocks(["Single line"]);
        expect(result).toEqual([
            {
                line: "Single line",
                children: []
            }
        ]);
    });

    test('handles all root-level items (no indentation)', () => {
        const lines = [
            "Root 1",
            "Root 2",
            "Root 3"
        ];

        const result = parseIndentedLinesIntoBlocks(lines);

        expect(result).toEqual([
            { line: "Root 1", children: [] },
            { line: "Root 2", children: [] },
            { line: "Root 3", children: [] }
        ]);
    });

    test('handles deeply nested structure', () => {
        const lines = [
            "Level 0",
            "  Level 1",
            "    Level 2",
            "      Level 3",
            "        Level 4"
        ];

        const result = parseIndentedLinesIntoBlocks(lines);

        expect(result).toEqual([
            {
                line: "Level 0",
                children: [
                    {
                        line: "Level 1",
                        children: [
                            {
                                line: "Level 2",
                                children: [
                                    {
                                        line: "Level 3",
                                        children: [
                                            {
                                                line: "Level 4",
                                                children: []
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        ]);
    });

    test('skips empty lines', () => {
        const lines = [
            "Root 1",
            "",
            "  Child 1.1",
            "",
            "Root 2"
        ];

        const result = parseIndentedLinesIntoBlocks(lines);

        expect(result).toEqual([
            {
                line: "Root 1",
                children: [
                    {
                        line: "Child 1.1",
                        children: []
                    }
                ]
            },
            {
                line: "Root 2",
                children: []
            }
        ]);
    });

    test('handles lines with only whitespace', () => {
        const lines = [
            "Root 1",
            "   ",
            "  Child 1.1"
        ];

        const result = parseIndentedLinesIntoBlocks(lines);

        expect(result).toEqual([
            {
                line: "Root 1",
                children: [
                    {
                        line: "Child 1.1",
                        children: []
                    }
                ]
            }
        ]);
    });

    test('handles multiple children at same level', () => {
        const lines = [
            "Root",
            "  Child 1",
            "  Child 2",
            "  Child 3"
        ];

        const result = parseIndentedLinesIntoBlocks(lines);

        expect(result).toEqual([
            {
                line: "Root",
                children: [
                    { line: "Child 1", children: [] },
                    { line: "Child 2", children: [] },
                    { line: "Child 3", children: [] }
                ]
            }
        ]);
    });

    test('handles jumping back multiple indentation levels', () => {
        const lines = [
            "Root 1",
            "  Child 1.1",
            "    Grandchild 1.1.1",
            "      Great-grandchild 1.1.1.1",
            "  Child 1.2",
            "Root 2"
        ];

        const result = parseIndentedLinesIntoBlocks(lines);

        expect(result).toEqual([
            {
                line: "Root 1",
                children: [
                    {
                        line: "Child 1.1",
                        children: [
                            {
                                line: "Grandchild 1.1.1",
                                children: [
                                    {
                                        line: "Great-grandchild 1.1.1.1",
                                        children: []
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        line: "Child 1.2",
                        children: []
                    }
                ]
            },
            {
                line: "Root 2",
                children: []
            }
        ]);
    });

    test('handles inconsistent indentation (4 spaces)', () => {
        const lines = [
            "Root",
            "    Child (4 spaces)",
            "        Grandchild (8 spaces)"
        ];

        const result = parseIndentedLinesIntoBlocks(lines);

        expect(result).toEqual([
            {
                line: "Root",
                children: [
                    {
                        line: "Child (4 spaces)",
                        children: [
                            {
                                line: "Grandchild (8 spaces)",
                                children: []
                            }
                        ]
                    }
                ]
            }
        ]);
    });

    test('trims leading and trailing whitespace from lines', () => {
        const lines = [
            "  Root with leading spaces  ",
            "    Child with spaces  "
        ];

        const result = parseIndentedLinesIntoBlocks(lines);

        expect(result).toEqual([
            {
                line: "Root with leading spaces",
                children: [
                    {
                        line: "Child with spaces",
                        children: []
                    }
                ]
            }
        ]);
    });
});
