import type { Uri } from 'vscode';

/** Shared, pure filename policy for the two VSCode adapters. */
export function isSvgName(uri: Uri): boolean {
  return uri.path.toLowerCase().endsWith('.svg');
}
