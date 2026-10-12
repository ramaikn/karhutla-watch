# Peta kode dan alur data

## Alur utama

1. `scripts/collect.ts` memanggil sumber, mempertahankan data lama ketika sumber gagal, dan menyimpan snapshot atomik. Kunci hanya dipakai collector.
2. `public/data/latest.json` memuat deteksi, berita, cuaca cadangan, serta status internal. `src/domain/snapshot.ts` menangani format ringkas dan kompatibilitas.
3. `src/main.ts` mengambil snapshot, menerapkan filter, dan memperbarui panel/peta setiap menit. Frontend tidak menampilkan laporan teknis collector.
4. Cuaca pilihan diambil browser langsung dari BMKG. Pencarian wilayah hanya membaca indeks lokal.
5. Udara disimpan terpisah dalam `public/data/air-quality.json`. Pengelompokan deteksi ke provinsi dilakukan worker agar peta tidak tersendat.

## Lokasi kode

| Modul | Tanggung jawab |
| --- | --- |
| `src/ui/layout.ts`, `src/style.css`, `src/ui/workspace.ts` | Tampilan map-first, panel kiri, berita kanan/mobile, fokus keyboard |
| `src/ui/map.ts`, `src/ui/basemap.ts` | MapLibre, OSM tanpa kunci, titik/heatmap/popup |
| `src/domain/filters.ts`, `normalize.ts`, `snapshot.ts`, `heatmap.ts` | Validasi dan pengolahan data |
| `src/domain/rankings.ts`, `ranking-worker.ts` | Point-in-polygon, peringkat deteksi dan PM2.5 |
| `src/ui/ranking-panel.ts` | Memuat batas provinsi dan udara, tabel serta fokus peta |
| `src/domain/locations.ts`, `weather-client.ts`, `src/ui/weather-search.ts` | Pencarian nasional, cache BMKG dan pembatalan permintaan |
| `scripts/news.ts`, `news-transport.ts`, `config/news-sources.ts` | Query identik 25 media, cache, retensi, deduplikasi dan cooldown |
| `scripts/boundary.ts` | Batas nasional geoBoundaries untuk menyaring deteksi |
| `scripts/provinces.ts`, `locations.ts` | Indeks sumber wilayah dengan revisi tetap |
| `scripts/air-quality.ts` | Snapshot CAMS Global pada 38 titik acuan |
| `scripts/dev.ts` | Server web dan collector 30 menit |
| `config/weather-locations.json` | Empat lokasi cache cadangan, bukan batas pencarian web |
| `tests/` | Regresi domain, cuaca nasional, dan peringkat |
| `.github/workflows/` | Pemeriksaan kode dan pembaruan data |
| `scheduler/`, `docs/CRON.md` | Cloudflare Cron memicu workflow_dispatch, secret terpisah, tanpa endpoint publik |
| `wrangler.jsonc` | Workers Static Assets pada karhutla.my.id; URL data publik diatur saat build |

## Keputusan penting

- Semua media menggunakan Google News RSS per penerbit; tidak ada jalur khusus ANTARA. Urutan tampilan murni waktu terbit, tanpa kuota penerbit.
- Peringkat deteksi nasional mengikuti waktu/keyakinan/satelit, bukan kotak wilayah peta. Deteksi di luar poligon tidak ditebak sebagai provinsi terdekat.
- Udara diurutkan menurut PM2.5, bukan AQI campuran. Model pada titik acuan sumber tidak diklaim sebagai rata-rata provinsi.
- Batas provinsi menggunakan sumber 38 provinsi, bukan geoBoundaries ADM1 lama yang hanya berisi 34.
- Pesan kegagalan pengguna singkat tetap diperlukan. Penjelasan teknis, batasan interpretasi, dan metode berada di dokumentasi.
- OSM raster diberi penyesuaian gelap tanpa memengaruhi warna deteksi. CARTO sebelumnya mengembalikan gambar `API KEY REQUIRED` walaupun HTTP 200.
- Jangan menaruh rahasia pada `VITE_*`. `.runtime` dan `.env*` bukan berkas publik.

## Pemeriksaan terakhir

26 pengujian dengan 209 pemeriksaan berhasil; TypeScript dan build produksi berhasil. Data batas memuat 38 provinsi; pengelompokan Palangka Raya, Sorong, dan Merauke diuji. Snapshot udara nyata berhasil untuk 38 titik acuan.

Browser Chrome dengan SwiftShader berhasil merender basemap dan heatmap Kalimantan. Screenshot asli tersedia di `docs/images/kalimantan-heatmap.png`. Panel Peringkat menampilkan 38 baris deteksi dan 38 baris udara tanpa page error. Pada viewport 390 × 844, lebar dokumen tetap 390 piksel. Point-in-polygon awal pada main thread sempat membuat browser tidak merespons; pemindahan ke worker memperbaiki sumber hambatan tersebut. Pemeriksaan ini bukan verifikasi visual seluruh kombinasi filter/perangkat.

Deployment Workers Static Assets berhasil pada `https://karhutla.my.id` dan `https://karhutla-watch.ramaiknx.workers.dev`. Browser produksi memuat snapshot deteksi serta udara dari GitHub raw dengan HTTP 200, menampilkan masing-masing 38 baris peringkat, tanpa page error. 26 pengujian dan build setelah penambahan Wrangler berhasil. CI GitHub publik juga berhasil. Penjadwalan beralih ke Cloudflare Cron; secret khusus masih perlu dipasang sebelum jadwal diaktifkan.

Pengujian penjadwal menambah tiga test: POST tepat sasaran, penolakan konfigurasi/secret kosong tanpa request, dan penanganan kegagalan tanpa membocorkan respons. Total 29 test/221 pemeriksaan dan TypeScript berhasil. Tanggal kompatibilitas Worker memakai 12 Oktober 2026 karena Cloudflare masih pada tanggal UTC tersebut saat deployment, bukan tanggal lokal 13 Oktober.
