import { Numbers } from '../domain/Numbers.js';
export class Arguments {
  constructor(
    private readonly tokens: readonly string[],
    private readonly usage: string,
  ) {}
  count(min: number, max = min): this {
    if (this.tokens.length < min || this.tokens.length > max)
      throw new Error(`usage: ${this.usage}`);
    return this;
  }
  text(index: number): string {
    const value = this.tokens[index];
    if (value === undefined) throw new Error(`usage: ${this.usage}`);
    return value;
  }
  optional(index: number): string | undefined {
    return this.tokens[index];
  }
  number(index: number): number {
    return Numbers.parse(this.text(index), this.usage.split(' ')[0]!);
  }
  all(): readonly string[] {
    return this.tokens.slice();
  }
}
