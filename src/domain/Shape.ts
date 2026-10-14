import { Numbers } from './Numbers.js';

export abstract class Shape {
  private readonly identifier: string;
  private readonly appearance = new Map<string, string>();
  protected constructor(id: string) {
    if (!id || /[\s\x00-\x1f]/u.test(id)) throw new Error('id must be non-empty and contain no whitespace');
    this.identifier = id;
  }
  get id(): string { return this.identifier; }
  abstract get tag(): string;
  get label(): string { return `${this.tag}#${this.id}`; }
  get children(): readonly Shape[] { return []; }
  get text(): string | null { return null; }
  get attributes(): ReadonlyMap<string, string> { return new Map(this.appearance); }
  abstract move(dx: number, dy: number): void;
  abstract scale(factor: number): void;
  abstract clone(): Shape;
  abstract summary(): string;

  set(attribute: string, value: string): void {
    if (!['fill', 'stroke', 'stroke-width'].includes(attribute)) throw new Error(`unknown attribute: ${attribute}`);
    if (attribute === 'stroke-width') value = Numbers.format(Numbers.nonnegative(Numbers.parse(value, attribute), attribute));
    if (/[\r\n\x00]/.test(value)) throw new Error('attribute value must fit on one line');
    this.appearance.set(attribute, value);
  }
  importPresentation(attribute: string, value: string): void {
    if (['fill', 'stroke', 'stroke-width'].includes(attribute)) { this.set(attribute, value); return; }
    const supported = ['font-size', 'font-family', 'font-weight', 'text-anchor', 'opacity', 'fill-opacity', 'stroke-opacity', 'stroke-linecap', 'stroke-linejoin'];
    if (!supported.includes(attribute) && !attribute.startsWith('data-')) throw new Error(`unsupported SVG attribute: ${attribute}`);
    this.appearance.set(attribute, value);
  }
  inheritPresentationFrom(parent: Shape): void {
    for (const [name, value] of parent.appearance) {
      if (!name.startsWith('data-') && !this.appearance.has(name)) this.appearance.set(name, value);
    }
  }
  protected copyAppearance<T extends Shape>(target: T): T {
    for (const [name, value] of this.appearance) target.appearance.set(name, value);
    return target;
  }
  protected styleSummary(): string {
    return [...this.appearance].map(([key, value]) => `${key}=${value}`).join(' ');
  }
  *walk(): IterableIterator<Shape> {
    yield this;
    for (const child of this.children) yield* child.walk();
  }
}
