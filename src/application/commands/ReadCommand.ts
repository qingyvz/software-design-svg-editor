import { Command } from '../Command.js';
import type { CommandReceiver } from '../CommandReceiver.js';
export class ReadCommand extends Command<CommandReceiver> {
  constructor(
    receiver: CommandReceiver,
    private readonly path: string,
  ) {
    super(receiver);
  }
  override execute(): readonly string[] {
    return this.receiver.read(this.path);
  }
}
