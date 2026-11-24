import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseSvgSymbols } from '../src/svgSymbols';

test('nested elements, unnamed leaf, quoted >, comments and accurate UTF-16 ranges', () => {
  const source = '<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg" id="root">\n  <!-- <rect id="fake"/> -->\n  <g id="group">\n    <rect id="start" title="a > b"/>\n    <text>🧩</text>\n  </g>\n</svg>';
  const [root] = parseSvgSymbols(source);
  assert.equal(root?.name, 'svg#root');
  assert.equal(root.children[0]?.name, 'g#group');
  assert.deepEqual(root.children[0]?.children.map(x => x.name), ['rect#start', 'text']);
  const rect = root.children[0]!.children[0]!;
  assert.equal(source.slice(rect.start, rect.end), '<rect id="start" title="a > b"/>');
  assert.equal(source.slice(rect.selectionStart, rect.selectionEnd), 'rect');
  assert.equal(source.slice(root.start, root.end), source.slice(source.indexOf('<svg')));
});

test('a new parse reflects edit and changed source offsets, without caching the old text', () => {
  const old = '<svg><g><rect id="old"/></g></svg>';
  const updated = '<svg>\n  <g id="x">\n    <rect id="new"/>\n  </g>\n</svg>';
  const previous = parseSvgSymbols(old)[0]!.children[0]!.children[0]!;
  const next = parseSvgSymbols(updated)[0]!.children[0]!.children[0]!;
  assert.equal(previous.name, 'rect#old');
  assert.equal(next.name, 'rect#new');
  assert.notEqual(next.start, previous.start);
  assert.equal(updated.slice(next.selectionStart, next.selectionEnd), 'rect');
});

test('incomplete or invalid input clears symbols without throwing', () => {
  for (const invalid of [
    '', '<svg><g><rect', '<svg><g></svg>', '<svg><rect id="broken></svg>',
    '<svg><rect></svg>', '<svg><rect a=3/></svg>', '<svg><rect title="a < b"/></svg>', '<svg>&unknown;</svg>',
    '<svg><!DOCTYPE svg></svg>', '<!DOCTYPE svg><svg/>', '<html><svg/></html>',
    '<svg xmlns="urn:other"/>',
  ]) {
    assert.deepEqual(parseSvgSymbols(invalid), [], invalid);
  }
});

test('self-closing root, a namespaced leaf and CDATA containing tag-like text', () => {
  assert.equal(parseSvgSymbols('<svg/>')[0]?.name, 'svg');
  const source = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:x="urn:x"><text><![CDATA[<g/>]]></text><x:thing id="k"/></svg>';
  const children = parseSvgSymbols(source)[0]!.children;
  assert.deepEqual(children.map(node => node.name), ['text', 'thing#k']);
  assert.equal(source.slice(children[1]!.start, children[1]!.end), '<x:thing id="k"/>');
});
