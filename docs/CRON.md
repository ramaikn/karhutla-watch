# Penjadwalan melalui cron-job.org

cron-job.org mengirim permintaan ke GitHub untuk menjalankan collector. Kode tetap dieksekusi GitHub Actions, bukan server cron-job.org. Respons HTTP 204 berarti pemicu diterima, bukan berarti collector sudah selesai. Antrean dan batas Actions tetap berlaku.

## Token GitHub khusus

Buat **fine-grained personal access token** pada GitHub Settings → Developer settings → Personal access tokens. Pilih resource owner `ramaikn`, akses hanya repositori `karhutla-watch`, serta repository permission **Actions: Read and write**. Tetapkan masa berlaku yang terbatas dan catat jadwal penggantiannya.

Token ini hanya untuk pemicu workflow. `FIRMS_MAP_KEY` tetap opsional pada repository Actions secrets. Jangan menaruh token GitHub dalam `.env.example`, URL job, kode frontend, issue, atau screenshot.

## Pengaturan job

Pada akun [cron-job.org](https://cron-job.org/), buat job:

| Pengaturan | Nilai |
| --- | --- |
| Judul | Karhutla Watch: refresh data |
| URL | `https://api.github.com/repos/ramaikn/karhutla-watch/actions/workflows/refresh-data.yml/dispatches` |
| Jadwal khusus | `17,47 * * * *` |
| Zona waktu | UTC |
| Metode | POST |
| Body | `{"ref":"main"}` |

Di pengaturan lanjutan, tambahkan header:

```text
Accept: application/vnd.github+json
Authorization: Bearer TOKEN_KHUSUS_CRON
Content-Type: application/json
X-GitHub-Api-Version: 2022-11-28
User-Agent: KarhutlaWatchScheduler
```

Ganti `TOKEN_KHUSUS_CRON` **hanya pada pengaturan privat cron-job.org**. Menyimpan token di sana memberikan layanan tersebut kemampuan memicu Actions pada repositori yang dipilih; gunakan token khusus dengan cakupan minimum.

Jalankan tes satu kali dari cron-job.org. Periksa respons 204, lalu buka [Actions](https://github.com/ramaikn/karhutla-watch/actions/workflows/refresh-data.yml) untuk melihat hasil collector dan commit snapshot. Aktifkan pemberitahuan kegagalan job. Respons 401/403 biasanya terkait token, masa berlaku, izin repositori, atau kebijakan akun. Respons 404 dapat berarti workflow belum dipush atau tidak dapat diakses token.

## Hindari pemicu ganda

Workflow hanya memiliki `workflow_dispatch`, tanpa `schedule` GitHub. Job cron-job.org belum aktif hanya karena dokumentasi ini ada; pemilik harus membuat dan mengaktifkannya pada akun layanan. Workflow masih bisa dijalankan manual melalui **Run workflow** di GitHub.

Pembaruan menggunakan concurrency group agar collector tidak berjalan bersamaan. Jangan menjadwalkan terlalu sering: sumber berita memiliki cache/cooldown, API memiliki batas permintaan, dan snapshot menambah histori Git. Jika satu eksekusi masih berjalan, pemicu berikutnya dapat menunggu.

Pembaruan snapshot tidak otomatis menyebarkan situs. Ikuti [DEPLOY.md](DEPLOY.md) untuk hosting dan pengiriman data.
