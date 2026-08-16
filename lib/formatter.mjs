export const SAMPLE_ARTICLE = `DeepSeek-V4-Pro 正式版上线
让智能体能力再进一步

导语：2026 年 8 月，DeepSeek-V4-Pro 正式版上线。新版进一步强化 Agent 能力，并支持 Responses API 与 Codex 接入，目前已覆盖网页、App 和 API 服务。

## 面向更完整的 Agent 工作流

从理解任务、调用工具到整理交付，复杂工作往往不是一次回答就能完成。新版本更关注连续执行，让模型在多步骤任务里保持稳定的目标和上下文。

重点：对内容团队而言，能力升级的意义不只是“回答更聪明”，而是让资料整理、内容生产和结果检查形成一条更顺畅的工作链路。

- 更适合处理包含多个步骤的复杂任务
- 支持 Responses API，方便接入现有应用
- 网页、App 与 API 服务均可使用

> 让复杂任务更容易拆解，也让每一步交付更容易检查。

## 从模型升级到真实使用

技术发布需要被准确理解，也需要被清晰表达。我们希望通过更稳定的产品能力，让开发者和普通用户都能把注意力放回真正需要解决的问题。

## 继续探索

每一次版本更新，都是一次新的起点。欢迎在真实任务中体验 DeepSeek-V4-Pro，并把你的建议告诉我们。`;

const HEADING_PATTERN = /^(?:#{2,3}\s+|(?:[一二三四五六七八九十]+、)|(?:0?\d{1,2}[.、｜|]\s*))(.+)$/;
const BULLET_PATTERN = /^(?:[-*•·]|\d+[.)、])\s*(.+)$/;
const CALLOUT_PATTERN = /^(?:重点|关键|亮点|提示)\s*[：:]\s*(.+)$/;
const LEAD_PATTERN = /^(?:导语|摘要|引言)\s*[：:]\s*(.+)$/;

export function normalizeText(input) {
  return String(input ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/[\t\u00a0]+/g, " ")
    .replace(/[ ]+$/gm, "")
    .trim();
}

