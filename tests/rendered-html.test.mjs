import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import test from "node:test";

const previewMarker = /codex-preview|Your site is taking shape|Building your site/i;

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the product page with correct metadata", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>DeepSeek Content Studio｜品牌公众号排版器<\/title>/i);
  assert.match(
    html,
    /粘贴文章，一键统一标题、正文、间距、配色与重点样式，并复制到公众号编辑器/,
  );
  assert.match(html, /og:title/i);
  assert.match(html, /og:image/i);
  assert.match(html, /让品牌内容/);
  assert.match(html, /DeepSeek Content Studio/);
  assert.doesNotMatch(html, previewMarker);
});

test("keeps the deployable share image in the public folder", async () => {
  await access(new URL("../public/og.png", import.meta.url));
});
