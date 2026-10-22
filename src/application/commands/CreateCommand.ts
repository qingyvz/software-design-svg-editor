import { EditingCommand } from '../EditingCommand.js';
import type { Editor } from '../Editor.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';
export class CreateCommand extends EditingCommand {
  constructor(receiver: Editor, private readonly type: string, private readonly id: string,
    private readonly params: readonly string[], private readonly containerId?: string) { super(receiver); }
  override get description(): string { return `create ${this.type} ${this.id}`; }
  override apply(document: SvgDocument): string {
    const shape = this.receiver.createShape(this.type, this.id, this.params);
    document.add(shape, this.containerId);
    return `${shape.label} created` + (this.containerId === undefined ? '' : ` in g#${this.containerId}`);
  }
}
