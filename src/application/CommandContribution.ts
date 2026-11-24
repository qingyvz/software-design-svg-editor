import type { CommandReceiver } from './CommandReceiver.js';
import type { Command } from './Command.js';

export interface CommandContribution {
  readonly name: string;
  readonly help: string;
  create(editor: CommandReceiver, arguments_: readonly string[]): Command;
}
