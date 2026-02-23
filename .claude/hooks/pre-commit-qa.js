#!/usr/bin/env node
// Pre-commit QA gate — blocks git commit if regression suite fails.
// Invoked by Claude Code PreToolUse hook on Bash commands.
// Input: JSON on stdin with { command: "git commit ..." }
// Exit 0 = allow, Exit 2 = block (stderr shown to user).

let data = '';
process.stdin.on('data', chunk => (data += chunk));
process.stdin.on('end', () => {
    const input = JSON.parse(data || '{}');
    const cmd = input.command || '';

    // Only intercept git commit commands
    if (!/\bgit\s+commit\b/.test(cmd)) process.exit(0);

    console.log('[QA Gate] Running regression suite before commit…');
    try {
        require('child_process').execSync('npm run qa:regression', {
            stdio: 'inherit',
            cwd: 'C:\\created games\\Casino',
        });
        console.log('[QA Gate] ✓ Regression passed — proceeding with commit');
        process.exit(0);
    } catch {
        console.error('[QA Gate] ✗ Regression FAILED — commit blocked. Fix QA first.');
        process.exit(2);
    }
});
