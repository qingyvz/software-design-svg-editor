import { readFileSync } from 'node:fs';

/** Separate entry point so native resolution code is compiled, reviewed and counted. */
class NodeResolveWorker {
  static run(): void {
    try {
      const input = JSON.parse(readFileSync(0, 'utf8')) as { specifier: string; parentUrl: string };
      process.stdout.write(JSON.stringify({ url: import.meta.resolve(input.specifier, input.parentUrl) }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : undefined;
      process.stdout.write(JSON.stringify({ error: { message, code } }));
    }
  }
}
NodeResolveWorker.run();
