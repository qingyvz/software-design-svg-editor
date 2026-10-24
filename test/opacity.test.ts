import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SvgCodec } from '../src/infrastructure/SvgCodec.js';
import { Editor } from '../src/application/Editor.js';
import { CommandDispatcher } from '../src/cli/CommandDispatcher.js';
import { MemoryDocumentStore } from './MemoryDocumentStore.js';

test('ungroup multiplies object opacity but only inherits paint opacity', () => {
  const codec = new SvgCodec();
  const document = codec.decode(
    '<svg><g id="outer"><g id="inner" opacity="0.5" fill-opacity="0.4"><rect id="r" width="50" height="50" opacity="0.5" fill-opacity="0.8"/></g></g></svg>',
  ).document;
  document.ungroup('inner');
  assert.equal(document.get('r').attributes.get('opacity'), '0.25');
  assert.equal(document.get('r').attributes.get('fill-opacity'), '0.8');
  const restored = codec.decode(codec.encode(document)).document;
  assert.equal(restored.get('r').attributes.get('opacity'), '0.25');
});

test('ungroup preserves a nested child group as one compositing unit', () => {
  const document = new SvgCodec().decode(
    '<svg><g id="outer"><g id="inner" opacity="0.5"><g id="child" opacity="0.5"><rect id="a" width="50" height="50"/><rect id="b" x="10" width="50" height="50"/></g></g></g></svg>',
  ).document;
  document.ungroup('inner');
  assert.equal(document.get('child').attributes.get('opacity'), '0.25');
  assert.equal(document.get('child').children.length, 2);
  assert.equal(document.get('a').attributes.has('opacity'), false);
});

test('ungroup refuses to distribute group opacity across overlapping children', () => {
  const codec = new SvgCodec();
  const document = codec.decode(
    '<svg><g id="outer"><g id="inner" opacity="0.5"><rect id="a" width="50" height="50"/><rect id="b" x="10" width="50" height="50"/></g></g></svg>',
  ).document;
  const store = new MemoryDocumentStore();
  store.write('scene.svg', document);
  const editor = new Editor(store);
  const cli = new CommandDispatcher(editor);
  cli.run('read scene.svg');
  cli.run('move a 1 0');
  cli.run('undo');
  const before = codec.encode(editor.inspect());
  assert.match(cli.run('ungroup inner')[0]!, /cannot ungroup.*opacity/);
  assert.equal(codec.encode(editor.inspect()), before);
  assert.match(cli.run('redo')[0]!, /redone/);
  assert.equal(editor.inspect().get('a').attributes.get('x'), '1');
});

test('import validates and normalizes opacity values', () => {
  const codec = new SvgCodec();
  const document = codec.decode(
    '<svg><g id="outer"><g id="inner" opacity="50%"><rect id="r" opacity="50%"/></g></g></svg>',
  ).document;
  document.ungroup('inner');
  assert.equal(document.get('r').attributes.get('opacity'), '0.25');
  assert.equal(
    codec
      .decode('<svg><rect id="r" opacity="2"/></svg>')
      .document.get('r')
      .attributes.get('opacity'),
    '1',
  );
  assert.throws(() => codec.decode('<svg><rect opacity="NaN"/></svg>'), /opacity|number/);
});
