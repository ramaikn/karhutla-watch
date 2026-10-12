export function element<K extends keyof HTMLElementTagNameMap>(tag: K, className = "", text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function externalLink(text: string, href: string, className = ""): HTMLAnchorElement {
  const link = element("a", className, text);
  link.href = href; link.target = "_blank"; link.rel = "noopener noreferrer";
  return link;
}

const formatter = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });
export function formatDate(value: string | null): string {
  return value && Number.isFinite(Date.parse(value)) ? `${formatter.format(new Date(value))} WIB` : "Belum tersedia";
}

export const numberFormat = new Intl.NumberFormat("id-ID");
