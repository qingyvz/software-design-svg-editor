import { Command } from '../Command.js';
import type { CommandReceiver } from '../CommandReceiver.js';
import { TreeFormatter } from '../TreeFormatter.js';
export class ShowCommand extends Command<CommandReceiver> {
  constructor(
    receiver: CommandReceiver,
    private readonly id: string,
  ) {
    super(receiver);
  }
  override execute(): readonly string[] {
    return new TreeFormatter().show(this.receiver.inspect(), this.id);
  }
}
