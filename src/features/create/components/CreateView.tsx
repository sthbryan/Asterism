import { Else, If, Then } from "react-if";
import { useI18n } from "@/app/hooks";
import { useStore } from "@/app/store";
import { PageHeader } from "@/components/PageHeader";
import { OnlineCreateView } from "./OnlineCreateView";

export function CreateView() {
  const online = useStore((s) => s.status?.ok && !s.connecting);
  const { t } = useI18n();

  return (
    <If condition={Boolean(online)}>
      <Then>
        <OnlineCreateView />
      </Then>
      <Else>
        <PageHeader
          title={
            <h1 className="text-[15px] font-semibold">
              {t("Create repository")}
            </h1>
          }
        />
        <p className="px-6 py-7 text-sm text-mist">{t("offline.create")}</p>
      </Else>
    </If>
  );
}
