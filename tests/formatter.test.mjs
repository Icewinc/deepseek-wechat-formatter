import assert from "node:assert/strict";
import test from "node:test";
import {
  escapeHtml,
  getArticleMetrics,
  normalizeText,
  parseArticle,
  renderArticleHtml,
  SAMPLE_ARTICLE,
} from "../lib/formatter.mjs";

const FULL_SAMPLE = `DeepSeek-V4-Pro 正式版上线
让智能体能力再进一步

导语：这是一段用于测试结构识别的导语。

## 章节一
正文段落用于测试段落识别。
重点：这是需要强调的重点信息。
- 列表项一
- 列表项二
> 这是一句引用。

结尾段落。`;

test("normalizes line endings and surrounding whitespace", () => {
  const normalized = normalizeText("  第一行\r\n第二行\t第三行  \r\n");
  assert.equal(normalized, "第一行\n第二行 第三行");
});

test("escapes all dangerous characters", () => {
  assert.equal(escapeHtml(`<a href="x">&'\n`), "&lt;a href=&quot;x&quot;&gt;&amp;&#039;\n");
});

test("parses title, subtitle, lead and structured blocks", () => {
  const article = parseArticle(FULL_SAMPLE);
  assert.equal(article.title, "DeepSeek-V4-Pro 正式版上线");
  assert.equal(article.subtitle, "让智能体能力再进一步");
  assert.equal(article.lead, "这是一段用于测试结构识别的导语。");
  assert.deepEqual(
    article.blocks.map((block) => block.type),
    ["heading", "paragraph", "callout", "list", "quote", "paragraph"],
  );
  assert.equal(article.blocks[0].text, "章节一");
  assert.deepEqual(article.blocks[3].items, ["列表项一", "列表项二"]);
  assert.equal(article.blocks[4].text, "这是一句引用。");
});

test("recognizes headings with Chinese numerals and numbered prefixes", () => {
  const headingArticle = parseArticle("标题\n\n一、第一个章节\n\n1. 第二个章节\n\n正文");
  assert.deepEqual(
    headingArticle.blocks.map((block) => block.type),
    ["heading", "heading", "paragraph"],
  );
  assert.equal(headingArticle.blocks[0].text, "第一个章节");
  assert.equal(headingArticle.blocks[1].text, "第二个章节");
});

test("throws a friendly error for empty input", () => {
  assert.throws(() => parseArticle("   \n\t "), /请先粘贴文章内容/);
});

test("escapes HTML in rendered output", () => {
  const article = parseArticle(`标题\n\n<script>alert("xss")</script> & <b>标签</b>`);
  const html = renderArticleHtml(article);
  assert.doesNotMatch(html, /<script>/i);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /&quot;xss&quot;/);
  assert.doesNotMatch(html, /<b>标签<\/b>/);
});

test("renders locked inline styles suitable for WeChat paste", () => {
  const article = parseArticle(FULL_SAMPLE);
  const html = renderArticleHtml(article);
  assert.match(html, /data-deepseek-formatter="v1"/);
  assert.match(html, /style="[^"]*font-family/);
  assert.match(html, /#3367F6/);
  assert.match(html, /SECTION 01/);
  assert.match(html, /KEY POINT/);
  assert.match(html, /DEEPSEEK/);
});

test("keeps plain text and metrics stable", () => {
  const article = parseArticle(FULL_SAMPLE);
  const metrics = getArticleMetrics(article);
  assert.equal(metrics.characters, article.source.replace(/\s/g, "").length);
  assert.ok(metrics.recognized.includes("标题"));
  assert.ok(metrics.recognized.includes("副标题"));
  assert.ok(metrics.recognized.includes("导语"));
  assert.ok(metrics.recognized.includes("1 个章节"));
  assert.ok(metrics.recognized.includes("列表"));
  assert.ok(metrics.recognized.includes("重点卡片"));
  assert.ok(metrics.recognized.includes("引用"));
});

test("sample article is valid and has enough structure for a demo", () => {
  const article = parseArticle(SAMPLE_ARTICLE);
  const metrics = getArticleMetrics(article);
  assert.ok(article.title.includes("DeepSeek-V4-Pro"));
  assert.ok(metrics.characters > 300);
  assert.ok(article.blocks.some((block) => block.type === "heading"));
  assert.ok(article.blocks.some((block) => block.type === "callout"));
  assert.ok(article.blocks.some((block) => block.type === "list"));
  assert.ok(article.blocks.some((block) => block.type === "quote"));
});
