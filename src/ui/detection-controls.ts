export type OverlayVisibility = "normal" | "dim" | "off";

export function nextVisibility(current: OverlayVisibility): OverlayVisibility {
  return current === "normal" ? "dim" : current === "dim" ? "off" : "normal";
}

export function overlayOpacity(visibility: OverlayVisibility): number {
  return visibility === "normal" ? 1 : visibility === "dim" ? 0.3 : 0;
}

export function initializeDetectionControls(onChange: (visibility: OverlayVisibility) => void): void {
  const states = { normal: "normal", dim: "samar", off: "tersembunyi" };
  const button = document.getElementById("toggle-overlay")!;
  let visibility: OverlayVisibility = "normal";
  button.addEventListener("click", () => {
    visibility = nextVisibility(visibility);
    const label = `Lapisan deteksi: ${states[visibility]}. Ubah menjadi ${states[nextVisibility(visibility)]}`;
    button.setAttribute("aria-label", label);
    button.setAttribute("title", label);
    button.dataset.visibility = visibility;
    onChange(visibility);
  });
}
