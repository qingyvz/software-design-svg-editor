import type { SvgDocument } from '../domain/SvgDocument.js';
export interface LoadedDocument { readonly document: SvgDocument; readonly warnings: readonly string[]; }
export interface DocumentPort {
  read(path: string): LoadedDocument;
  write(path: string, document: SvgDocument): void;
}
