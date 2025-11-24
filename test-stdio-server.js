#!/usr/bin/env node

import { spawn } from 'child_process';
import { createInterface } from 'readline';

console.log('🧪 Testing stdio server Markdown→HTML conversion...');

// Start the stdio server
const server = spawn('node', ['build/note-mcp-server.js'], {
    stdio: ['pipe', 'pipe', 'inherit']
});

const rl = createInterface({
    input: server.stdout,
    output: server.stdin,
    terminal: false
});

// Wait for server to initialize
setTimeout(() => {
    console.log('📤 Sending test request...');

    const testRequest = {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
            name: "post-draft-note",
            arguments: {
                title: "Stdioサーバー：Markdown変換テスト",
                body: "# 見出し1\n\nこれは**太字**のテストです。\n\n- リスト項目1\n- リスト項目2"
            }
        }
    };

    server.stdin.write(JSON.stringify(testRequest) + '\n');

    // Wait for response and then close
    setTimeout(() => {
        server.kill();
        process.exit(0);
    }, 5000);

}, 3000);

rl.on('line', (line) => {
    console.log('📥 Server response:', line);
});
