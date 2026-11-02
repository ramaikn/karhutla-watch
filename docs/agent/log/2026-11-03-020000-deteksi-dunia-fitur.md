# Deteksi dunia sebagai lapisan opsional

- Waktu: 2026-11-03, WIB
- Jenis: fitur
- Ringkasan: tombol "Dunia" menampilkan deteksi VIIRS 24 jam di luar Indonesia (biru-ungu). Hitungan, peringkat, filter, dan unduhan CSV tetap hanya Indonesia.

## Keputusan
- Berkas terpisah `public/data/world.json` (`scripts/world.ts`, `bun run collect:world`), bukan bagian `latest.json`, agar snapshot Indonesia tidak membengkak dan kegagalan dunia tidak berdampak. Dijalankan di workflow `refresh-data.yml` dengan `continue-on-error`.
- Hanya keyakinan nominal+tinggi, titik di dalam batas Indonesia dibuang, dibulatkan ke kisi 0,01° dan digabung antar satelit (sekitar 86 ribu titik, 1,4 MB).
- Diunduh frontend hanya saat tombol pertama kali diaktifkan; mati secara default.

## File terkait
- `src/domain/world.ts`, `scripts/world.ts`, `scripts/firms.ts` (parameter `box`), `src/ui/map.ts`, `src/main.ts`, `.github/workflows/refresh-data.yml`

## Verifikasi
- `bun test` (51 lulus), build berhasil, dicek di browser (titik dunia tampil, legenda "Luar Indonesia").
