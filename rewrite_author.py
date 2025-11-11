#!/usr/bin/env python3
import sys

for line in sys.stdin:
    if line.startswith('author '):
        parts = line.split(' ')
        if len(parts) >= 3:
            timestamp = ' '.join(parts[-2:])
            print(f'author note-mcp-developer <developer@example.com> {timestamp}')
        else:
            print(line, end='')
    elif line.startswith('committer '):
        parts = line.split(' ')
        if len(parts) >= 3:
            timestamp = ' '.join(parts[-2:])
            print(f'committer note-mcp-developer <developer@example.com> {timestamp}')
        else:
            print(line, end='')
    else:
        print(line, end='')
