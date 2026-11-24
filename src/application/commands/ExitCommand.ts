import { Command } from '../Command.js';
import type { CommandReceiver } from '../CommandReceiver.js';
export class ExitCommand extends Command<CommandReceiver> {
  constructor(receiver: CommandReceiver) {
    super(receiver);
  }
  override execute(): readonly string[] {
    this.receiver.requestExit();
    return ['bye'];
  }
}
