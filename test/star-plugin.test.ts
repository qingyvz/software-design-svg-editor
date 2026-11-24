import assert from 'node:assert/strict';
import { test } from 'node:test';
import { StarPlugin } from '../src/plugins/star/StarPlugin.js';
import { PluginProbe } from './PluginProbe.js';
import { SvgDocument } from '../src/domain/SvgDocument.js';
import { Rect } from '../src/domain/Rect.js';

test('star alone has per-instance saved state and ignores attribute insertion order', () => {
  const a = new PluginProbe(), b = new PluginProbe();
  new StarPlugin().activate(a);
  new StarPlugin().activate(b);
  assert.deepEqual(a.names(), { shapes: [], commands: [], decorators: ['modified-star'], attributes: [] });
  const saved = new SvgDocument(), same = new SvgDocument();
  const first = new Rect('r', 0, 0, 10, 20), reordered = new Rect('r', 0, 0, 10, 20);
  first.set('fill', 'red'); first.set('stroke', 'blue');
  reordered.set('stroke', 'blue'); reordered.set('fill', 'red');
  saved.add(first); same.add(reordered);
  const label = a.decorators.get('modified-star')!;
  label.checkpoint!(saved);
  assert.equal(label.label(same, same.get('r')), '', 'equal attribute maps are not an edit');
  assert.equal(label.label(same), '', 'root is also clean');
  same.get('r').set('fill', 'yellow');
  assert.equal(label.label(same, same.get('r')), ' *');
  assert.equal(b.decorators.get('modified-star')!.label(same), '', 'another uncheckpointed instance is independent');
});
