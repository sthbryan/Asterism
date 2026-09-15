import { cn } from "cn";
import { useRoute } from "wouter";
import { useDetail } from "@/app/hooks";
import { decodeDetailParam } from "@/app/routes";
import { useTransitionNavigate } from "@/app/useViewTransition";
import { PageHeader } from "@/components/PageHeader";
import { DetailSkeleton } from "@/components/Skeleton";
import { DetailContent } from "./DetailContent";
import { DetailTitle, DetailTrailing } from "./Header";

export function DetailView() {
  const [, params] = useRoute("/repo/:fullName");
  const navigate = useTransitionNavigate();
  const fullName = decodeDetailParam(params?.fullName);

  const { detail, loading, refreshing, error } = useDetail(fullName);

  const goToBack = () => navigate("/");

  const showSkeleton = loading && !detail;

  return (
    <>
      <PageHeader
        title={<DetailTitle fullName={fullName} onBack={goToBack} />}
        trailing={<DetailTrailing fullName={fullName} />}
      />
      <div className={cn("t-skel h-full", showSkeleton ? "" : "is-revealed")}>
        <div className="t-skel-skeleton is-pulsing">
          <DetailSkeleton />
        </div>
        <div className="t-skel-content">
          <DetailContent
            error={error}
            detail={detail}
            refreshing={refreshing}
          />
        </div>
      </div>
    </>
  );
}
