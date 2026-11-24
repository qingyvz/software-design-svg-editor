# ADR 003：dirty、祖先传播与标签顺序

状态：已实现，属性顺序反例已按先失败后修复流程验证。来源：Phase 2 §5。

**决定。** 星号表示当前内容与最近一次成功 init/read/save 基线不同。基线保存在 ModifiedStar 实例字段，失败 IO 不更新。成功 init 后新增节点立刻有星；undo 回到保存点时消失、redo 再现。save 仍维持 Phase 1 的 IO 历史屏障，不能跨该屏障撤销保存前的编辑。

签名包含画布尺寸／viewBox、节点 id/tag、文本、属性值和有序子树。属性集合按键排序后比较，属性插入顺序不属于内容差异；子图形顺序影响绘制层次，仍保留顺序比较。子树变化向祖先容器与根传播，未变化兄弟不标星。两个实例的 checkpoint 完全独立。

运行期 init/read/save 的 IO 完成后，checkpoint 逐个隔离执行。某标签抛错时，输出含名称和原因的 warning，移除该标签并继续其他标签；成功 IO 仍报告成功，其实际文档、文件与历史屏障保持一致。保存已写到磁盘，不能因为展示插件失败而谎报保存失败。注册时的初始 checkpoint 若抛错，仍由安装事务撤销该插件的全部贡献。label/handles 属只读契约，渲染错误由命令边界报告，不提交编辑。

多个标签按注册顺序拼接，各自返回带前导空格的后缀。默认先 box-type-label 后 modified-star，显示 ` (box) *`；两者互不引用。渲染器仅遍历扩展点数组，没有具体标签分支。没有装饰器时原 tree 字节不变。

**取舍。** “曾编辑就标星”不能反映 undo 回保存点；仅直接节点标星不利于查看折叠子树。内容快照和递归签名更直观，代价是大图纸多次比较开销；增量哈希是后续优化，不为本作业预造额外框架。

**验证。** 已执行新建、编辑→保存→再编辑→undo／redo、失败保存、失败读入、祖先／兄弟和多标签测试。`star-plugin.test.ts` 只导入 star 包，首先复现同值属性 Map 顺序不同导致误标，失败日志见 doc/evidence/tests/star-before-fix.txt；排序修正后全量回归通过。无标签与 final 的基本会话逐字节一致，见 evidence/transcripts/summary.json。`review-regressions.test.ts` 分别对 init/read/save 注入运行期 checkpoint 故障，核验 warning、隔离、健康标签继续、正确文档／文件、历史屏障与后续可用性。
