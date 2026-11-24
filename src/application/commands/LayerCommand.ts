import { Command } from '../Command.js';
import type { CommandReceiver } from '../CommandReceiver.js';

export class LayerCommand extends Command<CommandReceiver> {
  constructor(
    receiver: CommandReceiver,
    private readonly id?: string | null,
  ) {
    super(receiver);
  }
  override execute(): readonly string[] {
    if (this.id === undefined) return this.receiver.describeLayer();
    return this.receiver.setLayer(this.id ?? undefined);
  }
}
