import { Editor } from '../application/Editor.js';
import { Tokenizer } from './Tokenizer.js';
import { CommandFactory } from './CommandFactory.js';
export class CommandDispatcher {
  private readonly tokenizer = new Tokenizer();
  private readonly factory: CommandFactory;
  constructor(editor: Editor, factory = new CommandFactory(editor)) {
    this.factory = factory;
  }
  run(line: string): readonly string[] {
    try {
      const tokens = this.tokenizer.parse(line);
      if (!tokens.length) return [];
      return this.factory.create(tokens[0]!, tokens.slice(1)).execute();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unexpected failure';
      return ['error: ' + message.replace(/[\r\n]+/g, ' ')];
    }
  }
}
