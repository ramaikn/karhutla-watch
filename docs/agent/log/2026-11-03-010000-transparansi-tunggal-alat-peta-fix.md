# Transparansi tunggal dan penempatan alat peta

- Waktu: 2026-11-03, WIB
- Jenis: perbaikan UI
- Ringkasan: tujuh slider transparansi diganti satu slider umum (variabel CSS `--mix` plus pengali lapisan peta). Tombol samar di kartu deteksi dihapus karena ganda. Tombol layar penuh dan transparansi dipindah ke samping tombol zoom (kotak 2x2) agar tidak tertutup panel bawah di mobile.

## File terkait
- `src/ui/opacity-settings.ts`, `src/ui/opacity-panel.ts`, `src/ui/detection-controls.ts`, `src/main.ts`, `src/ui/layout.ts`, `src/style.css`

## Verifikasi
- `bun test` (49 lulus), build berhasil, dicek di viewport mobile.
- Catatan: nilai tersimpan lama (format per komponen) otomatis jatuh ke 100%.
