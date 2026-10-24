import { Shape } from './Shape.js';
import { Numbers } from './Numbers.js';
export class Group extends Shape {
  private readonly members: Shape[] = [];
  constructor(id: string) { super(id); }
  override get tag(): string { return 'g'; }
  override get children(): readonly Shape[] { return this.members.slice(); }
  add(shape: Shape, index = this.members.length): void {
    if ([...shape.walk()].includes(this)) throw new Error(`cannot move a container into its own descendant: ${shape.id}`);
    if (!Number.isInteger(index) || index < 0 || index > this.members.length) throw new Error('invalid child position');
    if (this.members.includes(shape)) throw new Error(`shape already in container: ${shape.id}`);
    this.members.splice(index, 0, shape);
  }
  remove(shape: Shape): number {
    const index = this.members.indexOf(shape);
    if (index < 0) throw new Error(`shape is not a child: ${shape.id}`);
    this.members.splice(index, 1);
    return index;
  }
  override move(dx: number, dy: number): void {
    Numbers.finite(dx, 'dx'); Numbers.finite(dy, 'dy');
    for (const child of this.members) child.move(dx, dy);
  }
  override scale(factor: number): void {
    Numbers.positive(factor, 'scale factor');
    for (const child of this.members) child.scale(factor);
  }
  override clone(): Group {
    const result = this.copyAppearance(new Group(this.id));
    for (const child of this.members) result.add(child.clone());
    return result;
  }
  override summary(): string { return `${this.label} ${this.styleSummary()}`.trimEnd(); }
}
