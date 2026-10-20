# PJ1 Phase 1：SVG 编辑器

## 架构方案

### 模块划分

| 目录 | 职责 | 主要类 |
|---|---|---|
| `src/domain/` | 图形、几何计算和文档树的约束 | `Shape`、各图形类、`Group`、`SvgDocument`、`ShapeFactory` |
| `src/application/` | 执行编辑、管理历史和文档操作 | `Editor`、`History`、`EditRecord`、`DocumentPort`、`TreeFormatter` |
| `src/application/commands/` | 保存命令参数并调用接收者 | `MoveCommand`、`SaveCommand` 等具体命令 |
| `src/cli/` | 解析输入、构造命令、输出结果 | `Tokenizer`、`Arguments`、`CommandFactory`、`CommandDispatcher`、`ConsoleApp` |
| `src/infrastructure/` | SVG 解析、序列化和文件读写 | `SvgCodec`、`SvgTransform`、`NodeDocumentStore` |
| `src/Main.ts` | 创建对象并连接各模块 | 程序入口 |

`commands/` 是应用层的子目录。组件图省略了具体命令之间重复的依赖，图源见 [architecture.puml](architecture.puml)。

![模块依赖图](architecture.png)

图形的坐标、样式和子节点由对象内部维护。属性表、子节点列表和 `Editor.inspect()` 返回副本，外部修改这些返回值不会改动当前文档。

### 设计模式

命令部分采用 **Command**。角色划分参考 `command.pdf` 第 11—12、16—17 页：

- `CommandFactory` 创建命令并绑定 `Editor`，承担 Client 的职责。
- `CommandDispatcher` 是 Invoker，只调用命令的 `execute()`。
- `MoveCommand`、`SaveCommand` 等具体命令保存请求参数。
- `Editor` 是 Receiver，管理文档和编辑过程；几何运算由图形对象完成。

例如，`MoveCommand` 在草稿中按 id 找到目标后调用 `move(dx, dy)`。它不用判断目标是矩形还是分组，也不包含坐标计算。

图形结构采用 **Composite**。五种叶子图形和 `Group` 都继承 `Shape`，`Group` 内部保存 `Shape[]`。移动和缩放由容器递归调用子节点的同名方法，新增叶子类型不需要修改这段递归逻辑。这与 `composite.pdf` 第 10—14 页的结构一致。

我采用安全式的容器接口：只有 `Group` 提供 `add/remove`，所以 `in`、`addto`、`ungroup` 需要检查容器类型。移动、缩放、设属性和删除仍使用统一接口。给组设置 `fill` 时保留 SVG 的属性继承，不逐个改写后代的颜色。

撤销和重做使用两个栈，栈内的 `EditRecord` 保存一次编辑前后的文档快照。一次编辑分为三步：

1. 复制当前文档，在副本上执行命令。
2. 检查 id 唯一、无环、无共享子节点等约束。
3. 成功后替换当前文档，记录前后快照并清空 redo 栈；失败则丢弃副本。

因此，删除子树、分组和跨容器移动都只占一个 undo 单元，也不会因浮点逆运算积累误差。代价是每次编辑复制整棵树，时间为 O(N)，保留 K 次历史约占 O(KN) 空间。当前图纸规模较小，我先采用这个实现。

### 依赖方向

- `domain` 只依赖本层，避免图形规则受命令行、XML 库或文件系统影响。
- `application` 依赖 `domain`，并定义 `DocumentPort`。文件读写通过该接口完成，便于在测试中替换。
- `cli` 依赖 `application`，复用 `domain/Numbers` 解析数值，不直接修改图形树。
- `infrastructure` 依赖 `application` 的端口和 `domain`，负责适配 Node 文件 API 与 XML 库。
- `Main` 创建各层对象，负责注入依赖。

按名称分派只有两处：`CommandFactory` 的命令表和 `ShapeFactory` 的图形表。这两处仍是内置表，列为后续插件化的待重构点。

### 可能的变化

| 变化 | 处理方式 |
|---|---|
| 增加 GUI 或代理入口 | 复用命令对象和应用层，不依赖 CLI 的分词过程 |
| 增加图形插件 | 将两个工厂改为外部注册；`box` 的属性传播和解组限制留到下一阶段处理 |
| 更换 XML 库或存储方式 | 修改 `SvgCodec` 或 `DocumentPort` 的实现 |
| 大图纸与较长的历史 | 将完整快照改为差量记录；当前暂不增加这部分复杂度 |
| 支持更多 SVG 特性 | 需要重新设计路径、CSS 和任意变换的模型，当前遇到不支持的内容会报错 |

## 过程记录

我使用 Codex 辅助实现代码和测试，迭代中主要处理了下面几个问题。

### 命令与图形的职责

设计时先对照 Command 和 Composite 课件检查职责：命令保存参数，`SvgDocument` 维护树结构，各图形类负责几何计算。为检查组合结构，我用三层容器和一个矩形测试移动、缩放，确认递归发生在 `Group` 中。

### 编辑失败与历史状态

命令层先写了撤销、分支重做、IO 后的历史限制和失败回滚测试。第一次运行时 `Editor`、`CommandDispatcher` 和文件端口还没有实现，编译未通过；补齐后，这批测试与领域测试共 11 项通过。这部分参考了 `tdd.pdf` 第 4—12 页的测试先行方法。

