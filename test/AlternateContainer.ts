import { Shape } from '../src/domain/Shape.js';
import { Group } from '../src/domain/Group.js';
import type { AffineTransform } from '../src/domain/AffineTransform.js';

export class AlternateContainer extends Shape {
  private readonly content = new Group('$content');
  constructor(id: string) { super(id); }
  override get tag(): string { return 'g'; }
  override get children(): readonly Shape[] { return this.content.children; }
  override get container(): this { return this; }
  add(shape: Shape, index?: number): void { this.content.add(shape, index); }
  remove(shape: Shape): number { return this.content.remove(shape); }
  assertCanUngroup(): void {}
  override move(dx: number, dy: number): void { this.content.move(dx, dy); }
  override scale(factor: number): void { this.content.scale(factor); }
  override applyTransform(transform: AffineTransform): void { this.content.applyTransform(transform); }
  override clone(): AlternateContainer {
    const result = this.copyState(new AlternateContainer(this.id));
    for (const child of this.children) result.add(child.clone());
    return result;
  }
  override summary(): string { return this.label; }
}
