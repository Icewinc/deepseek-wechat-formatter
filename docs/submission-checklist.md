# 笔试提交清单

## 原始题目要求对照

### 一、可运行的产物

- [x] 可本地运行的原型：`npm run dev` 后打开 `http://localhost:3000/`
- [x] 真实示例演示：`demo/01-input.png`（排版前）、`demo/02-output.png`（排版后）、`demo/03-copy-success.png`（复制成功）
- [x] 可点击/可交互：粘贴、载入示例、一键排版、复制到公众号

### 二、项目说明

- [x] 产品说明：`docs/product-design.md`（设计思路、关键功能、亮点、缺点）
- [x] AI 使用说明：`docs/ai-usage.md`（工具、用法、AI 问题与校正）
- [x] 完整代码仓库：当前目录已初始化 Git 仓库，代码/测试/文档全部入库
- [x] 演示方案：`docs/demo-script.md`
- [x] 测试记录：`docs/test-report.md`

## 提交前人工验收步骤

1. 目检三张截图是否符合预期视觉（可选，AI 本会话无法看图）；
2. 运行 `npm ci && npm run dev`，浏览器打开页面走一遍全流程；
3. 按需把仓库推到自己的 GitHub 仓库或附上压缩包提交。

说明：真实公众号后台粘贴与 Safari 兼容性按用户决定不列入本次验收。

## 附：压缩包生成方式

```bash
zip -r ../deepseek-formatter-submission.zip . -x "node_modules/*" ".git/*" ".next/*" ".wrangler/*" ".vinext/*" "dist/*" "release/*"
```
