# SVG 编辑器（CLI）

软件设计 PJ1 Phase 1。用 TypeScript 面向对象实现，支持 `rect`、`circle`、`ellipse`、`line`、`text`、`g`，以及文档读写、嵌套组合、属性编辑、层次显示和撤销重做。

需要 Node.js 22 及以上、npm。

```sh
npm ci
npm run check
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

保存后的 SVG 可以直接打开预览。`help` 列出全部命令。参数中的空格使用双引号；行首 `#` 是注释，参数里的 `#ffffff` 是颜色。

两组课程示例：

```sh
npm run cli -- --script examples/flowchart.txt
npm run cli -- --script examples/session.txt
```

示例中的 save 会更新对应的 `examples/*.svg`。故意保留的非法分组与 save 后 undo 用于演示题目要求的错误反馈。

- [设计文档、过程记录、自查与验证](doc/README.md)
- [PlantUML 架构图源](doc/architecture.puml)
- [流程图 SVG](examples/flowchart.svg)
- [标准会话脚本](examples/session.txt)

`npm test` 执行 28 项测试；`npm run test:coverage` 统计应用源码覆盖率；`npm run check` 还会核对依赖方向和一类一文件约束。

本阶段不包含 `box` 插件、GUI 或完整 SVG/CSS 实现。可接受的输入、分组顺序和变换边界见设计文档。最终版本以 Git 标签 `final` 为准。
