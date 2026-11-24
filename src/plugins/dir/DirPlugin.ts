import type { Plugin, PluginContext } from '../../application/Plugin.js';
import type { DirectoryAccess } from './DirectoryAccess.js';
import { NodeDirectoryAccess } from './NodeDirectoryAccess.js';
import { DirCommand } from './DirCommand.js';

export class DirPlugin implements Plugin {
  readonly name = 'dir';
  readonly contributes = { commands: ['dir'] };
  constructor(private readonly directory: DirectoryAccess = new NodeDirectoryAccess()) {}
  activate(context: PluginContext): void {
    const directory = this.directory;
    context.registerCommand({
      name: 'dir', help: 'dir',
      create(_editor, args) {
        if (args.length) throw new Error('usage: dir');
        return new DirCommand(directory);
      },
    });
  }
}
