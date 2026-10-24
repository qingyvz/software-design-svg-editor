import type { Bounds } from './Bounds.js';

export interface TextMeasurement {
  readonly advance: number;
  readonly ink: Bounds;
}

export interface TextMeasurer {
  measure(text: string, presentation: ReadonlyMap<string, string>): TextMeasurement;
}
