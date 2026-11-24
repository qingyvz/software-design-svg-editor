import * as vscode from 'vscode';
import { parseSvgSymbols, SvgSymbol } from './svgSymbols';

export function isSvgName(uri: vscode.Uri): boolean {
  return uri.path.toLowerCase().endsWith('.svg');
}

/** Explorer decorations are UI metadata, not edits or changes to the actual filename. */
export class SvgFileDecorations implements vscode.FileDecorationProvider {
  async provideFileDecoration(uri: vscode.Uri, token: vscode.CancellationToken): Promise<vscode.FileDecoration | undefined> {
    if (token.isCancellationRequested || uri.scheme !== 'file' || !isSvgName(uri)) return undefined;
    try {
      const stat = await vscode.workspace.fs.stat(uri);
      if (token.isCancellationRequested || !(stat.type & vscode.FileType.File)) return undefined;
      return new vscode.FileDecoration('[]', 'SVG file', new vscode.ThemeColor('list.highlightForeground'));
    } catch {
      // A virtual, removed or inaccessible entry is not assumed to be a file.
      return undefined;
    }
  }
}

function toDocumentSymbol(document: vscode.TextDocument, item: SvgSymbol): vscode.DocumentSymbol {
  const symbol = new vscode.DocumentSymbol(
    item.name,
    '',
    vscode.SymbolKind.Object,
    new vscode.Range(document.positionAt(item.start), document.positionAt(item.end)),
    new vscode.Range(document.positionAt(item.selectionStart), document.positionAt(item.selectionEnd)),
  );
  symbol.children = item.children.map(child => toDocumentSymbol(document, child));
  return symbol;
}

export class SvgOutline implements vscode.DocumentSymbolProvider {
  provideDocumentSymbols(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.DocumentSymbol[] | undefined {
    if (token.isCancellationRequested || document.uri.scheme !== 'file' || !isSvgName(document.uri)) return undefined;
    const symbols = parseSvgSymbols(document.getText());
    // Other providers (notably the built-in XML extension) can run for .svg as well.
    // For invalid input our empty result remains authoritative for this provider.
    return symbols.map(item => toDocumentSymbol(document, item));
  }
}

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(vscode.window.registerFileDecorationProvider(new SvgFileDecorations()));
  context.subscriptions.push(vscode.languages.registerDocumentSymbolProvider(
    // Filename suffix is checked in provideDocumentSymbols; the glob includes mixed-case .Svg.
    { scheme: 'file', pattern: '**/*' },
    new SvgOutline(),
  ));
}

export function deactivate(): void { /* context disposes the two providers */ }
