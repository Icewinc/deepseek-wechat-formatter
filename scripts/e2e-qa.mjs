import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { platform } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const demoDir = resolve(root, "demo");
const chromePath =
  process.env.CHROME_BIN ??
  (platform() === "darwin"
    ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    : null);

if (!chromePath) {
  throw new Error("未找到 Chrome：请设置 CHROME_BIN 环境变量");
}

const port = 9333;
const profile = `/private/tmp/deepseek-e2e-chrome-${process.pid}`;
const targetUrl = process.env.TARGET_URL ?? "http://localhost:3000/";

const chrome = spawn(
  chromePath,
  [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    "--window-size=1440,1000",
    "about:blank",
  ],
  { stdio: "ignore" },
);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForEndpoint(url, attempts = 60) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
    } catch {
      // Chrome is still starting.
    }
    await sleep(250);
  }
  throw new Error(`Chrome DevTools 端口 ${port} 未就绪`);
}

class CdpClient {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(message.error.message));
        else resolve(message.result);
        return;
      }
      const handlers = this.listeners.get(message.method) ?? [];
      handlers.forEach((handler) => handler(message.params));
    });
  }

  send(method, params = {}) {
    const id = this.nextId;
    this.nextId += 1;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  on(method, handler) {
    const handlers = this.listeners.get(method) ?? [];
    handlers.push(handler);
    this.listeners.set(method, handlers);
  }

  close() {
    this.socket.close();
  }
}

async function evaluate(cdp, expression) {
  const result = await cdp.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text ?? "页面执行失败");
  }
  return result.result.value;
}

async function waitFor(cdp, expression, label, attempts = 80) {
  for (let i = 0; i < attempts; i += 1) {
    if (await evaluate(cdp, expression)) return;
    await sleep(150);
  }
  throw new Error(`等待超时：${label}`);
}

async function clickUntil(cdp, clickExpression, waitExpression, label, attempts = 12) {
  for (let i = 0; i < attempts; i += 1) {
    await evaluate(cdp, clickExpression);
    await sleep(300);
    if (await evaluate(cdp, waitExpression)) return;
  }
  throw new Error(`点击后未出现预期状态：${label}`);
}

async function screenshot(cdp, file) {
  const { data } = await cdp.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  });
  await writeFile(file, Buffer.from(data, "base64"));
}

let consoleErrors = [];

async function main() {
  await waitForEndpoint(`http://127.0.0.1:${port}/json/version`);
  const pages = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) =>
    response.json(),
  );
  const page = pages.find((target) => target.type === "page");
  if (!page?.webSocketDebuggerUrl) {
    throw new Error("未找到可调试的页面目标");
  }
  const socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  const cdp = new CdpClient(socket);
  consoleErrors = [];

  cdp.on("Runtime.exceptionThrown", (params) => {
    consoleErrors.push(params.exceptionDetails?.text ?? "exception");
  });
  cdp.on("Log.entryAdded", (params) => {
    if (params.entry?.level === "error") consoleErrors.push(params.entry.text);
  });
  cdp.on("Network.responseReceived", (params) => {
    const status = params.response?.status ?? 0;
    if (status >= 400) {
      consoleErrors.push(`${status} ${params.response?.url ?? ""}`);
    }
  });

  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Log.enable");
  await cdp.send("Network.enable");
  await cdp.send("Page.navigate", { url: targetUrl });
  await waitFor(cdp, `document.readyState === 'complete'`, "页面加载完成");
  await sleep(1200);
  await waitFor(
    cdp,
    `document.querySelector('.primary-button') !== null`,
    "应用渲染完成",
  );
  await waitFor(
    cdp,
    `document.querySelector('textarea[aria-label="原始文章内容"]')?.value?.includes("DeepSeek-V4-Pro")`,
    "示例文章载入",
  );

  await mkdir(demoDir, { recursive: true });
  await screenshot(cdp, resolve(demoDir, "01-input.png"));

  await clickUntil(
    cdp,
    `document.querySelector('.primary-button').click()`,
    `document.querySelector('[data-testid="article-preview"]') !== null`,
    "排版结果渲染",
  );
  await waitFor(
    cdp,
    `document.querySelector('.primary-button').textContent.includes("一键排版")`,
    "排版状态稳定",
  );
  await screenshot(cdp, resolve(demoDir, "02-output.png"));

  const structure = await evaluate(
    cdp,
    `(() => {
      const page = document.querySelector('[data-testid="article-preview"]');
      const title = page?.querySelector('p[style*="font-size:27px"]');
      const body = page?.querySelector('p[style*="line-height:1.95"]');
      const kicker = page?.querySelector('p[style*="letter-spacing:2.2px"]');
      return {
        sections: page?.querySelectorAll('section').length ?? 0,
        paragraphs: page?.querySelectorAll('p').length ?? 0,
        hasInlineStyle: page?.innerHTML.includes('style="') ?? false,
        hasBrandBlue: page?.innerHTML.includes('#3367F6') ?? false,
        hasMarker: page?.innerHTML.includes('data-deepseek-formatter') ?? false,
        previewWidth: page?.getBoundingClientRect().width ?? 0,
        titleFontSize: title ? getComputedStyle(title).fontSize : "",
        bodyFontSize: body ? getComputedStyle(body).fontSize : "",
        bodyLineHeight: body ? getComputedStyle(body).lineHeight : "",
        kickerColor: kicker ? getComputedStyle(kicker).color : "",
        viewportWidth: window.innerWidth,
      };
    })()`,
  );

  const copyResult = await evaluate(
    cdp,
    `(async () => {
      window.__copiedPayload = null;
      navigator.clipboard.write = async (items) => {
        const item = items[0];
        const html = await item.getType("text/html").then((blob) => blob.text());
        const text = await item.getType("text/plain").then((blob) => blob.text());
        window.__copiedPayload = { html, text };
        return true;
      };
      document.querySelector('.secondary-button').click();
      await new Promise((resolve) => setTimeout(resolve, 350));
      return {
        buttonText: document.querySelector('.secondary-button').textContent.trim(),
        toast: document.querySelector('.toast:not([aria-hidden="true"])')?.textContent.trim() ?? "",
        payload: window.__copiedPayload,
      };
    })()`,
  );

  await screenshot(cdp, resolve(demoDir, "03-copy-success.png"));

  const result = {
    targetUrl,
    structure,
    copy: {
      buttonText: copyResult.buttonText,
      toast: copyResult.toast,
      htmlLength: copyResult.payload?.html.length ?? 0,
      textLength: copyResult.payload?.text.length ?? 0,
      hasInlineStyles: copyResult.payload?.html.includes("style=") ?? false,
      hasFormatterMarker:
        copyResult.payload?.html.includes("data-deepseek-formatter") ?? false,
      hasBrandBlue: copyResult.payload?.html.includes("#3367F6") ?? false,
    },
    consoleErrors,
    generatedAt: new Date().toISOString(),
  };

  await writeFile(
    resolve(demoDir, "qa-result.json"),
    JSON.stringify(result, null, 2),
  );
  cdp.close();
  chrome.kill();
  console.log(JSON.stringify(result, null, 2));
}

main().catch(async (error) => {
  console.error(error.stack ?? error.message);
  if (consoleErrors.length > 0) {
    console.error(`页面控制台错误（${consoleErrors.length}）：`);
    console.error(consoleErrors.join("\n"));
  }
  chrome.kill();
  process.exitCode = 1;
});
