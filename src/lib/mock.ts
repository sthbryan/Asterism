import { platformsFromAssets } from "./platform";
import type {
  Cache,
  CatalogRepo,
  Config,
  PlatformDownloads,
  RepoDetail,
  RepoHistory,
  SeriesPoint,
  Status,
  TrackedRepo,
  TrafficDay,
} from "./types";

export const MOCK_LOGIN = "sthbryan";

export const MOCK_STATUS: Status = {
  ok: true,
  login: MOCK_LOGIN,
  error: null,
  hint: null,
};

const NOW = Date.now();

function splitPlatforms(downloads: number): PlatformDownloads {
  if (downloads <= 0) return { macos: 0, windows: 0, linux: 0, other: 0 };
  const macos = Math.round(downloads * 0.54);
  const windows = Math.round(downloads * 0.28);
  const linux = Math.round(downloads * 0.15);
  return {
    macos,
    windows,
    linux,
    other: Math.max(0, downloads - macos - windows - linux),
  };
}

export const MOCK_TRACKED: TrackedRepo[] = [
  {
    fullName: "sthbryan/asterism",
    description: "Track GitHub release downloads across all your repos.",
    private: false,
    language: "TypeScript",
    stars: 128,
    forks: 12,
    downloads: 48210,
    platforms: splitPlatforms(48210),
    starsDelta: 4,
    forksDelta: 0,
    downloadsDelta: 186,
    error: null,
  },
  {
    fullName: "sthbryan/hyperion",
    description: "Blazing fast API gateway written in Rust.",
    private: false,
    language: "Rust",
    stars: 342,
    forks: 28,
    downloads: 156230,
    platforms: splitPlatforms(156230),
    starsDelta: 11,
    forksDelta: 1,
    downloadsDelta: 940,
    error: null,
  },
  {
    fullName: "sthbryan/portfolio",
    description: "Personal portfolio and blog.",
    private: false,
    language: "TypeScript",
    stars: 45,
    forks: 3,
    downloads: 0,
    platforms: splitPlatforms(0),
    starsDelta: 1,
    forksDelta: 0,
    downloadsDelta: 0,
    error: null,
  },
  {
    fullName: "acme/nebula-api",
    description: "Internal billing API — private service.",
    private: true,
    language: "Go",
    stars: 18,
    forks: 6,
    downloads: 89312,
    platforms: splitPlatforms(89312),
    starsDelta: 0,
    forksDelta: 0,
    downloadsDelta: 412,
    error: null,
  },
  {
    fullName: "acme/atlas-web",
    description: "Customer dashboard for Atlas.",
    private: true,
    language: "TypeScript",
    stars: 24,
    forks: 9,
    downloads: 31204,
    platforms: splitPlatforms(31204),
    starsDelta: 2,
    forksDelta: 0,
    downloadsDelta: 88,
    error: null,
  },
  {
    fullName: "sthbryan/dotfiles",
    description: "My macOS dotfiles: wezterm, nvim, zsh.",
    private: false,
    language: "Shell",
    stars: 86,
    forks: 11,
    downloads: 1240,
    platforms: splitPlatforms(1240),
    starsDelta: 0,
    forksDelta: 0,
    downloadsDelta: 6,
    error: null,
  },
  {
    fullName: "sthbryan/clippy-notes",
    description: "Experiments with ML summarization.",
    private: false,
    language: "Python",
    stars: 12,
    forks: 1,
    downloads: 0,
    platforms: splitPlatforms(0),
    starsDelta: 0,
    forksDelta: 0,
    downloadsDelta: 0,
    error: null,
  },
  {
    fullName: "sthbryan/old-blog",
    description: "Archived Jekyll blog.",
    private: false,
    language: "JavaScript",
    stars: 7,
    forks: 0,
    downloads: 312,
    platforms: splitPlatforms(312),
    starsDelta: 0,
    forksDelta: 0,
    downloadsDelta: 0,
    error: "rate limited — will retry on next refresh",
  },
];

export const MOCK_CONFIG: Config = {
  version: 1,
  repos: MOCK_TRACKED.map((r) => r.fullName),
};

const DAY = 86_400;

function curve(days: number, start: number, end: number): SeriesPoint[] {
  const today = Math.floor(NOW / 1000 / DAY) * DAY;
  const out: SeriesPoint[] = [];
  for (let i = days; i >= 0; i--) {
    const progress = 1 - i / days;
    const eased = progress * progress;
    const wobble = Math.sin(i * 0.7) * Math.max(1, (end - start) * 0.012);
    out.push({
      ts: today - i * DAY,
      value: Math.max(0, Math.round(start + (end - start) * eased + wobble)),
    });
  }
  out[out.length - 1].value = end;
  return out;
}

