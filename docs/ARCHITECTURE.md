# Peta kode dan alur data

## Alur utama

1. `scripts/collect.ts` memanggil sumber, mempertahankan data lama ketika sumber gagal, dan menyimpan snapshot atomik. Kunci hanya dipakai collector.
2. `public/data/latest.json` memuat deteksi, berita, cuaca cadangan, serta status internal. `src/domain/snapshot.ts` menangani format ringkas dan kompatibilitas.
3. `src/main.ts` mengambil snapshot peta, menerapkan filter, dan memeriksa pembaruan setiap menit. Ranking serta berita dimuat paralel tanpa menunggu snapshot peta. Frontend tidak menampilkan laporan teknis collector.
4. Cuaca pilihan diambil browser langsung dari BMKG. Pencarian wilayah hanya membaca indeks lokal.
5. `scripts/prepare-data.ts` mengelompokkan deteksi ke 38 provinsi dan menghitung 36 kombinasi waktu/keyakinan/satelit di collector. `rankings.json` memuat hasil serta udara terurut; `news.json` memuat berita siap tampil. Browser tidak mengunduh poligon atau menghitung pengelompokan.

## Lokasi kode

| Modul | Tanggung jawab |
| --- | --- |
| `src/ui/layout.ts`, `src/style.css`, `src/ui/workspace.ts`, `workspace-state.ts` | Desktop: panel terpisah. Mobile: satu panel di bawah peta, tab dan navigasi keyboard. Tinggi header diukur dengan ResizeObserver |
| `src/ui/about.ts` | Dialog About native, tautan proyek/profil, penutupan dan pemulihan fokus |
| `src/ui/map.ts`, `src/ui/basemap.ts` | MapLibre, OSM tanpa kunci, titik/heatmap/popup |
| `src/domain/filters.ts`, `normalize.ts`, `snapshot.ts`, `heatmap.ts` | Validasi dan pengolahan data |
| `src/domain/rankings.ts`, `ranking-snapshot.ts`, `scripts/prepare-data.ts` | Point-in-polygon pada collector, 36 tabel siap tampil, validasi hasil |
| `src/ui/ranking-panel.ts`, `news-panel.ts`, `src/domain/data-url.ts` | Panel ringan paralel, pembaruan tanpa mengosongkan data lama, URL mengikuti sumber snapshot |
| `src/domain/locations.ts`, `weather-client.ts`, `src/ui/weather-search.ts` | Pencarian nasional, cache BMKG dan pembatalan permintaan |
| `scripts/news.ts`, `news-transport.ts`, `config/news-sources.ts` | Query identik 25 media, cache, retensi, deduplikasi dan cooldown |
| `scripts/boundary.ts` | Batas nasional geoBoundaries untuk menyaring deteksi |
| `scripts/provinces.ts`, `locations.ts` | Indeks sumber wilayah dengan revisi tetap |
| `scripts/air-quality.ts` | Snapshot CAMS Global pada 38 titik acuan |
| `scripts/dev.ts` | Server web dan collector 30 menit |
| `config/weather-locations.json` | Empat lokasi cache cadangan, bukan batas pencarian web |
| `tests/` | Regresi domain, cuaca nasional, dan peringkat |
| `scripts/check-browser.ts` | Pemeriksaan Chrome melalui CDP pada 320–1440 piksel, panel mobile, posisi header dan dialog About |
| `.github/workflows/` | Pemeriksaan kode dan pembaruan data |
| `scheduler/`, `docs/CRON.md` | Cloudflare Cron memicu workflow_dispatch, secret terpisah, tanpa endpoint publik |
| `wrangler.jsonc` | Workers Static Assets pada karhutla.my.id; URL data publik diatur saat build |

## Keputusan penting

- Header mobile maksimal 100 piksel dengan dua baris: logo dan teks Karhutla Watch, ikon Filter/About pada baris pertama; lima tab pada baris kedua. Wilayah, waktu, keyakinan, dan satelit berada di toggle Filter. Dialog About mencantumkan A.M. Fathur Ramadhan sebagai author dan tautan Let’s connect. Ikon memiliki nama aksesibel dan kontrol tetap setinggi 40 piksel.
- Semua media menggunakan Google News RSS per penerbit; tidak ada jalur khusus ANTARA. Urutan tampilan murni waktu terbit, tanpa kuota penerbit.
- Peringkat deteksi nasional mengikuti waktu/keyakinan/satelit, bukan kotak wilayah peta. Deteksi di luar poligon tidak ditebak sebagai provinsi terdekat.
- Jendela waktu ranking berakhir pada waktu snapshot collector, bukan jam browser. Tanggal snapshot ditampilkan agar hasil yang statis tidak diklaim sebagai hitungan langsung. Filter peta tetap memakai waktu browser.
- `VITE_DATA_URL` menjadi dasar URL `rankings.json` dan `news.json`; ketiganya diperbarui pada commit data yang sama. `VITE_AIR_DATA_URL` tidak lagi dipakai panel ranking karena udara sudah digabung dalam hasil collector.
- Cuaca memakai pembungkus `globalThis.fetch`, bukan metode instance yang menyebabkan `Illegal invocation` di browser. Pergantian cepat menunggu jeda permintaan dan mendukung pembatalan.
- Udara diurutkan menurut PM2.5, bukan AQI campuran. Model pada titik acuan sumber tidak diklaim sebagai rata-rata provinsi.
- Batas provinsi menggunakan sumber 38 provinsi, bukan geoBoundaries ADM1 lama yang hanya berisi 34.
- Pesan kegagalan pengguna singkat tetap diperlukan. Penjelasan teknis, batasan interpretasi, dan metode berada di dokumentasi.
- OSM raster diberi penyesuaian gelap tanpa memengaruhi warna deteksi. CARTO sebelumnya mengembalikan gambar `API KEY REQUIRED` walaupun HTTP 200.
- Jangan menaruh rahasia pada `VITE_*`. `.runtime` dan `.env*` bukan berkas publik.

