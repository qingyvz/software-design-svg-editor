import * as vscode from 'vscode';
import { isSvgName } from './svgFiles';

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
