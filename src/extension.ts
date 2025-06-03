import * as vscode from 'vscode';
import * as path from 'path';

// Interface for comment findings
interface CommentIssue {
    file: string;
    line: number;
    column: number;
    type: 'TODO' | 'FIXME' | 'BUG';
    text: string;
    fullLine: string;
}

export function activate(context: vscode.ExtensionContext) {
    console.log('Format Guard extension is now active!');

    // Register the comment scanner command
    let scanComments = vscode.commands.registerCommand('format-guard.scanComments', async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;

        if (!workspaceFolders) {
            vscode.window.showErrorMessage('No workspace folder found. Please open a folder first.');
            return;
        }

        vscode.window.showInformationMessage('🔍 Format Guard: Scanning for comments...');

        try {
            const issues = await scanForComments(workspaceFolders[0].uri);
            displayResults(issues);
        } catch (error) {
            vscode.window.showErrorMessage(`Error scanning comments: ${error}`);
        }
    });

    // Register a command to check current file only
    let scanCurrentFile = vscode.commands.registerCommand('format-guard.scanCurrentFile', async () => {
        const activeEditor = vscode.window.activeTextEditor;

        if (!activeEditor) {
            vscode.window.showErrorMessage('No active file found. Please open a file first.');
            return;
        }

        const document = activeEditor.document;
        const issues = scanFileForComments(document);

        if (issues.length === 0) {
            vscode.window.showInformationMessage('✅ No TODO/FIXME/BUG comments found in current file!');
        } else {
            displayResults(issues);
        }
    });

    context.subscriptions.push(scanComments, scanCurrentFile);
}

async function scanForComments(workspaceUri: vscode.Uri): Promise<CommentIssue[]> {
    const issues: CommentIssue[] = [];

    // File patterns to include
    const includePattern = '**/*.{js,ts,py,java,cpp,c,h,css,html,vue,jsx,tsx,go,rs,php,rb,swift,kt,dart,scala,sh,yaml,yml,json,md}';

    // File patterns to exclude
    const excludePattern = '{**/node_modules/**,**/dist/**,**/build/**,**/.git/**,**/coverage/**,**/__pycache__/**,**/venv/**,**/env/**}';

    const files = await vscode.workspace.findFiles(includePattern, excludePattern);

    for (const file of files) {
        try {
            const document = await vscode.workspace.openTextDocument(file);
            const fileIssues = scanFileForComments(document);
            issues.push(...fileIssues);
        } catch (error) {
            console.error(`Error reading file ${file.fsPath}:`, error);
        }
    }

    return issues;
}

function scanFileForComments(document: vscode.TextDocument): CommentIssue[] {
    const issues: CommentIssue[] = [];
    const text = document.getText();
    const lines = text.split('\n');

    // Regex patterns for different comment types
    const patterns = [
        { type: 'TODO' as const, regex: /(?:\/\/|\/\*|#|<!--)\s*(TODO:?)\s*(.+?)(?:\*\/|-->|$)/gi },
        { type: 'FIXME' as const, regex: /(?:\/\/|\/\*|#|<!--)\s*(FIXME:?)\s*(.+?)(?:\*\/|-->|$)/gi },
        { type: 'BUG' as const, regex: /(?:\/\/|\/\*|#|<!--)\s*(BUG:?)\s*(.+?)(?:\*\/|-->|$)/gi }
    ];

    lines.forEach((line, lineIndex) => {
        patterns.forEach(({ type, regex }) => {
            let match;
            regex.lastIndex = 0; // Reset regex state

            while ((match = regex.exec(line)) !== null) {
                issues.push({
                    file: document.fileName,
                    line: lineIndex + 1, // VS Code uses 1-based line numbers
                    column: match.index + 1,
                    type: type,
                    text: match[2]?.trim() || '',
                    fullLine: line.trim()
                });
            }
        });
    });

    return issues;
}

function displayResults(issues: CommentIssue[]) {
    if (issues.length === 0) {
        vscode.window.showInformationMessage('✅ No TODO/FIXME/BUG comments found!');
        return;
    }

    // Group issues by type
    const groupedIssues = issues.reduce((acc, issue) => {
        if (!acc[issue.type]) {
            acc[issue.type] = [];
        }
        acc[issue.type].push(issue);
        return acc;
    }, {} as Record<string, CommentIssue[]>);

    // Create summary message
    const summary = Object.entries(groupedIssues)
        .map(([type, items]) => `${items.length} ${type}`)
        .join(', ');

    vscode.window.showWarningMessage(
        `🔍 Format Guard found: ${summary}`,
        'Show Details',
        'Dismiss'
    ).then(selection => {
        if (selection === 'Show Details') {
            showDetailedResults(groupedIssues);
        }
    });
}

function showDetailedResults(groupedIssues: Record<string, CommentIssue[]>) {
    // Create a new untitled document to show results
    vscode.workspace.openTextDocument({
        content: formatResultsAsText(groupedIssues),
        language: 'plaintext'
    }).then(document => {
        vscode.window.showTextDocument(document);
    });
}

function formatResultsAsText(groupedIssues: Record<string, CommentIssue[]>): string {
    let output = '🛡️ FORMAT GUARD - COMMENT SCAN RESULTS\n';
    output += '='.repeat(50) + '\n\n';

    const totalIssues = Object.values(groupedIssues).flat().length;
    output += `Found ${totalIssues} comment(s) that need attention:\n\n`;

    Object.entries(groupedIssues).forEach(([type, issues]) => {
        output += `📌 ${type} (${issues.length} found):\n`;
        output += '-'.repeat(30) + '\n';

        issues.forEach(issue => {
            const relativePath = vscode.workspace.asRelativePath(issue.file);
            output += `📄 ${relativePath}:${issue.line}:${issue.column}\n`;
            output += `   ${issue.fullLine}\n`;
            if (issue.text) {
                output += `   → ${issue.text}\n`;
            }
            output += '\n';
        });

        output += '\n';
    });

    output += '💡 Tip: Click on file paths to navigate to the comments!\n';

    return output;
}

export function deactivate() {
    console.log('Format Guard extension is deactivated');
}
