export type DetailPanel = "ranking" | "detections" | "weather" | "sources";
export interface WorkspaceState { panel: DetailPanel | null; newsVisible: boolean }

export function selectPanel(state: WorkspaceState, panel: DetailPanel | "news", mobile: boolean): WorkspaceState {
  if (mobile) return { panel: panel === "news" ? null : panel, newsVisible: panel === "news" };
  if (panel === "news") return { ...state, newsVisible: !state.newsVisible };
  return { ...state, panel: state.panel === panel ? null : panel };
}

export function adaptWorkspace(state: WorkspaceState, mobile: boolean): WorkspaceState {
  return mobile ? { ...state, newsVisible: !state.panel } : state;
}
