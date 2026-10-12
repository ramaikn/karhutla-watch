import type { HotspotMap } from "./map";
import { initializeAbout } from "./about";
import { adaptWorkspace, selectPanel, type DetailPanel, type WorkspaceState } from "./workspace-state";

export function initializeWorkspace(getMap: () => HotspotMap | null): void {
  const workspace = document.querySelector<HTMLElement>(".workspace")!;
  const stage = document.getElementById("peta")!;
  const toolbar = document.querySelector<HTMLElement>(".map-toolbar")!;
  const drawer = document.getElementById("detail-panel")!;
  const title = document.getElementById("detail-title")!;
  const news = document.getElementById("berita")!;
  const newsToggle = document.getElementById("toggle-news")!;
  const navigation = document.getElementById("panel-navigation")!;
  const buttons = [...document.querySelectorAll<HTMLButtonElement>("[data-panel]")];
  const tabs = [...buttons, newsToggle];
  const mobile = matchMedia("(max-width: 700px)");
  const titles: Record<DetailPanel, string> = { ranking: "Peringkat wilayah", detections: "Deteksi terbaru", weather: "Prakiraan cuaca", sources: "Sumber" };
  let state: WorkspaceState = { panel: null, newsVisible: true };

  function render(): void {
    drawer.hidden = !state.panel;
    news.hidden = !state.newsVisible;
    workspace.classList.toggle("news-hidden", news.hidden);
    for (const button of buttons) {
      const active = button.dataset.panel === state.panel;
      button.setAttribute("aria-expanded", String(active));
      document.getElementById(`${button.dataset.panel}-panel`)!.hidden = !active;
    }
    newsToggle.setAttribute("aria-expanded", String(state.newsVisible));
    for (const tab of tabs) {
      if (mobile.matches) {
        tab.setAttribute("role", "tab");
        tab.setAttribute("aria-selected", tab.getAttribute("aria-expanded")!);
        tab.tabIndex = tab.getAttribute("aria-selected") === "true" ? 0 : -1;
      } else {
        tab.removeAttribute("role"); tab.removeAttribute("aria-selected"); tab.tabIndex = 0;
      }
    }
    if (state.panel) title.textContent = titles[state.panel];
    getMap()?.setNewsVisible(state.newsVisible);
  }

  function activate(panel: DetailPanel | "news"): void {
    state = selectPanel(state, panel, mobile.matches);
    render();
    drawer.scrollTop = 0;
    if (!mobile.matches && state.panel && panel !== "news") document.getElementById("close-detail")!.focus();
  }

  function updateLayout(): void {
    state = adaptWorkspace(state, mobile.matches);
    // Pada mobile, detail dan berita berbagi satu tempat di bawah peta.
    if (mobile.matches) workspace.append(drawer);
    else stage.insertBefore(drawer, document.querySelector(".map-legend"));
    if (mobile.matches) navigation.setAttribute("role", "tablist"); else navigation.removeAttribute("role");
    for (const panel of [drawer, news]) {
      if (mobile.matches) panel.setAttribute("role", "tabpanel"); else panel.removeAttribute("role");
    }
    render();
  }

  for (const button of buttons) button.addEventListener("click", () => activate(button.dataset.panel as DetailPanel));
  newsToggle.addEventListener("click", () => activate("news"));
  document.getElementById("close-detail")!.addEventListener("click", () => {
    const button = buttons.find((item) => item.dataset.panel === state.panel);
    state = mobile.matches ? { panel: null, newsVisible: true } : { ...state, panel: null };
    render(); (mobile.matches ? newsToggle : button)?.focus();
  });
  document.getElementById("close-news")!.addEventListener("click", () => activate("news"));
  navigation.addEventListener("keydown", (event) => {
    if (!mobile.matches || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const index = tabs.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    tabs[next].click(); tabs[next].focus();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || (document.getElementById("about-dialog") as HTMLDialogElement).open) return;
    if (state.panel) document.getElementById("close-detail")!.click();
    document.querySelector<HTMLDetailsElement>(".filter-options")!.open = false;
  });
  document.querySelectorAll("#region, #hours, #confidence, #sensor").forEach((select) => select.addEventListener("change", () => {
    document.querySelector<HTMLDetailsElement>(".filter-options")!.open = false;
  }));
  new ResizeObserver(() => {
    workspace.style.setProperty("--toolbar-bottom", `${Math.ceil(toolbar.offsetTop + toolbar.getBoundingClientRect().height)}px`);
  }).observe(toolbar);
  mobile.addEventListener("change", updateLayout);
  updateLayout();
  initializeAbout();
}
