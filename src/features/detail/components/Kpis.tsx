import {
  DownloadSimpleIcon,
  EyeIcon,
  GitForkIcon,
  StarIcon,
} from "@phosphor-icons/react";
import { useI18n } from "@/app/hooks";
import { KpiCard } from "@/components/KpiCard";
import type { RepoDetail } from "@/lib/types";

export function Kpis({ detail }: { detail: RepoDetail }) {
  const { t } = useI18n();
  return (
    <div className="app-kpis">
      <KpiCard
        label={t("Stars")}
        value={detail.stars}
        icon={<StarIcon size={15} />}
        sub={t("common.total")}
      />
      <KpiCard
        label={t("Forks")}
        value={detail.forks}
        icon={<GitForkIcon size={15} />}
        sub={t("common.total")}
      />
      <KpiCard
        label={t("Watchers")}
        value={detail.watchers}
        icon={<EyeIcon size={15} />}
        sub={t("common.total")}
      />
      <KpiCard
        label={t("Downloads")}
        value={detail.downloads}
        icon={<DownloadSimpleIcon size={15} />}
        sub={t("release assets")}
        hero
      />
    </div>
  );
}
