import { Command } from '../Command.js';
import type { CommandReceiver } from '../CommandReceiver.js';
export class InitCommand extends Command<CommandReceiver> {
  constructor(
    receiver: CommandReceiver,
    private readonly width = 800,
    private readonly height = 600,
  ) {
    super(receiver);
  }
  override execute(): readonly string[] {
    return this.receiver.init(this.width, this.height);
  }
}
