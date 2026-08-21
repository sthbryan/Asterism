export const LANG_COLORS: Record<string, string> = {
  Go: "#00ADD8",
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Rust: "#dea584",
  Python: "#3572A5",
  Java: "#b07219",
  Vue: "#41b883",
  Svelte: "#ff3e00",
  Dart: "#00B4AB",
  Ruby: "#701516",
  "C++": "#f34b7d",
  C: "#555555",
  "C#": "#178600",
  Shell: "#89e051",
  HTML: "#e34c26",
  CSS: "#663399",
  Makefile: "#427819",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
};

export function langColor(name: string | null | undefined): string {
  if (!name) return "#6f6f6f";
  return LANG_COLORS[name] ?? "#6f6f6f";
}
