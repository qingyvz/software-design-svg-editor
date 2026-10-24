import { Numbers } from './Numbers.js';

export class AffineTransform {
  constructor(
    readonly a = 1,
    readonly b = 0,
    readonly c = 0,
    readonly d = 1,
    readonly e = 0,
    readonly f = 0,
  ) {
    for (const value of [a, b, c, d, e, f]) Numbers.finite(value, 'transform');
    Object.freeze(this);
  }

  static identity(): AffineTransform {
    return new AffineTransform();
  }
  static translation(dx: number, dy: number): AffineTransform {
    return new AffineTransform(1, 0, 0, 1, dx, dy);
  }
  static scaling(sx: number, sy = sx): AffineTransform {
    return new AffineTransform(sx, 0, 0, sy);
  }
  static rotation(degrees: number, cx = 0, cy = 0): AffineTransform {
    const radians = ((Numbers.finite(degrees, 'angle') % 360) * Math.PI) / 180;
    const cos = Math.abs(Math.cos(radians)) < Number.EPSILON ? 0 : Math.cos(radians);
    const sin = Math.abs(Math.sin(radians)) < Number.EPSILON ? 0 : Math.sin(radians);
    const rotation = new AffineTransform(cos, sin, -sin, cos);
    return AffineTransform.translation(cx, cy)
      .multiply(rotation)
      .multiply(AffineTransform.translation(-cx, -cy));
  }

  get isIdentity(): boolean {
    return (
      this.a === 1 && this.b === 0 && this.c === 0 && this.d === 1 && this.e === 0 && this.f === 0
    );
  }
  get positiveUniformScale(): number | undefined {
    return this.b === 0 && this.c === 0 && this.a === this.d && this.a > 0 ? this.a : undefined;
  }
  multiply(other: AffineTransform): AffineTransform {
    return new AffineTransform(
      this.a * other.a + this.c * other.b,
      this.b * other.a + this.d * other.b,
      this.a * other.c + this.c * other.d,
      this.b * other.c + this.d * other.d,
      this.a * other.e + this.c * other.f + this.e,
      this.b * other.e + this.d * other.f + this.f,
    );
  }
  point(x: number, y: number): readonly [number, number] {
    return [
      Numbers.finite(this.a * x + this.c * y + this.e, 'transformed x'),
      Numbers.finite(this.b * x + this.d * y + this.f, 'transformed y'),
    ];
  }
  scaleTranslation(factor: number): AffineTransform {
    return new AffineTransform(this.a, this.b, this.c, this.d, this.e * factor, this.f * factor);
  }
  toSvg(): string {
    return (
      'matrix(' +
      [this.a, this.b, this.c, this.d, this.e, this.f].map(Numbers.format).join(' ') +
      ')'
    );
  }
}
