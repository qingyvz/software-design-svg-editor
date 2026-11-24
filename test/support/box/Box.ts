import { Group } from '../../../src/domain/Group.js';
import type { Shape } from '../../../src/domain/Shape.js';
import { Rect } from '../../../src/domain/Rect.js';
import { Text } from '../../../src/domain/Text.js';

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
  // Compatibility for callers that registered only the historical BoxProvider.
  // New plugin composition installs BoxAttributes and routes 'set' through the
  // independent handler first; this method is not the extension mechanism.
  override set(attribute: string, value: string): void {
    if (attribute === 'fill') {
      const body = this.children.find((child) => child.id === this.id + '-rect');
      if (!(body instanceof Rect)) throw new Error('box body is missing');
      body.set('fill', value);
    } else if (attribute === 'label') {
      const label = this.children.find((child) => child.id === this.id + '-label');
      if (!(label instanceof Text)) throw new Error('box label is missing');
      label.set('text', value);
    } else super.set(attribute, value);
  }
  override clone(): Box {
    const result = this.copyState(new Box(this.id));
    for (const child of this.children) result.add(child.clone());
    return result;
  }
}
