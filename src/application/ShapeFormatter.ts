import type { Shape } from '../domain/Shape.js';
import type { SvgDocument } from '../domain/SvgDocument.js';

export class ShapeFormatter {
  label(shape: Shape): string {
    return `${shape.tag}#${shape.id}`;
  }

  parent(document: SvgDocument, shape: Shape): string {
    const parent = document.parentOf(shape);
    return parent ? this.label(parent) : 'svg';
  }

  summary(shape: Shape): string {
    const attributes = new Map(shape.attributes);
    const label = this.label(shape);
    const take = (key: string): string => {
      const value = attributes.get(key)!;
      attributes.delete(key);
      return value;
    };
    if (shape.text !== null && attributes.has('x') && attributes.has('y')) {
      const position = `(${take('x')},${take('y')})`;
      return `${label}  ${position} ${JSON.stringify(shape.text)} ${this.properties(attributes)}`.trimEnd();
    }
    if (['x1', 'y1', 'x2', 'y2'].every((key) => attributes.has(key))) {
      const endpoints = `(${take('x1')},${take('y1')}) -> (${take('x2')},${take('y2')})`;
      return `${label}  ${endpoints} ${this.properties(attributes)}`.trimEnd();
    }
    const kind = shape.container ? attributes.get('data-kind') : undefined;
    const prefix = kind ? `${label} (${kind})` : label;
    const text = shape.text === null ? '' : ` text=${JSON.stringify(shape.text)}`;
    return `${prefix}${shape.container ? ' ' : '  '}${this.properties(attributes)}${text}`.trimEnd();
  }

  private properties(attributes: ReadonlyMap<string, string>): string {
    const aliases: Record<string, string> = { width: 'w', height: 'h' };
    return [...attributes].map(([key, value]) => `${aliases[key] ?? key}=${value}`).join(' ');
  }
}
