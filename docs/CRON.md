# Cloudflare Cron → GitHub Actions

Worker `karhutla-watch-scheduler` memanggil API GitHub `workflow_dispatch`. Collector tetap berjalan pada GitHub Actions; antrean dan batas Actions tetap berlaku. Respons 204 berarti pemicu diterima, bukan collector sudah selesai.

Worker penjadwal terpisah dari situs. Tidak ada custom domain, workers.dev, preview URL, atau endpoint publik untuk memicu pembaruan. Workflow GitHub memakai `workflow_dispatch` dan jadwal cadangan setiap 30 menit. Setelah secret Cloudflare terpasang dan pemicu terverifikasi, set repository variable `CLOUDFLARE_CRON_ENABLED=true` agar job terjadwal GitHub dilewati. Jangan mengaktifkan cron-job.org bersamaan.

## Token khusus

Buat **fine-grained personal access token** di GitHub Settings → Developer settings → Personal access tokens:

- Resource owner: `ramaikn`.
- Repository access: hanya `karhutla-watch`.
- Repository permissions: **Actions: Read and write**.
- Masa berlaku terbatas; ganti secret sebelum token kedaluwarsa.

Jangan memakai token GitHub CLI yang lebih luas sebagai secret penjadwal. Jangan mengirim token lewat chat, menyimpannya di kode, atau memasukkannya sebagai variabel publik `VITE_*`.

## Pasang secret

Worker memakai jadwal setiap 30 menit. Pasang secret sebelum deployment pertama; pada Worker yang sudah tersedia, cukup tambahkan secret:

```sh
bunx --bun wrangler secret put GITHUB_ACTIONS_TOKEN --config scheduler/wrangler.jsonc
bun run deploy:scheduler
```

Perintah pertama meminta nilai token secara interaktif di terminal lokal. Alternatif: Cloudflare Dashboard → Workers & Pages → `karhutla-watch-scheduler` → Settings → Variables and Secrets → Add → tipe **Secret**, nama `GITHUB_ACTIONS_TOKEN`. Nilai hanya dimasukkan pada Cloudflare, bukan ke repositori.

## Aktifkan jadwal

Konfigurasi `triggers.crons` dalam `scheduler/wrangler.jsonc` sudah berisi:

```json
{ "crons": ["17,47 * * * *"] }
```

Jadwal berjalan pada menit 17 dan 47 setiap jam **UTC**, setelah Worker dideploy. Tanpa secret, pemicu gagal dan data lama tetap tersedia. Perubahan cron dapat membutuhkan hingga 15 menit untuk menyebar. Kelola cron melalui Wrangler, bukan konfigurasi dashboard terpisah yang dapat ditimpa deployment berikutnya.

## Periksa hasil

- Cloudflare Dashboard → Worker penjadwal → Cron Events/Logs untuk hasil pemicu. Log tidak mencetak token atau isi respons GitHub.
- [GitHub Actions](https://github.com/ramaikn/karhutla-watch/actions/workflows/refresh-data.yml) untuk hasil collector.
- Pastikan waktu dan commit snapshot berubah setelah workflow selesai.
- HTTP 401/403 biasanya terkait token, izin, atau masa berlaku. HTTP 404 dapat berarti repositori/workflow tidak tersedia untuk token.

Handler mencatat status HTTP penolakan GitHub, bukan isi respons atau token. Error jaringan memakai pesan tetap agar rahasia tidak masuk log. Secret terpasang dan deployment sukses belum membuktikan dispatch berhasil; verifikasi Cron Event dan run GitHub yang cocok. Pada 13 Oktober 2026, `CLOUDFLARE_CRON_ENABLED=true` dipulihkan sesuai keputusan pemilik: Cloudflare tetap menjadi pemicu utama.

Runtime Cloudflare hanya menerima `redirect: "follow"` atau `"manual"`, bukan `"error"`. Dispatcher memakai `manual` dan hanya menerima HTTP 204, sehingga redirect ditolak tanpa meneruskan Authorization ke tujuan lain. Bug `redirect: "error"` sebelumnya menghentikan cron sebelum permintaan dikirim, walaupun pengujian Bun lolos.

Verifikasi live 13 Oktober 2026: cron 18:17 WITA pada versi `d33821f7-d25b-4294-9273-ab7b90bcabe9` berstatus `ok`, tanpa exception. GitHub run `38382347904` (`workflow_dispatch`) selesai sukses 18:18:36 WITA, menerbitkan commit data `8b6b9b0ff8b9fcaf2d5ce51d8c8053f9c726e8e2`. Snapshot utama, ranking, dan berita bertanggal 18:17:47 WITA; udara 18:17:48 WITA. Semua tiga sensor NASA, 25 sumber berita, empat lokasi BMKG, dan 38 lokasi udara berhasil. URL raw berbasis commit sudah berisi data baru; URL raw `main` sempat masih berisi cache lama (`max-age=300`), jadi publikasi commit dan pembaruan cache perlu dibedakan.

Worker melakukan satu permintaan tanpa percobaan ulang otomatis agar tidak menggandakan job ketika respons tidak pasti. Concurrency workflow mencegah collector berjalan bersama. Pemicu gagal tidak mengubah snapshot sebelumnya.

## Matikan cadangan setelah Cloudflare berhasil

GitHub repository Settings → Secrets and variables → Actions → Variables → New repository variable: nama `CLOUDFLARE_CRON_ENABLED`, nilai `true`. Atau lewat CLI:

```sh
gh variable set CLOUDFLARE_CRON_ENABLED --body true --repo ramaikn/karhutla-watch
```

Lakukan setelah satu Cron Cloudflare berhasil memicu collector. Jika token kedaluwarsa, hapus variable tersebut atau ubah menjadi `false` untuk memakai cadangan GitHub kembali. Jadwal GitHub dapat terlambat dan pada repositori publik dapat dinonaktifkan setelah 60 hari tanpa aktivitas; commit snapshot biasanya menjaga aktivitas selama collector berjalan.

Untuk mematikan jadwal, kembalikan `crons` menjadi `[]`, lalu deploy. Untuk fork, ganti account ID, nama Worker, repositori, dan token. Lihat [DEPLOY.md](DEPLOY.md) untuk hosting situs serta URL snapshot publik.
