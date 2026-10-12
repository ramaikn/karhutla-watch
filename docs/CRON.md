# Cloudflare Cron → GitHub Actions

Worker `karhutla-watch-scheduler` memanggil API GitHub `workflow_dispatch`. Collector tetap berjalan pada GitHub Actions; antrean dan batas Actions tetap berlaku. Respons 204 berarti pemicu diterima, bukan collector sudah selesai.

Worker penjadwal terpisah dari situs. Tidak ada custom domain, workers.dev, preview URL, atau endpoint publik untuk memicu pembaruan. Workflow GitHub hanya memakai `workflow_dispatch`, tanpa `schedule`. Jangan mengaktifkan cron-job.org bersamaan.

## Token khusus

Buat **fine-grained personal access token** di GitHub Settings → Developer settings → Personal access tokens:

- Resource owner: `ramaikn`.
- Repository access: hanya `karhutla-watch`.
- Repository permissions: **Actions: Read and write**.
- Masa berlaku terbatas; ganti secret sebelum token kedaluwarsa.

Jangan memakai token GitHub CLI yang lebih luas sebagai secret penjadwal. Jangan mengirim token lewat chat, menyimpannya di kode, atau memasukkannya sebagai variabel publik `VITE_*`.

## Pasang secret

Worker dapat disiapkan tanpa jadwal:

```sh
bun run deploy:scheduler
bunx --bun wrangler secret put GITHUB_ACTIONS_TOKEN --config scheduler/wrangler.jsonc
```

Perintah kedua meminta nilai token secara interaktif di terminal lokal. Alternatif: Cloudflare Dashboard → Workers & Pages → `karhutla-watch-scheduler` → Settings → Variables and Secrets → Add → tipe **Secret**, nama `GITHUB_ACTIONS_TOKEN`. Nilai hanya dimasukkan pada Cloudflare, bukan ke repositori.

## Aktifkan jadwal

Setelah secret tersedia, ubah `triggers.crons` dalam `scheduler/wrangler.jsonc`:

```json
{ "crons": ["17,47 * * * *"] }
```

Lalu jalankan `bun run deploy:scheduler`. Jadwal pada menit 17 dan 47 setiap jam **UTC**. Konfigurasi awal memakai array kosong agar tidak mengirim pemicu tanpa secret. Perubahan cron dapat membutuhkan hingga 15 menit untuk menyebar. Kelola cron melalui Wrangler, bukan konfigurasi dashboard terpisah yang dapat ditimpa deployment berikutnya.

## Periksa hasil

- Cloudflare Dashboard → Worker penjadwal → Cron Events/Logs untuk hasil pemicu. Log tidak mencetak token atau isi respons GitHub.
- [GitHub Actions](https://github.com/ramaikn/karhutla-watch/actions/workflows/refresh-data.yml) untuk hasil collector.
- Pastikan waktu dan commit snapshot berubah setelah workflow selesai.
- HTTP 401/403 biasanya terkait token, izin, atau masa berlaku. HTTP 404 dapat berarti repositori/workflow tidak tersedia untuk token.

Worker melakukan satu permintaan tanpa percobaan ulang otomatis agar tidak menggandakan job ketika respons tidak pasti. Concurrency workflow mencegah collector berjalan bersama. Pemicu gagal tidak mengubah snapshot sebelumnya.

Untuk mematikan jadwal, kembalikan `crons` menjadi `[]`, lalu deploy. Untuk fork, ganti account ID, nama Worker, repositori, dan token. Lihat [DEPLOY.md](DEPLOY.md) untuk hosting situs serta URL snapshot publik.
