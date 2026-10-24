import { EditingCommand } from '../EditingCommand.js';
import type { Editor } from '../Editor.js';
import type { EditContext } from '../EditContext.js';
export class DeleteCommand extends EditingCommand {
  constructor(
    receiver: Editor,
    private readonly id: string,
  ) {
    super(receiver);
  }
  override get description(): string {
    return `delete ${this.id}`;
  }
  override apply(document: EditContext): string {
    const shape = document.get(this.id);
    document.delete(this.id);
    return `${document.label(shape)} deleted`;
  }
}
