import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Editor } from '../src/application/Editor.js';
import { CommandDispatcher } from '../src/cli/CommandDispatcher.js';
import { SvgCodec } from '../src/infrastructure/SvgCodec.js';
import { MemoryDocumentStore } from './MemoryDocumentStore.js';

test('ungroup resolves explicit inherit against the removed parent and supports undo', () => {
  const editor = new Editor(new MemoryDocumentStore());
  const cli = new CommandDispatcher(editor);
  for (const command of [
    'init', 'create g outer', 'set outer fill blue', 'create g inner in outer',
    'set inner fill red', 'create g child in inner', 'set child fill inherit',
    'create rect r 0 0 10 10 in child',
  ]) assert.ok(!cli.run(command)[0]!.startsWith('error:'), command);
  const codec = new SvgCodec();
  const before = codec.encode(editor.inspect());
  cli.run('ungroup inner');
  assert.equal(editor.inspect().get('child').attributes.get('fill'), 'red');
  cli.run('undo');
  assert.equal(codec.encode(editor.inspect()), before);
  cli.run('redo');
  assert.equal(editor.inspect().get('child').attributes.get('fill'), 'red');
});

test('ungroup materializes inherited paint and font properties without replacing explicit values', () => {
  const codec = new SvgCodec();
  const document = codec.decode('<svg><g id="outer" fill="blue"><g id="inner" fill="red" stroke="green" font-size="24" font-family="serif"><text id="t" x="10" y="20" fill=" inherit " stroke="black" font-size="inherit" font-family="inherit">Text</text></g></g></svg>').document;
  document.ungroup('inner');
  const attributes = document.get('t').attributes;
  assert.equal(attributes.get('fill'), 'red');
  assert.equal(attributes.get('stroke'), 'black');
  assert.equal(attributes.get('font-size'), '24');
  assert.equal(attributes.get('font-family'), 'serif');
  assert.equal(codec.decode(codec.encode(document)).document.get('t').attributes.get('fill'), 'red');
});

test('inherit still follows the remaining ancestor when the removed parent also inherits', () => {
  const document = new SvgCodec().decode('<svg><g id="outer" fill="blue"><g id="inner" fill="inherit"><g id="child" fill="inherit"><rect id="r" width="10" height="10"/></g></g></g></svg>').document;
  document.ungroup('inner');
  assert.equal(document.get('child').attributes.get('fill'), 'inherit');
  assert.equal(document.get('outer').attributes.get('fill'), 'blue');
});
