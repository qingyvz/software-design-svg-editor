import { Command } from '../Command.js';
import type { Editor } from '../Editor.js';
export class RedoCommand extends Command {
  constructor(receiver: Editor) { super(receiver); }
  override execute(): readonly string[] { return this.receiver.redo(); }
}
