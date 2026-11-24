import type { ShapeProvider } from '../domain/ShapeProvider.js';
import type { AttributeHandler } from './AttributeHandler.js';
import type { TreeDecorator } from './TreeDecorator.js';
import type { CommandContribution } from './CommandContribution.js';

export interface PluginManifest {
  readonly shapes?: readonly string[];
  readonly commands?: readonly string[];
  readonly decorators?: readonly string[];
  readonly attributes?: readonly string[];
}
export interface PluginContext {
  registerShape(provider: ShapeProvider): void;
  registerCommand(command: CommandContribution): void;
  registerDecorator(decorator: TreeDecorator): void;
  registerAttribute(handler: AttributeHandler): void;
}
export interface Plugin {
  readonly name: string;
  readonly contributes: PluginManifest;
  activate(context: PluginContext, options?: unknown): void;
}
