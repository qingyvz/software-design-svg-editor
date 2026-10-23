import type { SvgDocument } from '../domain/SvgDocument.js';

export interface EditScope {
  readonly layerId: string | undefined;
  available(document: SvgDocument): boolean;
  assertEditable(document: SvgDocument, id: string): void;
  assertDestination(document: SvgDocument, id: string): void;
}
