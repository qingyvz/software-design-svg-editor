import type { Shape } from './Shape.js';

export interface ShapeContainer extends Shape {
  add(shape: Shape, index?: number): void;
  remove(shape: Shape): number;
  /** Optional same-parent order change; it must not detach the child. */
  reorder?(shape: Shape, index: number): void;
  assertCanUngroup(): void;
  /** Optional invariant hook before an existing direct child is detached. */
  assertCanDetach?(shape: Shape): void;
  /** A plugin container may enforce its own required-child invariant. */
  assertStructure?(): void;
}
