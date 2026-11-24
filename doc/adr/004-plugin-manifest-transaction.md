# ADR 004：清单、双装配与原子注册

状态：已实现。来源：Phase 2 §6。

**装配与事务。** 代码和配置装配共用 PluginInstaller.install。激活只向 PluginContext 暂存四类贡献；随后检查格式、稳定名称、同类重名、声明／实际类别与名称集合及 SVG key，再登记。登记异常逆序撤销本插件已登记项；保留先前成功插件并继续后续插件。默认提供器由宿主选择，内核不因新增可选插件而修改。

**模块解析。** 按配置数组顺序处理，enabled:false 完全跳过，options 原样传入 activate。相对文件／目录简写保留原行为，基于配置目录；裸包名经宿主 ModuleResolver 解析。NodeModuleResolver 使用 process.execPath 启动 NodeResolveWorker，worker 的 import.meta.resolve 指定配置目录为 parent。只在该短时子进程开启 parent 参数所需的实验开关，用户不用设置全局选项；继承 NODE_OPTIONS，并转发 conditions／-C、addons、require-module、symlink 相关运行参数。解析不执行插件；真正 import 和 activate 均在宿主内完成。

**清单权威。** 独立包各有 package.json/contributes，构建通用复制，不按插件名映射。仅跳过真实宿主自己的包元数据，配置放包内或包外不改变校验。清单来源依次为最近包的显式 contributes 字段、模块显式导出、实例字段；仅未提供来源时才回落。显式 null 等无效声明交统一校验。四类列表缺省／undefined 为空，null 不是列表。已有 package.json 必须是 JSON 对象；仅 ENOENT 继续向父查找，格式／权限错误报告加载失败。

**失败边界。** 解析后检查顶层目标；缺失入口（含 exports 缺失文件和 ENOTDIR）报告 plugin not found。入口存在后的依赖、求值、元数据或激活错误报告 failed to activate。无默认导出、清单不符、同类重名使用题目规定格式。配置非法报告 invalid plugin config 后以默认能力启动。worker 启动失败提示重新构建／检查 Node，按加载失败处理；超时为 10 秒，不误报插件不存在。

**取舍。** 预检和提交阶段都要保证原子性；仅比贡献数量会漏过错名／错类。包解析也不能把 require 规则或一份手写条件表当作实际 ESM 环境。原生 Node 的默认条件包含运行参数相关的 module-sync、node-addons 等；隔离 worker 直接复用当前引擎，代价是每次裸包解析有一次进程启动。worker 是独立 TypeScript 源码，所有分支均参与源码指标，不在字符串里隐藏执行逻辑。依据：[Node 22.14 ESM 文档](https://github.com/nodejs/node/blob/v22.14.0/doc/api/esm.md)、[原生条件初始化源码](https://github.com/nodejs/node/blob/v22.14.0/lib/internal/modules/esm/utils.js)。

**验证。** plugin-loader 与 review-regressions 测试覆盖四失败、禁用/options、路径／包、全部类别的重名／回滚／继续加载、空值与缺省、损坏 JSON、包内／包外清单权威、缺入口与依赖失败分类。八组公开 Loader 与原生 import 对照涵盖默认 module-sync／node-addons、conditions 三种写法、NODE_OPTIONS 及禁用控制。旧解析器先失败六组，新实现全部通过；红日志在 doc/evidence/tests。A=fafb2ba、B=06900b9 有同一无 box 框架父提交 de82fe9；verify-transcripts 校验真实路径、既有运行代码差异、新包一致及三类会话字节相同。
