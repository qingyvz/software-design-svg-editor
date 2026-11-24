# SVG 编辑器

软件设计 PJ1：Phase 1 的 TypeScript 命令行 SVG 编辑器（六种内置图形、嵌套分组、文件读写、属性编辑和撤销重做），以及正在开发的 Phase 2 插件式重构和独立 VS Code 扩展。**Phase 2 尚在工作树中，不能作为已提交版本。**

本地 `origin` 配置指向 [qingyvz/software-design-svg-editor](https://github.com/qingyvz/software-design-svg-editor)，但远端历史、推送权限与 Phase 2 交付尚未核验。`final` 是已存在的 Phase 1 基线标签；本工作树未创建 `p2` 标签，旧标签不得移动。

需要 Node.js 22 或以上版本。

```sh
npm ci
npm run cli
```

```text
svg> init 800 600
svg> create g scene
svg> create rect r1 20 30 100 50 #4a90d9 in scene
svg> create text t1 35 60 "Hello SVG" in scene
svg> move scene 10 20
svg> undo
svg> tree
svg> save demo.svg
svg> exit
```

输入 `help` 查看命令语法。带空格的参数用双引号括起；行首 `#` 表示注释，参数中的 `#ffffff` 表示颜色。

在工程根目录运行示例：

```sh
npm run cli -- --script examples/flowchart.txt
npm run cli -- --script examples/session.txt
```

脚本会保存对应的 `examples/*.svg`，可用浏览器打开。`session.txt` 包含非法分组和 save 后 undo，用于检查错误输出。

```sh
npm run check
npm run test:coverage
```

`check` 执行 CLI 测试和架构依赖检查；Phase 2 当前工作树一次核验结果为 **72/72 测试通过、263 条相对导入检查通过**（2026-11-23；不是 `final` 的 50 项历史测试）。`test:coverage` 统计应用源码覆盖率，不能沿用 Phase 1 覆盖率作为 Phase 2 结果。

## Phase 2 工作树（尚未发布）

CLI 可选插件：`--plugins` 按顺序装配 stats、dir、box、modified-star，`--config plugins.config.json` 从配置装配同一组插件；`--box` 仅装 box。不加载可选插件仍使用内置命令与图形。

```sh
npm run cli -- --plugins --script doc/transcript/cli-plugins.txt
npm run cli -- --config plugins.config.json --script doc/transcript/cli-plugins.txt
```

独立扩展位于 [vscode-extension/](vscode-extension/README.md)：在该目录 `npm ci && npm test`、`npm run build`，然后**由用户在 VS Code 中**打开目录并按 F5 启动扩展开发宿主（具体步骤见其 README）。已保存的扩展测试为 7/7、宿主 API 测试结果为 `passed`；**这些不是 Explorer/Outline 的真实截图，截图仍缺失**。本次文档更新不会启动或关闭 VS Code。

当前脚本的逐字节对照结果保存在作业目录的 `draft/transcript-evidence/result.json`（位于仓库外）：Phase 1 `final` 与默认模式，以及三个会话的代码／配置装配比较均为 `byteEqual: true`。这些结果不是最终提交或远端证据；详情与限制见 [Phase 2 文档](doc/README.md)。

扩展示例需要显式启用 box：

```sh
npm run cli -- --box --script examples/extensions.txt
```

新增命令：

```text
layer enter scene
create rect r 10 20 100 50
rotate 30 100 100 r
move-many 10 20 r
layer leave
```

`rotate` 的前三个参数是角度和画布中的旋转中心，后面可跟多个 id。`move-many` 的前两个参数是位移。批量操作对应一次撤销，选择祖先与后代时不会重复变换。图层模式下，新图形默认加入当前图层，编辑目标须在该层内。

[扩展示例 SVG](examples/extensions.svg)。普通启动仍只注册六种内置图形。


设计、过程记录及实现限制见 [doc/README.md](doc/README.md)；[Phase 1 架构图](doc/architecture-before.puml)与[当前 Phase 2 架构图](doc/architecture-after.puml)分开保存。`final` 仅标记 Phase 1，不表示当前工作树已交付。
