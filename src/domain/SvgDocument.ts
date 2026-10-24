import { Shape } from './Shape.js';
import { Group } from './Group.js';
import { Numbers } from './Numbers.js';

export class SvgDocument {
  private root = new Group('$document');
  private canvasWidth: number;
  private canvasHeight: number;
  private viewport: readonly number[];
  constructor(width = 800, height = 600, viewBox?: readonly number[]) {
    this.canvasWidth = Numbers.positive(width, 'canvas width');
    this.canvasHeight = Numbers.positive(height, 'canvas height');
    if (viewBox && (viewBox.length !== 4 || viewBox.some(v => !Number.isFinite(v)) || viewBox[2]! <= 0 || viewBox[3]! <= 0)) throw new Error('invalid viewBox');
    this.viewport = [...(viewBox ?? [0, 0, width, height])];
  }
  get width(): number { return this.canvasWidth; }
  get height(): number { return this.canvasHeight; }
  get viewBox(): readonly number[] { return [...this.viewport]; }
  get children(): readonly Shape[] { return this.root.children; }
  get shapes(): readonly Shape[] { return this.children.flatMap(child => [...child.walk()]); }
  get count(): number { return this.shapes.length; }
  resize(width: number, height: number): void {
    Numbers.positive(width, 'canvas width'); Numbers.positive(height, 'canvas height');
    this.canvasWidth = width; this.canvasHeight = height; this.viewport = [0, 0, width, height];
  }
  get(id: string): Shape {
    const result = this.shapes.find(shape => shape.id === id);
    if (!result) throw new Error(`no such shape: ${id}`);
    return result;
  }
  container(id: string): Group {
    const target = this.shapes.find(shape => shape.id === id);
    if (!target) throw new Error(`no such container: ${id}`);
    if (!(target instanceof Group)) throw new Error(`not a container: ${id}`);
    return target;
  }
  private parent(shape: Shape): Group {
    const parent = [this.root, ...this.shapes.filter((item): item is Group => item instanceof Group)].find(group => group.children.includes(shape));
    if (!parent) throw new Error(`detached shape: ${shape.id}`);
    return parent;
  }
  parentLabel(shape: Shape): string {
    const parent = this.parent(shape);
    return parent === this.root ? 'svg' : parent.label;
  }
  add(shape: Shape, containerId?: string): void {
    const existing = new Set(this.shapes.map(item => item.id));
    for (const item of shape.walk()) {
      if (existing.has(item.id)) throw new Error(`id already exists: ${item.id}`);
      existing.add(item.id);
    }
    (containerId === undefined ? this.root : this.container(containerId)).add(shape);
  }
  delete(id: string): void { const shape = this.get(id); this.parent(shape).remove(shape); }
  group(id: string, ids: readonly string[]): Group {
    if (this.shapes.some(shape => shape.id === id)) throw new Error(`id already exists: ${id}`);
    if (!ids.length) throw new Error('group requires at least one shape');
    if (new Set(ids).size !== ids.length) throw new Error('duplicate shape in group');
    const selected = ids.map(item => this.get(item));
    for (const shape of selected) {
      if ([...shape.walk()].slice(1).some(item => selected.includes(item))) throw new Error(`cannot group a container into its own descendant: ${shape.id}`);
    }
    const ordered = this.shapes.filter(shape => selected.includes(shape));
    const paths = ordered.map(shape => this.ancestors(shape));
    let parent = this.root;
    for (let i = 0; paths.every(path => path[i] !== undefined && path[i] === paths[0]![i]); i++) parent = paths[0]![i]!;
    const first = ordered[0]!;
    const branch = parent.children.find(child => [...child.walk()].includes(first))!;
    const earlier = parent.children.slice(0, parent.children.indexOf(branch));
    const result = new Group(id);
    for (const shape of ordered) { this.parent(shape).remove(shape); result.add(shape); }
    parent.add(result, parent.children.filter(child => earlier.includes(child)).length);
    return result;
  }
  private ancestors(shape: Shape): Group[] {
    const result: Group[] = [];
    let parent = this.parent(shape);
    result.unshift(parent);
    while (parent !== this.root) { parent = this.parent(parent); result.unshift(parent); }
    return result;
  }
  ungroup(id: string): void {
    const group = this.container(id);
    const parent = this.parent(group);
    if (parent === this.root) throw new Error(`cannot ungroup top-level container: ${id}`);
    const index = parent.remove(group);
    group.children.forEach((child, offset) => {
      child.inheritPresentationFrom(group);
      group.remove(child); parent.add(child, index + offset);
    });
  }
  addTo(containerId: string, id: string): void {
    const destination = this.container(containerId);
    const shape = this.get(id);
    if ([...shape.walk()].includes(destination)) throw new Error(`cannot move a container into its own descendant: ${id}`);
    this.parent(shape).remove(shape); destination.add(shape);
  }
  reorder(id: string, front: boolean): void {
    const shape = this.get(id), parent = this.parent(shape);
    parent.remove(shape); parent.add(shape, front ? parent.children.length : 0);
  }
  assertValid(): void {
    const identifiers = new Set<string>(), identities = new Set<Shape>();
    const visit = (shape: Shape): void => {
      if (identities.has(shape)) throw new Error('cycle or shared child in document');
      identities.add(shape);
      if (identifiers.has(shape.id)) throw new Error(`id already exists: ${shape.id}`);
      identifiers.add(shape.id);
      for (const child of shape.children) visit(child);
    };
    for (const child of this.children) visit(child);
  }
  clone(): SvgDocument {
    const result = new SvgDocument(this.width, this.height, this.viewBox);
    result.root = this.root.clone(); return result;
  }
}
