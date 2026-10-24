import { Command } from './Command.js';
import type { EditContext } from './EditContext.js';
export abstract class EditingCommand extends Command {
  abstract get description(): string;
  abstract apply(document: EditContext): string;
  override execute(): readonly string[] {
    return this.receiver.executeEdit(this);
  }
}
