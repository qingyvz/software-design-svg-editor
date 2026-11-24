import type { SvgDocument } from '../../domain/SvgDocument.js';
import type { Shape } from '../../domain/Shape.js';
import type { TreeDecorator } from '../../application/TreeDecorator.js';
import { Box } from './Box.js';

export class BoxTypeLabel implements TreeDecorator {
  readonly name = 'box-type-label';
  label(_document: SvgDocument, shape?: Shape): string {
    return shape instanceof Box ? ' (box)' : '';
  }
}
