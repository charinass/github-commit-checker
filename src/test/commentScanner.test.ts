import * as assert from 'assert';
import * as vscode from 'vscode';

// You can import and test your extension here
// This is similar to "import mymodule" in Python testing

// Define the type for our test match objects
interface TestMatch {
    line?: number;
    type: string;
    text: string;
}

suite('Format Guard Comment Scanner Tests', () => {

    // This is like "def test_something():" in pytest
    test('Should find TODO comments', async () => {
        // Create a mock document with TODO comments
        const mockContent = `
            // TODO: Fix this function
            console.log("Hello world");
            # TODO: Another todo item
            /* TODO: Multi-line comment */
        `;

        // We'll need to create a mock document for testing
        // For now, let's test the regex patterns directly

        const todoPattern = /(?:\/\/|\/\*|#|<!--)\s*(TODO:?)\s*(.+?)(?:\*\/|-->|$)/gi;
        const matches: TestMatch[] = [];
        let match;

        const lines = mockContent.split('\n');
        lines.forEach((line, index) => {
            todoPattern.lastIndex = 0; // Reset regex
            while ((match = todoPattern.exec(line)) !== null) {
                matches.push({
                    line: index + 1,
                    type: 'TODO',
                    text: match[2]?.trim() || ''
                });
            }
        });

        // Assert we found the expected TODOs
        assert.strictEqual(matches.length, 3, 'Should find 3 TODO comments');
        assert.strictEqual(matches[0].text, 'Fix this function');
        assert.strictEqual(matches[1].text, 'Another todo item');
        assert.strictEqual(matches[2].text, 'Multi-line comment');
    });

    test('Should find FIXME comments', async () => {
        const mockContent = `
            // FIXME: This is broken
            let x = 1;
            # FIXME: Python style comment
        `;

        const fixmePattern = /(?:\/\/|\/\*|#|<!--)\s*(FIXME:?)\s*(.+?)(?:\*\/|-->|$)/gi;
        const matches: TestMatch[] = [];
        let match;

        const lines = mockContent.split('\n');
        lines.forEach((line) => {
            fixmePattern.lastIndex = 0;
            while ((match = fixmePattern.exec(line)) !== null) {
                matches.push({
                    type: 'FIXME',
                    text: match[2]?.trim() || ''
                });
            }
        });

        assert.strictEqual(matches.length, 2, 'Should find 2 FIXME comments');
        assert.strictEqual(matches[0].text, 'This is broken');
    });

    test('Should find BUG comments', async () => {
        const mockContent = `
            /* BUG: Memory leak here */
            function buggyFunction() { }
        `;

        const bugPattern = /(?:\/\/|\/\*|#|<!--)\s*(BUG:?)\s*(.+?)(?:\*\/|-->|$)/gi;
        const matches: TestMatch[] = [];
        let match;

        const lines = mockContent.split('\n');
        lines.forEach((line) => {
            bugPattern.lastIndex = 0;
            while ((match = bugPattern.exec(line)) !== null) {
                matches.push({
                    type: 'BUG',
                    text: match[2]?.trim() || ''
                });
            }
        });

        assert.strictEqual(matches.length, 1, 'Should find 1 BUG comment');
        assert.strictEqual(matches[0].text, 'Memory leak here');
    });

    test('Should ignore regular comments without keywords', async () => {
        const mockContent = `
            // This is just a regular comment
            # Another regular comment
            /* Normal comment */
        `;

        const patterns = [
            /(?:\/\/|\/\*|#|<!--)\s*(TODO:?)\s*(.+?)(?:\*\/|-->|$)/gi,
            /(?:\/\/|\/\*|#|<!--)\s*(FIXME:?)\s*(.+?)(?:\*\/|-->|$)/gi,
            /(?:\/\/|\/\*|#|<!--)\s*(BUG:?)\s*(.+?)(?:\*\/|-->|$)/gi
        ];

        let totalMatches = 0;
        const lines = mockContent.split('\n');

        patterns.forEach(pattern => {
            lines.forEach(line => {
                pattern.lastIndex = 0;
                while (pattern.exec(line) !== null) {
                    totalMatches++;
                }
            });
        });

        assert.strictEqual(totalMatches, 0, 'Should not find any special comments in regular comments');
    });

    test('Should handle mixed comment styles', async () => {
        const mockContent = `
            // TODO: JavaScript style
            # TODO: Python style
            <!-- TODO: HTML style -->
            /* TODO: C style */
        `;

        const todoPattern = /(?:\/\/|\/\*|#|<!--)\s*(TODO:?)\s*(.+?)(?:\*\/|-->|$)/gi;
        const matches: string[] = [];
        let match;

        const lines = mockContent.split('\n');
        lines.forEach((line) => {
            todoPattern.lastIndex = 0;
            while ((match = todoPattern.exec(line)) !== null) {
                matches.push(match[2]?.trim() || '');
            }
        });

        assert.strictEqual(matches.length, 4, 'Should find TODO in all comment styles');
        assert.strictEqual(matches[0], 'JavaScript style');
        assert.strictEqual(matches[1], 'Python style');
        assert.strictEqual(matches[2], 'HTML style');
        assert.strictEqual(matches[3], 'C style');
    });
});
