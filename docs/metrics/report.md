# Source metrics (generated; do not edit)

- Generated (UTC): 2026-11-23T12:56:18.989Z
- Baseline: `final` = `cc58143fde0867fe6a8587c0d707ed35ac015ce2`
- Target: `HEAD` = `cc58143fde0867fe6a8587c0d707ed35ac015ce2`
- Scope: tracked production `.ts`/`.tsx` from the two committed Git trees. Test, build, node_modules and dependencies excluded. `src/domain` and `src/application` count as core (including core ports); `src/cli`, `src/infrastructure`, `src/Main.ts` count as assembly/adapters (host input, loading, IO). `src/plugins` counts as plugin. VSCode is a separate row and never included in CLI totals.
- Physical LOC counts non-empty and empty lines, excluding the terminal empty split; nonblank LOC exclude whitespace-only lines. Cyclomatic complexity is a **syntactic proxy**: one per function/method/constructor/accessor/arrow plus one for each if, loop, non-default switch case, catch, conditional expression and `&&`/`||`/`??` in a callable. Module-level decisions (e.g. Phase 1 `Main.ts`) are reported **separately**, not silently dropped. No implicit branching or dependency code is counted. A renamed/moved file is accounted as a removal and addition in the per-file comparison. This is not a proof of maintainability.
- **WARNING:** target resolves to the baseline; Phase 2 changes are not represented by this committed tree. Regenerate against final `p2` after tagging.
- **WARNING:** target `HEAD` is not a local tag; this is an interim committed-tree report, not a tagged Phase 2 release.
- **WARNING:** working-tree changes (including untracked sources) exist; none is counted in either committed tree (use `git status` for details). A zero VSCode row does not imply the extension is absent locally.

## By category (VSCode separate)

| Category | Files baseline → target | Physical LOC baseline → target (Δ) | Nonblank LOC baseline → target (Δ) | Callable units baseline → target (Δ) | Syntactic complexity baseline → target (Δ) | Module-level decisions baseline → target (Δ) |
|---|---:|---:|---:|---:|---:|---:|
| core | 52 → 52 (+0) | 1685 → 1685 (+0) | 1644 → 1644 (+0) | 270 → 270 (+0) | 455 → 455 (+0) | 0 → 0 (+0) |
| assembly/adapters | 10 → 10 (+0) | 653 → 653 (+0) | 631 → 631 (+0) | 59 → 59 (+0) | 178 → 178 (+0) | 11 → 11 (+0) |
| plugin | 2 → 2 (+0) | 71 → 71 (+0) | 67 → 67 (+0) | 11 → 11 (+0) | 24 → 24 (+0) | 0 → 0 (+0) |
| UNCLASSIFIED CLI | 0 → 0 (+0) | 0 → 0 (+0) | 0 → 0 (+0) | 0 → 0 (+0) | 0 → 0 (+0) | 0 → 0 (+0) |
| VSCode (separate) | 0 → 0 (+0) | 0 → 0 (+0) | 0 → 0 (+0) | 0 → 0 (+0) | 0 → 0 (+0) | 0 → 0 (+0) |
| **CLI total** | 64 → 64 | 2409 → 2409 (0) | 2342 → 2342 (0) | 340 → 340 | 657 → 657 (0) | 11 → 11 (0) |

## File inventory and responsibilities

Responsibility clues below are top-level declarations extracted from the **target** syntax tree; verify their actual behavior against code. No role or purpose is guessed from a filename alone.

