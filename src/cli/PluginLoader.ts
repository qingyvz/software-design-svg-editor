import { readFileSync, statSync } from 'node:fs';
import { dirname, resolve, isAbsolute, join } from 'node:path';
import { createRequire } from 'node:module';
import { resolve as resolveImport } from 'import-meta-resolve';
import { pathToFileURL, fileURLToPath } from 'node:url';
import type { Plugin, PluginManifest } from '../application/Plugin.js';
import { PluginInstaller } from './PluginInstaller.js';

interface ConfigEntry { module: string; enabled?: boolean; options?: unknown }

export class PluginLoader {
  constructor(private readonly installer: PluginInstaller) {}
  async load(configPath: string): Promise<readonly string[]> {
    let entries: ConfigEntry[];
    try {
      const parsed: unknown = JSON.parse(readFileSync(configPath, 'utf8'));
      if (!this.valid(parsed)) throw new Error('invalid');
      entries = parsed.plugins;
    } catch { return ['error: invalid plugin config']; }
    const errors: string[] = [];
    for (const entry of entries) {
      if (entry.enabled === false) continue;
      const specifier = entry.module;
      let resolved: string;
      try {
        const base = dirname(resolve(configPath));
        const require = createRequire(join(base, 'plugins.config.json'));
        resolved = specifier.startsWith('.') || isAbsolute(specifier)
          ? require.resolve(resolve(base, specifier))
          : fileURLToPath(resolveImport(specifier, pathToFileURL(join(base, 'plugins.config.json')).href));
        // ESM resolution can return a URL for an exports target that does not exist.
        // Check only this top-level entry here; dependency/evaluation errors belong below.
        statSync(resolved);
      } catch (error) {
        if (this.isNotFound(error)) { errors.push(`error: plugin not found: ${specifier}`); continue; }
        errors.push(`error: plugin failed to activate: ${specifier} (${this.reason(error)})`);
        continue;
      }
      try {
        const loaded: unknown = await import(pathToFileURL(resolved).href);
        if (!loaded || typeof loaded !== 'object' || !('default' in loaded)) {
          errors.push(`error: plugin has no default export: ${specifier}`);
          continue;
        }
        const module = loaded as { default: unknown; contributes?: unknown; name?: unknown };
        const exported = module.default;
        // A default factory or class is instantiated here, outside the kernel.
        const plugin = typeof exported === 'function' ? new (exported as new () => Plugin)() : exported as Plugin;
        if (!plugin || typeof plugin.activate !== 'function') throw new Error('invalid default plugin');
        // Package metadata is authoritative when provided by a package; a relative
        // module may export its manifest directly or on the plugin object.
        const manifest = this.packageManifest(resolved) ?? module.contributes ?? plugin.contributes;
        const candidate: Plugin = { name: typeof module.name === 'string' ? module.name : plugin.name,
          contributes: manifest as PluginManifest, activate: (context, options) => plugin.activate(context, options) };
        const failure = this.installer.install(candidate, entry.options);
        if (failure) errors.push(failure);
      } catch (error) { errors.push(`error: plugin failed to activate: ${specifier} (${this.reason(error)})`); }
    }
    return errors;
  }
  private packageManifest(resolved: string): unknown {
    // Only the nearest plugin package's own contributes is authoritative;
    // the application package.json is not a manifest for relative modules.
    let directory = dirname(resolved);
    const appPackage = fileURLToPath(new URL('../../../package.json', import.meta.url));
    for (;;) {
      const packagePath = resolve(directory, 'package.json');
      if (packagePath === appPackage) return undefined;
      try {
        const p = JSON.parse(readFileSync(packagePath, 'utf8')) as { contributes?: unknown };
        return p.contributes;
      } catch (error) {
        if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) return undefined;
      }
      const parent = dirname(directory);
      if (parent === directory) return undefined;
      directory = parent;
    }
  }
  private isNotFound(error: unknown): boolean {
    return error instanceof Error && 'code' in error &&
      ['MODULE_NOT_FOUND', 'ERR_MODULE_NOT_FOUND', 'ENOENT', 'ENOTDIR'].includes(String(error.code));
  }
  private reason(error: unknown): string {
    return (error instanceof Error ? error.message : String(error)).replace(/[\r\n]+/g, ' ');
  }
  private valid(value: unknown): value is { plugins: ConfigEntry[] } {
    return !!value && typeof value === 'object' && 'plugins' in value && Array.isArray(value.plugins) &&
      value.plugins.every((p: unknown) => !!p && typeof p === 'object' &&
        'module' in p && typeof p.module === 'string' && !!p.module &&
        (!('enabled' in p) || typeof p.enabled === 'boolean'));
  }
}
