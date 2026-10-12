# Sumber dan metode

## NASA FIRMS

- [Dokumentasi Area API](https://firms.modaps.eosdis.nasa.gov/api/area/), [ketersediaan data](https://firms.modaps.eosdis.nasa.gov/api/data_availability/), [FAQ](https://www.earthdata.nasa.gov/data/tools/firms/faq).
- Sensor: VIIRS NOAA-20, NOAA-21, dan S-NPP, produk NRT. Resolusi nominal 375 meter. Ketersediaan global biasanya dalam sekitar tiga jam setelah pengamatan, bukan tiga jam setelah api muncul.
- Kunci gratis wajib hanya untuk Area API, bukan CSV unduhan publik. Dokumentasi API menyebut 5.000 transaksi per interval sepuluh menit; permintaan besar dapat menghitung lebih dari satu transaksi.
- Jalur utama tanpa kunci: CSV publik global `SUOMI_VIIRS_C2_Global_7d.csv`, `J1_VIIRS_C2_Global_7d.csv`, `J2_VIIRS_C2_Global_7d.csv`, serta varian `_24h.csv` di `https://firms.modaps.eosdis.nasa.gov/data/active_fire/`. Semua diambil oleh collector, bukan tiap pengunjung.
- Pengambilan awal/ketika data lama menggunakan tujuh hari. Pembaruan rutin memakai 24 jam lalu mempertahankan histori tujuh hari. Unduhan global diproses streaming; hanya kotak Indonesia yang dinormalisasi dan kemudian disaring polygon. Jendela terkini diganti jika sumber berhasil. File unduhan dapat tertinggal dari waktu sekarang; waktu pengamatan selalu ditampilkan.
- Area API memakai `west,south,east,north`. Wilayah pengambilan `94,-11.5,142,6.5` dipotong lagi dengan geometri Indonesia.
- Jika kunci opsional tersedia, Area API memakai dua permintaan rentang tanggal: lima hari dan tiga hari. Delapan tanggal UTC mencakup tujuh hari bergulir. Jika API gagal, unduhan CSV publik menjadi cadangan.
- CSV harus memiliki koordinat, tanggal, waktu, dan keyakinan. HTML, pesan kunci salah, atau CSV rusak menghasilkan status gagal, bukan daftar kosong yang dianggap berhasil.
- Keyakinan VIIRS API: `l` rendah, `n` nominal, `h` tinggi. CSV publik memakai `low`, `nominal`, `high`; normalisasi mendukung keduanya. Tidak diubah menjadi persen atau tingkat bahaya. Filter awal nominal dan tinggi, kategori rendah tetap dapat ditampilkan.
- FRP adalah daya radiasi api dalam MW, bukan luas lahan terbakar.
- Heatmap menunjukkan kepadatan relatif deteksi yang mengikuti filter. Titik berdekatan digabung per sel 0,02 derajat dengan bobot jumlah deteksi untuk mengurangi beban render. Posisi heatmap adalah rata-rata koordinat sel, bukan posisi api pasti. Warna tergantung zoom serta kepadatan, bukan satuan suhu atau nilai bahaya. CSV memakai koordinat deteksi asli.
- Wajib pertahankan atribusi NASA FIRMS serta rujukan produk dan ikuti kebijakan data NASA saat redistribusi. Data NRT dapat direvisi dan tidak menggantikan produk terkalibrasi untuk penelitian historis.

## Batas negara

- [geoBoundaries gbOpen Indonesia ADM0](https://www.geoboundaries.org/api/current/gbOpen/IDN/ADM0/).
- Metadata yang diperiksa menyebut sumber OpenStreetMap/Wambacher, representasi tahun 2017, lisensi Open Data Commons Open Database License 1.0. Ini referensi penyaringan, bukan penetapan hukum atau batas administrasi terbaru.
- Geometri penuh diunduh sekali ke `.runtime/indonesia.geojson`. Metadata lisensi disimpan bersama cache dan dicatat di snapshot.
- Unduhan menggunakan alamat `media.githubusercontent.com/media/...` agar Git LFS menghasilkan geometri, bukan pointer teks. Polygon diindeks dengan kotak pembatas, lalu diperiksa point-in-polygon hanya untuk kandidat yang cocok.
- Hotspot ditolak ketika batas belum dapat dimuat. Tidak ada fallback yang diam-diam menghitung seluruh kotak sebagai Indonesia.
- Redistribusi basis data turunan yang memakai OSM harus diperiksa terhadap kewajiban ODbL, termasuk atribusi dan share-alike jika berlaku. Cache dan geometri tidak disertakan sebagai kode aplikasi.

## BMKG

- [Dokumentasi data prakiraan](https://data.bmkg.go.id/prakiraan-cuaca/).
- Endpoint `https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4={kode_desa}`.
- Tiga hari, interval tiga jam, pembaruan dua kali sehari, batas 60 permintaan per menit per IP. Collector berjalan berurutan dengan jeda lebih dari satu detik.
- Frontend mencari wilayah pada indeks lokal `public/data/locations.json`, mencakup 83.762 desa/kelurahan dan 38 provinsi. Sumber nama/kode: cahyadsn/wilayah, revisi `d68e8d5516f969d1905d0b2940f20034becb0db7`, referensi Kepmendagri 300.2.2-2430 Tahun 2025. Lisensi MIT dan atribusi disertakan pada `public/data/locations-LICENSE.txt`. Ini kode Kemendagri, bukan BPS. Indeks dibangkitkan dengan `bun run prepare:locations` dan dimuat hanya ketika panel cuaca dipakai.
- Dokumentasi BMKG masih menyebut acuan 2022. Daftar pencarian memakai versi 2025 agar seluruh 38 provinsi dapat dicari; kode yang belum didukung menghasilkan pesan prakiraan belum tersedia, bukan pengalihan diam-diam ke desa lain. Kode `adm4` respons wajib sama dengan pilihan pengguna. Uji nyata Sorong (96) dan Merauke (93) berhasil; tidak diklaim seluruh kode telah diuji.
- Permintaan prakiraan dilakukan browser langsung setelah desa/kelurahan dipilih, bukan setiap huruf pencarian. Header CORS BMKG `Access-Control-Allow-Origin: *` diperiksa. Cache memori 30 menit, maksimal 20 lokasi; jarak permintaan minimal 1,1 detik dan penundaan jika HTTP 429 mengikuti Retry-After. Batas per IP BMKG tetap berlaku untuk beberapa browser/pengguna di jaringan yang sama; tidak menjamin kapasitas hosting publik tanpa batas. Jika diperlukan, gunakan backend cache bersama sebagai tahap deployment tersendiri.
- Permintaan lama dibatalkan ketika pilihan berubah; respons yang terlambat tidak menimpa pilihan terbaru. Empat desa/kelurahan `config/weather-locations.json` tetap diambil collector sebagai cache awal, bukan membatasi pilihan frontend. Nama/koordinat prakiraan memakai respons BMKG, bukan asumsi dari pencarian.
- Atribusi BMKG ditampilkan. Cuaca ditampilkan sebagai prakiraan, bukan pengukuran langsung atau prediksi pergerakan api.
- [Peringatan karhutla](https://www.bmkg.go.id/cuaca/karhutla) masih berupa tautan resmi. Citra tidak disalin atau dipotong; BMKG melarang pemotongan citra tanpa logo dan sumber.

## Berita

- Satu jalur penemuan untuk setiap media: Google News RSS dengan query `(karhutla OR "kebakaran hutan" OR "kebakaran lahan" OR "kebakaran gambut") (site:domain) when:7d`, edisi Indonesia. Seluruh media memakai topik, rentang waktu, validasi, batas 100 artikel per respons, serta jadwal 30 menit yang sama. Feed khusus penerbit dan GDELT tidak lagi dipanggil, agar tidak ada jalur pengambilan tambahan untuk media tertentu.
- Parameter pelacakan umum dibuang hanya dari identitas duplikat; tautan asli tetap tersedia. Tautan hanya menerima HTTP/HTTPS. Judul dirender sebagai teks, bukan HTML.
- Domain penerbit dari elemen `source` harus cocok dengan domain media yang sedang dicari, bukan sekadar daftar umum. Daftar mencakup ANTARA, CNN Indonesia, CNBC Indonesia, detik, Tempo, Republika, Kompas, Kompas.id, Liputan6, Tribunnews, Suara, Okezone, SINDOnews, Merdeka, tvOne, Metro TV, Kumparan, IDN Times, VIVA, Bisnis, Kontan, BeritaSatu, Media Indonesia, Tirto, dan Mongabay Indonesia. Ini cakupan pencarian, bukan jaminan semua penerbit memiliki hasil. Tautan Google News tetap menjadi perantara; provider dicatat internal, bukan ditampilkan pada artikel.
- Collector mengirim satu permintaan per media, berurutan dengan jeda minimal 1,5 detik dan timeout 15 detik. Awal urutan berganti tiap jadwal agar media tertentu tidak selalu mendapat giliran pertama. Cache lokal `.runtime/news-cache.json` berlaku 25 menit; ETag dan Last-Modified dipakai saat tersedia. Respons 403/429/503 menghentikan permintaan baru secara global sampai cooldown berakhir, mengikuti Retry-After dengan cadangan 30 menit. Tidak ada proxy, rotasi IP, bypass CAPTCHA, atau peniruan browser. Tidak menjamin bebas pembatasan.
- Feed valid tanpa hasil tetap berarti pengambilan berhasil, bukan artikel baru. Kegagalan tetap dicatat pada collector/snapshot, bukan frontend. Data metode baru dipertahankan tujuh hari. Setelah satu sumber baru berhasil, data metode lama tidak dicampur agar media yang sebelumnya punya feed khusus tidak memperoleh kelebihan histori; ketika semua sumber gagal, snapshot sebelumnya dipertahankan.
- Waktu terbit memakai `pubDate` dan frontend diurutkan berdasarkan nilai waktu absolut, terbaru dahulu. Tidak ada algoritma berbeda menurut penerbit, kuota kemunculan, atau giliran tampilan. Google menentukan cakupan indeks; perlakuan setara di aplikasi tidak menjamin jumlah hasil setara.
- Duplikat tautan dan judul pada penerbit sama disatukan, hasil terbaru dipilih. Media berbeda tidak disatukan hanya karena judul sama. Maksimal 2.500 metadata tersimpan (25 × 100), bukan batas gabungan 100 seperti versi sebelumnya. Seluruh hasil dapat dilihat dengan menggulir panel.
- XML eksternal ditolak jika rusak, berukuran lebih dari 5 MB, atau mengandung deklarasi DTD/entity. Tidak mengambil gambar, ringkasan feed, atau artikel penuh. Feed publik bukan izin redistribusi tanpa batas; periksa ketentuan setiap penerbit dan Google sebelum hosting publik.
- BNPB dan SiPongi disediakan sebagai rujukan resmi, belum memiliki integrasi otomatis pada versi ini.

## Peta dasar

- MapLibre GL JS merender raster [OpenStreetMap](https://www.openstreetmap.org/copyright) dari `https://tile.openstreetmap.org/{z}/{x}/{y}.png`, tanpa API key. CARTO dihapus karena mengembalikan gambar bertuliskan API KEY REQUIRED meskipun HTTP 200. Kode status saja tidak membuktikan tile valid.
- Dark mode membalik rentang kecerahan raster dan meniadakan saturasinya. Hanya layer peta dasar yang berubah, bukan warna titik panas, heatmap, atau antarmuka.
- Ikuti [Tile Usage Policy OSM](https://operations.osmfoundation.org/policies/tiles/): atribusi terlihat, referer valid, cache mengikuti header, tanpa bulk download atau fitur offline. Hosting dengan trafik tinggi perlu penyedia yang sesuai atau server tile sendiri.
- Permintaan tile dilakukan browser untuk area yang dilihat pengguna. Tidak ada proxy, prefetch massal, atau pengunduhan tile di collector.
- Layanan tile tidak memberi jaminan kapasitas tanpa batas. Ganti penyedia dengan layanan atau hosting sendiri yang izinnya sesuai jika penggunaan berkembang.

## Tidak diintegrasikan dahulu

- Luas terbakar, FDRS, gambut, tutupan lahan, dan citra asap: membutuhkan verifikasi akses, lisensi, resolusi, tanggal referensi, dan metode.
- API internal SiPongi tidak digunakan. Situs publik bukan otomatis izin untuk pengambilan endpoint internal tanpa dokumentasi.

## Peringkat deteksi provinsi

- Batas 38 provinsi berasal dari [cahyadsn/wilayah_boundaries](https://github.com/cahyadsn/wilayah_boundaries), revisi `171a2ac275e36061a7a6c9f8634ceaadf4f70931`. Sumber menyebut Kemendagri dan BIG. Lisensi MIT disertakan di `public/data/provinces-LICENSE.txt`. Konversi koordinat lat,lng menjadi GeoJSON lng,lat dan penambahan bounding box dicatat; geometri tidak disederhanakan lagi.
- Point-in-polygon menentukan provinsi setiap deteksi. Bounding box hanya mempercepat seleksi kandidat; tidak dipakai sebagai batas provinsi. Pulau kecil, pesisir, pergeseran piksel, dan perbedaan referensi dapat menghasilkan deteksi tanpa provinsi; deteksi ini tidak diberi label provinsi terdekat secara sembarang.
- Jumlah deteksi menentukan urutan menurun; FRP maksimum dan kode provinsi menjadi pemecah seri. Keyakinan tinggi dihitung tersendiri. FRP adalah MW, bukan suhu. Null tidak ditampilkan sebagai nol.
- Peringkat tetap nasional; waktu, sensor, dan tingkat keyakinan mengikuti pilihan filter. Tidak dibatasi pilihan kotak wilayah peta. Deteksi berulang bukan kejadian berbeda; sensor gagal dapat membuat tren dan peringkat tidak lengkap. Status teknis berada pada snapshot/log. Waktu terakhir pengamatan tersedia pada panel Deteksi.
- Pengelompokan seluruh snapshot dilakukan dalam worker setelah panel diminta, dengan cache koordinat. Perubahan filter tidak mengulang point-in-polygon. Snapshot baru memicu pengelompokan ulang.

## Udara CAMS / Open-Meteo

- API [Open-Meteo Air Quality](https://open-meteo.com/en/docs/air-quality-api), domain `cams_global`, variabel `current=pm2_5,pm10`. Data adalah keluaran model CAMS Global beresolusi sekitar 0,4° atau puluhan kilometer, bukan pengukuran stasiun lokal.
- Satu titik acuan per provinsi memakai kolom lat/lng sumber batas provinsi. Titik ini bukan sampel seluruh provinsi dan tidak selalu ibu kota. Koordinat permintaan dan grid respons disimpan, serta waktu data dalam UTC. Antarmuka memakai WIB. Klik baris memusatkan peta pada titik acuan.
- Collector meminta 38 lokasi dalam satu permintaan multi-koordinat, memvalidasi jumlah, urutan lokasi, selisih koordinat, waktu, konsentrasi nonnegatif, dan satuan. Snapshot `public/data/air-quality.json` ditulis atomik. Kegagalan mempertahankan snapshot lama tanpa mengubah waktu menjadi waktu terbaru.
- Urutan PM2.5 tertinggi dahulu; PM10 menjadi kolom pembanding. Nilai kosong berada terakhir. Tidak mencampur AQI, deteksi, suhu, atau PM2.5 menjadi skor bahaya. Peringkat udara tidak mengikuti rentang historis deteksi.
- Data berlisensi CC BY 4.0 dengan atribusi CAMS dan Open-Meteo. Lihat [ketentuan layanan](https://open-meteo.com/en/terms). API gratis untuk penggunaan nonkomersial; hosting komersial perlu paket/izin yang sesuai. Lisensi Apache-2.0 kode bukan izin menggunakan API tanpa batas.
