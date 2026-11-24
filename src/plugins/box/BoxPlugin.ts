import type { Plugin, PluginContext } from '../../application/Plugin.js';
import { BoxProvider } from './BoxProvider.js';
import { BoxAttributes } from './BoxAttributes.js';
import { BoxTypeLabel } from './BoxTypeLabel.js';

export class BoxPlugin implements Plugin {
  readonly name = 'box';
  readonly contributes = { shapes: ['box'], attributes: ['box-attributes'], decorators: ['box-type-label'] };
  activate(context: PluginContext): void {
    context.registerShape(new BoxProvider());
    context.registerAttribute(new BoxAttributes());
    context.registerDecorator(new BoxTypeLabel());
  }
}
