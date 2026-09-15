import { useI18n } from "@/app/hooks";
import { useStore } from "@/app/store";
import { Button } from "@/components/Button";

export function AccountSection() {
  const { t } = useI18n();
  const retryBoot = useStore((s) => s.retryBoot);
  const status = useStore((s) => s.status);

  return (
    <section
      aria-labelledby="account-heading"
      className="border-t border-hairline pt-5"
    >
      <h2 id="account-heading" className="text-base font-semibold">
        {t("settings.account")}
      </h2>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">
            {status?.login ?? t("settings.noAccount")}
          </p>
          <p className="mt-1 text-sm text-mist">
            {status?.ok ? t("GitHub · connected") : t("settings.disconnected")}
          </p>
        </div>
        <Button onClick={retryBoot}>{t("Check connection")}</Button>
      </div>
    </section>
  );
}
