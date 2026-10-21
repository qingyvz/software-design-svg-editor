import type { Shape } from './Shape.js';

export interface ShapeContainer extends Shape {
  add(shape: Shape, index?: number): void;
  remove(shape: Shape): number;
  assertCanUngroup(): void;
}
