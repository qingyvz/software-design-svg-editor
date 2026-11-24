import { Fixtures } from './Fixtures.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { PluginInstaller } from '../src/cli/PluginInstaller.js';
import { PluginLoader } from '../src/cli/PluginLoader.js';
import { CommandRegistry } from '../src/application/CommandRegistry.js';
import { CommandFactory } from '../src/cli/CommandFactory.js';
import { CommandDispatcher } from '../src/cli/CommandDispatcher.js';
import { AttributeHandlers } from '../src/application/AttributeHandlers.js';
import { TreeDecorators } from '../src/application/TreeDecorators.js';
import type { CommandReceiver } from '../src/application/CommandReceiver.js';
import { Command } from '../src/application/Command.js';
import { Rect } from '../src/domain/Rect.js';
import { BoxPlugin } from '../src/plugins/box/BoxPlugin.js';
import type { Plugin } from '../src/application/Plugin.js';
import { MemoryDocumentStore } from './MemoryDocumentStore.js';

function harness() {
  const shapes = Fixtures.shapes();
  const commands = new CommandRegistry();
  const decorators = new TreeDecorators();
  const attributes = new AttributeHandlers();
  const editor = Fixtures.editor(new MemoryDocumentStore(), shapes, attributes, decorators);
  const factory = new CommandFactory(editor, commands);
  const cli = new CommandDispatcher(editor, factory);
  const installer = new PluginInstaller(shapes, commands, decorators, attributes, (name) => factory.has(name));
  return { shapes, commands, decorators, attributes, editor, cli, installer };
}

function fixture(run: (directory: string) => Promise<void>): Promise<void> {
  const directory = mkdtempSync(join(tmpdir(), 'svg-plugins-'));
  return run(directory).finally(() => rmSync(directory, { recursive: true, force: true }));
}

function command(name: string) {
  return {
    name, help: name,
    create: (editor: CommandReceiver) => new TestCommand(editor, name),
  };
}

class TestCommand extends Command {
  constructor(receiver: CommandReceiver, private readonly message: string) { super(receiver); }
  override execute(): readonly string[] { return [this.message + ' called']; }
}

test('installer rejects manifest mismatch and activation failures without leaking registrations', () => {
  const h = harness();
  const mismatch: Plugin = {
    name: 'mismatch', contributes: { commands: ['expected'] },
    activate(ctx) { ctx.registerCommand(command('actual')); },
  };
  assert.match(h.installer.install(mismatch)!, /^error: plugin manifest mismatch: mismatch \(declared: .*registered: .*\)$/);
  assert.deepEqual(h.cli.run('actual'), ['error: unknown command: actual']);

  const throwing: Plugin = {
    name: 'thrower', contributes: { commands: ['partial'] },
    activate(ctx) { ctx.registerCommand(command('partial')); throw new Error('bad\nactivation'); },
  };
  assert.equal(h.installer.install(throwing), 'error: plugin failed to activate: thrower (bad activation)');
  assert.deepEqual(h.cli.run('partial'), ['error: unknown command: partial']);
  assert.equal(h.installer.install({
    name: 'good', contributes: { commands: ['actual'] },
    activate(ctx) { ctx.registerCommand(command('actual')); },
  }), undefined);
  assert.deepEqual(h.cli.run('actual'), ['actual called']);
});

test('throwing contribution accessors yield standardized errors and cannot leak partial registrations', () => {
  const h = harness();
  const invalid: Plugin = {
    name: 'invalid-name', contributes: { commands: ['safe', 'bad'] },
    activate(ctx) {
      ctx.registerCommand(command('safe'));
      ctx.registerCommand({ get name(): string { throw new Error('bad name getter'); },
        help: 'bad', create: (editor) => new TestCommand(editor, 'bad') });
    },
  };
  assert.equal(h.installer.install(invalid),
    'error: plugin failed to activate: invalid-name (bad name getter)');
  assert.equal(h.commands.has('safe'), false);
  assert.deepEqual(h.cli.run('safe'), ['error: unknown command: safe']);
  const invalidFactory: Plugin = {
    name: 'invalid-factory', contributes: { commands: ['safe', 'bad'] },
    activate(ctx) {
      ctx.registerCommand(command('safe'));
      ctx.registerCommand({ name: 'bad', help: 'bad',
        get create(): (editor: CommandReceiver) => Command { throw new Error('bad factory getter'); } });
    },
  };
  assert.equal(h.installer.install(invalidFactory),
    'error: plugin failed to activate: invalid-factory (bad factory getter)');
  assert.equal(h.commands.has('safe'), false);
  let reads = 0;
  const invalidOnSecondPass: Plugin = {
    name: 'invalid-during-names', contributes: { commands: ['safe', 'bad'] },
    activate(ctx) {
      ctx.registerCommand(command('safe'));
      ctx.registerCommand({
        get name(): string {
          if (++reads === 3) throw new Error('name changed during registration');
          return 'bad';
        },
        help: 'bad', create: (editor) => new TestCommand(editor, 'bad'),
      });
    },
  };
  assert.equal(h.installer.install(invalidOnSecondPass),
    'error: plugin failed to activate: invalid-during-names (name changed during registration)');
  assert.equal(reads, 3);
  assert.equal(h.commands.has('safe'), false);
  assert.equal(h.commands.has('bad'), false);
  assert.equal(h.installer.install({
    name: 'success-after-failure', contributes: { commands: ['safe'] },
    activate(ctx) { ctx.registerCommand(command('safe')); },
  }), undefined);
  assert.deepEqual(h.cli.run('safe'), ['safe called']);
});

