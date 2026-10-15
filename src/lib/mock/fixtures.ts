import type {
  Cache,
  Config,
  PlatformDownloads,
  RepoHistory,
  Status,
  TrackedRepo,
} from "../types";
import { curve } from "./series";

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
  theme: "dark",
  transparency: false,
};

export const MOCK_HISTORY: Record<string, RepoHistory> = Object.fromEntries(
  MOCK_TRACKED.map((repo) => [
    repo.fullName,
    {
      stars: curve(90, Math.max(0, Math.round(repo.stars * 0.15)), repo.stars),
      downloads: curve(
        60,
        Math.max(0, Math.round(repo.downloads * 0.08)),
        repo.downloads,
      ),
      forks: curve(90, Math.max(0, Math.round(repo.forks * 0.2)), repo.forks),
    },
  ]),
);

export const MOCK_CACHE: Cache = {
  fetchedAt: Math.floor((NOW - 1000 * 60 * 14) / 1000),
  repos: MOCK_TRACKED,
  history: MOCK_HISTORY,
};
