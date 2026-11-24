import * as vscode from 'vscode';
import { parseSvgSymbols, type SvgSymbol } from './svgSymbols';
import { isSvgName } from './svgFiles';

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
