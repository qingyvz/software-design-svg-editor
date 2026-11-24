# ADR 001 — 属性处理器、冲突与事务（当前工作树静态核对；测试待补）

**背景。** `phase_cli_2.md` §3 要求处理器定义 `(图形类型, 属性)` 的领域语义；Phase 1 的 `SetCommand.apply` 直接调用 `shape.set`，而 `Box.set` 内含 fill/label 分支。后者不是 Phase 2 所要求的独立注册接口。单次 `set` 必须可撤销且部分失败不能污染历史。

**决策与现状。** 内核侧定义可独立注册的 `AttributeHandler` (`src/application/AttributeHandler.ts`)，在编辑草稿上先按注册顺序求值纯 `handles(shape, attr)`，**恰好一个**命中才调用 `apply`；多个命中先报冲突，零命中调用原 `shape.set`/白名单规则。`src/application/AttributeHandlers.ts:set` 实现了此分派；`BoxAttributes` 用公开 `Shape`/`Box.children` 和内部子部件的 `set` 修改 fill/label，不直接改私有字段。`handles` 不得修改文档，这是契约，**当前只由开发约定而非副作用检测强制**；`apply` 失败不回退默认属性。`BoxPlugin.activate` 注册稳定名 `box-attributes`。Phase 1 的 `Box.set` 兼容分支仍在 `Box.ts`，并非新接口的唯一实现；装上插件时先走独立 handler。注册名冲突另由加载器拦截。

`SetCommand.apply` → `EditContext.set` → `AttributeHandlers.set` 位于 `Editor.executeEdit` 的副本文档事务内；成功校验后才用一条 `EditRecord` 更新文档与历史。若 apply 在部分修改后抛错，代码路径会丢弃草稿，当前文档及历史没有提交。这是静态分析，仍需以部分修改抛错、随后 `undo/redo` 的测试证明。此项复用 Phase 1 的草稿事务，不另发明第二套历史。

**备选及理由。** “第一个命中者获胜”容易静默遮蔽，组合多个处理器会增加失败回滚与顺序依赖；改内核白名单加入 `label` 破坏开闭原则。拒绝冲突使契约可测试且对第三方插件更安全。

**验证前提。** 最终版本重新核对接口、注册处与 `SetCommand.apply`；测试 0/1/2 个命中者、普通矩形 fill、未知 label、部分修改后异常及 redo 栈原样保留、成功后一次 undo/redo。已读到相关源码，**尚未运行或见到这些针对性用例通过**。
