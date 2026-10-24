import { readFileSync } from 'node:fs';
import { Readable } from 'node:stream';
import { Editor } from './application/Editor.js';
import { NodeDocumentStore } from './infrastructure/NodeDocumentStore.js';
import { ConsoleApp } from './cli/ConsoleApp.js';

try {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== '--script')) throw new Error('usage: npm run cli -- [--script file.txt]');
  const input = args.length ? Readable.from([readFileSync(args[1]!, 'utf8')]) : process.stdin;
  await new ConsoleApp(new Editor(new NodeDocumentStore())).run(input, process.stdout, !args.length && !!process.stdin.isTTY);
} catch (error) {
  process.stderr.write('error: ' + (error instanceof Error ? error.message : 'unexpected failure').replace(/[\r\n]+/g, ' ') + '\n');
  process.exitCode = 1;
}
