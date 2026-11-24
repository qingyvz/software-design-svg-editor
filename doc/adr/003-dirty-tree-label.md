# ADR 003 — modified-star 的保存点、祖先与标签顺序（当前工作树静态核对；测试待补）

**背景。** Phase 2 §5 要求 `modified-star` 与 `(box)` 独立共存，禁用时 Phase 1 tree 输出逐字节不变；必须规定创建、保存、undo 回保存点、祖先传播和标签顺序。

**决策与现状。** `*` 表示**当前文档内容与最近一次成功 init/read/save 基线不同**，而非“曾执行编辑命令”。`Editor.init/read/save` 在成功后调用 `TreeDecorators.checkpoint`；修改时不改基线，失败的编辑/save 不走成功后的 checkpoint。`ModifiedStar` 的 `saved` 是**实例字段**，`signature` 包含文档宽高、viewBox、子树顺序、节点 id/tag、属性、文本和子节点。成功 init 后新建应标星，undo 回相同内容后消失，redo 后出现。`label` 对当前子树与保存时同 id 子树做内容比较，子节点变化会反映到祖先容器和根；未变的兄弟理论上不标。保存时 `Editor.save` 仍执行 Phase 1 的 `history.barrier`，星号不会单独改历史，但“保存后 undo 到保存点”的具体会话必须按既有 barrier 语义测试，不能假设 save 后仍可跨 barrier undo。

同一行标签按**注册先后**拼接；`TreeFormatter.suffix` 直接 `map(label).join('')`，约定每个非空标签自行带前导空格，故先注册 `(box)`、再注册 `modified-star` 时，基础行之后依次为 ` (box) *`。零个标签返回原行；`Editor.tree` 先 `inspect` 得到一份文档快照，同一次树渲染共享它。若装饰器抛错，调用方如何显示错误须实测。

**备选及理由。** “发生过编辑即脏”实现简单，但 undo 到保存点后仍带星，且给读者的语义不直观；仅标直接修改节点容易看不到折叠容器内的变更。采用内容差异与祖先传播，但大型树比较的代价应测量，后续可用内容哈希增量优化，不能牺牲正确性。

**验证前提。** 测试新建、编辑→保存→再编辑→undo→redo（考虑 `save` 的历史屏障）、失败保存与失败编辑、祖先/兄弟、0/1/2 装饰器及交换顺序。`ModifiedStar.signature` 当前使用属性 Map 的遍历顺序比较，须检查“值相同但属性插入顺序变化”会否造成误标；性能和注册时的 `checkpoint` 亦须验证。最终若选择另一种题目允许的语义，应先改 ADR，再用代码与测试证明。此处只完成静态核对。
