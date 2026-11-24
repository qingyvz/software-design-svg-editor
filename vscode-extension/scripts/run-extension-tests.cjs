'use strict';
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const resultFile = path.join(root, '.vscode-test', 'host-result.json');
const code = process.env.VSCODE_EXE || (process.platform === 'win32' ? 'C:\\Program Files\\Microsoft VS Code\\Code.exe' : 'code');
// Extension host test hook is processed by the actual desktop application, not cli.js.
// Profile folders are package-local to avoid touching a user's normal VS Code settings.
const args = [
  '--new-window',
  '--disable-updates',
  '--disable-workspace-trust',
  '--skip-welcome',
  '--skip-release-notes',
  '--user-data-dir', path.join(root, '.vscode-test', 'user-data'),
  '--extensions-dir', path.join(root, '.vscode-test', 'extensions'),
  `--extensionDevelopmentPath=${root}`,
  `--extensionTestsPath=${path.join(root, 'test', 'host.js')}`,
  path.join(root, 'examples'),
];
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
if (fs.existsSync(resultFile)) fs.unlinkSync(resultFile);
const result = spawnSync(code, args, {
  cwd: root,
  stdio: 'inherit',
  timeout: 90000,
  env,
});
if (result.error) console.error(result.error);
if (!fs.existsSync(resultFile)) {
  console.error('VS Code exited without running test/host.js (not a test pass).');
  process.exit(1);
}
const outcome = JSON.parse(fs.readFileSync(resultFile, 'utf8'));
console.log('Extension host test:', outcome);
process.exit(result.status === 0 && outcome.status === 'passed' ? 0 : 1);
