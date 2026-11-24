import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { Editor } from '../src/application/Editor.js';
import { AttributeHandlers } from '../src/application/AttributeHandlers.js';
import { CommandRegistry } from '../src/application/CommandRegistry.js';
import { TreeDecorators } from '../src/application/TreeDecorators.js';
import { CommandFactory } from '../src/cli/CommandFactory.js';
import { CommandDispatcher } from '../src/cli/CommandDispatcher.js';
import { PluginInstaller } from '../src/cli/PluginInstaller.js';
import { ShapeFactory } from '../src/domain/ShapeFactory.js';
import { SvgCodec } from '../src/infrastructure/SvgCodec.js';
import { NodeDocumentStore } from '../src/infrastructure/NodeDocumentStore.js';
import { Box } from '../src/plugins/Box.js';
import { BoxPlugin } from '../src/plugins/BoxPlugin.js';
import { DirPlugin } from '../src/plugins/DirPlugin.js';
import type { DirectoryAccess } from '../src/plugins/DirectoryAccess.js';
import { NodeDirectoryAccess } from '../src/plugins/NodeDirectoryAccess.js';
import { StarPlugin } from '../src/plugins/StarPlugin.js';
import { StatsPlugin } from '../src/plugins/StatsPlugin.js';
import { MemoryDocumentStore } from './MemoryDocumentStore.js';

function setup(...plugins: ('stats' | 'dir' | 'box' | 'star')[]) {
  const shapes = new ShapeFactory();
  const attributes = new AttributeHandlers();
  const decorators = new TreeDecorators();
  const commands = new CommandRegistry();
  const store = new MemoryDocumentStore();
  const editor = new Editor(store, shapes, attributes, decorators);
  const factory = new CommandFactory(editor, commands);
  const cli = new CommandDispatcher(editor, factory);
  const installer = new PluginInstaller(shapes, commands, decorators, attributes, (name) => factory.has(name));
  for (const plugin of plugins) {
    const implementation = { stats: new StatsPlugin(), dir: new DirPlugin(), box: new BoxPlugin(), star: new StarPlugin() }[plugin];
    assert.equal(installer.install(implementation), undefined);
  }
  return { shapes, attributes, decorators, store, editor, cli, installer };
}

function ok(cli: CommandDispatcher, ...lines: string[]): void {
  for (const line of lines) assert.doesNotMatch(cli.run(line).join('\n'), /^error:/, line);
}

test('independent stats plugin walks containers and leaves depth-first, preserves state and history', () => {
  const { editor, cli } = setup('stats', 'box');
  assert.deepEqual(cli.run('stats'), ["error: no document. use 'init' or 'read' first"]);
  ok(cli, 'init');
  assert.deepEqual(cli.run('stats'), ['(total 0, containers 0)']);
  ok(cli, 'create g outer', 'create rect a 0 0 1 1 in outer', 'create box b 10 20 30 40 "test" in outer',
    'create rect c 0 0 1 1', 'create circle d 1 1 1');
  assert.deepEqual(cli.run('stats'), ['rect: 3  text: 1  circle: 1  (total 5, containers 2)']);
  assert.equal(editor.inspect().count, 7);
  ok(cli, 'undo');
  assert.deepEqual(cli.run('stats'), ['rect: 3  text: 1  (total 4, containers 2)']);
  ok(cli, 'redo');
  assert.deepEqual(cli.run('stats'), ['rect: 3  text: 1  circle: 1  (total 5, containers 2)']);
  assert.deepEqual(cli.run('stats extra'), ['error: usage: stats']);
  assert.ok(cli.run('help').includes('stats'));
  assert.deepEqual(setup().cli.run('stats'), ['error: unknown command: stats']);
});

