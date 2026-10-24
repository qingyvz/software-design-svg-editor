import type { EditScope } from './EditScope.js';
import type { SvgDocument } from '../domain/SvgDocument.js';

export class CanvasScope implements EditScope {
  readonly layerId = undefined;
  available(_document: SvgDocument): boolean { return true; }
  assertEditable(document: SvgDocument, id: string): void { document.get(id); }
  assertDestination(document: SvgDocument, id: string): void { document.container(id); }
}
