#!/usr/bin/env node
/** Reproducible source inventory and syntactic cyclomatic-complexity comparison.
 * Run from anywhere with `node docs/metrics/generate.mjs --baseline final --target p2`
 * only after p2 points at the final committed source tree. Before that use --target HEAD,
 * noting that uncommitted Phase 2 sources (including vscode-extension/) are excluded.
 * Only committed Git trees are counted; no dependency/build/test files are counted.
 */
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { writeFileSync } from 'node:fs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(resolve(root, 'package.json'));
const ts = require('typescript');
const args = process.argv.slice(2);
function argument(name, fallback) {
  const i = args.indexOf(name);
  if (i < 0) return fallback;
  if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`${name} needs a value`);
  return args[i + 1];
}
const baseline = argument('--baseline', 'final');
const target = argument('--target', 'p2');
const output = argument('--output', resolve(root, 'docs/metrics/report.md'));
const validOptions = ['--baseline', '--target', '--output'];
for (let i = 0; i < args.length; i++) {
  if (!validOptions.includes(args[i]) || !args[i + 1]) throw new Error(`invalid option: ${args[i]}`);
  i++;
}
if (resolve(output) !== resolve(root, 'docs/metrics/report.md'))
  throw new Error('output must be docs/metrics/report.md in this repository');
// Git revisions are data, never shell strings. Disallow option-shaped refnames.
for (const rev of [baseline, target]) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._/^-]*$/.test(rev) || rev.includes('..'))
    throw new Error(`invalid revision: ${rev}`);
}
function git(...argv) {
  const run = spawnSync('git', ['-C', root, ...argv], { encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 });
  if (run.error || run.status !== 0) {
    throw new Error(`git ${argv[0]} failed: ${run.error?.message ?? run.stderr.toString('utf8').trim()}`);
  }
  return run.stdout;
}
function gitExit(...argv) {
  const run = spawnSync('git', ['-C', root, ...argv], { encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 });
  if (run.error) throw run.error;
  return run.status;
}
function commit(rev) {
  return git('rev-parse', '--verify', `${rev}^{commit}`).toString('utf8').trim();
}
function role(path) {
  if (/(^|\/)(test|tests|node_modules|build|out|\.runtime)(\/|$)/.test(path) || /\.test\.[tj]sx?$/.test(path)) return null;
  if (!path.endsWith('.ts') && !path.endsWith('.tsx')) return null;
  if (path.startsWith('vscode-extension/') || path.startsWith('extensions/vscode/') || path.startsWith('vscode/')) return 'VSCode (separate)';
  if (path.startsWith('src/plugins/') || path.startsWith('plugins/')) return 'plugin';
  if (path.startsWith('src/domain/') || path.startsWith('src/application/')) return 'core';
  if (path === 'src/Main.ts' || path.startsWith('src/cli/') || path.startsWith('src/infrastructure/') || path.startsWith('src/assembly/') || path.startsWith('src/host/')) return 'assembly/adapters';
  if (path.startsWith('src/')) return 'UNCLASSIFIED CLI';
  return null; // Tests, dependencies, generated output and fixture sources are not production CLI.
}
function tree(hash) {
  const paths = git('ls-tree', '-r', '-z', '--name-only', hash).toString('utf8').split('\0').filter(Boolean);
  const result = new Map();
  for (const path of paths) {
    const category = role(path);
    if (category) result.set(path, { path, category, text: git('show', `${hash}:${path}`).toString('utf8') });
  }
  return result;
}
const decisions = new Set([
  ts.SyntaxKind.IfStatement, ts.SyntaxKind.ForStatement, ts.SyntaxKind.ForInStatement,
  ts.SyntaxKind.ForOfStatement, ts.SyntaxKind.WhileStatement, ts.SyntaxKind.DoStatement,
  ts.SyntaxKind.ConditionalExpression, ts.SyntaxKind.CatchClause,
]);
const callable = (n) => ts.isFunctionDeclaration(n) || ts.isFunctionExpression(n) || ts.isArrowFunction(n) ||
  ts.isMethodDeclaration(n) || ts.isConstructorDeclaration(n) || ts.isGetAccessorDeclaration(n) ||
  ts.isSetAccessorDeclaration(n);
