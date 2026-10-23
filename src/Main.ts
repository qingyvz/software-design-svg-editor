import { readFileSync } from 'node:fs';
import { Readable } from 'node:stream';
import { Editor } from './application/Editor.js';
import { ShapeFactory } from './domain/ShapeFactory.js';
import { NodeDocumentStore } from './infrastructure/NodeDocumentStore.js';
import { SvgCodec } from './infrastructure/SvgCodec.js';
import { ConsoleApp } from './cli/ConsoleApp.js';
import { BoxProvider } from './plugins/BoxProvider.js';

try {
  const args = process.argv.slice(2);
  let script: string | undefined;
  let withBox = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--box' && !withBox) withBox = true;
    else if (args[i] === '--script' && script === undefined && args[i + 1] !== undefined) script = args[++i]!;
    else throw new Error('usage: npm run cli -- [--box] [--script file.txt]');
  }
  const shapes = new ShapeFactory();
  if (withBox) shapes.register(new BoxProvider());
  const input = script === undefined ? process.stdin : Readable.from([readFileSync(script, 'utf8')]);
  const editor = new Editor(new NodeDocumentStore(new SvgCodec(shapes)), shapes);
  await new ConsoleApp(editor).run(input, process.stdout, script === undefined && !!process.stdin.isTTY);
} catch (error) {
  process.stderr.write('error: ' + (error instanceof Error ? error.message : 'unexpected failure').replace(/[\r\n]+/g, ' ') + '\n');
  process.exitCode = 1;
}
