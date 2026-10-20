import { Numbers } from '../domain/Numbers.js';
export class SvgTransform {
  constructor(readonly scale = 1, readonly dx = 0, readonly dy = 0) {}
  static parse(value: string): SvgTransform {
    if (!value.trim()) return new SvgTransform();
    // 仅支持 translate 后接正数等比 scale。
    const pattern = /^(?:translate\(\s*([^)]*)\)\s*)?(?:scale\(\s*([^)]*)\)\s*)?$/;
    const match = value.trim().match(pattern);
    if (!match) throw new Error('unsupported transform: expected translate(...) followed by uniform scale(...)');
    const translation = match[1]?.trim().split(/[\s,]+/).map(v => Numbers.parse(v, 'translate')) ?? [0, 0];
    const scaling = match[2]?.trim().split(/[\s,]+/).map(v => Numbers.parse(v, 'scale')) ?? [1];
    if (translation.length < 1 || translation.length > 2 || scaling.length < 1 || scaling.length > 2 || (scaling.length === 2 && scaling[0] !== scaling[1])) throw new Error('unsupported non-uniform or malformed transform');
    return new SvgTransform(Numbers.positive(scaling[0]!, 'scale factor'), translation[0]!, translation[1] ?? 0);
  }
  compose(child: SvgTransform): SvgTransform {
    return new SvgTransform(Numbers.finite(this.scale * child.scale, 'transform scale'),
      Numbers.finite(this.dx + this.scale * child.dx, 'transform x'),
      Numbers.finite(this.dy + this.scale * child.dy, 'transform y'));
  }
}
