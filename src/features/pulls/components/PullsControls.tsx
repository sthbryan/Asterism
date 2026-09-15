import { Input } from "@/components/Input";
import type { PullFilters } from "../utils";
import { FilterSelect } from "./FilterSelect";

export function PullsControls({
  filters,
  options,
  onChange,
  onClear,
  labels,
}: {
  filters: PullFilters;
  options: {
    repos: string[];
    authors: string[];
    assignees: string[];
    reviewers: string[];
  };
  onChange: (field: keyof PullFilters, value: string) => void;
  onClear: () => void;
  labels: Record<string, string>;
}) {
  const all = { value: "all", label: labels.all };
  const select = (
    field: keyof PullFilters,
    label: string,
    values: string[],
  ) => (
    <FilterSelect
      label={label}
      value={filters[field] ?? "all"}
      onChange={(value) => onChange(field, value)}
      options={[all, ...values.map((value) => ({ value, label: value }))]}
    />
  );
  return (
    <div className="mb-4 flex flex-wrap items-end gap-3">
      <div className="min-w-52 flex-1">
        <label className="kpi-label text-faint" htmlFor="pull-search">
          {labels.search}
        </label>
        <Input
          id="pull-search"
          variant="field"
          className="mt-1"
          value={filters.query ?? ""}
          onChange={(event) => onChange("query", event.target.value)}
          placeholder="owner/repo, title…"
        />
      </div>
      {select("repo", labels.repo, options.repos)}
      {select("author", labels.author, options.authors)}
      {select("assignee", labels.assignee, options.assignees)}
      {select("reviewer", labels.reviewer, options.reviewers)}
      <FilterSelect
        label={labels.state}
        value={filters.state ?? "all"}
        onChange={(value) => onChange("state", value)}
        options={[
          { value: "open", label: labels.open },
          { value: "draft", label: labels.draft },
          { value: "closed", label: labels.closed },
          { value: "merged", label: labels.merged },
          all,
        ]}
      />
      <button
        type="button"
        className="h-8 rounded-md px-2 text-[12px] text-mist hover:bg-hover hover:text-paper"
        onClick={onClear}
      >
        {labels.clear}
      </button>
    </div>
  );
}
