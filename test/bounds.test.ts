import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Bounds } from '../src/domain/Bounds.js';
import { SvgCodec } from '../src/infrastructure/SvgCodec.js';
import { CanvasTextMeasurer } from '../src/infrastructure/CanvasTextMeasurer.js';
import { Editor } from '../src/application/Editor.js';
import { EditingCommand } from '../src/application/EditingCommand.js';
import type { EditContext } from '../src/application/EditContext.js';
import { CommandDispatcher } from '../src/cli/CommandDispatcher.js';
import { ShapeFactory } from '../src/domain/ShapeFactory.js';
import { BoxProvider } from '../src/plugins/BoxProvider.js';
import { MemoryDocumentStore } from './MemoryDocumentStore.js';

const metrics = { measure: () => ({ advance: 100, ink: new Bounds(-2, -15, 98, 5) }) };
function near(actual: Bounds | undefined, expected: readonly number[]): void {
  assert.ok(actual);
  [actual.minX, actual.minY, actual.maxX, actual.maxY].forEach((v, i) =>
    assert.ok(Math.abs(v - expected[i]!) < 1e-9, `${v} != ${expected[i]}`),
  );
}
test('bounds follow transformed geometry and exact ellipse extrema', () => {
  const doc = new SvgCodec().decode(
    '<svg><rect id="r" x="10" y="20" width="30" height="40" transform="rotate(90)"/><ellipse id="e" cx="0" cy="0" rx="10" ry="5" transform="rotate(45)"/><line id="l" x1="-2" y1="3" x2="7" y2="-8"/><circle id="c" r="4" transform="matrix(1 0 2 1 3 5)"/><g id="empty"/></svg>',
  ).document;
  near(doc.bounds('r'), [-60, 10, -20, 40]);
  const radius = Math.sqrt(62.5);
  near(doc.bounds('e'), [-radius, -radius, radius, radius]);
  near(doc.bounds('l'), [-2, -8, 7, 3]);
  near(doc.bounds('c'), [3 - Math.sqrt(80), 1, 3 + Math.sqrt(80), 9]);
  assert.equal(doc.bounds('empty'), undefined);
  assert.throws(() => new Bounds(1, 0, 0, 1));
});
test('text bounds resolve ancestor styles, baseline, anchor and rotation', () => {
  const doc = new SvgCodec().decode(
    '<svg><g id="g" font-size="24" text-anchor="middle"><text id="t" x="50" y="40" font-size="inherit" transform="rotate(90)">Test</text></g></svg>',
  ).document;
  const context = {
    textMeasurer: {
      measure(text: string, styles: ReadonlyMap<string, string>) {
        assert.equal(text, 'Test');
        assert.equal(styles.get('font-size'), '24');
        return metrics.measure();
      },
    },
  };
  near(doc.bounds('t', context), [-45, -2, -25, 98]);
  near(doc.bounds('g', context), [-45, -2, -25, 98]);
  assert.throws(() => doc.bounds('t'), /measurement required/);
});
test('canvas adapter uses ink metrics and restores caller state even on failure', () => {
  let restored = 0;
  const canvas = {
    font: '',
    textAlign: '',
    textBaseline: '',
    save() {},
    restore() {
      restored++;
    },
    measureText(text: string) {
      assert.equal(this.font, 'bold 24px serif');
      assert.equal(this.textAlign, 'left');
      assert.equal(this.textBaseline, 'alphabetic');
      if (text === 'fail') throw new Error('font failure');
      return {
        width: 100,
        actualBoundingBoxLeft: 2,
        actualBoundingBoxRight: 98,
        actualBoundingBoxAscent: 15,
        actualBoundingBoxDescent: 5,
      };
    },
  };
  const adapter = new CanvasTextMeasurer(canvas);
  const styles = new Map([
    ['font-size', '24px'],
    ['font-weight', 'bold'],
    ['font-family', 'serif'],
  ]);
  assert.deepEqual(adapter.measure('ok', styles), metrics.measure());
  assert.throws(() => adapter.measure('fail', styles), /font failure/);
  assert.equal(restored, 2);
});
class AlignLeftCommand extends EditingCommand {
  constructor(
    editor: Editor,
    private readonly ids: readonly string[],
  ) {
    super(editor);
  }
  get description(): string {
    return 'align left';
  }
  apply(context: EditContext): string {
    const targets = context
      .targets(this.ids)
      .map((shape) => ({ shape, bounds: context.bounds(shape.id, { textMeasurer: metrics }) }));
    const left = Math.min(...targets.flatMap((item) => (item.bounds ? [item.bounds.minX] : [])));
    for (const { shape, bounds } of targets) if (bounds) shape.move(left - bounds.minX, 0);
    return 'aligned';
  }
}
test('a layout command aligns rotated leaves and composite plugins in one undo unit', () => {
  const factory = new ShapeFactory();
  factory.register(new BoxProvider());
  const editor = new Editor(new MemoryDocumentStore(), factory);
  const cli = new CommandDispatcher(editor);
  for (const command of [
    'init',
    'create rect r 10 20 30 40',
    'rotate 30 0 0 r',
    'create ellipse e 100 100 20 10',
    'create box b 200 200 40 30 "Test"',
  ]) {
    assert.ok(!cli.run(command).some((line) => line.startsWith('error:')), command);
  }
  const codec = new SvgCodec(factory),
    before = codec.encode(editor.inspect());
  new AlignLeftCommand(editor, ['r', 'e', 'b', 'b-label']).execute();
  const aligned = editor.inspect();
  const edges = ['r', 'e', 'b'].map((id) => aligned.bounds(id, { textMeasurer: metrics })!.minX);
  assert.ok(edges.every((edge) => Math.abs(edge - edges[0]!) < 1e-9));
  const after = codec.encode(aligned);
  cli.run('undo');
  assert.equal(codec.encode(editor.inspect()), before);
  assert.throws(() => new AlignLeftCommand(editor, ['r', 'missing']).execute());
  assert.equal(codec.encode(editor.inspect()), before);
  cli.run('redo');
  assert.equal(codec.encode(editor.inspect()), after);
});