## Pemeriksaan terakhir

13 Oktober 2026, header mobile dipadatkan menjadi sekitar 98 piksel. 38 test/259 pemeriksaan, TypeScript dan build berhasil. Chrome memeriksa 320, 390, 700, 768, 1024, dan 1440 piksel: tidak ada overflow, tab panel dan About tetap berfungsi. Cron Cloudflare 18:17 WITA berhasil sampai publikasi snapshot GitHub; detail ada di `CRON.md`.

13 Oktober 2026, pembaruan mobile dan About: 36 test dengan 249 pemeriksaan, TypeScript dan build berhasil. Chrome headless memeriksa lebar 320, 390, 700, 768, 1024, dan 1440 piksel: tidak ada overflow horizontal, kartu deteksi di bawah header, satu panel mobile di bawah peta, serta dialog terpusat yang mengembalikan fokus saat ditutup. Screenshot berada di `.runtime/ui-check/`. Pemeriksaan otomatis memakai Chrome terpisah karena viewport panel browser aplikasi tidak selalu mengubah lebar halaman sebenarnya. Ini belum pengujian perangkat fisik pengguna.

Situs dideploy ke `https://karhutla.my.id` dengan snapshot GitHub raw, versi Worker `a4a472bb-3865-45c6-b684-8a5bb14228ee`. Worker penjadwal dideploy dengan Cron `17,47 * * * *`, tetapi secret `GITHUB_ACTIONS_TOKEN` belum tersedia. Login browser GitHub diperlukan untuk membuat token fine-grained; token CLI yang lebih luas tidak disalin. Jadwal cadangan GitHub sudah diterbitkan dan pembaruan manual berhasil: run `38323386596`, commit data `6c74044`. Kode aplikasi diterbitkan sebagai commit `b3c4874`, CI `38323812275` berhasil. Jangan set `CLOUDFLARE_CRON_ENABLED=true` sebelum pemicu Cloudflare berhasil. Cuaca lokasi pilihan diperiksa setiap menit dan cache BMKG berakhir setelah 30 menit.

13 Oktober 2026, perbaikan pemuatan: 32 test/233 pemeriksaan, TypeScript, build produksi, dan `git diff --check` berhasil. `prepare:data` menghasilkan 36 tabel dalam sekitar 15 detik di mesin lokal; pekerjaan tersebut sekarang milik collector. Ranking sekitar 227 KB, dibanding poligon provinsi sekitar 4,6 MB yang dahulu diunduh panel. Ini perbandingan ukuran mentah, bukan pengukuran latensi jaringan. Browser lokal menampilkan 38 baris pada setiap tabel dan prakiraan BMKG Kemayoran 28°C beserta delapan waktu prakiraan tanpa page error. Produksi sebelumnya mereproduksi `Illegal invocation`; perubahan ini belum dipublikasikan atau dideploy. Build masih memberi peringatan ukuran MapLibre, yang sudah dimuat terpisah dari panel.

26 pengujian dengan 209 pemeriksaan berhasil; TypeScript dan build produksi berhasil. Data batas memuat 38 provinsi; pengelompokan Palangka Raya, Sorong, dan Merauke diuji. Snapshot udara nyata berhasil untuk 38 titik acuan.

Browser Chrome dengan SwiftShader berhasil merender basemap dan heatmap Kalimantan. Screenshot asli tersedia di `docs/images/kalimantan-heatmap.png`. Panel Peringkat menampilkan 38 baris deteksi dan 38 baris udara tanpa page error. Pada viewport 390 × 844, lebar dokumen tetap 390 piksel. Point-in-polygon awal pada main thread sempat membuat browser tidak merespons; pemindahan ke worker memperbaiki sumber hambatan tersebut. Pemeriksaan ini bukan verifikasi visual seluruh kombinasi filter/perangkat.

Deployment Workers Static Assets berhasil pada `https://karhutla.my.id` dan `https://karhutla-watch.ramaiknx.workers.dev`. Browser produksi memuat snapshot deteksi serta udara dari GitHub raw dengan HTTP 200, menampilkan masing-masing 38 baris peringkat, tanpa page error. 26 pengujian dan build setelah penambahan Wrangler berhasil. CI GitHub publik juga berhasil. Penjadwalan beralih ke Cloudflare Cron; secret khusus masih perlu dipasang sebelum jadwal diaktifkan.

Pengujian penjadwal menambah tiga test: POST tepat sasaran, penolakan konfigurasi/secret kosong tanpa request, dan penanganan kegagalan tanpa membocorkan respons. Total 29 test/221 pemeriksaan dan TypeScript berhasil. Tanggal kompatibilitas Worker memakai 12 Oktober 2026 karena Cloudflare masih pada tanggal UTC tersebut saat deployment, bukan tanggal lokal 13 Oktober.
