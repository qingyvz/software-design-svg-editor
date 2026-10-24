import { SvgDocument } from '../domain/SvgDocument.js';
export class EditRecord {
  private readonly before: SvgDocument;
  private readonly after: SvgDocument;
  constructor(readonly description: string, before: SvgDocument, after: SvgDocument) {
    this.before = before.clone(); this.after = after.clone();
  }
  undo(): SvgDocument { return this.before.clone(); }
  redo(): SvgDocument { return this.after.clone(); }
}
