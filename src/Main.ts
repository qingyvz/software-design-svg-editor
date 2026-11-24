import { BoxPlugin } from './plugins/box/BoxPlugin.js';
import { readFileSync } from 'node:fs';
import { Readable } from 'node:stream';
import { Editor } from './application/Editor.js';
import { DefaultShapes } from './host/DefaultShapes.js';
import { NodeDocumentStore } from './infrastructure/NodeDocumentStore.js';
import { SvgCodec } from './infrastructure/SvgCodec.js';
import { ConsoleApp } from './cli/ConsoleApp.js';
import { StatsPlugin } from './plugins/stats/StatsPlugin.js';
import { DirPlugin } from './plugins/dir/DirPlugin.js';
import { StarPlugin } from './plugins/star/StarPlugin.js';
import { AttributeHandlers } from './application/AttributeHandlers.js';
import { TreeDecorators } from './application/TreeDecorators.js';
import { CommandRegistry } from './application/CommandRegistry.js';
import { CommandFactory } from './cli/CommandFactory.js';
import { CommandDispatcher } from './cli/CommandDispatcher.js';
import { PluginInstaller } from './cli/PluginInstaller.js';
import { PluginLoader } from './cli/PluginLoader.js';

try {
  const args = process.argv.slice(2);
  let script: string | undefined;
  let withBox = false;
  let config: string | undefined;
  let withPlugins = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--box' && !withBox) withBox = true;
    else if (args[i] === '--plugins' && !withPlugins) withPlugins = true;
    else if (args[i] === '--config' && config === undefined && args[i + 1] !== undefined)
      config = args[++i]!;
    else if (args[i] === '--script' && script === undefined && args[i + 1] !== undefined)
      script = args[++i]!;
    else throw new Error('usage: npm run cli -- [--box] [--plugins] [--config plugins.config.json] [--script file.txt]');
  }
  const shapes = DefaultShapes.create();
  const commands = new CommandRegistry();
  const attributes = new AttributeHandlers();
  const decorators = new TreeDecorators();
  const editor = new Editor(new NodeDocumentStore(new SvgCodec(shapes)), shapes, attributes, decorators);
  const factory = new CommandFactory(editor, commands);
  const installer = new PluginInstaller(shapes, commands, decorators, attributes, (name) => factory.has(name));
  const failures: string[] = [];
  if (withPlugins || withBox) {
    for (const plugin of withPlugins
      ? [new StatsPlugin(), new DirPlugin(), new BoxPlugin(), new StarPlugin()]
      : [new BoxPlugin()]) {
      const failure = installer.install(plugin);
      if (failure) failures.push(failure);
    }
  }
  if (config) failures.push(...await new PluginLoader(installer).load(config));
  const input =
    script === undefined ? process.stdin : Readable.from([readFileSync(script, 'utf8')]);
  await new ConsoleApp(editor, new CommandDispatcher(editor, factory), failures).run(
    input,
    process.stdout,
    script === undefined && !!process.stdin.isTTY,
  );
} catch (error) {
  process.stderr.write(
    'error: ' +
      (error instanceof Error ? error.message : 'unexpected failure').replace(/[\r\n]+/g, ' ') +
      '\n',
  );
  process.exitCode = 1;
}
