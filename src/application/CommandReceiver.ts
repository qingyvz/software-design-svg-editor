import type { DocumentQuery } from './DocumentQuery.js';
import type { EditingCommand } from './EditingCommand.js';

/** Public application operations; implementations and session state stay hidden. */
export interface CommandReceiver extends DocumentQuery {
  readonly exiting: boolean;
  readonly activeLayer: string | undefined;
  tree(id?: string): readonly string[];
  requestExit(): void;
  init(width?: number, height?: number): readonly string[];
  read(path: string): readonly string[];
  save(path?: string): readonly string[];
  canvas(width?: number, height?: number): readonly string[];
  executeEdit(command: EditingCommand): readonly string[];
  describeLayer(): readonly string[];
  setLayer(id?: string): readonly string[];
  undo(): readonly string[];
  redo(): readonly string[];
}
