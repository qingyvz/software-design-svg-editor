import type { SvgDocument } from '../domain/SvgDocument.js';
import type { Shape } from '../domain/Shape.js';

export interface TreeDecorator {
  readonly name: string;
  /** A suffix, including its own leading space, or the empty string. */
  label(document: SvgDocument, shape?: Shape): string;
  /** Called after successful document IO, not on a failed write/read. */
  checkpoint?(document: SvgDocument): void;
}
