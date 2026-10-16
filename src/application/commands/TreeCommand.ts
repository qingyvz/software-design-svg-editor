import { Command } from '../Command.js';
import type { Editor } from '../Editor.js';
import { TreeFormatter } from '../TreeFormatter.js';
export class TreeCommand extends Command {
  constructor(receiver: Editor, private readonly id?: string) { super(receiver); }
  override execute(): readonly string[] { return new TreeFormatter().tree(this.receiver.inspect(), this.id); }
}
