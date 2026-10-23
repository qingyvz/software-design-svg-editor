import { EditingCommand } from '../EditingCommand.js';
import type { Editor } from '../Editor.js';
import type { EditContext } from '../EditContext.js';
export class MoveCommand extends EditingCommand {
  constructor(receiver: Editor, private readonly id: string, private readonly dx: number, private readonly dy: number) { super(receiver); }
  override get description(): string { return `move ${this.id} ${this.dx} ${this.dy}`; }
  override apply(document: EditContext): string { const shape = document.get(this.id); shape.move(this.dx, this.dy); return `${shape.label} moved by (${this.dx},${this.dy})`; }
}
