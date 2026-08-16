# 测试报告

## 1. 测试环境

- macOS（Apple Silicon）
- Node.js v24.14.0，npm 11.9.0
- 浏览器：本机 Google Chrome（无头模式 + DevTools 协议）
- 构建框架：Vinext / Vite 8

## 2. 测试命令与结果

| 命令 | 结果 |
| --- | --- |
| `npm run test:unit` | 9/9 通过 |
| `npm run lint` | 无错误 |
| `npm run build` | 构建成功 |
| `node --test tests/rendered-html.test.mjs` | 2/2 通过 |
| `node scripts/e2e-qa.mjs` | 通过（结构、样式、复制、控制台全绿） |

## 3. 单元测试覆盖（tests/formatter.test.mjs）

- 文本规范化（CRLF、空白）；
- HTML 转义（`& < > " '`）；
- 标题/副标题/导语/章节/正文/列表/引用/重点识别；
- 中文数字与数字前缀章节；
- 空输入友好报错；
- 内联样式、品牌色、SECTION/KEY POINT 渲染；
- 示例文章结构与字数有效性。

## 4. 端到端实测结果（demo/qa-result.json）

```json
{
  "structure": {
    "sections": 10,
    "paragraphs": 22,
    "hasInlineStyle": true,
    "hasBrandBlue": true,
    "hasMarker": true,
    "previewWidth": 375,
    "titleFontSize": "27px",
    "bodyFontSize": "15px",
    "bodyLineHeight": "29.25px",
    "kickerColor": "rgb(51, 103, 246)",
    "viewportWidth": 1440
  },
  "copy": {
    "buttonText": "已复制 ✓",
    "htmlLength": 5387,
    "textLength": 517,
    "hasInlineStyles": true,
    "hasFormatterMarker": true,
    "hasBrandBlue": true
  },
  "consoleErrors": []
}
```

## 5. 演示截图

- `demo/01-input.png`：排版前（原始文稿 + 空预览）；
- `demo/02-output.png`：排版后（375px 公众号预览）；
- `demo/03-copy-success.png`：复制成功状态。

## 6. 未验证边界（本次不追）

- **真实微信公众号编辑器粘贴**：本项目无公众号后台权限，不列入验收；复制载荷已自动化验证；
- **Safari/移动端剪贴板**：Chrome 已验证，其他浏览器本次不验证；
- **长文/多媒体内容**：暂不支持图片、表格、代码块等。
