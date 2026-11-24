'use strict';
const vscode = require('vscode');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { SvgFileDecorations } = require('../out/src/extension.js');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
module.exports.run = async function () {
  const directory = process.env.P2_VISUAL_DIR;
  if (!directory) throw new Error('P2_VISUAL_DIR is required');
  fs.mkdirSync(directory, { recursive: true });
  const statePath = path.join(directory, 'state.json');
  const requestPath = path.join(directory, 'request.json');
  const workspace = vscode.workspace.workspaceFolders?.[0]?.uri;
  assert.ok(workspace);
  const uri = vscode.Uri.joinPath(workspace, 'example.svg');
  const original = fs.readFileSync(uri.fsPath);
  const sha = value => crypto.createHash('sha256').update(value).digest('hex');
  const extension = vscode.extensions.all.find(item => item.packageJSON.name === 'svg-explorer-outline');
  assert.ok(extension, 'actual development extension must be installed');
  await extension.activate();
  const provider = new SvgFileDecorations();
  const token = { isCancellationRequested: false };
  assert.equal((await provider.provideFileDecoration(uri, token))?.badge, '[]');
  assert.equal(await provider.provideFileDecoration(vscode.Uri.joinPath(workspace, 'ordinary.txt'), token), undefined);
  assert.equal(await provider.provideFileDecoration(vscode.Uri.joinPath(workspace, 'assets.svg'), token), undefined);
  await vscode.commands.executeCommand('workbench.action.closeAuxiliaryBar');
  await vscode.commands.executeCommand('notifications.clearAll');
  await vscode.commands.executeCommand('vscode.openWith', uri, 'default');
  const document = await vscode.workspace.openTextDocument(uri);
  const editor = await vscode.window.showTextDocument(document, { preview: false, preserveFocus: true });
  await vscode.commands.executeCommand('workbench.action.files.revert');
  await vscode.commands.executeCommand('workbench.view.explorer');
  await vscode.commands.executeCommand('outline.focus');
  await vscode.commands.executeCommand('outline.expand');
  for (let n = 0; n < 4; n++) await vscode.commands.executeCommand('workbench.action.increaseViewHeight');
  const symbols = async () => (await vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider', uri)) ?? [];
  const names = values => values.flatMap(item => [item.name, ...names(item.children || [])]);
  const waitFor = async expected => {
    for (let n = 0; n < 40; n++) {
      const current = await symbols();
      if (expected === null ? current.length === 0 : names(current).includes(expected)) return current;
      await delay(100);
    }
    throw new Error('Native Outline did not reach: ' + expected);
  };
  await waitFor('rect#start');
  const history = [];
  let lastId = null;
  const report = (status, extra = {}) => {
    const currentEditor = vscode.window.activeTextEditor;
    const selection = currentEditor?.selection;
    fs.writeFileSync(statePath, JSON.stringify({
      status, version: vscode.version, node: process.version,
      phase: document.getText() === original.toString('utf8') ? 'original' : 'edited',
      lastRequestId: lastId,
      selectionLine: selection ? selection.active.line + 1 : null,
      selectionColumn: selection ? selection.active.character + 1 : null,
      selectedText: selection && currentEditor ? currentEditor.document.getText(selection) : '',
      originalSha256: sha(original), diskSha256: sha(fs.readFileSync(uri.fsPath)),
      history, ...extra,
    }, null, 2));
  };
  report('ready', { symbols: names(await symbols()), decorationChecks: ['svg []', 'ordinary unmarked', 'directory.svg unmarked'] });
  try {
    for (;;) {
      if (!fs.existsSync(requestPath)) { await delay(100); continue; }
      let request;
      try { request = JSON.parse(fs.readFileSync(requestPath, 'utf8')); } catch { await delay(100); continue; }
      if (request.id === lastId) { await delay(100); continue; }
      lastId = request.id;
      if (request.action === 'change') {
        await editor.edit(edit => edit.replace(new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)), original.toString('utf8').replace('id="start"', 'id="updated-start"')));
        await waitFor('rect#updated-start');
      } else if (request.action === 'invalid') {
        await editor.edit(edit => edit.replace(new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)), '<svg><g><rect'));
        await waitFor(null);
      } else if (request.action === 'restore' || request.action === 'finish' || request.action === 'abort') {
        await vscode.window.showTextDocument(document, { preview: false, preserveFocus: true });
        await vscode.commands.executeCommand('workbench.action.files.revert');
        await waitFor('rect#start');
      } else if (request.action === 'expand') {
        await vscode.commands.executeCommand('outline.focus');
        await vscode.commands.executeCommand('outline.expand');
      } else if (request.action !== 'status') {
        throw new Error('Unknown visual request: ' + request.action);
      }
      assert.equal(sha(fs.readFileSync(uri.fsPath)), sha(original), 'visual test must not change the SVG on disk');
      history.push({ action: request.action, symbols: names(await symbols()), selectionLine: vscode.window.activeTextEditor ? vscode.window.activeTextEditor.selection.active.line + 1 : null, selectedText: vscode.window.activeTextEditor ? vscode.window.activeTextEditor.document.getText(vscode.window.activeTextEditor.selection) : '', time: new Date().toISOString() });
      if (request.action === 'finish') {
        assert.ok(history.some(item => item.action === 'status' && item.selectionLine === 4), 'native Outline click must navigate to line 4');
        for (const name of ['change', 'invalid', 'restore']) assert.ok(history.some(item => item.action === name), name + ' phase required');
      }
      report(request.action === 'finish' ? 'passed' : request.action === 'abort' ? 'aborted' : 'ready', { symbols: names(await symbols()) });
      if (request.action === 'finish' || request.action === 'abort') return;
    }
  } catch (error) {
    try {
      await vscode.window.showTextDocument(document, { preview: false, preserveFocus: true });
      await vscode.commands.executeCommand('workbench.action.files.revert');
    } catch { /* keep the original failure; no disk writes were made */ }
    report('failed', { error: error.stack || String(error) });
    throw error;
  }
};
