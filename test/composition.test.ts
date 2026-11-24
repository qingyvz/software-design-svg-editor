import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ShapeFactory } from '../src/domain/ShapeFactory.js';
import { DefaultShapes } from '../src/host/DefaultShapes.js';
import { StatsCommand } from '../src/plugins/StatsCommand.js';
import { DirCommand } from '../src/plugins/DirCommand.js';
import { SvgDocument } from '../src/domain/SvgDocument.js';

test('kernel registry has no hidden concrete providers; host chooses six defaults', () => {
  const empty = new ShapeFactory();
  assert.throws(() => empty.create('rect', 'r', ['0','0','1','1']), /unknown shape type/);
  const defaults = DefaultShapes.create();
  for (const type of ['rect','circle','ellipse','line','text','g']) assert.equal(defaults.has(type), true);
  assert.equal(defaults.has('box'), false);
});

test('query-only and filesystem-only commands need no concrete Editor', () => {
  assert.deepEqual(new StatsCommand({ inspect: () => new SvgDocument() }).execute(), ['(total 0, containers 0)']);
  assert.deepEqual(new DirCommand({ cwd: () => '/fixed', list: () => [] }).execute(), ['(empty directory)']);
});
