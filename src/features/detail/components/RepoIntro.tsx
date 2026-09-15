import { GlobeIcon, LockSimpleIcon } from "@phosphor-icons/react";
import { Else, If, Then, When } from "react-if";
import { useI18n } from "@/app/hooks";
import type { RepoDetail } from "@/lib/types";
import { Flag } from "./Flag";

export function RepoIntro({ detail }: { detail: RepoDetail }) {
  const { t } = useI18n();
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[11px] leading-none font-medium text-accent-soft">
          <If condition={detail.private}>
            <Then>
              <LockSimpleIcon size={11} />
              {t("Private")}
            </Then>
            <Else>
              <GlobeIcon size={12} />
              {t("Public")}
            </Else>
          </If>
        </span>
        <When condition={detail.archived}>
          <Flag>{t("Archived")}</Flag>
        </When>
        <When condition={detail.isTemplate}>
          <Flag>{t("Template")}</Flag>
        </When>
      </div>
      <When condition={detail.description}>
        <p className="mt-2.5 max-w-3xl text-[13px] leading-relaxed text-mist">
          {detail.description}
        </p>
      </When>
      <When condition={detail.topics.length > 0}>
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
      </When>
    </>
  );
}