test('dir plugin adapter sorts directories/files/other, hides dot entries only, works before init and preserves redo', () => {
  let listing: ReturnType<DirectoryAccess['list']> = [
    { name: 'z.svg', kind: 'file' }, { name: 'beta', kind: 'directory' },
    { name: '.hidden', kind: 'file' }, { name: 'alpha', kind: 'directory' },
    { name: 'link', kind: 'other' }, { name: '.', kind: 'directory' }, { name: '..', kind: 'directory' },
  ];
  let fail = false;
  const adapter: DirectoryAccess = { cwd: () => '/fixed', list: (path) => {
    assert.equal(path, '/fixed');
    if (fail) throw new Error('denied');
    return listing;
  } };
  const h = setup();
  assert.equal(h.installer.install(new DirPlugin(adapter)), undefined);
  const lines = ['[DIR]  alpha', '[DIR]  beta', '[FILE]  .hidden', '[FILE]  z.svg', '[OTHER]  link'];
  assert.deepEqual(h.cli.run('dir'), lines);
  assert.deepEqual(h.cli.run('dir'), lines);
  assert.deepEqual(h.cli.run('dir extra'), ['error: usage: dir']);
  assert.ok(h.cli.run('help').includes('dir'));
  listing = [];
  assert.deepEqual(h.cli.run('dir'), ['(empty directory)']);
  ok(h.cli, 'init', 'create rect a 0 0 1 1', 'move a 1 0', 'undo');
  const before = new SvgCodec().encode(h.editor.inspect());
  fail = true;
  assert.deepEqual(h.cli.run('dir'), ['error: cannot read directory: /fixed']);
  assert.equal(new SvgCodec().encode(h.editor.inspect()), before);
  fail = false;
  assert.deepEqual(h.cli.run('dir'), ['(empty directory)']);
  ok(h.cli, 'redo');
  assert.equal(h.editor.inspect().get('a').attributes.get('x'), '1');
  assert.deepEqual(setup().cli.run('dir'), ['error: unknown command: dir']);
});

test('real Node directory adapter combines with command; optional symlink is reported as OTHER', () => {
  const path = mkdtempSync(join(tmpdir(), 'svg-dir-'));
  try {
    mkdirSync(join(path, 'beta'));
    mkdirSync(join(path, 'alpha'));
    writeFileSync(join(path, 'z.txt'), 'z');
    writeFileSync(join(path, '.hidden'), 'hidden');
    const node = new NodeDirectoryAccess();
    const h = setup();
    assert.equal(h.installer.install(new DirPlugin({ cwd: () => path, list: (p) => node.list(p) })), undefined);
    let suffix: string[] = [];
    try { symlinkSync(join(path, 'z.txt'), join(path, 'link')); suffix = ['[OTHER]  link']; }
    catch { /* Symlink creation is not permitted in every Windows environment. */ }
    assert.deepEqual(h.cli.run('dir'), [
      '[DIR]  alpha', '[DIR]  beta', '[FILE]  .hidden', '[FILE]  z.txt', ...suffix,
    ]);
  } finally { rmSync(path, { recursive: true, force: true }); }
});

test('box child ids are atomic; ordinary detaching commands fail while box remains valid', () => {
  const h = setup('box');
  ok(h.cli, 'init', 'create rect b-label 0 0 1 1');
  const before = new SvgCodec(h.shapes).encode(h.editor.inspect());
  assert.deepEqual(h.cli.run('create box b 0 0 10 10 "x"'), ['error: id already exists: b-label']);
  assert.equal(new SvgCodec(h.shapes).encode(h.editor.inspect()), before);
  ok(h.cli, 'create box other 0 0 10 10 "title"');
  const intact = new SvgCodec(h.shapes).encode(h.editor.inspect());
  for (const command of ['delete other-label', 'delete other-rect', 'addto other other-label',
    'group g other-rect', 'ungroup other']) {
    assert.match(h.cli.run(command)[0]!, /^error:/, command);
    assert.equal(new SvgCodec(h.shapes).encode(h.editor.inspect()), intact, command);
  }
  ok(h.cli, 'move other 2 3', 'undo', 'redo');
  assert.ok(h.editor.inspect().get('other') instanceof Box);
});

