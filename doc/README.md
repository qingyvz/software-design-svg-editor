# PJ1 Phase 1：SVG 编辑器

## 架构方案

### 模块划分

| 目录 | 职责 | 主要类型 |
|---|---|---|
| `src/domain/` | 图形、变换、文档树和图形注册 | `Shape`、`ShapeContainer`、`Group`、`SvgDocument`、`AffineTransform`、`Bounds`、`TextMeasurer`、`ShapeFactory`、`ShapeProvider` |
| `src/application/` | 编辑事务、范围、历史和文档操作 | `Editor`、`EditContext`、`EditScope`、`History`、`EditRecord`、`ShapeFormatter`、`DocumentPort` |
| `src/application/commands/` | 保存请求参数并执行具体命令 | `MoveCommand`、`RotateCommand`、`CreateCommand` 等 |
| `src/cli/` | 分词、参数检查、命令构造和输出 | `Tokenizer`、`Arguments`、`CommandFactory`、`CommandDispatcher`、`ConsoleApp` |
| `src/infrastructure/` | SVG 语法转换和文件读写 | `SvgCodec`、`SvgTransform`、`CanvasTextMeasurer`、`NodeDocumentStore` |
| `src/plugins/` | 可选图形扩展 | `Box`、`BoxProvider` |
| `src/Main.ts` | 创建对象、注册插件并注入依赖 | 程序入口 |

`commands/` 是应用层的子目录。模块依赖见下图，图源为 [architecture.puml](architecture.puml)。

![模块依赖图](architecture.png)

图形的坐标、样式和子节点由对象内部维护。属性表、子节点列表和 `Editor.inspect()` 返回副本；仿射矩阵不可变。

### 设计模式与职责

命令部分采用 **Command**，角色划分参考 `command.pdf` 第 11—12、16—17 页。`CommandFactory` 创建命令并绑定接收者 `Editor`，`CommandDispatcher` 通过统一接口执行命令。`EditingCommand.execute()` 固定编辑流程，具体命令只实现 `apply()`。

例如，`MoveCommand` 通过 `EditContext` 找到目标，然后调用 `move(dx, dy)`。命令不用判断目标是矩形还是分组，也不负责坐标计算。上下文统一处理目标范围、默认父容器和图形创建。

图形结构采用 **Composite**，对应 `composite.pdf` 第 10—14 页。五种叶子和 `Group` 都继承 `Shape`。容器内部保存 `Shape[]`，移动、缩放和矩阵变换递归调用子节点的同名方法。树操作通过 `shape.container` 获取 `ShapeContainer` 能力，不再要求容器必须继承 `Group`。解组限制由容器的 `assertCanUngroup()` 决定。

撤销和重做使用两个栈。`EditRecord` 封装一次编辑前后的快照，图形通过多态 `clone()` 复制自身：

1. 复制当前文档，为本次命令建立 `EditContext`。
2. 在副本上执行编辑，检查 id 唯一、无环和无共享子节点等约束。
3. 成功后替换当前文档，记录历史并清空 redo 栈；失败则丢弃副本。

删除子树、分组和批量旋转都只占一个 undo 单元。完整快照便于恢复原来的浮点数值和对象类型，代价是 K 次历史需要保存 O(KN) 个节点，深层树的复制还包含重复的子树校验。大图纸应改用差量记录。

图层模式使用 `EditScope` 策略。`CanvasScope` 允许编辑整幅图，`LayerScope` 只允许编辑当前容器的后代。所有编辑命令共用 `EditContext`，没有在每个命令中另写一套模式判断。切换图层属于会话状态，不进入文档历史。

### 变换与插件

`AffineTransform` 保存六参数仿射矩阵，负责组合、平移、缩放、绕点旋转和点坐标计算。叶子保存局部几何属性及矩阵，容器把操作递归交给子节点。旋转矩形、椭圆和文字使用同一条调用路径。

