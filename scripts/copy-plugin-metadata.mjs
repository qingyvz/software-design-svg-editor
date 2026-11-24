import { readdirSync, mkdirSync, copyFileSync } from 'node:fs';
import { resolve, relative, dirname } from 'node:path';
const source = resolve('src/plugins');
function copy(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) copy(path);
    else if (entry.name === 'package.json') {
      const target = resolve('build/src/plugins', relative(source, path));
      mkdirSync(dirname(target), { recursive: true });
      copyFileSync(path, target);
    }
  }
}
copy(source);