test('box import refuses missing/wrong children and duplicate ids, preserving document and redo history', () => {
  const h = setup('box');
  ok(h.cli, 'init', 'create rect safe 0 0 1 1', 'move safe 1 0', 'undo');
  const before = new SvgCodec(h.shapes).encode(h.editor.inspect());
  for (const invalid of [
    '<g id="b" data-kind="box"><rect id="b-rect" x="0" y="0" width="1" height="1"/></g>',
    '<g id="b" data-kind="box"><circle id="b-rect" cx="0" cy="0" r="1"/><text id="b-label" x="0" y="0">t</text></g>',
    '<g id="b" data-kind="box"><rect id="b-rect" x="0" y="0" width="1" height="1"/><text id="b-label" x="0" y="0">t</text><text id="b-label" x="0" y="0">again</text></g>',
  ]) {
    const path = 'bad.svg';
    const source = `<svg width="100" height="100">${invalid}</svg>`;
    // In-memory store takes validated documents only; direct decoder checks atomic import.
    assert.throws(() => new SvgCodec(h.shapes).decode(source), /invalid box structure|id already exists/);
    assert.equal(new SvgCodec(h.shapes).encode(h.editor.inspect()), before, path);
  }
  ok(h.cli, 'redo');
  assert.equal(h.editor.inspect().get('safe').attributes.get('x'), '1');
  const box = new SvgCodec(h.shapes).decode('<svg width="100" height="100"><g id="b" data-kind="box"><rect id="b-rect" x="0" y="0" width="1" height="1"/><text id="b-label" x="0" y="0">t</text></g></svg>').document;
  assert.ok(box.get('b') instanceof Box);
  assert.equal(new SvgCodec().decode(new SvgCodec(h.shapes).encode(box)).document.get('b') instanceof Box, false);
});

test('failed read of malformed box keeps current document, dirty label and redo branch', () => {
  const path = mkdtempSync(join(tmpdir(), 'svg-box-read-'));
  try {
    const shapes = new ShapeFactory();
    const attributes = new AttributeHandlers();
    const decorators = new TreeDecorators();
    const registry = new CommandRegistry();
    const editor = new Editor(new NodeDocumentStore(new SvgCodec(shapes)), shapes, attributes, decorators);
    const factory = new CommandFactory(editor, registry);
    const cli = new CommandDispatcher(editor, factory);
    const installer = new PluginInstaller(shapes, registry, decorators, attributes, (name) => factory.has(name));
    assert.equal(installer.install(new BoxPlugin()), undefined);
    assert.equal(installer.install(new StarPlugin()), undefined);
    ok(cli, 'init', 'create box b 0 0 10 20 "saved"', `save "${join(path, 'ok.svg')}"`,
      'set b label "dirty"', 'undo');
    const before = new SvgCodec(shapes).encode(editor.inspect());
    const bad = join(path, 'bad.svg');
    writeFileSync(bad, '<svg width="100" height="100"><g id="b" data-kind="box"><rect id="b-rect" x="0" y="0" width="1" height="1"/></g></svg>');
    assert.match(cli.run(`read "${bad}"`)[0]!, /^error: invalid SVG: invalid box structure/);
    assert.equal(new SvgCodec(shapes).encode(editor.inspect()), before);
    assert.doesNotMatch(cli.run('tree').join('\n'), / \*/);
    ok(cli, 'redo');
    assert.equal(editor.inspect().get('b-label').text, 'dirty');
  } finally { rmSync(path, { recursive: true, force: true }); }
});