test('duplicate names in one plugin, earlier plugin and builtins reject only the current plugin', () => {
  const h = harness();
  assert.equal(h.installer.install({
    name: 'first', contributes: { commands: ['ok'] },
    activate(ctx) { ctx.registerCommand(command('ok')); },
  }), undefined);
  for (const existing of ['ok', 'init']) {
    assert.equal(h.installer.install({
      name: 'duplicate', contributes: { commands: ['transient', existing] },
      activate(ctx) { ctx.registerCommand(command('transient')); ctx.registerCommand(command(existing)); },
    }), `error: duplicate registration: commands/${existing}`);
    assert.deepEqual(h.cli.run('transient'), ['error: unknown command: transient']);
  }
  assert.equal(h.installer.install({
    name: 'inside', contributes: { commands: ['double', 'double'] },
    activate(ctx) { ctx.registerCommand(command('double')); ctx.registerCommand(command('double')); },
  }), 'error: duplicate registration: commands/double');
  assert.deepEqual(h.cli.run('ok'), ['ok called']);
  assert.equal(h.commands.has('double'), false);
});

test('shape type and SVG tag collisions reject only the attempted plugin across categories', () => {
  const h = harness();
  assert.equal(h.installer.install(new BoxPlugin()), undefined);
  assert.equal(h.installer.install(new BoxPlugin()), 'error: duplicate registration: shapes/box');
  assert.equal(h.shapes.has('box'), true);
  assert.equal(h.attributes.has('box-attributes'), true);
  assert.equal(h.decorators.has('box-type-label'), true);
  assert.equal(h.installer.install({
    name: 'colliding-svg', contributes: { shapes: ['another-rect'], commands: ['temporary'] },
    activate(ctx) {
      ctx.registerCommand(command('temporary'));
      ctx.registerShape({ type: 'another-rect', svgTag: 'rect',
        create: (id) => new Rect(id, 0, 0, 1, 1),
        fromSvg: (id) => new Rect(id, 0, 0, 1, 1),
      });
    },
  }), 'error: duplicate registration: shapes/another-rect');
  assert.equal(h.shapes.has('another-rect'), false);
  assert.equal(h.commands.has('temporary'), false);
  assert.deepEqual(h.cli.run('init'), ['canvas 800x600 created']);
  assert.deepEqual(h.cli.run('create box b 0 0 10 20 "title"'), ['g#b created']);
});

test('commit-time registration failure rolls back previous categories and leaves earlier plugins', () => {
  const h = harness();
  h.editor.init(); // registration invokes checkpoint; a thrown checkpoint is a late failure.
  const successful: Plugin = {
    name: 'previous', contributes: { commands: ['previous'] },
    activate(ctx) { ctx.registerCommand(command('previous')); },
  };
  assert.equal(h.installer.install(successful), undefined);
  const failure: Plugin = {
    name: 'late', contributes: { commands: ['temporary'], decorators: ['broken'] },
    activate(ctx) {
      ctx.registerCommand(command('temporary'));
      ctx.registerDecorator({ name: 'broken', label: () => '', checkpoint: () => { throw new Error('checkpoint failed'); } });
    },
  };
  assert.equal(h.installer.install(failure), 'error: plugin failed to activate: late (checkpoint failed)');
  assert.equal(h.decorators.has('broken'), false);
  assert.equal(h.commands.has('temporary'), false);
  assert.deepEqual(h.cli.run('previous'), ['previous called']);
  assert.equal(h.installer.install({
    name: 'later', contributes: { commands: ['temporary'] },
    activate(ctx) { ctx.registerCommand(command('temporary')); },
  }), undefined);
});

