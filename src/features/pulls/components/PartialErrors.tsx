import { Alert } from "@zovaris/sephiro";
import { useI18n } from "@/app/hooks";

export function PartialErrors({ errors }: { errors: Record<string, string> }) {
  const { t } = useI18n();
  return (
    <Alert variant="warning" title={t("pulls.partial")} className="mb-3">
      <div className="grid gap-1">
        {Object.entries(errors).map(([repo, message]) => (
          <div key={repo} className="flex flex-wrap gap-2">
            <span className="font-mono text-paper">{repo}</span>
            <span>{message}</span>
          </div>
        ))}
      </div>
    </Alert>
  );
}
