import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, rmSync, lstatSync } from 'node:fs';
import { resolve, dirname, sep, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const options = {};
for (let i = 0; i < args.length; i += 2) {
  if (!['--baseline', '--config-demo'].includes(args[i]) || !args[i + 1]) throw new Error('Usage: node scripts/verify-transcripts.mjs --baseline <built final checkout> --config-demo <built B checkout>');
  options[args[i]] = resolve(args[i + 1]);
}
for (const key of ['--baseline', '--config-demo']) if (!options[key]) throw new Error(key + ' is required');
const output = resolve(root, 'doc/evidence/transcripts');
const scratch = resolve(root, '.runtime/transcript-session');
const work = resolve(scratch, 'work');
if (!scratch.startsWith(root + sep) || !work.startsWith(scratch + sep)) throw new Error('Unsafe fixture directory');
if (existsSync(scratch) && lstatSync(scratch).isSymbolicLink()) throw new Error('Fixture directory must not be a link');
mkdirSync(output, { recursive: true });
mkdirSync(scratch, { recursive: true });
const marker = join(scratch, '.owned-by-verify-transcripts');
if (readdirSync(scratch).length && !existsSync(marker)) throw new Error('Refuse to reuse unknown fixture contents');
writeFileSync(marker, 'Task-owned temporary transcript fixtures\n');
const hash = data => createHash('sha256').update(data).digest('hex');
const git = (...argv) => {
  const result = spawnSync('git', ['-C', root, ...argv], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (result.error || result.status !== 0) throw new Error(result.error?.message || result.stderr);
  return result.stdout.trim();
};
const summary = { utc: new Date().toISOString(), node: process.version, platform: process.platform, revision: git('rev-parse','HEAD'), workingChanges: git('status','--porcelain').length !== 0, cwd: work, runs: [], comparisons: [], ocp: {} };
function reset() {
  if (existsSync(work)) {
    if (lstatSync(work).isSymbolicLink() || dirname(work) !== scratch) throw new Error('Unsafe fixture reset');
    rmSync(work, { recursive: true, force: true });
  }
  mkdirSync(work);
  mkdirSync(join(work, 'docs'));
  writeFileSync(join(work, '.hidden.txt'), 'hidden fixture\n');
  writeFileSync(join(work, 'a.txt'), 'fixed fixture\n');
  writeFileSync(join(work, 'other.svg'), readFileSync(resolve(root, 'examples/other.svg')));
}
function run(id, checkout, flags, input) {
  const entry = resolve(checkout, 'build/src/Main.js');
  assert.ok(existsSync(entry), 'build the checkout first: ' + checkout);
  reset();
  const result = spawnSync(process.execPath, [entry, ...flags], { cwd: work, input, encoding: 'buffer', maxBuffer: 8 * 1024 * 1024 });
  if (result.error) throw result.error;
  writeFileSync(resolve(output, id + '.stdout.txt'), result.stdout);
  writeFileSync(resolve(output, id + '.stderr.txt'), result.stderr);
  assert.equal(result.status, 0, result.stderr.toString());
  const generated = Object.fromEntries(readdirSync(work).filter(name => name.endsWith('.svg') && name !== 'other.svg').map(name => [name, hash(readFileSync(join(work, name)))]));
  summary.runs.push({ id, checkout, flags, status: result.status, inputSha256: hash(input), stdoutSha256: hash(result.stdout), bytes: result.stdout.length, generated, errors: result.stdout.toString('utf8').split('\n').filter(line => line.startsWith('error:')) });
  return { stdout: result.stdout, generated };
}
function same(id, a, b) {
  assert.ok(a.stdout.equals(b.stdout), 'byte mismatch: ' + id);
  assert.deepEqual(a.generated, b.generated, 'generated SVG mismatch: ' + id);
  summary.comparisons.push({ id, byteIdentical: true, generatedSvgIdentical: true });
}
try {
  for (const name of ['cli-1','cli-box','cli-plugins']) {
    const input = readFileSync(resolve(root, 'doc/transcript', name + '.txt'));
    const a = run(name + '.code', root, ['--plugins'], input);
    const configured = run(name + '.config', root, ['--config', resolve(root, 'plugins.config.json')], input);
    const b = run(name + '.B-config', options['--config-demo'], ['--config', resolve(options['--config-demo'], 'plugins.config.json')], input);
    same(name + ': delivery A vs delivery B', a, configured);
    same(name + ': A vs independent B branch', a, b);
    if (name === 'cli-1') {
      const original = run(name + '.final', options['--baseline'], [], input);
      const defaults = run(name + '.default', root, [], input);
      same(name + ': final vs default', original, defaults);
    } else {
      assert.ok(!a.stdout.toString('utf8').split('\n').some(line => line.startsWith('error:')), name + ' must run completely');
    }
  }
  const a = git('rev-parse','phase2/box-code-demo');
  const b = git('rev-parse','phase2/box-config-demo');
  const parentA = git('rev-parse', a + '^');
  const parentB = git('rev-parse', b + '^');
  assert.equal(parentA, parentB, 'proof branches must share the box-free framework parent');
  for (const path of ['src/domain','src/application','src/cli','src/host','src/infrastructure','src/plugins/dir','src/plugins/stats','src/plugins/star']) {
    for (const commit of [parentA,a,b]) git('cat-file','-e',commit + ':' + path);
  }
  const aRuntime = git('diff','--name-only',parentA,a,'--','src',':(exclude)src/plugins/box');
  const bRuntime = git('diff','--name-only',parentB,b,'--','src',':(exclude)src/plugins/box');
  assert.equal(aRuntime, 'src/Main.ts');
  assert.equal(bRuntime, '');
  assert.equal(git('diff','--name-only',a,b,'--','src/plugins/box'),'');
  assert.equal(git('show',parentA + ':plugins.config.json'), git('show',a + ':plugins.config.json'));
  assert.notEqual(git('show',parentB + ':plugins.config.json'), git('show',b + ':plugins.config.json'));
  summary.ocp = { a, b, parent: parentA, aExistingRuntimeChanges: aRuntime.split('\n'), bExistingRuntimeChanges: [], identicalNewPackage: true, pathsVerified: true };
  writeFileSync(resolve(output, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
  console.log(JSON.stringify({ comparisons: summary.comparisons, ocp: summary.ocp }, null, 2));
} finally {
  if (existsSync(marker) && scratch.startsWith(root + sep) && !lstatSync(scratch).isSymbolicLink()) rmSync(scratch, { recursive: true, force: true });
}
