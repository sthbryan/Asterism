import { describe, expect, test } from "bun:test";
import {
  applySelection,
  filterRepos,
  selectionChanges,
  sortRepos,
} from "@/features/picker/utils/pickerData";
import type { CatalogRepo } from "@/lib/types";

const repo = (fullName: string, rest: Partial<CatalogRepo> = {}) => ({
  fullName,
  owner: fullName.split("/")[0],
  name: fullName.split("/")[1],
  description: null,
  language: null,
  stars: 0,
  fork: false,
  private: false,
  archived: false,
  ...rest,
});

const catalog: CatalogRepo[] = [
  repo("me/beta", { stars: 2, language: "Rust" }),
  repo("me/alpha", { stars: 9, language: "Dart" }),
  repo("other/gamma", { stars: 5, description: "Telemetry helper" }),
];

describe("picker selection", () => {
  test("select all keeps names outside the filtered list untouched", () => {
    const visible = filterRepos(catalog, "me", "").map((r) => r.fullName);
    const next = applySelection(new Set(["other/gamma"]), visible, true);
    expect([...next].sort()).toEqual(["me/alpha", "me/beta", "other/gamma"]);
  });

  test("clear only drops the names it is given", () => {
    const visible = filterRepos(catalog, "me", "").map((r) => r.fullName);
    const next = applySelection(
      new Set(["me/alpha", "me/beta", "other/gamma"]),
      visible,
      false,
    );
    expect([...next]).toEqual(["other/gamma"]);
  });

  test("sorting by name ignores the selection", () => {
    const names = sortRepos(catalog, new Set(["me/beta"]), "name").map(
      (r) => r.fullName,
    );
    expect(names).toEqual(["me/alpha", "me/beta", "other/gamma"]);
  });

  test("selected-first sorting clusters the checked repos", () => {
    const names = sortRepos(catalog, new Set(["other/gamma"]), "selected").map(
      (r) => r.fullName,
    );
    expect(names[0]).toBe("other/gamma");
  });

  test("filter matches descriptions and languages", () => {
    expect(
      filterRepos(catalog, null, "telemetry").map((r) => r.fullName),
    ).toEqual(["other/gamma"]);
    expect(filterRepos(catalog, null, "dart").map((r) => r.fullName)).toEqual([
      "me/alpha",
    ]);
  });
});

describe("picker save bar", () => {
  test("an untouched selection has no pending changes", () => {
    expect(
      selectionChanges(new Set(["me/alpha"]), new Set(["me/alpha"])),
    ).toEqual({ added: 0, removed: 0 });
  });

  test("counts additions and removals separately", () => {
    expect(
      selectionChanges(
        new Set(["me/alpha", "me/beta"]),
        new Set(["me/beta", "other/gamma", "other/delta"]),
      ),
    ).toEqual({ added: 2, removed: 1 });
  });

  test("a reordered or resent selection is not a change", () => {
    expect(
      selectionChanges(
        new Set(["me/alpha", "me/beta"]),
        new Set(["me/beta", "me/alpha"]),
      ),
    ).toEqual({ added: 0, removed: 0 });
  });
});
