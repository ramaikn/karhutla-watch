# Keamanan

Versi pada branch `main` menjadi sasaran perbaikan keamanan. Proyek komunitas ini tidak menjanjikan waktu respons tertentu.

## Melaporkan kerentanan

Gunakan **Report a vulnerability** pada tab Security GitHub apabila fitur tersebut tersedia. Jangan membuka issue publik yang berisi token, kredensial, data pribadi, atau langkah eksploitasi aktif. Jika pelaporan privat belum aktif, hubungi pemilik melalui profil [ramaikn](https://github.com/ramaikn) untuk meminta kanal privat terlebih dahulu.

Sertakan versi/commit, dampak, langkah reproduksi minimal, dan usulan perbaikan jika ada. Hindari menguji dengan membanjiri API NASA, BMKG, Open-Meteo, atau penerbit berita.

## Kredensial dan deployment

- `.env*` diabaikan Git kecuali contoh tanpa rahasia.
- Simpan `FIRMS_MAP_KEY` sebagai GitHub Actions secret atau environment server collector.
- Jangan menaruh rahasia dalam variabel `VITE_*`: variabel tersebut masuk ke bundle publik.
- Jika token terlanjur terunggah, cabut dan ganti token sebelum membersihkan histori.
- Jangan memakai proyek ini sebagai sistem peringatan darurat atau dasar keputusan keselamatan tunggal.
