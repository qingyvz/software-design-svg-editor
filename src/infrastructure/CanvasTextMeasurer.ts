import { Bounds } from '../domain/Bounds.js';
import { Numbers } from '../domain/Numbers.js';
import type { TextMeasurement, TextMeasurer } from '../domain/TextMeasurer.js';

export interface CanvasTextContext {
  font: string;
  textAlign: string;
  textBaseline: string;
  save(): void;
  restore(): void;
  measureText(text: string): {
    width: number;
    actualBoundingBoxLeft: number;
    actualBoundingBoxRight: number;
    actualBoundingBoxAscent: number;
    actualBoundingBoxDescent: number;
  };
}

export class CanvasTextMeasurer implements TextMeasurer {
  constructor(private readonly context: CanvasTextContext) {}

  measure(text: string, presentation: ReadonlyMap<string, string>): TextMeasurement {
    const size = Numbers.nonnegative(
      Numbers.parse((presentation.get('font-size') ?? '16').replace(/px$/, ''), 'font-size'),
      'font-size',
    );
    const family = presentation.get('font-family') ?? 'sans-serif';
    const weight = presentation.get('font-weight') ?? 'normal';
    this.context.save();
    try {
      this.context.font = `${weight} ${size}px ${family}`;
      this.context.textAlign = 'left';
      this.context.textBaseline = 'alphabetic';
      const metrics = this.context.measureText(text);
      return {
        advance: Numbers.nonnegative(metrics.width, 'text advance'),
        ink: new Bounds(
          -metrics.actualBoundingBoxLeft,
          -metrics.actualBoundingBoxAscent,
          metrics.actualBoundingBoxRight,
          metrics.actualBoundingBoxDescent,
        ),
      };
    } finally {
      this.context.restore();
    }
  }
}
