import type { Shape } from '../domain/Shape.js';
import type { AttributeHandler } from './AttributeHandler.js';

export class AttributeHandlers {
  private readonly registered = new Map<string, AttributeHandler>();
  has(name: string): boolean { return this.registered.has(name); }
  register(handler: AttributeHandler): void {
    if (this.has(handler.name)) throw new Error(`attribute handler already registered: ${handler.name}`);
    this.registered.set(handler.name, handler);
  }
  remove(name: string): void { this.registered.delete(name); }
  set(shape: Shape, attribute: string, value: string): void {
    // Ambiguity is an error, never an implicit last-writer-wins choice.
    const matches = [...this.registered.values()].filter((handler) => handler.handles(shape, attribute));
    if (matches.length > 1) throw new Error(`ambiguous attribute handler: ${attribute}`);
    if (matches[0]) matches[0].apply(shape, attribute, value);
    else shape.set(attribute, value);
  }
}
