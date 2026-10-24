import type { TextMeasurer } from './TextMeasurer.js';

export interface BoundsContext {
  readonly textMeasurer?: TextMeasurer | undefined;
  readonly inheritedPresentation?: ReadonlyMap<string, string> | undefined;
}
