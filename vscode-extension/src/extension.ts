import * as vscode from 'vscode';
import { SvgFileDecorations } from './SvgFileDecorations';
import { SvgOutline } from './SvgOutline';
export { SvgFileDecorations, SvgOutline };
export { isSvgName } from './svgFiles';

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(vscode.window.registerFileDecorationProvider(new SvgFileDecorations()));
  context.subscriptions.push(vscode.languages.registerDocumentSymbolProvider(
    // Filename suffix is checked in provideDocumentSymbols; the glob includes mixed-case .Svg.
    { scheme: 'file', pattern: '**/*' },
    new SvgOutline(),
  ));
}

export function deactivate(): void { /* context disposes the two providers */ }
