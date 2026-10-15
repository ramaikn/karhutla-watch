import type { MapAppearance } from "./basemap";

const choices: MapAppearance[] = ["dark", "natural", "clouds"];

export function initializeMapAppearance(onChange: (appearance: MapAppearance) => void): void {
  for (const appearance of choices) {
    document.getElementById(`map-${appearance}`)!.addEventListener("click", () => {
      for (const choice of choices) document.getElementById(`map-${choice}`)!.setAttribute("aria-pressed", String(choice === appearance));
      onChange(appearance);
    });
  }
}
