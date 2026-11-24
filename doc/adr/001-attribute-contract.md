# ADR 001：属性处理器、冲突与事务

状态：已实现，见 `test/plugin-behavior.test.ts` 与独立 `test/box-plugin.test.ts`。来源：Phase 2 §3。

**问题。** box 的 fill 表示修改内部矩形，label 表示修改内部文本。把 label 写进通用白名单会让内核知道插件语义；只在 Box.set 内处理又缺少独立注册扩展点。

**决定。** `AttributeHandler` 位于 application，带稳定 name、纯 handles(shape, attr) 和 apply(shape, attr, value)。shape 是编辑草稿中的公开 Shape，不暴露实时 Editor 字段。处理器可通过公开 children 和 set 完成子部件操作。零命中回 Phase 1 Shape.set 白名单；一命中执行该处理器；多命中在任何 apply 前报 `ambiguous attribute handler`。handles 的无副作用是实现契约；传入的仍是隔离草稿。

一次 SetCommand 只经一次 `Editor.executeEdit`：复制 → 应用 → 校验 → 一条 EditRecord 提交。即使修改多个部件，也只有一个 undo 单元；apply 部分修改后抛错时丢弃草稿，文档、undo/redo 和保存路径保持原状态，不能转入默认处理掩盖失败。成功后一次 undo/redo 整体恢复。

**取舍。** 拒绝多命中比“第一个获胜”容易发现覆盖冲突，比组合处理器减少隐式顺序。复用既有草稿事务，无第二套历史栈。Box.set 保留历史直接注册 BoxProvider 的兼容行为，正式 BoxPlugin 先走独立 BoxAttributes；内核无 box/fill/label 名称分支。

**验证。** 已运行普通矩形 fill、未知 label、box fill/label、0/1/多命中、部分修改抛错和 redo 分支保留等用例。独立 box 测试只装自己的贡献，并逐项检查注册名、内部传播与类型标签。具体运行次数以后续完整复测记录为准。
