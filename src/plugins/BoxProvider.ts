import { Box } from './Box.js';
import { Rect } from '../domain/Rect.js';
import { Text } from '../domain/Text.js';
import { Numbers } from '../domain/Numbers.js';
import type { Shape } from '../domain/Shape.js';
import type { ShapeProvider } from '../domain/ShapeProvider.js';

export class BoxProvider implements ShapeProvider {
  readonly type = 'box';
  readonly svgTag = 'g';
  readonly kind = 'box';

  create(id: string, parameters: readonly string[]): Box {
    if (parameters.length !== 5) throw new Error('box requires x y width height "label"');
    const [x, y, width, height] = parameters.slice(0, 4).map(value => Numbers.parse(value, 'box geometry')) as [number, number, number, number];
    const box = new Box(id);
    const body = new Rect(id + '-rect', x, y, width, height);
    body.set('fill', '#4a90d9');
    box.add(body);
    box.add(new Text(id + '-label', x + 20, y + height / 2 + 5, parameters[4]!));
    return box;
  }

  fromSvg(id: string, attributes: ReadonlyMap<string, string>, _content: string, children: readonly Shape[]): Box {
    if (!children.some(child => child.id === id + '-rect' && child instanceof Rect) ||
      !children.some(child => child.id === id + '-label' && child instanceof Text)) throw new Error(`invalid box structure: ${id}`);
    const box = new Box(id);
    for (const child of children) box.add(child);
    for (const [key, value] of attributes) {
      if (!['id', 'transform', 'xmlns'].includes(key)) box.importPresentation(key, value);
    }
    return box;
  }
}
