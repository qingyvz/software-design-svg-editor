import type { Editor } from './Editor.js';
import type { Command } from './Command.js';

export interface CommandContribution {
  readonly name: string;
  readonly help: string;
  create(editor: Editor, arguments_: readonly string[]): Command;
}
