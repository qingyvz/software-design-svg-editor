import type { SvgDocument } from '../domain/SvgDocument.js';
import type { TreeDecorator } from './TreeDecorator.js';

export class TreeDecorators {
  private readonly entries = new Map<string, TreeDecorator>();
  private latest?: SvgDocument;
  has(name: string): boolean { return this.entries.has(name); }
  register(decorator: TreeDecorator): void {
    if (this.has(decorator.name)) throw new Error(`tree decorator already registered: ${decorator.name}`);
    // A failed checkpoint must not leave a partially registered decorator.
    if (this.latest) decorator.checkpoint?.(this.latest.clone());
    this.entries.set(decorator.name, decorator);
  }
  remove(name: string): void { this.entries.delete(name); }
  all(): readonly TreeDecorator[] { return [...this.entries.values()]; }
  checkpoint(document: SvgDocument): readonly string[] {
    this.latest = document.clone();
    const warnings: string[] = [];
    for (const [name, decorator] of this.entries) {
      try { decorator.checkpoint?.(this.latest.clone()); }
      catch (error) {
        this.entries.delete(name);
        const reason = (error instanceof Error ? error.message : String(error)).replace(/[\r\n]+/g, ' ');
        warnings.push('warning: tree decorator disabled: ' + name + ' (checkpoint failed: ' + reason + ')');
      }
    }
    return warnings;
  }
}
