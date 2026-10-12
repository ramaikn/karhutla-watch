import { expect, test } from "bun:test";
import { dispatchRefresh, type SchedulerEnv } from "../scheduler/dispatch";
import worker from "../scheduler/worker";

const env: SchedulerEnv = { GITHUB_ACTIONS_TOKEN: "test-only-secret", GITHUB_REPOSITORY: "ramaikn/karhutla-watch", GITHUB_WORKFLOW: "refresh-data.yml", GITHUB_REF: "main" };

test("penjadwal mengirim POST ke workflow yang ditentukan dengan token pada header saja", async () => {
  let calls = 0;
  await dispatchRefresh(env, async (url, options) => {
    calls++;
    expect(url).toBe("https://api.github.com/repos/ramaikn/karhutla-watch/actions/workflows/refresh-data.yml/dispatches");
    expect(options.method).toBe("POST");
    expect(new Headers(options.headers).get("Authorization")).toBe("Bearer test-only-secret");
    expect(JSON.parse(String(options.body))).toEqual({ ref: "main" });
    expect(options.redirect).toBe("error");
    return new Response(null, { status: 204 });
  });
  expect(calls).toBe(1);
});

test("secret kosong dan konfigurasi tidak valid tidak mengirim permintaan", async () => {
  let calls = 0;
  const requester = async () => { calls++; return new Response(null, { status: 204 }); };
  await expect(dispatchRefresh({ ...env, GITHUB_ACTIONS_TOKEN: "" }, requester)).rejects.toThrow();
  await expect(dispatchRefresh({ ...env, GITHUB_REPOSITORY: "bad/repo/path" }, requester)).rejects.toThrow();
  expect(calls).toBe(0);
});

test("penolakan GitHub tidak membocorkan isi respons atau mengirim ulang", async () => {
  let calls = 0;
  await expect(dispatchRefresh(env, async () => { calls++; return new Response("sensitive response", { status: 403 }); })).rejects.toThrow("HTTP 403");
  expect(calls).toBe(1);
  expect(worker.fetch().status).toBe(404);
});
