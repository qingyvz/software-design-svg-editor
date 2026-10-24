import { EditingCommand } from '../EditingCommand.js';
import type { Editor } from '../Editor.js';
import type { EditContext } from '../EditContext.js';

export class MoveManyCommand extends EditingCommand {
  constructor(
    receiver: Editor,
    private readonly ids: readonly string[],
    private readonly dx: number,
    private readonly dy: number,
  ) {
    super(receiver);
  }
  override get description(): string {
    return `move-many ${this.ids.join(' ')}`;
  }
  override apply(context: EditContext): string {
    const targets = context.targets(this.ids);
    for (const shape of targets) shape.move(this.dx, this.dy);
    return `${targets.length} selection roots moved by (${this.dx},${this.dy})`;
  }
}
