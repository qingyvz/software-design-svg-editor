import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DirPlugin } from '../src/plugins/dir/DirPlugin.js';
import { PluginProbe } from './PluginProbe.js';
import { Fixtures } from './Fixtures.js';
import { MemoryDocumentStore } from './MemoryDocumentStore.js';

test('dir alone registers a filesystem command without requiring a document', () => {
  const probe = new PluginProbe();
  const calls: string[] = [];
  new DirPlugin({ cwd: () => '/fixed', list: path => { calls.push(path); return [{ name: 'z.txt', kind: 'file' }, { name: '.hidden', kind: 'file' }, { name: 'docs', kind: 'directory' }]; } }).activate(probe);
  assert.deepEqual(probe.names(), { shapes: [], commands: ['dir'], decorators: [], attributes: [] });
  const receiver = Fixtures.editor(new MemoryDocumentStore());
  assert.deepEqual(probe.commands.get('dir')!.create(receiver, []).execute(), ['[DIR]  docs','[FILE]  .hidden','[FILE]  z.txt']);
  assert.deepEqual(calls, ['/fixed']);
  assert.throws(() => receiver.inspect(), /no document/);
  assert.throws(() => probe.commands.get('dir')!.create(receiver, ['extra']), /usage: dir/);
});
