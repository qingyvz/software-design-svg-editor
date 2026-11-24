# ADR 004：清单、双装配与原子注册

状态：已实现，独立 A/B 提交与会话检查已生成。来源：Phase 2 §6。

**决定。** PluginContext 只允许提交四类贡献。激活时先暂存，不直接写正式表。随后核对对象格式、稳定注册名、同类重名、声明／实际类别与名称集合，以及 ShapeProvider 的 SVG key。所有检查通过才逐表登记，登记阶段异常则逆序撤销本插件已登记项。已成功插件保留，宿主继续加载后面的插件。

代码装配和配置装配共用 PluginInstaller.install。前者在组合根实例化类，后者按配置数组解析／加载类或实例，options 原样传入 activate。enabled:false 完全跳过。相对路径基于配置文件所在目录，保留原文件／目录路径简写；裸包名以该目录为 parent，按 ESM 的 node/import 条件选择 exports，支持仅 import 和双条件包；每个独立包在 package.json/contributes 声明贡献，构建通用复制元数据。读取最近插件包清单时只跳过真实宿主自己的 package.json；配置目录不能作为宿主身份，配置放包内或包外时包清单都具有相同权威。加载器不枚举插件名。

加载器分别报告模块不存在、无默认导出、清单不一致、激活失败；同类重名使用题目规定的类别／名称消息。解析后先检查顶层目标：缺失入口（包括 exports 指向缺失文件或路径中间项不是目录）归为 plugin not found；权限等其他检查异常归为加载失败。入口存在后的模块求值或依赖失败归为加载失败，不重新套用顶层缺失分类。配置语法／结构非法输出 invalid plugin config，并继续默认能力。

**取舍。** 只预先建立临时列表仍不足以保证登记原子性，提交阶段同样要跟踪并撤销。只比较数量会放过错名／错类，故按类别和名称集合核验。默认提供器由宿主装配，内核不因可选插件新增而更改。不能先以 require 条件选文件再 dynamic import，否则会拒绝合法的 import-only 包或选错双条件入口。Node 22.14 内置 import.meta.resolve 的自定义 parent 需要实验参数，因此锁定 import-meta-resolve 4.2.0 解析裸包，避免要求用户启用全局实验选项；使用默认 node/import 条件，不声称处理任意自定义 CLI conditions。依据：[Node 22.14 ESM 文档](https://github.com/nodejs/node/blob/v22.14.0/doc/api/esm.md)、[解析器说明](https://github.com/wooorm/import-meta-resolve/blob/main/readme.md)。

**验证。** `test/plugin-loader.test.ts` 覆盖四失败、options、路径／包解析、禁用、重名、SVG key 冲突、getter 读取异常、提交异常回滚和后续继续加载。A/B 共有框架父提交 de82fe9；A=fafb2ba 只额外改 Main，B=06900b9 只改配置；scripts/verify-transcripts.mjs 校验路径存在、空 diff、新包一致及三类会话逐字节相同。测试原始结果而非静态搜索是结论依据。`review-regressions.test.ts` 建立 import-only 与双 exports 包，先用同一 Node 的普通 import 作阳性对照，再断言加载器选择 import 入口。后续用缺失 exports 目标／ENOTDIR、后续健康插件、正确／冲突清单及包内／包外配置验证错误分类、继续加载与清单权威不变。
