import { EditingCommand } from '../EditingCommand.js';
import type { Editor } from '../Editor.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';
export class DeleteCommand extends EditingCommand {
  constructor(receiver: Editor, private readonly id: string) { super(receiver); }
  override get description(): string { return `delete ${this.id}`; }
  override apply(document: SvgDocument): string { const shape = document.get(this.id); document.delete(this.id); return `${shape.label} deleted`; }
}
