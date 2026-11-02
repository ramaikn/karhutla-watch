# Layar penuh, transparansi komponen, default peta berwarna + heatmap

- Waktu: 2026-11-03, WIB
- Jenis: fitur
- Ringkasan: peta dapat ditampilkan layar penuh, semua komponen punya pengaturan transparansi, dan tampilan awal kini peta berwarna (tanpa awan) dengan heatmap.

## Perubahan penting
- Default: `natural` untuk peta dasar dan `heatmap` untuk tampilan deteksi. Legenda titik disembunyikan saat heatmap; teks "Kepadatan deteksi, bukan luas terbakar" dihapus.
- Layar penuh (`src/ui/fullscreen.ts`): kelas CSS `.is-fullscreen` sebagai dasar, Fullscreen API ditambahkan bila tersedia. Di mobile, panel berita/detail disembunyikan saat layar penuh.
- Transparansi (`src/ui/opacity-settings.ts`, `src/ui/opacity-panel.ts`): slider 10-100% untuk bilah atas, kartu deteksi, tombol peta, legenda, panel detail, panel berita, dan lapisan heatmap/titik. Disimpan di localStorage. Latar permukaan memakai `color-mix` dengan variabel `--mix-*`; lapisan peta memakai pengali di `HotspotMap.setOverlayScale`.
- Jendela info titik (popup) belum termasuk pengaturan transparansi.

## Verifikasi
- `bun test` (49 lulus), `bun run build` berhasil, dicek manual di browser (slider, layar penuh).