export function parseArticle(input) {
  const source = normalizeText(input);
  if (!source) {
    throw new Error("请先粘贴文章内容");
  }

  const lines = source.split("\n").map((line) => line.trim());
  const meaningful = lines.filter(Boolean);
  const rawTitle = meaningful[0] ?? "";
  const title = rawTitle.replace(/^#\s+/, "");
  let cursor = 1;
  let subtitle = "";
  let lead = "";

  if (isLikelySubtitle(meaningful[cursor] ?? "")) {
    subtitle = meaningful[cursor];
    cursor += 1;
  }

  const blocks = [];
  while (cursor < meaningful.length) {
    const line = meaningful[cursor];
    const leadMatch = line.match(LEAD_PATTERN);
    if (leadMatch && !lead) {
      lead = leadMatch[1];
      cursor += 1;
      continue;
    }

    const headingMatch = line.match(HEADING_PATTERN);
    if (headingMatch) {
      blocks.push({ type: "heading", text: headingMatch[1] });
      cursor += 1;
      continue;
    }

    const calloutMatch = line.match(CALLOUT_PATTERN);
    if (calloutMatch) {
      blocks.push({ type: "callout", text: calloutMatch[1] });
      cursor += 1;
      continue;
    }

    if (/^>\s*/.test(line)) {
      blocks.push({ type: "quote", text: line.replace(/^>\s*/, "") });
      cursor += 1;
      continue;
    }

    if (line === "---" || line === "———") {
      blocks.push({ type: "divider" });
      cursor += 1;
      continue;
    }

    const firstBullet = line.match(BULLET_PATTERN);
    if (firstBullet) {
      const items = [];
      while (cursor < meaningful.length) {
        const bullet = meaningful[cursor].match(BULLET_PATTERN);
        if (!bullet) break;
        items.push(bullet[1]);
        cursor += 1;
      }
      blocks.push({ type: "list", items });
      continue;
    }

    blocks.push({ type: "paragraph", text: line });
    cursor += 1;
  }

  return { source, title, subtitle, lead, blocks };
}

export function getArticleMetrics(inputOrArticle) {
  const article = typeof inputOrArticle === "string" ? parseArticle(inputOrArticle) : inputOrArticle;
  const characters = article.source.replace(/\s/g, "").length;
  const counts = article.blocks.reduce(
    (result, block) => {
      result[block.type] = (result[block.type] ?? 0) + 1;
      return result;
    },
    {},
  );
  const recognized = ["标题"];
  if (article.subtitle) recognized.push("副标题");
  if (article.lead) recognized.push("导语");
  if (counts.heading) recognized.push(`${counts.heading} 个章节`);
  if (counts.list) recognized.push("列表");
  if (counts.callout) recognized.push("重点卡片");
  if (counts.quote) recognized.push("引用");

  return {
    characters,
    minutes: Math.max(1, Math.ceil(characters / 400)),
    counts,
    recognized,
  };
}

export function toPlainText(article) {
  return article.source;
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderInline(value) {
  const tokens = [];
  const protectedText = String(value)
    .replace(/\*\*(.+?)\*\*/g, (_, text) => {
      const token = `\uE000${tokens.length}\uE001`;
      tokens.push(`<strong style="font-weight:700;color:#173B8F;">${escapeHtml(text)}</strong>`);
      return token;
    })
    .replace(/\[\[(.+?)\]\]/g, (_, text) => {
      const token = `\uE000${tokens.length}\uE001`;
      tokens.push(`<span style="color:#173B8F;font-weight:700;background:linear-gradient(transparent 62%,#DCE7FF 62%);">${escapeHtml(text)}</span>`);
      return token;
    });

  let html = escapeHtml(protectedText).replace(
    /DeepSeek(?:-[A-Za-z0-9.]+)*/gi,
    (name) => `<strong style="font-weight:700;color:#2F62E9;">${name}</strong>`,
  );
  html = html.replace(/\uE000(\d+)\uE001/g, (_, index) => tokens[Number(index)] ?? "");
  return html;
}

export function renderArticleHtml(article) {
  let chapter = 0;
  const blockHtml = article.blocks
    .map((block) => {
      if (block.type === "heading") {
        chapter += 1;
        return `<section style="margin:38px 0 20px;padding:0;box-sizing:border-box;">
  <p style="margin:0 0 9px;padding:0;color:#2F62E9;font-size:11px;line-height:1.2;font-weight:700;letter-spacing:2px;">SECTION ${String(chapter).padStart(2, "0")}</p>
  <p style="margin:0;padding:0 0 12px;color:#172B55;font-size:20px;line-height:1.45;font-weight:700;border-bottom:1px solid #DFE7F5;">${renderInline(block.text)}</p>
</section>`;
      }
      if (block.type === "callout") {
        return `<section style="margin:24px 0;padding:18px 18px 17px;background:#F2F6FF;border-left:4px solid #3367F6;border-radius:2px;box-sizing:border-box;">
  <p style="margin:0 0 7px;padding:0;color:#2F62E9;font-size:11px;line-height:1.4;font-weight:700;letter-spacing:1.5px;">KEY POINT</p>
  <p style="margin:0;padding:0;color:#29436F;font-size:15px;line-height:1.85;font-weight:500;text-align:justify;">${renderInline(block.text)}</p>
</section>`;
      }
      if (block.type === "quote") {
        return `<section style="margin:26px 0;padding:17px 19px;background:#F7F9FC;border-top:1px solid #E4EAF3;border-bottom:1px solid #E4EAF3;box-sizing:border-box;">
  <p style="margin:0;padding:0;color:#536783;font-size:14px;line-height:1.85;font-style:italic;text-align:center;">“ ${renderInline(block.text)} ”</p>
</section>`;
      }
      if (block.type === "list") {
        const items = block.items
          .map(
            (item, index) => `<p style="margin:0 0 ${index === block.items.length - 1 ? 0 : 13}px;padding:0;color:#3B4A60;font-size:15px;line-height:1.75;text-align:justify;"><span style="display:inline-block;margin-right:10px;width:20px;height:20px;border-radius:10px;background:#EAF0FF;color:#2F62E9;font-size:10px;line-height:20px;font-weight:700;text-align:center;vertical-align:2px;">${index + 1}</span>${renderInline(item)}</p>`,
          )
          .join("");
        return `<section style="margin:22px 0;padding:18px;background:#FBFCFE;border:1px solid #E6EBF3;border-radius:4px;box-sizing:border-box;">${items}</section>`;
      }
      if (block.type === "divider") {
        return `<p style="margin:30px auto;padding:0;width:42px;height:3px;background:#3367F6;font-size:0;line-height:0;">&nbsp;</p>`;
      }
      return `<p style="margin:0 0 19px;padding:0;color:#3B4A60;font-size:15px;line-height:1.95;letter-spacing:.3px;text-align:justify;">${renderInline(block.text)}</p>`;
    })
    .join("");

  const subtitle = article.subtitle
    ? `<p style="margin:9px 0 0;padding:0;color:#8090AA;font-size:13px;line-height:1.7;letter-spacing:.5px;">${renderInline(article.subtitle)}</p>`
    : "";
  const lead = article.lead
    ? `<section style="margin:28px 0 30px;padding:17px 18px;background:#F7F9FD;border-radius:4px;box-sizing:border-box;"><p style="margin:0;padding:0;color:#53647C;font-size:14px;line-height:1.9;text-align:justify;">${renderInline(article.lead)}</p></section>`
    : `<p style="margin:0 0 28px;padding:0;height:1px;background:#E1E8F3;font-size:0;line-height:0;">&nbsp;</p>`;

  return `<section data-deepseek-formatter="v1" style="margin:0 auto;padding:34px 22px 30px;max-width:100%;background:#FFFFFF;color:#172B55;font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',Arial,sans-serif;box-sizing:border-box;word-break:break-word;">
  <section style="margin:0 0 6px;padding:0;box-sizing:border-box;">
    <p style="margin:0 0 14px;padding:0;color:#3367F6;font-size:10px;line-height:1.2;font-weight:700;letter-spacing:2.2px;">DEEPSEEK · PRODUCT UPDATE</p>
    <p style="margin:0;padding:0;color:#172B55;font-size:27px;line-height:1.35;font-weight:700;letter-spacing:-.5px;">${renderInline(article.title)}</p>
    ${subtitle}
    <p style="margin:22px 0 0;padding:0;width:64px;height:4px;background:#3367F6;font-size:0;line-height:0;">&nbsp;</p>
  </section>
  ${lead}
  ${blockHtml}
  <section style="margin:38px 0 0;padding:24px 0 0;border-top:1px solid #E1E8F3;text-align:center;box-sizing:border-box;">
    <p style="margin:0 0 8px;padding:0;color:#3367F6;font-size:10px;line-height:1;font-weight:700;letter-spacing:3px;">DEEPSEEK</p>
    <p style="margin:0;padding:0;color:#9AA6B9;font-size:10px;line-height:1.5;letter-spacing:1px;">INTO THE UNKNOWN</p>
  </section>
</section>`;
}

function isLikelySubtitle(line) {
  if (!line || line.length > 36) return false;
  if (HEADING_PATTERN.test(line) || LEAD_PATTERN.test(line) || CALLOUT_PATTERN.test(line)) return false;
  if (/^(?:[-*•·>]|\d+[.)、])/.test(line)) return false;
  return !/[。！？!?；;：:]$/.test(line);
}
