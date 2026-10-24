import { Group } from '../domain/Group.js';

export class Box extends Group {
  constructor(id: string) {
    super(id);
    this.importPresentation('data-kind', 'box');
  }
  override assertCanUngroup(): void {
    throw new Error(`cannot ungroup composite shape: ${this.id}`);
  }
  override set(attribute: string, value: string): void {
    if (attribute === 'fill') {
      const body = this.children.find((child) => child.id === this.id + '-rect');
      if (!body) throw new Error('box body is missing');
      body.set('fill', value);
    } else if (attribute === 'label') {
      const label = this.children.find((child) => child.id === this.id + '-label');
      if (!label) throw new Error('box label is missing');
      label.set('text', value);
    } else super.set(attribute, value);
  }
  override clone(): Box {
    const result = this.copyState(new Box(this.id));
    for (const child of this.children) result.add(child.clone());
    return result;
  }
}
