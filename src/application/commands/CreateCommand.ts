import { EditingCommand } from '../EditingCommand.js';
import type { Editor } from '../Editor.js';
import type { EditContext } from '../EditContext.js';

export class CreateCommand extends EditingCommand {
  constructor(receiver: Editor, private readonly type: string, private readonly id: string,
    private readonly params: readonly string[], private readonly containerId?: string) { super(receiver); }
  override get description(): string { return `create ${this.type} ${this.id}`; }
  override apply(context: EditContext): string {
    const shape = context.create(this.type, this.id, this.params, this.containerId);
    const parent = context.parentLabel(shape);
    return `${shape.label} created` + (parent === 'svg' ? '' : ` in ${parent}`);
  }
}
