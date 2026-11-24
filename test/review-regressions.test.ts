import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { Fixtures } from './Fixtures.js';
import { MemoryDocumentStore } from './MemoryDocumentStore.js';
import { AttributeHandlers } from '../src/application/AttributeHandlers.js';
import { TreeDecorators } from '../src/application/TreeDecorators.js';
import { CommandRegistry } from '../src/application/CommandRegistry.js';
import { CommandFactory } from '../src/cli/CommandFactory.js';
import { CommandDispatcher } from '../src/cli/CommandDispatcher.js';
import { PluginInstaller } from '../src/cli/PluginInstaller.js';
import { PluginLoader } from '../src/cli/PluginLoader.js';
import { BoxPlugin } from '../src/plugins/box/BoxPlugin.js';
import { SvgDocument } from '../src/domain/SvgDocument.js';
import { Rect } from '../src/domain/Rect.js';

function harness() {
  const shapes = Fixtures.shapes(), store = new MemoryDocumentStore();
  const attributes = new AttributeHandlers(), decorators = new TreeDecorators(), commands = new CommandRegistry();
  const editor = Fixtures.editor(store, shapes, attributes, decorators);
  const factory = new CommandFactory(editor, commands), cli = new CommandDispatcher(editor, factory);
  const installer = new PluginInstaller(shapes, commands, decorators, attributes, name => factory.has(name));
  return { shapes, store, attributes, decorators, commands, editor, cli, installer };
}
function ok(h: ReturnType<typeof harness>, ...lines: string[]) {
  for (const line of lines) assert.ok(h.cli.run(line).every(message => !message.startsWith('error:')), line);
}

test('review: zero handlers use the original whitelist and preserve a redo branch', () => {
  const h = harness();
  assert.equal(h.installer.install(new BoxPlugin()), undefined);
  ok(h, 'init', 'create box b 0 0 100 60 "hello"', 'set b label "changed"', 'undo');
  h.attributes.remove('box-attributes');
  const before = Fixtures.codec(h.shapes).encode(h.editor.inspect());
  assert.deepEqual(h.cli.run('set b label "bypass"'), ['error: unknown attribute: label']);
  assert.equal(Fixtures.codec(h.shapes).encode(h.editor.inspect()), before);
  ok(h, 'redo');
  assert.equal(h.editor.inspect().get('b-label').text, 'changed');
  ok(h, 'set b fill red');
  assert.equal(h.editor.inspect().get('b').attributes.get('fill'), 'red');
  assert.equal(h.editor.inspect().get('b-rect').attributes.get('fill'), '#4a90d9');
});

for (const operation of ['init', 'read', 'save'] as const) {
  test('review: successful ' + operation + ' isolates a throwing checkpoint and reports it', () => {
    const h = harness();
    ok(h, 'init', 'create rect original 0 0 1 1');
    const loaded = new SvgDocument(123, 456);
    loaded.add(new Rect('loaded', 0, 0, 2, 3));
    h.store.write('loaded.svg', loaded);
    let armed = false, latestGoodCount = -1;
    h.decorators.register({ name: 'runtime-failure', label: () => '', checkpoint() { if (armed) throw new Error('boom\ncheckpoint'); } });
    h.decorators.register({ name: 'healthy', label: () => '', checkpoint(document) { latestGoodCount = document.count; } });
    armed = true;
    const command = { init: 'init 100 100', read: 'read loaded.svg', save: 'save saved.svg' }[operation];
    const result = h.cli.run(command);
    assert.ok(result.every(message => !message.startsWith('error:')), result.join('\n'));
    assert.ok(result.some(message => message.startsWith('warning:') && message.includes('runtime-failure') && message.includes('disabled')));
    assert.equal(h.decorators.has('runtime-failure'), false);
    assert.equal(h.decorators.has('healthy'), true);
    assert.equal(latestGoodCount, operation === 'init' ? 0 : 1);
    assert.equal(h.editor.inspect().count, operation === 'init' ? 0 : 1);
    assert.deepEqual(h.cli.run('undo'), ['error: undo not allowed after io command']);
    if (operation === 'read') assert.equal(h.editor.inspect().get('loaded').tag, 'rect');
    if (operation === 'save') assert.equal(h.store.read('saved.svg').document.get('original').tag, 'rect');
    ok(h, 'create circle next 1 1 1', 'save after.svg');
  });
}

