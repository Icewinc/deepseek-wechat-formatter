"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  SAMPLE_ARTICLE,
  getArticleMetrics,
  parseArticle,
  renderArticleHtml,
  toPlainText,
} from "../lib/formatter.mjs";

type ParsedArticle = ReturnType<typeof parseArticle>;
type Notice = { tone: "success" | "error" | "info"; message: string };

const STYLE_RULES = [
  { index: "01", title: "标题层级", text: "27 px 深蓝标题，建立稳定的第一视觉锚点。" },
  { index: "02", title: "正文节奏", text: "15 px 正文、1.95 行高，适配手机端长文阅读。" },
  { index: "03", title: "重点表达", text: "品牌蓝重点卡片，把关键信息从段落中提出来。" },
  { index: "04", title: "发布兼容", text: "所有公众号样式均写入元素内部，复制后不依赖本站 CSS。" },
];

export default function Home() {
  const [source, setSource] = useState(SAMPLE_ARTICLE);
  const [article, setArticle] = useState<ParsedArticle | null>(null);
  const [formattedHtml, setFormattedHtml] = useState("");
  const [formattedSource, setFormattedSource] = useState("");
  const [hasCopied, setHasCopied] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const articleRef = useRef<HTMLDivElement>(null);

  const draft = useMemo(() => {
    if (!source.trim()) return null;
    try {
      const parsed = parseArticle(source);
      return { article: parsed, metrics: getArticleMetrics(parsed) };
    } catch {
      return null;
    }
  }, [source]);

  const isDirty = Boolean(article && source.trim() !== formattedSource.trim());
  const step = hasCopied ? 3 : article && !isDirty ? 2 : source.trim() ? 1 : 0;

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function updateSource(value: string) {
    setSource(value);
    setHasCopied(false);
  }

  function loadExample() {
    setSource(SAMPLE_ARTICLE);
    setArticle(null);
    setFormattedHtml("");
    setFormattedSource("");
    setHasCopied(false);
    setNotice({ tone: "info", message: "真实示例已载入，点击“一键排版”查看效果" });
  }

  function clearSource() {
    setSource("");
    setArticle(null);
    setFormattedHtml("");
    setFormattedSource("");
    setHasCopied(false);
    setNotice({ tone: "info", message: "编辑区已清空" });
  }

  function formatArticle() {
    try {
      const parsed = parseArticle(source);
      setArticle(parsed);
      setFormattedHtml(renderArticleHtml(parsed));
      setFormattedSource(source);
      setHasCopied(false);
      setNotice({ tone: "success", message: "排版完成：已应用 DeepSeek 品牌规则" });
      if (window.matchMedia("(max-width: 980px)").matches) {
        window.setTimeout(() => articleRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
      }
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "排版失败，请检查输入" });
    }
  }

  async function copyToWechat() {
    if (!article || !formattedHtml || isDirty) {
      setNotice({ tone: "error", message: isDirty ? "文稿有更新，请重新排版后再复制" : "请先完成一键排版" });
      return;
    }

    try {
      const plainText = toPlainText(article);
      if (navigator.clipboard?.write && typeof ClipboardItem !== "undefined" && window.isSecureContext) {
        const item = new ClipboardItem({
          "text/html": new Blob([formattedHtml], { type: "text/html" }),
          "text/plain": new Blob([plainText], { type: "text/plain" }),
        });
        await navigator.clipboard.write([item]);
      } else {
        legacyRichCopy(formattedHtml);
      }
      setHasCopied(true);
      setNotice({ tone: "success", message: "富文本已复制，可直接粘贴到公众号编辑器" });
    } catch {
      setHasCopied(false);
      setNotice({ tone: "error", message: "浏览器未允许复制，请选中右侧预览后手动复制" });
    }
  }

  return (
    <main className="workspace-shell" id="top">
      <header className="topbar">
        <a className="product-brand" href="#top" aria-label="返回排版器顶部">
          <span className="brand-mark" aria-hidden="true"><span /></span>
          <span>
            <strong>DeepSeek Content Studio</strong>
            <small>品牌公众号排版器 · 演示项目</small>
          </span>
        </a>
        <div className="save-state"><span /> 内容仅在当前页面处理，不会上传</div>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">WECHAT ARTICLE FORMATTER</p>
          <h1>让品牌内容，<br />保持同一种表达。</h1>
          <p className="hero-description">粘贴成稿，一键统一标题、正文、间距、配色与重点样式。</p>
        </div>
        <div className="workflow" aria-label="使用流程">
          <span className={step >= 1 ? "is-active" : ""}><b>01</b>粘贴内容</span>
          <i aria-hidden="true" />
          <span className={step >= 2 ? "is-active" : ""}><b>02</b>一键排版</span>
          <i aria-hidden="true" />
          <span className={step >= 3 ? "is-active" : ""}><b>03</b>复制发布</span>
        </div>
      </section>

      <section className="editor-grid" aria-label="公众号排版工作区">
        <article className="panel source-panel">
          <header className="panel-heading">
            <div className="panel-title"><span className="panel-index">01</span><h2>原始文稿</h2></div>
            <div className="panel-actions">
              <button className="text-button muted" type="button" onClick={clearSource} disabled={!source}>清空</button>
              <button className="text-button" type="button" onClick={loadExample}>载入示例</button>
            </div>
          </header>

          <div className="editor-meta">
            <span>{draft?.metrics.characters ?? 0} 字</span>
            <span>预计阅读 {draft?.metrics.minutes ?? 0} 分钟</span>
            {isDirty && <span className="dirty-state">文稿有更新</span>}
          </div>

          <textarea
            aria-label="原始文章内容"
            value={source}
            onChange={(event) => updateSource(event.target.value)}
            placeholder={"粘贴写好的文章内容…\n\n第一行会识别为主标题；也支持 ## 小标题、- 列表、> 引用和“重点：”重点卡片。"}
            spellCheck="false"
          />

          <div className="syntax-hints" aria-label="支持的内容结构">
            <span><b>##</b> 小标题</span>
            <span><b>−</b> 列表</span>
            <span><b>&gt;</b> 引用</span>
            <span><b>重点：</b> 重点卡片</span>
          </div>

          <footer className="source-footer">
            <div className="recognition" title="自动识别到的文章结构">
              <span className="recognition-dot" />
              {draft ? draft.metrics.recognized.join(" · ") : "等待输入内容"}
            </div>
            <button className="primary-button" type="button" onClick={formatArticle} disabled={!source.trim()}>
              一键排版 <b aria-hidden="true">→</b>
            </button>
          </footer>
        </article>

        <article className="panel preview-panel" ref={articleRef}>
          <header className="panel-heading">
            <div className="panel-title"><span className="panel-index">02</span><h2>公众号预览</h2></div>
            <span className="viewport-label">375 px</span>
          </header>
          <div className="phone-stage">
            {article ? (
              <div className={isDirty ? "wechat-page is-stale" : "wechat-page"} data-testid="article-preview" dangerouslySetInnerHTML={{ __html: formattedHtml }} />
            ) : (
              <div className="preview-empty">
                <span className="empty-orbit" aria-hidden="true"><i /></span>
                <strong>等待一键排版</strong>
                <p>左侧文稿不会实时改变预览。<br />确认内容后点击“一键排版”。</p>
                <div><span />固定品牌规则<span /></div>
              </div>
            )}
            {isDirty && <div className="stale-mask"><span>文稿已更新</span><button type="button" onClick={formatArticle}>重新排版</button></div>}
          </div>
          <footer className="preview-footer">
            <span className={article && !isDirty ? "ready-state" : "waiting-state"}>
              <b /> {article ? (isDirty ? "等待重新排版" : "样式已应用") : "等待生成预览"}
            </span>
            <button className={hasCopied ? "secondary-button is-copied" : "secondary-button"} type="button" onClick={copyToWechat} disabled={!article || isDirty}>
              {hasCopied ? "已复制 ✓" : "复制到公众号"}
            </button>
          </footer>
        </article>
      </section>

      <section className="brand-rules" aria-labelledby="rules-title">
        <header>
          <div>
            <p className="eyebrow">LOCKED BRAND SYSTEM</p>
            <h2 id="rules-title">一套固定规则，减少每次排版的判断成本。</h2>
          </div>
          <span>DeepSeek 专属模板 · v1.0</span>
        </header>
        <div className="rule-grid">
          {STYLE_RULES.map((rule) => (
            <article key={rule.index}>
              <span>{rule.index}</span>
              <h3>{rule.title}</h3>
              <p>{rule.text}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="page-footer">
        <p>本页面为独立演示项目，与 DeepSeek 官方无隶属或授权关系；未使用官方 LOGO。</p>
        <p>最佳体验：最新版 Chrome / Edge / Safari · 复制富文本需 localhost 或 HTTPS</p>
      </footer>

      <div className={notice ? `toast toast-${notice.tone}` : "toast"} role="status" aria-live="polite" aria-hidden={!notice}>
        <span>{notice?.tone === "error" ? "!" : notice?.tone === "info" ? "i" : "✓"}</span>
        {notice?.message}
      </div>
    </main>
  );
}

function legacyRichCopy(html: string) {
  const container = document.createElement("div");
  container.setAttribute("contenteditable", "true");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.innerHTML = html;
  document.body.appendChild(container);

  const range = document.createRange();
  range.selectNodeContents(container);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
  const copied = document.execCommand("copy");
  selection?.removeAllRanges();
  container.remove();
  if (!copied) throw new Error("legacy copy failed");
}
