import type { SvgDocument } from '../../../src/domain/SvgDocument.js';
import type { Shape } from '../../../src/domain/Shape.js';
import type { TreeDecorator } from '../../../src/application/TreeDecorator.js';
import { Box } from './Box.js';

export class BoxTypeLabel implements TreeDecorator {
  readonly name = 'box-type-label';
  label(_document: SvgDocument, shape?: Shape): string {
    return shape instanceof Box ? ' (box)' : '';
  }
}
