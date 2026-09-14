import { Globe, LockSimpleIcon } from "@phosphor-icons/react";
import { useI18n } from "@/app/hooks";
import type { RepoDetail } from "@/lib/types";
import { Flag } from "./shared";

export function RepoIntro({ detail }: { detail: RepoDetail }) {
  const { t } = useI18n();
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[11px] leading-none font-medium text-accent-soft">
          {detail.private ? <LockSimpleIcon size={11} /> : <Globe size={12} />}
          {detail.private ? t("Private") : t("Public")}
        </span>
        {detail.archived ? <Flag>{t("Archived")}</Flag> : null}
        {detail.isTemplate ? <Flag>{t("Template")}</Flag> : null}
      </div>
      {detail.description ? (
        <p className="mt-2.5 max-w-3xl text-[13px] leading-relaxed text-mist">
          {detail.description}
        </p>
      ) : null}
      {detail.topics.length > 0 ? (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {detail.topics.map((topic) => (
            <span
              key={topic}
              className="rounded-md border border-hairline bg-wash px-1.5 py-0.5 font-mono text-[11px] text-mist"
            >
              #{topic}
            </span>
          ))}
        </div>
      ) : null}
    </>
  );
}
