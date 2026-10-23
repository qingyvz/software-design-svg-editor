import { EditingCommand } from '../EditingCommand.js';
import type { Editor } from '../Editor.js';
import type { EditContext } from '../EditContext.js';
import { AffineTransform } from '../../domain/AffineTransform.js';

export class RotateCommand extends EditingCommand {
  constructor(receiver: Editor, private readonly ids: readonly string[], private readonly degrees: number,
    private readonly cx = 0, private readonly cy = 0) { super(receiver); }
  override get description(): string { return `rotate ${this.ids.join(' ')} by ${this.degrees}`; }
  override apply(context: EditContext): string {
    const targets = context.targets(this.ids);
    const transform = AffineTransform.rotation(this.degrees, this.cx, this.cy);
    for (const shape of targets) shape.applyTransform(transform);
    return `${targets.length} selection roots rotated by ${this.degrees} degrees`;
  }
}
