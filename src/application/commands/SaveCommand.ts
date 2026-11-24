import { Command } from '../Command.js';
import type { CommandReceiver } from '../CommandReceiver.js';
export class SaveCommand extends Command<CommandReceiver> {
  constructor(
    receiver: CommandReceiver,
    private readonly path?: string,
  ) {
    super(receiver);
  }
  override execute(): readonly string[] {
    return this.receiver.save(this.path);
  }
}
