import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { Editor } from '../src/application/Editor.js';
import { MoveManyCommand } from '../src/application/commands/MoveManyCommand.js';
import { CommandDispatcher } from '../src/cli/CommandDispatcher.js';
import { CommandFactory } from '../src/cli/CommandFactory.js';
import { ShapeFactory } from '../src/domain/ShapeFactory.js';
import { AffineTransform } from '../src/domain/AffineTransform.js';
import { SvgCodec } from '../src/infrastructure/SvgCodec.js';
import { SvgTransform } from '../src/infrastructure/SvgTransform.js';
import { Box } from '../src/plugins/Box.js';
import { BoxProvider } from '../src/plugins/BoxProvider.js';
import { MemoryDocumentStore } from './MemoryDocumentStore.js';
import { AlternateContainer } from './AlternateContainer.js';

function execute(cli: CommandDispatcher, ...commands: string[]): void {
  for (const command of commands) {
    const result = cli.run(command);
    assert.ok(!result.some(line => line.startsWith('error:')), command + ': ' + result.join('\n'));
  }
}

test('affine operations follow SVG multiplication order and keep immutable finite state', () => {
  const transform = SvgTransform.parse('translate(10 20), rotate(90) scale(2,3)');
  assert.deepEqual(transform.point(4, 5), [-5, 28]);
  assert.deepEqual(AffineTransform.rotation(90, 10, 20).point(11, 20), [10, 21]);
  assert.deepEqual(SvgTransform.parse('matrix(1 2 3 4 5 6)').point(7, 8), [36, 52]);
  assert.throws(() => Object.assign(transform, { e: 100 }), TypeError);
  assert.throws(() => new AffineTransform(Infinity), /finite/);
  for (const value of ['rotate(1 2)', 'matrix(1 2 3)', 'translate(1,,2)', 'scale()', 'rotate(30),', 'rotate(30) junk']) {
    assert.throws(() => SvgTransform.parse(value), Error, value);
  }
});

