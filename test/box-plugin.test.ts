import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BoxPlugin } from '../src/plugins/box/BoxPlugin.js';
import { PluginProbe } from './PluginProbe.js';
import { SvgDocument } from '../src/domain/SvgDocument.js';

test('box alone supplies shape, attributes and label through the public context', () => {
  const probe = new PluginProbe();
  new BoxPlugin().activate(probe);
  assert.deepEqual(probe.names(), { shapes: ['box'], commands: [], decorators: ['box-type-label'], attributes: ['box-attributes'] });
  const box = probe.shapes.get('box')!.create('b', ['0','0','100','60','hello']);
  assert.deepEqual(box.children.map(child => child.id), ['b-rect','b-label']);
  const handler = probe.attributes.get('box-attributes')!;
  handler.apply(box, 'fill', 'red');
  handler.apply(box, 'label', 'changed');
  assert.equal(box.children[0]!.attributes.get('fill'), 'red');
  assert.equal(box.children[1]!.text, 'changed');
  assert.throws(() => box.container!.assertCanUngroup(), /cannot ungroup composite/);
  const document = new SvgDocument();
  document.add(box);
  assert.equal(probe.decorators.get('box-type-label')!.label(document, box), ' (box)');
});
