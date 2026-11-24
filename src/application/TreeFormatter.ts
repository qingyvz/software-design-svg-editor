import type { SvgDocument } from '../domain/SvgDocument.js';
import type { Shape } from '../domain/Shape.js';
import { ShapeFormatter } from './ShapeFormatter.js';
import type { TreeDecorator } from './TreeDecorator.js';
export class TreeFormatter {
  private readonly formatter = new ShapeFormatter();
  constructor(private readonly decorators: readonly TreeDecorator[] = []) {}
  tree(document: SvgDocument, id?: string): readonly string[] {
    const shape = id === undefined ? undefined : document.get(id);
    const lines = [
      (shape ? this.formatter.summary(shape) : `svg (${document.width}x${document.height})`) + this.suffix(document, shape),
    ];
    this.children(document, shape ? shape.children : document.children, '', lines);
    return lines;
  }
  private suffix(document: SvgDocument, shape?: Shape): string {
    return this.decorators.map((decorator) => decorator.label(document, shape)).join('');
  }
  private children(document: SvgDocument, shapes: readonly Shape[], prefix: string, lines: string[]): void {
    shapes.forEach((shape, index) => {
      const last = index === shapes.length - 1;
      lines.push(prefix + (last ? '└── ' : '├── ') + this.formatter.summary(shape) + this.suffix(document, shape));
      this.children(document, shape.children, prefix + (last ? '    ' : '│   '), lines);
    });
  }
  show(document: SvgDocument, id: string): readonly string[] {
    const shape = document.get(id);
    const properties = [...shape.attributes].map(([key, value]) => `${key}=${value}`);
    if (shape.text !== null) properties.push(`text=${JSON.stringify(shape.text)}`);
    return [
      `${this.formatter.label(shape)}  parent=${this.formatter.parent(document, shape)}`,
      ...(properties.length ? ['  ' + properties.join(' ')] : []),
    ];
  }
}
