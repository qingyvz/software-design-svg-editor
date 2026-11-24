import type { PluginContext } from '../src/application/Plugin.js';
import type { ShapeProvider } from '../src/domain/ShapeProvider.js';
import type { CommandContribution } from '../src/application/CommandContribution.js';
import type { TreeDecorator } from '../src/application/TreeDecorator.js';
import type { AttributeHandler } from '../src/application/AttributeHandler.js';
export class PluginProbe implements PluginContext {
  readonly shapes = new Map<string, ShapeProvider>();
  readonly commands = new Map<string, CommandContribution>();
  readonly decorators = new Map<string, TreeDecorator>();
  readonly attributes = new Map<string, AttributeHandler>();
  registerShape(value: ShapeProvider): void { this.shapes.set(value.type, value); }
  registerCommand(value: CommandContribution): void { this.commands.set(value.name, value); }
  registerDecorator(value: TreeDecorator): void { this.decorators.set(value.name, value); }
  registerAttribute(value: AttributeHandler): void { this.attributes.set(value.name, value); }
  names() {
    return { shapes: [...this.shapes.keys()], commands: [...this.commands.keys()], decorators: [...this.decorators.keys()], attributes: [...this.attributes.keys()] };
  }
}
