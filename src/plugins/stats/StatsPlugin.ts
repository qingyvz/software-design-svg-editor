import type { Plugin } from '../../application/Plugin.js';
import { StatsCommand } from './StatsCommand.js';

export class StatsPlugin implements Plugin {
  readonly name = 'stats';
  readonly contributes = { commands: ['stats'] };
  activate(context: import('../../application/Plugin.js').PluginContext): void {
    context.registerCommand({
      name: 'stats', help: 'stats',
      create(editor, args) {
        if (args.length) throw new Error('usage: stats');
        return new StatsCommand(editor);
      },
    });
  }
}
