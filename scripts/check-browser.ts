import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

// Chrome headless dengan remote debugging harus sudah berjalan di port ini.
const port = process.env.BROWSER_DEBUG_PORT || "9223";
const url = process.argv[2] || "http://127.0.0.1:5181/";
const target = await (await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`, { method: "PUT" })).json() as { id: string; webSocketDebuggerUrl: string };
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise<void>((resolve, reject) => { socket.addEventListener("open", () => resolve(), { once: true }); socket.addEventListener("error", reject, { once: true }); });
let sequence = 0;
const pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void }>();
const deadlines = new Map<number, ReturnType<typeof setTimeout>>();
const errors: string[] = [];
socket.addEventListener("message", (event) => {
  const message = JSON.parse(String(event.data));
  if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails.text);
  if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") errors.push(message.params.args.map((arg: any) => arg.value || arg.description).join(" "));
  if (!message.id) return;
  const request = pending.get(message.id);
  clearTimeout(deadlines.get(message.id)); deadlines.delete(message.id);
  pending.delete(message.id);
  if (message.error) request?.reject(new Error(message.error.message)); else request?.resolve(message.result);
});
function send(method: string, params: object = {}): Promise<any> {
  const id = ++sequence;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    deadlines.set(id, setTimeout(() => { pending.delete(id); deadlines.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 40_000));
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression: string): Promise<any> {
  const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}
function assert(condition: boolean, message: string): void { if (!condition) throw new Error(message); }
async function capture(name: string): Promise<void> {
  const image = await send("Page.captureScreenshot", { format: "png" });
  const directory = resolve(import.meta.dir, "../.runtime/ui-check");
  await mkdir(directory, { recursive: true });
  await Bun.write(resolve(directory, `${name}.png`), Buffer.from(image.data, "base64"));
}
try {
  await send("Runtime.enable"); await send("Page.enable");
  for (const width of [320, 390, 700, 768, 1024, 1440]) {
    const mobile = width <= 700;
    await send("Emulation.setDeviceMetricsOverride", { width, height: 844, deviceScaleFactor: 1, mobile });
    await send("Page.navigate", { url });
    assert(await evaluate(`new Promise(resolve => { const timer = setInterval(() => { const count = document.getElementById('count')?.textContent; if (count && count !== '…' && document.querySelector('.maplibregl-canvas')) { clearInterval(timer); clearTimeout(deadline); resolve(true); } }, 100); const deadline = setTimeout(() => { clearInterval(timer); resolve(false); }, 30000); })`), `Peta atau snapshot tidak siap pada ${width}`);
    const geometry = await evaluate(`(() => { const toolbar = document.querySelector('.map-toolbar').getBoundingClientRect(); const summary = document.querySelector('.map-summary').getBoundingClientRect(); return { width: innerWidth, documentWidth: document.documentElement.scrollWidth, toolbarBottom: toolbar.bottom, summaryTop: summary.top }; })()`);
    assert(geometry.documentWidth === width, `Overflow pada ${width}: ${JSON.stringify(geometry)}`);
    assert(geometry.summaryTop >= geometry.toolbarBottom, `Kartu deteksi menabrak header pada ${width}`);
    const appearanceControls = await evaluate(`(() => { const box = document.querySelector('.map-appearance').getBoundingClientRect(); const zoom = document.querySelector('.maplibregl-ctrl-group').getBoundingClientRect(); const stage = document.getElementById('peta').getBoundingClientRect(); const summary = document.querySelector('.map-summary').getBoundingClientRect(); return { visible: box.top >= zoom.bottom && box.bottom < stage.bottom && box.left >= 0 && box.right <= innerWidth, avoidsSummary: box.left >= summary.right || box.top >= summary.bottom, active: document.querySelector('.map-appearance [aria-pressed="true"]').id }; })()`);
    assert(appearanceControls.visible && appearanceControls.avoidsSummary && appearanceControls.active === "map-dark", `Ikon mode bertabrakan atau default berubah pada ${width}: ${JSON.stringify(appearanceControls)}`);
    const countBeforeMode = await evaluate("document.getElementById('count').textContent");
    for (const appearance of ["natural", "clouds", "dark"]) {
      await evaluate(`document.getElementById('map-${appearance}').click()`);
      assert(await evaluate(`document.querySelectorAll('.map-appearance [aria-pressed="true"]').length === 1 && document.getElementById('map-${appearance}').getAttribute('aria-pressed') === 'true'`), `Ikon ${appearance} tidak aktif pada ${width}`);
      assert(await evaluate("document.getElementById('count').textContent") === countBeforeMode, `Mode mengubah hitungan deteksi pada ${width}`);
      await evaluate("document.getElementById('view-heatmap').click()");
      assert(await evaluate("document.getElementById('view-heatmap').getAttribute('aria-pressed') === 'true' && !document.getElementById('heatmap-legend').hidden"), `Heatmap gagal setelah mode ${appearance} pada ${width}`);
      await evaluate("document.getElementById('view-points').click()");
    }
    if (mobile) {
      const compact = await evaluate(`(() => { const bounds = document.querySelector('.map-toolbar').getBoundingClientRect(); const controls = ['.brand', '.filter-options > summary', '#open-about'].map(selector => document.querySelector(selector).getBoundingClientRect()); return { height: bounds.height, aligned: controls.every(box => Math.abs(box.top - controls[0].top) < 2), contained: controls.every(box => box.left >= bounds.left && box.right <= bounds.right), iconVisible: getComputedStyle(document.querySelector('#open-about .toolbar-icon')).display !== 'none' }; })()`);
      assert(compact.height <= 100 && compact.aligned && compact.contained && compact.iconVisible, `Header mobile tidak ringkas pada ${width}: ${JSON.stringify(compact)}`);
      await evaluate("document.querySelector('.filter-options > summary').click()");
      const popover = await evaluate(`(() => { const box = document.querySelector('.filter-popover').getBoundingClientRect(); return { open: document.querySelector('.filter-options').open, visible: box.left >= 0 && box.right <= innerWidth }; })()`);
      assert(popover.open && popover.visible, `Filter terpotong pada ${width}`);
      await evaluate("document.querySelector('.filter-options > summary').click()");
    }
    for (const panel of ["ranking", "detections", "weather", "sources"]) {
      await evaluate(`document.querySelector('[data-panel="${panel}"]').click()`);
      const state = await evaluate(`(() => { const drawer = document.getElementById('detail-panel'); return { detailVisible: !drawer.hidden, newsVisible: !document.getElementById('berita').hidden, belowMap: drawer.getBoundingClientRect().top >= document.getElementById('peta').getBoundingClientRect().bottom }; })()`);
      assert(state.detailVisible, `Panel ${panel} tidak terbuka pada ${width}`);
      if (mobile) assert(!state.newsVisible && state.belowMap, `Panel ${panel} tidak mengganti berita di bawah peta pada ${width}`);
    }
    if (mobile) {
      await evaluate("document.getElementById('toggle-news').click()");
      assert(await evaluate("!document.getElementById('berita').hidden && document.getElementById('detail-panel').hidden"), `Tab berita gagal pada ${width}`);
      await capture(`mobile-${width}`);
    }
    await evaluate("document.getElementById('open-about').click()");
    const dialog = await evaluate(`(() => { const dialog = document.getElementById('about-dialog'); const bounds = dialog.getBoundingClientRect(); return { open: dialog.open, centered: Math.abs(bounds.left + bounds.width / 2 - innerWidth / 2) < 2 && Math.abs(bounds.top + bounds.height / 2 - innerHeight / 2) < 2, links: dialog.querySelectorAll('a').length }; })()`);
    assert(dialog.open && dialog.centered && dialog.links === 4, `Dialog About gagal pada ${width}`);
    if (width === 390 || width === 1440) await capture(`about-${width}`);
    await evaluate("document.getElementById('close-about').click()");
    await evaluate("new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))");
    assert(await evaluate("!document.getElementById('about-dialog').open && document.activeElement.id === 'open-about'"), `Penutupan About gagal pada ${width}`);
    console.log(`OK ${width}px: tiga mode peta, heatmap, header, panel, About, dan fokus.`);
  }
  assert(errors.length === 0, `Kesalahan browser: ${errors.join("; ")}`);
} finally {
  for (const deadline of deadlines.values()) clearTimeout(deadline);
  await fetch(`http://127.0.0.1:${port}/json/close/${target.id}`, { signal: AbortSignal.timeout(5_000) }).catch(() => {});
  socket.close();
}