test('review: same-parent order changes do not detach required composite children', () => {
  const h = harness();
  assert.equal(h.installer.install(new BoxPlugin()), undefined);
  ok(h, 'init', 'create box b 0 0 100 60 "hello"');
  ok(h, 'front b-rect');
  assert.deepEqual(h.editor.inspect().get('b').children.map(child => child.id), ['b-label','b-rect']);
  ok(h, 'undo');
  assert.deepEqual(h.editor.inspect().get('b').children.map(child => child.id), ['b-rect','b-label']);
  ok(h, 'redo', 'back b-rect');
  assert.deepEqual(h.editor.inspect().get('b').children.map(child => child.id), ['b-rect','b-label']);
  assert.match(h.cli.run('delete b-rect')[0]!, /cannot detach required box child/);
  h.editor.inspect().assertValid();
});

test('review: one attribute operation affecting two parts is one undo unit', () => {
  const h = harness();
  assert.equal(h.installer.install(new BoxPlugin()), undefined);
  h.attributes.register({ name: 'two-parts', handles: (_shape, attribute) => attribute === 'both',
    apply(shape, _attribute, value) {
      shape.children[0]!.set('fill', value);
      shape.children[1]!.set('text', value);
    } });
  ok(h, 'init', 'create box b 0 0 100 60 "hello"', 'set b both red');
  assert.equal(h.editor.inspect().get('b-rect').attributes.get('fill'), 'red');
  assert.equal(h.editor.inspect().get('b-label').text, 'red');
  ok(h, 'undo');
  assert.equal(h.editor.inspect().get('b-rect').attributes.get('fill'), '#4a90d9');
  assert.equal(h.editor.inspect().get('b-label').text, 'hello');
  ok(h, 'redo');
  assert.equal(h.editor.inspect().get('b-label').text, 'red');
});

for (const dual of [false, true]) {
  test('review: ESM package resolution selects import conditions (' + (dual ? 'dual' : 'import-only') + ')', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'svg-review-esm-'));
    try {
      const packagePath = join(directory, 'node_modules', 'import-only-probe');
      mkdirSync(packagePath, { recursive: true });
      const conditions = dual ? { import: './plugin.mjs', require: './wrong.cjs' } : { import: './plugin.mjs' };
      writeFileSync(join(packagePath, 'package.json'), JSON.stringify({ name: 'import-only-probe', type: 'module', exports: conditions, contributes: { commands: ['probe'] } }));
      const body = 'class ProbeCommand { execute() { return ["import works"]; } } export default class ProbePlugin { name = "import-only-probe"; contributes = { commands: ["probe"] }; activate(context) { context.registerCommand({ name: "probe", help: "probe", create() { return new ProbeCommand(); } }); } }';
      writeFileSync(join(packagePath, 'plugin.mjs'), body);
      writeFileSync(join(packagePath, 'wrong.cjs'), body.replace('export default class', 'module.exports = class').replace('import works', 'wrong require'));
      const direct = spawnSync(process.execPath, ['--input-type=module','-e','import("import-only-probe").then(p => process.stdout.write(typeof p.default))'], { cwd: directory, encoding: 'utf8' });
      assert.equal(direct.status, 0, direct.stderr);
      assert.equal(direct.stdout, 'function');
      const config = join(directory, 'plugins.config.json');
      writeFileSync(config, JSON.stringify({ plugins: [{ module: 'import-only-probe' }] }));
      const h = harness();
      assert.deepEqual(await new PluginLoader(h.installer).load(config), []);
      assert.deepEqual(h.cli.run('probe'), ['import works']);
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });
}

