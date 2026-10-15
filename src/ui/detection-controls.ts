export type OverlayVisibility = "normal" | "dim" | "off";

export function nextVisibility(current: OverlayVisibility): OverlayVisibility {
  return current === "normal" ? "dim" : current === "dim" ? "off" : "normal";
}

export function overlayOpacity(visibility: OverlayVisibility): number {
  return visibility === "normal" ? 1 : visibility === "dim" ? 0.3 : 0;
}

export function initializeDetectionControls(onChange: (visibility: OverlayVisibility) => void): void {
  const states = { normal: "normal", dim: "samar", off: "tersembunyi" };
  for (const target of ["summary", "overlay"] as const) {
    const button = document.getElementById(`toggle-${target}`)!;
    let visibility: OverlayVisibility = "normal";
    button.addEventListener("click", () => {
      visibility = nextVisibility(visibility);
      const subject = target === "summary" ? "Kartu deteksi" : "Lapisan deteksi";
      const label = `${subject}: ${states[visibility]}. Ubah menjadi ${states[nextVisibility(visibility)]}`;
      button.setAttribute("aria-label", label);
      button.setAttribute("title", label);
      button.dataset.visibility = visibility;
      if (target === "summary") {
        document.querySelector<HTMLElement>(".map-summary")!.dataset.visibility = visibility;
        for (const child of document.querySelectorAll<HTMLElement>(".map-summary > :not(#toggle-summary)")) child.hidden = visibility === "off";
      } else onChange(visibility);
    });
  }
}
