export class Tokenizer {
  parse(line: string): string[] {
    if (line.trimStart().startsWith('#')) return [];
    const result: string[] = [];
    let current = '',
      quoted = false,
      active = false;
    for (let i = 0; i < line.length; i++) {
      const character = line[i]!;
      if (quoted && character === '\\' && (line[i + 1] === '"' || line[i + 1] === '\\')) {
        current += line[++i]!;
        continue;
      }
      if (character === '"') {
        quoted = !quoted;
        active = true;
        continue;
      }
      if (!quoted && /\s/.test(character)) {
        if (active) {
          result.push(current);
          current = '';
          active = false;
        }
      } else {
        current += character;
        active = true;
      }
    }
    if (quoted) throw new Error('unterminated quote');
    if (active) result.push(current);
    return result;
  }
}
