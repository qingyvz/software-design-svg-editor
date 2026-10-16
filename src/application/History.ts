import { EditRecord } from './EditRecord.js';
export class History {
  private readonly past: EditRecord[] = [];
  private readonly future: EditRecord[] = [];
  private blocked = true;
  barrier(): void { this.past.length = 0; this.future.length = 0; this.blocked = true; }
  record(edit: EditRecord): void { this.past.push(edit); this.future.length = 0; this.blocked = false; }
  undo(): EditRecord {
    if (this.blocked) throw new Error('undo not allowed after io command');
    const edit = this.past.pop();
    if (!edit) throw new Error('nothing to undo');
    this.future.push(edit); return edit;
  }
  redo(): EditRecord {
    if (this.blocked) throw new Error('undo not allowed after io command');
    const edit = this.future.pop();
    if (!edit) throw new Error('nothing to redo');
    this.past.push(edit); return edit;
  }
}