for (const target of ['absent.mjs', 'not-a-directory/entry.mjs']) {
  test('review: missing exports target reports not found and continues (' + target + ')', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'svg-review-absent-'));
    try {
      const packagePath = join(directory, 'node_modules', 'missing-entry');
      mkdirSync(packagePath, { recursive: true });
      writeFileSync(join(packagePath, 'package.json'), JSON.stringify({ name: 'missing-entry', type: 'module', exports: { import: './' + target }, contributes: { commands: [] } }));
      writeFileSync(join(packagePath, 'not-a-directory'), 'a regular file, not a directory');
      const safe = join(directory, 'safe.mjs');
      writeFileSync(safe, 'export default class SafePlugin { name = "safe"; contributes = { commands: ["safe"] }; activate(c) { c.registerCommand({name:"safe",help:"safe",create(){return {execute(){return ["safe works"];}};}}); } }');
      const config = join(directory, 'plugins.config.json');
      writeFileSync(config, JSON.stringify({ plugins: [{ module: 'missing-entry' }, { module: safe }] }));
      const h = harness();
      assert.deepEqual(await new PluginLoader(h.installer).load(config), ['error: plugin not found: missing-entry']);
      assert.deepEqual(h.cli.run('safe'), ['safe works']);
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });
}

for (const inside of [false, true]) {
  test('review: package manifest is authoritative with configuration ' + (inside ? 'inside' : 'outside') + ' its package', async () => {
    for (const correct of [false, true]) {
      const directory = mkdtempSync(join(tmpdir(), 'svg-review-manifest-'));
      try {
        const packagePath = join(directory, 'node_modules', 'manifest-location');
        mkdirSync(packagePath, { recursive: true });
        writeFileSync(join(packagePath, 'package.json'), JSON.stringify({ name: 'manifest-location', type: 'module', exports: { import: './plugin.mjs' }, contributes: { commands: [correct ? 'probe' : 'declared'] } }));
        writeFileSync(join(packagePath, 'plugin.mjs'), 'export default class ProbePlugin { name="manifest-location"; contributes={commands:["probe"]}; activate(c){c.registerCommand({name:"probe",help:"probe",create(){return {execute(){return ["probe works"];}};}});} }');
        const config = join(inside ? packagePath : directory, 'plugins.config.json');
        writeFileSync(config, JSON.stringify({ plugins: [{ module: 'manifest-location' }] }));
        const h = harness();
        const errors = await new PluginLoader(h.installer).load(config);
        if (correct) {
          assert.deepEqual(errors, []);
          assert.deepEqual(h.cli.run('probe'), ['probe works']);
        } else {
          assert.equal(errors.length, 1);
          assert.match(errors[0]!, /^error: plugin manifest mismatch: manifest-location /);
          assert.deepEqual(h.cli.run('probe'), ['error: unknown command: probe']);
        }
      } finally { rmSync(directory, { recursive: true, force: true }); }
    }
  });
}

for (const place of ['outside', 'inside', 'nested']) {
  for (const direct of [false, true]) {
    test('review: explicit null package manifest is rejected (' + place + ', ' + (direct ? 'file' : 'bare') + ')', async () => {
      const directory = mkdtempSync(join(tmpdir(), 'svg-review-null-'));
      try {
        const packagePath = join(directory, 'node_modules', 'null-package');
        mkdirSync(join(packagePath, 'config'), { recursive: true });
        writeFileSync(join(packagePath, 'package.json'), JSON.stringify({ name: 'null-package', type: 'module', exports: './plugin.mjs', contributes: null }));
        writeFileSync(join(packagePath, 'plugin.mjs'), 'export const contributes={commands:["probe"]}; export default class ProbePlugin { name="null-package"; contributes={commands:["probe"]}; activate(c){c.registerCommand({name:"probe",help:"probe",create(){return {execute(){return ["leaked"];}};}});} }');
        const configRoot = place === 'outside' ? directory : place === 'inside' ? packagePath : join(packagePath, 'config');
        const config = join(configRoot, 'plugins.config.json');
        writeFileSync(config, JSON.stringify({ plugins: [{ module: direct ? join(packagePath, 'plugin.mjs') : 'null-package' }] }));
        const h = harness();
        const errors = await new PluginLoader(h.installer).load(config);
        assert.equal(errors.length, 1);
        assert.match(errors[0]!, /^error: plugin manifest mismatch: null-package /);
        assert.deepEqual(h.cli.run('probe'), ['error: unknown command: probe']);
        ok(h, 'init');
      } finally { rmSync(directory, { recursive: true, force: true }); }
    });
  }
}

