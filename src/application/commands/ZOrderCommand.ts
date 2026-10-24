import { EditingCommand } from '../EditingCommand.js';
import type { Editor } from '../Editor.js';
import type { EditContext } from '../EditContext.js';
export class ZOrderCommand extends EditingCommand {
  constructor(
    receiver: Editor,
    private readonly id: string,
    private readonly toFront: boolean,
  ) {
    super(receiver);
  }
  override get description(): string {
    return `${this.toFront ? 'front' : 'back'} ${this.id}`;
  }
  override apply(document: EditContext): string {
    document.reorder(this.id, this.toFront);
    return `${document.label(document.get(this.id))} sent to ${this.toFront ? 'front' : 'back'}`;
  }
}
