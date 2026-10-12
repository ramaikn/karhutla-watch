# Lokal, cron GitHub, dan Cloudflare

## Lokal, langsung berfungsi

```powershell
bun install --backend hardlink
bun run dev
```

`dev` menjalankan Vite dan collector. Data langsung diperbarui ketika proses dimulai, kemudian setiap 30 menit. Browser memeriksa snapshot setiap menit. Tidak perlu kunci NASA: unduhan CSV resmi dapat diakses publik. Snapshot nyata terakhir sudah disertakan agar web tidak menunggu pengambilan pertama.

Untuk menjalankan web tanpa proses pembaruan, gunakan `bun run dev:web`. Untuk pembaruan manual, gunakan `bun run collect`. Collector tidak menjalankan server web.

Jangan menjalankan dua collector bersamaan. Proses memiliki penguncian dan menulis snapshot secara atomik. Jika proses dihentikan paksa, pastikan collector sudah mati sebelum menghapus `.runtime/collect.lock`. Kegagalan sumber mempertahankan data lama; diagnostik berada pada snapshot/log, bukan badge publik.

## Cloudflare Cron → GitHub Actions

Workflow tersedia di `.github/workflows/refresh-data.yml` dengan pemicu `workflow_dispatch`. Jadwal diatur pada Worker Cloudflare terpisah, bukan pada `schedule` GitHub:

```yaml
cron: '17,47 * * * *'
```

Artinya menit 17 dan 47 setiap jam UTC. Worker mengirim POST ke API GitHub; collector tetap terkena antrean Actions. Respons diterima bukan jaminan eksekusi atau keberhasilan collector. Lihat [CRON.md](CRON.md) untuk secret dengan cakupan minimum dan cara memeriksa hasil. Jadwal belum aktif sebelum secret tersedia dan konfigurasi cron diaktifkan.

GitHub membaca `.github/workflows` di root repositori Karhutla Watch. Fork perlu mengaktifkan Actions dan menyesuaikan konfigurasi Worker dengan akun, repositori, serta token sendiri.

Workflow melakukan pengujian, pengambilan data, build, dan commit `public/data/latest.json` serta `public/data/air-quality.json` ke branch default. Cache geometri negara mempercepat proses berikutnya. Kunci `FIRMS_MAP_KEY` opsional melalui repository secret. Tanpa secret, jalur unduhan publik tetap berjalan. Repo harus mengizinkan Actions dengan `contents: write`; proteksi branch dapat menolak push bot dan harus disesuaikan pemilik.

File snapshot publik akan memiliki riwayat Git jika cron melakukan commit rutin. Pantau ukuran repositori dan kuota Actions/cache. Ini solusi awal untuk data tujuh hari, bukan arsip jangka panjang. Skala besar lebih tepat memakai penyimpanan objek atau layanan data tersendiri. Jangan mempublikasikan repositori induk lamaran.

## Cloudflare Workers Static Assets

Konfigurasi `wrangler.jsonc` memakai Worker `karhutla-watch` pada custom domain `karhutla.my.id`. Wrangler terpasang sebagai dependensi pengembangan. Untuk fork, ganti `account_id`, nama Worker, dan domain dengan milik sendiri sebelum deployment. Jangan menaruh token pada konfigurasi ini.

```powershell
bunx --bun wrangler login
$env:VITE_DATA_URL = 'https://raw.githubusercontent.com/ramaikn/karhutla-watch/main/public/data/latest.json'
$env:VITE_AIR_DATA_URL = 'https://raw.githubusercontent.com/ramaikn/karhutla-watch/main/public/data/air-quality.json'
bun run deploy
```

Kedua URL hanya berisi data publik. Pengaturan ini membuat pembaruan snapshot oleh Actions terlihat tanpa deployment ulang kode. Jangan menjalankan `wrangler deploy` pada fork tanpa menyesuaikan akun/domain.

Untuk hosting statis:

- Perintah build: `bun run build`.
- Folder keluaran: `dist`.
- Versi Bun: 1.4.2 atau lebih baru yang kompatibel.
- Tidak memerlukan server Bun di Cloudflare untuk menampilkan web.

Snapshot yang disertakan dalam build tidak berubah hanya karena situs sudah dihosting. Menjalankan build dua kali per jam berarti sekitar 1.440 build per 30 hari dan dapat melewati kuota gratis. Sebaiknya pisahkan pembaruan data dari build kode.

Pilihan awal tanpa mengubah backend: isi variabel build `VITE_DATA_URL` dengan URL snapshot publik pada repositori aplikasi yang terpisah:

```dotenv
VITE_DATA_URL=https://raw.githubusercontent.com/PEMILIK/REPOSITORI/BRANCH/public/data/latest.json
```

Ganti placeholder dengan repositori publik dan branch sebenarnya. URL harus mendukung CORS, HTTPS, dan tidak mengandung rahasia. Browser mengambil data utama langsung dari URL tersebut; cron mengubah snapshot tanpa perlu membangun ulang bundle web. Gunakan `VITE_AIR_DATA_URL` untuk snapshot udara terpisah. Tanpa variabel ini, udara memakai `data/air-quality.json` pada hosting web. Cache CDN sumber dapat menunda kemunculan data baru. Jangan menganggap waktu cron sebagai waktu pengamatan satelit.

Untuk pola ini, batasi auto-build Cloudflare agar perubahan hanya pada `public/data/` tidak memicu build. Pengaturan tersebut harus dilakukan pemilik saat hosting. GitHub raw tetap memiliki keterbatasan layanan dan bukan penyedia data tanpa batas. Jika traffic membesar, pindahkan snapshot ke penyimpanan statis yang sesuai, lalu ganti `VITE_DATA_URL`.

Tanpa `VITE_DATA_URL`, web memakai `data/latest.json` dari hosting yang sama. Cocok untuk lokal atau deploy manual.

## Keamanan

- `.env` tidak masuk Git. Kunci NASA hanya dipakai collector, tidak masuk URL browser atau log.
- `VITE_*` bersifat publik dan tertanam di bundle. Jangan menyimpan token Cloudflare atau NASA di sana.
- Collector tidak menyimpan artikel penuh atau gambar penerbit.
- Kode memakai Apache-2.0; data sumber memiliki lisensi terpisah. Lihat NOTICE. API gratis Open-Meteo khusus penggunaan nonkomersial.
