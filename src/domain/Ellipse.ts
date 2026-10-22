import { GeometryShape } from './GeometryShape.js';
export class Ellipse extends GeometryShape {
  constructor(id: string, cx: number, cy: number, rx: number, ry: number) { super(id, { cx, cy, rx, ry }, ['rx', 'ry']); }
  override get tag(): string { return 'ellipse'; }
  override move(dx: number, dy: number): void { this.translate(['cx'], ['cy'], dx, dy); }
  override clone(): Ellipse { return this.copyState(new Ellipse(this.id, this.value('cx'), this.value('cy'), this.value('rx'), this.value('ry'))); }
  override summary(): string { return `${this.label}  cx=${this.value('cx')} cy=${this.value('cy')} rx=${this.value('rx')} ry=${this.value('ry')} ${this.styleSummary()}`.trimEnd(); }
}
