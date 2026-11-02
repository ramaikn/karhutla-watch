import { element } from "./dom";
import { MIN_OPACITY, OPACITY_COMPONENTS, clampOpacity, defaultOpacity, loadOpacity, saveOpacity, type OpacityId, type OpacitySettings } from "./opacity-settings";

function safeStorage(): Storage | undefined {
  try { return window.localStorage; } catch { return undefined; }
}

// Komponen berupa permukaan dikendalikan lewat variabel CSS `--mix-<id>`; lapisan peta lewat callback.
export function initializeOpacityPanel(root: HTMLElement, onLayerChange: (scale: number) => void): void {
  const button = document.getElementById("toggle-opacity") as HTMLButtonElement;
  const panel = document.getElementById("opacity-panel")!;
  const storage = safeStorage();
  const settings: OpacitySettings = loadOpacity(storage);
  const sliders = new Map<OpacityId, { input: HTMLInputElement; value: HTMLElement }>();

  function apply(id: OpacityId): void {
    const percent = settings[id];
    if (id === "layer") onLayerChange(percent / 100);
    else root.style.setProperty(`--mix-${id}`, `${percent}%`);
    const slider = sliders.get(id)!;
    slider.input.value = String(percent);
    slider.value.textContent = `${percent}%`;
    slider.input.setAttribute("aria-valuetext", `${percent} persen`);
  }

  const heading = element("div", "opacity-heading");
  const reset = element("button", "", "Setel ulang");
  reset.type = "button";
  heading.append(element("h3", "", "Transparansi"), reset);
  panel.append(heading);

  for (const { id, label } of OPACITY_COMPONENTS) {
    const row = element("label", "opacity-row");
    const top = element("span", "opacity-label");
    const value = element("output");
    top.append(element("span", "", label), value);
    const input = element("input");
    input.type = "range"; input.min = String(MIN_OPACITY); input.max = "100"; input.step = "5";
    input.addEventListener("input", () => { settings[id] = clampOpacity(Number(input.value)); apply(id); saveOpacity(storage, settings); });
    row.append(top, input);
    panel.append(row);
    sliders.set(id, { input, value });
  }
  for (const { id } of OPACITY_COMPONENTS) apply(id);

  reset.addEventListener("click", () => {
    Object.assign(settings, defaultOpacity());
    for (const { id } of OPACITY_COMPONENTS) apply(id);
    saveOpacity(storage, settings);
  });

  function setOpen(open: boolean): void {
    panel.hidden = !open;
    button.setAttribute("aria-expanded", String(open));
  }
  button.addEventListener("click", () => setOpen(panel.hidden));
  document.addEventListener("pointerdown", (event) => {
    if (!panel.hidden && !panel.contains(event.target as Node) && !button.contains(event.target as Node)) setOpen(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) { setOpen(false); button.focus(); }
  });
}
