import type { Editor } from './Editor.js';
export abstract class Command {
  protected constructor(protected readonly receiver: Editor) {}
  abstract execute(): readonly string[];
}
