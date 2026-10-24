import { SvgDocument } from '../domain/SvgDocument.js';
import { ShapeFactory } from '../domain/ShapeFactory.js';
import type { Shape } from '../domain/Shape.js';
import type { EditScope } from './EditScope.js';

export class EditContext {
  constructor(private readonly document: SvgDocument, private readonly factory: ShapeFactory, private readonly scope: EditScope) {
    if (!scope.available(document)) throw new Error('active layer no longer exists');
  }
  get(id: string): Shape {
    this.scope.assertEditable(this.document, id);
    return this.document.get(id);
  }
  create(type: string, id: string, parameters: readonly string[], containerId = this.scope.layerId): Shape {
    if (containerId !== undefined) this.scope.assertDestination(this.document, containerId);
    const shape = this.factory.create(type, id, parameters);
    this.document.add(shape, containerId);
    return shape;
  }
  parentLabel(shape: Shape): string { return this.document.parentLabel(shape); }
  delete(id: string): void { this.get(id); this.document.delete(id); }
  group(id: string, ids: readonly string[]): Shape {
    for (const target of ids) this.get(target);
    return this.document.group(id, ids);
  }
  ungroup(id: string): void { this.get(id); this.document.ungroup(id); }
  addTo(containerId: string, id: string): void {
    this.get(id);
    this.scope.assertDestination(this.document, containerId);
    this.document.addTo(containerId, id);
  }
  reorder(id: string, front: boolean): void { this.get(id); this.document.reorder(id, front); }
  targets(ids: readonly string[]): readonly Shape[] {
    if (!ids.length) throw new Error('selection requires at least one shape');
    if (new Set(ids).size !== ids.length) throw new Error('duplicate shape in selection');
    const selected = ids.map(id => this.get(id));
    return this.document.shapes.filter(shape => selected.includes(shape) &&
      !selected.some(ancestor => ancestor !== shape && [...ancestor.walk()].includes(shape)));
  }
}
