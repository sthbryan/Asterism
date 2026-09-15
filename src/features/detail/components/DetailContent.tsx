import { WarningCircleIcon } from "@phosphor-icons/react";
import { Case, Switch } from "react-if";
import { useI18n } from "@/app/hooks";
import type { RepoDetail } from "@/lib/types";
import { DetailBody } from "./DetailBody";

type DetailContentProps = {
  error: string | null;
  detail: RepoDetail | null;
  refreshing: boolean;
};

export function DetailContent({
  error,
  detail,
  refreshing,
}: DetailContentProps) {
  const { t } = useI18n();

  return (
    <div className="h-full min-h-0 overflow-auto px-6 pt-5 pb-6">
      <Switch>
        <Case condition={Boolean(error)}>
          <div className="card flex items-start gap-3 p-5 text-[14px] text-accent-soft">
            <WarningCircleIcon size={16} />
            <div role="alert">
              <p>{t("errors.request")}</p>
              <p className="mt-1 wrap-break-word">{error}</p>
            </div>
          </div>
        </Case>
        <Case condition={Boolean(detail)}>
          {/** biome-ignore lint/style/noNonNullAssertion: detail is checked in the condition */}
          <DetailBody detail={detail!} refreshing={refreshing} />
        </Case>
      </Switch>
    </div>
  );
}
