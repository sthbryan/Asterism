import { Case, Default, Switch, When } from "react-if";
import { useI18n } from "@/app/hooks";
import type { PullDiff, Saved } from "@/lib/types";
import { type DiffLineKind, diffLineKind } from "../utils";

const LINE_CLASS: Record<DiffLineKind, string> = {
  file: "text-paper font-medium",
  meta: "text-faint",
  hunk: "text-faint",
  add: "text-ok bg-ok/10",
  remove: "text-accent-soft bg-accent/10",
  context: "",
};

export function DiffBody({
  diff,
  loading,
  refreshing,
  error,
}: {
  diff: Saved<PullDiff> | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
}) {
  const { t } = useI18n();
  const lines = diff?.data.text.split("\n") ?? [];
  return (
    <Switch>
      <Case condition={loading && !diff}>
        <div className="p-4 text-[12px] text-mist">{t("pulls.loading")}</div>
      </Case>
      <Case condition={Boolean(error) && !diff}>
        <div className="p-4 text-[12px] text-accent-soft">{error}</div>
      </Case>
      <Case condition={Boolean(diff)}>
        <div className="border-t border-hairline bg-void">
          <When condition={refreshing}>
            <div className="px-4 py-2 text-[11px] text-mist" role="status">
              {t("Refreshing…")}
            </div>
          </When>
          <When condition={Boolean(diff?.data.truncated)}>
            <p className="px-4 pt-3 text-[11px] text-faint">
              {t("pulls.diffTruncated")}
            </p>
          </When>
          <pre className="max-h-112 overflow-auto p-4 font-mono text-[11px] leading-relaxed text-mist">
            {lines.map((line, index) => (
              <span key={index} className={LINE_CLASS[diffLineKind(line)]}>
                {line}
                {index < lines.length - 1 ? "\n" : ""}
              </span>
            ))}
          </pre>
        </div>
      </Case>
      <Default>
        <div className="p-4 text-[12px] text-mist">{t("pulls.loading")}</div>
      </Default>
    </Switch>
  );
}
