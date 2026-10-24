import { Notice } from "@zovaris/sephiro";
import { Case, Switch } from "react-if";
import { useI18n } from "@/app/hooks";
import { useScrollMemory } from "@/app/useScrollMemory";
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
  const scrollRef = useScrollMemory(`detail:${detail?.fullName ?? ""}`);

  return (
    <div
      ref={scrollRef}
      className="h-full min-h-0 overflow-auto px-6 pt-5 pb-6"
    >
      <Switch>
        <Case condition={Boolean(error)}>
          <Notice variant="danger" title={t("errors.request")}>
            <p className="wrap-break-word">{error}</p>
          </Notice>
        </Case>
        <Case condition={Boolean(detail)}>
          {detail ? (
            <DetailBody detail={detail} refreshing={refreshing} />
          ) : null}
        </Case>
      </Switch>
    </div>
  );
}
