import { platformsFromAssets } from "../platform";
import type { RepoDetail } from "../types";
import { MOCK_HISTORY, MOCK_TRACKED } from "./fixtures";
import { curve, trafficDays } from "./series";

const NOW = Date.now();

function detailFor(
  fullName: string,
  overrides: Partial<RepoDetail> = {},
): RepoDetail {
  const tracked = MOCK_TRACKED.find((r) => r.fullName === fullName);
  const [, name] = fullName.split("/");
  return {
    fullName,
    description:
      tracked?.description ?? "Short description for screenshot purposes.",
    homepage: fullName.endsWith("asterism") ? "https://asterism.app" : null,
    private: tracked?.private ?? false,
    visibility: tracked?.private ? "private" : "public",
    archived: fullName === "sthbryan/old-blog",
    isTemplate: false,
    language: tracked?.language ?? "TypeScript",
    languages:
      tracked?.language === "Rust"
        ? [
            { name: "Rust", bytes: 842000 },
            { name: "TypeScript", bytes: 96000 },
            { name: "CSS", bytes: 18000 },
          ]
        : [
            { name: tracked?.language ?? "TypeScript", bytes: 412000 },
            { name: "CSS", bytes: 48000 },
            { name: "JavaScript", bytes: 21000 },
          ],
    stars: tracked?.stars ?? 42,
    forks: tracked?.forks ?? 5,
    watchers: Math.max(3, Math.round((tracked?.stars ?? 42) / 8)),
    openIssues: 7,
    networkCount: (tracked?.forks ?? 5) + 4,
    size: 18432,
    license: "MIT",
    defaultBranch: "main",
    topics: fullName.endsWith("asterism")
      ? ["tauri", "github", "releases", "analytics"]
      : ["screenshot", "demo"],
    createdAt: new Date(NOW - 1000 * 60 * 60 * 24 * 400).toISOString(),
    updatedAt: new Date(NOW - 1000 * 60 * 60 * 5).toISOString(),
    pushedAt: new Date(NOW - 1000 * 60 * 60 * 2).toISOString(),
    downloads: tracked?.downloads ?? 1200,
    views: { count: 1284, uniques: 842, days: trafficDays(1284, 842) },
    clones: { count: 312, uniques: 148, days: trafficDays(312, 148) },
    trafficError: null,
    referrers: [
      { referrer: "github.com", count: 612, uniques: 408 },
      { referrer: "reddit.com", count: 214, uniques: 176 },
      { referrer: "news.ycombinator.com", count: 148, uniques: 121 },
      { referrer: "x.com", count: 96, uniques: 81 },
    ],
    paths: [
      { path: `/${fullName}`, title: "Overview", count: 840, uniques: 510 },
      {
        path: `/${fullName}/releases`,
        title: "Releases",
        count: 312,
        uniques: 204,
      },
      {
        path: `/${fullName}/releases/tag/v0.3.0`,
        title: "/releases/tag/v0.3.0",
        count: 188,
        uniques: 142,
      },
      {
        path: `/${fullName}/blob/main/README.md`,
        title: "README.md",
        count: 64,
        uniques: 51,
      },
    ],
    releases: [
      {
        tag: "v0.3.0",
        name: "Asterism 0.3 — Traffic insights",
        publishedAt: new Date(NOW - 1000 * 60 * 60 * 24 * 4).toISOString(),
        draft: false,
        prerelease: false,
        downloads: Math.max(
          1000,
          Math.round((tracked?.downloads ?? 1200) * 0.55),
        ),
        assets: [
          {
            name: `${name}-0.3.0-macos-arm64.dmg`,
            downloadCount: Math.round((tracked?.downloads ?? 1200) * 0.3),
            size: 8_421_376,
            contentType: "application/octet-stream",
          },
          {
            name: `${name}-0.3.0-windows-x64.msi`,
            downloadCount: Math.round((tracked?.downloads ?? 1200) * 0.15),
            size: 6_912_000,
            contentType: "application/octet-stream",
          },
          {
            name: `${name}-0.3.0-linux-amd64.AppImage`,
            downloadCount: Math.round((tracked?.downloads ?? 1200) * 0.1),
            size: 9_104_512,
            contentType: "application/octet-stream",
          },
        ],
      },
      {
        tag: "v0.2.1",
        name: "Patch release",
        publishedAt: new Date(NOW - 1000 * 60 * 60 * 24 * 21).toISOString(),
        draft: false,
        prerelease: false,
        downloads: Math.round((tracked?.downloads ?? 1200) * 0.3),
        assets: [
          {
            name: `${name}-0.2.1-macos-arm64.dmg`,
            downloadCount: Math.round((tracked?.downloads ?? 1200) * 0.2),
            size: 8_101_888,
            contentType: "application/octet-stream",
          },
          {
            name: `${name}-0.2.1-windows-x64.msi`,
            downloadCount: Math.round((tracked?.downloads ?? 1200) * 0.1),
            size: 6_601_472,
            contentType: "application/octet-stream",
          },
        ],
      },
      {
        tag: "v0.1.0",
        name: null,
        publishedAt: new Date(NOW - 1000 * 60 * 60 * 24 * 60).toISOString(),
        draft: false,
        prerelease: false,
        downloads: Math.round((tracked?.downloads ?? 1200) * 0.15),
        assets: [],
      },
    ],
    platforms:
      tracked?.platforms ??
      platformsFromAssets([
        {
          name: `${name}-0.3.0-macos-arm64.dmg`,
          downloadCount: Math.round((tracked?.downloads ?? 1200) * 0.5),
        },
        {
          name: `${name}-0.3.0-windows-x64.msi`,
          downloadCount: Math.round((tracked?.downloads ?? 1200) * 0.3),
        },
        {
          name: `${name}-0.3.0-linux-amd64.AppImage`,
          downloadCount: Math.round((tracked?.downloads ?? 1200) * 0.2),
        },
      ]),
    starHistory:
      MOCK_HISTORY[fullName]?.stars ??
      curve(
        90,
        Math.max(0, Math.round((tracked?.stars ?? 42) * 0.2)),
        tracked?.stars ?? 42,
      ),
    downloadHistory:
      MOCK_HISTORY[fullName]?.downloads ??
      curve(
        60,
        Math.max(0, Math.round((tracked?.downloads ?? 1200) * 0.1)),
        tracked?.downloads ?? 1200,
      ),
    ...overrides,
  };
}

export const MOCK_DETAILS: Record<string, RepoDetail> = Object.fromEntries(
  MOCK_TRACKED.map((r) => [r.fullName, detailFor(r.fullName)]),
);

export function mockDetail(fullName: string): RepoDetail {
  return MOCK_DETAILS[fullName] ?? detailFor(fullName);
}
