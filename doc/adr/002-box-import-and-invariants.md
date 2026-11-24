# ADR 002：box 读回降级与组成不变量

状态：已实现并测试。来源：Phase 1 §4.4、Phase 2 §4。

**决定。** box 的两个必要直系部件为 `<id>-rect` 和 `<id>-label`，类型分别为 Rect、Text。BoxProvider.create 先构造完整子树，SvgDocument.add 在提交前检查新子树内及与已有文档的全部 id；任何冲突都使整条编辑失败。

保存为 `<g data-kind="box">`。装有插件时，BoxProvider.fromSvg 检查必要部件的名称、数量与类型，坏结构选择**拒绝整个读入**。未装插件时，ShapeFactory 对找不到的专用 key 回落通用 g，保留子树与 SVG 表示，语义降级。重复 id 始终是全局错误，不能以降级消除；Editor 只在完整读入成功后替换文档和历史屏障。

Box 实现 ShapeContainer 的 assertCanDetach，SvgDocument.delete/group/addTo 在脱离前调用；Box.remove 也保护必要部件，ungroup 始终拒绝。整体移动、缩放、删除 box、收编 box、额外子图形和嵌套 box 均可使用通用容器行为。同父重排不移走部件，允许保留有效结构。

**取舍。** 已安装插件时静默降级会掩盖数据损坏，所以拒绝；缺少插件时允许读取标准 SVG 分组。结构保护由公开容器能力承担，内核不识别 box 名字。构造阶段是完整对象产生前的临时组装过程；SvgDocument.assertValid 负责全局树与 id，不被冒称为所有自定义图形的专用结构验证器。

**验证。** `test/plugin-behavior.test.ts` 覆盖新增子树冲突、坏部件、错类型、重复 id、失败读入保留文档／dirty／redo、缺插件降级、嵌套 round-trip、删除／移走必要部件失败；`box-plugin.test.ts` 独立验证贡献和不变量。三类会话比较包含 Phase 1 §6.1 版本 B，实际输出与保存 SVG 对照见 doc/evidence/transcripts。
