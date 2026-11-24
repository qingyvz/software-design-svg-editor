# B: configuration-only box introduction

Parent is the box-free independent-package milestone de82fe9. This branch adds exactly the same src/plugins/box package as the A experiment. Existing runtime source, including Main.ts, the kernel, loader and previous plugins, is unchanged; only plugins.config.json selects the new package. Test fixtures are migrated to the real package.

The branch intentionally does not add code-based box activation or the --box convenience flag: those would violate the B experiment. Its default/code-composed runtime retains three optional plugins. For box use --config plugins.config.json. Two A-entry-specific CLI tests are excluded in this demonstration branch; cross-branch transcript comparison is the actual A/B acceptance check. The final delivery combines A and the configuration, where all tests run without skips.
