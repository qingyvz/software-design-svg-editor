/** Host-side module URL resolution; the kernel has no process dependency. */
export interface ModuleResolver {
  resolve(specifier: string, parentUrl: string): string;
}
