import type { AttributeHandler } from '../application/AttributeHandler.js';
import type { Shape } from '../domain/Shape.js';
import { Box } from './Box.js';
import { Rect } from '../domain/Rect.js';
import { Text } from '../domain/Text.js';

export class BoxAttributes implements AttributeHandler {
  readonly name = 'box-attributes';
  handles(shape: Shape, attribute: string): boolean {
    return shape instanceof Box && (attribute === 'fill' || attribute === 'label');
  }
  apply(shape: Shape, attribute: string, value: string): void {
    if (!(shape instanceof Box)) throw new Error('box handler requires a box');
    if (attribute === 'fill') {
      const body = shape.children.find((child) => child.id === shape.id + '-rect');
      if (!(body instanceof Rect)) throw new Error('box body is missing');
      body.set('fill', value);
    } else if (attribute === 'label') {
      const label = shape.children.find((child) => child.id === shape.id + '-label');
      if (!(label instanceof Text)) throw new Error('box label is missing');
      label.set('text', value);
    } else throw new Error(`unknown attribute: ${attribute}`);
  }
}
