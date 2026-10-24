import { Command } from '../Command.js';
import type { Editor } from '../Editor.js';
export class InitCommand extends Command {
  constructor(
    receiver: Editor,
    private readonly width = 800,
    private readonly height = 600,
  ) {
    super(receiver);
  }
  override execute(): readonly string[] {
    return this.receiver.init(this.width, this.height);
  }
}
