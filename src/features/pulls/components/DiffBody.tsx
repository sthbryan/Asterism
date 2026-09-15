import { Case, Default, Switch, When } from "react-if";
import { useI18n } from "@/app/hooks";
import type { Saved } from "@/lib/types";

export function DiffBody({
  diff,
  loading,
  refreshing,
  error,
}: {
  diff: Saved<string> | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
}) {
  const { t } = useI18n();
  return (
    <Switch>
      <Case condition={loading && !diff}>
        <div className="p-4 text-[12px] text-mist">{t("pulls.loading")}</div>
      </Case>
      <Case condition={Boolean(error) && !diff}>
        <div className="p-4 text-[12px] text-accent-soft">{error}</div>
      </Case>
      <Case condition={Boolean(diff)}>
        <div>
          <When condition={refreshing}>
            <div
              className="border-t border-hairline px-4 py-2 text-[11px] text-mist"
              role="status"
            >
              {t("Refreshing…")}
            </div>
          </When>
          <pre className="max-h-112 overflow-auto border-t border-hairline bg-void p-4 font-mono text-[11px] leading-relaxed text-mist">
            {diff?.data}
          </pre>
        </div>
      </Case>
      <Default>
        <div className="p-4 text-[12px] text-mist">{t("pulls.loading")}</div>
      </Default>
    </Switch>
  );
}
