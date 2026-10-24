# SVG 编辑器

软件设计 PJ1 Phase 1。使用 TypeScript 实现命令行 SVG 编辑器，支持六种图形、嵌套分组、文件读写、属性编辑和撤销重做。

代码仓库：[qingyvz/software-design-svg-editor](https://github.com/qingyvz/software-design-svg-editor)；当前交付版本由 `final` 标签定位。

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

`check` 执行 50 项测试和架构依赖检查，`test:coverage` 统计应用源码覆盖率。

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


设计、过程记录及实现限制见 [doc/README.md](doc/README.md)，架构图源见 [doc/architecture.puml](doc/architecture.puml)。最终版本使用 `final` 标签。
