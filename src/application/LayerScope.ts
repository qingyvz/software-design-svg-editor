import type { EditScope } from './EditScope.js';
import type { SvgDocument } from '../domain/SvgDocument.js';

export class LayerScope implements EditScope {
  constructor(readonly layerId: string) {}
  available(document: SvgDocument): boolean {
    try {
      document.container(this.layerId);
      return true;
    } catch {
      return false;
    }
  }
  assertEditable(document: SvgDocument, id: string): void {
    const shape = document.get(id);
    if (![...document.container(this.layerId).walk()].slice(1).includes(shape))
      throw new Error(`shape outside active layer: ${id}`);
  }
  assertDestination(document: SvgDocument, id: string): void {
    if (id !== this.layerId) this.assertEditable(document, id);
    document.container(id);
  }
}
