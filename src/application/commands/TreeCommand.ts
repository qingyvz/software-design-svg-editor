import { Command } from '../Command.js';
import type { Editor } from '../Editor.js';
export class TreeCommand extends Command {
  constructor(
    receiver: Editor,
    private readonly id?: string,
  ) {
    super(receiver);
  }
  override execute(): readonly string[] {
    return this.receiver.tree(this.id);
  }
}
