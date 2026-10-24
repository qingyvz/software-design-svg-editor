import { Command } from './Command.js';
import type { SvgDocument } from '../domain/SvgDocument.js';
export abstract class EditingCommand extends Command {
  abstract get description(): string;
  abstract apply(document: SvgDocument): string;
  override execute(): readonly string[] { return this.receiver.executeEdit(this); }
}
