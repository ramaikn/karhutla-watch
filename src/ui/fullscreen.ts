// Layar penuh memakai kelas CSS agar tetap bekerja di peramban tanpa Fullscreen API (mis. iPhone);
// API native ditambahkan di atasnya untuk menyembunyikan bilah peramban.
export function initializeFullscreen(target: HTMLElement, button: HTMLButtonElement): void {
  let native = false;

  function render(active: boolean): void {
    target.classList.toggle("is-fullscreen", active);
    button.setAttribute("aria-pressed", String(active));
    const label = active ? "Keluar dari layar penuh" : "Peta layar penuh";
    button.setAttribute("aria-label", label);
    button.title = label;
  }

  async function enter(): Promise<void> {
    render(true);
    try {
      await target.requestFullscreen?.();
      native = Boolean(document.fullscreenElement);
    } catch (error) {
      console.warn("Fullscreen API ditolak, memakai mode layar penuh CSS", error);
    }
  }

  async function exit(): Promise<void> {
    render(false);
    if (native && document.fullscreenElement) await document.exitFullscreen().catch(() => undefined);
    native = false;
  }

  button.addEventListener("click", () => { void (target.classList.contains("is-fullscreen") ? exit() : enter()); });
  // Pengguna dapat keluar lewat Esc bawaan peramban; sinkronkan tampilan kita.
  document.addEventListener("fullscreenchange", () => {
    if (native && !document.fullscreenElement) { native = false; render(false); }
  });
  // Mode CSS tidak mendapat Esc dari peramban.
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !native && target.classList.contains("is-fullscreen")) void exit();
  });
}
