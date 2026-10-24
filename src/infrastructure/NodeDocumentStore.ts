import {
  closeSync,
  existsSync,
  fsyncSync,
  openSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { randomUUID } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import type { DocumentPort, LoadedDocument } from '../application/DocumentPort.js';
import type { SvgDocument } from '../domain/SvgDocument.js';
import { SvgCodec } from './SvgCodec.js';
export class NodeDocumentStore implements DocumentPort {
  constructor(private readonly codec = new SvgCodec()) {}
  read(path: string): LoadedDocument {
    let source: string;
    try {
      const info = statSync(path);
      if (!info.isFile() || info.size > 20 * 1024 * 1024) throw new Error('invalid input file');
      source = readFileSync(path, 'utf8');
    } catch {
      throw new Error(`cannot read file: ${path}`);
    }
    try {
      return this.codec.decode(source);
    } catch (error) {
      throw new Error('invalid SVG: ' + (error instanceof Error ? error.message : 'parse failed'));
    }
  }
  write(path: string, document: SvgDocument): void {
    const data = this.codec.encode(document);
    const destination = resolve(path),
      temporary = join(dirname(destination), '.svg-editor-' + randomUUID() + '.tmp');
    let descriptor: number | undefined;
    try {
      descriptor = openSync(temporary, 'wx');
      writeFileSync(descriptor, data, 'utf8');
      fsyncSync(descriptor);
      closeSync(descriptor);
      descriptor = undefined;
      renameSync(temporary, destination);
    } catch {
      throw new Error(`cannot write file: ${path}`);
    } finally {
      if (descriptor !== undefined) closeSync(descriptor);
      if (existsSync(temporary)) unlinkSync(temporary);
    }
  }
}
