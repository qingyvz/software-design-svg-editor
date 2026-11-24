import type { Shape } from '../domain/Shape.js';

/** Implementations may change the draft shape; the editor commits it only on success. */
export interface AttributeHandler {
  readonly name: string;
  handles(shape: Shape, attribute: string): boolean;
  apply(shape: Shape, attribute: string, value: string): void;
}