test('review: explicit null module manifest does not fall back to the instance', async () => {
  for (const provided of [false, true]) {
    const directory = mkdtempSync(join(tmpdir(), 'svg-review-null-module-'));
    try {
      const plugin = join(directory, 'plugin.mjs');
      writeFileSync(plugin, (provided ? 'export const contributes=null; ' : '') + 'export default class ProbePlugin { name="null-module"; contributes={commands:["probe"]}; activate(c){c.registerCommand({name:"probe",help:"probe",create(){return {execute(){return ["probe works"];}};}});} }');
      const config = join(directory, 'plugins.config.json');
      writeFileSync(config, JSON.stringify({ plugins: [{ module: plugin }] }));
      const h = harness(), errors = await new PluginLoader(h.installer).load(config);
      if (provided) {
        assert.equal(errors.length, 1);
        assert.match(errors[0]!, /^error: plugin manifest mismatch: null-module /);
        assert.deepEqual(h.cli.run('probe'), ['error: unknown command: probe']);
      } else {
        assert.deepEqual(errors, []);
        assert.deepEqual(h.cli.run('probe'), ['probe works']);
      }
    } finally { rmSync(directory, { recursive: true, force: true }); }
  }
});

for (const category of ['shapes','commands','decorators','attributes']) {
  test('review: null contribution category is invalid while omission stays empty (' + category + ')', () => {
    for (const invalid of [false, true]) {
      const h = harness();
      // Use the untyped external boundary to represent malformed plugin metadata.
      const contributes = invalid ? { [category]: null } : {};
      const plugin = { name: 'null-category', contributes, activate() {} } as unknown as import('../src/application/Plugin.js').Plugin;
      const error = h.installer.install(plugin);
      if (invalid) assert.match(error!, /^error: plugin manifest mismatch: null-category /);
      else assert.equal(error, undefined);
      ok(h, 'init');
    }
  });
}

test('review: malformed package metadata cannot fall back to an instance manifest', async () => {
  for (const metadata of ['{broken','null','[]','"text"','123']) {
    const directory = mkdtempSync(join(tmpdir(), 'svg-review-json-metadata-'));
    try {
      const packagePath = join(directory, 'plugin');
      mkdirSync(packagePath);
      writeFileSync(join(packagePath, 'package.json'), metadata);
      writeFileSync(join(packagePath, 'index.mjs'), 'export default class ProbePlugin { name="invalid-json"; contributes={commands:["probe"]}; activate(c){c.registerCommand({name:"probe",help:"probe",create(){return {execute(){return ["leaked"];}};}});} }');
      const config = join(directory, 'plugins.config.json');
      writeFileSync(config, JSON.stringify({ plugins: [{ module: join(packagePath, 'index.mjs') }] }));
      const h = harness(), errors = await new PluginLoader(h.installer).load(config);
      assert.equal(errors.length, 1);
      assert.match(errors[0]!, /^error: plugin failed to activate:/);
      assert.deepEqual(h.cli.run('probe'), ['error: unknown command: probe']);
      ok(h, 'init');
    } finally { rmSync(directory, { recursive: true, force: true }); }
  }
});

