import { dispatchRefresh, SchedulerDispatchError, type SchedulerEnv } from "./dispatch";

export default {
  async scheduled(_controller: unknown, env: SchedulerEnv): Promise<void> {
    try {
      await dispatchRefresh(env);
      console.log("Pemicu pembaruan diterima GitHub.");
    } catch (error) {
      const message = error instanceof SchedulerDispatchError ? error.message : "Permintaan GitHub gagal karena jaringan atau batas waktu.";
      console.error(message);
      throw new Error(message);
    }
  },
  fetch(): Response { return new Response("Not found", { status: 404 }); },
};
