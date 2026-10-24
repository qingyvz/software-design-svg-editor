import { GeometryShape } from './GeometryShape.js';
export class Circle extends GeometryShape {
  constructor(id: string, cx: number, cy: number, r: number) { super(id, { cx, cy, r }, ['r']); }
  override get tag(): string { return 'circle'; }
  override move(dx: number, dy: number): void { this.translate(['cx'], ['cy'], dx, dy); }
  override clone(): Circle { return this.copyState(new Circle(this.id, this.value('cx'), this.value('cy'), this.value('r'))); }
  override summary(): string { return `${this.label}  cx=${this.value('cx')} cy=${this.value('cy')} r=${this.value('r')} ${this.styleSummary()}`.trimEnd(); }
}
