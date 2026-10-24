import { AffineTransform } from '../domain/AffineTransform.js';
import { Numbers } from '../domain/Numbers.js';

export class SvgTransform {
  static parse(value: string): AffineTransform {
    let result = AffineTransform.identity();
    let remaining = value.trim();
    while (remaining) {
      const match = /^([A-Za-z]+)\s*\(([^()]*)\)/.exec(remaining);
      if (!match) throw new Error('invalid SVG transform');
      const raw = match[2]!.trim();
      if (!raw || /^,|,$|,\s*,/.test(raw)) throw new Error('invalid transform arguments');
      const numbers = raw.split(/[\s,]+/).map((item) => Numbers.parse(item, 'transform'));
      result = result.multiply(this.operation(match[1]!, numbers));
      remaining = remaining.slice(match[0].length).trim();
      if (remaining.startsWith(',')) {
        remaining = remaining.slice(1).trim();
        if (!remaining) throw new Error('invalid SVG transform separator');
      }
    }
    return result;
  }

  private static operation(name: string, values: readonly number[]): AffineTransform {
    if (name === 'matrix' && values.length === 6)
      return new AffineTransform(values[0], values[1], values[2], values[3], values[4], values[5]);
    if (name === 'translate' && [1, 2].includes(values.length))
      return AffineTransform.translation(values[0]!, values[1] ?? 0);
    if (name === 'scale' && [1, 2].includes(values.length))
      return AffineTransform.scaling(values[0]!, values[1] ?? values[0]!);
    if (name === 'rotate' && [1, 3].includes(values.length))
      return AffineTransform.rotation(values[0]!, values[1] ?? 0, values[2] ?? 0);
    if (name === 'skewX' && values.length === 1)
      return new AffineTransform(1, 0, Math.tan((values[0]! * Math.PI) / 180), 1);
    if (name === 'skewY' && values.length === 1)
      return new AffineTransform(1, Math.tan((values[0]! * Math.PI) / 180), 0, 1);
    throw new Error(`unsupported or malformed transform: ${name}`);
  }
}
