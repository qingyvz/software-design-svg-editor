import { Command } from '../../application/Command.js';
import type { DocumentQuery } from '../../application/DocumentQuery.js';
import type { Shape } from '../../domain/Shape.js';

export class StatsCommand extends Command<DocumentQuery> {
  constructor(receiver: DocumentQuery) { super(receiver); }
  override execute(): readonly string[] {
    const counts = new Map<string, number>();
    let containers = 0;
    const visit = (shape: Shape): void => {
      if (shape.container) containers++;
      else counts.set(shape.tag, (counts.get(shape.tag) ?? 0) + 1);
      for (const child of shape.children) visit(child);
    };
    for (const child of this.receiver.inspect().children) visit(child);
    const total = [...counts.values()].reduce((sum, count) => sum + count, 0);
    const details = [...counts].map(([type, count]) => `${type}: ${count}`).join('  ');
    return [`${details}${details ? '  ' : ''}(total ${total}, containers ${containers})`];
  }
}
