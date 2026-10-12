export interface NewsFeed { name: string; url: string; domains: string[] }

export const NEWS_PUBLISHERS = [
  { name: "ANTARA", domain: "antaranews.com" },
  { name: "CNN Indonesia", domain: "cnnindonesia.com" },
  { name: "CNBC Indonesia", domain: "cnbcindonesia.com" },
  { name: "detik", domain: "detik.com" },
  { name: "Tempo", domain: "tempo.co" },
  { name: "Republika", domain: "republika.co.id" },
  { name: "Republika", domain: "republika.id" },
  { name: "Kompas", domain: "kompas.com" },
  { name: "Kompas.id", domain: "kompas.id" },
  { name: "Liputan6", domain: "liputan6.com" },
  { name: "Tribunnews", domain: "tribunnews.com" },
  { name: "Suara", domain: "suara.com" },
  { name: "Okezone", domain: "okezone.com" },
  { name: "SINDOnews", domain: "sindonews.com" },
  { name: "Merdeka", domain: "merdeka.com" },
  { name: "tvOne", domain: "tvonenews.com" },
  { name: "Metro TV", domain: "metrotvnews.com" },
  { name: "Kumparan", domain: "kumparan.com" },
  { name: "IDN Times", domain: "idntimes.com" },
  { name: "VIVA", domain: "viva.co.id" },
  { name: "Bisnis", domain: "bisnis.com" },
  { name: "Kontan", domain: "kontan.co.id" },
  { name: "BeritaSatu", domain: "beritasatu.com" },
  { name: "Media Indonesia", domain: "mediaindonesia.com" },
  { name: "Tirto", domain: "tirto.id" },
  { name: "Mongabay Indonesia", domain: "mongabay.co.id" },
];

export const NEWS_LIMIT_PER_FEED = 100;
export const NEWS_FEEDS: NewsFeed[] = [...new Set(NEWS_PUBLISHERS.map((publisher) => publisher.name))].map((name) => {
  const domains = NEWS_PUBLISHERS.filter((publisher) => publisher.name === name).map((publisher) => publisher.domain);
  const discovery = new URL("https://news.google.com/rss/search");
  discovery.search = new URLSearchParams({
    q: `(karhutla OR "kebakaran hutan" OR "kebakaran lahan" OR "kebakaran gambut") (${domains.map((domain) => `site:${domain}`).join(" OR ")}) when:7d`,
    hl: "id", gl: "ID", ceid: "ID:id",
  }).toString();
  return { name, domains, url: discovery.href };
});
