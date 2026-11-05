# 天图府开发入口

- [动效制作端](docs/design-studio/README.md)：管理员工具栏入口，14 个参考后重写的效果、参数预览、转场应用与完整源码包导出。

- [交互代码学习库](learning/interaction-atlas/README.md)：六种交互的中文课程、注释源码、可运行练习和复用说明。
- 本机网站运行时打开 [交互学习页](http://127.0.0.1:5173/learning/interaction-atlas/index.html)；独立运行用 `pnpm.cmd learning:dev`。
- [交互图鉴实验室](docs/交互图鉴实验室.md) 保留网站作品演示与实际页面接入说明。

以下为项目原始 Vite 模板说明。

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
