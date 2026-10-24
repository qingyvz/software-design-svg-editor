# SVG 编辑器

软件设计 PJ1 Phase 1。使用 TypeScript 实现命令行 SVG 编辑器，支持六种图形、嵌套分组、文件读写、属性编辑和撤销重做。

代码仓库：[qingyvz/software-design-svg-editor](https://github.com/qingyvz/software-design-svg-editor)；提交版本为 `final` 标签。

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

`check` 执行 28 项测试和架构依赖检查，`test:coverage` 统计应用源码覆盖率。

设计、过程记录及实现限制见 [doc/README.md](doc/README.md)，架构图源见 [doc/architecture.puml](doc/architecture.puml)。最终版本使用 `final` 标签。
