import { GeometryShape } from './GeometryShape.js';
export class Text extends GeometryShape {
  private content: string;
  constructor(id: string, x: number, y: number, text: string) { super(id, { x, y }, []); this.content = text; }
  override get tag(): string { return 'text'; }
  override get text(): string { return this.content; }
  override move(dx: number, dy: number): void { this.translate(['x'], ['y'], dx, dy); }
  override set(attribute: string, value: string): void {
    if (attribute === 'text') this.content = value;
    else super.set(attribute, value);
  }
  override clone(): Text { return this.copyAppearance(new Text(this.id, this.value('x'), this.value('y'), this.content)); }
  override summary(): string { return `${this.label}  (${this.value('x')},${this.value('y')}) ${JSON.stringify(this.content)} ${this.styleSummary()}`.trimEnd(); }
}
