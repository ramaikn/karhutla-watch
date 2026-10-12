# Berkontribusi

Terima kasih sudah membantu Karhutla Watch. Perubahan kecil yang dapat diuji lebih mudah ditinjau daripada perubahan besar tanpa konteks.

## Persiapan

1. Fork repositori, lalu clone fork kamu.
2. Pasang [Bun](https://bun.sh/) versi 1.3 atau lebih baru.
3. Jalankan `bun install --frozen-lockfile --backend hardlink` dan `bun run dev:web`.
4. Buat branch untuk perubahan, misalnya `feat/province-ranking`.

Snapshot disertakan, jadi kunci API tidak wajib. Jangan memasukkan `.env`, token, kredensial, atau data pribadi ke commit.

## Sebelum membuka pull request

```sh
bun test
bun run build
git diff --check
```

- Jelaskan masalah, perubahan, dan cara mengujinya.
- Sertakan screenshot untuk perubahan antarmuka desktop dan ponsel.
- Jangan membuat data palsu terlihat sebagai pengamatan nyata.
- Jelaskan sumber, cakupan, satuan, waktu, dan lisensi untuk integrasi data baru.
- Jangan menyamakan deteksi satelit dengan jumlah kebakaran atau hasil model dengan pengukuran sensor.
- Pertahankan dependensi ringan dan pisahkan pengolahan data dari antarmuka.
- Gunakan pesan commit Conventional Commits, misalnya `feat(ranking): add province comparison`.

## Lisensi kontribusi

Dengan mengirim kontribusi, kamu menyetujui bahwa kode tersebut tersedia di bawah Apache-2.0. Kamu harus memiliki hak untuk menyumbangkan kode atau data tersebut. Pertahankan pemberitahuan hak cipta dan lisensi pihak ketiga; tidak perlu menyerahkan hak cipta kepada pemilik proyek.

## Pelaporan masalah

Buka issue untuk bug dan usulan fitur. Sertakan langkah reproduksi, sistem/peramban, dan screenshot bila diperlukan. Untuk kerentanan atau rahasia yang bocor, ikuti [SECURITY.md](SECURITY.md), bukan issue publik.