function syntaxMetric(path, text) {
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  if (source.parseDiagnostics.length) throw new Error(`cannot parse ${path}: ${source.parseDiagnostics[0].messageText}`);
  let complexity = 0;
  let topLevelDecisions = 0;
  let functions = 0;
  function scan(node, inFunction) {
    if (callable(node)) { functions++; complexity++; inFunction = true; }
    let decision = 0;
    if (decisions.has(node.kind) || ts.isCaseClause(node)) decision++;
    if (ts.isBinaryExpression(node) && [ts.SyntaxKind.AmpersandAmpersandToken,
      ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken].includes(node.operatorToken.kind)) decision++;
    if (inFunction) complexity += decision;
    else topLevelDecisions += decision;
    ts.forEachChild(node, (child) => scan(child, inFunction));
  }
  scan(source, false);
  const lines = text ? text.split(/\r\n|\n|\r/) : [];
  if (lines.at(-1) === '') lines.pop();
  const declarations = [];
  for (const statement of source.statements) {
    if (ts.isClassDeclaration(statement)) declarations.push(`class ${statement.name?.text ?? '(anonymous)'}`);
    else if (ts.isInterfaceDeclaration(statement)) declarations.push(`interface ${statement.name.text}`);
    else if (ts.isTypeAliasDeclaration(statement)) declarations.push(`type ${statement.name.text}`);
    else if (ts.isFunctionDeclaration(statement)) declarations.push(`function ${statement.name?.text ?? '(anonymous)'}`);
    else if (ts.isVariableStatement(statement)) {
      for (const item of statement.declarationList.declarations) {
        if (ts.isIdentifier(item.name)) declarations.push(`const ${item.name.text}`);
      }
    }
  }
  return { lines: lines.length, nonblank: lines.filter((line) => line.trim()).length,
    functions, complexity, topLevelDecisions,
    declarations: declarations.join(', ') || '(module-level statements; inspect source)' };
}
function markdownCell(value) { return String(value).replaceAll('|', '\\|').replaceAll('\n', ' '); }
function summarize(map) {
  const summary = new Map();
  for (const row of map.values()) {
    const item = summary.get(row.category) ?? { files: 0, lines: 0, nonblank: 0, functions: 0, complexity: 0, topLevelDecisions: 0 };
    item.files++; item.lines += row.lines; item.nonblank += row.nonblank;
    item.functions += row.functions; item.complexity += row.complexity;
    item.topLevelDecisions += row.topLevelDecisions;
    summary.set(row.category, item);
  }
  return summary;
}
function delta(before, after, key) { return (after?.[key] ?? 0) - (before?.[key] ?? 0); }
try {
  const bHash = commit(baseline), tHash = commit(target);
  const targetIsTag = gitExit('show-ref', '--verify', '--quiet', `refs/tags/${target}`) === 0;
  const hasWorkingChanges = git('status', '--porcelain', '--untracked-files=normal').length !== 0;
  const before = new Map([...tree(bHash)].map(([path, file]) => [path, { ...file, ...syntaxMetric(path, file.text) }]));
  const after = new Map([...tree(tHash)].map(([path, file]) => [path, { ...file, ...syntaxMetric(path, file.text) }]));
  const responsibilities = JSON.parse(git('show', `${tHash}:docs/metrics/responsibilities.json`).toString('utf8'));
  for (const path of after.keys()) if (!responsibilities[path]) throw new Error(`missing responsibility: ${path}`);
  const base = summarize(before), current = summarize(after);
  const now = new Date().toISOString();
  const md = [
    '# Source metrics (generated; do not edit)', '',
    `- Generated (UTC): ${now}`,
    `- Baseline: \`${baseline}\` = \`${bHash}\``, `- Target: \`${target}\` = \`${tHash}\``,
    '- Scope: tracked production `.ts`/`.tsx` from the two committed Git trees. Test, build, node_modules and dependencies excluded. `src/domain` and `src/application` count as core (including core ports); `src/cli`, `src/infrastructure`, `src/Main.ts` count as assembly/adapters (host input, loading, IO). `src/plugins` counts as plugin. VSCode is a separate row and never included in CLI totals.',
    '- Physical LOC counts non-empty and empty lines, excluding the terminal empty split; nonblank LOC exclude whitespace-only lines. Cyclomatic complexity is a **syntactic proxy**: one per function/method/constructor/accessor/arrow plus one for each if, loop, non-default switch case, catch, conditional expression and `&&`/`||`/`??` in a callable. Module-level decisions (e.g. Phase 1 `Main.ts`) are reported **separately**, not silently dropped. No implicit branching or dependency code is counted. A renamed/moved file is accounted as a removal and addition in the per-file comparison. This is not a proof of maintainability.',
    ...(bHash === tHash ? ['- **WARNING:** target resolves to the baseline; Phase 2 changes are not represented by this committed tree. Regenerate against final `p2` after tagging.'] : []),
    ...(!targetIsTag ? [`- **WARNING:** target \`${target}\` is not a local tag; this is an interim committed-tree report, not a tagged Phase 2 release.`] : []),
    ...(hasWorkingChanges ? ['- **WARNING:** working-tree changes (including untracked sources) exist; none is counted in either committed tree (use `git status` for details). A zero VSCode row does not imply the extension is absent locally.'] : []),
    '', '## By category (VSCode separate)', '',
    '| Category | Files baseline → target | Physical LOC baseline → target (Δ) | Nonblank LOC baseline → target (Δ) | Callable units baseline → target (Δ) | Syntactic complexity baseline → target (Δ) | Module-level decisions baseline → target (Δ) |',
    '|---|---:|---:|---:|---:|---:|---:|',
  ];
  const categories = ['core', 'assembly/adapters', 'plugin', 'UNCLASSIFIED CLI', 'VSCode (separate)'];
  for (const category of categories) {
    const b = base.get(category), t = current.get(category);
    const field = (key) => `${b?.[key] ?? 0} → ${t?.[key] ?? 0} (${delta(b, t, key) >= 0 ? '+' : ''}${delta(b, t, key)})`;
    md.push(`| ${category} | ${field('files')} | ${field('lines')} | ${field('nonblank')} | ${field('functions')} | ${field('complexity')} | ${field('topLevelDecisions')} |`);
  }
  const cli = ['core', 'assembly/adapters', 'plugin', 'UNCLASSIFIED CLI'];
  const sum = (entries, key) => cli.reduce((n, cat) => n + (entries.get(cat)?.[key] ?? 0), 0);
  md.push(`| **CLI total** | ${sum(base,'files')} → ${sum(current,'files')} | ${sum(base,'lines')} → ${sum(current,'lines')} (${sum(current,'lines')-sum(base,'lines')}) | ${sum(base,'nonblank')} → ${sum(current,'nonblank')} (${sum(current,'nonblank')-sum(base,'nonblank')}) | ${sum(base,'functions')} → ${sum(current,'functions')} | ${sum(base,'complexity')} → ${sum(current,'complexity')} (${sum(current,'complexity')-sum(base,'complexity')}) | ${sum(base,'topLevelDecisions')} → ${sum(current,'topLevelDecisions')} (${sum(current,'topLevelDecisions')-sum(base,'topLevelDecisions')}) |`);
  md.push('', '## File inventory and responsibilities', '',
    'Responsibilities come from the reviewed responsibilities.json at the target Git revision; declarations and every number come from its committed source syntax tree. Missing responsibility entries fail generation.', '',
    '| File | Category | Responsibility / declarations | Physical LOC | Nonblank LOC | Complexity baseline → target (Δ) | Module-level decisions baseline → target (Δ) |',
    '|---|---|---|---:|---:|---:|---:|');
  for (const path of [...new Set([...before.keys(), ...after.keys()])].sort()) {
    const b = before.get(path), t = after.get(path);
    md.push(`| \`${markdownCell(path)}\` | ${t?.category ?? b.category} | ${markdownCell(t ? responsibilities[path] + ' [' + t.declarations + ']' : '(removed from target)')} | ${t?.lines ?? 0} | ${t?.nonblank ?? 0} | ${b?.complexity ?? 0} → ${t?.complexity ?? 0} (${delta(b,t,'complexity') >= 0 ? '+' : ''}${delta(b,t,'complexity')}) | ${b?.topLevelDecisions ?? 0} → ${t?.topLevelDecisions ?? 0} (${delta(b,t,'topLevelDecisions') >= 0 ? '+' : ''}${delta(b,t,'topLevelDecisions')}) |`);
  }
  md.push('', '## Reproduce', '',
    '```sh', 'npm ci', 'node docs/metrics/generate.mjs --baseline final --target p2', '```', '',
    'Before the final tag exists, run `node docs/metrics/generate.mjs --baseline final --target HEAD` for a **committed interim** comparison only. The output is intentionally not based on uncommitted working files.',
    '');
  writeFileSync(output, md.join('\n'), 'utf8');
  console.log(`Wrote ${output} for ${bHash.slice(0,7)}..${tHash.slice(0,7)}`);
} catch (error) {
  console.error(`error: metrics generation failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
