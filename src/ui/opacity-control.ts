import { LEVEL_NAMES, loadLevel, nextLevel, saveLevel, type OpacityLevel } from "./opacity-settings";

function safeStorage(): Storage | undefined {
  try { return window.localStorage; } catch { return undefined; }
}

// Satu tombol berputar normal → samar → sangat samar; permukaan UI mengikuti variabel CSS `--mix`.
export function initializeOpacityControl(root: HTMLElement): void {
  const button = document.getElementById("toggle-opacity") as HTMLButtonElement;
  const storage = safeStorage();
  let level: OpacityLevel = loadLevel(storage);

  function render(): void {
    root.style.setProperty("--mix", `${level}%`);
    const label = `Transparansi komponen: ${LEVEL_NAMES[level]}. Ubah menjadi ${LEVEL_NAMES[nextLevel(level)]}`;
    button.setAttribute("aria-label", label);
    button.title = label;
    button.dataset.level = String(level);
  }

  button.addEventListener("click", () => { level = nextLevel(level); saveLevel(storage, level); render(); });
  render();
}
