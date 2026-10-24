import { GeometryShape } from './GeometryShape.js';
import { Bounds } from './Bounds.js';
export class Ellipse extends GeometryShape {
  constructor(id: string, cx: number, cy: number, rx: number, ry: number) {
    super(id, { cx, cy, rx, ry }, ['rx', 'ry']);
  }
  override get tag(): string {
    return 'ellipse';
  }
  override move(dx: number, dy: number): void {
    this.translate(['cx'], ['cy'], dx, dy);
  }
  override bounds(): Bounds {
    return Bounds.ellipse(
      this.value('cx'),
      this.value('cy'),
      this.value('rx'),
      this.value('ry'),
      this.transform,
    );
  }
  override clone(): Ellipse {
    return this.copyState(
      new Ellipse(this.id, this.value('cx'), this.value('cy'), this.value('rx'), this.value('ry')),
    );
  }
}
