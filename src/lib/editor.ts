export type EditorTarget = "vscode" | "cursor" | "zed";

export const EDITOR_LABEL: Record<EditorTarget, string> = {
  vscode: "VS Code",
  cursor: "Cursor",
  zed: "Zed",
};

const KEY = "asterism.editor";

export function readEditor(): EditorTarget {
  try {
    const value = localStorage.getItem(KEY);
    return value === "cursor" || value === "zed" ? value : "vscode";
  } catch {
    return "vscode";
  }
}

export function writeEditor(next: EditorTarget) {
  try {
    localStorage.setItem(KEY, next);
  } catch {
    /* best effort */
  }
}
