import { Shape } from './Shape.js';
import type { ShapeProvider } from './ShapeProvider.js';

export class ShapeFactory {
  private readonly providers = new Map<string, ShapeProvider>();
  private readonly svgProviders = new Map<string, ShapeProvider>();

  register(provider: ShapeProvider): this {
    const key = this.svgKey(provider.svgTag, provider.kind);
    if (!provider.type || !provider.svgTag || provider.kind === '')
      throw new Error('invalid shape provider');
    if (this.providers.has(provider.type) || this.svgProviders.has(key))
      throw new Error(`shape provider already registered: ${provider.type}`);
    this.providers.set(provider.type, provider);
    this.svgProviders.set(key, provider);
    return this;
  }

  create(type: string, id: string, parameters: readonly string[]): Shape {
    const provider = this.providers.get(type);
    if (!provider) throw new Error(`unknown shape type: ${type} (is the plugin loaded?)`);
    return this.validate(provider, provider.create(id, parameters), id);
  }

  has(type: string): boolean { return this.providers.has(type); }
  hasSvg(tag: string, kind?: string): boolean { return this.svgProviders.has(this.svgKey(tag, kind)); }
  remove(type: string): void {
    const provider = this.providers.get(type);
    if (!provider) return;
    this.providers.delete(type);
    this.svgProviders.delete(this.svgKey(provider.svgTag, provider.kind));
  }

  fromSvg(
    tag: string,
    id: string,
    attributes: ReadonlyMap<string, string>,
    content: string,
    children: readonly Shape[] = [],
  ): Shape {
    const provider =
      this.svgProviders.get(this.svgKey(tag, attributes.get('data-kind'))) ??
      this.svgProviders.get(this.svgKey(tag));
    if (!provider) throw new Error(`unknown shape type: ${tag} (is the plugin loaded?)`);
    return this.validate(
      provider,
      provider.fromSvg(id, new Map(attributes), content, children),
      id,
    );
  }

  private svgKey(tag: string, kind?: string): string {
    return JSON.stringify([tag, kind ?? null]);
  }
  private validate(provider: ShapeProvider, shape: Shape, id: string): Shape {
    if (shape.id !== id || shape.tag !== provider.svgTag)
      throw new Error(`invalid result from shape provider: ${provider.type}`);
    if (provider.kind) shape.importPresentation('data-kind', provider.kind);
    return shape;
  }
}
