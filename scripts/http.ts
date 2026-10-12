export async function request(url: string, accept: string, timeoutMs = 45_000): Promise<Response> {
  let lastError = "Sumber tidak dapat dihubungi.";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(timeoutMs),
        headers: { Accept: accept, "User-Agent": "KarhutlaWatch/0.1 (public open-source monitoring)" },
      });
      if (response.ok) return response;
      lastError = `Sumber mengembalikan HTTP ${response.status}.`;
      if (response.status < 500 && response.status !== 429) break;
    } catch { lastError = "Koneksi ke sumber gagal atau melewati batas waktu."; }
    if (attempt === 0) await Bun.sleep(5_500);
  }
  // URL FIRMS mengandung kunci, sehingga tidak boleh masuk pesan kesalahan.
  throw new Error(lastError);
}