SVG 读入时将祖先变换合并到叶子。纯平移和正等比缩放继续归一化为坐标、尺寸，并换算字号和线宽；其他变换保留为矩阵。这样既保持原题 CLI 的坐标输出，又能无损表示旋转和非等比缩放。树节点之间移动不会重新解释祖先坐标系。矩阵顺序遵循 [SVG 坐标变换规则](https://www.w3.org/TR/SVG/coords.html)。

`ShapeFactory.register(provider)` 同时登记命令创建和 SVG 恢复规则。`Main` 将同一个工厂注入 `Editor` 与 `SvgCodec`，`CreateCommand` 不再创建自己的工厂。SVG 恢复按元素名及可选的 `data-kind` 查找提供者；未安装对应插件时，带标记的 `g` 仍读为普通分组。

可选的 `BoxProvider` 创建矩形与文字组成的 `Box`。`Box` 实现填充色和标题的传播、克隆以及禁止解组的规则，核心树操作和序列化中没有 box 分支。启用方式是 `--box`，默认仍只注册题目要求的六种类型。

### 展示与布局边界

`ShapeFormatter` 在应用层组织 show/tree 的摘要和父节点名称。领域对象只提供数据与行为，不再返回 CLI 文本；新入口可以使用自己的展示方式。

`Shape.bounds()` 返回画布坐标中的轴对齐几何边界，空容器返回 `undefined`。矩形和线段使用变换后的顶点；圆和椭圆使用仿射椭圆的极值；容器合并子节点边界。插件继承这些能力，布局命令无需按图形类型分支。`SvgDocument.bounds()` 先解析祖先样式，`EditContext.bounds()` 还会检查当前编辑范围。

文字通过领域接口 `TextMeasurer` 获取排版宽度和墨迹边界。基础设施层的 `CanvasTextMeasurer` 适配 Canvas 的实际测量值，使用字母基线，按 text-anchor 调整位置，并恢复调用方的 Canvas 状态。度量定义参见 [HTML Canvas 文本规范](https://html.spec.whatwg.org/multipage/canvas.html#textmetrics)。布局调用方需要提供已加载所需字体的测量器；未提供时明确报错，不按字符数猜测宽度。

`bounds.test.ts` 中的左对齐命令只调用选择、边界和移动接口，验证旋转图形、椭圆、box 及重叠选择可共用同一编辑事务。该命令是扩展探针，未加入默认 CLI。

### 依赖方向

- `domain` 只依赖本层，不引用 CLI、XML 库和文件系统。
- `application` 依赖 `domain`，通过自己定义的 `DocumentPort` 完成读写。
- `cli` 依赖 `application`，并复用 `domain/Numbers` 解析数值。
- `infrastructure` 依赖应用层端口和领域模型，适配 Node 文件 API 与 XML 库。
- `plugins` 只依赖领域接口和自身实现。
- `Main` 负责装配与注册。

命令名和图形类型名分别在 `CommandFactory`、`ShapeFactory` 中分派，两处都提供外部注册接口。内置定义目前仍在构造器中登记，后续可把这部分移到独立装配模块；这是保留的待重构点。

### 变化点检查

| 变化 | 现有支持及验证 |
|---|---|
| 图层编辑模式 | `LayerScope` 统一限制创建、移动、删除、分组等操作；不修改各命令的几何逻辑 |
| 多选批量旋转 | `RotateCommand` 调用矩阵接口；选择同时包含祖先与后代时，只处理祖先一次 |
| 新增复合图形插件 | 增加 `ShapeProvider` 和图形类，在装配处注册；box 已验证创建、克隆、限制和读回 |
| 批量平移 | `MoveManyCommand` 使用同一批量选择接口和编辑事务 |
| 新增命令或入口 | 命令可通过 `register()` 注入；GUI 可直接构造应用层命令 |
| 自动布局 | 统一 bounds 与可注入文字测量；左对齐探针验证混合图形、插件、单次撤销和失败回滚 |
| 更换存储或 XML 库 | 替换 `DocumentPort` 或 `SvgCodec` |
| 大图纸与完整 SVG | 仍需处理历史存储成本、路径、CSS 等未实现内容 |

## 过程记录

我使用 Codex 辅助实现代码和测试，主要迭代如下。

### 命令与历史

最初对照 Command 和 Composite 课件划分职责：命令保存参数，文档维护树结构，图形负责几何计算。命令层先写了撤销、分支重做、IO 后的历史限制和失败回滚测试。首次运行时相关类还未实现，编译未通过；补齐后，早期测试共 11 项通过。这部分参考 `tdd.pdf` 第 4—12 页的测试先行方法。

组内第二个图形缩放时溢出的用例，促使编辑过程采用副本。它要求第一个图形已经计算成功时，整条命令失败仍能保留原文档和历史。成功 save、失败读写、只查询尺寸的 canvas 也分别处理。

### SVG 与快照

自动补 id 改成先收集显式 id，再分配缺失值，避免抢占后面节点的名称。XML 类型检查发现 `localName` 可空后，加了 `tagName` 回退。

标准会话测试曾出现 `detached shape: box`。原因是测试混用了两个 `inspect()` 副本中的对象和父节点，随后改为在同一快照中查询，保留了对象归属检查。

### 透明度修正

复查时发现，父组和子图形各有 0.5 透明度，解组后子图形却仍为 0.5。最初把 opacity 和 fill 一起当作继承属性处理，这是错误的。

我先加入四个回归用例，确认原实现全部失败。修正后，单个子元素的透明度与父组相乘，fill-opacity 等继承属性仍由子元素的显式值覆盖。数值和百分数会规范化，非法输入报错。

组透明度作用于子元素合成后的图像，不能简单分配给多个子元素，参见 [SVG 组透明度定义](https://www.w3.org/TR/SVG11/masking.html#ObjectAndGroupOpacityProperties)。因此，含多个直接子元素且透明度在 0 与 1 之间的组会拒绝解组，原文档与历史保持不变。单个子元素即使本身是含重叠图形的组，仍可整体合并透明度。

### 扩展接口调整

原模型只保存位置和尺寸，旋转需要逐类改动；原工厂又在创建命令里直接实例化。我把仿射矩阵放入领域层，将工厂注入到编辑器和编解码器，再用实际的批量旋转、图层模式和 box 插件检验接口。

图层测试覆盖了各个编辑命令的越界目标、默认创建位置、失败回滚及 undo 后图层消失的情况。插件测试还使用了一个不继承 `Group` 的容器，检查树操作是否真的依赖能力接口。

### 继承与职责复查

后续评审给出的嵌套 fill=inherit 用例复现了另一处解组缺陷。移除父组时，子节点显式 inherit 也必须固定到该父组的属性值。补充的测试覆盖颜色、字体属性、父级继续继承以及撤销重做。

同时将图形摘要移到 `ShapeFormatter`，增加统一边界与文字测量接口，并给最低共同祖先、分组插入位置、缩放矩阵和重叠选择补充说明。边界测试使用固定度量验证坐标计算，Canvas 适配器测试验证度量字段与状态恢复；它们不代替真实字体加载验证。

### 提交记录

| 提交 | 内容 |
|---|---|
| `7782826` | 工程结构与架构检查 |
| `7e5737c` | 图形、分组和领域测试 |
| `be06cf4` | 命令执行与撤销重做 |
| `f17d1db` | SVG 读写、CLI 和集成测试 |
| `d17e873` | 设计文档和架构图 |
| `455a628`、`0c387f9` | 文档整理和仓库入口 |
| `a7c1744` | 修复解组透明度并通过容器能力访问结构 |
| `b02434f` | 统一仿射变换及 SVG 变换读写 |
| `51ee95d` | 开放图形提供器注册并注入创建与导入流程 |
| `1822fb3` | 集中编辑范围校验并支持图层模式及命令注册 |
| `0950efb` | 增加批量旋转和平移并合并重叠选择 |
| `130a05d` | 加入可选 box 插件并验证扩展协作 |
| `4b94e77` | 修复解组时显式 inherit 的样式解析 |
| `b30c47c` | 将图形展示格式移出领域模型 |
| `a47d2cd` | 提供统一几何边界和可注入文字测量以支持布局 |
| `d4613cc` | 统一代码排版并说明组合与变换算法 |

上述扩展最初集中在一个本地提交中，复查后在发布前按职责拆分，并逐段运行检查；已发布的七次提交保持原样。随后同步本文档。最终版本由 `final` 标签定位。

## 一致性自查

四个原有模块保留，新增 `plugins/` 作为可选扩展。应用层增加 `EditContext` 和范围策略；领域层增加仿射矩阵、容器能力和提供者接口。模块表及组件图已同步。

依赖检查通过，共检查 194 条相对导入。抽查结果：

| 文件 | 依赖情况 |
|---|---|
| `domain/Group.ts` | 只依赖领域类型，递归操作不引用命令或 IO |
| `domain/SvgDocument.ts` | 通过容器能力操作结构，无 `instanceof Group` 限制 |
| `application/commands/CreateCommand.ts` | 依赖编辑上下文，不自行构造工厂 |
| `application/commands/RotateCommand.ts` | 依赖统一矩阵和选择接口，无图形类型分支 |
| `infrastructure/SvgCodec.ts` | 从注入的工厂恢复图形，无 box 专用判断 |
| `plugins/BoxProvider.ts` | 只依赖领域模型和 Box |
| `cli/CommandDispatcher.ts` | 执行注册后的命令，不操作树节点 |

`scripts/check-architecture.mjs` 检查跨层导入、一类一文件和额外的 switch 分派。代码采用统一格式，将压缩在一行的多步操作和注册项展开。

## 质量保证手段

### 功能检查

| 功能 | 测试位置 |
|---|---|
| 六种图形、浮点及负坐标、id、树操作和顺序 | `domain.test.ts`、`requirements.test.ts` |
| 编辑命令、撤销重做、失败回滚与 IO 后的历史限制 | `editor.test.ts` |
| XML 转义、中文、自动补 id、文件读写和 CLI | `svg.test.ts` |
| 解组透明度、重叠合成保护、透明度输入 | `opacity.test.ts` |
| 解组显式继承、字体属性与撤销重做 | `inheritance.test.ts` |
| 几何边界、文字度量与布局扩展 | `bounds.test.ts` |
| 矩阵、批量编辑、图层范围、插件及命令注册 | `extensions.test.ts` |

测试用 `MemoryDocumentStore` 模拟读写失败，用临时目录验证真实文件行为；这部分参考 `tdd.pdf` 第 14—17 页的依赖注入和测试替身。

### 验证结果

- 50 项测试全部通过，架构检查通过。
- 源码行覆盖率 99.54%，分支覆盖率 92.27%，函数覆盖率 99.47%。统计对象为编译后的应用 JavaScript，不包含测试文件。
- 独立使用 resvg 对比六组图像：显式继承解组、单图形解组、子组解组、拒绝有损解组、复杂仿射变换读写、批量旋转。共比较 659200 个 RGBA 通道，差异为 0。
- GitHub Actions 在 Windows 和 Ubuntu 的 Node 22 环境执行 `npm run check`。
- 原题示例与可选插件示例均保留在 `examples/`，运行方法见根目录 [README](../README.md)。

### 实现约定与限制

1. `front` 放到同级序列末尾，`back` 放到开头，遵循 SVG 绘制顺序。
2. `group` 按文档的深度优先顺序收编节点；跨父级时放在最低共同祖先中，位置取最早被选节点所在分支之前。
3. 顶层容器、box 以及无法保持透明度合成的分组不能解组。合法解组后，子节点占据原组位置。
4. CLI 的 `scale` 缩放几何位置和尺寸，不缩放样式线宽及文字字号。旋转后的图形继续按画布坐标移动和缩放；show/tree 同时显示局部几何和矩阵。
5. 批量选择包含祖先和后代时只处理祖先；重复 id 或无效目标报错，整条命令不生效。
6. 图层模式限制编辑目标和创建位置。显示、文件读写及文档历史仍作用于整个文档；切换图层不清空历史，undo/redo 后若当前图层不存在则回到画布。
7. 默认六种图形；box 需显式启用。不支持路径、CSS 样式表、tspan、滤镜和 GUI，也不把仿射变换支持等同于完整 SVG 支持。
8. 输入上限为 20 MiB、20000 个元素、256 层嵌套。保存先写同目录临时文件，再重命名替换目标文件。

9. 边界不包含描边、滤镜和裁剪；旋转文字返回测量所得墨迹矩形的变换包围盒。Canvas 适配器支持数值或 px 字号、字体族和字重，不实现完整 CSS 排版。