其中一个用例是组内第二个图形缩放时溢出：如果直接修改原树，第一个图形已经改变，命令失败也无法保证状态不变。因此编辑改为先操作副本，整体成功后再提交。

历史状态也单独区分了几种情况：成功的 `save` 禁止 undo 和 redo；失败的读写不改变历史；不带参数的 `canvas` 只是查询。对应测试放在 `editor.test.ts`。

### SVG 读入

自动补 id 时，后面的节点可能已经显式使用了 `rect1`。读入改为先收集所有显式 id，再为缺失 id 的节点分配名称。

对于嵌套的 `translate(...) scale(...)`，读入时将变换合并到叶子坐标，并换算字号和线宽。旋转、错切和非等比缩放暂不支持。

接入 XML 库时，类型检查发现 `Element.localName` 可能为空，随后加了 `tagName` 回退。标准会话测试还出现过 `detached shape: box`：测试从两个 `inspect()` 快照中分别取了对象和父节点，混用了副本。改为在同一快照中查找后通过，文档的归属检查保持不变。

### 提交记录

| 提交 | 内容 |
|---|---|
| `7782826` | 工程结构与架构检查 |
| `7e5737c` | 图形、分组和领域测试 |
| `be06cf4` | 命令执行与撤销重做 |
| `f17d1db` | SVG 读写、CLI 和集成测试 |
| `d17e873` | 设计文档、架构图和导入限制检查 |

后续提交整理了文档与注释，最终版本以 `final` 标签为准。

## 一致性自查

实际目录与方案中的四个模块一致。实现时从历史管理中提取了 `EditRecord`，从 SVG 解析中提取了 `SvgTransform`，已在模块表和组件图中补充。

依赖检查通过，共检查 123 条相对导入。抽查结果如下：

| 文件 | 依赖情况 |
|---|---|
| `domain/Group.ts` | 仅使用 `Shape` 和 `Numbers`，不依赖命令或 IO |
| `application/Editor.ts` | 使用 `DocumentPort`，没有直接导入文件 API |
| `application/commands/MoveCommand.ts` | 调用图形方法，没有按类型分支计算坐标 |
| `infrastructure/NodeDocumentStore.ts` | 实现文件端口，文件 API 集中在此处 |
| `cli/CommandDispatcher.ts` | 负责解析和错误输出，不操作树节点 |

`scripts/check-architecture.mjs` 同时检查跨层导入、一类一文件及额外的 switch 分派。当前没有发现违反依赖规则的地方；两个工厂的注册方式和快照的空间开销仍需在后续阶段处理。

## 质量保证手段

### 功能检查

| 功能 | 测试位置 |
|---|---|
| 六种图形、负数和浮点坐标、id 大小写 | `domain.test.ts`、`requirements.test.ts` |
| 所有 create 参数、颜色和 in 子句 | 工厂与命令测试、示例脚本 |
| 叶子及容器的 move、scale、set、delete | `editor.test.ts` |
| group、addto、ungroup、环检测和顺序 | `domain.test.ts`、`requirements.test.ts` |
| front、back 及撤销后的位置恢复 | `requirements.test.ts` |
| undo、redo、失败回滚和 IO 后的历史限制 | `editor.test.ts` |
| tree、show、help 和默认文件路径 | 命令测试、示例脚本 |
| 自动补 id、XML 转义、中文和保存读回 | `svg.test.ts` |
| 文件错误、损坏 XML、EOF、exit 和脚本输入 | 临时文件测试、CLI 子进程测试 |

测试通过 `MemoryDocumentStore` 模拟写入失败，另用临时目录验证实际读写、覆盖保存和失败后的文件清理。这部分参考 `tdd.pdf` 第 14—17 页的依赖注入和测试替身。

### 验证结果

- `npm run check`：28 项测试通过，架构检查通过。
- `npm run test:coverage`：应用源码的行覆盖率 99.76%，分支覆盖率 92.33%，函数覆盖率 100.00%。统计对象为编译后的 JavaScript，不包含测试文件；交互提示符分支未覆盖。
- 两个示例脚本均可运行。`session.txt` 中的非法分组和 save 后 undo 会按题意输出错误。
- 使用 resvg 查看了示例 SVG。嵌套平移、缩放样例读写前后的渲染结果一致。
- GitHub Actions 在 Windows 和 Ubuntu 的 Node 22 环境执行 `npm run check`。

### 实现约定与限制

1. `front` 移到同级序列末尾，`back` 移到开头，与 SVG 绘制顺序一致。
2. `group` 按原文档的深度优先顺序收编节点。跨父级分组放在最低共同祖先中，位置在最早被选节点所在分支之前。
3. 顶层容器不能 `ungroup`。嵌套组解开后，子节点占据原组的位置，并继承自身没有覆盖的组样式。
4. CLI 的 `scale` 缩放位置和尺寸，不修改样式线宽及文字内容。
5. 首次保存需要指定路径；之后 `save` 使用最近成功 read/save 的路径，`init` 会重置该路径。
6. 当前支持六种内置图形和常用展示属性，不支持路径、CSS 样式表、`tspan`、任意变换、`box` 插件和 GUI。`data-kind="box"` 的普通 `g` 按题意读为普通容器。
7. 输入限制为 20 MiB、20000 个元素和 256 层嵌套。保存时先写同目录临时文件，再重命名替换目标文件。

运行方法见工程根目录的 [README](../README.md)。
