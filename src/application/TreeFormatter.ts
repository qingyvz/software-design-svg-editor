import type { SvgDocument } from '../domain/SvgDocument.js';
import type { Shape } from '../domain/Shape.js';
export class TreeFormatter {
  tree(document: SvgDocument, id?: string): readonly string[] {
    const shape = id === undefined ? undefined : document.get(id);
    const lines = [shape ? shape.summary() : `svg (${document.width}x${document.height})`];
    this.children(shape ? shape.children : document.children, '', lines);
    return lines;
  }
  private children(shapes: readonly Shape[], prefix: string, lines: string[]): void {
    shapes.forEach((shape, index) => {
      const last = index === shapes.length - 1;
      lines.push(prefix + (last ? '└── ' : '├── ') + shape.summary());
      this.children(shape.children, prefix + (last ? '    ' : '│   '), lines);
    });
  }
  show(document: SvgDocument, id: string): readonly string[] {
    const shape = document.get(id);
    const properties = [...shape.attributes].map(([key, value]) => `${key}=${value}`);
    if (shape.text !== null) properties.push(`text=${JSON.stringify(shape.text)}`);
    return [`${shape.label}  parent=${document.parentLabel(shape)}`, ...(properties.length ? ['  ' + properties.join(' ')] : [])];
  }
}
