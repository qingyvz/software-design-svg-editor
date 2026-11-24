import { readdirSync } from 'node:fs';
import type { DirectoryAccess, DirectoryEntry } from './DirectoryAccess.js';

/** Adapts Node's Dirent API to the directory port; links stay in 'other'. */
export class NodeDirectoryAccess implements DirectoryAccess {
  cwd(): string { return process.cwd(); }
  list(path: string): readonly DirectoryEntry[] {
    return readdirSync(path, { withFileTypes: true }).map((entry) => ({
      name: entry.name,
      kind: entry.isDirectory() ? 'directory' : entry.isFile() ? 'file' : 'other',
    }));
  }
}
