import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Editor } from '../src/application/Editor.js';
import { CommandDispatcher } from '../src/cli/CommandDispatcher.js';
import { MemoryDocumentStore } from './MemoryDocumentStore.js';

test('history treats a multi-shape edit as one unit and supports branching', () => {
  const editor = new Editor(new MemoryDocumentStore()),
    cli = new CommandDispatcher(editor);
  cli.run('init');
  cli.run('create rect a 0 0 10 20');
  cli.run('create circle b 20 30 5');
  cli.run('group both a b');
  assert.equal(editor.inspect().children.length, 1);
  cli.run('undo');
  assert.deepEqual(
    editor.inspect().children.map((s) => s.id),
    ['a', 'b'],
  );
  cli.run('redo');
  assert.equal(editor.inspect().children[0]!.id, 'both');
  cli.run('undo');
  cli.run('move a 5 0');
  assert.deepEqual(cli.run('redo'), ['error: nothing to redo']);
  assert.equal(editor.inspect().get('a').attributes.get('x'), '5');
});

test('failed edits preserve geometry and the redo branch', () => {
  const editor = new Editor(new MemoryDocumentStore()),
    cli = new CommandDispatcher(editor);
  cli.run('init');
  cli.run('create rect a 0 0 10 20');
  cli.run('move a 5 0');
  cli.run('undo');
  const before = cli.run('tree');
  assert.deepEqual(cli.run('scale a 0'), ['error: scale factor must be positive']);
  assert.deepEqual(cli.run('create rect a 1 2 3 4'), ['error: id already exists: a']);
  assert.deepEqual(cli.run('group bad a missing'), ['error: no such shape: missing']);
  assert.deepEqual(cli.run('tree'), before);
  cli.run('redo');
  assert.equal(editor.inspect().get('a').attributes.get('x'), '5');
});

test('successful IO creates a barrier; display commands and failed IO do not', () => {
  const store = new MemoryDocumentStore(),
    editor = new Editor(store),
    cli = new CommandDispatcher(editor);
  assert.deepEqual(cli.run('tree'), ["error: no document. use 'init' or 'read' first"]);
  cli.run('init');
  assert.deepEqual(cli.run('undo'), ['error: undo not allowed after io command']);
  cli.run('create g scene');
  cli.run('save saved.svg');
  assert.deepEqual(cli.run('redo'), ['error: undo not allowed after io command']);
  cli.run('create circle c 1 2 3');
  cli.run('tree');
  cli.run('show c');
  cli.run('canvas');
  cli.run('help');
  assert.match(cli.run('undo').join(''), /undone/);
  store.failWrites = true;
  assert.deepEqual(cli.run('save fail.svg'), ['error: cannot write file: fail.svg']);
  assert.match(cli.run('redo').join(''), /redone/);
  assert.deepEqual(cli.run('read missing.svg'), ['error: cannot read file: missing.svg']);
  assert.equal(editor.inspect().count, 2);
  cli.run('canvas 200 300');
  assert.deepEqual(cli.run('undo'), ['error: undo not allowed after io command']);
  cli.run('create g new');
  cli.run('read saved.svg');
  assert.equal(editor.inspect().count, 1);
  assert.deepEqual(cli.run('undo'), ['error: undo not allowed after io command']);
});

test('all editing commands round-trip using undo/redo', () => {
  const editor = new Editor(new MemoryDocumentStore()),
    cli = new CommandDispatcher(editor);
  for (const line of [
    'init',
    'create g outer',
    'create g inner in outer',
    'create text t 1 2 "Hello world" in inner',
    'create ellipse e 5 6 7 8 in outer',
    'create line l 1 2 3 4 black in outer',
  ])
    assert.ok(!cli.run(line)[0]!.startsWith('error:'));
  for (const line of [
    'move inner 2 3',
    'scale outer 2',
    'set inner fill red',
    'set t text ""',
    'addto inner e',
    'front inner',
    'back inner',
    'ungroup inner',
    'delete outer',
  ]) {
    const before = cli.run('tree');
    const output = cli.run(line);
    assert.ok(!output[0]!.startsWith('error:'), output.join(''));
    const after = cli.run('tree');
    cli.run('undo');
    assert.deepEqual(cli.run('tree'), before, line);
    cli.run('redo');
    assert.deepEqual(cli.run('tree'), after, line);
  }
});

test('parser preserves quoted text, hex colors and Windows paths', () => {
  const editor = new Editor(new MemoryDocumentStore()),
    cli = new CommandDispatcher(editor);
  assert.deepEqual(cli.run(' # comment'), []);
  cli.run('init');
  cli.run('create rect r 1 2 3 4 #112233');
  cli.run('create text t 1 2 "A \\"quote\\" & <tag>"');
  assert.equal(editor.inspect().get('t').text, 'A "quote" & <tag>');
  assert.equal(editor.inspect().get('r').attributes.get('fill'), '#112233');
  assert.deepEqual(cli.run('set t text "unfinished'), ['error: unterminated quote']);
  assert.equal(
    cli.run('save "C:\\work dir\\a.svg"')[0],
    'saved to C:\\work dir\\a.svg (2 elements)',
  );
  assert.match(cli.run('save')[0]!, /saved to C:/);
});

test('overflow midway through a composite operation rolls back every child', () => {
  const editor = new Editor(new MemoryDocumentStore()),
    cli = new CommandDispatcher(editor);
  for (const line of [
    'init',
    'create g g',
    'create rect a 1 2 3 4 in g',
    'create rect b 1e308 0 1 1 in g',
  ])
    cli.run(line);
  const before = cli.run('tree');
  assert.match(cli.run('scale g 2')[0]!, /^error:/);
  assert.deepEqual(cli.run('tree'), before);
  cli.run('undo');
  assert.equal(editor.inspect().count, 2);
});