function trafficDays(total: number, uniques: number): TrafficDay[] {
  const today = Math.floor(NOW / 1000 / DAY) * DAY;
  const days: TrafficDay[] = [];
  let remaining = total;
  let remainingU = uniques;
  for (let i = 13; i >= 0; i--) {
    const share = 0.04 + ((13 - i) / 13) * 0.08 + (i % 3 === 0 ? 0.03 : 0);
    const count = i === 0 ? remaining : Math.max(0, Math.round(total * share));
    const uniq = Math.min(
      count,
      i === 0 ? remainingU : Math.max(0, Math.round(uniques * share * 0.7)),
    );
    remaining = Math.max(0, remaining - count);
    remainingU = Math.max(0, remainingU - uniq);
    days.push({ ts: today - i * DAY, count, uniques: uniq });
  }
  return days;
}

export const MOCK_HISTORY: Record<string, RepoHistory> = Object.fromEntries(
  MOCK_TRACKED.map((repo) => [
    repo.fullName,
    {
      stars: curve(90, Math.max(0, Math.round(repo.stars * 0.15)), repo.stars),
      downloads: curve(60, Math.max(0, Math.round(repo.downloads * 0.08)), repo.downloads),
      forks: curve(90, Math.max(0, Math.round(repo.forks * 0.2)), repo.forks),
    },
  ]),
);

export const MOCK_CACHE: Cache = {
  fetchedAt: Math.floor((NOW - 1000 * 60 * 14) / 1000),
  repos: MOCK_TRACKED,
  history: MOCK_HISTORY,
};

export const MOCK_CATALOG: CatalogRepo[] = [
  ...MOCK_TRACKED.map((r, i) => ({
    fullName: r.fullName,
    owner: r.fullName.split("/")[0],
    name: r.fullName.split("/")[1],
    description: r.description,
    private: r.private,
    language: r.language,
    archived: r.fullName === "sthbryan/old-blog",
    fork: false,
    pushedAt: new Date(NOW - 1000 * 60 * 60 * 24 * (i + 1)).toISOString(),
    stars: r.stars,
    forks: r.forks,
  })),
  {
    fullName: "sthbryan/wezterm-config",
    owner: "sthbryan",
    name: "wezterm-config",
    description: "My WezTerm setup with Tokyo Night.",
    private: false,
    language: "Lua",
    archived: false,
    fork: false,
    pushedAt: new Date(NOW - 1000 * 60 * 60 * 24 * 3).toISOString(),
    stars: 9,
    forks: 2,
  },
  {
    fullName: "sthbryan/raycast-extensions",
    owner: "sthbryan",
    name: "raycast-extensions",
    description: "Custom Raycast scripts.",
    private: false,
    language: "TypeScript",
    archived: false,
    fork: false,
    pushedAt: new Date(NOW - 1000 * 60 * 60 * 24 * 9).toISOString(),
    stars: 21,
    forks: 4,
  },
  {
    fullName: "tauri-apps/tauri",
    owner: "tauri-apps",
    name: "tauri",
    description: "Build smaller, faster, and more secure desktop apps.",
    private: false,
    language: "Rust",
    archived: false,
    fork: true,
    pushedAt: new Date(NOW - 1000 * 60 * 60 * 5).toISOString(),
    stars: 84210,
    forks: 2811,
  },
  {
    fullName: "acme/infra",
    owner: "acme",
    name: "infra",
    description: "Terraform modules and cluster configs.",
    private: true,
    language: "HCL",
    archived: false,
    fork: false,
    pushedAt: new Date(NOW - 1000 * 60 * 60 * 24 * 2).toISOString(),
    stars: 3,
    forks: 5,
  },
  {
    fullName: "acme/design-system",
    owner: "acme",
    name: "design-system",
    description: "Shared UI kit for Atlas products.",
    private: true,
    language: "CSS",
    archived: false,
    fork: false,
    pushedAt: new Date(NOW - 1000 * 60 * 60 * 24 * 6).toISOString(),
    stars: 11,
    forks: 7,
  },
];

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
    topics:
      fullName.endsWith("asterism")
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
      { path: `/${fullName}/releases`, title: "Releases", count: 312, uniques: 204 },
      { path: `/${fullName}/releases/tag/v0.3.0`, title: "/releases/tag/v0.3.0", count: 188, uniques: 142 },
      { path: `/${fullName}/blob/main/README.md`, title: "README.md", count: 64, uniques: 51 },
    ],
    releases: [
      {
        tag: "v0.3.0",
        name: "Asterism 0.3 — Traffic insights",
        publishedAt: new Date(NOW - 1000 * 60 * 60 * 24 * 4).toISOString(),
        draft: false,
        prerelease: false,
        downloads: Math.max(1000, Math.round((tracked?.downloads ?? 1200) * 0.55)),
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
      curve(90, Math.max(0, Math.round((tracked?.stars ?? 42) * 0.2)), tracked?.stars ?? 42),
    downloadHistory:
      MOCK_HISTORY[fullName]?.downloads ??
      curve(60, Math.max(0, Math.round((tracked?.downloads ?? 1200) * 0.1)), tracked?.downloads ?? 1200),
    ...overrides,
  };
}

export const MOCK_DETAILS: Record<string, RepoDetail> = Object.fromEntries(
  MOCK_TRACKED.map((r) => [r.fullName, detailFor(r.fullName)]),
);

export function mockDetail(fullName: string): RepoDetail {
  return MOCK_DETAILS[fullName] ?? detailFor(fullName);
}
