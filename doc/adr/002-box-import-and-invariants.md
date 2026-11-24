# ADR 002 — box 读回降级与内部不变量（当前工作树静态核对；测试待补）

**背景。** `phase_cli_1.md` §4.4 和 `phase_cli_2.md` §4 要求 `box` 用 `data-kind="box"` 标记，缺插件时按普通 `g` 读回；装插件时绝不生成缺部件的 Box。Phase 1 `ShapeFactory.fromSvg` 在找不到专用 key 时回退普通 `g`，`BoxProvider.fromSvg` 已检测两个必要部件；**Phase 1 的** `SvgDocument.delete/addTo` 未锁定部件。当前未提交工作树新增 `ShapeContainer.assertCanDetach`、`Box.assertCanDetach`，并从 `delete/group/addTo` 调用该钩子。

**决策。** id 派生为 `<boxId>-rect`、`<boxId>-label`；`SvgDocument.add` 扫描整棵新增子树与现有 id 集，`SvgCodec.decode` 预扫显式 id 并在读入后 `assertValid`。重复 id 必须拒绝全篇，不能靠降级消除。已安装插件时 `BoxProvider.fromSvg` 对缺失／类型不符的直系必要部件抛错，选择**拒绝整个读入**而非悄悄降级；未装插件时 `ShapeFactory.fromSvg` 对 `g data-kind="box"` 选择通用 `g`，保留子树但不保留特殊语义。当前 `Box.assertCanDetach` 对必要子 id 拒绝脱离；`SvgDocument.delete/group/addTo` 在变更前调用钩子，`Editor.executeEdit` 的草稿失败不提交。重排同父节点没有脱离钩子（`reorder` 删除又加回同父），移动整个 box、添加别的子节点与嵌套 box 在设计上允许，仍须通过实际测试。

**实现复核提醒。** 上述路径已静态读到，不等于所有失败路径通过；还应检查非法内容是否能从别的公开接口创建/传播，以及 `Box.clone`、`SvgCodec.encode/decode` 后不变量是否成立。`SvgDocument.assertValid` 本身只做 id/身份重复检查，并不完整校验 Box 结构；不能将它误称为全局 box 验证器。

**备选及理由。** 坏结构降级为 `g` 可以更宽容，却容易在已安装插件的场景悄悄掩盖数据损坏；因此只对“缺插件”降级。只在 `Box.set` 时检查会使坏 box 在其他命令和保存时存活，故须在结构编辑边界／文档校验施加可扩展的不变量契约，而非在内核按 `box` 名称分支。

**验证前提。** 测试缺插件读回、已安装时坏部件/错类型、重复 id 的整文拒绝、创建 id 冲突、删除/移走必要部件后可继续 undo/redo、合法嵌套。比较最终代码与本决策；**未见本轮实际执行结果**。
