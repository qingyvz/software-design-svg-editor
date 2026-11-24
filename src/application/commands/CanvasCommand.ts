import { Command } from '../Command.js';
import type { CommandReceiver } from '../CommandReceiver.js';
export class CanvasCommand extends Command<CommandReceiver> {
  constructor(
    receiver: CommandReceiver,
    private readonly width?: number,
    private readonly height?: number,
  ) {
    super(receiver);
  }
  override execute(): readonly string[] {
    return this.receiver.canvas(this.width, this.height);
  }
}