for (const variant of [
  { name: 'default module-sync', condition: 'module-sync', args: [] },
  { name: 'default node-addons', condition: 'node-addons', args: [] },
  { name: 'conditions equals', condition: 'course-test', args: ['--conditions=course-test'] },
  { name: 'conditions pair', condition: 'course-test', args: ['--conditions', 'course-test'] },
  { name: 'short condition', condition: 'course-test', args: ['-C', 'course-test'] },
  { name: 'NODE_OPTIONS condition', condition: 'course-test', args: [], nodeOptions: '--conditions=course-test' },
  { name: 'disabled addons', condition: 'node-addons', args: ['--no-addons'] },
  { name: 'disabled module-sync', condition: 'module-sync', args: ['--no-experimental-require-module'] },
]) {
  test('review: loader matches native Node resolution for ' + variant.name, () => {
    const directory = mkdtempSync(join(tmpdir(), 'svg-review-native-'));
    try {
      const packagePath = join(directory, 'node_modules', 'native-condition');
      mkdirSync(packagePath, { recursive: true });
      writeFileSync(join(packagePath, 'package.json'), JSON.stringify({ name: 'native-condition', type: 'module',
        exports: { [variant.condition]: './preferred.mjs', import: './fallback.mjs' }, contributes: { commands: ['probe'] } }));
      for (const marker of ['preferred', 'fallback']) {
        writeFileSync(join(packagePath, marker + '.mjs'), 'export const selected=' + JSON.stringify(marker) + '; export default class P { name="native-condition"; contributes={commands:["probe"]}; activate(c){c.registerCommand({name:"probe",help:"probe",create(){return {execute(){return [' + JSON.stringify(marker) + '];}};}});} }');
      }
      const config = join(directory, 'plugins.config.json');
      writeFileSync(config, JSON.stringify({ plugins: [{ module: 'native-condition' }] }));
      const imports = [
        ['Fixtures','test/Fixtures.js'], ['AttributeHandlers','src/application/AttributeHandlers.js'],
        ['TreeDecorators','src/application/TreeDecorators.js'], ['CommandRegistry','src/application/CommandRegistry.js'],
        ['CommandFactory','src/cli/CommandFactory.js'], ['CommandDispatcher','src/cli/CommandDispatcher.js'],
        ['PluginInstaller','src/cli/PluginInstaller.js'], ['PluginLoader','src/cli/PluginLoader.js'],
      ].map(([name, file]) => 'import {' + name + '} from ' + JSON.stringify(pathToFileURL(resolve('build', file!)).href) + ';').join('\n');
      const driver = join(directory, 'driver.mjs');
      writeFileSync(driver, imports + '\nconst shapes=Fixtures.shapes(),attributes=new AttributeHandlers(),decorators=new TreeDecorators(),commands=new CommandRegistry(); const editor=Fixtures.editor(undefined,shapes,attributes,decorators),factory=new CommandFactory(editor,commands); const installer=new PluginInstaller(shapes,commands,decorators,attributes,n=>factory.has(n)); const expected=(await import("native-condition")).selected; const errors=await new PluginLoader(installer).load(' + JSON.stringify(config) + '); const actual=new CommandDispatcher(editor,factory).run("probe")[0]; console.log(JSON.stringify({expected,actual,errors}));');
      const env = { ...process.env };
      if (variant.nodeOptions) env.NODE_OPTIONS = [env.NODE_OPTIONS, variant.nodeOptions].filter(Boolean).join(' ');
      const child = spawnSync(process.execPath, [...variant.args, driver], { cwd: directory, encoding: 'utf8', env, timeout: 60000 });
      assert.equal(child.status, 0, child.stderr);
      const result = JSON.parse(child.stdout.trim()) as { expected: string; actual: string; errors: string[] };
      assert.deepEqual(result.errors, []);
      assert.equal(result.actual, result.expected);
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });
}
