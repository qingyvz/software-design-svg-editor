import { Shape } from './Shape.js';
import { Numbers } from './Numbers.js';
import { AffineTransform } from './AffineTransform.js';

export abstract class GeometryShape extends Shape {
  private readonly geometry: Map<string, number>;
  private readonly sizes: ReadonlySet<string>;
  protected constructor(id: string, values: Record<string, number>, sizeKeys: readonly string[]) {
    super(id);
    this.sizes = new Set(sizeKeys);
    this.geometry = new Map();
    for (const [key, value] of Object.entries(values)) this.assign(key, value);
  }
  protected value(key: string): number {
    const value = this.geometry.get(key);
    if (value === undefined) throw new Error(`missing geometry: ${key}`);
    return value;
  }
  protected translate(
    xKeys: readonly string[],
    yKeys: readonly string[],
    dx: number,
    dy: number,
  ): void {
    Numbers.finite(dx, 'dx');
    Numbers.finite(dy, 'dy');
    if (!this.transform.isIdentity) {
      this.applyTransform(AffineTransform.translation(dx, dy));
      return;
    }
    const changes = new Map<string, number>();
    for (const key of xKeys) changes.set(key, Numbers.finite(this.value(key) + dx, key));
    for (const key of yKeys) changes.set(key, Numbers.finite(this.value(key) + dy, key));
    for (const [key, value] of changes) this.geometry.set(key, value);
  }
  override scale(factor: number): void {
    Numbers.positive(factor, 'scale factor');
    // 几何坐标已乘以 S，因此放置矩阵改为 S*M*S^-1：线性部分不变，仅平移缩放。
    // 这样保留画布坐标中的缩放效果，也不额外缩放描边等展示属性。
    const placement = this.transform.scaleTranslation(factor);
    const changes = [...this.geometry].map(
      ([key, value]) => [key, Numbers.finite(value * factor, key)] as const,
    );
    for (const [key, value] of changes) this.geometry.set(key, value);
    this.replaceTransform(placement);
  }
  override set(attribute: string, value: string): void {
    if (this.geometry.has(attribute)) this.assign(attribute, Numbers.parse(value, attribute));
    else super.set(attribute, value);
  }
  override get attributes(): ReadonlyMap<string, string> {
    return new Map(
      [...this.geometry]
        .map(([key, value]) => [key, Numbers.format(value)] as [string, string])
        .concat([...super.attributes]),
    );
  }
  private assign(key: string, value: number): void {
    this.geometry.set(
      key,
      this.sizes.has(key) ? Numbers.nonnegative(value, key) : Numbers.finite(value, key),
    );
  }
}
