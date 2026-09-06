import type {
  Cache,
  CatalogRepo,
  Config,
  RepoDetail,
  Status,
  TrackedRepo,
} from "./types";

export const MOCK_LOGIN = "sthbryan";

export const MOCK_STATUS: Status = {
  ok: true,
  login: MOCK_LOGIN,
  error: null,
  hint: null,
};

const NOW = Date.now();

export const MOCK_TRACKED: TrackedRepo[] = [
  {
    fullName: "sthbryan/asterism",
    description: "Track GitHub release downloads across all your repos.",
    private: false,
    language: "TypeScript",
    stars: 128,
    forks: 12,
    downloads: 48210,
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
    error: "rate limited — will retry on next refresh",
  },
];

export const MOCK_CONFIG: Config = {
  version: 1,
  repos: MOCK_TRACKED.map((r) => r.fullName),
};

export const MOCK_CACHE: Cache = {
  fetchedAt: NOW - 1000 * 60 * 14,
  repos: MOCK_TRACKED,
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
    views: { count: 1284, uniques: 842 },
    clones: { count: 312, uniques: 148 },
    trafficError: null,
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
    ...overrides,
  };
}

export const MOCK_DETAILS: Record<string, RepoDetail> = Object.fromEntries(
  MOCK_TRACKED.map((r) => [r.fullName, detailFor(r.fullName)]),
);

export function mockDetail(fullName: string): RepoDetail {
  return MOCK_DETAILS[fullName] ?? detailFor(fullName);
}
