import { Group } from '../../domain/Group.js';
import type { Shape } from '../../domain/Shape.js';
import { Rect } from '../../domain/Rect.js';
import { Text } from '../../domain/Text.js';

export class Box extends Group {
  constructor(id: string) {
    super(id);
    this.importPresentation('data-kind', 'box');
  }
  override assertCanUngroup(): void {
    throw new Error(`cannot ungroup composite shape: ${this.id}`);
  }
  assertCanDetach(shape: Shape): void {
    if (shape.id === this.id + '-rect' || shape.id === this.id + '-label')
      throw new Error(`cannot detach required box child: ${shape.id}`);
  }
  override remove(shape: Shape): number {
    this.assertCanDetach(shape);
    return super.remove(shape);
  }
  override add(shape: Shape, index?: number): void {
    if (shape.id === this.id + '-rect' || shape.id === this.id + '-label') {
      if (this.children.some((child) => child.id === shape.id))
        throw new Error(`box child already exists: ${shape.id}`);
      if (shape.id.endsWith('-rect') && !(shape instanceof Rect) ||
          shape.id.endsWith('-label') && !(shape instanceof Text))
        throw new Error(`invalid box child: ${shape.id}`);
    }
    super.add(shape, index);
  }
  assertStructure(): void {
    if (this.children.filter((child) => child.id === this.id + '-rect' && child instanceof Rect).length !== 1 ||
        this.children.filter((child) => child.id === this.id + '-label' && child instanceof Text).length !== 1)
      throw new Error(`invalid box structure: ${this.id}`);
  }
  override clone(): Box {
    const result = this.copyState(new Box(this.id));
    for (const child of this.children) result.add(child.clone());
    return result;
  }
}
