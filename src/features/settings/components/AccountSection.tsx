import { GithubLogoIcon } from "@phosphor-icons/react";
import { Badge, Button } from "@zovaris/sephiro";
import { useI18n } from "@/app/hooks";
import { useStore } from "@/app/store";
import { Section } from "@/components/Section";

export function AccountSection() {
  const { t } = useI18n();
  const retryBoot = useStore((s) => s.retryBoot);
  const status = useStore((s) => s.status);

  return (
    <Section
      labelAs="h2"
      label={t("settings.account")}
      icon={<GithubLogoIcon size={15} />}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <p className="text-sm font-medium">
            {status?.login ?? t("settings.noAccount")}
          </p>
          <Badge size="sm" variant={status?.ok ? "success" : "neutral"}>
            {status?.ok ? t("GitHub · connected") : t("settings.disconnected")}
          </Badge>
        </div>
        <Button variant="secondary" size="sm" onClick={retryBoot}>
          {t("Check connection")}
        </Button>
      </div>
    </Section>
  );
}
