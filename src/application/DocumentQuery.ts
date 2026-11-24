import type { SvgDocument } from '../domain/SvgDocument.js';

/** The returned document is an isolated snapshot, never mutable editor state. */
export interface DocumentQuery {
  inspect(): SvgDocument;
}
