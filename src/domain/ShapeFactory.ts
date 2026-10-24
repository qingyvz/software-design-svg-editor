import { Shape } from './Shape.js';
import { Rect } from './Rect.js';
import { Circle } from './Circle.js';
import { Ellipse } from './Ellipse.js';
import { Line } from './Line.js';
import { Text } from './Text.js';
import { Group } from './Group.js';
import { Numbers } from './Numbers.js';

interface Definition {
  readonly geometry: readonly string[];
  readonly construct: (id: string, n: readonly number[], text: string) => Shape;
  readonly text?: boolean;
  readonly paint?: string;
}
export class ShapeFactory {
  // 类型名只在这里分派；后续插件化将把登记表变成显式注册接口。
  private readonly definitions = new Map<string, Definition>([
    ['rect', { geometry: ['x', 'y', 'width', 'height'], construct: (id, n) => new Rect(id, n[0]!, n[1]!, n[2]!, n[3]!), paint: 'fill' }],
    ['circle', { geometry: ['cx', 'cy', 'r'], construct: (id, n) => new Circle(id, n[0]!, n[1]!, n[2]!), paint: 'fill' }],
    ['ellipse', { geometry: ['cx', 'cy', 'rx', 'ry'], construct: (id, n) => new Ellipse(id, n[0]!, n[1]!, n[2]!, n[3]!), paint: 'fill' }],
    ['line', { geometry: ['x1', 'y1', 'x2', 'y2'], construct: (id, n) => new Line(id, n[0]!, n[1]!, n[2]!, n[3]!), paint: 'stroke' }],
    ['text', { geometry: ['x', 'y'], construct: (id, n, text) => new Text(id, n[0]!, n[1]!, text), text: true }],
    ['g', { geometry: [], construct: id => new Group(id) }],
  ]);
  private definition(type: string): Definition {
    const entry = this.definitions.get(type);
    if (!entry) throw new Error(`unknown shape type: ${type} (is the plugin loaded?)`);
    return entry;
  }
  create(type: string, id: string, params: readonly string[]): Shape {
    const definition = this.definition(type);
    const minimum = definition.geometry.length + (definition.text ? 1 : 0);
    const maximum = minimum + (definition.paint ? 1 : 0);
    if (params.length < minimum || params.length > maximum) throw new Error(`invalid parameters for ${type}`);
    const geometry = definition.geometry.map((key, index) => Numbers.parse(params[index]!, key));
    const shape = definition.construct(id, geometry, definition.text ? params[definition.geometry.length]! : '');
    if (definition.paint && params.length > minimum) shape.set(definition.paint, params[minimum]!);
    return shape;
  }
  fromSvg(type: string, id: string, attrs: ReadonlyMap<string, string>, content: string): Shape {
    const definition = this.definition(type);
    const numbers = definition.geometry.map(key => {
      const raw = attrs.get(key) ?? '0';
      return Numbers.parse(raw.replace(/px$/, ''), key);
    });
    const shape = definition.construct(id, numbers, content);
    for (const [key, value] of attrs) {
      if (!['id', 'transform', 'xmlns'].includes(key) && !definition.geometry.includes(key)) shape.importPresentation(key, value);
    }
    return shape;
  }
}
