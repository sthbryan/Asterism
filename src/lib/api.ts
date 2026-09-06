import { invoke } from "@tauri-apps/api/core";
import type { Cache, CatalogRepo, Config, RepoDetail, Status } from "./types";
import {
  MOCK_CACHE,
  MOCK_CATALOG,
  MOCK_CONFIG,
  MOCK_STATUS,
  mockDetail,
} from "./mock";

export function isMockMode(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  if (params.has("mock") || params.has("screenshot")) return true;
  try {
    if (window.localStorage?.getItem("asterism:mock") === "1") return true;
  } catch {
    /* ignore */
  }
  return import.meta.env.VITE_MOCK === "1";
}

function delay<T>(value: T, ms = 250): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

let mockRepos = [...MOCK_CONFIG.repos];

export function getStatus() {
  if (isMockMode()) return delay({ ...MOCK_STATUS });
  return invoke<Status>("get_status");
}

export function getConfig() {
  if (isMockMode()) return delay<Config>({ version: 1, repos: [...mockRepos] });
  return invoke<Config>("get_config");
}

export function saveConfig(repos: string[]) {
  if (isMockMode()) {
    mockRepos = [...repos];
    return delay<Config>({ version: 1, repos: [...mockRepos] });
  }
  return invoke<Config>("save_config", { repos });
}

export function getCache() {
  if (isMockMode()) {
    return delay<Cache | null>({
      fetchedAt: MOCK_CACHE.fetchedAt,
      repos: MOCK_CACHE.repos.filter((r) => mockRepos.includes(r.fullName)),
    });
  }
  return invoke<Cache | null>("get_cache");
}

export function listCatalog() {
  if (isMockMode()) return delay<CatalogRepo[]>([...MOCK_CATALOG], 400);
  return invoke<CatalogRepo[]>("list_catalog");
}

export function refreshTracked() {
  if (isMockMode()) {
    return delay<Cache>(
      {
        fetchedAt: Date.now(),
        repos: MOCK_CACHE.repos.filter((r) => mockRepos.includes(r.fullName)),
      },
      600,
    );
  }
  return invoke<Cache>("refresh_tracked");
}

export function getRepoDetail(fullName: string) {
  if (isMockMode()) return delay<RepoDetail>(mockDetail(fullName), 350);
  return invoke<RepoDetail>("get_repo_detail", { fullName });
}
