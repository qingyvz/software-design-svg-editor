import type { Plugin, PluginContext } from '../application/Plugin.js';
import { ModifiedStar } from './ModifiedStar.js';

export class StarPlugin implements Plugin {
  readonly name = 'tree-star';
  readonly contributes = { decorators: ['modified-star'] };
  activate(context: PluginContext): void { context.registerDecorator(new ModifiedStar()); }
}