| File | Category | Top-level declarations (responsibility clue) | Physical LOC | Nonblank LOC | Complexity baseline → target (Δ) | Module-level decisions baseline → target (Δ) |
|---|---|---|---:|---:|---:|---:|
| `src/Main.ts` | assembly/adapters | (module-level statements; inspect source) | 37 | 36 | 0 → 0 (+0) | 11 → 11 (+0) |
| `src/application/CanvasScope.ts` | core | class CanvasScope | 15 | 14 | 3 → 3 (+0) | 0 → 0 (+0) |
| `src/application/Command.ts` | core | class Command | 5 | 5 | 2 → 2 (+0) | 0 → 0 (+0) |
| `src/application/DocumentPort.ts` | core | interface LoadedDocument, interface DocumentPort | 9 | 9 | 0 → 0 (+0) | 0 → 0 (+0) |
| `src/application/EditContext.ts` | core | class EditContext | 75 | 74 | 22 → 22 (+0) | 0 → 0 (+0) |
| `src/application/EditRecord.ts` | core | class EditRecord | 19 | 19 | 3 → 3 (+0) | 0 → 0 (+0) |
| `src/application/EditScope.ts` | core | interface EditScope | 8 | 7 | 0 → 0 (+0) | 0 → 0 (+0) |
| `src/application/EditingCommand.ts` | core | class EditingCommand | 9 | 9 | 3 → 3 (+0) | 0 → 0 (+0) |
| `src/application/Editor.ts` | core | class Editor | 113 | 112 | 27 → 27 (+0) | 0 → 0 (+0) |
| `src/application/History.ts` | core | class History | 30 | 30 | 8 → 8 (+0) | 0 → 0 (+0) |
| `src/application/LayerScope.ts` | core | class LayerScope | 23 | 22 | 7 → 7 (+0) | 0 → 0 (+0) |
| `src/application/ShapeFormatter.ts` | core | class ShapeFormatter | 40 | 36 | 17 → 17 (+0) | 0 → 0 (+0) |
| `src/application/TreeFormatter.ts` | core | class TreeFormatter | 30 | 30 | 12 → 12 (+0) | 0 → 0 (+0) |
| `src/application/commands/AddToCommand.ts` | core | class AddToCommand | 19 | 19 | 3 → 3 (+0) | 0 → 0 (+0) |
| `src/application/commands/CanvasCommand.ts` | core | class CanvasCommand | 14 | 14 | 2 → 2 (+0) | 0 → 0 (+0) |
| `src/application/commands/CreateCommand.ts` | core | class CreateCommand | 23 | 22 | 4 → 4 (+0) | 0 → 0 (+0) |
| `src/application/commands/DeleteCommand.ts` | core | class DeleteCommand | 19 | 19 | 3 → 3 (+0) | 0 → 0 (+0) |
| `src/application/commands/ExitCommand.ts` | core | class ExitCommand | 11 | 11 | 2 → 2 (+0) | 0 → 0 (+0) |
| `src/application/commands/GroupCommand.ts` | core | class GroupCommand | 19 | 19 | 3 → 3 (+0) | 0 → 0 (+0) |
| `src/application/commands/HelpCommand.ts` | core | class HelpCommand | 26 | 26 | 2 → 2 (+0) | 0 → 0 (+0) |
| `src/application/commands/InitCommand.ts` | core | class InitCommand | 14 | 14 | 2 → 2 (+0) | 0 → 0 (+0) |
| `src/application/commands/LayerCommand.ts` | core | class LayerCommand | 15 | 14 | 4 → 4 (+0) | 0 → 0 (+0) |
| `src/application/commands/MoveCommand.ts` | core | class MoveCommand | 21 | 21 | 3 → 3 (+0) | 0 → 0 (+0) |
| `src/application/commands/MoveManyCommand.ts` | core | class MoveManyCommand | 22 | 21 | 4 → 4 (+0) | 0 → 0 (+0) |
| `src/application/commands/ReadCommand.ts` | core | class ReadCommand | 13 | 13 | 2 → 2 (+0) | 0 → 0 (+0) |
| `src/application/commands/RedoCommand.ts` | core | class RedoCommand | 10 | 10 | 2 → 2 (+0) | 0 → 0 (+0) |
| `src/application/commands/RotateCommand.ts` | core | class RotateCommand | 25 | 24 | 4 → 4 (+0) | 0 → 0 (+0) |
| `src/application/commands/SaveCommand.ts` | core | class SaveCommand | 13 | 13 | 2 → 2 (+0) | 0 → 0 (+0) |
| `src/application/commands/ScaleCommand.ts` | core | class ScaleCommand | 20 | 20 | 3 → 3 (+0) | 0 → 0 (+0) |
| `src/application/commands/SetCommand.ts` | core | class SetCommand | 21 | 21 | 3 → 3 (+0) | 0 → 0 (+0) |
| `src/application/commands/ShowCommand.ts` | core | class ShowCommand | 14 | 14 | 2 → 2 (+0) | 0 → 0 (+0) |
| `src/application/commands/TreeCommand.ts` | core | class TreeCommand | 14 | 14 | 2 → 2 (+0) | 0 → 0 (+0) |
| `src/application/commands/UndoCommand.ts` | core | class UndoCommand | 10 | 10 | 2 → 2 (+0) | 0 → 0 (+0) |
| `src/application/commands/UngroupCommand.ts` | core | class UngroupCommand | 18 | 18 | 3 → 3 (+0) | 0 → 0 (+0) |
| `src/application/commands/ZOrderCommand.ts` | core | class ZOrderCommand | 19 | 19 | 5 → 5 (+0) | 0 → 0 (+0) |
| `src/cli/Arguments.ts` | assembly/adapters | class Arguments | 26 | 26 | 9 → 9 (+0) | 0 → 0 (+0) |
| `src/cli/CommandDispatcher.ts` | assembly/adapters | class CommandDispatcher | 20 | 20 | 5 → 5 (+0) | 0 → 0 (+0) |
| `src/cli/CommandFactory.ts` | assembly/adapters | class CommandFactory | 164 | 159 | 39 → 39 (+0) | 0 → 0 (+0) |
| `src/cli/ConsoleApp.ts` | assembly/adapters | class ConsoleApp | 27 | 27 | 7 → 7 (+0) | 0 → 0 (+0) |
| `src/cli/Tokenizer.ts` | assembly/adapters | class Tokenizer | 34 | 34 | 13 → 13 (+0) | 0 → 0 (+0) |
| `src/domain/AffineTransform.ts` | core | class AffineTransform | 69 | 66 | 23 → 23 (+0) | 0 → 0 (+0) |
| `src/domain/Bounds.ts` | core | class Bounds | 62 | 56 | 14 → 14 (+0) | 0 → 0 (+0) |
| `src/domain/BoundsContext.ts` | core | interface BoundsContext | 6 | 5 | 0 → 0 (+0) | 0 → 0 (+0) |
| `src/domain/BuiltinShapeProvider.ts` | core | class BuiltinShapeProvider | 51 | 48 | 19 → 19 (+0) | 0 → 0 (+0) |
| `src/domain/Circle.ts` | core | class Circle | 25 | 25 | 5 → 5 (+0) | 0 → 0 (+0) |
| `src/domain/Ellipse.ts` | core | class Ellipse | 27 | 27 | 5 → 5 (+0) | 0 → 0 (+0) |
| `src/domain/GeometryShape.ts` | core | class GeometryShape | 64 | 63 | 18 → 18 (+0) | 0 → 0 (+0) |
| `src/domain/Group.ts` | core | class Group | 69 | 69 | 28 → 28 (+0) | 0 → 0 (+0) |
| `src/domain/Line.ts` | core | class Line | 24 | 24 | 5 → 5 (+0) | 0 → 0 (+0) |
| `src/domain/Numbers.ts` | core | class Numbers | 27 | 27 | 12 → 12 (+0) | 0 → 0 (+0) |
| `src/domain/Rect.ts` | core | class Rect | 32 | 32 | 5 → 5 (+0) | 0 → 0 (+0) |
| `src/domain/Shape.ts` | core | class Shape | 124 | 121 | 45 → 45 (+0) | 0 → 0 (+0) |
| `src/domain/ShapeContainer.ts` | core | interface ShapeContainer | 7 | 6 | 0 → 0 (+0) | 0 → 0 (+0) |
| `src/domain/ShapeFactory.ts` | core | class ShapeFactory | 103 | 97 | 24 → 24 (+0) | 0 → 0 (+0) |
| `src/domain/ShapeProvider.ts` | core | interface ShapeProvider | 14 | 13 | 0 → 0 (+0) | 0 → 0 (+0) |
| `src/domain/SvgDocument.ts` | core | class SvgDocument | 173 | 172 | 72 → 72 (+0) | 0 → 0 (+0) |
| `src/domain/Text.ts` | core | class Text | 42 | 42 | 14 → 14 (+0) | 0 → 0 (+0) |
| `src/domain/TextMeasurer.ts` | core | interface TextMeasurement, interface TextMeasurer | 10 | 8 | 0 → 0 (+0) | 0 → 0 (+0) |
| `src/infrastructure/CanvasTextMeasurer.ts` | assembly/adapters | interface CanvasTextContext, class CanvasTextMeasurer | 49 | 46 | 5 → 5 (+0) | 0 → 0 (+0) |
| `src/infrastructure/NodeDocumentStore.ts` | assembly/adapters | class NodeDocumentStore | 53 | 53 | 11 → 11 (+0) | 0 → 0 (+0) |
| `src/infrastructure/SvgCodec.ts` | assembly/adapters | interface ImportState, class SvgCodec | 204 | 193 | 64 → 64 (+0) | 0 → 0 (+0) |
| `src/infrastructure/SvgTransform.ts` | assembly/adapters | class SvgTransform | 39 | 37 | 25 → 25 (+0) | 0 → 0 (+0) |
| `src/plugins/Box.ts` | plugin | class Box | 27 | 26 | 11 → 11 (+0) | 0 → 0 (+0) |
| `src/plugins/BoxProvider.ts` | plugin | class BoxProvider | 44 | 41 | 13 → 13 (+0) | 0 → 0 (+0) |

## Reproduce

```sh
npm ci
node docs/metrics/generate.mjs --baseline final --target p2
```

Before the final tag exists, run `node docs/metrics/generate.mjs --baseline final --target HEAD` for a **committed interim** comparison only. The output is intentionally not based on uncommitted working files.
