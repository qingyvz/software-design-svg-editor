import { Command } from '../Command.js';
import type { Editor } from '../Editor.js';
export class ExitCommand extends Command {
  constructor(receiver: Editor) {
    super(receiver);
  }
  override execute(): readonly string[] {
    this.receiver.requestExit();
    return ['bye'];
  }
}
