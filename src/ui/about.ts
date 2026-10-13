const githubIcon = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M12 .8a11.2 11.2 0 0 0-3.54 21.83c.56.1.77-.24.77-.54v-2.1c-3.14.68-3.8-1.34-3.8-1.34-.51-1.3-1.25-1.65-1.25-1.65-1.03-.7.08-.69.08-.69 1.14.08 1.74 1.17 1.74 1.17 1.01 1.73 2.65 1.23 3.3.94.1-.73.4-1.23.72-1.52-2.51-.29-5.15-1.26-5.15-5.59 0-1.23.44-2.23 1.16-3.02-.12-.29-.5-1.43.11-2.98 0 0 .95-.3 3.08 1.15A10.7 10.7 0 0 1 12 6.08c.95 0 1.9.13 2.79.38 2.14-1.45 3.08-1.15 3.08-1.15.61 1.55.23 2.69.11 2.98.72.79 1.16 1.79 1.16 3.02 0 4.34-2.64 5.3-5.16 5.58.41.35.77 1.03.77 2.08v3.12c0 .3.2.65.78.54A11.2 11.2 0 0 0 12 .8Z"/></svg>`;

export const aboutDialog = `
<dialog id="about-dialog" class="about-dialog surface" aria-labelledby="about-title" aria-describedby="about-description">
  <div class="section-heading"><h2 id="about-title">Karhutla Watch</h2><button id="close-about" type="button" aria-label="Tutup About">×</button></div>
  <p id="about-description">Karhutla Watch membantu memantau titik panas, kualitas udara, berita kebakaran hutan dan lahan, serta prakiraan cuaca di Indonesia.</p>
  <p>Proyek open source dengan lisensi Apache 2.0. Data berasal dari NASA FIRMS, BMKG, CAMS/Open-Meteo, dan media berita. Bukan layanan tanggap darurat.</p>
  <a class="about-project" href="https://github.com/ramaikn/karhutla-watch" target="_blank" rel="noopener noreferrer">${githubIcon}<span>Kode sumber di GitHub</span></a>
  <div class="about-author"><strong>A.M. Fathur Ramadhan</strong><span>Author</span><h3>Let’s connect</h3></div>
  <div class="about-socials" aria-label="Profil pengembang">
    <a href="https://www.linkedin.com/in/ramaikn/" target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.45 2H3.55C2.69 2 2 2.68 2 3.52v16.96C2 21.32 2.69 22 3.55 22h16.9c.86 0 1.55-.68 1.55-1.52V3.52C22 2.68 21.31 2 20.45 2ZM7.93 18.75H4.96V9.2h2.97v9.55ZM6.45 7.9a1.72 1.72 0 1 1 0-3.44 1.72 1.72 0 0 1 0 3.44Zm12.3 10.85h-2.97V14.1c0-1.11-.02-2.54-1.55-2.54-1.55 0-1.79 1.21-1.79 2.46v4.73H9.47V9.2h2.85v1.3h.04c.4-.76 1.37-1.55 2.82-1.55 3.02 0 3.57 1.99 3.57 4.57v5.23Z"/></svg><span>LinkedIn</span></a>
    <a href="https://instagram.com/ramaikn" target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg><span>Instagram</span></a>
    <a href="https://github.com/ramaikn" target="_blank" rel="noopener noreferrer">${githubIcon}<span>GitHub</span></a>
  </div>
</dialog>`;

export function initializeAbout(): void {
  const dialog = document.getElementById("about-dialog") as HTMLDialogElement;
  const trigger = document.getElementById("open-about")!;
  trigger.addEventListener("click", () => dialog.showModal());
  document.getElementById("close-about")!.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    const bounds = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
  });
  dialog.addEventListener("close", () => trigger.focus());
}
