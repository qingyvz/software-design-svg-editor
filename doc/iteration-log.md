# Phase 2 iteration log

## Starting point (2026-11-25)

The working directory already contained an uncommitted Phase 2 CLI, plugin loader, extension and documentation when this continuation began. Its original development commits are unavailable. The first two commits record that inherited state honestly; they are snapshots, not a claim that its earlier implementation happened in those commits.

Baseline: final / cc58143fde0867fe6a8587c0d707ed35ac015ce2. Existing tags remain unchanged. CLI: npm run check, 72 passed, 0 failed, architecture check 263 imports. Extension: npm test, 7 passed, 0 failed. Both suites were rerun on 2026-11-25 with Node 22.14.0 / npm 10.9.2 before changes.

Identified gaps: default shape providers are assembled inside the domain factory; real Explorer/Outline screenshots are absent; independent A/B plugin introduction commits and final p2 metrics are not yet present. These are work to complete, not accepted results. Canvas submission requires separate approval.

Subsequent entries record actual changes, checks and independent review results. The evaluation scale is the assignment-level file `评分标准-课程资料对照版.md` and the immutable phase_cli_2.md source.
## Host composition and command ports

Moved six default provider registrations out of ShapeFactory into host/DefaultShapes. Editor, SvgCodec and NodeDocumentStore now require explicitly supplied dependencies; test-only Fixtures performs test composition. CommandReceiver is the public application contract, DocumentQuery is the read-only view, StatsCommand accepts only DocumentQuery and DirCommand has no editor dependency. Added empty-kernel/default-host and query-only/filesystem-only probes. npm run check: 74 passed, 0 failed, 266 relative imports checked. CLI syntax and output remain unchanged; full final transcript comparison follows after package boundaries settle.
