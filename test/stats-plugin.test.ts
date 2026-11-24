import assert from 'node:assert/strict';
import { test } from 'node:test';
import { StatsPlugin } from '../src/plugins/stats/StatsPlugin.js';
import { StatsCommand } from '../src/plugins/stats/StatsCommand.js';
import { SvgDocument } from '../src/domain/SvgDocument.js';
import { Group } from '../src/domain/Group.js';
import { Rect } from '../src/domain/Rect.js';
import { Circle } from '../src/domain/Circle.js';
import { PluginProbe } from './PluginProbe.js';
import { Fixtures } from './Fixtures.js';
import { MemoryDocumentStore } from './MemoryDocumentStore.js';

test('stats alone registers a command and can run through a query-only substitute', () => {
  const probe = new PluginProbe();
  new StatsPlugin().activate(probe);
  assert.deepEqual(probe.names(), { shapes: [], commands: ['stats'], decorators: [], attributes: [] });
  const document = new SvgDocument();
  const group = new Group('g');
  group.add(new Rect('r', 0, 0, 1, 2));
  document.add(group);
  document.add(new Circle('c', 0, 0, 2));
  const before = document.clone();
  assert.deepEqual(new StatsCommand({ inspect: () => document.clone() }).execute(), ['rect: 1  circle: 1  (total 2, containers 1)']);
  assert.deepEqual(document, before);
  const receiver = Fixtures.editor(new MemoryDocumentStore());
  receiver.init();
  assert.deepEqual(probe.commands.get('stats')!.create(receiver, []).execute(), ['(total 0, containers 0)']);
  assert.throws(() => probe.commands.get('stats')!.create(receiver, ['extra']), /usage: stats/);
});
