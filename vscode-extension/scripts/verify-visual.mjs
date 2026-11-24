import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const control = resolve(root, 'scripts/visual-control.mjs');
const statePath = resolve(root, '.runtime/visual/state.json');
const evidence = resolve(root, '../doc/evidence/vscode');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
function run(...args) {
  const result = spawnSync(process.execPath, [control, ...args], { encoding: 'utf8', timeout: 25000 });
  if (result.error || result.status !== 0) throw new Error(result.error?.message || result.stderr || result.stdout);
  return JSON.parse(result.stdout.trim().split('\n').at(-1));
}
for (let n = 0; n < 200; n++) {
  if (existsSync(statePath)) {
    const value = JSON.parse(readFileSync(statePath, 'utf8'));
    if (value.status === 'failed') throw new Error(value.error);
    if (value.status === 'ready') break;
  }
  if (n === 199) throw new Error('Start the isolated task host first');
  await delay(100);
}
let complete = false;
try {
  const panes = run('panes');
  const files = panes.find(pane => pane.text === 'EXAMPLES');
  assert.ok(files);
  if (!files.class.split(' ').includes('expanded')) run('toggle-pane', 'EXAMPLES');
  run('action', 'expand');
  run('capture', 'explorer-badge.png');
  run('toggle-pane', 'EXAMPLES');
  let current = run('click', 'rect#start');
  assert.equal(current.selectionLine, 4);
  run('capture', 'outline-location.png');
  current = run('action', 'change');
  assert.ok(current.symbols.includes('rect#updated-start'));
  run('capture', 'outline-updated.png');
  current = run('action', 'invalid');
  assert.deepEqual(current.symbols, []);
  run('capture', 'outline-incomplete.png');
  current = run('action', 'restore');
  assert.ok(current.symbols.includes('rect#start'));
  run('action', 'expand');
  current = run('click', 'rect#start');
  assert.equal(current.selectionLine, 4);
  current = run('finish');
  assert.equal(current.status, 'passed');
  assert.equal(current.diskSha256, current.originalSha256);
  const sha = data => createHash('sha256').update(data).digest('hex');
  current.extensionSourceSha256 = sha(readFileSync(resolve(root, 'src/extension.ts')));
  current.parserSourceSha256 = sha(readFileSync(resolve(root, 'src/svgSymbols.ts')));
  current.screenshots = ['explorer-badge.png','outline-location.png','outline-updated.png','outline-incomplete.png'].map(file => {
    const bytes = readFileSync(resolve(evidence, file));
    assert.equal(bytes.subarray(1,4).toString(), 'PNG');
    return { file, sha256: sha(bytes), width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  });
  writeFileSync(resolve(evidence, 'host-verification.json'), JSON.stringify(current, null, 2) + '\n');
  complete = true;
  console.log(JSON.stringify({ status: current.status, version: current.version, navigationLine: 4, unchangedSvg: true, screenshots: current.screenshots }));
} finally {
  if (!complete) { try { run('action', 'abort'); } catch { /* a failed hook already exits the test host */ } }
}
