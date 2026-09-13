import type { PlatformDownloads } from "./types";

export type { PlatformDownloads };

export type PlatformKey = keyof PlatformDownloads;

export function emptyPlatforms(): PlatformDownloads {
  return { macos: 0, windows: 0, linux: 0, other: 0 };
}

export function classifyAsset(name: string): PlatformKey {
  const n = name.toLowerCase();
  if (
    n.includes("windows") ||
    n.includes("win32") ||
    n.includes("win64") ||
    n.includes("win-") ||
    n.includes("-win.") ||
    n.includes("-pc-windows") ||
    n.endsWith(".msi") ||
    n.endsWith(".msix") ||
    n.endsWith(".exe") ||
    n.endsWith(".nupkg")
  ) {
    return "windows";
  }
  if (
    n.includes("macos") ||
    n.includes("darwin") ||
    n.includes("osx") ||
    n.includes("apple-darwin") ||
    n.endsWith(".dmg") ||
    n.endsWith(".pkg") ||
    n.endsWith(".app")
  ) {
    return "macos";
  }
  if (
    n.includes("linux") ||
    n.includes("appimage") ||
    n.includes("unknown-linux") ||
    n.endsWith(".deb") ||
    n.endsWith(".rpm") ||
    n.endsWith(".appimage")
  ) {
    return "linux";
  }
  return "other";
}

export function addAsset(platforms: PlatformDownloads, name: string, count: number) {
  platforms[classifyAsset(name)] += count;
}

export function platformsFromAssets(
  assets: { name: string; downloadCount: number }[],
): PlatformDownloads {
  const platforms = emptyPlatforms();
  for (const asset of assets) addAsset(platforms, asset.name, asset.downloadCount);
  return platforms;
}

export function sumPlatforms(list: Array<PlatformDownloads | undefined | null>): PlatformDownloads {
  const platforms = emptyPlatforms();
  for (const item of list) {
    if (!item) continue;
    platforms.macos += item.macos;
    platforms.windows += item.windows;
    platforms.linux += item.linux;
    platforms.other += item.other;
  }
  return platforms;
}

export function platformItems(platforms: PlatformDownloads) {
  return (
    [
      { label: "macOS", value: platforms.macos },
      { label: "Windows", value: platforms.windows },
      { label: "Linux", value: platforms.linux },
      { label: "Other", value: platforms.other },
    ] as const
  )
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
    .map((item) => ({ label: item.label, value: item.value }));
}

export function shortPath(path: string, fullName: string) {
  const prefix = `/${fullName}`;
  if (path === prefix || path === prefix + "/") return "Overview";
  if (path.startsWith(prefix)) {
    const rest = path.slice(prefix.length);
    return rest.startsWith("/") ? rest : `/${rest}`;
  }
  return path;
}
