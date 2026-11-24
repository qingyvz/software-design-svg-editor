# Phase 2 iteration log

## Starting point (2026-11-25)

The working directory already contained an uncommitted Phase 2 CLI, plugin loader, extension and documentation when this continuation began. Its original development commits are unavailable. The first two commits record that inherited state honestly; they are snapshots, not a claim that its earlier implementation happened in those commits.

Baseline: final / cc58143fde0867fe6a8587c0d707ed35ac015ce2. Existing tags remain unchanged. CLI: npm run check, 72 passed, 0 failed, architecture check 263 imports. Extension: npm test, 7 passed, 0 failed. Both suites were rerun on 2026-11-25 with Node 22.14.0 / npm 10.9.2 before changes.

Identified gaps: default shape providers are assembled inside the domain factory; real Explorer/Outline screenshots are absent; independent A/B plugin introduction commits and final p2 metrics are not yet present. These are work to complete, not accepted results. Canvas submission requires separate approval.

Subsequent entries record actual changes, checks and independent review results. The evaluation scale is the assignment-level file `评分标准-课程资料对照版.md` and the immutable phase_cli_2.md source.
## Host composition and command ports

Moved six default provider registrations out of ShapeFactory into host/DefaultShapes. Editor, SvgCodec and NodeDocumentStore now require explicitly supplied dependencies; test-only Fixtures performs test composition. CommandReceiver is the public application contract, DocumentQuery is the read-only view, StatsCommand accepts only DocumentQuery and DirCommand has no editor dependency. Added empty-kernel/default-host and query-only/filesystem-only probes. npm run check: 74 passed, 0 failed, 266 relative imports checked. CLI syntax and output remain unchanged; full final transcript comparison follows after package boundaries settle.


## Independent package framework milestone

Stats, dir and modified-star now have independent package.json contributes declarations. A generic build copies their metadata and cleans only the checked repository build directory, preventing stale JS from hiding removed plugins. For the OCP experiment, the historical optional box implementation is temporarily a test fixture, not runtime code. The runtime milestone intentionally has no box. 72 tests pass; two CLI box/composition integration cases are explicitly deferred at this milestone and will run again on the complete candidate. This is an experimental baseline, not a release or a full-score claim. Next, box is reintroduced as a new independent runtime package in two real branches.


## A: reintroduce box by code assembly

From the box-free independent-package milestone, add src/plugins/box (provider, composite, attribute handler, type label, default export and package manifest). Runtime changes outside that new package are limited to src/Main.ts. Historical test fixtures move back into the new runtime package; all box CLI cases run again. Test configuration is generated outside its fixed cwd so code/config plugin sets match without changing another runtime file in this proof commit.

## Combine both composition modes for delivery

Retain both immutable demonstration branches. The delivery branch keeps A's code assembly and adds the configuration from B, so both supported entry points activate the same four packages. A and B remain separate historical experiments; their per-commit source diffs are not replaced by this combined delivery state.


## Semantic dirty regression and standalone plugin tests

Added one independently runnable test file per optional plugin. Each imports only its own optional package and public kernel/test assembly. A reordered Map with identical geometry/style reproduced a false star (expected empty suffix, actual ` *`); the failing run is preserved in doc/evidence/tests/star-before-fix.txt. Sort attributes by key inside the star signature; child ordering remains significant. This is a defect fix, not a claim that adding tests alone proves correctness.

Actual VS Code 1.122.0 visual validation now records Explorer badge exclusions, native Outline clicks to source line 4, unsaved ID update, malformed XML empty Outline, recovery and unchanged disk hash. The first image-preview screenshot was rejected; text-editor selection, auxiliary-bar closure and native pane collapse corrected the evidence layout. The auxiliary script also had to normalize an undefined native-symbol response to an empty list; this was a test-hook failure, not an extension crash.
