import type { Shape } from './Shape.js';

export interface ShapeProvider {
  readonly type: string;
  readonly svgTag: string;
  readonly kind?: string;
  create(id: string, parameters: readonly string[]): Shape;
  fromSvg(
    id: string,
    attributes: ReadonlyMap<string, string>,
    content: string,
    children: readonly Shape[],
  ): Shape;
}
