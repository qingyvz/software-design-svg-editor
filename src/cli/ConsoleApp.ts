import { createInterface } from 'node:readline';
import type { Readable, Writable } from 'node:stream';
import { CommandDispatcher } from './CommandDispatcher.js';
import { Editor } from '../application/Editor.js';
export class ConsoleApp {
  constructor(private readonly editor: Editor, private readonly dispatcher = new CommandDispatcher(editor)) {}
  async run(input: Readable, output: Writable, interactive: boolean): Promise<void> {
    const reader = createInterface({ input, output, terminal: interactive, crlfDelay: Infinity });
    output.write("svg-editor 0.1 — type 'help' for commands\n");
    if (interactive) { reader.setPrompt('svg> '); reader.prompt(); }
    try {
      for await (const line of reader) {
        for (const message of this.dispatcher.run(line)) output.write(message + '\n');
        if (this.editor.exiting) break;
        if (interactive) reader.prompt();
      }
    } finally { reader.close(); }
  }
}
