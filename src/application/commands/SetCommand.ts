import { EditingCommand } from '../EditingCommand.js';
import type { Editor } from '../Editor.js';
import type { EditContext } from '../EditContext.js';
export class SetCommand extends EditingCommand {
  constructor(
    receiver: Editor,
    private readonly id: string,
    private readonly attribute: string,
    private readonly value: string,
  ) {
    super(receiver);
  }
  override get description(): string {
    return `set ${this.id} ${this.attribute}`;
  }
  override apply(document: EditContext): string {
    const shape = document.get(this.id);
    shape.set(this.attribute, this.value);
    return `${document.label(shape)} updated: ${this.attribute}=${JSON.stringify(this.value)}`;
  }
}
