export interface SchedulerEnv { GITHUB_ACTIONS_TOKEN: string; GITHUB_REPOSITORY: string; GITHUB_WORKFLOW: string; GITHUB_REF: string }
type Requester = (url: string, options: RequestInit) => Promise<Response>;

export async function dispatchRefresh(env: SchedulerEnv, requester: Requester = fetch): Promise<void> {
  if (!env.GITHUB_ACTIONS_TOKEN?.trim()) throw new Error("Secret penjadwal belum tersedia.");
  if (!/^[\w.-]+\/[\w.-]+$/.test(env.GITHUB_REPOSITORY) || !/^[\w.-]+\.yml$/.test(env.GITHUB_WORKFLOW) || !env.GITHUB_REF?.trim()) throw new Error("Konfigurasi penjadwal tidak valid.");
  const response = await requester(`https://api.github.com/repos/${env.GITHUB_REPOSITORY}/actions/workflows/${env.GITHUB_WORKFLOW}/dispatches`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.GITHUB_ACTIONS_TOKEN}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "KarhutlaWatchScheduler",
    },
    body: JSON.stringify({ ref: env.GITHUB_REF }),
    signal: AbortSignal.timeout(15_000),
    redirect: "error",
  });
  // Jangan mencetak respons, header, atau token ke log.
  if (response.status !== 204) throw new Error(`GitHub menolak pemicu: HTTP ${response.status}.`);
}
