import { Command } from '../Command.js';
import type { Editor } from '../Editor.js';
export class SaveCommand extends Command {
  constructor(receiver: Editor, private readonly path?: string) { super(receiver); }
  override execute(): readonly string[] { return this.receiver.save(this.path); }
}