test('saved nested box round-trips through real files with plugin and degrades to a group without it', () => {
  const dir = mkdtempSync(join(tmpdir(), 'svg-box-roundtrip-'));
  try {
    const shapes = new ShapeFactory();
    const attributes = new AttributeHandlers();
    const decorators = new TreeDecorators();
    const commands = new CommandRegistry();
    const editor = new Editor(new NodeDocumentStore(new SvgCodec(shapes)), shapes, attributes, decorators);
    const factory = new CommandFactory(editor, commands);
    const cli = new CommandDispatcher(editor, factory);
    const installer = new PluginInstaller(shapes, commands, decorators, attributes, (name) => factory.has(name));
    for (const plugin of [new BoxPlugin(), new StarPlugin(), new StatsPlugin()])
      assert.equal(installer.install(plugin), undefined);
    const source = join(dir, 'nested.svg');
    ok(cli, 'init', 'create g outer', 'create box parent 10 20 100 60 "父" in outer',
      'create box child 20 30 50 25 "子" in parent', 'set parent fill #f5a623',
      'set child label "新标题"', `save "${source}"`);
    const serialized = readFileSync(source, 'utf8');
    assert.equal((serialized.match(/data-kind="box"/g) ?? []).length, 2);
    const expectedStats = cli.run('stats');
    const expectedTree = cli.run('tree');
    assert.doesNotMatch(expectedTree.join('\n'), / \*$/m);
    const withBox = new NodeDocumentStore(new SvgCodec(shapes));
    assert.equal(new SvgCodec(shapes).encode(withBox.read(source).document), serialized);
    ok(cli, `read "${source}"`);
    assert.deepEqual(cli.run('stats'), expectedStats);
    assert.deepEqual(cli.run('tree'), expectedTree);
    assert.ok(editor.inspect().get('parent') instanceof Box);
    assert.ok(editor.inspect().get('child') instanceof Box);
    assert.equal(editor.inspect().get('parent-rect').attributes.get('fill'), '#f5a623');
    assert.equal(editor.inspect().get('child-label').text, '新标题');

    const fallback = new NodeDocumentStore(new SvgCodec()).read(source).document;
    assert.equal(fallback.get('parent') instanceof Box, false);
    assert.equal(fallback.get('child') instanceof Box, false);
    assert.equal(fallback.get('parent').tag, 'g');
    assert.equal(fallback.get('parent').attributes.get('data-kind'), 'box');
    assert.equal(fallback.get('child-label').text, '新标题');
    assert.equal(new SvgCodec().encode(fallback), serialized);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('attribute handler handles box fill/label with one undo each and default white-list', () => {
  const h = setup('box');
  ok(h.cli, 'init', 'create box b 0 0 10 20 "old"', 'create rect r 0 0 1 1');
  assert.equal(h.attributes.has('box-attributes'), true);
  ok(h.cli, 'set b fill #f5a623');
  assert.equal(h.editor.inspect().get('b-rect').attributes.get('fill'), '#f5a623');
  ok(h.cli, 'undo');
  assert.equal(h.editor.inspect().get('b-rect').attributes.get('fill'), '#4a90d9');
  ok(h.cli, 'redo', 'set b label "new title"');
  assert.equal(h.editor.inspect().get('b-label').text, 'new title');
  ok(h.cli, 'undo');
  assert.equal(h.editor.inspect().get('b-label').text, 'old');
  ok(h.cli, 'redo', 'set r fill red');
  assert.equal(h.editor.inspect().get('r').attributes.get('fill'), 'red');
  assert.deepEqual(h.cli.run('set r label nope'), ['error: unknown attribute: label']);
});

test('ambiguous handlers and partially failing handlers roll back the draft without changing redo history', () => {
  const h = setup('box');
  ok(h.cli, 'init', 'create box b 0 0 10 20 "old"', 'set b label "new"', 'undo');
  const codec = new SvgCodec(h.shapes);
  const before = codec.encode(h.editor.inspect());
  h.attributes.register({ name: 'ambiguous', handles: (shape, attr) => shape instanceof Box && attr === 'fill', apply() { throw new Error('must not run'); } });
  assert.deepEqual(h.cli.run('set b fill red'), ['error: ambiguous attribute handler: fill']);
  h.attributes.remove('ambiguous');
  h.attributes.register({ name: 'failing', handles: (shape, attr) => shape instanceof Box && attr === 'explode',
    apply(shape) { shape.children[0]!.set('fill', 'changed'); throw new Error('partial failure'); } });
  assert.deepEqual(h.cli.run('set b explode x'), ['error: partial failure']);
  assert.equal(codec.encode(h.editor.inspect()), before);
  ok(h.cli, 'redo');
  assert.equal(h.editor.inspect().get('b-label').text, 'new');
});

test('two independent tree labels compose in registration order; dirty compares to save point incl. ancestors', () => {
  const h = setup('box', 'star');
  ok(h.cli, 'init');
  assert.deepEqual(h.cli.run('tree'), ['svg (800x600)']);
  ok(h.cli, 'create box b 0 0 10 20 "old"');
  let tree = h.cli.run('tree');
  assert.equal(tree[0], 'svg (800x600) *');
  assert.match(tree[1]!, /\(box\) \*$/);
  assert.match(tree[2]!, / \*$/);
  ok(h.cli, 'save first.svg');
  tree = h.cli.run('tree');
  assert.equal(tree[0], 'svg (800x600)');
  assert.match(tree[1]!, /\(box\)$/);
  ok(h.cli, 'set b label "changed"');
  tree = h.cli.run('tree');
  assert.match(tree[1]!, /\(box\) \*$/);
  assert.doesNotMatch(tree[2]!, / \*$/);
  assert.match(tree[3]!, / \*$/);
  ok(h.cli, 'undo');
  assert.doesNotMatch(h.cli.run('tree').join('\n'), / \*/);
  ok(h.cli, 'redo');
  assert.match(h.cli.run('tree')[3]!, / \*$/);
  ok(h.cli, 'save first.svg');
  assert.doesNotMatch(h.cli.run('tree').join('\n'), / \*/);
  const without = setup();
  ok(without.cli, 'init', 'create rect r 1 2 3 4');
  assert.deepEqual(without.cli.run('tree'), ['svg (800x600)', '└── rect#r  x=1 y=2 w=3 h=4']);
});

test('modified-star keeps its checkpoint per instance across failed save, read, and undo', () => {
  const first = setup('star');
  const second = setup('star');
  ok(first.cli, 'init', 'create rect r 0 0 10 10');
  ok(second.cli, 'init');
  assert.match(first.cli.run('tree')[0]!, / \*$/);
  assert.deepEqual(second.cli.run('tree'), ['svg (800x600)']);
  first.store.failWrites = true;
  assert.deepEqual(first.cli.run('save scene.svg'), ['error: cannot write file: scene.svg']);
  assert.match(first.cli.run('tree')[0]!, / \*$/);
  first.store.failWrites = false;
  ok(first.cli, 'save scene.svg');
  assert.doesNotMatch(first.cli.run('tree').join('\n'), / \*/);
  ok(first.cli, 'set r fill red');
  assert.match(first.cli.run('tree')[1]!, / \*$/);
  ok(first.cli, 'undo');
  assert.doesNotMatch(first.cli.run('tree').join('\n'), / \*/);
  ok(first.cli, 'redo', 'read scene.svg');
  assert.doesNotMatch(first.cli.run('tree').join('\n'), / \*/);
  assert.equal(first.editor.inspect().get('r').attributes.get('fill'), undefined);
  assert.deepEqual(first.cli.run('undo'), ['error: undo not allowed after io command']);
  assert.deepEqual(second.cli.run('tree'), ['svg (800x600)']);
});

test('dir uses process cwd rather than read/save document directory', () => {
  const base = mkdtempSync(join(tmpdir(), 'svg-dir-cwd-'));
  try {
    const cwd = join(base, 'work');
    const saved = join(base, 'scene.svg');
    mkdirSync(cwd);
    mkdirSync(join(cwd, 'docs'));
    writeFileSync(join(cwd, 'note.txt'), 'unchanged');
    const input = ['dir', 'init', 'create rect r 0 0 1 1', `save "${saved}"`,
      'dir', `read "${saved}"`, 'dir', 'exit', ''].join('\n');
    const result = spawnSync(process.execPath, [resolve('build/src/Main.js'), '--plugins'], {
      input, cwd, encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);
    assert.doesNotMatch(result.stdout, /^error:/m);
    assert.equal(result.stdout.match(/\[DIR\]  docs\n\[FILE\]  note\.txt/g)?.length, 3);
    assert.match(result.stdout, /saved to .*scene\.svg \(1 elements\)/);
    assert.match(result.stdout, /read .*scene\.svg \(1 elements\)/);
  } finally { rmSync(base, { recursive: true, force: true }); }
});

test('code and config composition produce byte-identical CLI output for same session and fixed directory', () => {
  const path = mkdtempSync(join(tmpdir(), 'svg-composition-'));
  try {
    mkdirSync(join(path, 'docs'));
    writeFileSync(join(path, 'a.txt'), 'content');
    const entry = resolve('build/src/Main.js');
    const config = resolve('plugins.config.json');
    const input = 'dir\ninit\nstats\ncreate box b 0 0 10 20 "old"\nset b label "new"\ntree\nstats\nexit\n';
    const run = (args: string[]) => spawnSync(process.execPath, [entry, ...args], { input, encoding: 'utf8', cwd: path });
    const code = run(['--plugins']);
    const configured = run(['--config', config]);
    assert.equal(code.status, 0, code.stderr);
    assert.equal(configured.status, 0, configured.stderr);
    assert.equal(code.stdout, configured.stdout);
    assert.match(code.stdout, /\[DIR\]  docs\n\[FILE\]  a.txt/);
    assert.match(code.stdout, /rect: 1  text: 1  \(total 2, containers 1\)/);
  } finally { rmSync(path, { recursive: true, force: true }); }
});
