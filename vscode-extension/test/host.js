'use strict';
const assert = require('node:assert/strict');
const vscode = require('vscode');
const { SvgFileDecorations, SvgOutline } = require('../out/src/extension.js');
const fs = require('node:fs');
const path = require('node:path');

function writeResult(status, detail) {
  const file = path.resolve(__dirname, '..', '.vscode-test', 'host-result.json');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ status, detail, time: new Date().toISOString() }, null, 2));
}

module.exports.run = async function () {
  try {
  const workspace = vscode.workspace.workspaceFolders?.[0]?.uri;
  assert.ok(workspace, 'Extension Development Host needs examples/ as its workspace');
  const svg = vscode.Uri.joinPath(workspace, 'example.svg');
  const txt = vscode.Uri.joinPath(workspace, 'ordinary.txt');
  const decorations = new SvgFileDecorations();
  const token = { isCancellationRequested: false };
  assert.equal((await decorations.provideFileDecoration(svg, token))?.badge, '[]');
  assert.equal(await decorations.provideFileDecoration(txt, token), undefined);
  assert.equal(await decorations.provideFileDecoration(workspace, token), undefined);

  const doc = await vscode.workspace.openTextDocument(svg);
  const provider = new SvgOutline();
  const [root] = provider.provideDocumentSymbols(doc, token);
  assert.equal(root.name, 'svg');
  const rect = root.children[0].children[0].children[0];
  assert.equal(rect.name, 'rect#start');
  assert.equal(rect.selectionRange.start.line, 3);
  assert.equal(doc.getText(rect.selectionRange), 'rect');

  // Exercise the provider with a live, unsaved buffer edit. Restore it in finally.
  const editor = await vscode.window.showTextDocument(doc);
  const original = doc.getText();
  try {
    const changed = original.replace('id="start"', 'id="new-id"');
    assert.equal(await editor.edit(edit => edit.replace(new vscode.Range(doc.positionAt(0), doc.positionAt(original.length)), changed)), true);
    assert.equal(provider.provideDocumentSymbols(doc, token)[0].children[0].children[0].children[0].name, 'rect#new-id');
    const invalid = changed.replace('</g>', '');
    assert.equal(await editor.edit(edit => edit.replace(new vscode.Range(doc.positionAt(0), doc.positionAt(doc.getText().length)), invalid)), true);
    assert.deepEqual(provider.provideDocumentSymbols(doc, token), []);
  } finally {
    await editor.edit(edit => edit.replace(new vscode.Range(doc.positionAt(0), doc.positionAt(doc.getText().length)), original));
    assert.equal(doc.getText(), original, 'restored content matches disk; never save it');
  }

  // Queries via VS Code command ensure the native Outline provider is registered.
  const symbols = await vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider', svg);
  assert.ok(symbols.some(s => s.name === 'svg' && s.children.some(g => g.name === 'g#scene')),
    'native symbol command must include nested SVG nodes');
  writeResult('passed', 'actual VS Code host decoration, native symbol command, unsaved edit and malformed XML');
  } catch (error) {
    writeResult('failed', error?.stack || String(error));
    throw error;
  }
};