test('config loader reports four failures, skips disabled entries and continues in order with options', async () => fixture(async (dir) => {
  const h = harness();
  const file = (name: string, body: string) => { const path = join(dir, name); writeFileSync(path, body); return './' + name; };
  const missing = './absent.mjs';
  const noDefault = file('no-default.mjs', 'export const something = 1;');
  const badManifest = file('mismatch.mjs', 'export default {name:"mismatch",contributes:{commands:["wrong"]},activate(ctx){ctx.registerCommand({name:"actual",help:"actual",create(){return {execute(){return ["actual"]}}}})}};');
  const throwing = file('throw.mjs', 'export default {name:"throwing",contributes:{commands:["partial"]},activate(ctx){ctx.registerCommand({name:"partial",help:"partial",create(){return {execute(){return []}}}});throw Error("oops")}};');
  const good = file('good.mjs', 'export default {name:"good",contributes:{commands:["answer"]},activate(ctx,options){ctx.registerCommand({name:"answer",help:"answer",create(){return {execute(){return [String(options.value)]}}}})}};');
  const config = join(dir, 'plugins.config.json');
  writeFileSync(config, JSON.stringify({ plugins: [
    { module: good, enabled: false, options: { value: 'skipped' } },
    { module: missing }, { module: noDefault }, { module: badManifest }, { module: throwing },
    { module: good, options: { value: 'works' } },
  ] }));
  const errors = await new PluginLoader(h.installer).load(config);
  assert.equal(errors.length, 4);
  assert.equal(errors[0], `error: plugin not found: ${missing}`);
  assert.equal(errors[1], `error: plugin has no default export: ${noDefault}`);
  assert.match(errors[2]!, /^error: plugin manifest mismatch: mismatch \(declared: .*registered: .*\)$/);
  assert.equal(errors[3], 'error: plugin failed to activate: throwing (oops)');
  assert.deepEqual(h.cli.run('partial'), ['error: unknown command: partial']);
  assert.deepEqual(h.cli.run('actual'), ['error: unknown command: actual']);
  assert.deepEqual(h.cli.run('answer'), ['works']);
}));

test('invalid config leaves builtins, package contributes overrides module, import dependency error is not missing top-level module', async () => fixture(async (dir) => {
  const h = harness();
  const config = join(dir, 'plugins.config.json');
  for (const bad of ['{broken', '{}', '{"plugins":[{"module":"x","enabled":1}]}']) {
    writeFileSync(config, bad);
    assert.deepEqual(await new PluginLoader(h.installer).load(config), ['error: invalid plugin config']);
    assert.deepEqual(h.cli.run('init'), ['canvas 800x600 created']);
  }
  const pack = join(dir, 'plugin');
  mkdirSync(pack);
  writeFileSync(join(pack, 'package.json'), '{"name":"test-package","type":"module","contributes":{"commands":["declared"]}}');
  writeFileSync(join(pack, 'index.js'), 'export default {name:"package",contributes:{commands:["different"]},activate(ctx){ctx.registerCommand({name:"different",help:"different",create(){return {execute(){return []}}}})}}');
  writeFileSync(join(dir, 'broken.mjs'), 'import "./missing-dependency.mjs"; export default {};');
  writeFileSync(config, JSON.stringify({ plugins: [{ module: './plugin/index.js' }, { module: './broken.mjs' }] }));
  const errors = await new PluginLoader(h.installer).load(config);
  assert.match(errors[0]!, /^error: plugin manifest mismatch: package/);
  assert.match(errors[1]!, /^error: plugin failed to activate: .\/broken.mjs /);
  assert.doesNotMatch(errors[1]!, /plugin not found/);
  assert.equal(h.commands.has('different'), false);
}));

test('CLI prints invalid-config error and continues using only builtin commands', async () => fixture(async (dir) => {
  const config = join(dir, 'plugins.config.json');
  writeFileSync(config, JSON.stringify({ plugins: [{ module: './absent.mjs', enabled: false },
    { module: './enabled-missing.mjs' }] }));
  const run = (input: string) => spawnSync(process.execPath,
    [resolve('build/src/Main.js'), '--config', config], { input, cwd: dir, encoding: 'utf8' });
  const partial = run('init\nstats\ncreate rect r 0 0 1 1\nexit\n');
  assert.equal(partial.status, 0, partial.stderr);
  assert.match(partial.stdout, /^error: plugin not found: .\/enabled-missing\.mjs$/m);
  assert.doesNotMatch(partial.stdout, /absent\.mjs/);
  assert.match(partial.stdout, /canvas 800x600 created\nerror: unknown command: stats\nrect#r created/);
  writeFileSync(config, '{ invalid JSON');
  const invalid = run('init\ncreate circle c 1 2 3\nexit\n');
  assert.equal(invalid.status, 0, invalid.stderr);
  assert.match(invalid.stdout, /^error: invalid plugin config$/m);
  assert.match(invalid.stdout, /canvas 800x600 created\ncircle#c created/);
}));

test('config paths resolve relative to config file rather than current process', async () => fixture(async (dir) => {
  const h = harness();
  const config = join(dir, 'plugins.config.json');
  const source = resolve('build/src/plugins/stats/index.js');
  writeFileSync(config, JSON.stringify({ plugins: [{ module: source }] }));
  assert.deepEqual(await new PluginLoader(h.installer).load(config), []);
  assert.deepEqual(h.cli.run('init'), ['canvas 800x600 created']);
  assert.deepEqual(h.cli.run('stats'), ['(total 0, containers 0)']);
}));
