import { Numbers } from './Numbers.js';
import type { AffineTransform } from './AffineTransform.js';

export class Bounds {
  constructor(
    readonly minX: number,
    readonly minY: number,
    readonly maxX: number,
    readonly maxY: number,
  ) {
    for (const coordinate of [minX, minY, maxX, maxY]) Numbers.finite(coordinate, 'bounds');
    Numbers.nonnegative(maxX - minX, 'bounds width');
    Numbers.nonnegative(maxY - minY, 'bounds height');
    Object.freeze(this);
  }
  get width(): number {
    return this.maxX - this.minX;
  }
  get height(): number {
    return this.maxY - this.minY;
  }

  static points(points: readonly (readonly [number, number])[]): Bounds {
    if (!points.length) throw new Error('bounds require at least one point');
    return new Bounds(
      Math.min(...points.map((point) => point[0])),
      Math.min(...points.map((point) => point[1])),
      Math.max(...points.map((point) => point[0])),
      Math.max(...points.map((point) => point[1])),
    );
  }

  static ellipse(cx: number, cy: number, rx: number, ry: number, matrix: AffineTransform): Bounds {
    const [x, y] = matrix.point(cx, cy);
    // 仿射椭圆的极值由正弦、余弦系数的模给出，不能直接旋转外接矩形。
    const horizontal = Math.hypot(matrix.a * rx, matrix.c * ry);
    const vertical = Math.hypot(matrix.b * rx, matrix.d * ry);
    return new Bounds(x - horizontal, y - vertical, x + horizontal, y + vertical);
  }

  union(other: Bounds): Bounds {
    return new Bounds(
      Math.min(this.minX, other.minX),
      Math.min(this.minY, other.minY),
      Math.max(this.maxX, other.maxX),
      Math.max(this.maxY, other.maxY),
    );
  }

  translated(dx: number, dy: number): Bounds {
    return new Bounds(this.minX + dx, this.minY + dy, this.maxX + dx, this.maxY + dy);
  }

  transformed(matrix: AffineTransform): Bounds {
    return Bounds.points([
      matrix.point(this.minX, this.minY),
      matrix.point(this.maxX, this.minY),
      matrix.point(this.maxX, this.maxY),
      matrix.point(this.minX, this.maxY),
    ]);
  }
}
