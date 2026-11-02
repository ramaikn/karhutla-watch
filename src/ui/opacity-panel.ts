import { element } from "./dom";
import { MIN_OPACITY, clampOpacity, loadOpacity, saveOpacity } from "./opacity-settings";

function safeStorage(): Storage | undefined {
  try { return window.localStorage; } catch { return undefined; }
}

// Permukaan UI mengikuti variabel CSS `--mix`; lapisan peta lewat callback.
export function initializeOpacityPanel(root: HTMLElement, onChange: (scale: number) => void): void {
  const button = document.getElementById("toggle-opacity") as HTMLButtonElement;
  const panel = document.getElementById("opacity-panel")!;
  const storage = safeStorage();

  const heading = element("div", "opacity-heading");
  const reset = element("button", "", "Setel ulang");
  reset.type = "button";
  heading.append(element("h3", "", "Transparansi"), reset);
  const label = element("label", "opacity-row");
  const top = element("span", "opacity-label");
  const value = element("output");
  top.append(element("span", "", "Semua komponen"), value);
  const input = element("input");
  input.type = "range"; input.min = String(MIN_OPACITY); input.max = "100"; input.step = "5";
  label.append(top, input);
  panel.append(heading, label);

  function apply(percent: number): void {
    root.style.setProperty("--mix", `${percent}%`);
    onChange(percent / 100);
    input.value = String(percent);
    value.textContent = `${percent}%`;
    input.setAttribute("aria-valuetext", `${percent} persen`);
  }

  input.addEventListener("input", () => { const percent = clampOpacity(Number(input.value)); apply(percent); saveOpacity(storage, percent); });
  reset.addEventListener("click", () => { apply(100); saveOpacity(storage, 100); });
  apply(loadOpacity(storage));

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
