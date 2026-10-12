import { aboutDialog } from "./about";

export const layout = `
<main class="workspace">
  <section id="peta" class="map-stage" aria-label="Peta titik panas Indonesia">
    <div id="map" role="region" aria-label="Peta interaktif deteksi titik panas Indonesia"></div>
    <header class="map-toolbar surface">
      <a class="brand" href="#peta" aria-label="Karhutla Watch, peta"><img src="./favicon.svg" alt="" width="24" height="24"><span>Karhutla <strong>Watch</strong></span></a>
      <button id="open-about" type="button" aria-haspopup="dialog" aria-controls="about-dialog">About</button>
      <form id="filters" class="filters">
        <select id="region" aria-label="Wilayah peta"></select>
        <select id="hours" aria-label="Rentang waktu"><option value="24">24 jam</option><option value="72">3 hari</option><option value="168">7 hari</option></select>
        <details class="filter-options"><summary>Filter</summary><div class="filter-popover surface">
          <label>Keyakinan<select id="confidence"><option value="reliable">Nominal & tinggi</option><option value="all">Semua tingkat</option><option value="h">Tinggi saja</option></select></label>
          <label>Satelit<select id="sensor"><option value="all">Semua VIIRS</option><option value="VIIRS_NOAA20_NRT">NOAA-20</option><option value="VIIRS_NOAA21_NRT">NOAA-21</option><option value="VIIRS_SNPP_NRT">S-NPP</option></select></label>
        </div></details>
      </form>
      <nav id="panel-navigation" aria-label="Panel peta">
        <button type="button" data-panel="ranking" aria-controls="ranking-panel" aria-expanded="false">Peringkat</button>
        <button type="button" data-panel="detections" aria-controls="detections-panel" aria-expanded="false">Deteksi</button>
        <button type="button" data-panel="weather" aria-controls="weather-panel" aria-expanded="false">Cuaca</button>
        <button type="button" data-panel="sources" aria-controls="sources-panel" aria-expanded="false">Sumber</button>
        <button id="toggle-news" type="button" aria-controls="berita" aria-expanded="true">Berita</button>
      </nav>
    </header>

    <div class="map-summary surface" aria-label="Jumlah deteksi">
      <strong id="count">…</strong><span>deteksi</span>
      <div class="view-toggle" role="group" aria-label="Tampilan peta"><button id="view-points" type="button" aria-pressed="true">Titik</button><button id="view-heatmap" type="button" aria-pressed="false">Heatmap</button></div>
    </div>
    <p id="load-error" class="error-message surface" role="alert" hidden></p>
    <div id="map-empty" class="map-message surface" role="status" hidden></div>
    <p id="map-error" class="map-error surface" role="status" hidden></p>

    <aside id="detail-panel" class="detail-panel surface" aria-label="Detail peta" hidden>
      <div class="drawer-heading"><h2 id="detail-title">Deteksi terbaru</h2><button id="close-detail" type="button" aria-label="Tutup detail">Tutup</button></div>
      <section id="ranking-panel" aria-label="Peringkat wilayah" hidden>
        <div class="section-heading"><h3>Deteksi per provinsi</h3></div>
        <p class="source-detail">Provinsi dengan deteksi titik panas terbanyak. FRP: daya panas terdeteksi, dalam megawatt (MW).</p><div id="fire-ranking" class="ranking-scroll"><p class="empty-state">Memuat peringkat…</p></div>
        <div class="section-heading"><h3>PM2.5 tertinggi</h3></div>
        <p class="source-detail">Lokasi acuan provinsi dengan PM2.5 tertinggi. PM2.5 dan PM10: partikel udara berukuran hingga 2,5 dan 10 mikrometer.</p><div id="air-ranking" class="ranking-scroll"><p class="empty-state">Memuat peringkat…</p></div>
        <div class="official-links"><a href="https://firms.modaps.eosdis.nasa.gov/" target="_blank" rel="noopener noreferrer">NASA FIRMS ↗</a><a href="https://open-meteo.com/en/docs/air-quality-api" target="_blank" rel="noopener noreferrer">CAMS / Open-Meteo ↗</a></div>
      </section>
      <section id="detections-panel" aria-label="Deteksi terbaru" hidden>
        <div class="detection-summary"><span><strong id="high-count">…</strong> keyakinan tinggi</span><button id="download" type="button" disabled>Unduh CSV</button></div>
        <p class="source-detail">Pengamatan terbaru: <span id="latest-observation">Belum tersedia</span></p>
        <div id="detection-list"></div>
        <div class="section-heading"><h3>Tren 7 hari</h3><span>Tanggal UTC</span></div><div id="trend-chart"></div>
      </section>
      <section id="weather-panel" aria-label="Prakiraan cuaca" hidden>
        <div class="section-heading"><span>BMKG</span></div>
        <label class="search-label" for="weather-search">Lokasi prakiraan<input id="weather-search" type="search" placeholder="Cari desa, kecamatan, atau kabupaten" autocomplete="off" maxlength="120" aria-controls="weather-results"></label>
        <div id="weather-results" class="location-results" role="region" aria-label="Hasil pencarian lokasi" aria-live="polite"></div><div id="weather-selected" class="weather-selected"></div><div id="weather-content" aria-live="polite"></div>
        <a class="official-warning" href="https://www.bmkg.go.id/cuaca/karhutla" target="_blank" rel="noopener noreferrer">Peringatan karhutla BMKG ↗</a>
      </section>
      <section id="sources-panel" aria-label="Sumber data" hidden>
        <div class="refresh-row"><p id="updated" class="source-detail">Memuat pembaruan…</p><button id="reload" type="button">Muat ulang data</button></div>
        <h3>Sumber data</h3>
        <div class="official-links"><a href="https://www.earthdata.nasa.gov/data/tools/firms/faq" target="_blank" rel="noopener noreferrer">Batasan FIRMS ↗</a><a href="https://sipongi.gakkum.kehutanan.go.id/indikasi-luas-kebakaran" target="_blank" rel="noopener noreferrer">Luas kebakaran resmi ↗</a></div>
        <div class="official-links"><a href="https://data.bmkg.go.id/prakiraan-cuaca/" target="_blank" rel="noopener noreferrer">Prakiraan BMKG ↗</a><a href="https://github.com/cahyadsn/wilayah" target="_blank" rel="noopener noreferrer">Referensi wilayah ↗</a><a href="./data/locations-LICENSE.txt" target="_blank" rel="noopener noreferrer">Lisensi daftar wilayah ↗</a></div>
      </section>
    </aside>
    <div class="map-legend surface"><div class="legend" aria-label="Keyakinan deteksi"><span><i class="dot high"></i>Tinggi</span><span><i class="dot nominal"></i>Nominal</span><span><i class="dot low"></i>Rendah</span></div><span id="heatmap-legend" hidden>Kepadatan deteksi</span></div>
  </section>

  <aside id="berita" class="news-panel surface" aria-labelledby="news-title">
    <div class="section-heading"><h2 id="news-title">Berita terbaru</h2><button id="close-news" type="button" aria-label="Tutup berita">Tutup</button></div>
    <div class="news-controls"><input id="news-search" type="search" aria-label="Cari judul atau penerbit" placeholder="Cari berita atau media" maxlength="120"></div>
    <div class="news-scroll"><div id="news-list"></div><div class="official-links"><a href="https://www.bnpb.go.id/berita" target="_blank" rel="noopener noreferrer">BNPB ↗</a><a href="https://sipongi.gakkum.kehutanan.go.id/" target="_blank" rel="noopener noreferrer">SiPongi ↗</a></div></div>
  </aside>
</main>
${aboutDialog}
`;
