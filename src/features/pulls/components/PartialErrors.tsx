import { WarningCircleIcon } from "@phosphor-icons/react";
import { useI18n } from "@/app/hooks";

export function PartialErrors({ errors }: { errors: Record<string, string> }) {
  const { t } = useI18n();
  return (
    <div className="mb-3 rounded-lg border border-accent/30 bg-accent/5 p-3 text-[12px] text-mist">
      <div className="flex items-center gap-2 text-accent-soft">
        <WarningCircleIcon size={14} />
        {t("pulls.partial")}
      </div>
      <div className="mt-2 grid gap-1">
        {Object.entries(errors).map(([repo, message]) => (
          <div key={repo} className="flex flex-wrap gap-2">
            <span className="font-mono text-paper">{repo}</span>
            <span>{message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
