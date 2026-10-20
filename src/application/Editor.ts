import { SvgDocument } from '../domain/SvgDocument.js';
import type { DocumentPort } from './DocumentPort.js';
import type { EditingCommand } from './EditingCommand.js';
import { EditRecord } from './EditRecord.js';
import { History } from './History.js';

export class Editor {
  private current: SvgDocument | undefined;
  private path: string | undefined;
  private readonly history = new History();
  private exitRequested = false;
  constructor(private readonly documents: DocumentPort) {}
  private requireDocument(): SvgDocument {
    if (!this.current) throw new Error("no document. use 'init' or 'read' first");
    return this.current;
  }
  inspect(): SvgDocument { return this.requireDocument().clone(); }
  get exiting(): boolean { return this.exitRequested; }
  requestExit(): void { this.exitRequested = true; }
  init(width = 800, height = 600): readonly string[] {
    const document = new SvgDocument(width, height);
    this.current = document; this.path = undefined; this.history.barrier();
    return [`canvas ${width}x${height} created`];
  }
  read(path: string): readonly string[] {
    const loaded = this.documents.read(path);
    loaded.document.assertValid();
    this.current = loaded.document.clone(); this.path = path; this.history.barrier();
    return [...loaded.warnings, `read ${path} (${this.current.count} elements)`];
  }
  save(path?: string): readonly string[] {
    const document = this.requireDocument();
    const destination = path ?? this.path;
    if (!destination) throw new Error('no file path. use save <file.svg>');
    this.documents.write(destination, document.clone());
    this.path = destination; this.history.barrier();
    return [`saved to ${destination} (${document.count} elements)`];
  }
  canvas(width?: number, height?: number): readonly string[] {
    const document = this.requireDocument();
    if (width === undefined && height === undefined) return [`canvas ${document.width}x${document.height}`];
    if (width === undefined || height === undefined) throw new Error('usage: canvas [w h]');
    const draft = document.clone(); draft.resize(width, height);
    this.current = draft; this.history.barrier();
    return [`canvas resized to ${width}x${height}`];
  }
  executeEdit(command: EditingCommand): readonly string[] {
    const before = this.requireDocument(), draft = before.clone();
    // 草稿校验通过后再提交，失败时保留原文档和历史。
    const message = command.apply(draft);
    draft.assertValid();
    const record = new EditRecord(command.description, before, draft);
    this.current = draft; this.history.record(record);
    return [message];
  }
  undo(): readonly string[] {
    this.requireDocument();
    const record = this.history.undo(); this.current = record.undo();
    return [`undone: ${record.description}`];
  }
  redo(): readonly string[] {
    this.requireDocument();
    const record = this.history.redo(); this.current = record.redo();
    return [`redone: ${record.description}`];
  }
}
