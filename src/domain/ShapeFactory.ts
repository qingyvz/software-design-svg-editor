import { Shape } from './Shape.js';
import { Rect } from './Rect.js';
import { Circle } from './Circle.js';
import { Ellipse } from './Ellipse.js';
import { Line } from './Line.js';
import { Text } from './Text.js';
import { Group } from './Group.js';
import { BuiltinShapeProvider } from './BuiltinShapeProvider.js';
import type { ShapeProvider } from './ShapeProvider.js';

export class ShapeFactory {
  private readonly providers = new Map<string, ShapeProvider>();
  private readonly svgProviders = new Map<string, ShapeProvider>();

  constructor() {
    this.register(
      new BuiltinShapeProvider(
        'rect',
        ['x', 'y', 'width', 'height'],
        (id, n) => new Rect(id, n[0]!, n[1]!, n[2]!, n[3]!),
        { paint: 'fill' },
      ),
    );
    this.register(
      new BuiltinShapeProvider(
        'circle',
        ['cx', 'cy', 'r'],
        (id, n) => new Circle(id, n[0]!, n[1]!, n[2]!),
        { paint: 'fill' },
      ),
    );
    this.register(
      new BuiltinShapeProvider(
        'ellipse',
        ['cx', 'cy', 'rx', 'ry'],
        (id, n) => new Ellipse(id, n[0]!, n[1]!, n[2]!, n[3]!),
        { paint: 'fill' },
      ),
    );
    this.register(
      new BuiltinShapeProvider(
        'line',
        ['x1', 'y1', 'x2', 'y2'],
        (id, n) => new Line(id, n[0]!, n[1]!, n[2]!, n[3]!),
        { paint: 'stroke' },
      ),
    );
    this.register(
      new BuiltinShapeProvider(
        'text',
        ['x', 'y'],
        (id, n, text) => new Text(id, n[0]!, n[1]!, text),
        { text: true },
      ),
    );
    this.register(new BuiltinShapeProvider('g', [], (id) => new Group(id)));
  }

  register(provider: ShapeProvider): this {
    const key = this.svgKey(provider.svgTag, provider.kind);
    if (!provider.type || !provider.svgTag || provider.kind === '')
      throw new Error('invalid shape provider');
    if (this.providers.has(provider.type) || this.svgProviders.has(key))
      throw new Error(`shape provider already registered: ${provider.type}`);
    this.providers.set(provider.type, provider);
    this.svgProviders.set(key, provider);
    return this;
  }

  create(type: string, id: string, parameters: readonly string[]): Shape {
    const provider = this.providers.get(type);
    if (!provider) throw new Error(`unknown shape type: ${type} (is the plugin loaded?)`);
    return this.validate(provider, provider.create(id, parameters), id);
  }

  fromSvg(
    tag: string,
    id: string,
    attributes: ReadonlyMap<string, string>,
    content: string,
    children: readonly Shape[] = [],
  ): Shape {
    const provider =
      this.svgProviders.get(this.svgKey(tag, attributes.get('data-kind'))) ??
      this.svgProviders.get(this.svgKey(tag));
    if (!provider) throw new Error(`unknown shape type: ${tag} (is the plugin loaded?)`);
    return this.validate(
      provider,
      provider.fromSvg(id, new Map(attributes), content, children),
      id,
    );
  }

  private svgKey(tag: string, kind?: string): string {
    return JSON.stringify([tag, kind ?? null]);
  }
  private validate(provider: ShapeProvider, shape: Shape, id: string): Shape {
    if (shape.id !== id || shape.tag !== provider.svgTag)
      throw new Error(`invalid result from shape provider: ${provider.type}`);
    if (provider.kind) shape.importPresentation('data-kind', provider.kind);
    return shape;
  }
}
