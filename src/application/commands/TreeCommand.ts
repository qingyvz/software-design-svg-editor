import { Command } from '../Command.js';
import type { CommandReceiver } from '../CommandReceiver.js';
export class TreeCommand extends Command<CommandReceiver> {
  constructor(
    receiver: CommandReceiver,
    private readonly id?: string,
  ) {
    super(receiver);
  }
  override execute(): readonly string[] {
    return this.receiver.tree(this.id);
  }
}
