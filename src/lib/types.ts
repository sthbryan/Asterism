export type Status = {
  ok: boolean;
  login: string | null;
  error: string | null;
  hint: string | null;
};

export type Config = {
  version: number;
  repos: string[];
};

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
  error: string | null;
};

export type Cache = {
  fetchedAt: number;
  repos: TrackedRepo[];
};

export type Traffic = {
  count: number;
  uniques: number;
};

export type LanguageShare = {
  name: string;
  bytes: number;
};

export type Asset = {
  name: string;
  downloadCount: number;
  size: number;
  contentType: string | null;
};

export type Release = {
  tag: string;
  name: string | null;
  publishedAt: string | null;
  draft: boolean;
  prerelease: boolean;
  downloads: number;
  assets: Asset[];
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
};
