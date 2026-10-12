# PJ1 Phase 1：SVG 编辑器

## 架构方案

我把几何和树结构放进 domain，把编辑和历史放进 application，把命令行和 XML/文件分别放进 cli 与 infrastructure。Command 负责一次操作，Composite 负责容器与叶子的统一接口。先做六种内置图形，不把下一阶段的 box 插件提前塞进内核。

依赖方向：domain 不依赖外层；application 依赖 domain 和它自己定义的文件端口；cli 调用 application；infrastructure 实现文件端口，使用 domain；Main 只负责装配。命令名和图形类型各集中在一个工厂中分派，这两处登记表是后续插件化的重构点。

## 过程记录

- 2026-10-24：读取平台附件，先锁定 TypeScript、Command、Composite、失败原子性及 IO 后禁用撤销的约束，再建立工程和测试入口。

## 一致性自查

实现后补充实际模块、导入检查和变更记录。

## 质量保证手段

逐条对应题目中的命令、错误与典型会话编写测试；每个阶段运行当前检查后再提交。
