import type { HotspotMap } from "./map";

// Panel tambahan tidak mengubah filter atau posisi berita pada ponsel.
export function initializeWorkspace(getMap: () => HotspotMap | null): void {
  const drawer = document.getElementById("detail-panel")!;
  const title = document.getElementById("detail-title")!;
  const news = document.getElementById("berita")!;
  const newsToggle = document.getElementById("toggle-news")!;
  const buttons = [...document.querySelectorAll<HTMLButtonElement>("[data-panel]")];
  const titles: Record<string, string> = { ranking: "Peringkat wilayah", detections: "Deteksi terbaru", weather: "Prakiraan cuaca", sources: "Sumber" };
  let current: string | null = null;

  function openPanel(panel: string | null): void {
    current = panel;
    drawer.hidden = !panel;
    for (const button of buttons) {
      const active = button.dataset.panel === panel;
      button.setAttribute("aria-expanded", String(active));
      document.getElementById(`${button.dataset.panel}-panel`)!.hidden = !active;
    }
    if (panel) { title.textContent = titles[panel]; drawer.scrollTop = 0; document.getElementById("close-detail")!.focus(); }
  }

  function toggleNews(): void {
    news.hidden = !news.hidden;
    newsToggle.setAttribute("aria-expanded", String(!news.hidden));
    document.querySelector(".workspace")!.classList.toggle("news-hidden", news.hidden);
    getMap()?.setNewsVisible(!news.hidden);
    if (news.hidden) newsToggle.focus();
  }

  for (const button of buttons) button.addEventListener("click", () => openPanel(current === button.dataset.panel ? null : button.dataset.panel!));
  document.getElementById("close-detail")!.addEventListener("click", () => {
    const button = buttons.find((item) => item.dataset.panel === current);
    openPanel(null); button?.focus();
  });
  newsToggle.addEventListener("click", toggleNews);
  document.getElementById("close-news")!.addEventListener("click", toggleNews);
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const button = buttons.find((item) => item.dataset.panel === current);
    openPanel(null); button?.focus();
    document.querySelector<HTMLDetailsElement>(".filter-options")!.open = false;
  });
  document.querySelectorAll("#region, #hours, #confidence, #sensor").forEach((select) => select.addEventListener("change", () => {
    document.querySelector<HTMLDetailsElement>(".filter-options")!.open = false;
  }));
}
