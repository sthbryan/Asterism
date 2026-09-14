import type {
  LanguageShare,
  PlatformDownloads,
  PopularPath,
  Referrer,
  SeriesPoint,
  Traffic,
} from "./analytics";
import type { Release } from "./releases";

export type CatalogRepo = {
  fullName: string;
  owner: string;
  name: string;
  description: string | null;
  private: boolean;
  language: string | null;
  archived: boolean;
  fork: boolean;
  pushedAt: string | null;
  stars: number;
  forks: number;
};

export type TrackedRepo = {
  fullName: string;
  description: string | null;
  private: boolean;
  language: string | null;
  stars: number;
  forks: number;
  downloads: number;
  platforms?: PlatformDownloads;
  starsDelta?: number | null;
  forksDelta?: number | null;
  downloadsDelta?: number | null;
  error: string | null;
};

export type RepoHistory = {
  stars: SeriesPoint[];
  downloads: SeriesPoint[];
  forks: SeriesPoint[];
};

export type Cache = {
  fetchedAt: number;
  repos: TrackedRepo[];
  history: Record<string, RepoHistory>;
};

export type RepoDetail = {
  fullName: string;
  description: string | null;
  homepage: string | null;
  private: boolean;
  visibility: string | null;
  archived: boolean;
  isTemplate: boolean;
  language: string | null;
  languages: LanguageShare[];
  stars: number;
  forks: number;
  watchers: number;
  openIssues: number;
  networkCount: number;
  size: number;
  license: string | null;
  defaultBranch: string | null;
  topics: string[];
  createdAt: string | null;
  updatedAt: string | null;
  pushedAt: string | null;
  downloads: number;
  views: Traffic | null;
  clones: Traffic | null;
  trafficError: string | null;
  releases: Release[];
  platforms?: PlatformDownloads;
  referrers?: Referrer[];
  paths?: PopularPath[];
  starHistory: SeriesPoint[];
  downloadHistory: SeriesPoint[];
};
