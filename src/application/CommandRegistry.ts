import type { CommandContribution } from './CommandContribution.js';

export class CommandRegistry {
  private readonly entries = new Map<string, CommandContribution>();
  constructor(private readonly reserved: (name: string) => boolean = () => false) {}
  has(name: string): boolean { return this.entries.has(name); }
  register(command: CommandContribution): void {
    if (this.has(command.name) || this.reserved(command.name)) throw new Error(`command already registered: ${command.name}`);
    this.entries.set(command.name, command);
  }
  remove(name: string): void { this.entries.delete(name); }
  all(): readonly CommandContribution[] { return [...this.entries.values()]; }
}
