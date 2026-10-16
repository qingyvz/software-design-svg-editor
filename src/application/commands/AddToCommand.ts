import { EditingCommand } from '../EditingCommand.js';
import type { Editor } from '../Editor.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';
export class AddToCommand extends EditingCommand {
  constructor(receiver: Editor, private readonly groupId: string, private readonly id: string) { super(receiver); }
  override get description(): string { return `addto ${this.groupId} ${this.id}`; }
  override apply(document: SvgDocument): string { document.addTo(this.groupId, this.id); return `${document.get(this.id).label} moved into g#${this.groupId}`; }
}
