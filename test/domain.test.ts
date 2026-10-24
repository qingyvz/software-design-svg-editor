import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SvgDocument } from '../src/domain/SvgDocument.js';
import { ShapeFactory } from '../src/domain/ShapeFactory.js';
import { Group } from '../src/domain/Group.js';

test('six types implement polymorphic geometry and copy their private state', () => {
  const f = new ShapeFactory();
  const data = [
    ['rect', ['1', '2', '3', '4']], ['circle', ['1', '2', '3']],
    ['ellipse', ['1', '2', '3', '4']], ['line', ['1', '2', '3', '4']],
    ['text', ['1', '2', 'hello world']], ['g', []],
  ] as const;
  for (const [type, args] of data) {
    const shape = f.create(type, type, args), copy = shape.clone();
    shape.move(10, 20); shape.scale(2);
    assert.equal(copy.id, type);
    if (type !== 'g') assert.notEqual(shape.summary(), copy.summary());
    assert.throws(() => shape.set('made-up', '1'), /unknown attribute/);
  }
});

test('nested composite moves and scales descendants exactly once', () => {
  const f = new ShapeFactory(), d = new SvgDocument();
  d.add(new Group('a')); d.add(new Group('b'), 'a');
  d.add(f.create('rect', 'r', ['1', '2', '3', '4']), 'b');
  d.get('a').move(10, -1); d.get('a').scale(2);
  assert.deepEqual([...d.get('r').attributes], [['x', '22'], ['y', '2'], ['width', '6'], ['height', '8']]);
  const clone = d.clone(); clone.delete('a');
  assert.equal(d.count, 3); assert.equal(clone.count, 0);
});

test('group preserves document order, ancestry and insertion position', () => {
  const f = new ShapeFactory(), d = new SvgDocument();
  for (const id of ['a', 'b', 'c']) d.add(f.create('circle', id, ['1', '2', '3']));
  d.group('g', ['c', 'a']);
  assert.deepEqual(d.children.map(s => s.id), ['g', 'b']);
  assert.deepEqual(d.get('g').children.map(s => s.id), ['a', 'c']);
  assert.throws(() => d.group('bad', ['a', 'g']), /cannot group a container/);
  assert.throws(() => d.ungroup('g'), /top-level/);
  assert.throws(() => d.addTo('g', 'g'), /own descendant/);
  assert.throws(() => d.add(f.create('g', 'a', [])), /id already exists/);
  d.assertValid();
});

test('cross-parent grouping uses the lowest common ancestor', () => {
  const d = new SvgDocument(), f = new ShapeFactory();
  d.add(new Group('outer')); d.add(new Group('left'), 'outer'); d.add(new Group('right'), 'outer');
  d.add(f.create('text', 'a', ['1', '2', 'A']), 'left');
  d.add(f.create('text', 'b', ['3', '4', 'B']), 'right');
  d.group('together', ['b', 'a']);
  assert.equal(d.parentLabel(d.get('together')), 'g#outer');
  assert.deepEqual(d.get('together').children.map(s => s.id), ['a', 'b']);
  d.get('together').set('fill', 'red'); d.ungroup('together');
  assert.deepEqual(d.get('outer').children.map(s => s.id), ['a', 'b', 'left', 'right']);
  assert.equal(d.get('a').attributes.get('fill'), 'red');
});

test('numeric validation rejects negative sizes, NaN and non-positive scale', () => {
  const f = new ShapeFactory();
  assert.throws(() => f.create('rect', 'r', ['0', '0', '-1', '2']), /non-negative/);
  assert.throws(() => f.create('circle', 'c', ['NaN', '0', '1']), /invalid number/);
  const shape = f.create('line', 'l', ['-1', '2.5', '3e2', '0']);
  assert.throws(() => shape.scale(0), /scale factor must be positive/);
  assert.throws(() => f.create('box', 'b', []), /unknown shape type/);
});
