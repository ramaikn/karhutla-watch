import { resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
const bun = process.execPath;
let collecting = false;
let collector: ReturnType<typeof Bun.spawn> | null = null;
let updateTask: Promise<void> | null = null;
const web = Bun.spawn([bun, "run", "dev:web"], { cwd: root, stdout: "inherit", stderr: "inherit" });

async function update(): Promise<void> {
  if (collecting) return;
  collecting = true;
  console.log("[Karhutla Watch] Memperbarui data sumber resmi…");
  try {
    collector = Bun.spawn([bun, "run", "collect"], { cwd: root, stdout: "inherit", stderr: "inherit" });
    const code = await collector.exited;
    if (code !== 0) console.error("[Karhutla Watch] Pengambilan gagal. Snapshot sebelumnya tetap tersedia.");
  } finally { collector = null; collecting = false; }
}

updateTask = update();
const schedule = setInterval(() => { updateTask = update(); }, 30 * 60_000);
function stop(): void {
  clearInterval(schedule);
  // Collector diberi kesempatan menulis snapshot dan membersihkan penguncian.
  web.kill();
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
console.log("[Karhutla Watch] Pembaruan lokal otomatis setiap 30 menit. Web membaca snapshot baru setiap menit.");
const exitCode = await web.exited;
clearInterval(schedule);
if (updateTask) await updateTask;
process.exitCode = exitCode;
