import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
const allowed = {
  domain: ['domain'],
  application: ['application', 'domain'],
  cli: ['cli', 'application', 'domain'],
  infrastructure: ['infrastructure', 'application', 'domain'],
  plugins: ['plugins', 'domain'],
};
let checked = 0;
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(path);
      continue;
    }
    if (!path.endsWith('.ts')) continue;
    const source = readFileSync(path, 'utf8');
    const layer = relative('src', path).split(/[\\/]/)[0];
    for (const match of source.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
      const dep = match[1];
      if (!allowed[layer]) continue;
      if (!dep.startsWith('.')) {
        if (layer === 'domain' || layer === 'application')
          throw new Error(path + ': external dependency ' + dep);
        continue;
      }
      const target = relative('src', join(dir, dep)).split(/[\\/]/)[0];
      if (!allowed[layer].includes(target)) throw new Error(path + ' -> ' + target);
      checked++;
    }
    const classes = [...source.matchAll(/export\s+(?:abstract\s+)?class\s+(\w+)/g)];
    if (classes.length > 1) throw new Error(path + ': multiple classes');
    if (classes.length && entry.name !== classes[0][1] + '.ts')
      throw new Error(path + ': class/filename mismatch');
    if (/switch\s*\(/.test(source)) throw new Error(path + ': unexpected switch dispatch');
  }
}
walk('src');
console.log('Architecture checks passed (' + checked + ' relative imports).');
