import { EditingCommand } from '../EditingCommand.js';
import type { Editor } from '../Editor.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';
export class UngroupCommand extends EditingCommand {
  constructor(receiver: Editor, private readonly id: string) { super(receiver); }
  override get description(): string { return `ungroup ${this.id}`; }
  override apply(document: SvgDocument): string { document.ungroup(this.id); return `g#${this.id} ungrouped`; }
}
