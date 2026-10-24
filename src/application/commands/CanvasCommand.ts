import { Command } from '../Command.js';
import type { Editor } from '../Editor.js';
export class CanvasCommand extends Command {
  constructor(
    receiver: Editor,
    private readonly width?: number,
    private readonly height?: number,
  ) {
    super(receiver);
  }
  override execute(): readonly string[] {
    return this.receiver.canvas(this.width, this.height);
  }
}
