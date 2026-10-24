import { GeometryShape } from './GeometryShape.js';
import type { Bounds } from './Bounds.js';
import type { BoundsContext } from './BoundsContext.js';
import { Numbers } from './Numbers.js';
export class Text extends GeometryShape {
  private content: string;
  constructor(id: string, x: number, y: number, text: string) {
    super(id, { x, y }, []);
    this.content = text;
  }
  override get tag(): string {
    return 'text';
  }
  override get text(): string {
    return this.content;
  }
  override move(dx: number, dy: number): void {
    this.translate(['x'], ['y'], dx, dy);
  }
  override set(attribute: string, value: string): void {
    if (attribute === 'text') this.content = value;
    else super.set(attribute, value);
  }
  override bounds(context: BoundsContext = {}): Bounds | undefined {
    if (!this.content) return undefined;
    if (!context.textMeasurer) throw new Error(`text measurement required for bounds: ${this.id}`);
    const presentation = this.resolvedPresentation(context.inheritedPresentation);
    const measurement = context.textMeasurer.measure(this.content, presentation);
    const advance = Numbers.nonnegative(measurement.advance, 'text advance');
    const anchor = presentation.get('text-anchor') ?? 'start';
    if (!['start', 'middle', 'end'].includes(anchor))
      throw new Error(`unsupported text-anchor for bounds: ${anchor}`);
    // 度量器返回左对齐、字母基线处的墨迹边界；锚点偏移使用排版宽度。
    const offset = anchor === 'middle' ? -advance / 2 : anchor === 'end' ? -advance : 0;
    return measurement.ink
      .translated(this.value('x') + offset, this.value('y'))
      .transformed(this.transform);
  }
  override clone(): Text {
    return this.copyState(new Text(this.id, this.value('x'), this.value('y'), this.content));
  }
}
