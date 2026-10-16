import { SvgDocument } from '../src/domain/SvgDocument.js';
import type { DocumentPort, LoadedDocument } from '../src/application/DocumentPort.js';
export class MemoryDocumentStore implements DocumentPort {
  private readonly files = new Map<string, SvgDocument>();
  failWrites = false;
  read(path: string): LoadedDocument {
    const document = this.files.get(path);
    if (!document) throw new Error(`cannot read file: ${path}`);
    return { document: document.clone(), warnings: [] };
  }
  write(path: string, document: SvgDocument): void {
    if (this.failWrites) throw new Error(`cannot write file: ${path}`);
    this.files.set(path, document.clone());
  }
}
