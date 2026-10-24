import { SvgDocument } from '../domain/SvgDocument.js';
import { ShapeFactory } from '../domain/ShapeFactory.js';
import type { Shape } from '../domain/Shape.js';
import type { EditScope } from './EditScope.js';
import { ShapeFormatter } from './ShapeFormatter.js';
import type { Bounds } from '../domain/Bounds.js';
import type { BoundsContext } from '../domain/BoundsContext.js';

export class EditContext {
  private readonly formatter = new ShapeFormatter();
  constructor(
    private readonly document: SvgDocument,
    private readonly factory: ShapeFactory,
    private readonly scope: EditScope,
  ) {
    if (!scope.available(document)) throw new Error('active layer no longer exists');
  }
  get(id: string): Shape {
    this.scope.assertEditable(this.document, id);
    return this.document.get(id);
  }
  bounds(id: string, context: BoundsContext = {}): Bounds | undefined {
    this.get(id);
    return this.document.bounds(id, context);
  }
  create(
    type: string,
    id: string,
    parameters: readonly string[],
    containerId = this.scope.layerId,
  ): Shape {
    if (containerId !== undefined) this.scope.assertDestination(this.document, containerId);
    const shape = this.factory.create(type, id, parameters);
    this.document.add(shape, containerId);
    return shape;
  }
  label(shape: Shape): string {
    return this.formatter.label(shape);
  }
  parentLabel(shape: Shape): string {
    return this.formatter.parent(this.document, shape);
  }
  delete(id: string): void {
    this.get(id);
    this.document.delete(id);
  }
  group(id: string, ids: readonly string[]): Shape {
    for (const target of ids) this.get(target);
    return this.document.group(id, ids);
  }
  ungroup(id: string): void {
    this.get(id);
    this.document.ungroup(id);
  }
  addTo(containerId: string, id: string): void {
    this.get(id);
    this.scope.assertDestination(this.document, containerId);
    this.document.addTo(containerId, id);
  }
  reorder(id: string, front: boolean): void {
    this.get(id);
    this.document.reorder(id, front);
  }
  targets(ids: readonly string[]): readonly Shape[] {
    if (!ids.length) throw new Error('selection requires at least one shape');
    if (new Set(ids).size !== ids.length) throw new Error('duplicate shape in selection');
    // 容器操作会遍历后代，选中祖先后要排除重复选中的后代，避免变换两次。
    const selected = ids.map((id) => this.get(id));
    return this.document.shapes.filter(
      (shape) =>
        selected.includes(shape) &&
        !selected.some((ancestor) => ancestor !== shape && [...ancestor.walk()].includes(shape)),
    );
  }
}
