# SVG Explorer Badge and Outline (VS Code)

This is the **A.1–A.3** extension, separate from the Phase 1/2 CLI. It does not edit SVG files.

## Build and run

Requires Node 22+, npm and VS Code 1.96+. From `vscode-extension/`:

```sh
npm ci
npm test
```

Open this directory in VS Code; run **Terminal → Run Task… → Build SVG extension** (or `npm run build`), then press **F5** to launch the Extension Development Host. In that host, open the `examples/` directory. Explorer should show `[]` beside `example.svg`, not `ordinary.txt` or the `examples` directory. Use **Open With... -> Text Editor** for `example.svg` (SVG may default to an image preview). This shows the built-in **Outline** view: `svg → g#scene → g#group → rect#start, text`. Click `rect#start` to jump to its opening tag on line 4. Change its `id` and confirm the Outline updates; temporarily delete `</g>` to confirm an incomplete edit does not crash the host (the Outline may become empty), then restore it.

`npm run test:host` runs API tests in an installed **desktop** VS Code host, with isolated profile/extension directories **inside this package**. On Windows it expects `C:\Program Files\Microsoft VS Code\Code.exe`; if installed elsewhere, set `VSCODE_EXE` to the actual executable path. It writes `.vscode-test/host-result.json` and fails if the host did not execute the test hook. It is **not** a visual screenshot test. It uses no downloaded VS Code binary. The host may log an existing-instance mutex warning even while the test assertions succeed; rely on the explicit result file plus process exit, not the warning alone.

## Design and responsibility split

VS Code owns Explorer, Outline, editor navigation and document-change notifications. The extension registers a `FileDecorationProvider` and `DocumentSymbolProvider` on activation; VS Code calls them with the file URI or the *current* in-memory document text. File decoration first checks the `.svg` suffix then asynchronously checks `workspace.fs.stat` so even a directory named `foo.svg` is not marked. It returns a two-character badge; it never renames or writes the file. XML parsing rejects malformed intermediate input and the symbol provider returns an empty array instead of throwing. The lexical scan maps DOM elements to exact opening and closing tag offsets; `selectionRange` is the start tag name, and `range` is the entire element. No explicit file-change watcher or disk re-read is needed for Outline updates.

This is **decoration of a view**, analogous to the visible result of the classic Decorator pattern, but it is not the GoF wrapper structure: no Explorer node object is wrapped and no base component operation is forwarded. VS Code composes the visual metadata from providers. The provider objects adapt URI/text/DOM data to VS Code's `FileDecoration` and `DocumentSymbol` interfaces (an adapter at the API boundary), but the decoration itself does not implement an Adapter around an existing Explorer node either. Registering through VS Code's API is inversion of control: the host calls the extension, not the extension drawing Explorer/Outline directly.

Phase 1 `SvgCodec` uses `@xmldom/xmldom` and its **XML parsing strategy can be reused**; here the same parser dependency validates XML. The CLI's `SvgDocument`, `ShapeFactory` and shape traversal **cannot be reused for the Outline** without losing information: loading assigns IDs to unnamed shapes, rejects many legal SVG tags/attributes and unsupported transforms, and has no raw source ranges. The editor must display arbitrary well-formed SVG structure with original missing IDs and selection offsets. We therefore keep a small read-only DOM traversal and source-location scan in this package. Replacing the CLI importer would also risk changing Phase 1 semantics; this extension does not import it.

## Actual evidence and reproduction

Fresh Node tests cover nested/unnamed elements, exact ranges, edits, malformed XML and file exclusions. The actual desktop host was also checked on 2026-11-25: VS Code 1.122.0, native Outline click to source line 4, live ID update, incomplete XML empty Outline, recovery and unchanged disk SHA256. See [screenshots and layout analysis](../doc/README.md) and [host trace](../doc/evidence/vscode/host-verification.json).

For normal use, build, press F5, open examples/example.svg **as Text Editor**, expand native Outline and click rect#start. If no Outline appears, first check that the tab is a text editor, this development extension is enabled and compilation succeeded. Restore incomplete text to recover symbols. The assets.svg directory and ordinary.txt file must remain unmarked.

The Windows visual verification helper uses its own profile, its own test window and loopback-only DevTools. It does not require browser extensions or global npm packages. After npm ci and npm run build, from this package:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Start-VisualHost.ps1
node scripts/verify-visual.mjs
```

Set VSCODE_EXE when Code.exe is installed elsewhere. If port 9338 is occupied, reuse this task's running host or choose an unused port consistently; do not attach to an unrelated process. The helper restores all unsaved edits, confirms the SVG disk hash and exits only its isolated host. It fails on a missing executable, absent provider, incorrect navigation or failed edit/recovery. Runtime profiles and logs are test-only artifacts; screenshots and the verified trace are retained under doc/evidence/vscode.

The helper fixes its own editor association, theme and pane layout for readable evidence. These settings are not extension behavior or user-global configuration. Native Electron renders the screenshots; no substitute UI is drawn. The first draft's image preview and cramped secondary sidebar were rejected during inspection and replaced by the final source/Outline layout.
