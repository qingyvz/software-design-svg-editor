import { Command } from '../Command.js';
import type { CommandReceiver } from '../CommandReceiver.js';
export class RedoCommand extends Command<CommandReceiver> {
  constructor(receiver: CommandReceiver) {
    super(receiver);
  }
  override execute(): readonly string[] {
    return this.receiver.redo();
  }
}
