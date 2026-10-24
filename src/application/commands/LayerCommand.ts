import { Command } from '../Command.js';
import type { Editor } from '../Editor.js';

export class LayerCommand extends Command {
  constructor(
    receiver: Editor,
    private readonly id?: string | null,
  ) {
    super(receiver);
  }
  override execute(): readonly string[] {
    if (this.id === undefined) return this.receiver.describeLayer();
    return this.receiver.setLayer(this.id ?? undefined);
  }
}
