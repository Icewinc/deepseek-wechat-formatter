# DeepSeek Content Studio｜品牌公众号排版器

> 品牌专属公众号排版器 · 演示项目 · 品牌示例：DeepSeek

把写好的文章文字粘贴进来，一键排成固定品牌风格（标题、正文、间距、配色、重点样式），排好后直接复制到公众号使用。

## 功能

- 轻量结构语法：第一行标题、副标题、`导语：`、`##`/`一、` 章节、`-` 列表、`>` 引用、`重点：` 卡片、`**加粗**`/`[[高亮]]`
- 一键排版：375px 公众号宽度预览，固定 DeepSeek 品牌规则
- 复制到公众号：同时写入富文本（内联样式）与纯文本，样式不依赖本站 CSS
- 防误操作：文稿更新后预览置灰，重新排版后才能复制
- 隐私友好：所有处理都在浏览器本地完成，内容不会上传

## 快速开始

```bash
npm ci
npm run dev
```

浏览器打开 <http://localhost:3000/>。

复制富文本需要 localhost 或 HTTPS（浏览器安全上下文要求）。

## 测试与构建

```bash
npm run test:unit        # 排版规则单元测试
npm run lint             # ESLint
npm run build            # 生产构建
node --test tests/rendered-html.test.mjs   # 服务端渲染测试
node scripts/e2e-qa.mjs  # 无头 Chrome 端到端自测（需要本机 Chrome）
```

## 目录结构

```text
app/                页面与样式（Vinext/React）
lib/formatter.mjs   排版规则引擎（识别 + 内联 HTML 渲染）
scripts/e2e-qa.mjs  浏览器端到端自测与演示截图脚本
tests/              单元测试与服务端渲染测试
docs/               产品说明、AI 使用说明、演示方案、测试报告、提交清单
demo/               排版前/排版后/复制成功截图 + QA 结果
public/             分享图与 favicon
```

## 交付对照

- 可运行产物：本仓库 + `npm run dev`
- 真实示例对比：`demo/01-input.png` → `demo/02-output.png`（另含复制成功截图）
- 产品说明：`docs/product-design.md`
- AI 使用说明：`docs/ai-usage.md`
- 演示方案：`docs/demo-script.md`
- 测试报告：`docs/test-report.md`
- 提交清单：`docs/submission-checklist.md`

## 说明与边界

- 本页面为独立演示项目，与 DeepSeek 官方无隶属或授权关系；未使用官方 LOGO。
- 示例文章基于 DeepSeek 官方公开信息重新组织，不整段复制官方原文。
- 真实公众号后台粘贴未做端到端验证（本项目无后台权限），复制载荷已自动化验证；Safari 等非 Chromium 浏览器兼容性本次不追。
