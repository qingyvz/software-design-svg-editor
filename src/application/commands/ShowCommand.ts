import { Command } from '../Command.js';
import type { Editor } from '../Editor.js';
import { TreeFormatter } from '../TreeFormatter.js';
export class ShowCommand extends Command {
  constructor(receiver: Editor, private readonly id: string) { super(receiver); }
  override execute(): readonly string[] { return new TreeFormatter().show(this.receiver.inspect(), this.id); }
}
