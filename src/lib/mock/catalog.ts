import type {
  CatalogRepo,
  CreatedRepo,
  CreateOptions,
  CreateRepoInput,
} from "../types";
import { MOCK_CACHE, MOCK_LOGIN, MOCK_TRACKED } from "./fixtures";

const NOW = Date.now();

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

export const MOCK_CREATE_OPTIONS: CreateOptions = {
  owners: [MOCK_LOGIN, "dsi135"],
  gitignores: [
    "Node",
    "Python",
    "Rust",
    "Go",
    "Swift",
    "Kotlin",
    "Java",
    "C++",
  ],
  licenses: [
    { key: "mit", name: "MIT License" },
    { key: "apache-2.0", name: "Apache License 2.0" },
    { key: "gpl-3.0", name: "GNU General Public License v3.0" },
    { key: "bsd-3-clause", name: "BSD 3-Clause License" },
    { key: "unlicense", name: "The Unlicense" },
  ],
};

export function mockCreateRepo(input: CreateRepoInput): CreatedRepo {
  const owner = input.owner.trim() || MOCK_LOGIN;
  const name = input.name.trim();
  if (!name) throw new Error("Repository name is required.");
  if (
    MOCK_CATALOG.some(
      (repo) =>
        repo.name.toLowerCase() === name.toLowerCase() && repo.owner === owner,
    )
  ) {
    throw new Error(`Name already exists on this account: ${owner}/${name}`);
  }
  const fullName = `${owner}/${name}`;
  MOCK_CACHE.repos.unshift({
    fullName,
    description: input.description,
    private: input.private,
    language: null,
    stars: 0,
    forks: 0,
    downloads: 0,
    error: null,
  });
  MOCK_CATALOG.unshift({
    fullName,
    owner,
    name,
    description: input.description,
    private: input.private,
    language: null,
    archived: false,
    fork: false,
    pushedAt: new Date().toISOString(),
    stars: 0,
    forks: 0,
  });
  return {
    fullName,
    htmlUrl: `https://github.com/${fullName}`,
    private: input.private,
  };
}
