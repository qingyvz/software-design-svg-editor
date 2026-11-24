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

## Independent review round 1 and corrections

The independent reviewer graded the frozen candidate f2ebe24 with the unchanged assignment-level rubric: 96.25/100 confirmed, 1.75 deducted across six defects, and 2.00 explicitly pending the final p2 report and remote release. This is not a teacher grade. The full report and counterexamples are retained in assignment references/reviews/round1.md and draft/review-round1.

Added eight persistent regression cases before the fixes: seven failed and one positive multi-part set case passed (review-regressions-red.txt). Causes and corrections:
- Box.set's old compatibility override bypassed an absent AttributeHandler. Remove that override; only the handler propagates label/fill. The original whitelist and redo branch now remain intact when the handler is removed.
- Runtime checkpoint exceptions occurred after successful IO/state changes, so a command misleadingly reported failure. Checkpoints now isolate, warn and remove the failing decorator while continuing healthy decorators; init/read/save keep their actual successful result and IO barrier. Registration-time failure still rolls back installation.
- require.resolve selected require exports before dynamic import. Bare-package resolution now uses locked import-meta-resolve 4.2.0 from the configuration directory and selects import conditions; tests compare import-only and dual-condition packages with the same Node's ordinary import.
- Same-parent front/back called remove and hit required-part protection. Generic optional container reorder adjusts order without detaching; undo/redo and deletion protection are both asserted.
- VSCode providers shared one class file. Split the two classes, keep composition in extension.ts, and include extension source in the architecture check.
- New clones have origin/* proof refs rather than local demonstration branches. The transcript verifier accepts both; the documented worktree command explicitly uses origin/phase2/box-config-demo.

The user authorized this review/optimization loop. Causes were explained before fixing; the rubric was not weakened or rewritten. Full root check: 86/86, zero failures/skips; extension: 7/7. Logs are preserved under doc/evidence/tests. An isolated real desktop VSCode host was rerun after the split: four native screenshots, source-line navigation, live update, malformed input, recovery and unchanged disk hash passed. All four screenshots were visually inspected again: sidebar/editor proportions remain about 24%/76%, labels and source are readable, with no overlap or clipped acceptance information. Every extension source hash is now recorded in the host trace.

No p2 tag is created until the revised code passes the next independent review. Formal Canvas submission remains a separate approval.

## Independent review round 2 and loader boundaries

The frozen 94b28b0 candidate received 97.50/100 confirmed, 0.50 deducted only in D3, and 2.00 pending final release. The original six defects passed expanded independent probes. The reviewer found two further loader boundaries: an exports resolver may return a missing entry URL, and skipping every configuration directory's package.json bypasses a plugin's own manifest when the configuration lives there.

Added four persistent cases first. The regression file ran 12 cases: 9 passed, 3 failed (missing file, ENOTDIR, and package-root manifest conflict); outside-package and existing positive controls passed. The red log is retained as review-round3-red.txt. Corrections: stat only the top-level resolved entry before importing, classify ENOENT/ENOTDIR there as not found, and leave import/dependency/evaluation failures in the loading catch. Package metadata discovery now excludes only the actual host package, independently of configuration location.

The clean clone also exposed three CRLF working-tree files that Git had normalized to LF. Code was equivalent and screenshots identical, but the bytes in the host trace differed from published Git blobs. Normalize those working files under the existing .gitattributes rule and rerun the actual host; verify every source hash against Git's canonical file bytes. Do not call normalization equivalence byte identity.

Full root regression after these fixes: 90/90, no failures/skips; extension 7/7. The fixed rubric is unchanged. The next independent review checks these boundaries and the complete rubric again before creating p2.

## Independent review round 3 and explicit metadata presence

The frozen d518c98 candidate received 97.75/100 confirmed and 2.00 pending release. The only independently confirmed deduction was the shared explicit-null/absence distinction in D3: 50 expanded probes produced 42 passes and 8 triggers of that one semantic defect. Other loader paths, rollback, continuation, canonical source hashes, extension tests and transcripts passed.

Root additionally reproduced direct .mjs loading with a malformed nearby package.json: metadata parsing failure silently fell back to a valid instance declaration. This was an observed root probe, not attributed to the independent reviewer.

While the main candidate remained frozen for the written report, the dedicated AI-owned clean clone received 12 persistent regressions. Its review file first produced 12 passes / 12 failures; the raw red log records that isolated path. The cases cover six package-null location/entry combinations, module-null versus absent source, four null-category/omission controls, and malformed/non-object JSON metadata. The loader now preserves field presence in a small value wrapper and never substitutes another manifest for an explicitly provided invalid one. The shared installer rejects null category lists; only absent/undefined category values mean empty. Package metadata errors propagate unless the file is absent (ENOENT), and an existing package file must parse to an object.

After the report was saved, copy only those three reviewed source/test changes into the main candidate and rerun. Both isolated and main checks passed 102/102, no failures/skips; architecture 266 relative imports. Seven byte comparisons passed again. Extension production/test sources are unchanged from d518c98, whose 7 tests and real desktop evidence already passed; every production source hash still matches Git exactly. No extra GUI behavior was changed. The fixed rubric and all old review reports remain unchanged. Final tag/release is still withheld until the next independent review.

## Independent review round 4 and native ESM resolution

The frozen 956f401 candidate received 97.50/100 confirmed and 2.00 pending release. Null and malformed metadata corrections passed independently. The only deduction was D2: an external resolver's fixed node/import conditions disagreed with this Node 22.14 runtime's default module-sync and node-addons conditions. The reviewer expanded to 92 probes: 90 passed, two native-import comparisons failed. No p2 was released.

Root prepared eight public Loader/native import comparisons in the dedicated clone. The review file ran 32 cases with 26 passes / 6 failures before the change: the default cases and custom conditions selected the wrong entry, while disabled-condition controls passed. Replaced the approximation with a host ModuleResolver adapter and a separate NodeResolveWorker.ts entry, using the same process.execPath and native import.meta.resolve with the configuration parent. Relevant engine flags and NODE_OPTIONS preserve the actual conditions; only the worker needs the parent-parameter experimental flag. It resolves without evaluating plugin code. Remove import-meta-resolve from both locked manifests. The worker is compiled source with its branches included in metrics, not hidden eval code.

After the fourth report was saved, main adopted the verified source and lock changes, ran npm ci and the full suite: 110/110, no failures/skips, 269 relative imports. The isolated clone also passed 110/110. Seven transcript byte comparisons passed again. VSCode sources/tests and canonical screenshot evidence are unchanged. Update the architecture and responsibility map for the three host resolver files; keep old review reports and the fixed rubric untouched. The next independent audit still precedes the immutable final tag.
