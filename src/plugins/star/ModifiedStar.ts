import type { SvgDocument } from '../../domain/SvgDocument.js';
import type { Shape } from '../../domain/Shape.js';
import type { TreeDecorator } from '../../application/TreeDecorator.js';
import { SvgDocument as Document } from '../../domain/SvgDocument.js';

/** Content-difference semantics; an ancestor is marked when any descendant changes. */
export class ModifiedStar implements TreeDecorator {
  readonly name = 'modified-star';
  private saved?: SvgDocument;
  checkpoint(document: SvgDocument): void { this.saved = document.clone(); }
  label(document: SvgDocument, shape?: Shape): string {
    const baseline = this.saved;
    if (!baseline) return '';
    const current = shape ? shape : document;
    let saved: Shape | SvgDocument;
    try { saved = shape ? baseline.get(shape.id) : baseline; }
    catch { return ' *'; }
    return this.signature(current) === this.signature(saved) ? '' : ' *';
  }
  private signature(target: Shape | SvgDocument): string {
    if (target instanceof Document) {
      const document = target;
      return JSON.stringify([document.width, document.height, document.viewBox, document.children.map((s) => this.signature(s))]);
    }
    const shape = target as Shape;
    return JSON.stringify([shape.id, shape.tag, [...shape.attributes], shape.text, shape.children.map((s) => this.signature(s))]);
  }
}
