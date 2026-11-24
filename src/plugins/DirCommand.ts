import { Command } from '../application/Command.js';
import type { Editor } from '../application/Editor.js';
import type { DirectoryAccess } from './DirectoryAccess.js';

export class DirCommand extends Command {
  constructor(receiver: Editor, private readonly directory: DirectoryAccess) { super(receiver); }
  override execute(): readonly string[] {
    let path = '';
    try {
      path = this.directory.cwd();
      const entries = this.directory.list(path).filter((item) => item.name !== '.' && item.name !== '..');
      const order = { directory: 0, file: 1, other: 2 } as const;
      entries.sort((a, b) => order[a.kind] - order[b.kind] || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
      return entries.length
        ? entries.map(({ name, kind }) => `[${kind === 'directory' ? 'DIR' : kind === 'file' ? 'FILE' : 'OTHER'}]  ${name}`)
        : ['(empty directory)'];
    } catch {
      return [`error: cannot read directory: ${path}`];
    }
  }
}
