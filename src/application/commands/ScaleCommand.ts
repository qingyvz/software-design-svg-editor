import { EditingCommand } from '../EditingCommand.js';
import type { Editor } from '../Editor.js';
import type { EditContext } from '../EditContext.js';
export class ScaleCommand extends EditingCommand {
  constructor(receiver: Editor, private readonly id: string, private readonly factor: number) { super(receiver); }
  override get description(): string { return `scale ${this.id} ${this.factor}`; }
  override apply(document: EditContext): string { const shape = document.get(this.id); shape.scale(this.factor); return `${shape.label} scaled by ${this.factor}`; }
}
