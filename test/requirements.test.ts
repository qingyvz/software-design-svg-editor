import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Editor } from '../src/application/Editor.js';
import { CommandDispatcher } from '../src/cli/CommandDispatcher.js';
import { MoveCommand } from '../src/application/commands/MoveCommand.js';
import { MemoryDocumentStore } from './MemoryDocumentStore.js';
import { spawnSync } from 'node:child_process';

test('required errors are exact and never change document or undo history', () => {
  const editor = new Editor(new MemoryDocumentStore()), cli = new CommandDispatcher(editor);
  for (const line of ['init', 'create g scene', 'create g child in scene', 'create rect r 10 20 30 40 in child']) cli.run(line);
  const before = cli.run('tree');
  const cases: readonly (readonly [string, string])[] = [
    ['create g r', 'id already exists: r'], ['move absent 1 2', 'no such shape: absent'],
    ['create g x in node9', 'no such container: node9'], ['create g x in r', 'not a container: r'],
    ['create hexagon x', 'unknown shape type: hexagon (is the plugin loaded?)'],
    ['create box x 1 2 3 4 "box"', 'unknown shape type: box (is the plugin loaded?)'],
    ['group bad scene r', 'cannot group a container into its own descendant: scene'],
    ['ungroup scene', 'cannot ungroup top-level container: scene'],
    ['scale r -1', 'scale factor must be positive'], ['set r id new', 'unknown attribute: id'],
    ['set child x 4', 'unknown attribute: x'], ['addto child scene', 'cannot move a container into its own descendant: scene'],
    ['group new r r', 'duplicate shape in group'],
  ];
  for (const [line, error] of cases) {
    assert.deepEqual(cli.run(line), ['error: ' + error], line);
    assert.deepEqual(cli.run('tree'), before, line);
  }
  cli.run('undo');
  assert.throws(() => editor.inspect().get('r'), /no such shape/);
});

test('scale multiplies all geometry, not style or text, and ids are case-sensitive', () => {
  const editor = new Editor(new MemoryDocumentStore()), cli = new CommandDispatcher(editor);
  for (const line of ['init', 'create circle c -2 3 4', 'set c stroke-width 2', 'create text C 5 6 "text"', 'scale c 0.5', 'scale C 2']) cli.run(line);
  assert.deepEqual([...editor.inspect().get('c').attributes], [['cx', '-1'], ['cy', '1.5'], ['r', '2'], ['stroke-width', '2']]);
  assert.equal(editor.inspect().get('C').text, 'text');
  assert.equal(editor.inspect().get('C').attributes.get('x'), '10');
  cli.run('set C x 1e2'); assert.equal(editor.inspect().get('C').attributes.get('x'), '100');
});

test('z-order stays within siblings and undo restores exact insertion positions', () => {
  const editor = new Editor(new MemoryDocumentStore()), cli = new CommandDispatcher(editor);
  for (const line of ['init', 'create g g', 'create g a in g', 'create g b in g', 'create g c in g', 'create g other']) cli.run(line);
  cli.run('front a');
  assert.deepEqual(editor.inspect().get('g').children.map(s => s.id), ['b', 'c', 'a']);
  cli.run('back c');
  assert.deepEqual(editor.inspect().get('g').children.map(s => s.id), ['c', 'b', 'a']);
  cli.run('undo'); cli.run('undo');
  assert.deepEqual(editor.inspect().get('g').children.map(s => s.id), ['a', 'b', 'c']);
  assert.deepEqual(editor.inspect().children.map(s => s.id), ['g', 'other']);
  cli.run('addto g a');
  assert.deepEqual(editor.inspect().get('g').children.map(s => s.id), ['b', 'c', 'a']);
  cli.run('undo');
  assert.deepEqual(editor.inspect().get('g').children.map(s => s.id), ['a', 'b', 'c']);
});

test('reusing a typed command does not overwrite earlier undo records', () => {
  const editor = new Editor(new MemoryDocumentStore()), cli = new CommandDispatcher(editor);
  cli.run('init'); cli.run('create rect r 0 0 1 1');
  const move = new MoveCommand(editor, 'r', 1, 0);
  move.execute(); move.execute();
  assert.equal(editor.inspect().get('r').attributes.get('x'), '2');
  editor.undo(); assert.equal(editor.inspect().get('r').attributes.get('x'), '1');
  editor.undo(); assert.equal(editor.inspect().get('r').attributes.get('x'), '0');
  editor.redo(); assert.equal(editor.inspect().get('r').attributes.get('x'), '1');
});

test('default filename follows successful read/save and is reset on init', () => {
  const store = new MemoryDocumentStore(), editor = new Editor(store), cli = new CommandDispatcher(editor);
  cli.run('init'); assert.deepEqual(cli.run('save'), ['error: no file path. use save <file.svg>']);
  cli.run('save first.svg'); cli.run('save second.svg'); cli.run('read first.svg');
  assert.deepEqual(cli.run('save'), ['saved to first.svg (0 elements)']);
  cli.run('init 300'); assert.deepEqual(cli.run('canvas'), ['canvas 300x600']);
  assert.deepEqual(cli.run('save'), ['error: no file path. use save <file.svg>']);
});

test('invalid syntax is rejected before mutation and empty undo stacks are clear', () => {
  const editor = new Editor(new MemoryDocumentStore()), cli = new CommandDispatcher(editor);
  assert.match(cli.run('help')[0]!, /init/);
  cli.run('init'); cli.run('create g a'); cli.run('undo');
  assert.deepEqual(cli.run('undo'), ['error: nothing to undo']);
  for (const line of ['canvas 10', 'move a 1', 'create', 'undo extra', 'scale a Infinity', 'init 1 2 3', 'nonsense']) {
    assert.match(cli.run(line)[0]!, /^error:/);
    assert.equal(editor.inspect().count, 0);
  }
  cli.run('redo'); assert.equal(editor.inspect().count, 1);
});

test('full course transcript preserves the expected scene and history boundary', () => {
  const editor = new Editor(new MemoryDocumentStore()), cli = new CommandDispatcher(editor);
  for (const line of ['init 800 600', 'create rect bg 0 0 800 600 #ffffff', 'create text title 20 40 "My Diagram"',
    'create circle c1 100 100 20 red', 'create rect box 200 80 60 60 #3366ff', 'group markers c1 box',
    'move c1 30 0', 'undo', 'redo', 'set title text "My Diagram v2"', 'undo', 'delete box', 'undo']) {
    assert.ok(!cli.run(line)[0]!.startsWith('error:'), line);
  }
  assert.equal(editor.inspect().get('c1').attributes.get('cx'), '130');
  assert.equal(editor.inspect().get('title').text, 'My Diagram');
  const document = editor.inspect();
  assert.equal(document.parentLabel(document.get('box')), 'g#markers');
  assert.deepEqual(cli.run('save demo.svg'), ['saved to demo.svg (5 elements)']);
  assert.deepEqual(cli.run('undo'), ['error: undo not allowed after io command']);
});

test('CLI accepts EOF and exit, rejects unsupported startup arguments', () => {
  const result = spawnSync(process.execPath, ['build/src/Main.js'], { input: 'help\ninit\nexit\ncreate g should-not-run\n', encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr); assert.match(result.stdout, /bye/);
  assert.doesNotMatch(result.stdout, /should-not-run/);
  const invalid = spawnSync(process.execPath, ['build/src/Main.js', '--wrong'], { encoding: 'utf8' });
  assert.equal(invalid.status, 1); assert.match(invalid.stderr, /^error: usage:/);
});
