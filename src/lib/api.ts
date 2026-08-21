import { invoke } from "@tauri-apps/api/core";
import type { Cache, CatalogRepo, Config, RepoDetail, Status } from "./types";

export function getStatus() {
  return invoke<Status>("get_status");
}

export function getConfig() {
  return invoke<Config>("get_config");
}

export function saveConfig(repos: string[]) {
  return invoke<Config>("save_config", { repos });
}

export function getCache() {
  return invoke<Cache | null>("get_cache");
}

export function listCatalog() {
  return invoke<CatalogRepo[]>("list_catalog");
}

export function refreshTracked() {
  return invoke<Cache>("refresh_tracked");
}

export function getRepoDetail(fullName: string) {
  return invoke<RepoDetail>("get_repo_detail", { fullName });
}