test('rotated, skewed and nonuniform SVG shapes survive import and save', () => {
  const codec = new SvgCodec();
  const xml = '<svg width="300" height="200"><g id="g" transform="translate(50 60) rotate(90)"><rect id="r" x="1" y="2" width="10" height="20"/><ellipse id="e" cx="3" cy="4" rx="5" ry="6" transform="scale(2 3)"/><text id="t" x="7" y="8" transform="skewX(20)">中文</text></g></svg>';
  const document = codec.decode(xml).document;
  assert.deepEqual(document.get('r').transform.point(1, 2), [48, 61]);
  assert.deepEqual(document.get('e').transform.point(3, 4), [38, 66]);
  assert.equal(document.get('t').text, '中文');
  const encoded = codec.encode(document);
  assert.match(encoded, /transform="matrix/);
  assert.equal(codec.encode(codec.decode(encoded).document), encoded);
});

test('batch rotation handles overlapping selection roots and uses one undo unit', () => {
  const editor = new Editor(new MemoryDocumentStore());
  const cli = new CommandDispatcher(editor);
  const codec = new SvgCodec();
  execute(cli, 'init', 'create g g', 'create rect r 1 2 10 20 in g',
    'create ellipse e 3 4 5 6', 'create text t 7 8 "Text"');
  const before = codec.encode(editor.inspect());
  execute(cli, 'rotate 90 0 0 g r e t');
  const rotated = editor.inspect();
  assert.deepEqual(rotated.get('r').transform.point(1, 2), [-2, 1]);
  assert.deepEqual(rotated.get('e').transform.point(3, 4), [-4, 3]);
  assert.deepEqual(rotated.get('t').transform.point(7, 8), [-8, 7]);
  assert.equal(rotated.get('r').attributes.get('width'), '10');
  const after = codec.encode(rotated);
  execute(cli, 'undo');
  assert.equal(codec.encode(editor.inspect()), before);
  execute(cli, 'redo');
  assert.equal(codec.encode(editor.inspect()), after);
});

test('move and CLI scale keep canvas coordinates and stroke width after rotation', () => {
  const editor = new Editor(new MemoryDocumentStore());
  const cli = new CommandDispatcher(editor);
  execute(cli, 'init', 'create rect r 10 20 30 40', 'set r stroke-width 3',
    'rotate 90 100 100 r', 'move r 5 -2', 'scale r 2');
  const shape = editor.inspect().get('r');
  assert.deepEqual(shape.transform.point(Number(shape.attributes.get('x')), Number(shape.attributes.get('y'))), [370, 16]);
  assert.equal(shape.attributes.get('width'), '60');
  assert.equal(shape.attributes.get('stroke-width'), '3');
});

test('batch failures leave all targets and redo history unchanged', () => {
  const editor = new Editor(new MemoryDocumentStore());
  const cli = new CommandDispatcher(editor);
  const codec = new SvgCodec();
  execute(cli, 'init', 'create rect a 1 2 3 4', 'create rect b 1e308 0 1 1',
    'move a 1 0', 'undo');
  const before = codec.encode(editor.inspect());
  assert.match(cli.run('move-many 1e308 0 a b')[0]!, /finite/);
  assert.match(cli.run('rotate 90 0 0 a missing')[0]!, /no such shape/);
  assert.match(cli.run('rotate 90 0 0 a a')[0]!, /duplicate/);
  assert.equal(codec.encode(editor.inspect()), before);
  execute(cli, 'redo');
  assert.equal(editor.inspect().get('a').attributes.get('x'), '2');
});

test('layer scope applies to creation and every editing target', () => {
  const editor = new Editor(new MemoryDocumentStore());
  const cli = new CommandDispatcher(editor);
  const codec = new SvgCodec();
  execute(cli, 'init', 'create g layer', 'create g other',
    'create g inside in layer', 'create rect a 1 2 3 4 in inside',
    'create rect outside 0 0 1 1 in other', 'layer enter layer',
    'create circle added 10 20 3');
  const document = editor.inspect();
  assert.equal(document.parentLabel(document.get('added')), 'g#layer');
  const before = codec.encode(document);
  for (const command of [
    'create rect bad 0 0 1 1 in other', 'delete outside', 'delete layer',
    'move outside 1 2', 'scale outside 2', 'set outside fill red',
    'group bad a outside', 'ungroup other', 'addto other a', 'addto inside outside',
    'front outside', 'back outside', 'rotate 30 0 0 a outside', 'move-many 1 2 a outside',
  ]) {
    assert.match(cli.run(command)[0]!, /outside active layer/, command);
    assert.equal(codec.encode(editor.inspect()), before, command);
  }
  execute(cli, 'rotate 30 0 0 a added', 'undo', 'redo', 'layer leave', 'move outside 1 2');
  assert.equal(editor.activeLayer, undefined);
});

test('layer transitions keep history, reject missing layers and recover after undo or read', () => {
  const store = new MemoryDocumentStore();
  const editor = new Editor(store);
  const cli = new CommandDispatcher(editor);
  execute(cli, 'init', 'create g layer', 'layer enter layer');
  assert.match(cli.run('layer enter missing')[0]!, /no such container/);
  assert.equal(editor.activeLayer, 'layer');
  execute(cli, 'undo');
  assert.equal(editor.activeLayer, undefined);
  execute(cli, 'redo', 'layer enter layer', 'save scene.svg');
  assert.equal(editor.activeLayer, 'layer');
  assert.match(cli.run('read missing.svg')[0]!, /cannot read/);
  assert.equal(editor.activeLayer, 'layer');
  execute(cli, 'read scene.svg');
  assert.equal(editor.activeLayer, undefined);
  execute(cli, 'layer enter layer', 'init');
  assert.equal(editor.activeLayer, undefined);
});

test('injected box provider supports commands, clone history and SVG restoration', () => {
  const factory = new ShapeFactory().register(new BoxProvider());
  const editor = new Editor(new MemoryDocumentStore(), factory);
  const cli = new CommandDispatcher(editor);
  const codec = new SvgCodec(factory);
  execute(cli, 'init', 'create g outer', 'create box b 10 20 100 60 "Start" in outer',
    'set b fill red', 'set b label "Changed"', 'rotate 45 0 0 b');
  const before = codec.encode(editor.inspect());
  assert.ok(editor.inspect().get('b') instanceof Box);
  assert.equal(editor.inspect().get('b-rect').attributes.get('fill'), 'red');
  assert.equal(editor.inspect().get('b-label').text, 'Changed');
  assert.match(cli.run('ungroup b')[0]!, /cannot ungroup composite shape: b/);
  execute(cli, 'delete b', 'undo');
  assert.ok(editor.inspect().get('b') instanceof Box);
  assert.equal(codec.encode(editor.inspect()), before);
  const restored = codec.decode(before).document;
  assert.ok(restored.get('b') instanceof Box);
  assert.equal(codec.encode(restored), before);
  const fallback = new SvgCodec().decode(before).document;
  assert.equal(fallback.get('b') instanceof Box, false);
  assert.equal(fallback.get('b').attributes.get('data-kind'), 'box');
  assert.throws(() => factory.register(new BoxProvider()), /already registered/);
  assert.throws(() => new ShapeFactory().create('box', 'b', []), /unknown shape type/);
});

test('container capability supports a container that does not inherit Group', () => {
  const factory = new ShapeFactory();
  factory.register({
    type: 'alternate', svgTag: 'g', kind: 'alternate',
    create: id => new AlternateContainer(id),
    fromSvg: (id, attributes, _content, children) => {
      const result = new AlternateContainer(id);
      for (const child of children) result.add(child);
      for (const [key, value] of attributes) {
        if (!['id', 'transform', 'xmlns'].includes(key)) result.importPresentation(key, value);
      }
      return result;
    },
  });
  const editor = new Editor(new MemoryDocumentStore(), factory);
  const cli = new CommandDispatcher(editor);
  execute(cli, 'init', 'create alternate custom', 'create g inner in custom',
    'create rect r 1 2 3 4 in inner', 'layer enter custom', 'ungroup inner', 'move-many 2 3 r');
  const document = editor.inspect();
  assert.equal(document.parentLabel(document.get('r')), 'g#custom');
  const codec = new SvgCodec(factory);
  const restored = codec.decode(codec.encode(document)).document;
  assert.ok(restored.get('custom') instanceof AlternateContainer);
  assert.equal(restored.get('r').attributes.get('x'), '3');
});

test('new commands can be registered without changing the dispatcher', () => {
  const editor = new Editor(new MemoryDocumentStore());
  const commands = new CommandFactory(editor).register('nudge', args => {
    args.count(1, Number.MAX_SAFE_INTEGER);
    return new MoveManyCommand(editor, args.all(), 1, 2);
  });
  const cli = new CommandDispatcher(editor, commands);
  execute(cli, 'init', 'create rect r 0 0 10 20', 'nudge r');
  assert.equal(editor.inspect().get('r').attributes.get('x'), '1');
  execute(cli, 'undo');
  assert.equal(editor.inspect().get('r').attributes.get('x'), '0');
  assert.throws(() => commands.register('nudge', () => new MoveManyCommand(editor, [], 0, 0)), /already registered/);
});

test('CLI loads box only when explicitly enabled', () => {
  const input = 'init\ncreate box b 0 0 100 60 "Box"\nrotate 90 0 0 b\nshow b\nexit\n';
  const enabled = spawnSync(process.execPath, ['build/src/Main.js', '--box'], { input, encoding: 'utf8' });
  assert.equal(enabled.status, 0, enabled.stderr);
  assert.doesNotMatch(enabled.stdout, /error:/);
  assert.match(enabled.stdout, /data-kind=box/);
  const disabled = spawnSync(process.execPath, ['build/src/Main.js'], { input, encoding: 'utf8' });
  assert.match(disabled.stdout, /unknown shape type: box/);
});
