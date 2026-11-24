# ADR 004 — 插件清单检查与原子注册（当前工作树静态核对；测试待补）

**背景。** Phase 2 §6 要求代码装配和配置装配使用同一注册/校验路径，`contributes` 与实际四类注册名严格一致，重复注册拒绝当前插件，失败后保留此前插件并继续加载。边装边改正式注册表会留下部分注册。

**决策及实现路径。** `Main.ts` 在代码方式实例化插件，配置方式用 `PluginLoader.load` 解析模块，再都调用 `PluginInstaller.install`。`install` 创建**每个插件独立的暂存上下文**，`activate(ctx, options)` 将四类对象推入暂存数组；通过 `manifest/names/same` 比较各类名称集合，检查重复与 SVG key 冲突，随后向正式注册表逐项写入。它不是不可中断的单步提交；`committed` 记录在提交异常时逆序 `remove`，做到按当前实现的尽力回滚。激活失败或清单不符时暂存区直接丢弃。`PluginLoader` 在配置中按数组顺序处理、`enabled:false` 先跳过；相对路径基于配置目录，包名通过 Node 的 `createRequire` 解析，options 透传。非法配置返回 `error: invalid plugin config` 并保留默认能力。**状态：静态路径存在，失败路径及确切输出尚未实测。**

**错误分类与风险。** 目标模块本身解析不到才用 `plugin not found`；文件可找到但顶层求值或依赖失败用 `plugin failed to activate`（当前 loader 将两者合并在这一文本类别）；无默认导出、manifest mismatch、duplicate registration、activate 抛错分别按 §6 的前缀返回。异常 reason 会清理换行，但 `PluginLoader.reason` 目前没有移除绝对路径，**不得承诺不泄露本地路径**。`PluginInstaller.install` 的 `actual = names(pending)` 在 `try` 外，若恶意插件暂存 null 等畸形注册对象可能抛错；`PluginLoader.load` 可在外层 catch 转换，但直接代码装配的 `Main.ts` 可能被该异常中断。需增加针对性回归并在源码中修正，不能以 ADR 代替实现。

**备选及理由。** 先注册后回滚需逆操作和跨表同步，易漏撤销；失败直接退出会失去其他插件和基线能力。暂存-校验-提交让注册原子性清楚，也使两种装配共享校验。

**验证前提。** 分别测试缺模块、无默认导出、清单与注册类别/名称不符、求值失败、activate 在注册后抛错、重复注册、非法配置、畸形注册对象和紧随失败的成功插件；比较同环境 A/B 的输出。目标模块解析与其依赖解析的错误归类及部分提交异常回滚须实测。**已有实现路径不等于这些测试已通过**。
