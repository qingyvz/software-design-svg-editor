import { EditingCommand } from '../EditingCommand.js';
import type { Editor } from '../Editor.js';
import type { EditContext } from '../EditContext.js';
export class GroupCommand extends EditingCommand {
  constructor(receiver: Editor, private readonly id: string, private readonly ids: readonly string[]) { super(receiver); }
  override get description(): string { return `group ${this.id}`; }
  override apply(document: EditContext): string { const group = document.group(this.id, this.ids); return `${group.label} created with ${group.children.length} children`; }
}
