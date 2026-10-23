import { Command } from '../Command.js';
import type { Editor } from '../Editor.js';
export class HelpCommand extends Command {
  constructor(receiver: Editor) { super(receiver); }
  override execute(): readonly string[] {
    return [
      'init [w h] | read <file.svg> | save [file.svg] | canvas [w h]',
      'create rect <id> <x> <y> <w> <h> [fill] [in <gid>]',
      'create circle <id> <cx> <cy> <r> [fill] [in <gid>]',
      'create ellipse <id> <cx> <cy> <rx> <ry> [fill] [in <gid>]',
      'create line <id> <x1> <y1> <x2> <y2> [stroke] [in <gid>]',
      'create text <id> <x> <y> "content" [in <gid>] | create g <id> [in <gid>]',
      'delete <id> | move <id> <dx> <dy> | scale <id> <factor>',
      'set <id> <attr> <value> | group <newGid> <id1> [id2 ...]',
      'ungroup <gid> | addto <gid> <id> | front <id> | back <id>',
      'tree [id] | show <id> | help | undo | redo | exit',
      'rotate <degrees> <cx> <cy> <id1> [id2 ...] | move-many <dx> <dy> <id1> [id2 ...]',
      'layer [enter <gid> | leave]',
      'Optional --box plugin: create box <id> <x> <y> <w> <h> "label" [in <gid>]',
      'Common set attributes: fill, stroke, stroke-width; geometry attributes depend on shape.',
      'Text additionally supports: set <id> text "content".',
    ];
  }
}
