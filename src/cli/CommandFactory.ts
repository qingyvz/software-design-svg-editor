import { DeleteCommand } from '../application/commands/DeleteCommand.js';
import { MoveCommand } from '../application/commands/MoveCommand.js';
import { ScaleCommand } from '../application/commands/ScaleCommand.js';
import { SetCommand } from '../application/commands/SetCommand.js';
import { GroupCommand } from '../application/commands/GroupCommand.js';
import { UngroupCommand } from '../application/commands/UngroupCommand.js';
import { AddToCommand } from '../application/commands/AddToCommand.js';
import { ZOrderCommand } from '../application/commands/ZOrderCommand.js';
import { CreateCommand } from '../application/commands/CreateCommand.js';
import { InitCommand } from '../application/commands/InitCommand.js';
import { ReadCommand } from '../application/commands/ReadCommand.js';
import { SaveCommand } from '../application/commands/SaveCommand.js';
import { CanvasCommand } from '../application/commands/CanvasCommand.js';
import { UndoCommand } from '../application/commands/UndoCommand.js';
import { RedoCommand } from '../application/commands/RedoCommand.js';
import { ExitCommand } from '../application/commands/ExitCommand.js';
import { TreeCommand } from '../application/commands/TreeCommand.js';
import { ShowCommand } from '../application/commands/ShowCommand.js';
import { HelpCommand } from '../application/commands/HelpCommand.js';
import type { Command } from '../application/Command.js';
import { Editor } from '../application/Editor.js';
import { Arguments } from './Arguments.js';
export class CommandFactory {
  private readonly commands: ReadonlyMap<string, (a: Arguments) => Command>;
  constructor(private readonly editor: Editor) {
    // TODO: 支持外部注册命令。
    const r = editor;
    this.commands = new Map<string, (a: Arguments) => Command>([
      ['init', a => { const args = a.all(); if (![0, 1, 2].includes(args.length)) a.count(0, 2); return new InitCommand(r, args.length ? a.number(0) : 800, args.length > 1 ? a.number(1) : 600); }],
      ['read', a => { a.count(1); return new ReadCommand(r, a.text(0)); }],
      ['save', a => { a.count(0, 1); return new SaveCommand(r, a.optional(0)); }],
      ['canvas', a => { if (a.all().length === 0) return new CanvasCommand(r); a.count(2); return new CanvasCommand(r, a.number(0), a.number(1)); }],
      ['create', a => this.createShape(a)],
      ['delete', a => { a.count(1); return new DeleteCommand(r, a.text(0)); }],
      ['move', a => { a.count(3); return new MoveCommand(r, a.text(0), a.number(1), a.number(2)); }],
      ['scale', a => { a.count(2); return new ScaleCommand(r, a.text(0), a.number(1)); }],
      ['set', a => { a.count(3); return new SetCommand(r, a.text(0), a.text(1), a.text(2)); }],
      ['group', a => { a.count(2, Number.MAX_SAFE_INTEGER); return new GroupCommand(r, a.text(0), a.all().slice(1)); }],
      ['ungroup', a => { a.count(1); return new UngroupCommand(r, a.text(0)); }],
      ['addto', a => { a.count(2); return new AddToCommand(r, a.text(0), a.text(1)); }],
      ['front', a => { a.count(1); return new ZOrderCommand(r, a.text(0), true); }],
      ['back', a => { a.count(1); return new ZOrderCommand(r, a.text(0), false); }],
      ['tree', a => { a.count(0, 1); return new TreeCommand(r, a.optional(0)); }],
      ['show', a => { a.count(1); return new ShowCommand(r, a.text(0)); }],
      ['help', a => { a.count(0); return new HelpCommand(r); }],
      ['undo', a => { a.count(0); return new UndoCommand(r); }],
      ['redo', a => { a.count(0); return new RedoCommand(r); }],
      ['exit', a => { a.count(0); return new ExitCommand(r); }],
    ]);
  }
  create(name: string, values: readonly string[]): Command {
    const command = this.commands.get(name);
    if (!command) throw new Error(`unknown command: ${name}`);
    return command(new Arguments(values, name + ' (see help for syntax)'));
  }
  private createShape(args: Arguments): Command {
    args.count(2, Number.MAX_SAFE_INTEGER);
    const parameters = args.all().slice(2);
    let container: string | undefined;
    if (parameters.length >= 2 && parameters[parameters.length - 2] === 'in') {
      container = parameters.pop()!; parameters.pop();
    }
    return new CreateCommand(this.editor, args.text(0), args.text(1), parameters, container);
  }
}
