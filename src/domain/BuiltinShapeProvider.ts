import { Numbers } from './Numbers.js';
import type { Shape } from './Shape.js';
import type { ShapeProvider } from './ShapeProvider.js';

export class BuiltinShapeProvider implements ShapeProvider {
  readonly svgTag: string;
  constructor(
    readonly type: string,
    private readonly geometry: readonly string[],
    private readonly construct: (id: string, coordinates: readonly number[], text: string) => Shape,
    private readonly options: { text?: boolean; paint?: string } = {},
  ) { this.svgTag = type; }

  create(id: string, parameters: readonly string[]): Shape {
    const minimum = this.geometry.length + (this.options.text ? 1 : 0);
    const maximum = minimum + (this.options.paint ? 1 : 0);
    if (parameters.length < minimum || parameters.length > maximum) throw new Error(`invalid parameters for ${this.type}`);
    const coordinates = this.geometry.map((key, index) => Numbers.parse(parameters[index]!, key));
    const shape = this.construct(id, coordinates, this.options.text ? parameters[this.geometry.length]! : '');
    if (this.options.paint && parameters.length > minimum) shape.set(this.options.paint, parameters[minimum]!);
    return shape;
  }

  fromSvg(id: string, attributes: ReadonlyMap<string, string>, content: string, children: readonly Shape[]): Shape {
    const coordinates = this.geometry.map(key => Numbers.parse((attributes.get(key) ?? '0').replace(/px$/, ''), key));
    const shape = this.construct(id, coordinates, content);
    for (const [key, value] of attributes) {
      if (!['id', 'transform', 'xmlns'].includes(key) && !this.geometry.includes(key)) shape.importPresentation(key, value);
    }
    if (children.length && !shape.container) throw new Error(`child elements not supported in <${this.svgTag}>`);
    for (const child of children) shape.container!.add(child);
    return shape;
  }
}
