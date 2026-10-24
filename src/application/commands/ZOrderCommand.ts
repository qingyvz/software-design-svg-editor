import { EditingCommand } from '../EditingCommand.js';
import type { Editor } from '../Editor.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';
export class ZOrderCommand extends EditingCommand {
  constructor(receiver: Editor, private readonly id: string, private readonly toFront: boolean) { super(receiver); }
  override get description(): string { return `${this.toFront ? 'front' : 'back'} ${this.id}`; }
  override apply(document: SvgDocument): string { document.reorder(this.id, this.toFront); return `${document.get(this.id).label} sent to ${this.toFront ? 'front' : 'back'}`; }
}
