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
import { LayerCommand } from '../application/commands/LayerCommand.js';
import type { Command } from '../application/Command.js';
import { Editor } from '../application/Editor.js';
import { Arguments } from './Arguments.js';

export class CommandFactory {
  private readonly commands = new Map<string, (arguments_: Arguments) => Command>();

  constructor(private readonly editor: Editor) {
    this.register('init', args => {
      args.count(0, 2);
      return new InitCommand(editor, args.all().length ? args.number(0) : 800, args.all().length > 1 ? args.number(1) : 600);
    });
    this.register('read', args => {
      args.count(1);
      return new ReadCommand(editor, args.text(0));
    });
    this.register('save', args => {
      args.count(0, 1);
      return new SaveCommand(editor, args.optional(0));
    });
    this.register('canvas', args => {
      if (args.all().length === 0) return new CanvasCommand(editor);
      args.count(2);
      return new CanvasCommand(editor, args.number(0), args.number(1));
    });
    this.register('create', args => this.createShape(args));
    this.register('delete', args => {
      args.count(1);
      return new DeleteCommand(editor, args.text(0));
    });
    this.register('move', args => {
      args.count(3);
      return new MoveCommand(editor, args.text(0), args.number(1), args.number(2));
    });
    this.register('scale', args => {
      args.count(2);
      return new ScaleCommand(editor, args.text(0), args.number(1));
    });
    this.register('set', args => {
      args.count(3);
      return new SetCommand(editor, args.text(0), args.text(1), args.text(2));
    });
    this.register('group', args => {
      args.count(2, Number.MAX_SAFE_INTEGER);
      return new GroupCommand(editor, args.text(0), args.all().slice(1));
    });
    this.register('ungroup', args => {
      args.count(1);
      return new UngroupCommand(editor, args.text(0));
    });
    this.register('addto', args => {
      args.count(2);
      return new AddToCommand(editor, args.text(0), args.text(1));
    });
    this.register('front', args => {
      args.count(1);
      return new ZOrderCommand(editor, args.text(0), true);
    });
    this.register('back', args => {
      args.count(1);
      return new ZOrderCommand(editor, args.text(0), false);
    });
    this.register('tree', args => {
      args.count(0, 1);
      return new TreeCommand(editor, args.optional(0));
    });
    this.register('show', args => {
      args.count(1);
      return new ShowCommand(editor, args.text(0));
    });
    this.register('help', args => {
      args.count(0);
      return new HelpCommand(editor);
    });
    this.register('undo', args => {
      args.count(0);
      return new UndoCommand(editor);
    });
    this.register('redo', args => {
      args.count(0);
      return new RedoCommand(editor);
    });
    this.register('exit', args => {
      args.count(0);
      return new ExitCommand(editor);
    });
    this.register('layer', args => {
      if (args.all().length === 0) return new LayerCommand(editor);
      if (args.text(0) === 'enter') {
        args.count(2);
        return new LayerCommand(editor, args.text(1));
      }
      if (args.text(0) === 'leave') {
        args.count(1);
        return new LayerCommand(editor, null);
      }
      throw new Error('usage: layer [enter <gid> | leave]');
    });
  }

  register(name: string, construct: (arguments_: Arguments) => Command): this {
    if (!name || /\s/.test(name)) throw new Error('invalid command name');
    if (this.commands.has(name)) throw new Error(`command already registered: ${name}`);
    this.commands.set(name, construct);
    return this;
  }

  create(name: string, values: readonly string[]): Command {
    const construct = this.commands.get(name);
    if (!construct) throw new Error(`unknown command: ${name}`);
    return construct(new Arguments(values, name + ' (see help for syntax)'));
  }

  private createShape(args: Arguments): Command {
    args.count(2, Number.MAX_SAFE_INTEGER);
    const parameters = args.all().slice(2);
    let container: string | undefined;
    if (parameters.length >= 2 && parameters[parameters.length - 2] === 'in') {
      container = parameters.pop()!;
      parameters.pop();
    }
    return new CreateCommand(this.editor, args.text(0), args.text(1), parameters, container);
  }
}
