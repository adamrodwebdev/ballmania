// Claude Code hook (PostToolUse on Edit/Write): formats the file Claude just
// wrote with the project's own Prettier, so `npm run format:check` stays green
// in CI. Never blocks Claude: any problem is reported on stderr, exit code 0.
import { spawnSync } from 'node:child_process';
import { isAbsolute, relative, resolve } from 'node:path';

let input = '';
process.stdin.setEncoding('utf8');
for await (const chunk of process.stdin) input += chunk;

try {
  const filePath = JSON.parse(input)?.tool_input?.file_path;
  const root = resolve(process.env.CLAUDE_PROJECT_DIR ?? process.cwd());
  const rel = typeof filePath === 'string' ? relative(root, resolve(filePath)) : '..';
  // Outside the project: a parent path, or another drive on Windows (absolute).
  const inside = !rel.startsWith('..') && !isAbsolute(rel);
  if (inside) {
    // --ignore-unknown skips files Prettier cannot parse; .prettierignore is honoured.
    const result = spawnSync(
      'npx',
      ['--no-install', 'prettier', '--write', '--ignore-unknown', resolve(filePath)],
      {
        cwd: root,
        stdio: ['ignore', 'ignore', 'pipe'],
        shell: process.platform === 'win32',
        encoding: 'utf8',
      },
    );
    if (result.status !== 0 && result.stderr) process.stderr.write(result.stderr);
  }
} catch (error) {
  process.stderr.write(`format hook: ${String(error)}\n`);
}
process.exit(0);
