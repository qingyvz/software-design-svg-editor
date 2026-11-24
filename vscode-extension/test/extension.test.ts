import assert from 'node:assert/strict';
import { test } from 'node:test';
import Module from 'node:module';

// Node-level tests isolate the VS Code API boundary; test:host exercises actual VS Code.
const vscode = {
  FileType: { File: 1, Directory: 2 },
  FileDecoration: class {
    constructor(readonly badge: string, readonly tooltip: string, readonly color: unknown) {}
  },
  ThemeColor: class { constructor(readonly id: string) {} },
  SymbolKind: { Object: 18 },
  Range: class {
    constructor(readonly start: number, readonly end: number) {}
  },
  DocumentSymbol: class {
    children: unknown[] = [];
    constructor(
      readonly name: string,
      readonly detail: string,
      readonly kind: number,
      readonly range: { start: number; end: number },
      readonly selectionRange: { start: number; end: number },
    ) {}
  },
  workspace: { fs: { stat: async (_uri: unknown): Promise<{ type: number }> => ({ type: 1 }) } },
  window: { registerFileDecorationProvider: (_provider: unknown) => ({ dispose() {} }) },
  languages: { registerDocumentSymbolProvider: (_selector: unknown, _provider: unknown) => ({ dispose() {} }) },
};

// The extension depends on the host-provided 'vscode' module, absent under plain node.
const originalLoad = (Module as unknown as { _load: (request: string, parent: unknown, main: boolean) => unknown })._load;
const loader = Module as unknown as { _load: typeof originalLoad };
loader._load = function (request, parent, main) {
  if (request === 'vscode') return vscode;
  return originalLoad.call(this, request, parent, main);
};
const { SvgFileDecorations, SvgOutline, activate } = require('../src/extension') as typeof import('../src/extension');
loader._load = originalLoad;

const active = { isCancellationRequested: false };
const uri = (path: string) => ({ path, scheme: 'file' });

test('SVG-only Explorer badge, excludes directories with .svg name; no write or rename', async () => {
  let fileType = vscode.FileType.File;
  let statCalls = 0;
  const fs = vscode.workspace.fs;
  const saved = fs.stat;
  fs.stat = async () => { statCalls++; return { type: fileType }; };
  try {
    const provider = new SvgFileDecorations();
    assert.equal((await provider.provideFileDecoration(uri('/a.svg') as never, active as never))?.badge, '[]');
    assert.equal((await provider.provideFileDecoration(uri('/a.SvG') as never, active as never))?.badge, '[]');
    assert.equal(await provider.provideFileDecoration(uri('/a.txt') as never, active as never), undefined);
    assert.equal(await provider.provideFileDecoration(uri('/dir') as never, active as never), undefined);
    assert.equal(statCalls, 2, 'non-svg paths never trigger IO');
    fileType = vscode.FileType.Directory;
    assert.equal(await provider.provideFileDecoration(uri('/dir.svg') as never, active as never), undefined);
    fs.stat = async () => { throw new Error('file vanished'); };
    assert.equal(await provider.provideFileDecoration(uri('/deleted.svg') as never, active as never), undefined);
    assert.equal(await provider.provideFileDecoration(uri('/a.svg') as never, { isCancellationRequested: true } as never), undefined);
  } finally { fs.stat = saved; }
});

test('Outline provider maps live document to nested native symbols and exact selection ranges', () => {
  let text = '<svg>\n  <g id="g">\n    <rect id="start"/>\n    <text/>\n  </g>\n</svg>';
  const document = { uri: uri('/example.svg'), getText: () => text, positionAt: (offset: number) => offset };
  const provider = new SvgOutline();
  const root = provider.provideDocumentSymbols(document as never, active as never)?.[0] as unknown as InstanceType<typeof vscode.DocumentSymbol>;
  assert.equal(root.name, 'svg');
  const group = root.children[0] as InstanceType<typeof vscode.DocumentSymbol>;
  assert.equal(group.name, 'g#g');
  const rectangle = group.children[0] as InstanceType<typeof vscode.DocumentSymbol>;
  assert.equal(rectangle.name, 'rect#start');
  assert.equal(text.slice(rectangle.selectionRange.start, rectangle.selectionRange.end), 'rect');
  assert.equal(text.slice(rectangle.range.start, rectangle.range.end), '<rect id="start"/>');
  assert.equal((group.children[1] as InstanceType<typeof vscode.DocumentSymbol>).name, 'text');
  text = '<svg><rect id="changed"/></svg>';
  assert.equal(provider.provideDocumentSymbols(document as never, active as never)?.[0]?.children[0]?.name, 'rect#changed');
  text = '<svg><rect';
  assert.deepEqual(provider.provideDocumentSymbols(document as never, active as never), []);
  assert.equal(provider.provideDocumentSymbols({ ...document, uri: uri('/plain.xml') } as never, active as never), undefined);
});

test('activate registers both host providers and saves disposables', () => {
  const subscriptions: unknown[] = [];
  activate({ subscriptions } as never);
  assert.equal(subscriptions.length, 2);
});
