# SVG 编辑器与插件实践

TypeScript 命令行 SVG 编辑器，以及独立的 VSCode SVG 文件标记／原生大纲扩展。Phase 1 基线为 `final`；本阶段最终交付通过 `p2` 定位。设计、接口、ADR、实际截图和验证入口见 [项目文档](doc/README.md)。

## 安装与启动

需要 **Node.js 22+、npm、Git**。先运行 `node --version`、`npm --version`、`git --version`；缺少工具时安装对应官方发行版并重新打开终端。依赖由锁文件固定：

```sh
npm ci
npm run check
npm run cli
```

`npm ci` 下载失败时保留锁文件，检查代理／网络／证书配置后重试；不需要额外全局 npm 包。构建会清理本仓库自己的 `build/` 并重建，避免旧插件 JS 掩盖源码变化。安装、编译错误会给出非零退出码，不把空运行当成功。

```text
init 800 600
create g scene
create rect r1 20 30 100 50 red in scene
move scene 10 20
undo
tree
save demo.svg
exit
```

输入 `help` 查看语法。双引号保留空格，行首 `#` 是注释。默认提供六种图形和原命令；可选插件用以下任一方式启用：

```sh
npm run cli -- --plugins
npm run cli -- --config plugins.config.json
npm run cli -- --box
```

`--plugins` 按 stats、dir、box、star 装配；`--box` 仅装 box。代码装配与配置装配各自经过同一注册器；不要同时装配相同插件，以免重名。插件缺失或加载失败会报告错误并继续默认能力。

## VSCode 扩展

需桌面 VSCode 1.96+。按 [扩展安装与演示步骤](vscode-extension/README.md)，在扩展目录 `npm ci`、`npm test` 后按 F5。SVG 须以 **Text Editor（文本编辑器）** 打开，原生 Outline 才能展示源码结构。

## 验证与交付

- `npm run check`：CLI 回归与依赖方向检查。
- [独立插件测试、三类会话比较和 OCP 提交证据](doc/README.md#测试与真实结果)。
- [实际 VSCode 截图与布局检查](doc/README.md#vscode-实际截图与分析)。
- `node docs/metrics/generate.mjs --baseline final --target p2`：从不可变 Git 历史生成指标；发布前用 `--target HEAD`，报告会标记预评估。
- [迭代与 AI 检查记录](doc/iteration-log.md)。现有未提交实现的接收快照与本轮真实修改分别记录，没有补造早期开发历史。

正式 Canvas 提交走独立审批。安装缓存、测试配置、构建目录和临时工作树属于测试辅助材料，不放入提交源码包。
