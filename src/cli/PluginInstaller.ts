import type { Plugin, PluginContext, PluginManifest } from '../application/Plugin.js';
import { AttributeHandlers } from '../application/AttributeHandlers.js';
import { CommandRegistry } from '../application/CommandRegistry.js';
import { TreeDecorators } from '../application/TreeDecorators.js';
import { ShapeFactory } from '../domain/ShapeFactory.js';
import type { ShapeProvider } from '../domain/ShapeProvider.js';
import type { CommandContribution } from '../application/CommandContribution.js';
import type { TreeDecorator } from '../application/TreeDecorator.js';
import type { AttributeHandler } from '../application/AttributeHandler.js';

type Category = keyof Required<PluginManifest>;
const categories: readonly Category[] = ['shapes', 'commands', 'decorators', 'attributes'];
type Contributions = {
  shapes: ShapeProvider[];
  commands: CommandContribution[];
  decorators: TreeDecorator[];
  attributes: AttributeHandler[];
};

/** One transaction shared by code-based and config-based composition. */
export class PluginInstaller {
  constructor(
    private readonly shapes: ShapeFactory,
    private readonly commands: CommandRegistry,
    private readonly decorators: TreeDecorators,
    private readonly attributes: AttributeHandlers,
    private readonly builtinCommandExists: (name: string) => boolean = () => false,
  ) {}
  install(plugin: Plugin, options?: unknown): string | undefined {
    const name = typeof plugin?.name === 'string' && plugin.name ? plugin.name : '<unknown>';
    const pending: Contributions = { shapes: [], commands: [], decorators: [], attributes: [] };
    const context: PluginContext = {
      registerShape: (value) => { pending.shapes.push(value); },
      registerCommand: (value) => { pending.commands.push(value); },
      registerDecorator: (value) => { pending.decorators.push(value); },
      registerAttribute: (value) => { pending.attributes.push(value); },
    };
    try { plugin.activate(context, options); }
    catch (error) { return `error: plugin failed to activate: ${name} (${this.reason(error)})`; }
    let actual: Required<PluginManifest>;
    try {
      // Even a malformed contribution can have a throwing getter. Validate it
      // and derive its registered names inside the same error boundary.
      if (pending.shapes.some((value) => !value || typeof value.type !== 'string' || !value.type ||
            typeof value.svgTag !== 'string' || !value.svgTag ||
            typeof value.create !== 'function' || typeof value.fromSvg !== 'function') ||
          pending.commands.some((value) => !value || typeof value.name !== 'string' || !value.name ||
            typeof value.create !== 'function' || typeof value.help !== 'string') ||
          pending.decorators.some((value) => !value || typeof value.name !== 'string' || !value.name ||
            typeof value.label !== 'function') ||
          pending.attributes.some((value) => !value || typeof value.name !== 'string' || !value.name ||
            typeof value.handles !== 'function' || typeof value.apply !== 'function'))
        return `error: plugin failed to activate: ${name} (invalid contribution)`;
      actual = this.names(pending);
      for (const category of categories) {
        const seen = new Set<string>();
        for (const member of actual[category]) {
          if (!member || seen.has(member) || this.exists(category, member))
            return `error: duplicate registration: ${category}/${member}`;
          seen.add(member);
        }
      }
    } catch (error) { return `error: plugin failed to activate: ${name} (${this.reason(error)})`; }
    let declared: Required<PluginManifest> | undefined;
    try { declared = this.manifest(plugin.contributes); }
    catch (error) { return `error: plugin failed to activate: ${name} (${this.reason(error)})`; }
    if (!declared || categories.some((key) => !this.same(declared[key], actual[key])))
      return `error: plugin manifest mismatch: ${name} (declared: ${JSON.stringify(declared ?? {})}, registered: ${JSON.stringify(actual)})`;
    const svgKeys = new Set<string>();
    try {
      for (const provider of pending.shapes) {
        const key = JSON.stringify([provider.svgTag, provider.kind ?? null]);
        if (svgKeys.has(key) || this.shapes.hasSvg(provider.svgTag, provider.kind))
          return `error: duplicate registration: shapes/${provider.type}`;
        svgKeys.add(key);
      }
    } catch (error) { return `error: plugin failed to activate: ${name} (${this.reason(error)})`; }
    // Commit only after full validation, so activation failure/manifest mismatch
    // cannot leak a partial plugin into the running application.
    const committed: { category: Category; name: string }[] = [];
    try {
      for (const value of pending.shapes) { this.shapes.register(value); committed.push({ category: 'shapes', name: value.type }); }
      for (const value of pending.commands) { this.commands.register(value); committed.push({ category: 'commands', name: value.name }); }
      for (const value of pending.decorators) { this.decorators.register(value); committed.push({ category: 'decorators', name: value.name }); }
      for (const value of pending.attributes) { this.attributes.register(value); committed.push({ category: 'attributes', name: value.name }); }
    } catch (error) {
      for (const { category, name: member } of committed.reverse()) {
        if (category === 'shapes') this.shapes.remove(member);
        else if (category === 'commands') this.commands.remove(member);
        else if (category === 'decorators') this.decorators.remove(member);
        else this.attributes.remove(member);
      }
      return `error: plugin failed to activate: ${name} (${this.reason(error)})`;
    }
    return undefined;
  }
  private exists(category: Category, name: string): boolean {
    if (category === 'shapes') return this.shapes.has(name);
    if (category === 'commands') return this.commands.has(name) || this.builtinCommandExists(name);
    if (category === 'decorators') return this.decorators.has(name);
    return this.attributes.has(name);
  }
  private names(pending: Contributions): Required<PluginManifest> {
    return {
      shapes: pending.shapes.map((v) => v.type),
      commands: pending.commands.map((v) => v.name),
      decorators: pending.decorators.map((v) => v.name),
      attributes: pending.attributes.map((v) => v.name),
    };
  }
  private manifest(value: PluginManifest | undefined): Required<PluginManifest> | undefined {
    if (!value || typeof value !== 'object' || Array.isArray(value) ||
        Object.keys(value).some((key) => !categories.includes(key as Category))) return undefined;
    const result: Record<Category, string[]> = { shapes: [], commands: [], decorators: [], attributes: [] };
    for (const key of categories) {
      const names = value[key] === undefined ? [] : value[key];
      if (!Array.isArray(names) || names.some((s: unknown) => typeof s !== 'string' || !s)) return undefined;
      result[key] = names.slice();
    }
    return result;
  }
  private same(left: readonly string[], right: readonly string[]): boolean {
    const sortedRight = [...right].sort();
    return left.length === right.length && [...left].sort().every((v, i) => v === sortedRight[i]);
  }
  private reason(error: unknown): string {
    return (error instanceof Error ? error.message : String(error)).replace(/[\r\n]+/g, ' ');
  }
}
