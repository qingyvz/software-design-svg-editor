import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SvgCodec } from '../src/infrastructure/SvgCodec.js';
import { NodeDocumentStore } from '../src/infrastructure/NodeDocumentStore.js';
import { SvgDocument } from '../src/domain/SvgDocument.js';
import { ShapeFactory } from '../src/domain/ShapeFactory.js';
import { Editor } from '../src/application/Editor.js';
import { CommandDispatcher } from '../src/cli/CommandDispatcher.js';
import { TreeFormatter } from '../src/application/TreeFormatter.js';
import { spawnSync } from 'node:child_process';

test('provided external SVG imports every node and assigns a missing id', () => {
  const codec = new SvgCodec(), loaded = codec.decode(readFileSync('examples/other.svg', 'utf8'));
  assert.equal(loaded.document.count, 7);
  assert.deepEqual(loaded.warnings, ['warning: assigned id rect1 to unnamed <rect>']);
  const encoded = codec.encode(loaded.document);
  assert.equal(codec.encode(codec.decode(encoded).document), encoded);
});

test('automatic ids reserve later explicit ids, are unique per type and warn in order', () => {
  const result = new SvgCodec().decode('<svg><rect/><g><rect id="rect1"/><circle/><rect/></g><circle id="circle1"/></svg>');
  assert.deepEqual(result.document.shapes.map(x => x.id), ['rect2', 'g1', 'rect1', 'circle2', 'rect3', 'circle1']);
  assert.equal(result.warnings.length, 4);
  assert.throws(() => new SvgCodec().decode('<svg><g id="a"><rect id="a"/></g></svg>'), /id already exists: a/);
});

test('XML entities, Chinese and empty text survive save/read', () => {
  const f = new ShapeFactory(), d = new SvgDocument(400, 300), codec = new SvgCodec();
  d.add(f.create('text', 't', ['1', '2', '中文 & <test> "quoted"']));
  d.add(f.create('text', 'empty', ['0', '0', '']));
  d.add(f.create('rect', 'r', ['0', '0', '4', '5']));
  const xml = codec.encode(d);
  assert.match(xml, /&amp;/); assert.match(xml, /&lt;test&gt;/);
  const result = codec.decode(xml).document;
  assert.equal(result.get('t').text, d.get('t').text);
  assert.equal(result.get('empty').text, '');
  assert.equal(result.get('r').attributes.has('fill'), false);
});

test('nested background-example transforms preserve geometry and text size', () => {
  const xml = '<svg width="400" height="200"><g id="outer" transform="translate(60,40)"><g id="inner" transform="translate(200,0) scale(0.8)"><rect id="r" x="0" y="0" width="120" height="60"/><text id="t" x="60" y="38" font-size="16" text-anchor="middle">End</text></g></g></svg>';
  const d = new SvgCodec().decode(xml).document;
  assert.equal(d.get('r').attributes.get('x'), '260');
  assert.equal(d.get('r').attributes.get('width'), '96');
  assert.equal(d.get('t').attributes.get('x'), '308');
  assert.equal(d.get('t').attributes.get('font-size'), '12.8');
  assert.equal(d.get('t').attributes.get('text-anchor'), 'middle');
});

test('invalid XML and unsupported content fail explicitly', () => {
  const codec = new SvgCodec();
  for (const xml of ['<svg><rect></svg>', '<svg><path id="p"/></svg>', '<svg><text><tspan>nested</tspan></text></svg>',
    '<!DOCTYPE svg [<!ENTITY test "x">]><svg/>', '<html/>', '<svg><rect onclick="alert(1)"/></svg>',
    '<svg width="NaN"/>', '<svg><g transform="rotate(30 1)"/></svg>',
    '<svg>' + '<g>'.repeat(257) + '</g>'.repeat(257) + '</svg>',
    '<svg><text transform="scale(2)" font-size="1e308">x</text></svg>']) assert.throws(() => codec.decode(xml), Error, xml);
});

test('real file port replaces valid files atomically and leaves no temp files on failure', t => {
  const dir = mkdtempSync(join(tmpdir(), 'svg-editor-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, '图 with space.svg'), store = new NodeDocumentStore();
  store.write(file, new SvgDocument(400, 300));
  store.write(file, new SvgDocument(200, 100));
  assert.equal(store.read(file).document.width, 200);
  const directoryTarget = join(dir, 'directory.svg'); mkdirSync(directoryTarget);
  assert.throws(() => store.write(directoryTarget, new SvgDocument()), /cannot write file/);
  assert.equal(readdirSync(dir).filter(x => x.endsWith('.tmp')).length, 0);
  assert.throws(() => store.read(join(dir, 'missing.svg')), /cannot read file/);
});

test('failed real read and write preserve document, history, and saved path', t => {
  const dir = mkdtempSync(join(tmpdir(), 'svg-editor-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const editor = new Editor(new NodeDocumentStore()), cli = new CommandDispatcher(editor);
  cli.run('init'); cli.run('create g a');
  const path = join(dir, 'good.svg');
  cli.run('save ' + JSON.stringify(path)); cli.run('create circle b 1 2 3');
  const invalid = join(dir, 'bad.svg'); writeFileSync(invalid, '<svg><rect></svg>');
  assert.match(cli.run('read ' + JSON.stringify(invalid))[0]!, /^error: invalid SVG/);
  assert.match(cli.run('save ' + JSON.stringify(join(dir, 'missing', 'file.svg')))[0]!, /^error: cannot write/);
  cli.run('undo');
  assert.equal(editor.inspect().count, 1);
  assert.match(cli.run('save')[0]!, /^saved to/);
  assert.equal(new NodeDocumentStore().read(path).document.count, 1);
});

test('CLI subprocess runs the course flowchart and read/write round-trip', t => {
  const dir = mkdtempSync(join(tmpdir(), 'svg-editor-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const path = join(dir, 'flow.svg');
  const script = readFileSync('examples/flowchart.txt', 'utf8').replace('save examples/flowchart.svg', 'save ' + JSON.stringify(path));
  const result = spawnSync(process.execPath, ['build/src/Main.js'], { input: script, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /svg \(800x600\)/);
  assert.match(result.stdout, /error: undo not allowed after io command/);
  const loaded = new NodeDocumentStore().read(path);
  assert.equal(loaded.document.count, 8);
  assert.equal(loaded.document.get('process').attributes.get('y'), '100');
  assert.equal(loaded.document.get('process-label').text, '处理数据 v2');
  assert.equal(new TreeFormatter().tree(loaded.document).length, 9);
});

test('default paths reset on init; viewBox and data-kind survive compatible import', () => {
  const codec = new SvgCodec();
  const d = codec.decode('<svg width="400px" height="300px" viewBox="-10 -20 40 30"><g id="box" data-kind="box"><rect id="r" width="20" height="10"/></g></svg>').document;
  assert.deepEqual(d.viewBox, [-10, -20, 40, 30]);
  assert.equal(d.get('box').attributes.get('data-kind'), 'box');
  assert.equal(codec.decode(codec.encode(d)).document.width, 400);
});
