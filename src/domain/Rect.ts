import { GeometryShape } from './GeometryShape.js';
import { Bounds } from './Bounds.js';
export class Rect extends GeometryShape {
  constructor(id: string, x: number, y: number, width: number, height: number) {
    super(id, { x, y, width, height }, ['width', 'height']);
  }
  override get tag(): string {
    return 'rect';
  }
  override move(dx: number, dy: number): void {
    this.translate(['x'], ['y'], dx, dy);
  }
  override bounds(): Bounds {
    return new Bounds(
      this.value('x'),
      this.value('y'),
      this.value('x') + this.value('width'),
      this.value('y') + this.value('height'),
    ).transformed(this.transform);
  }
  override clone(): Rect {
    return this.copyState(
      new Rect(
        this.id,
        this.value('x'),
        this.value('y'),
        this.value('width'),
        this.value('height'),
      ),
    );
  }
}
