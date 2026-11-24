import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import type { ModuleResolver } from './ModuleResolver.js';

/** Resolve without importing plugin code, using this Node runtime's own ESM rules. */
export class NodeModuleResolver implements ModuleResolver {
  resolve(specifier: string, parentUrl: string): string {
    let output: string;
    try {
      output = execFileSync(process.execPath,
        [...this.flags(), '--experimental-import-meta-resolve',
          fileURLToPath(new URL('./NodeResolveWorker.js', import.meta.url))],
        { input: JSON.stringify({ specifier, parentUrl }), encoding: 'utf8',
          windowsHide: true, timeout: 10000, maxBuffer: 1024 * 1024 });
    } catch (error) {
      // A worker launch failure is infrastructure failure, not a missing plugin.
      const details = error && typeof error === 'object' ? error : {};
      const code = 'code' in details ? String(details.code) : 'status' in details ? String(details.status) : 'unknown';
      throw new Error('native module resolver unavailable: ' + code + '; rebuild with Node 22+');
    }
    const result = JSON.parse(output) as { url?: string; error?: { message: string; code?: string } };
    if (result.error) {
      const error = new Error(result.error.message);
      if (result.error.code) Object.assign(error, { code: result.error.code });
      throw error;
    }
    if (typeof result.url !== 'string') throw new Error('native module resolver returned invalid output');
    return result.url;
  }
  private flags(): string[] {
    const flags: string[] = [];
    const boolean = new Set(['--no-addons', '--addons',
      '--experimental-require-module', '--no-experimental-require-module',
      '--preserve-symlinks', '--no-preserve-symlinks',
      '--preserve-symlinks-main', '--no-preserve-symlinks-main']);
    for (let i = 0; i < process.execArgv.length; i++) {
      const arg = process.execArgv[i]!;
      if (arg === '--conditions' || arg === '-C') {
        flags.push(arg, process.execArgv[++i]!);
      } else if (arg.startsWith('--conditions=') || arg.startsWith('-C') || boolean.has(arg)) {
        flags.push(arg);
      }
    }
    return flags;
  }
}
