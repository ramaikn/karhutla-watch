import { dispatchRefresh, type SchedulerEnv } from "./dispatch";

export default {
  async scheduled(_controller: unknown, env: SchedulerEnv): Promise<void> {
    try {
      await dispatchRefresh(env);
      console.log("Pemicu pembaruan diterima GitHub.");
    } catch {
      console.error("Pemicu pembaruan gagal; periksa secret dan izin Actions.");
      throw new Error("Pemicu pembaruan gagal.");
    }
  },
  fetch(): Response { return new Response("Not found", { status: 404 }); },
};
