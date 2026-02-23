#!/usr/bin/env node
// .env write guard — prevents Claude from editing the .env secrets file.
// Invoked by Claude Code PreToolUse hook on Edit and Write tool calls.
// Input: JSON on stdin with { file_path: "..." }
// Exit 0 = allow, Exit 2 = block (stderr shown to user).

let data = '';
process.stdin.on('data', chunk => (data += chunk));
process.stdin.on('end', () => {
    const input = JSON.parse(data || '{}');
    const filePath = (input.file_path || input.path || '').replace(/\\/g, '/');
    const fileName = filePath.split('/').pop();

    if (fileName === '.env') {
        console.error(
            '[Security] Blocked: .env contains secrets (JWT_SECRET, ADMIN_PASSWORD).\n' +
            'Edit .env manually — never via Claude. Reference .env.example for key names.'
        );
        process.exit(2);
    }
});
