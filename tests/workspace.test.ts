import { expect, test } from "bun:test";
import { adaptWorkspace, selectPanel, type WorkspaceState } from "../src/ui/workspace-state";

test("mobile hanya menampilkan satu panel dan klik tab aktif tidak menutupnya", () => {
  let state: WorkspaceState = { panel: null, newsVisible: true };
  for (const panel of ["ranking", "detections", "weather", "sources"] as const) {
    state = selectPanel(state, panel, true);
    expect(state).toEqual({ panel, newsVisible: false });
    expect(selectPanel(state, panel, true)).toEqual(state);
  }
  expect(selectPanel(state, "news", true)).toEqual({ panel: null, newsVisible: true });
});

test("desktop mempertahankan panel dan berita terpisah", () => {
  const state = selectPanel({ panel: null, newsVisible: true }, "ranking", false);
  expect(state).toEqual({ panel: "ranking", newsVisible: true });
  expect(selectPanel(state, "ranking", false)).toEqual({ panel: null, newsVisible: true });
  expect(selectPanel(state, "news", false)).toEqual({ panel: "ranking", newsVisible: false });
});

test("perubahan ukuran ke mobile selalu memilih satu panel", () => {
  expect(adaptWorkspace({ panel: "weather", newsVisible: true }, true)).toEqual({ panel: "weather", newsVisible: false });
  expect(adaptWorkspace({ panel: null, newsVisible: false }, true)).toEqual({ panel: null, newsVisible: true });
});
